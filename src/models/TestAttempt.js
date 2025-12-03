const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema({
    testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    answers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        selectedOptions: [mongoose.Schema.Types.ObjectId],
        answerText: String,
        isCorrect: Boolean,
        marksAwarded: Number,
        evaluatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        evaluatedAt: Date
    }],
    startedAt: {
        type: Date,
        default: Date.now
    },
    submittedAt: Date,
    timeTaken: Number, // in seconds
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'evaluated'],
        default: 'in_progress'
    },
    score: Number,
    percentage: Number,
    passed: Boolean,
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
testAttemptSchema.index({ testId: 1, userId: 1 });
testAttemptSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
