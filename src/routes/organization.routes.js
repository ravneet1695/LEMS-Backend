const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Create organization (admin only)
router.post('/', authorize('super_admin'), organizationController.createOrganization);

// Get all organizations
router.get('/', authorize('super_admin', 'org_admin'), organizationController.getAllOrganizations);

// Get organization by ID
router.get('/:id', organizationController.getOrganizationById);

// Update organization
router.put('/:id', authorize('super_admin', 'org_admin'), organizationController.updateOrganization);

// Delete organization (deactivate)
router.delete('/:id', authorize('super_admin'), organizationController.deleteOrganization);

module.exports = router;
