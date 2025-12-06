const express = require('express');
const router = express.Router();
const roleConfigController = require('../controllers/roleConfigController');
const { protect } = require('../middleware/auth');

// Middleware to check if user is super_admin
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Super admin role required.'
        });
    }
    next();
};

// All routes require authentication
router.use(protect);

// Get current user's allowed modules (available to all authenticated users)
router.get('/my-modules', roleConfigController.getMyModules);

// All other routes require super_admin role
router.use(requireSuperAdmin);

// Get all role configurations
router.get('/', roleConfigController.getAllRoleConfigs);

// Get available modules
router.get('/modules', roleConfigController.getAvailableModules);

// Get role configuration by role name
router.get('/:roleName', roleConfigController.getRoleConfigByName);

// Create or update role configuration
router.post('/', roleConfigController.upsertRoleConfig);
router.put('/:roleName', roleConfigController.upsertRoleConfig);

// Update role module access specifically
router.patch('/:roleName/module-access', roleConfigController.updateRoleModuleAccess);

// Delete role configuration
router.delete('/:roleName', roleConfigController.deleteRoleConfig);

module.exports = router;
