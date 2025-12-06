const OrganizationConfig = require('../models/OrganizationConfig');
const defaultConfigs = require('../config/defaultConfigs');
const { logAction } = require('./auditLogController');

// Helper function to get default value for a config key
const getDefaultValue = (configKey) => {
    for (const category in defaultConfigs) {
        if (defaultConfigs[category][configKey]) {
            return defaultConfigs[category][configKey];
        }
    }
    return null;
};

// Get all configs for an organization
exports.getOrganizationConfigs = async (req, res) => {
    try {
        const { category } = req.query;
        const organizationId = req.user.role === 'super_admin' && req.query.organizationId
            ? req.query.organizationId
            : req.user.organization;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }

        // Build query
        const query = { organization: organizationId, isActive: true };
        if (category) {
            query.category = category;
        }

        const configs = await OrganizationConfig.find(query)
            .populate('organization', 'name')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .sort({ category: 1, configKey: 1 });

        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        console.error('Error fetching organization configs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching organization configs',
            error: error.message
        });
    }
};

// Get available config keys with defaults
exports.getAvailableConfigKeys = async (req, res) => {
    try {
        const organizationId = req.user.role === 'super_admin' && req.query.organizationId
            ? req.query.organizationId
            : req.user.organization;

        // Get all default configs
        const availableConfigs = {};

        for (const category in defaultConfigs) {
            availableConfigs[category] = {};

            for (const key in defaultConfigs[category]) {
                const defaultConfig = defaultConfigs[category][key];

                // Check if organization has custom value
                let customValue = null;
                if (organizationId) {
                    const orgConfig = await OrganizationConfig.findOne({
                        organization: organizationId,
                        configKey: key,
                        isActive: true
                    });

                    if (orgConfig) {
                        customValue = orgConfig.configValue;
                    }
                }

                availableConfigs[category][key] = {
                    defaultValue: defaultConfig.value,
                    currentValue: customValue !== null ? customValue : defaultConfig.value,
                    dataType: defaultConfig.dataType,
                    description: defaultConfig.description,
                    isCustomized: customValue !== null
                };
            }
        }

        res.json({
            success: true,
            data: availableConfigs
        });
    } catch (error) {
        console.error('Error fetching available config keys:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available config keys',
            error: error.message
        });
    }
};

// Get specific config value by key
exports.getConfigByKey = async (req, res) => {
    try {
        const { key } = req.params;
        const organizationId = req.user.role === 'super_admin' && req.query.organizationId
            ? req.query.organizationId
            : req.user.organization;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }

        // Try to find organization-specific config
        const orgConfig = await OrganizationConfig.findOne({
            organization: organizationId,
            configKey: key,
            isActive: true
        });

        if (orgConfig) {
            return res.json({
                success: true,
                data: {
                    value: orgConfig.configValue,
                    isCustomized: true,
                    config: orgConfig
                }
            });
        }

        // Fall back to default value
        const defaultConfig = getDefaultValue(key);
        if (defaultConfig) {
            return res.json({
                success: true,
                data: {
                    value: defaultConfig.value,
                    isCustomized: false,
                    dataType: defaultConfig.dataType,
                    description: defaultConfig.description
                }
            });
        }

        res.status(404).json({
            success: false,
            message: 'Config key not found'
        });
    } catch (error) {
        console.error('Error fetching config by key:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching config',
            error: error.message
        });
    }
};

// Create or update a config
exports.upsertConfig = async (req, res) => {
    try {
        const { configKey, configValue, category } = req.body;
        const organizationId = req.user.role === 'super_admin' && req.body.organizationId
            ? req.body.organizationId
            : req.user.organization;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }

        if (!configKey || configValue === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Config key and value are required'
            });
        }

        // Get default config to validate
        const defaultConfig = getDefaultValue(configKey);
        if (!defaultConfig) {
            return res.status(400).json({
                success: false,
                message: 'Invalid config key'
            });
        }

        // Validate data type
        const expectedType = defaultConfig.dataType;
        let validatedValue = configValue;

        if (expectedType === 'number' && typeof configValue !== 'number') {
            validatedValue = Number(configValue);
            if (isNaN(validatedValue)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid number value'
                });
            }
        } else if (expectedType === 'boolean' && typeof configValue !== 'boolean') {
            validatedValue = configValue === 'true' || configValue === true;
        }

        // Upsert config
        const config = await OrganizationConfig.findOneAndUpdate(
            { organization: organizationId, configKey },
            {
                organization: organizationId,
                configKey,
                configValue: validatedValue,
                category: category || Object.keys(defaultConfigs).find(cat => defaultConfigs[cat][configKey]),
                dataType: expectedType,
                description: defaultConfig.description,
                updatedBy: req.user._id,
                isActive: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Log action
        await logAction(
            req.user._id,
            'update',
            'organization_config',
            config._id,
            { configKey, configValue: validatedValue },
            `Updated organization config: ${configKey}`,
            req
        );

        res.json({
            success: true,
            message: 'Config updated successfully',
            data: config
        });
    } catch (error) {
        console.error('Error upserting config:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating config',
            error: error.message
        });
    }
};

// Bulk upsert configs
exports.bulkUpsertConfigs = async (req, res) => {
    try {
        const { configs } = req.body;
        const organizationId = req.user.role === 'super_admin' && req.body.organizationId
            ? req.body.organizationId
            : req.user.organization;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }

        if (!Array.isArray(configs) || configs.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Configs array is required'
            });
        }

        const results = [];
        const errors = [];

        for (const configData of configs) {
            try {
                const { configKey, configValue } = configData;
                const defaultConfig = getDefaultValue(configKey);

                if (!defaultConfig) {
                    errors.push({ configKey, error: 'Invalid config key' });
                    continue;
                }

                const config = await OrganizationConfig.findOneAndUpdate(
                    { organization: organizationId, configKey },
                    {
                        organization: organizationId,
                        configKey,
                        configValue,
                        category: Object.keys(defaultConfigs).find(cat => defaultConfigs[cat][configKey]),
                        dataType: defaultConfig.dataType,
                        description: defaultConfig.description,
                        updatedBy: req.user._id,
                        isActive: true
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                results.push(config);
            } catch (error) {
                errors.push({ configKey: configData.configKey, error: error.message });
            }
        }

        // Log bulk action
        await logAction(
            req.user._id,
            'bulk_update',
            'organization_config',
            null,
            { count: results.length },
            `Bulk updated ${results.length} organization configs`,
            req
        );

        res.json({
            success: true,
            message: `Updated ${results.length} configs`,
            data: {
                updated: results,
                errors
            }
        });
    } catch (error) {
        console.error('Error bulk upserting configs:', error);
        res.status(500).json({
            success: false,
            message: 'Error bulk updating configs',
            error: error.message
        });
    }
};

// Delete config (revert to default)
exports.deleteConfig = async (req, res) => {
    try {
        const { key } = req.params;
        const organizationId = req.user.role === 'super_admin' && req.query.organizationId
            ? req.query.organizationId
            : req.user.organization;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }

        const config = await OrganizationConfig.findOneAndDelete({
            organization: organizationId,
            configKey: key
        });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Config not found'
            });
        }

        // Log action
        await logAction(
            req.user._id,
            'delete',
            'organization_config',
            config._id,
            { configKey: key },
            `Deleted organization config: ${key} (reverted to default)`,
            req
        );

        res.json({
            success: true,
            message: 'Config deleted successfully (reverted to default)'
        });
    } catch (error) {
        console.error('Error deleting config:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting config',
            error: error.message
        });
    }
};

// Reset all configs to defaults
exports.resetToDefaults = async (req, res) => {
    try {
        const organizationId = req.user.role === 'super_admin' && req.body.organizationId
            ? req.body.organizationId
            : req.user.organization;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }

        const result = await OrganizationConfig.deleteMany({
            organization: organizationId
        });

        // Log action
        await logAction(
            req.user._id,
            'bulk_delete',
            'organization_config',
            null,
            { count: result.deletedCount },
            `Reset all organization configs to defaults (deleted ${result.deletedCount} custom configs)`,
            req
        );

        res.json({
            success: true,
            message: `Reset ${result.deletedCount} configs to defaults`
        });
    } catch (error) {
        console.error('Error resetting configs:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting configs',
            error: error.message
        });
    }
};
