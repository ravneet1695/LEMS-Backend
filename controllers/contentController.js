const Content = require('../models/Content');
const { logAction } = require('./auditLogController');
const Settings = require('../models/Settings');
const upload = require('../middleware/upload');

// Helper function to get default page size from settings
async function getDefaultPageSize() {
    try {
        const setting = await Settings.findOne({ key: 'tablePageSize' });
        const pageSize = setting?.value || 10;
        return (pageSize >= 5 && pageSize <= 100) ? pageSize : 10;
    } catch (error) {
        console.error('Error getting page size setting:', error);
        return 10;
    }
}

// @desc    Get all content
// @route   GET /api/content
// @access  Private
exports.getContents = async (req, res) => {
    try {
        const {
            grade,
            subject,
            topic,
            subtopic,
            difficulty,
            tags,
            type, // Added type
            approvalStatus,
            search = ''
        } = req.query;

        const query = {};

        // Filter by organization (except super admin)
        if (req.user.role !== 'super_admin') {
            query.organization = req.user.organization;
        }

        // Hierarchy filters
        if (grade) query['hierarchy.grade'] = grade;
        if (subject) query['hierarchy.subject'] = subject;
        if (topic) query['hierarchy.topic'] = topic;
        if (subtopic) query['hierarchy.subtopic'] = subtopic;

        // Other filters
        if (difficulty) query.difficulty = difficulty;
        if (approvalStatus) query.approvalStatus = approvalStatus;
        if (tags) query.tags = { $in: tags.split(',') };

        // Search
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const content = await Content.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .populate('organization', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Content.countDocuments(query);

        res.status(200).json({
            success: true,
            data: content,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single content
// @route   GET /api/content/:id
// @access  Private
exports.getSingleContent = async (req, res) => {
    try {
        const content = await Content.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .populate('organization', 'name');

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        res.status(200).json({
            success: true,
            data: content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create content
// @route   POST /api/content
// @access  Private (Content Creator)
exports.createContent = async (req, res) => {
    try {
        const { title, description, type, hierarchy, difficulty, tags, textContent } = req.body;

        // Parse hierarchy and tags if they're strings
        const parsedHierarchy = typeof hierarchy === 'string' ? JSON.parse(hierarchy) : hierarchy;
        const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;

        const contentData = {
            title,
            description,
            type,
            hierarchy: parsedHierarchy,
            difficulty,
            tags: parsedTags,
            createdBy: req.user._id,
            organization: req.user.organization
        };

        // Handle file upload
        if (req.file) {
            contentData.fileUrl = `/${req.file.path.replace(/\\/g, '/')}`;
        }

        // Handle text content
        if (type === 'text') {
            contentData.textContent = textContent;
        }

        const content = await Content.create(contentData);

        res.status(201).json({
            success: true,
            data: content,
            message: 'Content created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update content
// @route   PUT /api/content/:id
// @access  Private (Content Creator - own content)
exports.updateContent = async (req, res) => {
    try {
        let content = await Content.findById(req.params.id);

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        // Check ownership
        if (content.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this content'
            });
        }

        const { title, description, hierarchy, difficulty, tags, textContent } = req.body;

        // Parse hierarchy and tags if they're strings
        const parsedHierarchy = typeof hierarchy === 'string' ? JSON.parse(hierarchy) : hierarchy;
        const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;

        const updateData = {
            title,
            description,
            hierarchy: parsedHierarchy,
            difficulty,
            tags: parsedTags
        };

        // Handle file upload
        if (req.file) {
            updateData.fileUrl = `/${req.file.path.replace(/\\/g, '/')}`;
        }

        // Handle text content
        if (textContent) {
            updateData.textContent = textContent;
        }

        content = await Content.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: content,
            message: 'Content updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete content
// @route   DELETE /api/content/:id
// @access  Private (Content Creator - own content, Admin)
exports.deleteContent = async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        // Check ownership
        if (content.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this content'
            });
        }

        await content.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Content deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Approve/Reject content
// @route   PATCH /api/content/:id/approval
// @access  Private (Content Approver)
exports.updateApprovalStatus = async (req, res) => {
    try {
        const { approvalStatus, rejectionReason } = req.body;

        const content = await Content.findById(req.params.id);

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        content.approvalStatus = approvalStatus;
        content.approvedBy = req.user._id;
        content.approvalDate = Date.now();

        if (approvalStatus === 'rejected' && rejectionReason) {
            content.rejectionReason = rejectionReason;
        }

        await content.save();

        res.status(200).json({
            success: true,
            data: content,
            message: `Content ${approvalStatus} successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
