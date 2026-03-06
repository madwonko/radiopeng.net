const { DateTime } = require("luxon");
const showsData = require("./shows.json");
const djsData = require("./djs.json");

const DEFAULT_TZ = "America/New_York";
const DAY_TO_NUM = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function normalizeSchedule(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.shows)) return raw.shows;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && Array.isArray(raw.schedule)) return raw.schedule;
  return [];
}

function getTimezone(raw) {
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

  const showItems = Array.isArray(showsData?.items) ? showsData.items : [];
  const djItems = Array.isArray(djsData?.items) ? djsData.items : [];

  const showBySlug = Object.fromEntries(showItems.map((s) => [s.slug, s]));
  const djBySlug = Object.fromEntries(djItems.map((d) => [d.slug, d]));

  const now = DateTime.now().setZone(TZ);
  const occurrences = [];

  for (const item of schedule) {
    if (!item) continue;

    const daysRaw = item.days ?? item.day;
    const days = Array.isArray(daysRaw) ? daysRaw : (daysRaw ? [daysRaw] : []);

    const showObj = item.showSlug ? showBySlug[item.showSlug] : null;
    const djObj = showObj?.djSlug ? djBySlug[showObj.djSlug] : null;

    const showName = item.show || item.name || showObj?.title || item.showSlug || "Untitled Show";
    const djName = item.dj || item.host || djObj?.name || "—";

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
        show: showName,
        dj: djName,
        day: String(d),
        startISO: startDT.toISO(),
        endISO: endDT.toISO(),
        timezone: TZ,
      });
    }
  }

  occurrences.sort((a, b) => a.startISO.localeCompare(b.startISO));
  return occurrences.slice(0, 5);
};
