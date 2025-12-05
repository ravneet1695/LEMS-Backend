// Organization access policies
exports.canCreateOrganization = (user) => {
    return user.role === 'super_admin';
};

exports.canViewOrganization = (user, organization) => {
    // Super admin can view all
    if (user.role === 'super_admin') return true;

    // Users can view their own organization
    return user.organization && user.organization.toString() === organization._id.toString();
};

exports.canEditOrganization = (user, organization) => {
    // Super admin can edit all
    if (user.role === 'super_admin') return true;

    // Org admin can edit their own organization
    if (user.role === 'org_admin' && user.organization.toString() === organization._id.toString()) {
        return true;
    }

    return false;
};

exports.canDeleteOrganization = (user) => {
    // Only super admin can delete organizations
    return user.role === 'super_admin';
};

exports.canManageSettings = (user, organization) => {
    // Super admin can manage all
    if (user.role === 'super_admin') return true;

    // Org admin can manage their own organization settings
    if (user.role === 'org_admin' && user.organization.toString() === organization._id.toString()) {
        return true;
    }

    return false;
};
