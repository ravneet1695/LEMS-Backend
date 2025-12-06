const Organization = require('../models/Organization');
const User = require('../models/User');
const { logAction } = require('./auditLogController');

// @desc    Create new organization
// @route   POST /api/organizations
// @access  Private/Super Admin
exports.createOrganization = async (req, res, next) => {
    try {
        let { name, description, websiteUrl, type, alias, code, adminDetails, settings } = req.body;

        // Parse adminDetails if it's a JSON string (from FormData)
        if (typeof adminDetails === 'string') {
            adminDetails = JSON.parse(adminDetails);
        }

        // Get logo path from uploaded file
        const logo = req.file ? `/uploads/logos/${req.file.filename}` : null;

        if (!logo) {
            return res.status(400).json({
                success: false,
                message: 'Logo file is required',
            });
        }

        // Check if organization already exists
        const organizationExists = await Organization.findOne({ $or: [{ name }, { code }] });
        if (organizationExists) {
            return res.status(400).json({
                success: false,
                message: 'Organization with this name or code already exists',
            });
        }

        // Check if admin email already exists
        const userExists = await User.findOne({ email: adminDetails.email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        // 1. Create the Admin User first (without organization initially)
        const adminUser = await User.create({
            firstName: adminDetails.firstName,
            lastName: adminDetails.lastName,
            email: adminDetails.email,
            password: adminDetails.password,
            role: 'org_admin',
        });

        // 2. Create the Organization
        const organization = await Organization.create({
            name,
            description,
            logo,
            websiteUrl,
            type,
            alias,
            code,
            admin: adminUser._id,
            settings,
        });

        // 3. Update User with Organization ID
        adminUser.organization = organization._id;
        await adminUser.save();

        // Log organization creation action
        await logAction(
            req.user._id,
            'create',
            'organization',
            organization._id,
            {
                name: organization.name,
                code: organization.code,
                admin: adminUser.email
            },
            `Created organization: ${organization.name}`,
            req
        );

        res.status(201).json({
            success: true,
            data: organization,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all organizations
// @route   GET /api/organizations
// @access  Private/Super Admin
exports.getOrganizations = async (req, res, next) => {
    try {
        const organizations = await Organization.find({ isDeleted: false }).populate('admin', 'firstName lastName email');

        res.status(200).json({
            success: true,
            count: organizations.length,
            data: organizations,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single organization
// @route   GET /api/organizations/:id
// @access  Private/Super Admin or Org Admin
exports.getOrganization = async (req, res, next) => {
    try {
        const organization = await Organization.findById(req.params.id).populate('admin', 'firstName lastName email');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found',
            });
        }

        // Check if organization is deleted
        if (organization.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found',
            });
        }

        res.status(200).json({
            success: true,
            data: organization,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update organization
// @route   PUT /api/organizations/:id
// @access  Private/Super Admin or Org Admin
exports.updateOrganization = async (req, res, next) => {
    try {
        let organization = await Organization.findById(req.params.id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found',
            });
        }

        // Store original values for audit log
        const originalValues = {
            name: organization.name,
            description: organization.description,
            websiteUrl: organization.websiteUrl,
            type: organization.type,
        };

        // Prepare update data
        const updateData = { ...req.body };

        // If a new logo file is uploaded, update the logo path
        if (req.file) {
            updateData.logo = `/uploads/logos/${req.file.filename}`;
        }

        organization = await Organization.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        });

        // Log organization update action
        const changes = {};
        Object.keys(updateData).forEach(key => {
            if (originalValues[key] !== undefined && originalValues[key] !== updateData[key]) {
                changes[key] = { from: originalValues[key], to: updateData[key] };
            }
        });

        await logAction(
            req.user._id,
            'update',
            'organization',
            organization._id,
            changes,
            `Updated organization: ${organization.name}`,
            req
        );

        res.status(200).json({
            success: true,
            data: organization,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete organization (Soft Delete)
// @route   DELETE /api/organizations/:id
// @access  Private (Super Admin)
exports.deleteOrganization = async (req, res, next) => {
    try {
        const organization = await Organization.findById(req.params.id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found',
            });
        }

        // Check if already deleted
        if (organization.isDeleted) {
            return res.status(400).json({
                success: false,
                message: 'Organization is already deleted',
            });
        }

        // Soft delete: mark as deleted
        organization.isDeleted = true;
        organization.deletedAt = Date.now();
        organization.deletedBy = req.user._id;
        await organization.save();

        // Log organization deletion
        await logAction(
            req.user._id,
            'delete',
            'organization',
            organization._id,
            { name: organization.name },
            `Deleted organization: ${organization.name}`,
            req
        );

        res.status(200).json({
            success: true,
            message: 'Organization deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
