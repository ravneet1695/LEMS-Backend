const mongoose = require('mongoose');
require('dotenv').config();

const AccessConfig = require('../models/AccessConfig');

async function updateSuperAdminRole() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Update super_admin role to include role-config module
        const result = await AccessConfig.updateOne(
            {
                roleName: 'super_admin',
                organization: null
            },
            {
                $addToSet: {
                    moduleAccess: 'role-config'
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log('✅ Updated super_admin role with role-config module');
        } else {
            console.log('ℹ️  super_admin role already has role-config module');
        }

        // Display the updated role
        const updatedRole = await AccessConfig.findOne({
            roleName: 'super_admin',
            organization: null
        });

        console.log('\n📋 Super Admin Module Access:');
        console.log(updatedRole.moduleAccess);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating role:', error);
        process.exit(1);
    }
}

updateSuperAdminRole();
