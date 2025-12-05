const User = require('../models/User');
const userPolicy = require('../policies/userPolicy');
const { logAction } = require('./auditLogController');

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Org Admin, Super Admin)
exports.createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, organization, groups, isActive } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields',
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        // For org_admin, ensure they can only create users in their organization
        let userOrganization = organization;
        if (req.user.role === 'org_admin') {
            userOrganization = req.user.organization;
        }

        // Create user
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            role: role || 'learner',
            organization: userOrganization,
            groups: groups || [],
            isActive: isActive !== undefined ? isActive : true,
        });

        // Return user without password
        const userResponse = await User.findById(user._id)
            .populate('organization', 'name')
            .select('-password');

        // Log user creation action
        await logAction(
            req.user._id,
            'create',
            'user',
            user._id,
            {
                email: user.email,
                role: user.role,
                organization: userOrganization
            },
            `Created user: ${user.email}`,
            req
        );

        res.status(201).json({
            success: true,
            data: userResponse,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Org Admin, Super Admin)
exports.getUsers = async (req, res) => {
    try {
        const {
            role,
            organization,
            page = 1,
            limit = 20,
            search = '',
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = {};

        // Filter out deleted users
        query.isDeleted = false;

        // Filter by organization (except super admin)
        if (req.user.role !== 'super_admin') {
            if (req.user.organization) {
                query.organization = req.user.organization;
            }
        } else if (organization) {
            query.organization = organization;
        }

        // Filter by role
        if (role) query.role = role;

        // Filter by status
        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        // Search by name or email
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort object
        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const users = await User.find(query)
            .populate('organization', 'name logo')
            .populate('groups', 'name')
            .select('-password')
            .sort(sortObj)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('organization', 'name logo')
            .populate('groups', 'name')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Check if user is deleted
        if (user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!userPolicy.canViewUser(req.user, user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this user',
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!userPolicy.canEditUser(req.user, user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this user',
            });
        }

        // Store original values for audit log
        const originalValues = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        };

        // Don't allow password update through this endpoint
        delete req.body.password;

        user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).select('-password');

        // Log user update action
        const changes = {};
        Object.keys(req.body).forEach(key => {
            if (originalValues[key] !== undefined && originalValues[key] !== req.body[key]) {
                changes[key] = { from: originalValues[key], to: req.body[key] };
            }
        });

        await logAction(
            req.user._id,
            'update',
            'user',
            user._id,
            changes,
            `Updated user: ${user.email}`,
            req
        );

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Delete user (Soft Delete)
// @route   DELETE /api/users/:id
// @access  Private (Super Admin, Org Admin)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Check if already deleted
        if (user.isDeleted) {
            return res.status(400).json({
                success: false,
                message: 'User is already deleted',
            });
        }

        // Soft delete: mark as deleted instead of removing
        user.isDeleted = true;
        user.deletedAt = Date.now();
        user.deletedBy = req.user._id;
        await user.save();

        // Log the deletion action
        await logAction(
            req.user._id,
            'delete',
            'user',
            user._id,
            { email: user.email, role: user.role },
            `Deleted user: ${user.email}`,
            req
        );

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Toggle user status (activate/deactivate)
// @route   PATCH /api/users/:id/status
// @access  Private (Org Admin, Super Admin)
exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!userPolicy.canEditUser(req.user, user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this user',
            });
        }

        // Toggle the status
        user.isActive = !user.isActive;
        await user.save();

        // Log status change action
        await logAction(
            req.user._id,
            'status_change',
            'user',
            user._id,
            {
                isActive: user.isActive,
                action: user.isActive ? 'activated' : 'deactivated'
            },
            `User ${user.isActive ? 'activated' : 'deactivated'}: ${user.email}`,
            req
        );

        res.status(200).json({
            success: true,
            data: user,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
