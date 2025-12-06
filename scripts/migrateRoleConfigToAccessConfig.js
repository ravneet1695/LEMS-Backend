const mongoose = require('mongoose');
require('dotenv').config();

async function migrateCollection() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const db = mongoose.connection.db;

        // Check if old collection exists
        const collections = await db.listCollections({ name: 'roleconfigs' }).toArray();

        if (collections.length > 0) {
            console.log('✓ Found "roleconfigs" collection');

            // Rename collection from roleconfigs to accessconfigs
            await db.collection('roleconfigs').rename('accessconfigs');
            console.log('✅ Successfully renamed collection from "roleconfigs" to "accessconfigs"');
        } else {
            console.log('⏭️  Collection "roleconfigs" does not exist, nothing to migrate');
        }

        console.log('\n✅ Collection migration completed successfully!');
        process.exit(0);
    } catch (error) {
        if (error.code === 48) {
            console.log('⏭️  Collection "accessconfigs" already exists');
            process.exit(0);
        } else {
            console.error('❌ Error migrating collection:', error);
            process.exit(1);
        }
    }
}

migrateCollection();
