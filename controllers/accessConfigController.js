const AccessConfig = require('../models/AccessConfig');
const NavigationItem = require('../models/NavigationItem');
const { logAction } = require('./auditLogController');

// Get all role configurations
exports.getAllRoleConfigs = async (req, res) => {
    try {
        const { organizationId } = req.query;
        console.log('[getAllRoleConfigs] User:', req.user.email, 'Role:', req.user.role, 'Org:', req.user.organization);
        console.log('[getAllRoleConfigs] Query organizationId:', organizationId);

        let roleConfigs;

        if (organizationId) {
            // When organization filter is applied, return org-specific configs with fallback to global
            console.log('[getAllRoleConfigs] Querying with organization filter:', organizationId);

            const mongoose = require('mongoose');
            const orgObjectId = new mongoose.Types.ObjectId(organizationId);

            // Get all global system roles
            const globalRoles = await AccessConfig.find({
                organization: null,
                isSystemRole: true
            })
                .populate('organization', 'name')
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .lean();

            // Get all organization-specific roles for this organization
            const orgSpecificRoles = await AccessConfig.find({
                organization: orgObjectId
            })
                .populate('organization', 'name')
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .lean();

            // Create a map of org-specific roles by roleName
            const orgRoleMap = new Map();
            orgSpecificRoles.forEach(role => {
                orgRoleMap.set(role.roleName, role);
            });

            // Build final list: use org-specific if exists, otherwise use global
            roleConfigs = globalRoles.map(globalRole => {
                const orgSpecific = orgRoleMap.get(globalRole.roleName);
                if (orgSpecific) {
                    // Use org-specific config
                    console.log(`[getAllRoleConfigs] Using org-specific config for ${globalRole.roleName}`);
                    return orgSpecific;
                } else {
                    // Use global config
                    console.log(`[getAllRoleConfigs] Using global config for ${globalRole.roleName}`);
                    return globalRole;
                }
            });

            // Add any org-specific roles that don't have a global counterpart
            orgSpecificRoles.forEach(orgRole => {
                const hasGlobalCounterpart = globalRoles.some(g => g.roleName === orgRole.roleName);
                if (!hasGlobalCounterpart) {
                    console.log(`[getAllRoleConfigs] Adding org-only role: ${orgRole.roleName}`);
                    roleConfigs.push(orgRole);
                }
            });

        } else {
            // No organization filter: show based on user's role
            if (req.user.role === 'super_admin') {
                // Super admin sees all system roles by default
                console.log('[getAllRoleConfigs] Super admin - showing all system roles');
                roleConfigs = await AccessConfig.find({
                    organization: null,
                    isSystemRole: true
                })
                    .populate('organization', 'name')
                    .populate('createdBy', 'firstName lastName email')
                    .populate('updatedBy', 'firstName lastName email')
                    .sort({ isSystemRole: -1, createdAt: -1 });
            } else if (req.user.organization) {
                // Org admin sees system roles + their org's custom roles (prioritized)
                console.log('[getAllRoleConfigs] Org admin - showing system roles + org roles');

                const mongoose = require('mongoose');
                const userOrgId = new mongoose.Types.ObjectId(req.user.organization);

                const globalRoles = await AccessConfig.find({
                    organization: null,
                    isSystemRole: true
                }).lean();

                const orgSpecificRoles = await AccessConfig.find({
                    organization: userOrgId
                }).lean();

                // Prioritize org-specific over global
                const orgRoleMap = new Map();
                orgSpecificRoles.forEach(role => {
                    orgRoleMap.set(role.roleName, role);
                });

                roleConfigs = globalRoles.map(globalRole =>
                    orgRoleMap.get(globalRole.roleName) || globalRole
                );

                // Add org-only roles
                orgSpecificRoles.forEach(orgRole => {
                    if (!globalRoles.some(g => g.roleName === orgRole.roleName)) {
                        roleConfigs.push(orgRole);
                    }
                });
            } else {
                // Fallback: show only system roles
                console.log('[getAllRoleConfigs] Fallback - showing system roles only');
                roleConfigs = await AccessConfig.find({
                    organization: null,
                    isSystemRole: true
                })
                    .populate('organization', 'name')
                    .populate('createdBy', 'firstName lastName email')
                    .populate('updatedBy', 'firstName lastName email')
                    .sort({ isSystemRole: -1, createdAt: -1 });
            }
        }

        console.log('[getAllRoleConfigs] Found', roleConfigs.length, 'role configurations');

        res.json({
            success: true,
            data: roleConfigs
        });
    } catch (error) {
        console.error('[getAllRoleConfigs] Error:', error);
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

        const roleConfig = await AccessConfig.findOne({ roleName })
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
        let roleConfig = await AccessConfig.findOne(query);

        if (roleConfig) {
            // Check if user has permission to modify this role
            // Only super_admin and org_admin can modify role configurations
            const canManageRoles = req.user.role === 'super_admin' || req.user.role === 'org_admin';

            // Prevent updating system roles unless user has permission
            if (roleConfig.isSystemRole && !canManageRoles) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to modify system roles'
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
            roleConfig = new AccessConfig({
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

        // Find the role first to check if it's deletable
        const roleConfig = await AccessConfig.findOne({ roleName });

        if (!roleConfig) {
            return res.status(404).json({
                success: false,
                message: 'Role configuration not found'
            });
        }

        // Check if role is deletable (database-driven check)
        if (!roleConfig.isDeletable) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete this role. It is marked as non-deletable in the system.'
            });
        }

        // Delete the role
        await AccessConfig.findByIdAndDelete(roleConfig._id);

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
        const { moduleAccess, organizationId } = req.body;

        console.log('[updateRoleModuleAccess] roleName:', roleName);
        console.log('[updateRoleModuleAccess] moduleAccess:', moduleAccess);
        console.log('[updateRoleModuleAccess] organizationId:', organizationId);

        // Validate module access
        if (!moduleAccess || !Array.isArray(moduleAccess)) {
            return res.status(400).json({
                success: false,
                message: 'Module access must be an array'
            });
        }

        // Check if user has permission to modify roles
        // Only super_admin and org_admin can modify role configurations
        const canManageRoles = req.user.role === 'super_admin' || req.user.role === 'org_admin';

        if (!canManageRoles) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify role configurations'
            });
        }

        let roleConfig;
        let isNewConfig = false;

        if (organizationId) {
            // CASE 1: Organization is selected - Create/Update organization-specific role config
            console.log('[updateRoleModuleAccess] Creating/updating org-specific config for org:', organizationId);
            console.log('[updateRoleModuleAccess] organizationId type:', typeof organizationId);

            // Convert organizationId string to ObjectId for proper MongoDB matching
            const mongoose = require('mongoose');
            const orgObjectId = new mongoose.Types.ObjectId(organizationId);
            console.log('[updateRoleModuleAccess] Converted to ObjectId:', orgObjectId);

            // Find existing org-specific config
            const query = {
                roleName,
                organization: orgObjectId
            };
            console.log('[updateRoleModuleAccess] Query:', JSON.stringify(query));

            roleConfig = await AccessConfig.findOne(query);
            const total = await AccessConfig.countDocuments(query);

            console.log('[updateRoleModuleAccess] Found existing config:', roleConfig ? 'YES' : 'NO');
            if (roleConfig) {
                console.log('[updateRoleModuleAccess] Existing config ID:', roleConfig._id);
                console.log('[updateRoleModuleAccess] Existing config org:', roleConfig.organization);
            }

            if (roleConfig) {
                // Update existing org-specific config
                console.log('[updateRoleModuleAccess] Found existing org-specific config, updating...');
                roleConfig.moduleAccess = moduleAccess;
                roleConfig.updatedBy = req.user._id;
                roleConfig.updatedAt = new Date();
                await roleConfig.save();
            } else {
                // Create new org-specific config based on global role
                console.log('[updateRoleModuleAccess] No org-specific config found, creating new one...');

                // Get the global role config as template
                const globalRoleConfig = await AccessConfig.findOne({
                    roleName,
                    organization: null,
                    isSystemRole: true
                });

                if (!globalRoleConfig) {
                    return res.status(404).json({
                        success: false,
                        message: `Global role configuration for '${roleName}' not found`
                    });
                }

                // Create organization-specific role config
                roleConfig = new AccessConfig({
                    roleName,
                    displayName: globalRoleConfig.displayName,
                    description: `${globalRoleConfig.description} (Organization-specific)`,
                    organization: orgObjectId,
                    moduleAccess,
                    permissions: globalRoleConfig.permissions || {},
                    isSystemRole: false, // Org-specific configs are not system roles
                    isDeletable: true, // Org-specific configs can be deleted
                    isDefault: false,
                    canManageOrganizations: false,
                    canManageSettings: false,
                    canManageRoles: false,
                    createdBy: req.user._id,
                    updatedBy: req.user._id
                });

                await roleConfig.save();
                isNewConfig = true;
                console.log('[updateRoleModuleAccess] Created new org-specific config:', roleConfig._id);
            }

            // Log action
            await logAction(
                req.user._id,
                isNewConfig ? 'create' : 'permission_change',
                'role',
                roleConfig._id,
                { roleName, moduleAccess, organizationId },
                `${isNewConfig ? 'Created' : 'Updated'} organization-specific module access for role: ${roleName}`,
                req
            );

        } else {
            // CASE 2: No organization selected - Update global role config
            console.log('[updateRoleModuleAccess] Updating global role config');

            roleConfig = await AccessConfig.findOne({
                roleName,
                organization: null,
                isSystemRole: true
            });

            if (!roleConfig) {
                return res.status(404).json({
                    success: false,
                    message: 'Global role configuration not found'
                });
            }

            // Update global role config
            roleConfig.moduleAccess = moduleAccess;
            roleConfig.updatedBy = req.user._id;
            roleConfig.updatedAt = new Date();
            await roleConfig.save();

            console.log('[updateRoleModuleAccess] Updated global role config');

            // Log action
            await logAction(
                req.user._id,
                'permission_change',
                'role',
                roleConfig._id,
                { roleName, moduleAccess },
                `Updated global module access for role: ${roleName}`,
                req
            );
        }

        res.json({
            success: true,
            message: isNewConfig
                ? 'Organization-specific role configuration created successfully'
                : 'Module access updated successfully',
            data: roleConfig
        });
    } catch (error) {
        console.error('[updateRoleModuleAccess] Error:', error);
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
            const orgSpecificConfig = await AccessConfig.findOne({
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
        const defaultConfig = await AccessConfig.findOne({
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
