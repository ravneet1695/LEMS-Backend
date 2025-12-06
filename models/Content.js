const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Content title is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ['document', 'video', 'audio', 'presentation', 'image', 'text'],
            required: true,
        },
        fileUrl: {
            type: String,
            required: function () {
                return this.type !== 'text';
            },
        },
        textContent: {
            type: String,
            required: function () {
                return this.type === 'text';
            },
        },
        hierarchy: {
            grade: {
                type: String,
                required: true,
            },
            subject: {
                type: String,
                required: true,
            },
            topic: {
                type: String,
                required: true,
            },
            subtopic: {
                type: String,
            },
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
        tags: [
            {
                type: String,
                trim: true,
            },
        ],
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
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
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
    },
    {
        timestamps: true,
    }
);

// Index for faster searches
contentSchema.index({ 'hierarchy.grade': 1, 'hierarchy.subject': 1, 'hierarchy.topic': 1 });
contentSchema.index({ organization: 1, approvalStatus: 1 });
contentSchema.index({ tags: 1 });

module.exports = mongoose.model('Content', contentSchema);
