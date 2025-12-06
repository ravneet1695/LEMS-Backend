const express = require('express');
const router = express.Router();
const {
    createTest,
    getTests,
    getTest,
    updateTest,
    deleteTest,
    approveTest,
    submitForApproval,
    duplicateTest,
    randomizeTest,
} = require('../controllers/testController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require authentication
router.use(protect);

// CRUD routes
router
    .route('/')
    .get(getTests)
    .post(authorize('super_admin', 'org_admin', 'content_creator', 'manager'), createTest);

router
    .route('/:id')
    .get(getTest)
    .put(authorize('super_admin', 'org_admin', 'content_creator', 'manager'), updateTest)
    .delete(authorize('super_admin', 'org_admin', 'content_creator'), deleteTest);

// Approval route
router.put('/:id/approve', authorize('super_admin', 'org_admin', 'content_approver'), approveTest);

// Submit for approval
router.patch('/:id/submit', authorize('super_admin', 'org_admin', 'content_creator', 'manager'), submitForApproval);

// Duplicate test (versioning)
router.post('/:id/duplicate', authorize('super_admin', 'org_admin', 'content_creator', 'manager'), duplicateTest);

// Randomize test
router.post('/:id/randomize', randomizeTest);

module.exports = router;
