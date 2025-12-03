const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Approve content
router.post('/:id/approve', authorize('content_approver', 'org_admin', 'super_admin'), contentController.approveContent);

// Reject content
router.post('/:id/reject', authorize('content_approver', 'org_admin', 'super_admin'), contentController.rejectContent);

// Create content
router.post('/', authorize('content_creator', 'org_admin', 'super_admin'), contentController.createContent);

// Get all content
router.get('/', contentController.getAllContent);

// Get content by ID
router.get('/:id', contentController.getContentById);

// Update content
router.put('/:id', authorize('content_creator', 'org_admin', 'super_admin'), contentController.updateContent);

// Delete content
router.delete('/:id', authorize('content_creator', 'org_admin', 'super_admin'), contentController.deleteContent);

module.exports = router;
