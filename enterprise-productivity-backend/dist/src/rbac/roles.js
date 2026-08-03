"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_RANK = exports.USER_ROLE_VALUES = exports.UserRole = void 0;
exports.isUserRole = isUserRole;
exports.hasMinRole = hasMinRole;
exports.UserRole = {
    SUPER_ADMIN: 'super_admin',
    ORGANIZATION_OWNER: 'organization_owner',
    ADMIN: 'admin',
    MANAGER: 'manager',
    TEAM_LEAD: 'team_lead',
    EMPLOYEE: 'employee',
    GUEST: 'guest',
};
exports.USER_ROLE_VALUES = [
    exports.UserRole.SUPER_ADMIN,
    exports.UserRole.ORGANIZATION_OWNER,
    exports.UserRole.ADMIN,
    exports.UserRole.MANAGER,
    exports.UserRole.TEAM_LEAD,
    exports.UserRole.EMPLOYEE,
    exports.UserRole.GUEST,
];
exports.ROLE_RANK = {
    [exports.UserRole.SUPER_ADMIN]: 100,
    [exports.UserRole.ORGANIZATION_OWNER]: 90,
    [exports.UserRole.ADMIN]: 80,
    [exports.UserRole.MANAGER]: 60,
    [exports.UserRole.TEAM_LEAD]: 50,
    [exports.UserRole.EMPLOYEE]: 30,
    [exports.UserRole.GUEST]: 10,
};
function isUserRole(value) {
    return value in exports.ROLE_RANK;
}
function hasMinRole(role, minimum) {
    if (!isUserRole(role))
        return false;
    return exports.ROLE_RANK[role] >= exports.ROLE_RANK[minimum];
}
//# sourceMappingURL=roles.js.map