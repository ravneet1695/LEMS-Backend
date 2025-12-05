// Question bank access policies
exports.canCreateQuestion = (user) => {
    return ['super_admin', 'org_admin', 'content_creator'].includes(user.role);
};

exports.canApproveQuestion = (user) => {
    return ['super_admin', 'org_admin', 'content_approver'].includes(user.role);
};

exports.canViewQuestion = (user, question) => {
    // Super admin can view all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== question.organization.toString()) {
        return false;
    }

    // Org admin can view all in their org
    if (user.role === 'org_admin') return true;

    // Content approver can view all questions
    if (user.role === 'content_approver') return true;

    // Content creator can view their own questions
    if (user.role === 'content_creator' && question.createdBy.toString() === user._id.toString()) {
        return true;
    }

    // Managers can view approved questions
    if (user.role === 'manager' && question.approvalStatus === 'approved') {
        return true;
    }

    return false;
};

exports.canEditQuestion = (user, question) => {
    // Super admin can edit all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== question.organization.toString()) {
        return false;
    }

    // Org admin can edit all in their org
    if (user.role === 'org_admin') return true;

    // Content creator can edit their own pending/rejected questions
    if (
        user.role === 'content_creator' &&
        question.createdBy.toString() === user._id.toString() &&
        ['pending', 'rejected'].includes(question.approvalStatus)
    ) {
        return true;
    }

    return false;
};

exports.canDeleteQuestion = (user, question) => {
    // Super admin can delete all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== question.organization.toString()) {
        return false;
    }

    // Org admin can delete all in their org
    if (user.role === 'org_admin') return true;

    // Content creator can delete their own pending questions
    if (
        user.role === 'content_creator' &&
        question.createdBy.toString() === user._id.toString() &&
        question.approvalStatus === 'pending'
    ) {
        return true;
    }

    return false;
};
