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
        itemId: 'access-config',
        label: 'Access Config',
        icon: 'bi-shield-lock',
        route: '/access-config',
        module: 'access-config',
        order: 8,
        parent: null,
        isSystem: true,
        description: 'Access and permissions configuration'
    },
    {
        itemId: 'org-config',
        label: 'Organization Config',
        icon: 'bi-sliders',
        route: '/admin/organization-config',
        module: 'org-config',
        order: 9,
        parent: null,
        isSystem: true,
        description: 'Organization-specific configuration'
    }
];

// Child navigation items
const childNavigationItems = [
    // Registration children
    {
        itemId: 'organizations',
        label: 'Organizations',
        icon: 'bi-building',
        route: '/register/organizations',
        module: 'registration',
        order: 1,
        parent: 'registration',
        isSystem: true,
        description: 'Manage organizations'
    },
    {
        itemId: 'organization-users',
        label: 'Organization Users',
        icon: 'bi-people',
        route: '/register/organization-users',
        module: 'registration',
        order: 2,
        parent: 'registration',
        isSystem: true,
        description: 'Manage organization users'
    },
    {
        itemId: 'external-users',
        label: 'External Users',
        icon: 'bi-person-plus',
        route: '/register/external',
        module: 'registration',
        order: 3,
        parent: 'registration',
        isSystem: true,
        description: 'Manage external users'
    },
    // Question Bank children
    {
        itemId: 'questions',
        label: 'Questions',
        icon: 'bi-question-circle',
        route: '/questions/question-bank',
        module: 'question-bank',
        order: 1,
        parent: 'question-bank',
        isSystem: true,
        description: 'Manage questions'
    },
    {
        itemId: 'bulk-upload',
        label: 'Bulk Upload',
        icon: 'bi-upload',
        route: '/questions/bulk-upload',
        module: 'question-bank',
        order: 2,
        parent: 'question-bank',
        isSystem: true,
        description: 'Bulk upload questions'
    },
    // Organization Config children
    {
        itemId: 'departments',
        label: 'Departments',
        icon: 'bi-building',
        route: '/admin/departments',
        module: 'departments',
        order: 1,
        parent: 'org-config',
        isSystem: true,
        description: 'Department management'
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
        const childItemsWithParent = childNavigationItems.map(child => {
            const parentItem = createdItems.find(item => item.itemId === child.parent);
            return {
                ...child,
                parent: parentItem ? parentItem._id : null
            };
        });

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
