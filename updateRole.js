// Quick script to update user role to super_admin
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const updateUserRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const result = await User.findOneAndUpdate(
            { email: 'superadmin@test.com' },
            { role: 'super_admin' },
            { new: true }
        );

        if (result) {
            console.log('✅ User role updated successfully!');
            console.log('Email:', result.email);
            console.log('Role:', result.role);
            console.log('\nYou can now login with:');
            console.log('Email: superadmin@test.com');
            console.log('Password: admin123');
        } else {
            console.log('❌ User not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

updateUserRole();
