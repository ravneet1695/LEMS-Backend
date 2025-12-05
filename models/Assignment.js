const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test',
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        groups: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Group',
            },
        ],
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number, // in minutes, can override test duration
            required: true,
        },
        passingMarks: {
            type: Number, // can override test passing marks
            required: true,
        },
        resultVisibility: {
            type: String,
            enum: ['immediate', 'after_end_date', 'manual'],
            default: 'after_end_date',
        },
        allowMultipleAttempts: {
            type: Boolean,
            default: false,
        },
        maxAttempts: {
            type: Number,
            default: 1,
        },
        notificationSent: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
assignmentSchema.index({ organization: 1, isActive: 1 });
assignmentSchema.index({ groups: 1, startDate: 1, endDate: 1 });
assignmentSchema.index({ test: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
