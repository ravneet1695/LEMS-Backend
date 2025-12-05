const mongoose = require('mongoose');
const RoleConfig = require('./models/RoleConfig');
require('dotenv').config();

// Default role configurations
const defaultRoleConfigs = [
    {
        roleName: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all modules',
        organization: null,
        isSystemRole: true,
        moduleAccess: [
            'dashboard',
            'registration',
            'tests',
            'question-bank',
            'reports',
            'audit-logs',
            'settings'
        ],
        permissions: {}
    },
    {
        roleName: 'org_admin',
        displayName: 'Organization Administrator',
        description: 'Organization-level administrator with most modules',
        organization: null,
        isSystemRole: true,
        moduleAccess: [
            'dashboard',
            'registration',
            'tests',
            'question-bank',
            'reports'
        ],
        permissions: {}
    },
    {
        roleName: 'learner',
        displayName: 'Learner',
        description: 'Basic user with dashboard access only',
        organization: null,
        isSystemRole: true,
        moduleAccess: [
            'dashboard'
        ],
        permissions: {}
    },
    {
        roleName: 'content_creator',
        displayName: 'Content Creator',
        description: 'Can create and manage tests and questions',
        organization: null,
        isSystemRole: true,
        moduleAccess: [
            'dashboard',
            'tests',
            'question-bank'
        ],
        permissions: {}
    },
    {
        roleName: 'content_approver',
        displayName: 'Content Approver',
        description: 'Can approve and manage content',
        organization: null,
        isSystemRole: true,
        moduleAccess: [
            'dashboard',
            'tests',
            'question-bank',
            'reports'
        ],
        permissions: {}
    },
    {
        roleName: 'manager',
        displayName: 'Manager',
        description: 'Can view reports and manage users',
        organization: null,
        isSystemRole: true,
        moduleAccess: [
            'dashboard',
            'registration',
            'reports'
        ],
        permissions: {}
    }
];

async function seedDefaultRoleConfigs() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Remove existing default role configs
        await RoleConfig.deleteMany({ organization: null, isSystemRole: true });
        console.log('Removed existing default role configs');

        // Insert new default role configs
        const result = await RoleConfig.insertMany(defaultRoleConfigs);
        console.log(`Inserted ${result.length} default role configurations:`);

        result.forEach(config => {
            console.log(`  - ${config.roleName}: ${config.moduleAccess.join(', ')}`);
        });

        console.log('\n✅ Default role configurations seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding default role configs:', error);
        process.exit(1);
    }
}

// Run the seed function
seedDefaultRoleConfigs();
