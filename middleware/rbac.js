// Role-based access control middleware
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`,
            });
        }
        next();
    };
};

// Check if user belongs to organization
exports.checkOrganization = (req, res, next) => {
    const organizationId = req.params.organizationId || req.body.organization;

    if (req.user.role === 'super_admin') {
        return next();
    }

    if (!req.user.organization || req.user.organization.toString() !== organizationId) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to access this organization',
        });
    }

    next();
};

// Check if user is manager of group
exports.checkGroupManager = async (req, res, next) => {
    const Group = require('../models/Group');
    const groupId = req.params.groupId || req.body.group;

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found',
            });
        }

        // Super admin and org admin can access all groups
        if (req.user.role === 'super_admin' || req.user.role === 'org_admin') {
            return next();
        }

        // Check if user is a manager of this group
        const isManager = group.managers.some((manager) => manager.toString() === req.user._id.toString());

        if (!isManager) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to manage this group',
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
};
