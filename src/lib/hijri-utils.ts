/**
 * Hijri (Islamic) Calendar Utilities
 * Uses native Intl.DateTimeFormat with Umm al-Qura calendar (ar-SA-u-ca-islamic-umalqura)
 * with a mathematical fallback (Tabular Islamic Calendar) if the system ICU falls back to Gregorian.
 */

export interface HijriDateParts {
  day: number;
  month: number;
  year: number;
  monthName: string;
  monthNameEn: string;
}

export function getTabularHijri(date: Date | string): HijriDateParts {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const time = dateObj.getTime();
  const jd = (time / 86400000) + 2440587.5;
  const epoch = 1948439.5;
  const diff = jd - epoch;
  
  const cycle = Math.floor(diff / 10631);
  let rem = diff % 10631;
  
  let hijriYear = cycle * 30 + 1;
  
  const yearDays = [
    354, 355, 354, 354, 355, 354, 354, 355, 354, 354,
    355, 354, 354, 355, 354, 354, 355, 354, 354, 355,
    354, 354, 355, 354, 354, 355, 354, 354, 355, 354
  ];
  
  for (let i = 0; i < 30; i++) {
    const daysInYear = yearDays[i];
    if (rem < daysInYear) {
      break;
    }
    rem -= daysInYear;
    hijriYear++;
  }
  
  const monthDays = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
  let hijriMonth = 1;
  for (let i = 0; i < 12; i++) {
    const daysInMonth = monthDays[i];
    if (rem < daysInMonth) {
      break;
    }
    rem -= daysInMonth;
    hijriMonth++;
  }
  
  const hijriDay = Math.floor(rem) + 1;
  
  const arMonths = [
    "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
    "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
  ];
  const enMonths = [
    "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Awwal", "Jumada al-Thani",
    "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qada", "Dhu al-Hijjah"
  ];
  
  return {
    day: hijriDay,
    month: hijriMonth,
    year: hijriYear,
    monthName: arMonths[hijriMonth - 1] || "",
    monthNameEn: enMonths[hijriMonth - 1] || ""
  };
}

export function isIntlHijriFallback(dateObj: Date): boolean {
  try {
    const formatted = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { year: 'numeric' }).format(dateObj);
    const yearNum = parseInt(formatted.replace(/[^0-9]/g, ''), 10);
    return yearNum === dateObj.getFullYear();
  } catch {
    return true;
  }
}

export function formatToHijri(date: Date | string, options: Intl.DateTimeFormatOptions & { locale?: string } = {}): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if ICU failed and fell back to Gregorian year
    if (isIntlHijriFallback(dateObj)) {
      const parts = getTabularHijri(dateObj);
      const isArabic = !options.locale || options.locale.startsWith('ar');
      const monthLabel = isArabic ? parts.monthName : parts.monthNameEn;
      
      // Format number to Arabic numerals if Arabic
      const formattedNum = (num: number) => {
        if (!isArabic) return String(num);
        return String(num).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
      };
      
      return `${formattedNum(parts.day)} ${monthLabel} ${formattedNum(parts.year)}`;
    }
    
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

  // Gregorian format based on selected language (forcing Gregory calendar type)
  const gregLocale = language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB';
  const gregorian = new Intl.DateTimeFormat(gregLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dateObj);

  // Hijri format
  const hijri = formatToHijri(dateObj, { day: 'numeric', month: 'short', year: 'numeric', locale: language === 'ar' ? 'ar' : 'en' });

  // In Arabic UI, Hijri comes first or alongside
  if (language === 'ar') {
    return `${gregorian} (${hijri} هـ)`;
  }
  
  return `${gregorian} (AH ${hijri})`;
}
