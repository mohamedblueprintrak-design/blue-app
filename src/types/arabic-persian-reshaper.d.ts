/**
 * Type declarations for arabic-persian-reshaper.
 * This package does not ship its own type declarations.
 */

declare module 'arabic-persian-reshaper' {
  export class ArabicShaper {
    static convertArabic(text: string): string;
  }

  const reshaper: { ArabicShaper: typeof ArabicShaper };
  export default reshaper;
}
