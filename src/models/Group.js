const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Group name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    parentGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    managers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    settings: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
groupSchema.index({ organizationId: 1, name: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ managers: 1 });

module.exports = mongoose.model('Group', groupSchema);
