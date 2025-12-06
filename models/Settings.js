const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        type: {
            type: String,
            enum: ['string', 'number', 'boolean', 'object', 'array'],
            required: true,
        },
        category: {
            type: String,
            enum: ['platform', 'email', 'security', 'features', 'general'],
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
// Note: key field already has unique index from unique: true
settingsSchema.index({ category: 1 });

module.exports = mongoose.model('Settings', settingsSchema);
