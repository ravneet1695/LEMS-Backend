const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
    {
        result: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Result',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test',
            required: true,
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        certificateNumber: {
            type: String,
            unique: true,
            required: true,
        },
        issuedDate: {
            type: Date,
            default: Date.now,
        },
        pdfUrl: {
            type: String,
        },
        metadata: {
            testTitle: String,
            userName: String,
            score: Number,
            percentage: Number,
            grade: String,
            organizationName: String,
            organizationLogo: String,
        },
    },
    {
        timestamps: true,
    }
);

// Generate unique certificate number before saving
certificateSchema.pre('save', async function (next) {
    if (!this.certificateNumber) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.certificateNumber = `CERT-${timestamp}-${random}`;
    }
    next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
