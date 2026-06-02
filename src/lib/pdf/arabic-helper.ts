// @ts-ignore
import reshaper from 'arabic-persian-reshaper';

const { ArabicShaper } = reshaper;

/**
 * Checks if a string contains Arabic characters.
 */
export function hasArabic(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
}

/**
 * Shapes Arabic text and handles RTL sequencing for environments that render left-to-right (like jsPDF).
 */
export function preprocessArabicText(text: string): string {
  if (!text || !hasArabic(text)) {
    return text;
  }

  // 1. Reshape the Arabic characters to their presentation forms (initial, medial, final, isolated)
  const reshaped = ArabicShaper.convertArabic(text);

  // 2. Reverse the reshaped Arabic characters to display RTL in LTR-only renderers.
  // We need to keep non-Arabic blocks (numbers, English words) in their original direction.
  // Let's use a regex that identifies blocks of Arabic vs blocks of LTR.
  const blocks: { isArabic: boolean; text: string }[] = [];
  const regex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)|([^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;
  
  let match;
  while ((match = regex.exec(reshaped)) !== null) {
    if (match[1]) {
      blocks.push({ isArabic: true, text: match[1] });
    } else if (match[2]) {
      blocks.push({ isArabic: false, text: match[2] });
    }
  }

  // Reverse Arabic blocks characters individually, and reverse the sequence of blocks overall
  const processedBlocks = blocks.map(block => {
    if (block.isArabic) {
      // Reverse Arabic character sequence
      return block.text.split('').reverse().join('');
    }
    return block.text;
  });

  // Reverse the block sequence so it flows Right-to-Left overall
  return processedBlocks.reverse().join('');
}

let cairoFontBase64Cache: string | null = null;

export async function loadArabicFont(doc: any): Promise<void> {
  try {
    const fontName = 'Cairo-Regular.ttf';
    
    if (!cairoFontBase64Cache) {
      if (typeof window === 'undefined') {
        // Server-side (Node.js): Read local file directly from public directory
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', 'fonts', 'Cairo-Regular.ttf');
        const buffer = fs.readFileSync(filePath);
        cairoFontBase64Cache = buffer.toString('base64');
      } else {
        // Client-side (Browser): Fetch local font from public directory path
        const response = await fetch('/fonts/Cairo-Regular.ttf');
        if (!response.ok) {
          throw new Error('Failed to fetch local Arabic font file');
        }
        const buffer = await response.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        cairoFontBase64Cache = btoa(binary);
      }
    }

    // Add font to virtual file system and register it
    doc.addFileToVFS(fontName, cairoFontBase64Cache);
    doc.addFont(fontName, 'Cairo', 'normal');
    doc.setFont('Cairo');
  } catch (error) {
    console.error('Failed to load Cairo font for PDF generation:', error);
    // Fallback to standard helvetica if load fails
    doc.setFont('helvetica');
  }
}


/**
 * Setup Arabic support on a jsPDF instance by loading the Cairo font
 * and overriding doc.text to automatically handle Arabic shaping and RTL.
 */
export async function setupArabicPdf(doc: any): Promise<void> {
  await loadArabicFont(doc);
  
  const originalSetFont = doc.setFont;
  doc.setFont = function (fontName: string, fontStyle?: string) {
    if (fontName && fontName.toLowerCase() === 'helvetica') {
      return originalSetFont.call(this, 'Cairo', fontStyle);
    }
    return originalSetFont.call(this, fontName, fontStyle);
  };
  
  // Set default font to Cairo
  doc.setFont('Cairo');
  
  const originalText = doc.text;
  doc.text = function (text: any, x: number, y: number, options?: any) {
    if (typeof text === 'string') {
      text = preprocessArabicText(text);
    } else if (Array.isArray(text)) {
      text = text.map(t => typeof t === 'string' ? preprocessArabicText(t) : t);
    }
    return originalText.call(this, text, x, y, options);
  };
}


