const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const { logger } = require('../config/database');

exports.createTest = async (req, res) => {
    try {
        const test = new Test({
            ...req.body,
            organizationId: req.user.organizationId,
            createdBy: req.user._id
        });

        await test.save();

        logger.info(`Test created: ${test.title}`);

        res.status(201).json({
            success: true,
            data: { test }
        });
    } catch (error) {
        logger.error(`Create test error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error creating test',
            error: error.message
        });
    }
};

exports.getAllTests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { organizationId: req.user.organizationId };
        if (req.query.status) filter.status = req.query.status;

        const tests = await Test.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('questions.questionId', 'questionText questionType')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Test.countDocuments(filter);

        res.json({
            success: true,
            data: {
                tests,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error(`Get tests error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching tests',
            error: error.message
        });
    }
};

exports.getTestById = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email')
            .populate('questions.questionId');

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        res.json({
            success: true,
            data: { test }
        });
    } catch (error) {
        logger.error(`Get test error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching test',
            error: error.message
        });
    }
};

exports.updateTest = async (req, res) => {
    try {
        const test = await Test.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        logger.info(`Test updated: ${test.title}`);

        res.json({
            success: true,
            data: { test }
        });
    } catch (error) {
        logger.error(`Update test error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error updating test',
            error: error.message
        });
    }
};

exports.deleteTest = async (req, res) => {
    try {
        const test = await Test.findByIdAndUpdate(
            req.params.id,
            { status: 'archived' },
            { new: true }
        );

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        logger.info(`Test archived: ${test.title}`);

        res.json({
            success: true,
            message: 'Test archived successfully'
        });
    } catch (error) {
        logger.error(`Delete test error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error deleting test',
            error: error.message
        });
    }
};

exports.submitTest = async (req, res) => {
    try {
        const { testId, answers } = req.body;

        const test = await Test.findById(testId).populate('questions.questionId');
        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        // Create test attempt
        const attempt = new TestAttempt({
            testId,
            userId: req.user._id,
            answers,
            submittedAt: new Date(),
            status: 'submitted'
        });

        // Auto-evaluate objective questions
        let totalScore = 0;
        attempt.answers = attempt.answers.map(answer => {
            const question = test.questions.find(q => q.questionId._id.toString() === answer.questionId.toString());
            if (question && question.questionId.questionType.includes('mcq')) {
                const correctOptions = question.questionId.options.filter(opt => opt.isCorrect).map(opt => opt._id.toString());
                const selectedOptions = answer.selectedOptions.map(opt => opt.toString());

                const isCorrect = correctOptions.length === selectedOptions.length &&
                    correctOptions.every(opt => selectedOptions.includes(opt));

                answer.isCorrect = isCorrect;
                answer.marksAwarded = isCorrect ? question.marks : -question.negativeMarks;
                totalScore += answer.marksAwarded;
            }
            return answer;
        });

        attempt.score = totalScore;
        attempt.percentage = (totalScore / test.totalMarks) * 100;
        attempt.passed = totalScore >= test.passingMarks;
        attempt.status = 'evaluated';

        await attempt.save();

        logger.info(`Test submitted by: ${req.user.email}`);

        res.json({
            success: true,
            data: { attempt }
        });
    } catch (error) {
        logger.error(`Submit test error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error submitting test',
            error: error.message
        });
    }
};

exports.getTestResults = async (req, res) => {
    try {
        const attempts = await TestAttempt.find({
            testId: req.params.id,
            userId: req.user._id
        })
            .populate('testId', 'title totalMarks passingMarks')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { attempts }
        });
    } catch (error) {
        logger.error(`Get test results error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching test results',
            error: error.message
        });
    }
};
