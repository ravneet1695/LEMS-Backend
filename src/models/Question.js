const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    questionType: {
        type: String,
        required: true,
        enum: ['true_false', 'mcq_single', 'mcq_multiple', 'match_column', 'short_answer', 'long_answer', 'fill_blank', 'drag_drop', 'hotspot', 'coding']
    },
    questionText: {
        type: String,
        required: [true, 'Question text is required']
    },
    questionHtml: String,
    imageUrl: String,
    marks: {
        type: Number,
        default: 1,
        min: 0
    },
    negativeMarks: {
        type: Number,
        default: 0,
        min: 0
    },
    explanation: String,
    options: [{
        optionText: String,
        optionHtml: String,
        imageUrl: String,
        isCorrect: Boolean,
        displayOrder: Number
    }],
    tags: {
        gradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade' },
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
        subtopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subtopic' },
        difficultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Difficulty' }
    },
    aiGenerated: {
        type: Boolean,
        default: false
    },
    qualityScore: {
        type: Number,
        min: 0,
        max: 100
    },
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
questionSchema.index({ organizationId: 1, questionType: 1 });
questionSchema.index({ 'tags.gradeId': 1, 'tags.subjectId': 1, 'tags.topicId': 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ questionText: 'text' }); // Text search

module.exports = mongoose.model('Question', questionSchema);
