const LearningMaterial = require('../models/LearningMaterial');
const { logger } = require('../config/database');

exports.createContent = async (req, res) => {
    try {
        const content = new LearningMaterial({
            ...req.body,
            organizationId: req.user.organizationId,
            createdBy: req.user._id
        });

        await content.save();

        logger.info(`Content created: ${content.title}`);

        res.status(201).json({
            success: true,
            data: { content }
        });
    } catch (error) {
        logger.error(`Create content error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error creating content',
            error: error.message
        });
    }
};

exports.getAllContent = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { organizationId: req.user.organizationId };
        if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
        if (req.query.contentType) filter.contentType = req.query.contentType;

        const content = await LearningMaterial.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await LearningMaterial.countDocuments(filter);

        res.json({
            success: true,
            data: {
                content,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error(`Get content error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching content',
            error: error.message
        });
    }
};

exports.getContentById = async (req, res) => {
    try {
        const content = await LearningMaterial.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName email');

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        res.json({
            success: true,
            data: { content }
        });
    } catch (error) {
        logger.error(`Get content error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching content',
            error: error.message
        });
    }
};

exports.updateContent = async (req, res) => {
    try {
        const content = await LearningMaterial.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        logger.info(`Content updated: ${content.title}`);

        res.json({
            success: true,
            data: { content }
        });
    } catch (error) {
        logger.error(`Update content error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error updating content',
            error: error.message
        });
    }
};

exports.deleteContent = async (req, res) => {
    try {
        const content = await LearningMaterial.findByIdAndDelete(req.params.id);

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        logger.info(`Content deleted: ${content.title}`);

        res.json({
            success: true,
            message: 'Content deleted successfully'
        });
    } catch (error) {
        logger.error(`Delete content error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error deleting content',
            error: error.message
        });
    }
};

exports.approveContent = async (req, res) => {
    try {
        const content = await LearningMaterial.findByIdAndUpdate(
            req.params.id,
            {
                approvalStatus: 'approved',
                approvedBy: req.user._id,
                approvedAt: new Date()
            },
            { new: true }
        );

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        logger.info(`Content approved: ${content.title}`);

        res.json({
            success: true,
            message: 'Content approved successfully',
            data: { content }
        });
    } catch (error) {
        logger.error(`Approve content error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error approving content',
            error: error.message
        });
    }
};

exports.rejectContent = async (req, res) => {
    try {
        const { reason } = req.body;

        const content = await LearningMaterial.findByIdAndUpdate(
            req.params.id,
            {
                approvalStatus: 'rejected',
                approvedBy: req.user._id,
                approvedAt: new Date(),
                rejectionReason: reason
            },
            { new: true }
        );

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        logger.info(`Content rejected: ${content.title}`);

        res.json({
            success: true,
            message: 'Content rejected',
            data: { content }
        });
    } catch (error) {
        logger.error(`Reject content error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error rejecting content',
            error: error.message
        });
    }
};
