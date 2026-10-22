import { describe, expect, test } from 'vitest';

import { httpUrlOrEmpty } from '../src/lib/safe-url';

describe('httpUrlOrEmpty', () => {
  test('keeps http(s) links and drops every other scheme', () => {
    expect(httpUrlOrEmpty(' https://meet.google.com/abc ')).toBe('https://meet.google.com/abc');
    expect(httpUrlOrEmpty('http://example.com')).toBe('http://example.com');
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'meet.google.com/x', '', null, undefined, 5]) {
      expect(httpUrlOrEmpty(bad)).toBe('');
    }
  });
});
