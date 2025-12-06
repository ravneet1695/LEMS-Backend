const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                'create',
                'update',
                'delete',
                'login',
                'logout',
                'status_change',
                'settings_update',
                'role_change',
                'permission_change',
            ],
        },
        resource: {
            type: String,
            required: true,
            enum: ['user', 'organization', 'test', 'question', 'group', 'settings', 'role'],
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        changes: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        location: {
            type: String,
        },
        description: {
            type: String,
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
