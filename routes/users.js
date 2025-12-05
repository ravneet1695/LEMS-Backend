const express = require('express');
const router = express.Router();
const { createUser, getUsers, getUser, updateUser, deleteUser, toggleUserStatus } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require authentication
router.use(protect);

// CRUD routes
router.route('/')
    .get(authorize('super_admin', 'org_admin'), getUsers)
    .post(authorize('super_admin', 'org_admin'), createUser);

router
    .route('/:id')
    .get(getUser)
    .put(updateUser)
    .delete(authorize('super_admin', 'org_admin'), deleteUser);

router
    .route('/:id/status')
    .patch(authorize('super_admin', 'org_admin'), toggleUserStatus);

module.exports = router;
