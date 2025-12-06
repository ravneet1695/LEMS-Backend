const User = require('../models/User');
const userPolicy = require('../policies/userPolicy');
const { logAction } = require('./auditLogController');

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Org Admin, Super Admin)
exports.createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, organization, groups, isActive, mobile, department } = req.body;

        // Validate required fields
        if (!email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, first name, last name, and role are required'
            });
        }

        // Validate organization requirement for non-super_admin users
        if (role !== 'super_admin' && !organization) {
            return res.status(400).json({
                success: false,
                message: 'Organization is required for all users except super_admin'
            });
        }

        // Validate that super_admin should not have organization
        if (role === 'super_admin' && organization) {
            return res.status(400).json({
                success: false,
                message: 'Super admin users should not be assigned to an organization'
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

        // Check if mobile number already exists (if provided)
        if (mobile) {
            const mobileExists = await User.findOne({ mobile });
            if (mobileExists) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this mobile number already exists',
                });
            }
        }

        // For org_admin, ensure they can only create users in their organization
        let userOrganization = organization;
        if (req.user.role === 'org_admin') {
            userOrganization = req.user.organization;
        }

        // Validate department belongs to the organization (if provided)
        if (department) {
            const Department = require('../models/Department');
            const departmentDoc = await Department.findOne({
                _id: department,
                isDeleted: false,
            });

            if (!departmentDoc) {
                return res.status(400).json({
                    success: false,
                    message: 'Department not found',
                });
            }

            if (departmentDoc.organization.toString() !== userOrganization.toString()) {
                return res.status(400).json({
                    success: false,
                    message: 'Department does not belong to the specified organization',
                });
            }
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
            mobile: mobile || null,
            department: department || null,
            profileImage: req.file ? `/${req.file.path}` : null, // Save uploaded file path
        });

        // Return user without password
        const userResponse = await User.findById(user._id)
            .populate('organization', 'name')
            .populate('department', 'name displayName')
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
                organization: userOrganization,
                mobile: mobile,
                department: department,
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
        console.log("llll", query);
        const users = await User.find(query)
            .populate('organization', 'name logo')
            .populate('department', 'name displayName')
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

        // Don't allow organization change through this endpoint
        delete req.body.organization;

        // Handle profile image upload
        if (req.file) {
            req.body.profileImage = `/${req.file.path}`;
        }

        user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })
            .populate('organization', 'name logo')
            .populate('department', 'name displayName')
            .select('-password');

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
// @desc    Bulk create users from CSV
// @route   POST /api/users/bulk
// @access  Private (Org Admin, Super Admin)
exports.bulkCreateUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a CSV file',
            });
        }

        const fs = require('fs');
        const csv = require('csv-parser');
        const results = [];
        const errors = [];

        // Read and parse CSV file
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                const createdUsers = [];
                const failedUsers = [];

                // Process each row
                for (let i = 0; i < results.length; i++) {
                    const row = results[i];
                    const rowNumber = i + 2; // +2 because row 1 is headers and arrays are 0-indexed

                    try {
                        // Validate required fields
                        if (!row.firstName || !row.lastName || !row.email || !row.password) {
                            failedUsers.push({
                                row: rowNumber,
                                data: row,
                                error: 'Missing required fields (firstName, lastName, email, password)',
                            });
                            continue;
                        }

                        // Check if user already exists
                        const userExists = await User.findOne({ email: row.email });
                        if (userExists) {
                            failedUsers.push({
                                row: rowNumber,
                                data: row,
                                error: 'User with this email already exists',
                            });
                            continue;
                        }

                        // Check mobile uniqueness if provided
                        if (row.mobile) {
                            const mobileExists = await User.findOne({ mobile: row.mobile });
                            if (mobileExists) {
                                failedUsers.push({
                                    row: rowNumber,
                                    data: row,
                                    error: 'User with this mobile number already exists',
                                });
                                continue;
                            }
                        }

                        // Determine organization
                        let userOrganization = row.organization || req.body.organization;
                        if (req.user.role === 'org_admin') {
                            userOrganization = req.user.organization;
                        }

                        // Find department by name if provided
                        let departmentId = null;
                        if (row.department) {
                            const Department = require('../models/Department');
                            const dept = await Department.findOne({
                                name: row.department.toLowerCase().trim(),
                                organization: userOrganization,
                                isDeleted: false,
                            });

                            if (dept) {
                                departmentId = dept._id;
                            } else {
                                // Department not found, but continue without it
                                console.log(`Department "${row.department}" not found for row ${rowNumber}`);
                            }
                        }

                        // Create user
                        const user = await User.create({
                            firstName: row.firstName.trim(),
                            lastName: row.lastName.trim(),
                            email: row.email.trim().toLowerCase(),
                            password: row.password,
                            role: row.role || 'learner',
                            organization: userOrganization,
                            mobile: row.mobile || null,
                            department: departmentId,
                            isActive: true,
                        });

                        createdUsers.push({
                            row: rowNumber,
                            email: user.email,
                            name: `${user.firstName} ${user.lastName}`,
                        });

                        // Log user creation
                        await logAction(
                            req.user._id,
                            'create',
                            'user',
                            user._id,
                            { email: user.email, source: 'bulk_upload' },
                            `Bulk created user: ${user.email}`,
                            req
                        );
                    } catch (error) {
                        failedUsers.push({
                            row: rowNumber,
                            data: row,
                            error: error.message,
                        });
                    }
                }

                // Delete uploaded file
                fs.unlinkSync(req.file.path);

                // Return results
                res.status(200).json({
                    success: true,
                    message: `Bulk upload completed. ${createdUsers.length} users created, ${failedUsers.length} failed.`,
                    data: {
                        created: createdUsers,
                        failed: failedUsers,
                        summary: {
                            total: results.length,
                            successful: createdUsers.length,
                            failed: failedUsers.length,
                        },
                    },
                });
            })
            .on('error', (error) => {
                // Delete uploaded file on error
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }

                res.status(500).json({
                    success: false,
                    message: 'Error parsing CSV file',
                    error: error.message,
                });
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing bulk upload',
            error: error.message,
        });
    }
};
