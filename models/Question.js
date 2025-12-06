const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                'true_false',
                'mcq_single',
                'mcq_multiple',
                'match_column',
                'short_answer',
                'long_answer',
                'drag_drop',
                'fill_blank',
                'hotspot',
                'comprehension',
                'coding',
            ],
            required: true,
        },
        questionText: {
            type: String,
            required: [true, 'Question text is required'],
        },
        // For MCQ types
        options: [
            {
                text: String,
                isCorrect: Boolean,
                order: Number,
            },
        ],
        // For match-the-column
        leftColumn: [
            {
                id: String,
                text: String,
            },
        ],
        rightColumn: [
            {
                id: String,
                text: String,
            },
        ],
        correctMatches: [
            {
                left: String,
                right: String,
            },
        ],
        // For fill-in-the-blank
        blanks: [
            {
                position: Number,
                correctAnswers: [String], // Multiple acceptable answers
            },
        ],
        // For drag-drop
        draggableItems: [
            {
                id: String,
                text: String,
            },
        ],
        dropZones: [
            {
                id: String,
                label: String,
                correctItems: [String], // IDs of draggable items
            },
        ],
        // For hotspot
        imageUrl: String,
        hotspots: [
            {
                x: Number,
                y: Number,
                width: Number,
                height: Number,
                isCorrect: Boolean,
            },
        ],
        // For comprehension
        passage: String,
        subQuestions: [
            {
                questionText: String,
                type: String,
                options: [
                    {
                        text: String,
                        isCorrect: Boolean,
                    },
                ],
                correctAnswer: mongoose.Schema.Types.Mixed,
                marks: Number,
            },
        ],
        // For coding questions
        codingLanguage: String,
        starterCode: String,
        testCases: [
            {
                input: String,
                expectedOutput: String,
                isHidden: Boolean,
            },
        ],
        // Generic correct answer (for simple types)
        correctAnswer: mongoose.Schema.Types.Mixed,
        // Explanation and metadata
        explanation: {
            type: String,
        },
        marks: {
            type: Number,
            required: true,
            default: 1,
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
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
        tags: [
            {
                type: String,
                trim: true,
            },
        ],
        media: [
            {
                type: String, // URLs to images/videos
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
        // AI-generated metadata
        aiQualityScore: {
            type: Number,
            min: 0,
            max: 100,
        },
        aiTags: [String],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster searches
questionSchema.index({ 'hierarchy.grade': 1, 'hierarchy.subject': 1, 'hierarchy.topic': 1 });
questionSchema.index({ organization: 1, approvalStatus: 1 });
questionSchema.index({ type: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });

module.exports = mongoose.model('Question', questionSchema);
