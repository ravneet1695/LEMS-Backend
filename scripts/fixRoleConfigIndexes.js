const mongoose = require('mongoose');
require('dotenv').config();

async function fixRoleConfigIndexes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('roleconfigs');

        // Get existing indexes
        const indexes = await collection.indexes();
        console.log('\nExisting indexes:');
        indexes.forEach(index => {
            console.log(`  - ${index.name}:`, JSON.stringify(index.key));
        });

        // Drop the old single-field unique index on roleName if it exists
        try {
            await collection.dropIndex('roleName_1');
            console.log('\n✅ Dropped old single-field index: roleName_1');
        } catch (error) {
            if (error.code === 27) {
                console.log('\n⚠️  Index roleName_1 does not exist (already dropped or never existed)');
            } else {
                throw error;
            }
        }

        // Ensure the compound unique index exists
        await collection.createIndex(
            { roleName: 1, organization: 1 },
            { unique: true, name: 'roleName_1_organization_1' }
        );
        console.log('✅ Created/verified compound unique index: roleName_1_organization_1');

        // Verify final indexes
        const finalIndexes = await collection.indexes();
        console.log('\nFinal indexes:');
        finalIndexes.forEach(index => {
            console.log(`  - ${index.name}:`, JSON.stringify(index.key));
        });

        console.log('\n✅ Index fix completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing indexes:', error);
        process.exit(1);
    }
}

// Run the fix
fixRoleConfigIndexes();
