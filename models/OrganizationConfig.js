const mongoose = require('mongoose');

const organizationConfigSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    configKey: {
        type: String,
        required: true,
        trim: true
    },
    configValue: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['general', 'testing', 'notifications', 'branding'],
        default: 'general'
    },
    dataType: {
        type: String,
        required: true,
        enum: ['string', 'number', 'boolean', 'json'],
        default: 'string'
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound unique index: organization + configKey
organizationConfigSchema.index({ organization: 1, configKey: 1 }, { unique: true });

// Index for category filtering
organizationConfigSchema.index({ category: 1 });

module.exports = mongoose.model('OrganizationConfig', organizationConfigSchema);
