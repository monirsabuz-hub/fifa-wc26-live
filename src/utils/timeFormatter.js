const STADIUM_OFFSETS = {
  '1': -6, // Estadio Azteca (Mexico City, Mexico) - Central Time (no DST, UTC-6)
  '2': -6, // Estadio Akron (Guadalajara, Mexico) - Central Time (no DST, UTC-6)
  '3': -6, // Estadio BBVA (Monterrey, Mexico) - Central Time (no DST, UTC-6)
  '4': -5, // AT&T Stadium (Dallas, USA) - Central Time (CDT in June = UTC-5)
  '5': -5, // NRG Stadium (Houston, USA) - Central Time (CDT in June = UTC-5)
  '6': -5, // GEHA Field at Arrowhead Stadium (Kansas City, USA) - Central Time (CDT in June = UTC-5)
  '7': -4, // Mercedes-Benz Stadium (Atlanta, USA) - Eastern Time (EDT in June = UTC-4)
  '8': -4, // Hard Rock Stadium (Miami, USA) - Eastern Time (EDT in June = UTC-4)
  '9': -4, // Gillette Stadium (Boston, USA) - Eastern Time (EDT in June = UTC-4)
  '10': -4, // Lincoln Financial Field (Philadelphia, USA) - Eastern Time (EDT in June = UTC-4)
  '11': -4, // MetLife Stadium (New York/New Jersey, USA) - Eastern Time (EDT in June = UTC-4)
  '12': -4, // BMO Field (Toronto, Canada) - Eastern Time (EDT in June = UTC-4)
  '13': -7, // BC Place (Vancouver, Canada) - Pacific Time (PDT in June = UTC-7)
  '14': -7, // Lumen Field (Seattle, USA) - Pacific Time (PDT in June = UTC-7)
  '15': -7, // Levi's Stadium (San Francisco, USA) - Pacific Time (PDT in June = UTC-7)
  '16': -7, // SoFi Stadium (Los Angeles, USA) - Pacific Time (PDT in June = UTC-7)
};

/**
 * Parses match venue local date-time string and offset to get UTC Date object.
 * @param {string} localDateStr - Format "MM/DD/YYYY HH:MM"
 * @param {string} stadiumId
 * @returns {Date|null}
 */
export function parseVenueTimeToDate(localDateStr, stadiumId) {
  if (!localDateStr) return null;
  const parts = localDateStr.split(' ');
  if (parts.length < 2) return null;
  const [datePart, timePart] = parts;
  const [month, day, year] = datePart.split('/').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  if (isNaN(month) || isNaN(day) || isNaN(year) || isNaN(hours) || isNaN(minutes)) {
    return null;
  }
  
  // Default to -5 (approx Eastern/Central midpoint) if stadiumId not mapped
  const offset = STADIUM_OFFSETS[stadiumId] !== undefined ? STADIUM_OFFSETS[stadiumId] : -5;
  
  // Since Local Time = UTC + Offset, UTC = Local Time - Offset.
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours - offset, minutes));
  return utcDate;
}

/**
 * Formats a venue match time into the user's local timezone in 12-hour format.
 * @param {string} localDateStr - Format "MM/DD/YYYY HH:MM"
 * @param {string} stadiumId
 * @returns {object} { time, date, dateTime }
 */
export function formatToUserLocal(localDateStr, stadiumId) {
  const date = parseVenueTimeToDate(localDateStr, stadiumId);
  if (!date) return { time: localDateStr || '', date: '', dateTime: localDateStr || '' };

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const dateTimeStr = `${dateStr}, ${timeStr}`;

  return {
    time: timeStr,
    date: dateStr,
    dateTime: dateTimeStr,
    jsDate: date
  };
}

/**
 * Helper to convert any 24h format in a string (like "Today, 20:00") into 12h (like "Today, 8:00 PM")
 * @param {string} timeStr 
 * @returns {string}
 */
export function format24hTo12h(timeStr) {
  if (!timeStr) return '';
  const regex = /\b(\d{1,2}):(\d{2})\b/;
  const match = timeStr.match(regex);
  if (!match) return timeStr;

  const hours = parseInt(match[1], 10);
  const minutes = match[2];
  
  if (hours >= 0 && hours <= 23 && parseInt(minutes, 10) >= 0 && parseInt(minutes, 10) <= 59) {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const formattedTime = `${displayHours}:${minutes} ${ampm}`;
    return timeStr.replace(regex, formattedTime);
  }
  
  return timeStr;
}

/**
 * Helper to convert EPG ranges (like "09:30 - 12:00") to 12h format.
 * @param {string} rangeStr 
 * @returns {string}
 */
export function formatEPGTimeRange(rangeStr) {
  if (!rangeStr) return '';
  return rangeStr.split(' - ').map(t => format24hTo12h(t.trim())).join(' - ');
}
