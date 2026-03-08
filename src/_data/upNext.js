const schedule = require('./schedule.json');
const showsData = require('./shows.json');
const djsData = require('./djs.json');

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function nextFor(dayIdx, start) {
  const now = new Date();
  const next = new Date(now);

  const [h, m] = String(start || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

  const diff = (dayIdx - now.getDay() + 7) % 7;
  next.setDate(now.getDate() + diff);
  next.setHours(h, m, 0, 0);

  if (next <= now) next.setDate(next.getDate() + 7);
  return next;
}

module.exports = () => {
  const items = Array.isArray(schedule?.items) ? schedule.items : [];
  const showItems = Array.isArray(showsData?.items) ? showsData.items : [];
  const djItems = Array.isArray(djsData?.items) ? djsData.items : [];
  const showBySlug = Object.fromEntries(showItems.map((s) => [s.slug, s]));
  const djBySlug = Object.fromEntries(djItems.map((d) => [d.slug, d]));

  const upcoming = items
    .map((item) => {
      const dayVal = item?.days || item?.day;
      const day = DAY_SHORT.includes(dayVal) ? dayVal : null;
      if (!day || !item?.start) return null;

      const dayIdx = DAY_TO_INDEX[day];
      const when = nextFor(dayIdx, item.start);
      if (!when) return null;

      const showObj = item?.showSlug ? showBySlug[item.showSlug] : null;
      const djObj = showObj?.djSlug ? djBySlug[showObj.djSlug] : null;

      return {
        ...item,
        day,
        show: item?.show || showObj?.title || item?.showSlug || 'Untitled Show',
        dj: item?.dj || djObj?.name || '—',
        nextISO: when.toISOString(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.nextISO) - new Date(b.nextISO));

  return upcoming[0] || null;
};
