const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Submit test (learners)
router.post('/submit', testController.submitTest);

// Get test results
router.get('/:id/results', testController.getTestResults);

// Create test
router.post('/', authorize('content_creator', 'org_admin', 'super_admin'), testController.createTest);

// Get all tests
router.get('/', testController.getAllTests);

// Get test by ID
router.get('/:id', testController.getTestById);

// Update test
router.put('/:id', authorize('content_creator', 'org_admin', 'super_admin'), testController.updateTest);

// Delete test (archive)
router.delete('/:id', authorize('content_creator', 'org_admin', 'super_admin'), testController.deleteTest);

module.exports = router;
