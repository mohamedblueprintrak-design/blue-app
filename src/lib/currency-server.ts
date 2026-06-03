import { cacheGetOrSet } from './cache/redis';
import { log } from './logger';
import { DEFAULT_EXCHANGE_RATES } from './currency';
import { db } from './db';

const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/AED';

export async function getLiveExchangeRates(): Promise<Record<string, number>> {
  return cacheGetOrSet(
    'live_exchange_rates',
    async () => {
      try {
        const response = await fetch(EXCHANGE_API_URL, { next: { revalidate: 43200 } }); // 12 hours
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        
        const data = await response.json();
        if (data && data.rates && data.base === 'AED') {
          log.info('[Currency] Live exchange rates updated from API');
          
          // Save to database as a reliable fallback
          try {
            await db.companySettings.updateMany({
              data: { exchangeRates: JSON.stringify(data.rates) }
            });
          } catch (dbErr) {
            log.error('[Currency] Failed to cache rates in DB', dbErr);
          }

          return data.rates as Record<string, number>;
        }
        throw new Error('Invalid data format from exchange API');
      } catch (error) {
        log.error('[Currency] Failed to fetch live exchange rates, falling back to DB', error);
        
        // Try fallback to DB
        try {
          const settings = await db.companySettings.findFirst({
            where: { exchangeRates: { not: null } },
            select: { exchangeRates: true }
          });
          
          if (settings?.exchangeRates) {
            const dbRates = JSON.parse(settings.exchangeRates);
            if (Object.keys(dbRates).length > 0) {
               log.info('[Currency] Using DB fallback for exchange rates');
               return dbRates as Record<string, number>;
            }
          }
        } catch (dbFallbackErr) {
          log.error('[Currency] Failed to read fallback from DB', dbFallbackErr);
        }

        log.info('[Currency] Using hardcoded DEFAULT_EXCHANGE_RATES');
        return DEFAULT_EXCHANGE_RATES;
      }
    },
    43200 // Cache for 12 hours
  );
}

export async function getCompanyCurrency(organizationId?: string | null): Promise<string> {
  try {
    const settings = await db.companySettings.findFirst({
      where: organizationId ? { organizationId } : {},
      select: { currency: true },
    });
    return settings?.currency || 'AED';
  } catch {
    return 'AED';
  }
}
