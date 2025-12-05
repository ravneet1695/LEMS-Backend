const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Organization name is required'],
            trim: true,
            unique: true,
        },
        description: {
            type: String,
            trim: true,
        },
        logo: {
            type: String,
            required: [true, 'Organization logo is required'],
        },
        websiteUrl: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            required: [true, 'Organization type is required'],
            enum: ['Corporate', 'Educational', 'Non-Profit', 'Other'],
        },
        alias: {
            type: String,
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Organization code is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        settings: {
            allowSelfRegistration: {
                type: Boolean,
                default: false,
            },
            defaultUserRole: {
                type: String,
                enum: ['learner', 'content_creator', 'manager'],
                default: 'learner',
            },
            enableCertificates: {
                type: Boolean,
                default: true,
            },
            enableNotifications: {
                type: Boolean,
                default: true,
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Organization', organizationSchema);
