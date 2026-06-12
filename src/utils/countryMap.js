export const COUNTRY_MAP = {
  ar: { name: 'Argentina', flag: '🇦🇷' },
  at: { name: 'Austria', flag: '🇦🇹' },
  au: { name: 'Australia', flag: '🇦🇺' },
  bd: { name: 'Bangladesh', flag: '🇧🇩' },
  be: { name: 'Belgium', flag: '🇧🇪' },
  bh: { name: 'Bahrain', flag: '🇧🇭' },
  bo: { name: 'Bolivia', flag: '🇧🇴' },
  br: { name: 'Brazil', flag: '🇧🇷' },
  by: { name: 'Belarus', flag: '🇧🇾' },
  ca: { name: 'Canada', flag: '🇨🇦' },
  cl: { name: 'Chile', flag: '🇨🇱' },
  cn: { name: 'China', flag: '🇨🇳' },
  cz: { name: 'Czechia', flag: '🇨🇿' },
  de: { name: 'Germany', flag: '🇩🇪' },
  do: { name: 'Dominican Rep.', flag: '🇩🇴' },
  es: { name: 'Spain', flag: '🇪🇸' },
  fr: { name: 'France', flag: '🇫🇷' },
  gb: { name: 'United Kingdom', flag: '🇬🇧' },
  gr: { name: 'Greece', flag: '🇬🇷' },
  gt: { name: 'Guatemala', flag: '🇬🇹' },
  hn: { name: 'Honduras', flag: '🇭🇳' },
  hu: { name: 'Hungary', flag: '🇭🇺' },
  id: { name: 'Indonesia', flag: '🇮🇩' },
  ie: { name: 'Ireland', flag: '🇮🇪' },
  in: { name: 'India', flag: '🇮🇳' },
  ir: { name: 'Iran', flag: '🇮🇷' },
  it: { name: 'Italy', flag: '🇮🇹' },
  jo: { name: 'Jordan', flag: '🇯🇴' },
  kh: { name: 'Cambodia', flag: '🇰🇭' },
  kr: { name: 'South Korea', flag: '🇰🇷' },
  kw: { name: 'Kuwait', flag: '🇰🇼' },
  kz: { name: 'Kazakhstan', flag: '🇰🇿' },
  lk: { name: 'Sri Lanka', flag: '🇱🇰' },
  ma: { name: 'Morocco', flag: '🇲🇦' },
  mk: { name: 'North Macedonia', flag: '🇲🇰' },
  mn: { name: 'Mongolia', flag: '🇲🇳' },
  mx: { name: 'Mexico', flag: '🇲🇽' },
  nl: { name: 'Netherlands', flag: '🇳🇱' },
  np: { name: 'Nepal', flag: '🇳🇵' },
  om: { name: 'Oman', flag: '🇴🇲' },
  pe: { name: 'Peru', flag: '🇵🇪' },
  ph: { name: 'Philippines', flag: '🇵🇭' },
  pl: { name: 'Poland', flag: '🇵🇱' },
  pt: { name: 'Portugal', flag: '🇵🇹' },
  py: { name: 'Paraguay', flag: '🇵🇾' },
  qa: { name: 'Qatar', flag: '🇶🇦' },
  ro: { name: 'Romania', flag: '🇷🇴' },
  ru: { name: 'Russia', flag: '🇷🇺' },
  sa: { name: 'Saudi Arabia', flag: '🇸🇦' },
  se: { name: 'Sweden', flag: '🇸🇪' },
  sm: { name: 'San Marino', flag: '🇸🇲' },
  tm: { name: 'Turkmenistan', flag: '🇹🇲' },
  tr: { name: 'Turkey', flag: '🇹🇷' },
  ua: { name: 'Ukraine', flag: '🇺🇦' },
  uk: { name: 'United Kingdom', flag: '🇬🇧' },
  us: { name: 'United States', flag: '🇺🇸' },
  uy: { name: 'Uruguay', flag: '🇺🇾' },
  ve: { name: 'Venezuela', flag: '🇻🇪' },
  vn: { name: 'Vietnam', flag: '🇻🇳' },
  za: { name: 'South Africa', flag: '🇿🇦' }
};

export const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🏳️';
  }
};

export const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  return COUNTRY_MAP[countryCode.toLowerCase()]?.name || countryCode.toUpperCase();
};
