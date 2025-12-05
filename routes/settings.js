const express = require('express');
const router = express.Router();
const {
    getSettings,
    getSetting,
    updateSetting,
    bulkUpdateSettings,
    deleteSetting,
    initializeSettings,
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// Routes
router.route('/').get(getSettings);
router.route('/bulk').post(bulkUpdateSettings);
router.route('/initialize').post(initializeSettings);
router.route('/:key').get(getSetting).put(updateSetting).delete(deleteSetting);

module.exports = router;
