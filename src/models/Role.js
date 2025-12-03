const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['super_admin', 'org_admin', 'content_creator', 'content_approver', 'manager', 'learner']
    },
    description: String,
    permissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);
