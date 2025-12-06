const mongoose = require('mongoose');
require('dotenv').config();

const AccessConfig = require('../models/AccessConfig');

async function updateRoles() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Update super_admin role
        const superAdminResult = await AccessConfig.updateOne(
            { roleName: 'super_admin', organization: null },
            { $addToSet: { moduleAccess: 'departments' } }
        );
        console.log('✅ Updated super_admin role:', superAdminResult.modifiedCount > 0 ? 'Added departments module' : 'Already has departments module');

        // Update org_admin role
        const orgAdminResult = await AccessConfig.updateOne(
            { roleName: 'org_admin', organization: null },
            { $addToSet: { moduleAccess: 'departments' } }
        );
        console.log('✅ Updated org_admin role:', orgAdminResult.modifiedCount > 0 ? 'Added departments module' : 'Already has departments module');

        console.log('\n✅ Role update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating roles:', error);
        process.exit(1);
    }
}

updateRoles();
