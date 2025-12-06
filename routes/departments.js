const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Department CRUD routes
router
    .route('/')
    .get(departmentController.getDepartments)
    .post(departmentController.createDepartment);

router
    .route('/:id')
    .get(departmentController.getDepartment)
    .put(departmentController.updateDepartment)
    .delete(departmentController.deleteDepartment);

router.patch('/:id/status', departmentController.toggleDepartmentStatus);

module.exports = router;
