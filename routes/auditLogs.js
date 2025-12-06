const express = require('express');
const router = express.Router();
const {
    getAuditLogs,
    getAuditLog,
    createAuditLog,
    getAuditLogStats,
    exportAuditLogs,
    getAuditLogsByOrganization,
} = require('../controllers/auditLogController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require authentication
router.use(protect);

// Routes
// Super admin and org admin can view audit logs (filtered by organization for org admin)
router.route('/').get(authorize('super_admin', 'org_admin'), getAuditLogs).post(createAuditLog);
router.route('/export').get(authorize('super_admin', 'org_admin'), exportAuditLogs);
router.route('/by-organization').get(authorize('super_admin'), getAuditLogsByOrganization);
router.route('/stats').get(authorize('super_admin', 'org_admin'), getAuditLogStats);
router.route('/:id').get(authorize('super_admin', 'org_admin'), getAuditLog);

module.exports = router;
