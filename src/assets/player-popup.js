(function () {
  // Elements
  const modal = document.getElementById("rpModal");
  if (!modal) return;

  const audio = document.getElementById("rpAudio");
  const cover = document.getElementById("rpCover");
  const title = document.getElementById("rpTitle");
  const date = document.getElementById("rpDate");

  const playBtn = document.getElementById("rpPlay");
  const playIcon = document.getElementById("rpPlayIcon");
  const backBtn = document.getElementById("rpBack");
  const fwdBtn = document.getElementById("rpFwd");
  const muteBtn = document.getElementById("rpMute");
  const rateBtn = document.getElementById("rpRate");

  const seek = document.getElementById("rpSeek");
  const curTime = document.getElementById("rpCur");
  const durTime = document.getElementById("rpDur");

  const shareBtn = document.getElementById("rpShare");
  const infoBtn = document.getElementById("rpInfo");

  const rates = [1, 1.25, 1.5, 2];
  let rateIndex = 0;

  function formatTime(sec) {
    if (!isFinite(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function openPlayer(opts = {}) {
    const {
      src,
      coverUrl,
      titleText,
      dateText,
      shareUrl,
      infoUrl
    } = opts;

    if (!src) return;

    cover.src = coverUrl || "";
    cover.alt = titleText || "Episode cover";
    title.textContent = titleText || "Now Playing";
    date.textContent = dateText || "";

    audio.src = src;
    audio.currentTime = 0;
    audio.playbackRate = 1;
    rateIndex = 0;
    rateBtn.textContent = "1×";

    playIcon.textContent = "▶";
    seek.value = 0;
    curTime.textContent = "00:00";
    durTime.textContent = "00:00";

    shareBtn.onclick = async () => {
      const url = shareUrl || window.location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: titleText || "RadioPeng", url });
        } else {
          await navigator.clipboard.writeText(url);
        }
      } catch (_) {}
    };

    infoBtn.onclick = () => {
      const url = infoUrl || shareUrl;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    };

    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    audio.play().catch(() => {});
  }

  function closePlayer() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    audio.pause();
    audio.src = "";
  }

  // Close handlers
  modal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) closePlayer();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
      closePlayer();
    }
  });

  // Controls
  playBtn.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });

  audio.addEventListener("play", () => (playIcon.textContent = "⏸"));
  audio.addEventListener("pause", () => (playIcon.textContent = "▶"));

  backBtn.addEventListener("click", () => {
    audio.currentTime = Math.max(0, audio.currentTime - 15);
  });

  fwdBtn.addEventListener("click", () => {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15);
  });

  muteBtn.addEventListener("click", () => {
    audio.muted = !audio.muted;
    muteBtn.textContent = audio.muted ? "🔇" : "🔊";
  });

  rateBtn.addEventListener("click", () => {
    rateIndex = (rateIndex + 1) % rates.length;
    audio.playbackRate = rates[rateIndex];
    rateBtn.textContent = `${rates[rateIndex]}×`;
  });

  audio.addEventListener("loadedmetadata", () => {
    durTime.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    curTime.textContent = formatTime(audio.currentTime);
    if (audio.duration) {
      seek.value = Math.floor((audio.currentTime / audio.duration) * 1000);
    }
  });

  seek.addEventListener("input", () => {
    if (audio.duration) {
      audio.currentTime = (seek.value / 1000) * audio.duration;
    }
  });

  // Declarative trigger support
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-player]");
    if (!el) return;

    e.preventDefault();

    openPlayer({
      src: el.dataset.src,
      coverUrl: el.dataset.cover,
      titleText: el.dataset.title,
      dateText: el.dataset.date,
      shareUrl: el.dataset.url,
      infoUrl: el.dataset.url
    });
  });

  // Expose globally (safe names)
  window.rpOpenPlayer = openPlayer;
  window.rpClosePlayer = closePlayer;
})();
