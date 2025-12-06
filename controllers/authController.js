const User = require('../models/User');
const crypto = require('crypto');
const { generateToken, generateRefreshToken } = require('../utils/tokenGenerator');
const { sendEmail, templates } = require('../utils/emailService');
const { logAction } = require('./auditLogController');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, organization } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email',
            });
        }

        // Create user
        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            role: role || 'learner',
            organization,
        });

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Send welcome email
        /*
        try {
            await sendEmail({
                email: user.email,
                subject: 'Welcome to Learning Platform',
                message: templates.welcome(`${user.firstName} ${user.lastName}`),
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }
        */

        // Log registration action
        await logAction(
            user._id,
            'create',
            'user',
            user._id,
            { role: user.role, organization: user.organization },
            `User registered: ${user.email}`,
            req
        );

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    organization: user.organization,
                },
                token,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password').populate('organization', 'name logo');
        console.log(user);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated',
            });
        }

        // Check if password matches
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Update last login
        user.lastLogin = Date.now();
        await user.save();

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Audit log on login removed as per user request

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    role: user.role,
                    organization: user.organization,
                    groups: user.groups,
                    profileImage: user.profileImage,
                    lastLogin: user.lastLogin,
                },
                token,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('organization', 'name logo').populate('groups', 'name');

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required',
            });
        }

        const { verifyToken } = require('../utils/tokenGenerator');
        const decoded = verifyToken(refreshToken);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
            });
        }

        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive',
            });
        }

        const newToken = generateToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        res.status(200).json({
            success: true,
            data: {
                token: newToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    // Audit log on logout removed as per user request

    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
};

// @desc    Forgot password - Request reset token
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email format
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an email address',
            });
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address',
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If an account exists with that email, a password reset link has been sent. Please check your email.',
            });
        }

        // Check if user account is active
        if (!user.isActive) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists with that email, a password reset link has been sent. Please check your email.',
            });
        }

        // Check if a reset token was recently sent (prevent spam)
        if (user.resetPasswordExpire && user.resetPasswordExpire > Date.now()) {
            const minutesLeft = Math.ceil((user.resetPasswordExpire - Date.now()) / 60000);
            return res.status(429).json({
                success: false,
                message: `A reset link was already sent. Please wait ${minutesLeft} minute(s) before requesting another.`,
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire time (15 minutes for better UX)
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        // Create reset url - use frontend URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const resetUrl = `${frontendUrl}/auth/reset-password/${resetToken}`;

        // Log reset action
        await logAction(
            user._id,
            'request',
            'password_reset',
            user._id,
            { email: user.email },
            `Password reset requested for: ${user.email}`,
            req
        );

        // Send email (commented out for now, uncomment when email service is configured)
        /*
        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request',
                message: templates.passwordReset(user.firstName, resetUrl),
            });
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            
            return res.status(500).json({
                success: false,
                message: 'Failed to send reset email. Please try again later.',
            });
        }
        */

        // For development, return the token
        console.log('='.repeat(60));
        console.log('PASSWORD RESET REQUEST');
        console.log('User:', user.email);
        console.log('Reset Token:', resetToken);
        console.log('Reset URL:', resetUrl);
        console.log('Expires in: 15 minutes');
        console.log('='.repeat(60));

        res.status(200).json({
            success: true,
            message: 'If an account exists with that email, a password reset link has been sent. Please check your email.',
            // Remove these in production
            ...(process.env.NODE_ENV === 'development' && {
                resetToken: resetToken,
                resetUrl: resetUrl,
                expiresIn: '15 minutes'
            })
        });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request. Please try again later.',
        });
    }
};

// @desc    Reset password with token
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const { resetToken } = req.params;

        // Validate inputs
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both password and confirmation',
            });
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match',
            });
        }

        // Password strength validation
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long',
            });
        }

        // Check for password complexity
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            });
        }

        // Hash the token from params to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token. Please request a new password reset link.',
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'This account has been deactivated. Please contact support.',
            });
        }

        // Set new password
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        // Log password reset action
        await logAction(
            user._id,
            'update',
            'user',
            user._id,
            { passwordReset: true },
            `Password successfully reset for user: ${user.email}`,
            req
        );

        console.log('='.repeat(60));
        console.log('PASSWORD RESET SUCCESSFUL');
        console.log('User:', user.email);
        console.log('Time:', new Date().toISOString());
        console.log('='.repeat(60));

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.',
        });
    } catch (error) {
        console.error('Password Reset Error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while resetting your password. Please try again later.',
        });
    }
};
