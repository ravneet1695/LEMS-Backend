// Content access policies
exports.canCreateContent = (user) => {
    return ['super_admin', 'org_admin', 'content_creator'].includes(user.role);
};

exports.canApproveContent = (user) => {
    return ['super_admin', 'org_admin', 'content_approver'].includes(user.role);
};

exports.canViewContent = (user, content) => {
    // Super admin can view all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== content.organization.toString()) {
        return false;
    }

    // Org admin can view all in their org
    if (user.role === 'org_admin') return true;

    // Content approver can view pending content
    if (user.role === 'content_approver') return true;

    // Content creator can view their own content
    if (user.role === 'content_creator' && content.createdBy.toString() === user._id.toString()) {
        return true;
    }

    // Others can only view approved content
    return content.approvalStatus === 'approved';
};

exports.canEditContent = (user, content) => {
    // Super admin can edit all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== content.organization.toString()) {
        return false;
    }

    // Org admin can edit all in their org
    if (user.role === 'org_admin') return true;

    // Content creator can edit their own pending/rejected content
    if (
        user.role === 'content_creator' &&
        content.createdBy.toString() === user._id.toString() &&
        ['pending', 'rejected'].includes(content.approvalStatus)
    ) {
        return true;
    }

    return false;
};

exports.canDeleteContent = (user, content) => {
    // Super admin can delete all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== content.organization.toString()) {
        return false;
    }

    // Org admin can delete all in their org
    if (user.role === 'org_admin') return true;

    // Content creator can delete their own pending content
    if (
        user.role === 'content_creator' &&
        content.createdBy.toString() === user._id.toString() &&
        content.approvalStatus === 'pending'
    ) {
        return true;
    }

    return false;
};
