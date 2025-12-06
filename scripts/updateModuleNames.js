const mongoose = require('mongoose');
require('dotenv').config();

const AccessConfig = require('../models/AccessConfig');

async function updateModuleNames() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Update all role configs: replace 'role-config' with 'access-config'
        const result = await AccessConfig.updateMany(
            { moduleAccess: 'role-config' },
            { $set: { 'moduleAccess.$[elem]': 'access-config' } },
            { arrayFilters: [{ elem: 'role-config' }] }
        );

        console.log(`✅ Updated ${result.modifiedCount} role configurations`);
        console.log('   Changed module name from "role-config" to "access-config"');

        console.log('\n✅ Module name update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating module names:', error);
        process.exit(1);
    }
}

updateModuleNames();
