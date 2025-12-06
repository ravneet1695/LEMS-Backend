const mongoose = require('mongoose');

const roleConfigSchema = new mongoose.Schema({
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
        required: true
    }],
    permissions: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isSystemRole: {
        type: Boolean,
        default: false
    },
    isDeletable: {
        type: Boolean,
        default: true // Custom roles are deletable by default
    },
    isDefault: {
        type: Boolean,
        default: false // Only one role should be marked as default (typically 'learner')
    },
    canManageOrganizations: {
        type: Boolean,
        default: false
    },
    canManageSettings: {
        type: Boolean,
        default: false
    },
    canManageRoles: {
        type: Boolean,
        default: false
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

// Compound index for organization-specific roles
roleConfigSchema.index({ roleName: 1, organization: 1 }, { unique: true });
roleConfigSchema.index({ isActive: 1 });
roleConfigSchema.index({ organization: 1 });

module.exports = mongoose.model('RoleConfig', roleConfigSchema);
