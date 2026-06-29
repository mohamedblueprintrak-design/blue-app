/**
 * Auth Modules Index
 * تصدير وحدات المصادقة
 * 
 * Re-exports all auth module functionality
 */

// Password Management
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecurePassword,
  checkPasswordBreached,
  type PasswordValidationResult,
} from './password';

// JWT Token Management
export {
  generateAccessToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  generateToken,
  verifyToken,
  verifyPasswordResetToken,
  verifyEmailVerificationToken,
  getTokenExpiration,
  isTokenExpired,
  decodeToken,
  hashToken,
  normalizeRoleForClient,
  generateDbRefreshToken,
  getAuthCookieOptions,
  AUTH_COOKIE_NAMES,
  TOKEN_EXPIRY,
  type JwtPayload,
  type TokenType,
  type TokenOptions,
} from './jwt';

// Authorization
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isRoleAtLeast,
  isAdmin,
  isManagerOrAbove,
  canManageUsers,
  canManageProjects,
  canApprove,
  canAccessFinancials,
  canAccessHR,
  getRolePermissions,
  getRoleLevel,
  getRolesBelow,
  getRolesAtOrAbove,
  canAccessResource,
  isSameOrganization,
  canAccessOrganization,
} from './authorization';

// Encryption (re-exported from token-utils via jwt)
export { encrypt, decrypt } from './jwt';
