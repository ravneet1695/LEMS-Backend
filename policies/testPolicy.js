// Test access policies
exports.canCreateTest = (user) => {
    return ['super_admin', 'org_admin', 'content_creator', 'manager'].includes(user.role);
};

exports.canApproveTest = (user) => {
    return ['super_admin', 'org_admin', 'content_approver'].includes(user.role);
};

exports.canViewTest = (user, test) => {
    // Super admin can view all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== test.organization.toString()) {
        return false;
    }

    // Org admin can view all in their org
    if (user.role === 'org_admin') return true;

    // Content approver can view all tests
    if (user.role === 'content_approver') return true;

    // Creator can view their own tests
    if (test.createdBy.toString() === user._id.toString()) {
        return true;
    }

    // Managers can view approved tests
    if (user.role === 'manager' && test.approvalStatus === 'approved') {
        return true;
    }

    return false;
};

exports.canEditTest = (user, test) => {
    // Super admin can edit all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== test.organization.toString()) {
        return false;
    }

    // Org admin can edit all in their org
    if (user.role === 'org_admin') return true;

    // Creator can edit their own draft/pending/rejected tests
    if (
        test.createdBy.toString() === user._id.toString() &&
        ['draft', 'pending', 'rejected'].includes(test.approvalStatus)
    ) {
        return true;
    }

    return false;
};

exports.canDeleteTest = (user, test) => {
    // Super admin can delete all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== test.organization.toString()) {
        return false;
    }

    // Org admin can delete all in their org
    if (user.role === 'org_admin') return true;

    // Creator can delete their own draft tests
    if (test.createdBy.toString() === user._id.toString() && test.approvalStatus === 'draft') {
        return true;
    }

    return false;
};

exports.canAssignTest = (user, test) => {
    // Super admin can assign all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== test.organization.toString()) {
        return false;
    }

    // Org admin and managers can assign approved tests
    if (['org_admin', 'manager'].includes(user.role) && test.approvalStatus === 'approved') {
        return true;
    }

    return false;
};
