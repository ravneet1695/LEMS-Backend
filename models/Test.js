const mongoose = require('mongoose');

const testSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Test title is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ['question_bank', 'pdf_upload'],
            default: 'question_bank',
        },
        // For question bank tests
        questions: [
            {
                question: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Question',
                },
                marks: {
                    type: Number,
                    required: true,
                },
                order: {
                    type: Number,
                    required: true,
                },
            },
        ],
        // For PDF tests
        pdfUrl: String,
        answerKeyUrl: String,
        pdfQuestions: [
            {
                questionNumber: Number,
                correctAnswer: mongoose.Schema.Types.Mixed,
                marks: Number,
            },
        ],
        // Test settings
        duration: {
            type: Number, // in minutes
            required: true,
        },
        totalMarks: {
            type: Number,
            required: true,
        },
        passingMarks: {
            type: Number,
            required: true,
        },
        settings: {
            shuffleQuestions: {
                type: Boolean,
                default: false,
            },
            shuffleOptions: {
                type: Boolean,
                default: false,
            },
            showResultsImmediately: {
                type: Boolean,
                default: false,
            },
            allowReview: {
                type: Boolean,
                default: true,
            },
            showCorrectAnswers: {
                type: Boolean,
                default: true,
            },
        },
        version: {
            type: Number,
            default: 1,
        },
        previousVersion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        approvalStatus: {
            type: String,
            enum: ['draft', 'pending', 'approved', 'rejected'],
            default: 'draft',
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvalDate: {
            type: Date,
        },
        rejectionReason: {
            type: String,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
testSchema.index({ organization: 1, approvalStatus: 1 });
testSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Test', testSchema);
