const express = require('express');
const router = express.Router();
const {
    createQuestion,
    getQuestions,
    getQuestion,
    updateQuestion,
    deleteQuestion,
    approveQuestion,
    bulkUpload,
    bulkUploadFile,
    bulkSaveQuestions,
} = require('../controllers/questionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const multer = require('multer');

// Configure multer for file upload (memory storage for parsing)
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(protect);

// Bulk upload
router.post('/bulk', authorize('super_admin', 'org_admin', 'content_creator'), bulkUpload);
router.post('/bulk-file', authorize('super_admin', 'org_admin', 'content_creator'), upload.single('file'), bulkUploadFile);
router.post('/bulk-save', authorize('super_admin', 'org_admin', 'content_creator'), bulkSaveQuestions);

// CRUD routes
router.route('/').get(getQuestions).post(authorize('super_admin', 'org_admin', 'content_creator'), createQuestion);

router
    .route('/:id')
    .get(getQuestion)
    .put(authorize('super_admin', 'org_admin', 'content_creator'), updateQuestion)
    .delete(authorize('super_admin', 'org_admin', 'content_creator'), deleteQuestion);

// Approval route
router.put('/:id/approve', authorize('super_admin', 'org_admin', 'content_approver'), approveQuestion);

module.exports = router;
