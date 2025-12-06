const mongoose = require('mongoose');
require('dotenv').config();

const AccessConfig = require('../models/AccessConfig');

const defaultRoles = [
    {
        roleName: 'super_admin',
        displayName: 'Super Admin',
        description: 'Full system access with all permissions',
        organization: null,
        moduleAccess: ['dashboard', 'registration', 'tests', 'question-bank', 'reports', 'audit-logs', 'settings', 'access-config', 'departments', 'org-config'],
        isSystemRole: true,
        isActive: true
    },
    {
        roleName: 'org_admin',
        displayName: 'Organization Admin',
        description: 'Manage organization users and content',
        organization: null,
        moduleAccess: ['dashboard', 'registration', 'tests', 'question-bank', 'reports', 'departments', 'org-config'],
        isSystemRole: true,
        isActive: true
    },
    {
        roleName: 'content_creator',
        displayName: 'Content Creator',
        description: 'Create and manage tests and questions',
        organization: null,
        moduleAccess: ['tests', 'question-bank'],
        isSystemRole: true,
        isActive: true
    },
    {
        roleName: 'manager',
        displayName: 'Manager',
        description: 'View reports and analytics',
        organization: null,
        moduleAccess: ['dashboard', 'reports'],
        isSystemRole: true,
        isActive: true
    },
    {
        roleName: 'learner',
        displayName: 'Learner',
        description: 'Take tests and view results',
        organization: null,
        moduleAccess: ['dashboard'],
        isSystemRole: true,
        isActive: true
    }
];

async function seedRoles() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Clear existing roles (optional - comment out if you want to keep existing)
        // await AccessConfig.deleteMany({});
        // console.log('Cleared existing roles');

        // Insert default roles
        for (const role of defaultRoles) {
            const existing = await AccessConfig.findOne({
                roleName: role.roleName,
                organization: null
            });

            if (!existing) {
                await AccessConfig.create(role);
                console.log(`✅ Created role: ${role.displayName}`);
            } else {
                console.log(`⏭️  Role already exists: ${role.displayName}`);
            }
        }

        console.log('\n✅ Role seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding roles:', error);
        process.exit(1);
    }
}

seedRoles();
