const Test = require('../models/Test');
const testPolicy = require('../policies/testPolicy');
const { logAction } = require('./auditLogController');

// @desc    Create new test
// @route   POST /api/tests
// @access  Private
exports.createTest = async (req, res) => {
    try {
        if (!testPolicy.canCreateTest(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create tests',
            });
        }

        const testData = {
            ...req.body,
            createdBy: req.user._id,
            organization: req.user.organization,
        };

        const test = await Test.create(testData);

        // Log test creation action
        await logAction(
            req.user._id,
            'create',
            'test',
            test._id,
            { name: test.name, type: test.type },
            `Created test: ${test.name}`,
            req
        );

        res.status(201).json({
            success: true,
            data: test,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get all tests
// @route   GET /api/tests
// @access  Private
exports.getTests = async (req, res) => {
    try {
        const { approvalStatus, type, page = 1, limit = 20 } = req.query;

        const query = {};

        // Filter out deleted tests
        query.isDeleted = false;

        // Filter by organization (except super admin)
        if (req.user.role !== 'super_admin') {
            query.organization = req.user.organization;
        }

        if (approvalStatus) query.approvalStatus = approvalStatus;
        if (type) query.type = type;

        const tests = await Test.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .populate('questions.question', 'questionText type difficulty')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Test.countDocuments(query);

        res.status(200).json({
            success: true,
            data: tests,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Get single test
// @route   GET /api/tests/:id
// @access  Private
exports.getTest = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .populate('questions.question');

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
            });
        }

        // Check if test is deleted
        if (test.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
            });
        }

        if (!testPolicy.canViewTest(req.user, test)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this test',
            });
        }

        res.status(200).json({
            success: true,
            data: test,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Update test
// @route   PUT /api/tests/:id
// @access  Private
exports.updateTest = async (req, res) => {
    try {
        let test = await Test.findById(req.params.id);

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
            });
        }

        if (!testPolicy.canEditTest(req.user, test)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this test',
            });
        }

        test = await Test.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        // Log test update action
        await logAction(
            req.user._id,
            'update',
            'test',
            test._id,
            { name: test.name, updates: Object.keys(req.body) },
            `Updated test: ${test.name}`,
            req
        );

        res.status(200).json({
            success: true,
            data: test,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Delete test (Soft Delete)
// @route   DELETE /api/tests/:id
// @access  Private (Super Admin, Org Admin, Content Creator)
exports.deleteTest = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
            });
        }

        // Check if already deleted
        if (test.isDeleted) {
            return res.status(400).json({
                success: false,
                message: 'Test is already deleted',
            });
        }

        // Soft delete: mark as deleted
        test.isDeleted = true;
        test.deletedAt = Date.now();
        test.deletedBy = req.user._id;
        await test.save();

        // Log test deletion
        await logAction(
            req.user._id,
            'delete',
            'test',
            test._id,
            { title: test.title },
            `Deleted test: ${test.title}`,
            req
        );

        res.status(200).json({
            success: true,
            message: 'Test deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Approve/Reject test
// @route   PUT /api/tests/:id/approve
// @access  Private (Content Approver, Org Admin, Super Admin)
exports.approveTest = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;

        if (!testPolicy.canApproveTest(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to approve tests',
            });
        }

        const test = await Test.findById(req.params.id);

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
            });
        }

        test.approvalStatus = status;
        test.approvedBy = req.user._id;
        test.approvalDate = Date.now();

        if (status === 'rejected' && rejectionReason) {
            test.rejectionReason = rejectionReason;
        }

        await test.save();

        res.status(200).json({
            success: true,
            data: test,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Submit test for approval
// @route   PATCH /api/tests/:id/submit
// @access  Private
exports.submitForApproval = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
            });
        }

        if (!testPolicy.canEditTest(req.user, test)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to submit this test',
            });
        }

        if (test.approvalStatus !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Only draft tests can be submitted for approval',
            });
        }

        test.approvalStatus = 'pending';
        await test.save();

        res.status(200).json({
            success: true,
            data: test,
            message: 'Test submitted for approval successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Duplicate test (create new version)
// @route   POST /api/tests/:id/duplicate
// @access  Private
exports.duplicateTest = async (req, res) => {
    try {
        const originalTest = await Test.findById(req.params.id);

        if (!originalTest) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
            });
        }

        if (!testPolicy.canViewTest(req.user, originalTest)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to duplicate this test',
            });
        }

        // Create new test object
        const testData = originalTest.toObject();
        delete testData._id;
        delete testData.createdAt;
        delete testData.updatedAt;
        delete testData.__v;

        // Update metadata
        testData.name = `${testData.name} (Copy)`;
        testData.approvalStatus = 'draft';
        testData.createdBy = req.user._id;
        testData.approvedBy = undefined;
        testData.approvalDate = undefined;
        testData.rejectionReason = undefined;

        // Handle versioning
        if (req.body.createVersion) {
            testData.baseVersion = originalTest._id;
            testData.version = (originalTest.version || 1) + 1;
            testData.versionNotes = req.body.versionNotes || '';
        }

        const newTest = await Test.create(testData);

        res.status(201).json({
            success: true,
            data: newTest,
            message: 'Test duplicated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// @desc    Generate randomized version of test
// @route   POST /api/tests/:id/randomize
// @access  Private
exports.randomizeTest = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id).populate('questions.question');

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Test not found',
            });
        }

        if (!testPolicy.canViewTest(req.user, test)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to randomize this test',
            });
        }

        // Randomize questions if enabled
        let randomizedQuestions = [...test.questions];
        if (test.settings.shuffleQuestions) {
            randomizedQuestions = randomizedQuestions.sort(() => Math.random() - 0.5);
        }

        // Randomize options within each question if enabled
        if (test.settings.shuffleOptions) {
            randomizedQuestions = randomizedQuestions.map(q => {
                if (q.question && q.question.options && q.question.options.length > 0) {
                    const shuffledOptions = [...q.question.options].sort(() => Math.random() - 0.5);
                    return {
                        ...q.toObject(),
                        question: {
                            ...q.question.toObject(),
                            options: shuffledOptions
                        }
                    };
                }
                return q;
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...test.toObject(),
                questions: randomizedQuestions
            },
            message: 'Test randomized successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
