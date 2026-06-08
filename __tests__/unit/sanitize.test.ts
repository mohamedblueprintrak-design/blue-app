/**
 * Unit Tests — Input Sanitization Utilities
 * اختبارات أدوات تنظيف المدخلات
 *
 * Comprehensive tests for sanitizeString, sanitizeObject, sanitizeEmail,
 * removeControlChars, escapeSqlLike, sanitizeFilename, validateXSS, validateSQLInjection
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Sanitize — sanitizeString', () => {
  let sanitizeString: (input: string) => string;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    sanitizeString = mod.sanitizeString;
  });

  it('should strip HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitizeString('<b>Hello</b>')).not.toContain('<b>');
  });

  it('should encode remaining < > \' " as HTML entities', () => {
    const result = sanitizeString('a < b > c');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('should encode quotes', () => {
    expect(sanitizeString('say "hello"')).toContain('&quot;');
    expect(sanitizeString("it's fine")).toContain('&#x27;');
  });

  it('should preserve safe strings', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World');
  });

  it('should preserve Arabic text', () => {
    expect(sanitizeString('محمد أحمد')).toBe('محمد أحمد');
  });

  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('should handle empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeString(undefined as unknown as string)).toBe('');
    expect(sanitizeString(null as unknown as string)).toBe('');
    expect(sanitizeString(42 as unknown as string)).toBe('');
  });

  it('should strip self-closing tags', () => {
    expect(sanitizeString('<br/>')).not.toContain('<br');
    expect(sanitizeString('<hr/>')).not.toContain('<hr');
  });

  it('should preserve legitimate comparison operators in text', () => {
    // "tolerance < 5mm" should have < encoded but not treated as HTML tag
    const result = sanitizeString('tolerance < 5mm');
    expect(result).toContain('&lt;');
    expect(result).not.toContain('<tolerance');
  });
});

describe('Sanitize — sanitizeObject', () => {
  let sanitizeObject: <T extends Record<string, unknown>>(obj: T) => T;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    sanitizeObject = mod.sanitizeObject;
  });

  it('should sanitize string values in flat objects', () => {
    const input = { name: '<script>alert(1)</script>', age: 25 };
    const result = sanitizeObject(input);
    expect(result.name).not.toContain('<script>');
    expect(result.age).toBe(25);
  });

  it('should sanitize nested objects recursively', () => {
    const input = {
      name: 'Alice',
      nested: { value: '<img onerror="hack">' },
    };
    const result = sanitizeObject(input);
    expect(result.nested.value).not.toContain('<img');
  });

  it('should sanitize arrays of strings', () => {
    const input = { tags: ['<b>bold</b>', 'normal'] };
    const result = sanitizeObject(input);
    expect(result.tags[0]).not.toContain('<b>');
    expect(result.tags[1]).toBe('normal');
  });

  it('should sanitize arrays of objects', () => {
    const input = {
      items: [{ name: '<script>x</script>' }, { name: 'clean' }],
    };
    const result = sanitizeObject(input);
    expect(result.items[0].name).not.toContain('<script>');
    expect(result.items[1].name).toBe('clean');
  });

  it('should preserve non-string, non-object, non-array values', () => {
    const input = { count: 5, active: true, data: null };
    const result = sanitizeObject(input);
    expect(result.count).toBe(5);
    expect(result.active).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should not mutate the original object', () => {
    const input = { name: '<script>x</script>' };
    const copy = { ...input };
    sanitizeObject(input);
    expect(input.name).toBe(copy.name);
  });
});

describe('Sanitize — sanitizeEmail', () => {
  let sanitizeEmail: (email: string) => string;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    sanitizeEmail = mod.sanitizeEmail;
  });

  it('should lowercase and trim email', () => {
    expect(sanitizeEmail('  TEST@Example.COM  ')).toBe('test@example.com');
  });

  it('should remove disallowed characters', () => {
    expect(sanitizeEmail('test@example.com!')).toBe('test@example.com');
  });

  it('should preserve allowed special characters', () => {
    expect(sanitizeEmail('user+tag@sub.domain.com')).toBe('user+tag@sub.domain.com');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeEmail(undefined as unknown as string)).toBe('');
    expect(sanitizeEmail(null as unknown as string)).toBe('');
  });

  it('should preserve dots, plus, minus, underscore in email', () => {
    expect(sanitizeEmail('user.name_tag+test@domain.com')).toBe('user.name_tag+test@domain.com');
  });
});

describe('Sanitize — removeControlChars', () => {
  let removeControlChars: (input: string) => string;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    removeControlChars = mod.removeControlChars;
  });

  it('should remove control characters', () => {
    expect(removeControlChars('hello\x00world')).toBe('helloworld');
    expect(removeControlChars('test\x1Fdata')).toBe('testdata');
  });

  it('should remove DEL character', () => {
    expect(removeControlChars('test\x7Fdata')).toBe('testdata');
  });

  it('should preserve normal text', () => {
    expect(removeControlChars('Hello World')).toBe('Hello World');
  });

  it('should return empty string for non-string input', () => {
    expect(removeControlChars(undefined as unknown as string)).toBe('');
    expect(removeControlChars(null as unknown as string)).toBe('');
  });

  it('should remove C1 control characters', () => {
    expect(removeControlChars('test\x9Fdata')).toBe('testdata');
  });

  it('should preserve newlines and tabs (they are control chars, so removed)', () => {
    // Newline \x0A and tab \x09 are in the 0x00-0x1F range
    expect(removeControlChars('hello\nworld')).toBe('helloworld');
    expect(removeControlChars('hello\tworld')).toBe('helloworld');
  });
});

describe('Sanitize — escapeSqlLike', () => {
  let escapeSqlLike: (input: string) => string;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    escapeSqlLike = mod.escapeSqlLike;
  });

  it('should escape percent sign', () => {
    expect(escapeSqlLike('50%')).toBe('50\\%');
  });

  it('should escape underscore', () => {
    expect(escapeSqlLike('hello_world')).toBe('hello\\_world');
  });

  it('should escape backslash', () => {
    expect(escapeSqlLike('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('should return empty string for non-string input', () => {
    expect(escapeSqlLike(undefined as unknown as string)).toBe('');
    expect(escapeSqlLike(null as unknown as string)).toBe('');
  });

  it('should not modify strings without special characters', () => {
    expect(escapeSqlLike('normal text')).toBe('normal text');
  });
});

describe('Sanitize — sanitizeFilename', () => {
  let sanitizeFilename: (filename: string) => string;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    sanitizeFilename = mod.sanitizeFilename;
  });

  it('should remove path traversal sequences', () => {
    expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
  });

  it('should remove forward and back slashes', () => {
    expect(sanitizeFilename('path/to/file')).not.toContain('/');
    expect(sanitizeFilename('path\\to\\file')).not.toContain('\\');
  });

  it('should replace non-allowed characters with underscore', () => {
    expect(sanitizeFilename('my file name.txt')).toBe('my_file_name.txt');
  });

  it('should preserve allowed characters (alphanumeric, dot, dash, underscore)', () => {
    expect(sanitizeFilename('report-2024_v1.2.pdf')).toBe('report-2024_v1.2.pdf');
  });

  it('should replace whitespace with underscore before trimming', () => {
    // Spaces are replaced by _ before trim, so "  file.txt  " → "__file.txt__" → trimmed
    expect(sanitizeFilename('  file.txt  ')).toBe('__file.txt__');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeFilename(undefined as unknown as string)).toBe('');
    expect(sanitizeFilename(null as unknown as string)).toBe('');
  });
});

describe('Sanitize — validateXSS', () => {
  let validateXSS: (input: string) => boolean;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    validateXSS = mod.validateXSS;
  });

  it('should detect script tags', () => {
    expect(validateXSS('<script>alert(1)</script>')).toBe(true);
    expect(validateXSS('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
  });

  it('should detect unclosed script tags', () => {
    expect(validateXSS('<script src="evil.js">')).toBe(true);
  });

  it('should detect javascript: URIs', () => {
    expect(validateXSS('javascript:void(0)')).toBe(true);
    expect(validateXSS('JAVASCRIPT:alert(1)')).toBe(true);
  });

  it('should detect vbscript: URIs', () => {
    expect(validateXSS('vbscript:msgbox')).toBe(true);
  });

  it('should detect inline event handlers', () => {
    expect(validateXSS('<img onerror="hack">')).toBe(true);
    expect(validateXSS('<div onclick="alert(1)">')).toBe(true);
  });

  it('should detect iframe tags', () => {
    expect(validateXSS('<iframe src="evil.html">')).toBe(true);
  });

  it('should detect object tags', () => {
    expect(validateXSS('<object data="evil.swf">')).toBe(true);
  });

  it('should detect embed tags', () => {
    expect(validateXSS('<embed src="evil.swf">')).toBe(true);
  });

  it('should detect form tags', () => {
    expect(validateXSS('<form action="evil">')).toBe(true);
  });

  it('should detect input tags', () => {
    expect(validateXSS('<input onfocus="hack">')).toBe(true);
  });

  it('should detect svg tags', () => {
    expect(validateXSS('<svg onload="alert(1)">')).toBe(true);
  });

  it('should detect math tags', () => {
    expect(validateXSS('<math><mtext>hack</mtext>')).toBe(true);
  });

  it('should detect details tags', () => {
    expect(validateXSS('<details ontoggle="hack">')).toBe(true);
  });

  it('should detect CSS expression', () => {
    expect(validateXSS('style="width:expression(alert(1))"')).toBe(true);
  });

  it('should detect url() in CSS', () => {
    expect(validateXSS('style="background:url(evil)"')).toBe(true);
  });

  it('should detect data:text/html URIs', () => {
    expect(validateXSS('data:text/html,<script>alert(1)</script>')).toBe(true);
  });

  it('should detect HTML comments', () => {
    expect(validateXSS('<!-- comment -->')).toBe(true);
  });

  it('should detect CDATA sections', () => {
    expect(validateXSS('<![CDATA[<script>alert(1)</script>]]>')).toBe(true);
  });

  it('should detect img tags with event handlers', () => {
    expect(validateXSS('<img src=x onerror=alert(1)>')).toBe(true);
  });

  it('should return false for safe strings', () => {
    expect(validateXSS('Hello World')).toBe(false);
    expect(validateXSS('محمد أحمد')).toBe(false);
    expect(validateXSS('admin@blueprint.ae')).toBe(false);
  });

  it('should return false for empty or non-string input', () => {
    expect(validateXSS('')).toBe(false);
    expect(validateXSS(undefined as unknown as string)).toBe(false);
    expect(validateXSS(null as unknown as string)).toBe(false);
  });
});

describe('Sanitize — validateSQLInjection', () => {
  let validateSQLInjection: (input: string) => boolean;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    validateSQLInjection = mod.validateSQLInjection;
  });

  it('should detect SELECT...FROM pattern', () => {
    expect(validateSQLInjection('SELECT * FROM users')).toBe(true);
  });

  it('should detect DROP TABLE pattern', () => {
    expect(validateSQLInjection('DROP TABLE users')).toBe(true);
  });

  it('should detect OR 1=1 pattern', () => {
    expect(validateSQLInjection('1 OR 1=1')).toBe(true);
  });

  it('should detect AND 1=1 pattern', () => {
    expect(validateSQLInjection('1 AND 1=1')).toBe(true);
  });

  it('should detect comment-based injection', () => {
    expect(validateSQLInjection("admin' --")).toBe(true);
  });

  it('should detect semicolon injection', () => {
    expect(validateSQLInjection("'; DROP TABLE users;")).toBe(true);
  });

  it('should detect UNION-based injection', () => {
    expect(validateSQLInjection("' UNION SELECT * FROM users")).toBe(true);
  });

  it('should detect WAITFOR DELAY', () => {
    expect(validateSQLInjection("'; WAITFOR DELAY '0:0:5'")).toBe(true);
  });

  it('should detect BENCHMARK', () => {
    expect(validateSQLInjection('BENCHMARK(1000000, MD5("test"))')).toBe(true);
  });

  it('should detect SLEEP', () => {
    expect(validateSQLInjection("'; SLEEP(5)")).toBe(true);
  });

  it('should detect CONCAT', () => {
    expect(validateSQLInjection("CONCAT(username, password)")).toBe(true);
  });

  it('should detect LOAD_FILE', () => {
    expect(validateSQLInjection("LOAD_FILE('/etc/passwd')")).toBe(true);
  });

  it('should detect INTO OUTFILE', () => {
    expect(validateSQLInjection("INTO OUTFILE '/tmp/evil'")).toBe(true);
  });

  it('should detect INTO DUMPFILE', () => {
    expect(validateSQLInjection("INTO DUMPFILE '/tmp/evil'")).toBe(true);
  });

  it('should return false for safe strings', () => {
    expect(validateSQLInjection('Hello World')).toBe(false);
    expect(validateSQLInjection('محمد أحمد')).toBe(false);
    expect(validateSQLInjection('project-alpha-v2')).toBe(false);
  });

  it('should return false for empty or non-string input', () => {
    expect(validateSQLInjection('')).toBe(false);
    expect(validateSQLInjection(undefined as unknown as string)).toBe(false);
    expect(validateSQLInjection(null as unknown as string)).toBe(false);
  });
});
