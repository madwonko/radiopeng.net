module.exports = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0"); // 01..31
  return {
    url: `/img/banners/${day}.jpg`,
    alt: `RadioPeng banner for day ${day}`
  };
};
