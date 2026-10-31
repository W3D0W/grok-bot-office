const DOW = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function denverParts(ms) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const map = {};
  for (const part of fmt.formatToParts(new Date(ms))) map[part.type] = part.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const weekday = DAY_NAMES.indexOf(map.weekday);
  return {
    ms,
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday,
    key: `${map.year}-${map.month}-${map.day}`,
    minutes: hour * 60 + Number(map.minute),
  };
}

export function formatDenver(parts) {
  let h = parts.hour % 12;
  if (h === 0) h = 12;
  const ap = parts.hour >= 12 ? 'PM' : 'AM';
  const mm = String(parts.minute).padStart(2, '0');
  return `${DAY_NAMES[parts.weekday]} ${h}:${mm} ${ap} MT`;
}

export function isQuiet(parts, quiet = { start: '21:00', end: '05:00' }) {
  const toM = (value) => {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  const t = parts.minutes;
  const start = toM(quiet.start);
  const end = toM(quiet.end);
  if (start === end) return false;
  if (start < end) return t >= start && t < end;
  return t >= start || t < end;
}

function parseClock(text) {
  const ampm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || 0);
    const ap = ampm[3].toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }
  const h24 = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (h24) return Number(h24[1]) * 60 + Number(h24[2]);
  return null;
}

/**
 * Parse a bots.json schedule or an activity.json `at` string.
 * Weekly routines with no clock time are stamped later so they don't collide.
 */
export function parseWhen(text, fallbackMinutes = null) {
  const raw = String(text || '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const at = Date.parse(raw);
    return { type: 'instant', at: Number.isNaN(at) ? null : at, label: raw };
  }
  const monthly = /monthly|\b1st\b/i.test(raw);
  const weekdays = new Set();
  if (/weekdays/i.test(raw)) [1, 2, 3, 4, 5].forEach((d) => weekdays.add(d));
  if (/weekends/i.test(raw)) [0, 6].forEach((d) => weekdays.add(d));
  const dayRe = /\b(sun|mon|tue|wed|thu|fri|sat)(?:day)?\b/gi;
  let match;
  while ((match = dayRe.exec(raw))) {
    const token = match[1].slice(0, 3).toLowerCase();
    if (!/weekdays|weekends/i.test(match[0])) weekdays.add(DOW[token]);
  }
  if (/\bweekly\b/i.test(raw) && weekdays.size === 0) weekdays.add(1);
  const minutes = parseClock(raw);
  return {
    type: 'clock',
    minutes: minutes == null ? fallbackMinutes : minutes,
    weekdays: weekdays.size ? weekdays : null,
    monthly,
    weekly: /\bweekly\b/i.test(raw),
    label: raw,
  };
}

export function stampWeekly(routines) {
  const weekly = routines.filter((r) => r.when?.weekly && r.when.minutes == null);
  weekly.sort((a, b) => a.bot.localeCompare(b.bot) || a.name.localeCompare(b.name));
  weekly.forEach((routine, index) => {
    routine.when.minutes = 11 * 60 + index * 30;
    routine.when.weekdays = new Set([1]);
  });
}

function dayMatches(parts, spec) {
  if (!parts) return false;
  if (spec.monthly && parts.day !== 1) return false;
  if (spec.weekdays && !spec.weekdays.has(parts.weekday)) return false;
  return true;
}

/** True when sim time crosses a scheduled minute between two Denver snapshots. */
export function crossed(spec, prev, now) {
  if (!spec || !prev || !now || now.ms < prev.ms) return false;
  if (spec.type === 'instant') return spec.at != null && prev.ms < spec.at && now.ms >= spec.at;
  if (spec.minutes == null) return false;
  if (prev.key === now.key) {
    return prev.minutes < spec.minutes && now.minutes >= spec.minutes && dayMatches(now, spec);
  }
  if (dayMatches(prev, spec) && spec.minutes > prev.minutes) return true;
  if (dayMatches(now, spec) && spec.minutes <= now.minutes) return true;
  return false;
}

export const DEMO_START_MS = Date.parse('2026-06-01T12:20:00Z');
