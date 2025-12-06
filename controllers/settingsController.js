const Settings = require('../models/Settings');
const { logAction } = require('./auditLogController');

// @desc    Get all global settings
// @route   GET /api/settings
// @access  Private/Super Admin
exports.getSettings = async (req, res) => {
    try {
        const { category } = req.query;

        const query = {};
        if (category) {
            query.category = category;
        }

        const settings = await Settings.find(query).sort({ category: 1, key: 1 });

        // Group settings by category
        const groupedSettings = settings.reduce((acc, setting) => {
            if (!acc[setting.category]) {
                acc[setting.category] = [];
            }
            acc[setting.category].push({
                key: setting.key,
                value: setting.value,
                type: setting.type,
                description: setting.description,
                isPublic: setting.isPublic,
            });
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: groupedSettings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get single setting by key
// @route   GET /api/settings/:key
// @access  Private/Super Admin
exports.getSetting = async (req, res) => {
    try {
        const setting = await Settings.findOne({ key: req.params.key });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found',
            });
        }

        res.status(200).json({
            success: true,
            data: setting,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Update or create setting
// @route   PUT /api/settings/:key
// @access  Private/Super Admin
exports.updateSetting = async (req, res) => {
    try {
        const { value, type, category, description, isPublic } = req.body;

        // Validate tablePageSize minimum value
        if (req.params.key === 'tablePageSize') {
            const numValue = parseInt(value);
            if (numValue < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Table Page Size cannot be less than 10',
                });
            }
            if (numValue > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Table Page Size cannot be greater than 100',
                });
            }
        }

        const setting = await Settings.findOneAndUpdate(
            { key: req.params.key },
            {
                key: req.params.key,
                value,
                type,
                category,
                description,
                isPublic,
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );

        // Log settings update action
        await logAction(
            req.user._id,
            'settings_update',
            'settings',
            setting._id,
            { key: req.params.key, value, category },
            `Updated setting: ${req.params.key}`,
            req
        );

        res.status(200).json({
            success: true,
            data: setting,
            message: 'Setting updated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Bulk update settings
// @route   POST /api/settings/bulk
// @access  Private/Super Admin
exports.bulkUpdateSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        if (!Array.isArray(settings)) {
            return res.status(400).json({
                success: false,
                message: 'Settings must be an array',
            });
        }

        // Validate tablePageSize if present
        const tablePageSizeSetting = settings.find(s => s.key === 'tablePageSize');
        if (tablePageSizeSetting) {
            const numValue = parseInt(tablePageSizeSetting.value);
            if (numValue < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Table Page Size cannot be less than 10',
                });
            }
            if (numValue > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Table Page Size cannot be greater than 100',
                });
            }
        }

        const updatePromises = settings.map((setting) =>
            Settings.findOneAndUpdate(
                { key: setting.key },
                setting,
                { new: true, upsert: true, runValidators: true }
            )
        );

        const updatedSettings = await Promise.all(updatePromises);

        // Log bulk settings update action
        await logAction(
            req.user._id,
            'settings_update',
            'settings',
            null,
            { count: settings.length, keys: settings.map(s => s.key) },
            `Bulk updated ${settings.length} settings`,
            req
        );

        res.status(200).json({
            success: true,
            data: updatedSettings,
            message: 'Settings updated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Delete setting
// @route   DELETE /api/settings/:key
// @access  Private/Super Admin
exports.deleteSetting = async (req, res) => {
    try {
        const setting = await Settings.findOneAndDelete({ key: req.params.key });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found',
            });
        }

        // Log settings deletion action
        await logAction(
            req.user._id,
            'delete',
            'settings',
            setting._id,
            { key: req.params.key, value: setting.value },
            `Deleted setting: ${req.params.key}`,
            req
        );

        res.status(200).json({
            success: true,
            message: 'Setting deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Initialize default settings
// @route   POST /api/settings/initialize
// @access  Private/Super Admin
exports.initializeSettings = async (req, res) => {
    try {
        const defaultSettings = [
            // Platform settings
            { key: 'platform.name', value: 'Learning Platform', type: 'string', category: 'platform', description: 'Platform name' },
            { key: 'platform.logo', value: '', type: 'string', category: 'platform', description: 'Platform logo URL' },
            { key: 'platform.primaryColor', value: '#0d6efd', type: 'string', category: 'platform', description: 'Primary brand color' },
            { key: 'platform.timezone', value: 'UTC', type: 'string', category: 'platform', description: 'Default timezone' },

            // Email settings
            { key: 'email.smtpHost', value: '', type: 'string', category: 'email', description: 'SMTP host' },
            { key: 'email.smtpPort', value: 587, type: 'number', category: 'email', description: 'SMTP port' },
            { key: 'email.fromEmail', value: 'noreply@platform.com', type: 'string', category: 'email', description: 'From email address' },
            { key: 'email.fromName', value: 'Learning Platform', type: 'string', category: 'email', description: 'From name' },

            // Security settings
            { key: 'security.passwordMinLength', value: 6, type: 'number', category: 'security', description: 'Minimum password length' },
            { key: 'security.sessionTimeout', value: 3600, type: 'number', category: 'security', description: 'Session timeout in seconds' },
            { key: 'security.twoFactorEnabled', value: false, type: 'boolean', category: 'security', description: 'Enable two-factor authentication' },
            { key: 'security.maxLoginAttempts', value: 5, type: 'number', category: 'security', description: 'Maximum login attempts' },

            // Feature flags
            { key: 'features.userRegistration', value: true, type: 'boolean', category: 'features', description: 'Allow user registration' },
            { key: 'features.publicTests', value: false, type: 'boolean', category: 'features', description: 'Allow public tests' },
            { key: 'features.maintenanceMode', value: false, type: 'boolean', category: 'features', description: 'Maintenance mode' },
        ];

        const initPromises = defaultSettings.map((setting) =>
            Settings.findOneAndUpdate(
                { key: setting.key },
                setting,
                { new: true, upsert: true, runValidators: true }
            )
        );

        await Promise.all(initPromises);

        res.status(200).json({
            success: true,
            message: 'Default settings initialized successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
