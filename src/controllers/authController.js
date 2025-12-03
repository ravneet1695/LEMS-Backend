const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../config/database');

// Generate JWT tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION || '1d' }
    );

    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
    );

    return { accessToken, refreshToken };
};

// Register new user
exports.register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create user
        const user = new User({
            email,
            passwordHash: password,
            firstName,
            lastName,
            phone
        });

        await user.save();

        logger.info(`New user registered: ${email}`);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user }
        });
    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with password
        const user = await User.findOne({ email }).select('+passwordHash').populate('roles');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate tokens
        const tokens = generateTokens(user._id);

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        // Remove password from response
        const userResponse = user.toJSON();

        logger.info(`User logged in: ${email}`);

        res.json({
            success: true,
            data: {
                user: userResponse,
                ...tokens
            }
        });
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// Get current user
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('roles');

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        logger.error(`Get me error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

// Logout user
exports.logout = async (req, res) => {
    try {
        // In a production app, you would invalidate the token here
        // For now, client-side token removal is sufficient

        logger.info(`User logged out: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error(`Logout error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error logging out',
            error: error.message
        });
    }
};

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Generate new tokens
        const tokens = generateTokens(decoded.userId);

        res.json({
            success: true,
            data: tokens
        });
    } catch (error) {
        logger.error(`Refresh token error: ${error.message}`);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists
            return res.json({
                success: true,
                message: 'If the email exists, a reset link has been sent'
            });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user._id, type: 'password_reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // TODO: Send email with reset link
        // await emailService.sendPasswordReset(user.email, resetToken);

        logger.info(`Password reset requested for: ${email}`);

        res.json({
            success: true,
            message: 'If the email exists, a reset link has been sent',
            // Remove in production
            resetToken
        });
    } catch (error) {
        logger.error(`Forgot password error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error processing request',
            error: error.message
        });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'password_reset') {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset token'
            });
        }

        // Update password
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.passwordHash = newPassword;
        await user.save();

        logger.info(`Password reset successful for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        logger.error(`Reset password error: ${error.message}`);
        res.status(400).json({
            success: false,
            message: 'Invalid or expired reset token'
        });
    }
};
