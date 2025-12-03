const mongoose = require('mongoose');

const learningMaterialSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    contentType: {
        type: String,
        required: true,
        enum: ['video', 'pdf', 'ppt', 'doc', 'image', 'audio', 'text']
    },
    fileUrl: String,
    fileSize: Number,
    duration: Number, // in seconds for video/audio
    thumbnailUrl: String,
    tags: {
        gradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade' },
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
        subtopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subtopic' },
        difficultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Difficulty' }
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,
    chapters: [{
        title: String,
        description: String,
        content: String,
        displayOrder: Number,
        duration: Number
    }],
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes
learningMaterialSchema.index({ organizationId: 1, approvalStatus: 1 });
learningMaterialSchema.index({ 'tags.gradeId': 1, 'tags.subjectId': 1 });
learningMaterialSchema.index({ createdBy: 1 });

module.exports = mongoose.model('LearningMaterial', learningMaterialSchema);
