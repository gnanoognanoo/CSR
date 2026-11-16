/**
 * CSR-RIT Password Security Validation Utility
 *
 * Implements Low Priority Security Issue L2:
 * - Enforces minimum 8 characters for account signup.
 * - Rejects empty and whitespace-only passwords.
 * - Avoids overly rigid composition rules that could conflict with Supabase settings.
 * - Preserves login compatibility for existing accounts by only rejecting empty/whitespace inputs.
 * - Translates Supabase weak_password and security errors into clean, user-friendly messages.
 */

export const MIN_SIGNUP_PASSWORD_LENGTH = 8;

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates password for new account sign-up.
 * Requirements:
 * - Must not be empty or contain only whitespace.
 * - Must be at least 8 characters in length.
 */
export function validateSignUpPassword(password: string): PasswordValidationResult {
  if (!password || password.trim().length === 0) {
    return {
      isValid: false,
      error: 'Password is required and cannot be empty or whitespace only.',
    };
  }

  if (password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_SIGNUP_PASSWORD_LENGTH} characters long.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates password for existing account sign-in.
 * Preserves compatibility with existing accounts by not imposing new signup length
 * restrictions on login, but ensuring empty/whitespace submissions are blocked before calling API.
 */
export function validateSignInPassword(password: string): PasswordValidationResult {
  if (!password || password.trim().length === 0) {
    return {
      isValid: false,
      error: 'Please enter your password.',
    };
  }

  return { isValid: true };
}

/**
 * Normalizes and translates Supabase authentication password errors into user-friendly messages.
 * Prevents exposing raw technical error dumps or internal regex rules to end-users.
 */
export function formatAuthPasswordError(errorMsg?: string | null): string {
  if (!errorMsg) {
    return 'An unexpected authentication error occurred.';
  }

  const lower = errorMsg.toLowerCase();

  // Supabase GoTrue weak_password errors or HaveIBeenPwned breach notices
  if (
    lower.includes('weak_password') ||
    lower.includes('pwned') ||
    lower.includes('compromised') ||
    lower.includes('password should be at least') ||
    lower.includes('password is too weak') ||
    lower.includes('password does not meet')
  ) {
    return 'Password does not meet security requirements. Please choose a stronger password with at least 8 characters.';
  }

  // Invalid login credentials
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  return errorMsg;
}
