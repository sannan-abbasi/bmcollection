import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  INTERNATIONAL PRICING
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Prices are stored and charged in PKR. This module only changes what an
 * overseas visitor SEES — every order is still recorded in rupees.
 *
 * A straight conversion reads wrong abroad: Rs 1,799 is about £4.78, which
 * looks like costume junk rather than jewellery. INTERNATIONAL_MARKUP lifts the
 * displayed figure to something credible and covers overseas handling.
 *
 * 2.5 means an overseas shopper sees roughly 2.5x the converted rupee price
 * (Rs 1,799 becomes about £11.99). Change this one number to tune it.
 */
export const INTERNATIONAL_MARKUP = 2.5;

/** Rupees are shown untouched to visitors in Pakistan. */
export const HOME_COUNTRY = 'PK';
export const HOME_CURRENCY = 'PKR';

const GEO_URL = 'https://ipinfo.io/json';
const GEO_FALLBACK = 'https://ipwho.is/';
const RATES_URL = 'https://open.er-api.com/v6/latest/PKR';
const RATES_FALLBACK =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/pkr.json';

const GEO_KEY = 'bm-geo';
const RATES_KEY = 'bm-rates';
const CHOICE_KEY = 'bm-currency';
const GEO_TTL = 7 * 24 * 60 * 60 * 1000; // a shopper's country rarely changes
const RATES_TTL = 24 * 60 * 60 * 1000; // rates publish once a day

/** Country to currency for the markets this shop realistically reaches. */
const COUNTRY_CURRENCY: Record<string, string> = {
  PK: 'PKR', GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  IN: 'INR', BD: 'BDT', LK: 'LKR', MY: 'MYR', SG: 'SGD', CN: 'CNY',
  JP: 'JPY', KR: 'KRW', TR: 'TRY', ZA: 'ZAR', CH: 'CHF', SE: 'SEK',
  NO: 'NOK', DK: 'DKK', PL: 'PLN', BR: 'BRL', MX: 'MXN',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', PT: 'EUR', GR: 'EUR', FI: 'EUR',
};

/** Currencies with no minor unit — never show .99 on these. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'PKR', 'IDR', 'VND', 'CLP', 'ISK']);

/** What the shopper can pick from by hand. */
export const SELECTABLE = ['PKR', 'GBP', 'USD', 'EUR', 'AED', 'SAR', 'CAD', 'AUD'];

interface Cached<T> {
  at: number;
  value: T;
}

function readCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    if (!parsed || Date.now() - parsed.at > ttl) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // storage full or blocked — we simply refetch next time
  }
}

async function fetchRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(RATES_URL);
    const json = await res.json();
    if (json && json.result === 'success' && json.rates) {
      return json.rates as Record<string, number>;
    }
  } catch {
    // fall through to the mirror
  }
  try {
    const res = await fetch(RATES_FALLBACK);
    const json = await res.json();
    if (json && json.pkr) {
      // that mirror returns lower-case currency keys
      return Object.fromEntries(
        Object.entries(json.pkr as Record<string, number>).map(([k, v]) => [k.toUpperCase(), v])
      );
    }
  } catch {
    // offline or blocked — we stay in rupees, which is always correct
  }
  return null;
}

/** ipinfo returns `country`, ipwho returns `country_code` — both are ISO-2. */
function readCountryCode(json: unknown): string | null {
  const obj = json as Record<string, unknown> | null;
  const raw = (obj?.country ?? obj?.country_code) as unknown;
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * ipinfo is the primary lookup. Its keyless tier is rate limited, so ipwho.is
 * stands in if it ever refuses — and if both fail we stay in rupees rather than
 * guess at a shopper's currency.
 */
async function fetchCountry(): Promise<string | null> {
  for (const url of [GEO_URL, GEO_FALLBACK]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const code = readCountryCode(await res.json());
      if (code) return code;
    } catch {
      // try the next one
    }
  }
  return null;
}

/**
 * Turn a converted amount into a believable shelf price: apply the markup, then
 * round up so it ends in .99 — or to a whole unit for currencies without one.
 */
function shelfPrice(converted: number, code: string): number {
  const marked = converted * INTERNATIONAL_MARKUP;
  if (ZERO_DECIMAL.has(code)) {
    const step = marked >= 1000 ? 100 : 10;
    return Math.max(step, Math.ceil(marked / step) * step);
  }
  if (marked < 1) return Math.ceil(marked * 100) / 100;
  return Math.ceil(marked) - 0.01;
}

export function formatPkrAmount(pkr: number): string {
  return 'Rs ' + Math.round(Number(pkr) || 0).toLocaleString('en-PK');
}

interface CurrencyValue {
  /** The currency actually being displayed. */
  code: string;
  /** True when the shopper is seeing something other than rupees. */
  isInternational: boolean;
  /** Detected country, or null while detection is still in flight. */
  country: string | null;
  /** Format a PKR amount in the display currency. */
  format: (pkr: number) => string;
  /**
   * The rupee amount actually charged. Overseas orders are billed the marked-up
   * figure, so the recorded total agrees with the price the shopper was shown.
   */
  billedPkr: (pkr: number) => number;
  /** Always format as rupees, whatever the display currency is. */
  formatPkr: (pkr: number) => string;
  /** Let the shopper choose. Pass null to go back to automatic. */
  setCode: (code: string | null) => void;
}

const CurrencyContext = createContext<CurrencyValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<string | null>(() => readCache<string>(GEO_KEY, GEO_TTL));
  const [rates, setRates] = useState<Record<string, number> | null>(() =>
    readCache<Record<string, number>>(RATES_KEY, RATES_TTL)
  );
  const [chosen, setChosen] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CHOICE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (country) return;
    let cancelled = false;
    fetchCountry().then((c) => {
      if (cancelled || !c) return;
      writeCache(GEO_KEY, c);
      setCountry(c);
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  // Only fetch rates once we know the shopper is not in Pakistan.
  const wantsConversion =
    (chosen && chosen !== HOME_CURRENCY) ||
    (!chosen && country !== null && country !== HOME_COUNTRY);

  useEffect(() => {
    if (!wantsConversion || rates) return;
    let cancelled = false;
    fetchRates().then((r) => {
      if (cancelled || !r) return;
      writeCache(RATES_KEY, r);
      setRates(r);
    });
    return () => {
      cancelled = true;
    };
  }, [wantsConversion, rates]);

  const setCode = useCallback((code: string | null) => {
    try {
      if (code) localStorage.setItem(CHOICE_KEY, code);
      else localStorage.removeItem(CHOICE_KEY);
    } catch {
      // ignore
    }
    setChosen(code);
  }, []);

  const value = useMemo<CurrencyValue>(() => {
    const auto = country ? COUNTRY_CURRENCY[country] ?? 'USD' : HOME_CURRENCY;
    const wanted = chosen ?? auto;
    const rate = wanted === HOME_CURRENCY ? null : rates?.[wanted] ?? null;
    // With no rate we stay in rupees — never guess at a price.
    const code = rate ? wanted : HOME_CURRENCY;

    const format = (pkr: number) => {
      const amount = Number(pkr) || 0;
      if (!rate || code === HOME_CURRENCY) return formatPkrAmount(amount);
      const shown = shelfPrice(amount * rate, code);
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: code,
          maximumFractionDigits: ZERO_DECIMAL.has(code) ? 0 : 2,
        }).format(shown);
      } catch {
        return code + ' ' + shown.toFixed(ZERO_DECIMAL.has(code) ? 0 : 2);
      }
    };

    const international = code !== HOME_CURRENCY;

    return {
      code,
      isInternational: international,
      country,
      format,
      billedPkr: (pkr: number) =>
        international ? Math.round((Number(pkr) || 0) * INTERNATIONAL_MARKUP) : Number(pkr) || 0,
      formatPkr: formatPkrAmount,
      setCode,
    };
  }, [country, chosen, rates, setCode]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
