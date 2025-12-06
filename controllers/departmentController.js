const Department = require('../models/Department');
const { logAction } = require('./auditLogController');
const Settings = require('../models/Settings');

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

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (Org Admin, Super Admin)
exports.createDepartment = async (req, res) => {
    try {
        const { name, displayName, description, organization } = req.body;

        // Validate required fields
        if (!name || !displayName || !organization) {
            return res.status(400).json({
                success: false,
                message: 'Name, display name, and organization are required',
            });
        }

        // Check if department with same name already exists in this organization
        const existingDepartment = await Department.findOne({
            name: name.toLowerCase().trim(),
            organization,
            isDeleted: false,
        });

        if (existingDepartment) {
            return res.status(400).json({
                success: false,
                message: 'Department with this name already exists in this organization',
            });
        }

        // Create department
        const department = await Department.create({
            name: name.toLowerCase().trim(),
            displayName: displayName.trim(),
            description: description?.trim() || '',
            organization,
            createdBy: req.user._id,
            updatedBy: req.user._id,
        });

        // Log action
        await logAction(
            req.user._id,
            'create',
            'department',
            department._id,
            { name, displayName, organization },
            `Created department: ${displayName}`,
            req
        );

        res.status(201).json({
            success: true,
            message: 'Department created successfully',
            data: department,
        });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating department',
            error: error.message,
        });
    }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
exports.getDepartments = async (req, res) => {
    try {
        const { organization, search, status } = req.query;

        // Build query
        const query = { isDeleted: false };

        if (organization) {
            query.organization = organization;
        } else if (req.user.organization) {
            // If no organization specified, use user's organization
            query.organization = req.user.organization;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } },
            ];
        }

        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        // Get default page size from settings
        const defaultPageSize = await getDefaultPageSize();

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || defaultPageSize;

        const departments = await Department.find(query)
            .populate('organization', 'name')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .sort({ displayName: 1 })
            .limit(limit)
            .skip((page - 1) * limit);

        // Get total count
        const count = await Department.countDocuments(query);

        res.json({
            success: true,
            data: departments,
            pagination: {
                total: count,
                page,
                pages: Math.ceil(count / limit),
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching departments',
            error: error.message,
        });
    }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
exports.getDepartment = async (req, res) => {
    try {
        const department = await Department.findOne({
            _id: req.params.id,
            isDeleted: false,
        })
            .populate('organization', 'name')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found',
            });
        }

        res.json({
            success: true,
            data: department,
        });
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching department',
            error: error.message,
        });
    }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Org Admin, Super Admin)
exports.updateDepartment = async (req, res) => {
    try {
        const { name, displayName, description } = req.body;

        const department = await Department.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found',
            });
        }

        // Check if new name conflicts with existing department
        if (name && name.toLowerCase().trim() !== department.name) {
            const existingDepartment = await Department.findOne({
                name: name.toLowerCase().trim(),
                organization: department.organization,
                isDeleted: false,
                _id: { $ne: department._id },
            });

            if (existingDepartment) {
                return res.status(400).json({
                    success: false,
                    message: 'Department with this name already exists in this organization',
                });
            }
        }

        // Update fields
        if (name) department.name = name.toLowerCase().trim();
        if (displayName) department.displayName = displayName.trim();
        if (description !== undefined) department.description = description.trim();
        department.updatedBy = req.user._id;

        await department.save();

        // Log action
        await logAction(
            req.user._id,
            'update',
            'department',
            department._id,
            { name, displayName, description },
            `Updated department: ${department.displayName}`,
            req
        );

        res.json({
            success: true,
            message: 'Department updated successfully',
            data: department,
        });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating department',
            error: error.message,
        });
    }
};

// @desc    Delete department (Soft Delete)
// @route   DELETE /api/departments/:id
// @access  Private (Org Admin, Super Admin)
exports.deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found',
            });
        }

        // Soft delete
        department.isDeleted = true;
        department.deletedAt = new Date();
        department.deletedBy = req.user._id;
        await department.save();

        // Log action
        await logAction(
            req.user._id,
            'delete',
            'department',
            department._id,
            {},
            `Deleted department: ${department.displayName}`,
            req
        );

        res.json({
            success: true,
            message: 'Department deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting department',
            error: error.message,
        });
    }
};

// @desc    Toggle department status
// @route   PATCH /api/departments/:id/status
// @access  Private (Org Admin, Super Admin)
exports.toggleDepartmentStatus = async (req, res) => {
    try {
        const department = await Department.findOne({
            _id: req.params.id,
            isDeleted: false,
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found',
            });
        }

        department.isActive = !department.isActive;
        department.updatedBy = req.user._id;
        await department.save();

        // Log action
        await logAction(
            req.user._id,
            'update',
            'department',
            department._id,
            { isActive: department.isActive },
            `${department.isActive ? 'Activated' : 'Deactivated'} department: ${department.displayName}`,
            req
        );

        res.json({
            success: true,
            message: `Department ${department.isActive ? 'activated' : 'deactivated'} successfully`,
            data: department,
        });
    } catch (error) {
        console.error('Error toggling department status:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling department status',
            error: error.message,
        });
    }
};
