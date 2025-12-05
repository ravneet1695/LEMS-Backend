const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
    {
        assignment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assignment',
            required: true,
        },
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        attemptNumber: {
            type: Number,
            default: 1,
        },
        status: {
            type: String,
            enum: ['in_progress', 'submitted', 'auto_submitted', 'evaluated'],
            default: 'in_progress',
        },
        startTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endTime: {
            type: Date,
        },
        timeSpent: {
            type: Number, // in seconds
            default: 0,
        },
        answers: [
            {
                question: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Question',
                },
                questionNumber: Number, // For PDF tests
                answer: mongoose.Schema.Types.Mixed,
                isCorrect: Boolean,
                marksObtained: Number,
                timeSpent: Number, // seconds spent on this question
                isSkipped: Boolean,
                isReviewed: Boolean,
            },
        ],
        // For tracking question navigation
        currentQuestion: {
            type: Number,
            default: 0,
        },
        visitedQuestions: [Number],
        // Randomization seeds (for consistent question/option order)
        questionSeed: String,
        optionSeed: String,
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
attemptSchema.index({ user: 1, assignment: 1 });
attemptSchema.index({ test: 1, status: 1 });
attemptSchema.index({ assignment: 1, status: 1 });

module.exports = mongoose.model('Attempt', attemptSchema);
