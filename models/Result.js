const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
    {
        attempt: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Attempt',
            required: true,
        },
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
        totalMarks: {
            type: Number,
            required: true,
        },
        marksObtained: {
            type: Number,
            required: true,
        },
        percentage: {
            type: Number,
            required: true,
        },
        passed: {
            type: Boolean,
            required: true,
        },
        grade: {
            type: String,
            enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
        },
        timeTaken: {
            type: Number, // in seconds
            required: true,
        },
        correctAnswers: {
            type: Number,
            default: 0,
        },
        incorrectAnswers: {
            type: Number,
            default: 0,
        },
        skippedQuestions: {
            type: Number,
            default: 0,
        },
        // Analytics
        analytics: {
            strengthAreas: [
                {
                    topic: String,
                    percentage: Number,
                },
            ],
            weaknessAreas: [
                {
                    topic: String,
                    percentage: Number,
                },
            ],
            difficultyBreakdown: {
                easy: {
                    attempted: Number,
                    correct: Number,
                },
                medium: {
                    attempted: Number,
                    correct: Number,
                },
                hard: {
                    attempted: Number,
                    correct: Number,
                },
            },
        },
        certificate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Certificate',
        },
        isVisible: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
resultSchema.index({ user: 1, test: 1 });
resultSchema.index({ assignment: 1 });
resultSchema.index({ passed: 1, percentage: -1 });

module.exports = mongoose.model('Result', resultSchema);
