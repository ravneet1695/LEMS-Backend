const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Test title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    testType: {
        type: String,
        enum: ['assessment', 'quiz', 'exam', 'practice'],
        default: 'assessment'
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    totalMarks: {
        type: Number,
        required: true
    },
    passingMarks: {
        type: Number,
        required: true
    },
    instructions: String,
    questions: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        marks: Number,
        negativeMarks: Number,
        displayOrder: Number
    }],
    settings: {
        shuffleQuestions: { type: Boolean, default: false },
        shuffleOptions: { type: Boolean, default: false },
        showResults: {
            type: String,
            enum: ['immediate', 'after_end', 'manual'],
            default: 'after_end'
        },
        allowReview: { type: Boolean, default: true }
    },
    isPdfBased: {
        type: Boolean,
        default: false
    },
    pdfUrl: String,
    answerKey: [{
        questionNumber: Number,
        correctAnswer: String,
        marks: Number
    }],
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'archived'],
        default: 'draft'
    },
    version: {
        type: Number,
        default: 1
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date
}, {
    timestamps: true
});

// Indexes
testSchema.index({ organizationId: 1, status: 1 });
testSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Test', testSchema);
