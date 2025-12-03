const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Get all users (admin only)
router.get('/', authorize('super_admin', 'org_admin'), userController.getAllUsers);

// Get user by ID
router.get('/:id', authorize('super_admin', 'org_admin'), userController.getUserById);

// Update user
router.put('/:id', authorize('super_admin', 'org_admin'), userController.updateUser);

// Delete user (super admin only)
router.delete('/:id', authorize('super_admin'), userController.deleteUser);

// Assign role to user
router.post('/:id/roles', authorize('super_admin', 'org_admin'), userController.assignRole);

// Remove role from user
router.delete('/:id/roles/:roleId', authorize('super_admin', 'org_admin'), userController.removeRole);

module.exports = router;
