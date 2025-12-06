const User = require('../models/User');
const Organization = require('../models/Organization');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const Result = require('../models/Result');

// @desc    Get dashboard statistics (Role-based)
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const userOrganization = req.user.organization;

        let stats = {};

        // Super Admin - Access to all data
        if (userRole === 'super_admin') {
            const [
                totalOrganizations,
                totalUsers,
                totalTests,
                totalQuestions,
                totalAttempts,
                activeUsers,
                recentOrganizations,
                recentUsers,
                roleDistribution
            ] = await Promise.all([
                Organization.countDocuments({ isActive: true }),
                User.countDocuments(),
                Test.countDocuments(),
                Question.countDocuments(),
                Attempt.countDocuments(),
                User.countDocuments({ isActive: true }),
                Organization.find({ isActive: true })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('name code type createdAt'),
                User.find()
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('organization', 'name')
                    .select('firstName lastName email role createdAt'),
                User.aggregate([
                    { $group: { _id: '$role', count: { $sum: 1 } } }
                ])
            ]);

            // Organization breakdown
            const organizationStats = await Organization.aggregate([
                { $match: { isActive: true } },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'organization',
                        as: 'users'
                    }
                },
                {
                    $project: {
                        name: 1,
                        code: 1,
                        type: 1,
                        userCount: { $size: '$users' }
                    }
                },
                { $sort: { userCount: -1 } },
                { $limit: 10 }
            ]);

            stats = {
                overview: {
                    totalOrganizations,
                    totalUsers,
                    totalTests,
                    totalQuestions,
                    totalAttempts,
                    activeUsers,
                    inactiveUsers: totalUsers - activeUsers
                },
                roleDistribution: roleDistribution.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                recentOrganizations,
                recentUsers,
                organizationStats
            };
        }
        // Org Admin - Access to own organization data
        else if (userRole === 'org_admin') {
            if (!userOrganization) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization not found for user'
                });
            }

            const [
                organization,
                totalUsers,
                totalTests,
                totalQuestions,
                totalAttempts,
                activeUsers,
                recentUsers,
                roleDistribution,
                recentTests
            ] = await Promise.all([
                Organization.findById(userOrganization).select('name code type logo'),
                User.countDocuments({ organization: userOrganization }),
                Test.countDocuments({ organization: userOrganization }),
                Question.countDocuments({ organization: userOrganization }),
                Attempt.countDocuments({ organization: userOrganization }),
                User.countDocuments({ organization: userOrganization, isActive: true }),
                User.find({ organization: userOrganization })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('firstName lastName email role createdAt isActive'),
                User.aggregate([
                    { $match: { organization: userOrganization } },
                    { $group: { _id: '$role', count: { $sum: 1 } } }
                ]),
                Test.find({ organization: userOrganization })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('title description status createdAt')
            ]);

            stats = {
                organization,
                overview: {
                    totalUsers,
                    totalTests,
                    totalQuestions,
                    totalAttempts,
                    activeUsers,
                    inactiveUsers: totalUsers - activeUsers
                },
                roleDistribution: roleDistribution.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                recentUsers,
                recentTests
            };
        }
        // Learner - Access to own data only
        else {
            const [
                user,
                totalAttempts,
                completedTests,
                averageScore,
                recentAttempts,
                upcomingTests
            ] = await Promise.all([
                User.findById(userId)
                    .populate('organization', 'name logo')
                    .select('firstName lastName email role organization'),
                Attempt.countDocuments({ user: userId }),
                Result.countDocuments({ user: userId }),
                Result.aggregate([
                    { $match: { user: userId } },
                    { $group: { _id: null, avgScore: { $avg: '$percentage' } } }
                ]),
                Result.find({ user: userId })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('test', 'title')
                    .select('test percentage passed createdAt'),
                Test.find({
                    organization: userOrganization,
                    status: 'published',
                    startDate: { $lte: new Date() },
                    endDate: { $gte: new Date() }
                })
                    .limit(5)
                    .select('title description duration startDate endDate')
            ]);

            const passedTests = await Result.countDocuments({
                user: userId,
                passed: true
            });

            stats = {
                user,
                overview: {
                    totalAttempts,
                    completedTests,
                    passedTests,
                    failedTests: completedTests - passedTests,
                    averageScore: averageScore.length > 0 ? Math.round(averageScore[0].avgScore) : 0
                },
                recentAttempts,
                upcomingTests
            };
        }

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
