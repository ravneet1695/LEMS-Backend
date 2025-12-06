const mongoose = require('mongoose');

const accessConfigSchema = new mongoose.Schema({
    roleName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    displayName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null // null means it's a global/system role
    },
    moduleAccess: [{
        type: String,
        trim: true
    }],
    isSystemRole: {
        type: Boolean,
        default: false
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
    timestamps: true,
    collection: 'accessconfigs' // Changed from 'roleconfigs'
});

// Compound index to ensure unique role names per organization
accessConfigSchema.index({ roleName: 1, organization: 1 }, { unique: true });

// Index for faster queries
accessConfigSchema.index({ organization: 1 });
accessConfigSchema.index({ isSystemRole: 1 });
accessConfigSchema.index({ isActive: 1 });

module.exports = mongoose.model('AccessConfig', accessConfigSchema);
