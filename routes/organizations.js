const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    createOrganization,
    getOrganizations,
    getOrganization,
    updateOrganization,
    deleteOrganization,
} = require('../controllers/organizationController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Configure multer for logo upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/logos/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'org-logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
        }
    }
});

// Protect all routes
router.use(protect);

router
    .route('/')
    .post(authorize('super_admin'), upload.single('logo'), createOrganization)
    .get(authorize('super_admin'), getOrganizations);

router
    .route('/:id')
    .get(authorize('super_admin', 'org_admin'), getOrganization)
    .put(authorize('super_admin', 'org_admin'), upload.single('logo'), updateOrganization)
    .delete(authorize('super_admin'), deleteOrganization);

module.exports = router;
