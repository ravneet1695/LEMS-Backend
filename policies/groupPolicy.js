// Group access policies
exports.canCreateGroup = (user) => {
    return ['super_admin', 'org_admin'].includes(user.role);
};

exports.canViewGroup = (user, group) => {
    // Super admin can view all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== group.organization.toString()) {
        return false;
    }

    // Org admin can view all in their org
    if (user.role === 'org_admin') return true;

    // Managers can view their groups
    if (user.role === 'manager') {
        return group.managers.some((manager) => manager.toString() === user._id.toString());
    }

    // Members can view their groups
    return group.members.some((member) => member.toString() === user._id.toString());
};

exports.canEditGroup = (user, group) => {
    // Super admin can edit all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== group.organization.toString()) {
        return false;
    }

    // Org admin can edit all in their org
    if (user.role === 'org_admin') return true;

    // Managers can edit their groups
    if (user.role === 'manager') {
        return group.managers.some((manager) => manager.toString() === user._id.toString());
    }

    return false;
};

exports.canDeleteGroup = (user, group) => {
    // Super admin can delete all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== group.organization.toString()) {
        return false;
    }

    // Only org admin can delete groups
    return user.role === 'org_admin';
};

exports.canManageMembers = (user, group) => {
    // Super admin can manage all
    if (user.role === 'super_admin') return true;

    // Must be in same organization
    if (user.organization.toString() !== group.organization.toString()) {
        return false;
    }

    // Org admin can manage all in their org
    if (user.role === 'org_admin') return true;

    // Managers can manage their groups
    if (user.role === 'manager') {
        return group.managers.some((manager) => manager.toString() === user._id.toString());
    }

    return false;
};
