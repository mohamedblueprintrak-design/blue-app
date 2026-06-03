/**
 * Hijri (Islamic) Calendar Utilities
 * Uses native Intl.DateTimeFormat with Umm al-Qura calendar (ar-SA-u-ca-islamic-umalqura)
 */

export function formatToHijri(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Default format options
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };

    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      ...defaultOptions,
      ...options,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting Hijri date:', error);
    return '';
  }
}

export function formatDualDate(date: Date | string, language: 'ar' | 'en' = 'ar'): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Gregorian format based on selected language
  const gregLocale = language === 'ar' ? 'ar-SA' : 'en-GB';
  const gregorian = new Intl.DateTimeFormat(gregLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dateObj);

  // Hijri format
  const hijri = formatToHijri(dateObj, { day: 'numeric', month: 'short', year: 'numeric' });

  // In Arabic UI, Hijri comes first or alongside
  if (language === 'ar') {
    return `${gregorian} (${hijri} هـ)`;
  }
  
  return `${gregorian} (AH ${hijri})`;
}
