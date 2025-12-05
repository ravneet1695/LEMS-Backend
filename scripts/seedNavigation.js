const mongoose = require('mongoose');
const NavigationItem = require('../models/NavigationItem');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lems');

const navigationItems = [
    // Top-level items
    {
        itemId: 'dashboard',
        label: 'Dashboard',
        icon: 'bi-speedometer2',
        route: '/dashboard',
        module: 'dashboard',
        order: 1,
        parent: null,
        isSystem: true,
        description: 'Main dashboard view'
    },
    {
        itemId: 'registration',
        label: 'Registration',
        icon: 'bi-person-plus-fill',
        route: '/register/external',
        module: 'registration',
        order: 2,
        parent: null,
        isSystem: true,
        description: 'User and organization registration'
    },
    {
        itemId: 'tests',
        label: 'Tests',
        icon: 'bi-file-earmark-text',
        route: '/test-admin/tests',
        module: 'tests',
        order: 3,
        parent: null,
        isSystem: true,
        description: 'Test management'
    },
    {
        itemId: 'question-bank',
        label: 'Question Bank',
        icon: 'bi-question-circle',
        route: '/questions/question-bank',
        module: 'question-bank',
        order: 4,
        parent: null,
        isSystem: true,
        description: 'Question repository'
    },
    {
        itemId: 'reports',
        label: 'Reports',
        icon: 'bi-bar-chart-line',
        route: '/reports',
        module: 'reports',
        order: 5,
        parent: null,
        isSystem: true,
        description: 'Analytics and reports'
    },
    {
        itemId: 'audit-logs',
        label: 'Audit Logs',
        icon: 'bi-file-text',
        route: '/audit-logs',
        module: 'audit-logs',
        order: 6,
        parent: null,
        isSystem: true,
        description: 'System audit logs'
    },
    {
        itemId: 'settings',
        label: 'Settings',
        icon: 'bi-gear-fill',
        route: '/settings',
        module: 'settings',
        order: 7,
        parent: null,
        isSystem: true,
        description: 'System settings'
    },
    {
        itemId: 'role-config',
        label: 'Role Config',
        icon: 'bi-shield-lock',
        route: '/role-config',
        module: 'role-config',
        order: 8,
        parent: null,
        isSystem: true,
        description: 'Role configuration'
    }
];

// Child items (will be added after parents are created)
const childItems = [
    {
        itemId: 'registration-orgs',
        label: 'Organizations',
        icon: 'bi-building',
        route: '/register/organizations',
        module: 'registration',
        order: 1,
        parentItemId: 'registration',
        isSystem: true,
        description: 'Manage organizations'
    },
    {
        itemId: 'registration-external',
        label: 'External Users',
        icon: 'bi-person-check',
        route: '/register/external',
        module: 'registration',
        order: 3,
        parentItemId: 'registration',
        isSystem: true,
        description: 'Manage external users'
    },
    {
        itemId: 'registration-org-users',
        label: 'Organization Users',
        icon: 'bi-people',
        route: '/register/organization-users',
        module: 'registration',
        order: 2,
        parentItemId: 'registration',
        isSystem: true,
        description: 'Manage organization users'
    },
    {
        itemId: 'question-bank-list',
        label: 'Questions',
        icon: 'bi-list-ul',
        route: '/questions/question-bank',
        module: 'question-bank',
        order: 1,
        parentItemId: 'question-bank',
        isSystem: true,
        description: 'View and manage questions'
    },
    {
        itemId: 'question-bank-upload',
        label: 'Bulk Upload',
        icon: 'bi-upload',
        route: '/questions/bulk-upload',
        module: 'question-bank',
        order: 2,
        parentItemId: 'question-bank',
        isSystem: true,
        description: 'Bulk upload questions'
    }
];

async function seedNavigation() {
    try {
        console.log('🌱 Seeding navigation items...');

        // Clear existing navigation items
        await NavigationItem.deleteMany({});
        console.log('✓ Cleared existing navigation items');

        // Insert top-level items
        const createdItems = await NavigationItem.insertMany(navigationItems);
        console.log(`✓ Created ${createdItems.length} top-level navigation items`);

        // Create a map of itemId to _id for parent references
        const itemIdMap = {};
        createdItems.forEach(item => {
            itemIdMap[item.itemId] = item._id;
        });

        // Insert child items with parent references
        const childItemsWithParent = childItems.map(child => ({
            ...child,
            parent: itemIdMap[child.parentItemId]
        }));

        const createdChildren = await NavigationItem.insertMany(childItemsWithParent);
        console.log(`✓ Created ${createdChildren.length} child navigation items`);

        console.log('✅ Navigation seeding completed successfully!');

        // Display summary
        const allItems = await NavigationItem.find({ parent: null }).sort({ order: 1 });
        console.log('\n📋 Navigation Structure:');
        for (const item of allItems) {
            const children = await NavigationItem.find({ parent: item._id }).sort({ order: 1 });
            console.log(`  ${item.order}. ${item.label} (${item.module})`);
            children.forEach(child => {
                console.log(`     └─ ${child.label}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding navigation:', error);
        process.exit(1);
    }
}

// Run the seed function
seedNavigation();
