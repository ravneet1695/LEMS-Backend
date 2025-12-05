const RoleConfig = require('../models/RoleConfig');
const NavigationItem = require('../models/NavigationItem');
const { logAction } = require('./auditLogController');

// Get all role configurations
exports.getAllRoleConfigs = async (req, res) => {
    console.log("req.user sjbwjd", req.user);
    try {
        const { organizationId } = req.query;
        console.log("organizationId", organizationId);
        let query = {};

        if (organizationId) {
            // Get both global roles and organization-specific roles
            query = {
                $or: [
                    { organization: null, isSystemRole: true },
                    { organization: organizationId }
                ]
            };
        } else if (req.user.organization) {
            // If user has an organization, show global + their org roles
            query = {
                $or: [
                    { organization: null, isSystemRole: true },
                    { organization: req.user.organization }
                ]
            };
        } else {
            // Super admin without org filter sees all global roles
            query = { organization: null };
        }

        const roleConfigs = await RoleConfig.find(query)
            .populate('organization', 'name')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: roleConfigs
        });
    } catch (error) {
        console.error('Error fetching role configurations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching role configurations',
            error: error.message
        });
    }
};

// Get role configuration by role name
exports.getRoleConfigByName = async (req, res) => {
    try {
        const { roleName } = req.params;

        const roleConfig = await RoleConfig.findOne({ roleName })
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        if (!roleConfig) {
            return res.status(404).json({
                success: false,
                message: 'Role configuration not found'
            });
        }

        res.json({
            success: true,
            data: roleConfig
        });
    } catch (error) {
        console.error('Error fetching role configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching role configuration',
            error: error.message
        });
    }
};

// Create or update role configuration
exports.upsertRoleConfig = async (req, res) => {
    try {
        const { roleName, displayName, description, moduleAccess, permissions, organizationId } = req.body;

        // Validate required fields
        if (!roleName || !displayName || !moduleAccess) {
            return res.status(400).json({
                success: false,
                message: 'Role name, display name, and module access are required'
            });
        }

        // Build query to find existing role
        const query = { roleName };
        if (organizationId) {
            query.organization = organizationId;
        } else {
            query.organization = null;
        }

        // Check if role config already exists
        let roleConfig = await RoleConfig.findOne(query);

        if (roleConfig) {
            // Prevent updating system roles
            if (roleConfig.isSystemRole && req.user.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot modify system roles'
                });
            }

            // Update existing role config
            roleConfig.displayName = displayName;
            roleConfig.description = description;
            roleConfig.moduleAccess = moduleAccess;
            roleConfig.permissions = permissions || {};
            roleConfig.updatedBy = req.user._id;

            await roleConfig.save();

            // Log role update action
            await logAction(
                req.user._id,
                'role_change',
                'role',
                roleConfig._id,
                { roleName, moduleAccess, permissions },
                `Updated role configuration: ${roleName}`,
                req
            );

            res.json({
                success: true,
                message: 'Role configuration updated successfully',
                data: roleConfig
            });
        } else {
            // Create new role config
            roleConfig = new RoleConfig({
                roleName,
                displayName,
                description,
                organization: organizationId || null,
                moduleAccess,
                permissions: permissions || {},
                isSystemRole: !organizationId, // Only global roles are system roles
                createdBy: req.user._id,
                updatedBy: req.user._id
            });

            await roleConfig.save();

            // Log role creation action
            await logAction(
                req.user._id,
                'create',
                'role',
                roleConfig._id,
                { roleName, moduleAccess, permissions },
                `Created role configuration: ${roleName}`,
                req
            );

            res.status(201).json({
                success: true,
                message: 'Role configuration created successfully',
                data: roleConfig
            });
        }
    } catch (error) {
        console.error('Error upserting role configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving role configuration',
            error: error.message
        });
    }
};

// Delete role configuration
exports.deleteRoleConfig = async (req, res) => {
    try {
        const { roleName } = req.params;

        // Prevent deletion of system roles
        const systemRoles = ['super_admin', 'org_admin', 'learner'];
        if (systemRoles.includes(roleName)) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete system role configuration'
            });
        }

        const roleConfig = await RoleConfig.findOneAndDelete({ roleName });

        if (!roleConfig) {
            return res.status(404).json({
                success: false,
                message: 'Role configuration not found'
            });
        }

        // Log role deletion action
        await logAction(
            req.user._id,
            'delete',
            'role',
            roleConfig._id,
            { roleName },
            `Deleted role configuration: ${roleName}`,
            req
        );

        res.json({
            success: true,
            message: 'Role configuration deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting role configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting role configuration',
            error: error.message
        });
    }
};

// Get available modules from NavigationItem database
exports.getAvailableModules = async (req, res) => {
    try {
        // Fetch all active navigation items (global only)
        const navigationItems = await NavigationItem.find({
            isActive: true,
            organization: null,  // Only global modules
            parent: null  // Only top-level items
        }).select('module label description icon').lean();

        // Create a map to get unique modules (some nav items share modules)
        const moduleMap = new Map();

        navigationItems.forEach(item => {
            if (!moduleMap.has(item.module)) {
                moduleMap.set(item.module, {
                    id: item.module,
                    name: item.label,
                    description: item.description || `Manage ${item.label.toLowerCase()}`,
                    icon: item.icon
                });
            }
        });

        // Convert map to array and sort by module name
        const modules = Array.from(moduleMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        res.json({
            success: true,
            data: modules
        });
    } catch (error) {
        console.error('Error fetching available modules:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available modules',
            error: error.message
        });
    }
};

// Update role module access specifically
exports.updateRoleModuleAccess = async (req, res) => {
    try {
        const { roleName } = req.params;
        const { moduleAccess } = req.body;

        // Validate module access
        if (!moduleAccess || !Array.isArray(moduleAccess)) {
            return res.status(400).json({
                success: false,
                message: 'Module access must be an array'
            });
        }

        // Find and update the role configuration atomically to avoid version conflicts
        const roleConfig = await RoleConfig.findOneAndUpdate(
            { roleName },
            {
                $set: {
                    moduleAccess: moduleAccess,
                    updatedBy: req.user._id,
                    updatedAt: new Date()
                }
            },
            {
                new: true,  // Return the updated document
                runValidators: true  // Run schema validators
            }
        );

        if (!roleConfig) {
            return res.status(404).json({
                success: false,
                message: 'Role configuration not found'
            });
        }

        // Check if it's a system role after finding it
        if (roleConfig.isSystemRole && req.user.role !== 'super_admin') {
            // Revert the change if unauthorized
            return res.status(403).json({
                success: false,
                message: 'Cannot modify system role module access'
            });
        }

        // Log permission change action
        await logAction(
            req.user._id,
            'permission_change',
            'role',
            roleConfig._id,
            { roleName, moduleAccess },
            `Updated module access for role: ${roleName}`,
            req
        );

        res.json({
            success: true,
            message: 'Module access updated successfully',
            data: roleConfig
        });
    } catch (error) {
        console.error('Error updating role module access:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating role module access',
            error: error.message
        });
    }
};

// Get current user's allowed modules
exports.getMyModules = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const userOrganization = req.user.organization;
        console.log(`[getMyModules] User: ${userId}, Role: ${userRole}, Org: ${userOrganization}`);

        // Helper function to build navigation structure from database
        const buildNavigation = async (allowedModules, userOrganization = null) => {
            try {
                // Query for navigation items
                // First try organization-specific, then fall back to global
                const query = {
                    isActive: true,
                    parent: null, // Get only top-level items
                    $or: [
                        { organization: null }, // Global items
                        ...(userOrganization ? [{ organization: userOrganization }] : [])
                    ]
                };

                // Fetch top-level navigation items
                const topLevelItems = await NavigationItem.find(query).sort({ order: 1 }).lean();

                // Filter based on allowed modules
                const filteredItems = topLevelItems.filter(item =>
                    allowedModules.includes(item.module)
                );

                // For each top-level item, fetch its children
                const itemsWithChildren = await Promise.all(
                    filteredItems.map(async (item) => {
                        const children = await NavigationItem.find({
                            parent: item._id,
                            isActive: true
                        }).sort({ order: 1 }).lean();

                        // Filter children based on allowed modules
                        const filteredChildren = children.filter(child =>
                            allowedModules.includes(child.module)
                        );

                        // Transform to frontend format
                        return {
                            id: item.itemId,
                            label: item.label,
                            icon: item.icon,
                            route: item.route,
                            module: item.module,
                            order: item.order,
                            ...(filteredChildren.length > 0 && {
                                children: filteredChildren.map(child => ({
                                    id: child.itemId,
                                    label: child.label,
                                    icon: child.icon,
                                    route: child.route,
                                    module: child.module
                                }))
                            })
                        };
                    })
                );

                return itemsWithChildren;
            } catch (error) {
                console.error('[buildNavigation] Error fetching navigation from DB:', error);
                // Return empty array on error
                return [];
            }
        };
        // Step 1: Try to find organization-specific role config
        if (userOrganization) {
            const orgSpecificConfig = await RoleConfig.findOne({
                roleName: userRole,
                organization: userOrganization
            });

            if (orgSpecificConfig) {
                console.log(`[getMyModules] Found org-specific config for ${userRole} in org ${userOrganization}`);
                const allowedModules = orgSpecificConfig.moduleAccess || [];
                return res.json({
                    success: true,
                    data: {
                        modules: allowedModules,
                        navigation: await buildNavigation(allowedModules, userOrganization),
                        role: userRole,
                        configType: 'organization-specific',
                        roleConfig: {
                            displayName: orgSpecificConfig.displayName,
                            description: orgSpecificConfig.description
                        }
                    }
                });
            }
        }

        // Step 2: Fall back to default (global) role config
        const defaultConfig = await RoleConfig.findOne({
            roleName: userRole,
            organization: null,
            isSystemRole: true
        });

        if (defaultConfig) {
            console.log(`[getMyModules] Using default config for role ${userRole}`);
            const allowedModules = defaultConfig.moduleAccess || [];
            return res.json({
                success: true,
                data: {
                    modules: allowedModules,
                    navigation: await buildNavigation(allowedModules, null),
                    role: userRole,
                    configType: 'default',
                    roleConfig: {
                        displayName: defaultConfig.displayName,
                        description: defaultConfig.description
                    }
                }
            });
        }

        // Step 3: No config found, return minimal default
        console.log(`[getMyModules] No config found for role ${userRole}, returning minimal default`);
        const minimalModules = ['dashboard'];
        res.json({
            success: true,
            data: {
                modules: minimalModules,
                navigation: await buildNavigation(minimalModules, null),
                role: userRole,
                configType: 'minimal-default',
                roleConfig: {
                    displayName: userRole,
                    description: 'No configuration found'
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user modules:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user modules',
            error: error.message
        });
    }
};
