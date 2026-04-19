export const DASHBOARD_PATH_BY_ROLE = {
  customer: '/customer',
  farmer: '/farmer',
  business: '/business',
  travel_agency: '/business',
  restaurant: '/restaurant',
  delivery: '/delivery-large',
  delivery_large: '/delivery-large',
  delivery_small: '/delivery-small',
  admin: '/admin',
  community: '/dashboard/community'
};

export const getUserRoles = (user) => {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  if (user.role) return [user.role];
  return [];
};

export const getPrimaryRole = (source) => {
  if (!source) return 'customer';
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) return source[0] || 'customer';
  const roles = getUserRoles(source);
  return roles[0] || 'customer';
};

export const getDashboardPath = (source) => {
  const role = getPrimaryRole(source);
  return DASHBOARD_PATH_BY_ROLE[role] || '/';
};

export const hasAnyAllowedRole = (user, allowedRoles = []) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const roles = getUserRoles(user);
  return roles.some((role) => allowedRoles.includes(role));
};
