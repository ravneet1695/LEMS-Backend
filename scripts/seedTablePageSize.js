const mongoose = require('mongoose');
const Settings = require('../models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lems');

async function seedTablePageSize() {
    try {
        console.log('🌱 Seeding table page size setting...');

        // Check if setting already exists
        const existing = await Settings.findOne({ key: 'tablePageSize' });
        
        if (existing) {
            console.log('✓ Table page size setting already exists');
            console.log(`  Current value: ${existing.value}`);
        } else {
            // Create the setting
            await Settings.create({
                key: 'tablePageSize',
                value: 10,
                type: 'number',
                category: 'ui',
                description: 'Default number of items to display per page in tables (5-100)',
                isPublic: true // Public so all users can read it
            });
            console.log('✅ Table page size setting created successfully!');
            console.log('  Default value: 10');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding table page size:', error);
        process.exit(1);
    }
}

seedTablePageSize();
