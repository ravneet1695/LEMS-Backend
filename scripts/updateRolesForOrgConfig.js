const mongoose = require('mongoose');
require('dotenv').config();

const AccessConfig = require('../models/AccessConfig');

async function updateRolesForOrgConfig() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Update super_admin role
        const superAdminResult = await AccessConfig.updateOne(
            { roleName: 'super_admin', organization: null },
            { $addToSet: { moduleAccess: 'org-config' } }
        );
        console.log('✅ Updated super_admin role:', superAdminResult.modifiedCount > 0 ? 'Added org-config module' : 'Already has org-config module');

        // Update org_admin role
        const orgAdminResult = await AccessConfig.updateOne(
            { roleName: 'org_admin', organization: null },
            { $addToSet: { moduleAccess: 'org-config' } }
        );
        console.log('✅ Updated org_admin role:', orgAdminResult.modifiedCount > 0 ? 'Added org-config module' : 'Already has org-config module');

        console.log('\n✅ Role update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating roles:', error);
        process.exit(1);
    }
}

updateRolesForOrgConfig();
