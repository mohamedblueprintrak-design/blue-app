/**
 * Input Sanitization Utilities
 * أدوات تنظيف المدخلات للحماية من XSS وحقن الأكواد
 */

// ─── Security Detection Patterns ─────────────────────────────────────────────

/**
 * Common XSS attack patterns used by `validateXSS`.
 */
const XSS_PATTERNS: RegExp[] = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /<script[\s\S]*?>/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /on\w+\s*=\s*["']?/i,
  /<iframe[\s\S]*?>/i,
  /<object[\s\S]*?>/i,
  /<embed[\s\S]*?>/i,
  /<form[\s\S]*?>/i,
  /<input[\s\S]*?>/i,
  /<svg[\s\S]*?>/i,
  /<math[\s\S]*?>/i,
  /<details[\s\S]*?>/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /data\s*:\s*text\/html/i,
  /<!--[\s\S]*?-->/,
  /<\s*!\[CDATA\[[\s\S]*?\]\]>/i,
  /<\s*img[^>]+on\w+\s*=[^>]*>/i,
];

/**
 * Common SQL injection patterns used by `validateSQLInjection`.
 */
const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|UNION|HAVING|GROUP\s+BY|ORDER\s+BY)\b.*\b(FROM|INTO|TABLE|DATABASE|WHERE|SET|VALUES)\b)/i,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(--|;|\/\*|\*\/|xp_|sp_)/i,
  /(\bWAITFOR\s+DELAY\b)/i,
  /(\bBENCHMARK\s*\()/i,
  /(\bSLEEP\s*\()/i,
  /('\s*(OR|AND)\s+')/i,
  /(\bCONCAT\s*\()/i,
  /(\bLOAD_FILE\s*\()/i,
  /(\bINTO\s+(OUT|DUMP)FILE\b)/i,
];

// ─── Sanitization ────────────────────────────────────────────────────────────

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    // Remove HTML tags but preserve legitimate comparison operators (e.g., "tolerance < 5mm")
    // This regex only removes patterns that look like HTML tags: <word...> or </word...>
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>/g, '')
    // Encode remaining < > ' " as HTML entities for XSS prevention
    .replace(/[<>'"]/g, (char) => {
      const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', "'": '&#x27;', '"': '&quot;' };
      return entities[char] || char;
    })
    .trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) : item
      );
    }
  }
  return sanitized;
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim().replace(/[^a-z0-9@._+-]/g, '');
}

export function removeControlChars(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

export function escapeSqlLike(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[%_\\]/g, '\\$&');
}

export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return '';
  return filename.replace(/\.\./g, '').replace(/[/\\]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').trim();
}

// ─── Security Validators ─────────────────────────────────────────────────────

/**
 * Detects potential XSS (Cross-Site Scripting) patterns in input.
 *
 * Scans for `<script>` tags, inline event handlers, `javascript:` URIs,
 * and other common XSS vectors.
 *
 * **Note:** This is a defense-in-depth measure. Always use `sanitizeString`
 * before rendering user input in HTML.
 *
 * @param input - The input to check
 * @returns `true` if XSS patterns are detected
 */
export function validateXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Detects potential SQL injection patterns in input.
 *
 * Uses a set of regex patterns to identify common SQL injection techniques
 * including UNION-based, blind, and time-based injection attacks.
 *
 * **Note:** This is a defense-in-depth measure and should NOT replace
 * parameterized queries.
 *
 * @param input - The input to check
 * @returns `true` if SQL injection patterns are detected
 */
export function validateSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}
