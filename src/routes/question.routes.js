const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Search questions
router.get('/search', questionController.searchQuestions);

// Create question
router.post('/', authorize('content_creator', 'org_admin', 'super_admin'), questionController.createQuestion);

// Get all questions
router.get('/', questionController.getAllQuestions);

// Get question by ID
router.get('/:id', questionController.getQuestionById);

// Update question
router.put('/:id', authorize('content_creator', 'org_admin', 'super_admin'), questionController.updateQuestion);

// Delete question
router.delete('/:id', authorize('content_creator', 'org_admin', 'super_admin'), questionController.deleteQuestion);

module.exports = router;
