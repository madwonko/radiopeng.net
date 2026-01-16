const { DateTime } = require("luxon");

const DEFAULT_TZ = "America/New_York";
const DAY_TO_NUM = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function normalizeSchedule(raw) {
  // Accept:
  // 1) [ ... ]  (array of shows)
  // 2) { shows: [ ... ] }
  // 3) { items: [ ... ] }
  // 4) { schedule: [ ... ] }
  // Anything else => []
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.shows)) return raw.shows;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && Array.isArray(raw.schedule)) return raw.schedule;
  return [];
}

function getTimezone(raw) {
  // Optional: let schedule.json define timezone
  if (raw && typeof raw.timezone === "string" && raw.timezone.trim()) return raw.timezone.trim();
  return DEFAULT_TZ;
}

function nextOccurrence(now, weekdayNum, hhmm) {
  const [hh, mm] = String(hhmm).split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  let dt = now.set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
  const deltaDays = (weekdayNum - dt.weekday + 7) % 7;
  dt = dt.plus({ days: deltaDays });
  if (dt <= now) dt = dt.plus({ days: 7 });
  return dt;
}

module.exports = () => {
  const raw = require("./schedule.json");
  const TZ = getTimezone(raw);
  const schedule = normalizeSchedule(raw);

  const now = DateTime.now().setZone(TZ);
  const occurrences = [];

  for (const item of schedule) {
    if (!item) continue;

    const daysRaw = item.days ?? item.day;
    const days = Array.isArray(daysRaw) ? daysRaw : (daysRaw ? [daysRaw] : []);

    for (const d of days) {
      const weekdayNum = DAY_TO_NUM[String(d)];
      if (!weekdayNum) continue;

      const startDT = nextOccurrence(now, weekdayNum, item.start);
      if (!startDT) continue;

      const [eh, em] = String(item.end || "").split(":").map(Number);
      let endDT = startDT;
      if (Number.isFinite(eh) && Number.isFinite(em)) {
        endDT = startDT.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
        if (endDT <= startDT) endDT = endDT.plus({ days: 1 });
      }

      occurrences.push({
        show: item.show || item.name || "Untitled Show",
        dj: item.dj || item.host || "—",
        day: String(d),
        startISO: startDT.toISO(),
        endISO: endDT.toISO(),
        timezone: TZ
      });
    }
  }

  occurrences.sort((a, b) => a.startISO.localeCompare(b.startISO));

  return occurrences.slice(0, 5);
};
