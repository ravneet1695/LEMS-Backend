const AuditLog = require('../models/AuditLog');
const geoip = require('geoip-lite');
const Settings = require('../models/Settings');

// Helper function to get default page size from settings
async function getDefaultPageSize() {
    try {
        const setting = await Settings.findOne({ key: 'tablePageSize' });
        const pageSize = setting?.value || 10;
        return (pageSize >= 5 && pageSize <= 100) ? pageSize : 10;
    } catch (error) {
        console.error('Error getting page size setting:', error);
        return 10;
    }
}
// @desc    Get audit logs with filters
// @route   GET /api/audit-logs
// @access  Private (Super Admin, Org Admin)
exports.getAuditLogs = async (req, res) => {
    try {
        const {
            user,
            action,
            resource,
            startDate,
            endDate
        } = req.query;

        // Get default page size from settings
        const defaultPageSize = await getDefaultPageSize();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || defaultPageSize;

        const query = {};

        // Organization-based filtering
        // Super admin can see all logs or filter by organization
        // Org admin can only see their organization's logs
        if (req.user.role === 'super_admin') {
            // Super admin can optionally filter by organization
            if (req.query.organization) {
                query.organization = req.query.organization;
            }
        } else if (req.user.organization) {
            // Org admin and other roles can only see their organization's logs
            query.organization = req.user.organization;
        }

        if (user) query.user = user;
        if (action) query.action = action;
        if (resource) query.resource = resource;

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search by user name or email
        if (req.query.search) {
            const User = require('../models/User');
            const users = await User.find({
                $or: [
                    { firstName: { $regex: req.query.search, $options: 'i' } },
                    { lastName: { $regex: req.query.search, $options: 'i' } },
                    { email: { $regex: req.query.search, $options: 'i' } }
                ]
            }).select('_id');

            if (users.length > 0) {
                query.user = { $in: users.map(u => u._id) };
            } else {
                // If search provided but no users found, return empty result
                // We can do this by setting a condition that will never match
                query.user = null;
            }
        }

        const logs = await AuditLog.find(query)
            .populate('user', 'firstName lastName email')
            .populate('organization', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await AuditLog.countDocuments(query);

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get single audit log
// @route   GET /api/audit-logs/:id
// @access  Private/Super Admin
exports.getAuditLog = async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id).populate('user', 'firstName lastName email');

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found',
            });
        }

        res.status(200).json({
            success: true,
            data: log,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Create audit log
// @route   POST /api/audit-logs
// @access  Private
exports.createAuditLog = async (req, res) => {
    try {
        const { action, resource, resourceId, changes, description, location: browserLocation, ipAddress: clientIP } = req.body;

        // Prioritize IP from request body (from localStorage) over server-detected IP
        let ipAddress = clientIP || null;

        // If no IP from client, get real IP address from request headers
        if (!ipAddress) {
            const { getClientIP } = require('../utils/ipHelper');
            ipAddress = getClientIP(req);
        }

        console.log('IP Address used:', ipAddress, '(from:', clientIP ? 'localStorage' : 'server', ')');

        // Prioritize browser location over IP-based location
        let location = browserLocation || null;

        // Get organization from user
        let organization = null;
        if (req.user && req.user.organization) {
            organization = req.user.organization._id || req.user.organization;
        }

        const log = await AuditLog.create({
            user: req.user._id,
            action,
            resource,
            resourceId,
            changes,
            ipAddress,
            userAgent: req.get('user-agent'),
            location,
            description,
            organization,
        });

        // Populate user and organization for response
        await log.populate('user', 'firstName lastName email');
        await log.populate('organization', 'name');

        res.status(201).json({
            success: true,
            data: log,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// Helper function to log actions (can be used in other controllers)
exports.logAction = async (userId, action, resource, resourceId, changes, description, req) => {
    try {
        // Get organization from the user making the request
        let organization = null;
        if (req && req.user && req.user.organization) {
            // Handle both populated object and direct ID
            organization = req.user.organization._id || req.user.organization;
        }

        // Get real IP address (handles proxies and load balancers)
        const { getClientIP } = require('../utils/ipHelper');
        const ipAddress = req ? getClientIP(req) : null;

        console.log('=== logAction Debug ===');
        console.log('IP Address:', ipAddress);
        console.log('User ID:', userId);
        console.log('Action:', action);
        console.log('Resource:', resource);

        // Get location from IP (commented out by user)
        let location = null;
        const auditLogData = {
            user: userId,
            action,
            resource,
            resourceId,
            changes,
            ipAddress,
            userAgent: req?.get('user-agent'),
            location,
            description,
            organization,
        };

        console.log('Creating audit log with data:', JSON.stringify(auditLogData, null, 2));

        const createdLog = await AuditLog.create(auditLogData);
        console.log('Audit log created successfully. ID:', createdLog._id);
        console.log('Saved IP Address:', createdLog.ipAddress);
        console.log('======================');
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
};

// @desc    Get audit log statistics
// @route   GET /api/audit-logs/stats
// @access  Private/Super Admin
exports.getAuditLogStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Build query based on user role
        const matchQuery = { createdAt: { $gte: startDate } };

        // Organization-based filtering for statistics
        if (req.user.role !== 'super_admin' && req.user.organization) {
            matchQuery.organization = req.user.organization;
        } else if (req.query.organization) {
            matchQuery.organization = req.query.organization;
        }

        // Actions by type
        const actionStats = await AuditLog.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Resources by type
        const resourceStats = await AuditLog.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$resource', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Top users
        const topUsers = await AuditLog.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    count: 1,
                    'user.firstName': 1,
                    'user.lastName': 1,
                    'user.email': 1,
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: {
                actionStats,
                resourceStats,
                topUsers,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Export audit logs to CSV
// @route   GET /api/audit-logs/export
// @access  Private/Super Admin
exports.exportAuditLogs = async (req, res) => {
    try {
        const {
            user,
            action,
            resource,
            startDate,
            endDate,
        } = req.query;

        const query = {};

        // Organization-based filtering
        if (req.user.role === 'super_admin') {
            if (req.query.organization) {
                query.organization = req.query.organization;
            }
        } else if (req.user.organization) {
            query.organization = req.user.organization;
        }

        if (user) query.user = user;
        if (action) query.action = action;
        if (resource) query.resource = resource;

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search by user name or email
        if (req.query.search) {
            const User = require('../models/User');
            const users = await User.find({
                $or: [
                    { firstName: { $regex: req.query.search, $options: 'i' } },
                    { lastName: { $regex: req.query.search, $options: 'i' } },
                    { email: { $regex: req.query.search, $options: 'i' } }
                ]
            }).select('_id');

            if (users.length > 0) {
                query.user = { $in: users.map(u => u._id) };
            } else {
                query.user = null;
            }
        }

        const logs = await AuditLog.find(query)
            .populate('user', 'firstName lastName email')
            .populate('organization', 'name')
            .sort({ createdAt: -1 });

        // Generate CSV
        const headers = ['Date', 'User Name', 'User Email', 'Organization', 'Action', 'Resource', 'Description', 'IP Address'];
        let csv = headers.join(',') + '\n';

        logs.forEach(log => {
            const date = log.createdAt ? new Date(log.createdAt).toISOString() : '';
            const userName = log.user ? `${log.user.firstName} ${log.user.lastName} ` : 'Unknown';
            const userEmail = log.user ? log.user.email : '';
            const orgName = log.organization ? log.organization.name : '';
            const actionStr = log.action || '';
            const resourceStr = log.resource || '';
            const description = log.description ? log.description.replace(/,/g, ';') : ''; // Simple escape
            const ip = log.ipAddress || '';

            csv += `"${date}", "${userName}", "${userEmail}", "${orgName}", "${actionStr}", "${resourceStr}", "${description}", "${ip}"\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment(`audit - logs - ${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export audit logs',
        });
    }
};

// @desc    Get audit logs grouped by organization
// @route   GET /api/audit-logs/by-organization
// @access  Private/Super Admin
exports.getAuditLogsByOrganization = async (req, res) => {
    try {
        const { days = 30, action, resource } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Build match query
        const matchQuery = { createdAt: { $gte: startDate } };
        if (action) matchQuery.action = action;
        if (resource) matchQuery.resource = resource;

        // Aggregate logs by organization
        const orgStats = await AuditLog.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$organization',
                    totalActions: { $sum: 1 },
                    actions: { $push: '$action' },
                    resources: { $push: '$resource' },
                    users: { $addToSet: '$user' }
                }
            },
            {
                $lookup: {
                    from: 'organizations',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'organization'
                }
            },
            { $unwind: { path: '$organization', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    organizationId: '$_id',
                    organizationName: '$organization.name',
                    totalActions: 1,
                    uniqueUsers: { $size: '$users' },
                    actionBreakdown: {
                        $reduce: {
                            input: '$actions',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $arrayToObject: [[{
                                            k: '$$this',
                                            v: {
                                                $add: [
                                                    { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                                                    1
                                                ]
                                            }
                                        }]]
                                    }
                                ]
                            }
                        }
                    },
                    resourceBreakdown: {
                        $reduce: {
                            input: '$resources',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $arrayToObject: [[{
                                            k: '$$this',
                                            v: {
                                                $add: [
                                                    { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                                                    1
                                                ]
                                            }
                                        }]]
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            { $sort: { totalActions: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: orgStats,
            period: `Last ${days} days`
        });
    } catch (error) {
        console.error('Error getting organization stats:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
