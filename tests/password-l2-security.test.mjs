import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Transpile and load src/auth/password.ts in isolated context
const passwordTs = readFileSync(path.join(root, 'src/auth/password.ts'), 'utf8');
const transpiledPassword = ts.transpileModule(passwordTs, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const passwordExports = {};
vm.runInNewContext(transpiledPassword, {
  exports: passwordExports,
  module: { exports: passwordExports },
});

const {
  validateSignUpPassword,
  validateSignInPassword,
  formatAuthPasswordError,
  MIN_SIGNUP_PASSWORD_LENGTH,
} = passwordExports;

const loginPageSource = readFileSync(path.join(root, 'src/auth/LoginPage.tsx'), 'utf8');

test('L2 Verification 1: Minimum signup password length constant is 8', () => {
  assert.equal(MIN_SIGNUP_PASSWORD_LENGTH, 8, 'MIN_SIGNUP_PASSWORD_LENGTH must be exactly 8');
  assert.equal(typeof validateSignUpPassword, 'function');
  assert.equal(typeof validateSignInPassword, 'function');
  assert.equal(typeof formatAuthPasswordError, 'function');
});

test('L2 Verification 2: Signup password rejects short passwords (< 8 characters)', () => {
  const shortPasswords = ['', '1', '12345', '123456', 'Ab1!', 'seven_7'];
  for (const pw of shortPasswords) {
    const result = validateSignUpPassword(pw);
    assert.equal(result.isValid, false, `Password "${pw}" should be rejected`);
    assert.ok(result.error, `Rejection of "${pw}" must provide an error message`);
  }
});

test('L2 Verification 3: Signup password rejects empty and whitespace-only passwords', () => {
  const whitespacePasswords = ['', ' ', '   ', '\t', '\n', '   \t  \n '];
  for (const pw of whitespacePasswords) {
    const result = validateSignUpPassword(pw);
    assert.equal(result.isValid, false, `Whitespace password "${pw}" should be rejected`);
    assert.match(
      result.error,
      /empty or whitespace/i,
      `Error for "${pw}" should mention empty or whitespace`
    );
  }
});

test('L2 Verification 4: Signup accepts valid passwords without rigid composition restrictions', () => {
  const validPasswords = [
    '12345678', // 8 digits (valid if backend allows)
    'password', // 8 lowercase letters
    'PASSWORD', // 8 uppercase letters
    'MySecurePassword2026', // mixed case + digits
    'p@ssw0rd!#$%', // complex special symbols
    'correct horse battery staple', // long passphrase with spaces
    'engineering-lead-2026', // hyphenated words
  ];

  for (const pw of validPasswords) {
    const result = validateSignUpPassword(pw);
    assert.equal(result.isValid, true, `Valid password "${pw}" should be accepted`);
    assert.equal(result.error, undefined);
  }
});

test('L2 Verification 5: Sign-in preserves compatibility for existing users with legacy passwords', () => {
  // Existing users may have legacy 6-character passwords from initial Supabase default
  const existingUserPasswords = [
    '123456',
    'legacy',
    'abc123',
    'admin123',
    'veryLongPassword2026',
  ];

  for (const pw of existingUserPasswords) {
    const result = validateSignInPassword(pw);
    assert.equal(result.isValid, true, `Existing password "${pw}" must be allowed on sign-in`);
  }

  // But empty and whitespace-only inputs must still be rejected on sign-in
  const invalidSignInInputs = ['', ' ', '   ', '\t\n'];
  for (const pw of invalidSignInInputs) {
    const result = validateSignInPassword(pw);
    assert.equal(result.isValid, false, `Empty sign-in input "${pw}" must be rejected`);
    assert.ok(result.error);
  }
});

test('L2 Verification 6: Gracefully formats Supabase weak_password and security error messages', () => {
  // 1. Supabase GoTrue weak_password error string
  const weakError = formatAuthPasswordError('AuthApiError: weak_password: Password should be at least 6 characters');
  assert.equal(
    weakError,
    'Password does not meet security requirements. Please choose a stronger password with at least 8 characters.'
  );

  // 2. Leaked / pwned password error string
  const pwnedError = formatAuthPasswordError('Password found in breached/pwned database');
  assert.equal(
    pwnedError,
    'Password does not meet security requirements. Please choose a stronger password with at least 8 characters.'
  );

  // 3. Invalid login credentials
  const credsError = formatAuthPasswordError('Invalid login credentials');
  assert.equal(
    credsError,
    'Invalid email or password. Please check your credentials and try again.'
  );

  // 4. General unhandled errors pass through cleanly
  const netError = formatAuthPasswordError('Failed to fetch from network');
  assert.equal(netError, 'Failed to fetch from network');
});

test('L2 Verification 7: LoginPage.tsx integrates client-side password validation and UX guidance', () => {
  // 1. Confirms imports of password validation functions
  assert.ok(
    loginPageSource.includes('validateSignUpPassword'),
    'LoginPage.tsx must import and call validateSignUpPassword'
  );
  assert.ok(
    loginPageSource.includes('validateSignInPassword'),
    'LoginPage.tsx must import and call validateSignInPassword'
  );
  assert.ok(
    loginPageSource.includes('formatAuthPasswordError'),
    'LoginPage.tsx must import and use formatAuthPasswordError'
  );

  // 2. Confirms programmatic signup validation before signUp() is invoked
  assert.match(
    loginPageSource,
    /validateSignUpPassword\(password\)/,
    'LoginPage.tsx must validate password on signup'
  );

  // 3. Confirms programmatic signin validation before signIn() is invoked
  assert.match(
    loginPageSource,
    /validateSignInPassword\(password\)/,
    'LoginPage.tsx must validate password on sign-in'
  );

  // 4. Confirms helper text guidance is shown in signup mode
  assert.match(
    loginPageSource,
    /Must be at least 8 characters/i,
    'LoginPage.tsx must display password length requirement guidance'
  );
});
