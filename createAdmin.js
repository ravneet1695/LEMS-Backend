// Script to create a super admin account
// Run with: node createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createSuperAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@test.com' });

        if (existingAdmin) {
            console.log('Admin user already exists!');
            console.log('Email: admin@test.com');
            console.log('Resetting password to: admin123');

            existingAdmin.password = 'admin123';
            existingAdmin.role = 'super_admin';
            await existingAdmin.save();

            console.log('Password reset successfully!');
        } else {
            // Create new super admin
            const admin = await User.create({
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@test.com',
                password: 'admin123',
                role: 'super_admin',
                isActive: true
            });

            console.log('Super Admin created successfully!');
            console.log('Email: admin@test.com');
            console.log('Password: admin123');
            console.log('Role: super_admin');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createSuperAdmin();
