const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function fixSuperAdminOrganization() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Update all super_admin users to have null organization
        const result = await User.updateMany(
            { role: 'super_admin' },
            { $set: { organization: null } }
        );

        console.log(`✅ Updated ${result.modifiedCount} super_admin user(s)`);
        console.log(`   Set organization to null for all super_admin users`);

        // Display updated super_admin users
        const superAdmins = await User.find({ role: 'super_admin' }).select('email firstName lastName role organization');
        console.log('\n📋 Super Admin Users:');
        superAdmins.forEach(admin => {
            console.log(`   - ${admin.email} (${admin.firstName} ${admin.lastName})`);
            console.log(`     Organization: ${admin.organization || 'null ✓'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing super_admin organization:', error);
        process.exit(1);
    }
}

fixSuperAdminOrganization();
