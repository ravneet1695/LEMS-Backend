const User = require('../models/User');
const { logger } = require('../config/database');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .populate('roles', 'name description')
            .select('-passwordHash -mfaSecret')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments();

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error(`Get users error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('roles')
            .populate('organizationId', 'name slug');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        logger.error(`Get user error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { firstName, lastName, phone, avatarUrl, isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { firstName, lastName, phone, avatarUrl, isActive },
            { new: true, runValidators: true }
        ).populate('roles');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.info(`User updated: ${user.email}`);

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        logger.error(`Update user error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.info(`User deleted: ${user.email}`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error(`Delete user error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
};

// Assign role to user
exports.assignRole = async (req, res) => {
    try {
        const { roleId } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.roles.includes(roleId)) {
            return res.status(400).json({
                success: false,
                message: 'Role already assigned'
            });
        }

        user.roles.push(roleId);
        await user.save();

        await user.populate('roles');

        logger.info(`Role assigned to user: ${user.email}`);

        res.json({
            success: true,
            message: 'Role assigned successfully',
            data: { user }
        });
    } catch (error) {
        logger.error(`Assign role error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error assigning role',
            error: error.message
        });
    }
};

// Remove role from user
exports.removeRole = async (req, res) => {
    try {
        const { roleId } = req.params;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.roles = user.roles.filter(role => role.toString() !== roleId);
        await user.save();

        await user.populate('roles');

        logger.info(`Role removed from user: ${user.email}`);

        res.json({
            success: true,
            message: 'Role removed successfully',
            data: { user }
        });
    } catch (error) {
        logger.error(`Remove role error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error removing role',
            error: error.message
        });
    }
};
