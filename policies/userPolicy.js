// User access policies
exports.canCreateUser = (user) => {
    return ['super_admin', 'org_admin'].includes(user.role);
};

exports.canViewUser = (user, targetUser) => {
    // Super admin can view all
    if (user.role === 'super_admin') return true;

    // Users can view themselves
    if (user._id.toString() === targetUser._id.toString()) return true;

    // Org admin can view users in their organization
    if (user.role === 'org_admin' && user.organization.toString() === targetUser.organization.toString()) {
        return true;
    }

    // Managers can view users in their groups
    if (user.role === 'manager') {
        return user.groups.some((groupId) => targetUser.groups.includes(groupId));
    }

    return false;
};

exports.canEditUser = (user, targetUser) => {
    // Super admin can edit all
    if (user.role === 'super_admin') return true;

    // Users can edit themselves (limited fields)
    if (user._id.toString() === targetUser._id.toString()) return true;

    // Org admin can edit users in their organization
    if (user.role === 'org_admin' && user.organization.toString() === targetUser.organization.toString()) {
        return true;
    }

    return false;
};

exports.canDeleteUser = (user, targetUser) => {
    // Super admin can delete all
    if (user.role === 'super_admin') return true;

    // Org admin can delete users in their organization (except themselves)
    if (
        user.role === 'org_admin' &&
        user.organization.toString() === targetUser.organization.toString() &&
        user._id.toString() !== targetUser._id.toString()
    ) {
        return true;
    }

    return false;
};

exports.canChangeRole = (user, targetUser) => {
    // Super admin can change any role
    if (user.role === 'super_admin') return true;

    // Org admin can change roles within their organization (but not to super_admin)
    if (user.role === 'org_admin' && user.organization.toString() === targetUser.organization.toString()) {
        return true;
    }

    return false;
};
