const Question = require('../models/Question');
const questionPolicy = require('../policies/questionPolicy');
const { logAction } = require('./auditLogController');
const Settings = require('../models/Settings');

// Helper function to get default page size from settings
async function getDefaultPageSize() {
    try {
        const setting = await Settings.findOne({ key: 'tablePageSize' });
        const pageSize = setting?.value || 10;
        return (pageSize >= 5 && pageSize <= 100) ? pageSize : 10;
    } catch (error) {
        console.error('Error getting page size setting:', error);
        return 10;
    }
}

// @desc    Create new question
// @route   POST /api/questions
// @access  Private (Content Creator, Org Admin, Super Admin)
exports.createQuestion = async (req, res) => {
    try {
        if (!questionPolicy.canCreateQuestion(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create questions',
            });
        }

        const questionData = {
            ...req.body,
            createdBy: req.user._id,
            organization: req.user.organization,
        };

        const question = await Question.create(questionData);

        // Log question creation action
        await logAction(
            req.user._id,
            'create',
            'question',
            question._id,
            { type: question.type, difficulty: question.difficulty },
            `Created question: ${question.questionText.substring(0, 50)}...`,
            req
        );

        res.status(201).json({
            success: true,
            data: question,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get all questions
// @route   GET /api/questions
// @access  Private
exports.getQuestions = async (req, res) => {
    try {
        const { type, difficulty, subject, topic, approvalStatus } = req.query;

        // Get default page size from settings
        const defaultPageSize = await getDefaultPageSize();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || defaultPageSize;

        const query = {};

        // Filter out deleted questions
        query.isDeleted = false;

        // Filter by organization (except super admin)
        if (req.user.role !== 'super_admin') {
            query.organization = req.user.organization;
        }

        // Apply filters
        if (type) query.type = type;
        if (difficulty) query.difficulty = difficulty;
        if (subject) query['hierarchy.subject'] = subject;
        if (topic) query['hierarchy.topic'] = topic;
        if (approvalStatus) query.approvalStatus = approvalStatus;

        const questions = await Question.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Question.countDocuments(query);

        res.status(200).json({
            success: true,
            data: questions,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
exports.getQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName');

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }

        // Check if question is deleted
        if (question.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }

        if (!questionPolicy.canViewQuestion(req.user, question)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this question',
            });
        }

        res.status(200).json({
            success: true,
            data: question,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private
exports.updateQuestion = async (req, res) => {
    try {
        let question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }

        if (!questionPolicy.canEditQuestion(req.user, question)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this question',
            });
        }

        question = await Question.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        // Log question update action
        await logAction(
            req.user._id,
            'update',
            'question',
            question._id,
            { updates: Object.keys(req.body) },
            `Updated question: ${question.questionText.substring(0, 50)}...`,
            req
        );

        res.status(200).json({
            success: true,
            data: question,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Delete question (Soft Delete)
// @route   DELETE /api/questions/:id
// @access  Private (Super Admin, Org Admin, Content Creator)
exports.deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }

        // Check if already deleted
        if (question.isDeleted) {
            return res.status(400).json({
                success: false,
                message: 'Question is already deleted',
            });
        }

        // Soft delete: mark as deleted
        question.isDeleted = true;
        question.deletedAt = Date.now();
        question.deletedBy = req.user._id;
        await question.save();

        // Log question deletion
        await logAction(
            req.user._id,
            'delete',
            'question',
            question._id,
            { questionText: question.questionText },
            `Deleted question: ${question.questionText.substring(0, 50)}...`,
            req
        );

        res.status(200).json({
            success: true,
            message: 'Question deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Approve/Reject question
// @route   PUT /api/questions/:id/approve
// @access  Private (Content Approver, Org Admin, Super Admin)
exports.approveQuestion = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;

        if (!questionPolicy.canApproveQuestion(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to approve questions',
            });
        }

        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }

        question.approvalStatus = status;
        question.approvedBy = req.user._id;
        question.approvalDate = Date.now();

        if (status === 'rejected' && rejectionReason) {
            question.rejectionReason = rejectionReason;
        }

        await question.save();

        res.status(200).json({
            success: true,
            data: question,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Bulk upload questions
// @route   POST /api/questions/bulk
// @access  Private (Content Creator, Org Admin, Super Admin)
exports.bulkUpload = async (req, res) => {
    try {
        if (!questionPolicy.canCreateQuestion(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create questions',
            });
        }

        const { questions } = req.body;

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of questions',
            });
        }

        // Add metadata to each question
        const questionsWithMetadata = questions.map((q) => ({
            ...q,
            createdBy: req.user._id,
            organization: req.user.organization,
        }));

        const createdQuestions = await Question.insertMany(questionsWithMetadata);

        res.status(201).json({
            success: true,
            data: createdQuestions,
            count: createdQuestions.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Bulk upload questions from file (Word/Excel/PDF)
// @route   POST /api/questions/bulk-file
// @access  Private (Content Creator, Org Admin, Super Admin)
exports.bulkUploadFile = async (req, res) => {
    try {
        if (!questionPolicy.canCreateQuestion(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create questions',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file',
            });
        }

        const { parseWordDocument, parseExcelFile, parsePDFFile } = require('../utils/bulkUploadParser');
        const fileBuffer = req.file.buffer;
        const fileType = req.file.mimetype;

        // Extract metadata from request body
        const metadata = {
            questionType: req.body.questionType || 'mcq_single',
            difficulty: req.body.difficulty || 'medium',
            marks: parseInt(req.body.marks) || 1,
            tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
            grade: req.body.grade || 'General',
            subject: req.body.subject || 'General',
            topic: req.body.topic || 'General',
            subtopic: req.body.subtopic,
            questionPageStart: parseInt(req.body.questionPageStart) || 1,
            questionPageEnd: req.body.questionPageEnd ? parseInt(req.body.questionPageEnd) : null,
            answerPageStart: req.body.answerPageStart ? parseInt(req.body.answerPageStart) : null,
            answerPageEnd: req.body.answerPageEnd ? parseInt(req.body.answerPageEnd) : null,
        };

        let questions = [];

        // Parse based on file type
        if (fileType.includes('word') || fileType.includes('document')) {
            questions = await parseWordDocument(fileBuffer, metadata);
        } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
            questions = parseExcelFile(fileBuffer, metadata);
        } else if (fileType.includes('pdf')) {
            questions = await parsePDFFile(fileBuffer, metadata);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Unsupported file type. Please upload Word, Excel, or PDF file.',
            });
        }

        if (questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No questions found in the file',
            });
        }

        // Add user metadata to each question
        const questionsWithMetadata = questions.map((q) => ({
            ...q,
            createdBy: req.user._id,
            organization: req.user.organization,
            // Apply hierarchy from metadata if not already set
            hierarchy: {
                grade: q.hierarchy?.grade || metadata.grade,
                subject: q.hierarchy?.subject || metadata.subject,
                topic: q.hierarchy?.topic || metadata.topic,
                subtopic: q.hierarchy?.subtopic || metadata.subtopic
            },
            difficulty: q.difficulty || metadata.difficulty,
            type: q.type || metadata.questionType,
            marks: q.marks || metadata.marks,
            tags: q.tags || metadata.tags
        }));

        const createdQuestions = await Question.insertMany(questionsWithMetadata);

        res.status(201).json({
            success: true,
            data: createdQuestions,
            count: createdQuestions.length,
            message: `Successfully imported ${createdQuestions.length} questions`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Save reviewed questions after preview approval
// @route   POST /api/questions/bulk-save
// @access  Private (Content Creator, Org Admin, Super Admin)
exports.bulkSaveQuestions = async (req, res) => {
    try {
        if (!questionPolicy.canCreateQuestion(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create questions',
            });
        }

        const { questions } = req.body;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No questions provided',
            });
        }

        // Clean and prepare questions for insertion
        const questionsWithMetadata = questions.map((q) => {
            // Remove any existing _id to avoid duplicate key errors
            const { _id, __v, editing, ...cleanQuestion } = q;

            return {
                ...cleanQuestion,
                createdBy: req.user._id,
                organization: req.user.organization,
            };
        });

        const createdQuestions = await Question.insertMany(questionsWithMetadata);

        res.status(201).json({
            success: true,
            data: createdQuestions,
            count: createdQuestions.length,
            message: `Successfully saved ${createdQuestions.length} questions to question bank`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
