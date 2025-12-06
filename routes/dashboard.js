const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Routes
router.route('/stats').get(getDashboardStats); // All authenticated users can access

module.exports = router;
