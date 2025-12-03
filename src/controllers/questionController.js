const Question = require('../models/Question');
const { logger } = require('../config/database');

exports.createQuestion = async (req, res) => {
    try {
        const question = new Question({
            ...req.body,
            organizationId: req.user.organizationId,
            createdBy: req.user._id
        });

        await question.save();

        logger.info(`Question created by: ${req.user.email}`);

        res.status(201).json({
            success: true,
            data: { question }
        });
    } catch (error) {
        logger.error(`Create question error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error creating question',
            error: error.message
        });
    }
};

exports.getAllQuestions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { organizationId: req.user.organizationId };

        // Add filters
        if (req.query.questionType) filter.questionType = req.query.questionType;
        if (req.query.gradeId) filter['tags.gradeId'] = req.query.gradeId;
        if (req.query.subjectId) filter['tags.subjectId'] = req.query.subjectId;
        if (req.query.topicId) filter['tags.topicId'] = req.query.topicId;

        const questions = await Question.find(filter)
            .populate('createdBy', 'firstName lastName')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Question.countDocuments(filter);

        res.json({
            success: true,
            data: {
                questions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error(`Get questions error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching questions',
            error: error.message
        });
    }
};

exports.getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email');

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        res.json({
            success: true,
            data: { question }
        });
    } catch (error) {
        logger.error(`Get question error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching question',
            error: error.message
        });
    }
};

exports.updateQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        logger.info(`Question updated: ${question._id}`);

        res.json({
            success: true,
            data: { question }
        });
    } catch (error) {
        logger.error(`Update question error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error updating question',
            error: error.message
        });
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        logger.info(`Question deleted: ${question._id}`);

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (error) {
        logger.error(`Delete question error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error deleting question',
            error: error.message
        });
    }
};

exports.searchQuestions = async (req, res) => {
    try {
        const { searchText } = req.query;

        const questions = await Question.find({
            organizationId: req.user.organizationId,
            $text: { $search: searchText }
        })
            .limit(50)
            .sort({ score: { $meta: 'textScore' } });

        res.json({
            success: true,
            data: { questions }
        });
    } catch (error) {
        logger.error(`Search questions error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error searching questions',
            error: error.message
        });
    }
};
