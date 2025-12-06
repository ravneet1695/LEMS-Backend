const express = require('express');
const router = express.Router();
const { createUser, getUsers, getUser, updateUser, deleteUser, toggleUserStatus, bulkCreateUsers } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Bulk upload route (with CSV file)
router.post('/bulk', authorize('super_admin', 'org_admin'), upload.single('file'), bulkCreateUsers);

// CRUD routes
router.route('/')
    .get(authorize('super_admin', 'org_admin'), getUsers)
    .post(authorize('super_admin', 'org_admin'), upload.single('profileImage'), createUser);

router
    .route('/:id')
    .get(getUser)
    .put(upload.single('profileImage'), updateUser)
    .delete(authorize('super_admin', 'org_admin'), deleteUser);

router
    .route('/:id/status')
    .patch(authorize('super_admin', 'org_admin'), toggleUserStatus);

module.exports = router;
