const express = require('express');
const router = express.Router();
const {
    getContent,
    getSingleContent,
    createContent,
    updateContent,
    deleteContent,
    updateApprovalStatus
} = require('../controllers/contentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Routes
router.route('/')
    .get(getContent)
    .post(authorize('super_admin', 'org_admin', 'content_creator'), upload.single('file'), createContent);

router.route('/:id')
    .get(getSingleContent)
    .put(authorize('super_admin', 'org_admin', 'content_creator'), upload.single('file'), updateContent)
    .delete(authorize('super_admin', 'org_admin', 'content_creator'), deleteContent);

router.route('/:id/approval')
    .patch(authorize('super_admin', 'content_approver'), updateApprovalStatus);

module.exports = router;
