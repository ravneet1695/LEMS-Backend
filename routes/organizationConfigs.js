const express = require('express');
const router = express.Router();
const {
    getOrganizationConfigs,
    getAvailableConfigKeys,
    getConfigByKey,
    upsertConfig,
    bulkUpsertConfigs,
    deleteConfig,
    resetToDefaults
} = require('../controllers/organizationConfigController');
const { protect } = require('../middleware/auth');

// Middleware to check if user is org_admin or super_admin
const requireOrgAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin' && req.user.role !== 'org_admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Organization admin or super admin role required.'
        });
    }
    next();
};

// All routes require authentication
router.use(protect);

// All routes require org_admin or super_admin role
router.use(requireOrgAdmin);

// Get available config keys with defaults
router.get('/available', getAvailableConfigKeys);

// Get all configs for organization
router.get('/', getOrganizationConfigs);

// Get specific config by key
router.get('/:key', getConfigByKey);

// Create or update single config
router.post('/', upsertConfig);

// Bulk update configs
router.post('/bulk', bulkUpsertConfigs);

// Reset all configs to defaults
router.post('/reset', resetToDefaults);

// Delete config (revert to default)
router.delete('/:key', deleteConfig);

module.exports = router;
