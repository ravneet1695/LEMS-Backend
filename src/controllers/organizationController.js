const Organization = require('../models/Organization');
const { logger } = require('../config/database');

exports.createOrganization = async (req, res) => {
    try {
        const { name, description, logoUrl, settings } = req.body;

        const organization = new Organization({
            name,
            description,
            logoUrl,
            settings,
            createdBy: req.user._id
        });

        await organization.save();

        logger.info(`Organization created: ${organization.name}`);

        res.status(201).json({
            success: true,
            data: { organization }
        });
    } catch (error) {
        logger.error(`Create organization error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error creating organization',
            error: error.message
        });
    }
};

exports.getAllOrganizations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const organizations = await Organization.find({ isActive: true })
            .populate('createdBy', 'firstName lastName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Organization.countDocuments({ isActive: true });

        res.json({
            success: true,
            data: {
                organizations,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error(`Get organizations error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching organizations',
            error: error.message
        });
    }
};

exports.getOrganizationById = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        res.json({
            success: true,
            data: { organization }
        });
    } catch (error) {
        logger.error(`Get organization error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching organization',
            error: error.message
        });
    }
};

exports.updateOrganization = async (req, res) => {
    try {
        const { name, description, logoUrl, settings, isActive } = req.body;

        const organization = await Organization.findByIdAndUpdate(
            req.params.id,
            { name, description, logoUrl, settings, isActive },
            { new: true, runValidators: true }
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        logger.info(`Organization updated: ${organization.name}`);

        res.json({
            success: true,
            data: { organization }
        });
    } catch (error) {
        logger.error(`Update organization error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error updating organization',
            error: error.message
        });
    }
};

exports.deleteOrganization = async (req, res) => {
    try {
        const organization = await Organization.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        logger.info(`Organization deactivated: ${organization.name}`);

        res.json({
            success: true,
            message: 'Organization deactivated successfully'
        });
    } catch (error) {
        logger.error(`Delete organization error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error deleting organization',
            error: error.message
        });
    }
};
