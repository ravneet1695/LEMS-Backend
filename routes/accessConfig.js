const express = require('express');
const router = express.Router();
const accessConfigController = require('../controllers/accessConfigController');
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
router.get('/my-modules', accessConfigController.getMyModules);

// All other routes require super_admin role
router.use(requireSuperAdmin);

// Get all role configurations
router.get('/', accessConfigController.getAllRoleConfigs);

// Get available modules
router.get('/modules', accessConfigController.getAvailableModules);

// Get role configuration by role name
router.get('/:roleName', accessConfigController.getRoleConfigByName);

// Create or update role configuration
router.post('/', accessConfigController.upsertRoleConfig);
router.put('/:roleName', accessConfigController.upsertRoleConfig);

// Update role module access specifically
router.patch('/:roleName/module-access', accessConfigController.updateRoleModuleAccess);

// Delete role configuration
router.delete('/:roleName', accessConfigController.deleteRoleConfig);

module.exports = router;
