import { describe, expect, it } from 'vitest';

import { initialsOf, passwordProblem, roleLabelOf } from '../src/admin/layout/account-model';

describe('initialsOf', () => {
  it('takes the first letters of the first two names', () => {
    expect(initialsOf('majida  rahman khan')).toBe('MR');
  });

  it('falls back to AD for a blank name', () => {
    expect(initialsOf('   ')).toBe('AD');
  });
});

describe('roleLabelOf', () => {
  it('names the admin roles and falls back to User', () => {
    expect(roleLabelOf(1)).toBe('Super Admin');
    expect(roleLabelOf(8)).toBe('Admin');
    expect(roleLabelOf(42)).toBe('User');
  });
});

describe('passwordProblem', () => {
  it('wants at least eight characters', () => {
    expect(passwordProblem('short', 'short')).toMatch(/at least 8/);
  });

  it('wants the confirmation to match', () => {
    expect(passwordProblem('longenough', 'longenougH')).toBe("Passwords don't match.");
  });

  it('accepts a matching long password', () => {
    expect(passwordProblem('longenough', 'longenough')).toBeNull();
  });
});
