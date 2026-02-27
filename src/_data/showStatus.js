const schedule = require("./schedule.json");

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (h === 24) h = 0;
  return h * 60 + min;
}

module.exports = () => {
  const tz = schedule?.timezone || "America/New_York";
  const items = Array.isArray(schedule?.items) ? schedule.items : [];

  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const day = DAY_SHORT[local.getDay()];
  const mins = local.getHours() * 60 + local.getMinutes();

  const map = {};

  for (const row of items) {
    const slug = row?.showSlug;
    if (!slug) continue;

    const start = toMinutes(row.start);
    const end = toMinutes(row.end);

    let onAir = false;
    if (row.days === day && start != null && end != null) {
      if (end >= start) {
        onAir = mins >= start && mins < end;
      } else {
        onAir = mins >= start || mins < end;
      }
    }

    if (!map[slug]) {
      map[slug] = {
        onAir,
        label: onAir ? "On Air" : "Off Air",
      };
    } else if (onAir) {
      map[slug] = {
        onAir: true,
        label: "On Air",
      };
    }
  }

  return map;
};
