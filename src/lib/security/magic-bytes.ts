/**
 * Magic Byte Sniffer — determines the REAL file type from file content
 *
 * SECURITY: This is used to validate uploaded files INDEPENDENTLY of the
 * client-supplied Content-Type header, which can be trivially spoofed.
 *
 * Without magic-byte verification, an attacker can upload a PHP webshell
 * with Content-Type: image/jpeg and filename: evil.jpg — the extension and
 * MIME checks pass, but the file is executable code.
 *
 * Reference: OWASP File Upload Cheat Sheet — "Verify the file content"
 */

/**
 * Detect the real file type from the first bytes of a buffer.
 * Returns a normalized MIME type, or null if the signature is unknown.
 *
 * Only covers the file types allowed by the documents upload route.
 * Adding new types: extend the SIGNATURES array with { offset, bytes, mime }.
 */
const FILE_SIGNATURES: ReadonlyArray<{ offset: number; bytes: number[]; mime: string }> = [
  // Images
  { offset: 0, bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: 'image/png' },
  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' }, // GIF8
  { offset: 0, bytes: [0x42, 0x4d], mime: 'image/bmp' }, // BM
  { offset: 0, bytes: [0x49, 0x49, 0x2a, 0x00], mime: 'image/tiff' }, // II*\0 (little-endian)
  { offset: 0, bytes: [0x4d, 0x4d, 0x00, 0x2a], mime: 'image/tiff' }, // MM\0* (big-endian)
  { offset: 0, bytes: [0x57, 0x45, 0x42, 0x50], mime: 'image/webp' }, // RIFF....WEBP — checked loosely below

  // PDF
  { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' }, // %PDF

  // Office (OOXML — ZIP-based, check PK signature + content type later)
  { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04], mime: 'application/zip' }, // PK\x03\x04
  { offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06], mime: 'application/zip' }, // PK\x05\x06 (empty zip)
  { offset: 0, bytes: [0x50, 0x4b, 0x07, 0x08], mime: 'application/zip' }, // PK\x07\x08 (spanned)

  // Legacy Office (OLE Compound Document)
  { offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], mime: 'application/x-cfb' }, // .doc/.xls/.ppt

  // Archives
  { offset: 0, bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], mime: 'application/x-rar-compressed' }, // Rar!\x1a\x07
  { offset: 0, bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], mime: 'application/x-7z-compressed' }, // 7z
  { offset: 257, bytes: [0x75, 0x73, 0x74, 0x61, 0x72], mime: 'application/x-tar' }, // "ustar" at offset 257

  // DWG (AutoCAD) — "AC10" followed by version digits
  { offset: 0, bytes: [0x41, 0x43, 0x31, 0x30], mime: 'application/dwg' }, // AC10
];

/**
 * WebP files start with RIFF....WEBP.
 * The RIFF header is 12 bytes: "RIFF" + 4-byte size + "WEBP".
 */
function isWebP(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50 // WEBP
  );
}

/**
 * Detect the real MIME type from a buffer's magic bytes.
 * Returns null if the signature is unknown or the buffer is too small.
 */
export function detectMimeType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // Check WebP first (needs 12 bytes, special RIFF+WEBP pattern)
  if (isWebP(buffer)) return 'image/webp';

  for (const sig of FILE_SIGNATURES) {
    if (sig.offset + sig.bytes.length > buffer.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[sig.offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return sig.mime;
  }

  return null;
}

/**
 * Verify that a buffer's magic bytes match the claimed MIME type.
 *
 * @param buffer - The file content (at least the first 512 bytes; full buffer is fine)
 * @param claimedMime - The MIME type claimed by the client (Content-Type header or file.type)
 * @param _claimedExtension - The file extension (e.g. '.jpg', 'pdf') — reserved for future use
 * @returns null if the file is safe, or an error message string if verification fails
 */
export function verifyFileContent(
  buffer: Buffer,
  claimedMime: string,
  __claimedExtension: string
): string | null {
  const detected = detectMimeType(buffer);

  if (!detected) {
    return 'File content type could not be verified (unknown magic bytes)';
  }

  // Map the detected type to the family of allowed claimed types.
  // OOXML files (.docx, .xlsx, .pptx) are ZIP-based, so a detected
  // application/zip covers them. The caller's extension + claimed MIME
  // must still be in the allowlist.
  const normalizedDetected = detected;
  const normalizedClaimed = claimedMime.toLowerCase().split(';')[0].trim();

  // Direct match
  if (normalizedDetected === normalizedClaimed) return null;

  // ZIP family: detected application/zip covers claimed OOXML types
  if (
    normalizedDetected === 'application/zip' &&
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
     'application/zip',
     'application/x-zip-compressed'].includes(normalizedClaimed)
  ) {
    return null;
  }

  // OLE Compound Document family: detected application/x-cfb covers legacy Office
  if (
    normalizedDetected === 'application/x-cfb' &&
    ['application/msword',
     'application/vnd.ms-excel',
     'application/vnd.ms-powerpoint'].includes(normalizedClaimed)
  ) {
    return null;
  }

  // TIFF has two byte-order variants — both map to image/tiff
  if (normalizedDetected === 'image/tiff' && normalizedClaimed === 'image/tiff') return null;

  // Mismatch: the file's content doesn't match its claimed type
  return `File content (${normalizedDetected}) does not match claimed type (${normalizedClaimed}). Possible file type spoofing.`;
}
