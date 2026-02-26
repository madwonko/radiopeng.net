const fs = require("fs");
const path = require("path");

module.exports = () => {
  const schedulePath = path.join(__dirname, "schedule.json");
  const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf-8"));

  const now = new Date();
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const items = Array.isArray(schedule.items) ? schedule.items : [];

  const upcoming = items
    .map(item => {
      if (!item?.day || !item?.start) return null;

      const showDay = days.indexOf(item.day);
      if (showDay === -1) return null;

      const next = new Date(now);
      const diff = (showDay - now.getDay() + 7) % 7;
      next.setDate(now.getDate() + diff);

      const [h, m] = String(item.start).split(":");
      next.setHours(Number(h), Number(m), 0, 0);

      if (next <= now) next.setDate(next.getDate() + 7);

      return { ...item, nextISO: next.toISOString() };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.nextISO) - new Date(b.nextISO));

  return upcoming[0] || null;
};
