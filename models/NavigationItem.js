const mongoose = require('mongoose');

const navigationItemSchema = new mongoose.Schema({
    // Unique identifier for the navigation item
    itemId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    // Display label
    label: {
        type: String,
        required: true,
        trim: true
    },

    // Bootstrap icon class
    icon: {
        type: String,
        required: true,
        trim: true
    },

    // Route path
    route: {
        type: String,
        required: true,
        trim: true
    },

    // Module identifier (for access control)
    module: {
        type: String,
        required: true,
        trim: true
    },

    // Display order
    order: {
        type: Number,
        required: true,
        default: 999
    },

    // Parent item (for nested navigation)
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NavigationItem',
        default: null
    },

    // Whether this item is active/visible
    isActive: {
        type: Boolean,
        default: true
    },

    // Whether this is a system item (cannot be deleted)
    isSystem: {
        type: Boolean,
        default: true
    },

    // Organization-specific navigation (null = global)
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },

    // Additional metadata
    description: {
        type: String,
        trim: true
    },

    // Custom properties (for extensibility)
    customProperties: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Index for efficient queries
navigationItemSchema.index({ organization: 1, isActive: 1, order: 1 });
navigationItemSchema.index({ module: 1 });
navigationItemSchema.index({ parent: 1 });

// Virtual for children
navigationItemSchema.virtual('children', {
    ref: 'NavigationItem',
    localField: '_id',
    foreignField: 'parent'
});

// Ensure virtuals are included in JSON
navigationItemSchema.set('toJSON', { virtuals: true });
navigationItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('NavigationItem', navigationItemSchema);
