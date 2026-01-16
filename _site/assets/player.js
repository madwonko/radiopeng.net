/* /assets/player.js
   RadioPeng player controller + AzuraCast Now Playing UI
*/

(() => {
  // --- CONFIG ---
  const STREAM_URL = "https://a5.asurahosting.com:7780/radio.mp3";
  const NOWPLAYING_URL = "https://a5.asurahosting.com/api/nowplaying/max";

  const POLL_MS = 15000;
  const VOL_KEY = "rp_volume";

  let pollTimer = null;
  let inFlight = null;

  // --- HELPERS ---
  function $(id) {
    return document.getElementById(id);
  }

  function safeText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function showEl(el) {
    if (!el) return;
    el.classList.remove("hidden");
  }

  function hideEl(el) {
    if (!el) return;
    el.classList.add("hidden");
  }

  function setLiveDot(isLive) {
    const dot = $("liveDot");
    if (!dot) return;
    dot.classList.toggle("live", !!isLive);
  }

  function formatSong(songObj) {
    const artist = (songObj?.artist || "").trim();
    const title = (songObj?.title || "").trim();
    if (artist && title) return `${artist} – ${title}`;
    if (title) return title;
    return "—";
  }

  function getSavedVolume() {
    const v = parseFloat(localStorage.getItem(VOL_KEY));
    if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
    return 0.85;
  }

  function saveVolume(v) {
    try {
      localStorage.setItem(VOL_KEY, String(v));
    } catch (_) {}
  }

  function ensureAudioSrc(audioEl) {
    if (!audioEl) return;
    const srcEl = audioEl.querySelector("source");
    if (srcEl) {
      // keep whatever you have, but ensure it points correctly
      if (!srcEl.src || !srcEl.src.includes("radio.mp3")) {
        srcEl.src = STREAM_URL;
        audioEl.load();
      }
      return;
    }
    const src = document.createElement("source");
    src.src = STREAM_URL;
    src.type = "audio/mpeg";
    audioEl.appendChild(src);
    audioEl.load();
  }

  // AzuraCast sometimes returns array (multi-station) or object (single station)
  function normalizePayload(json) {
    if (Array.isArray(json)) return json[0] || null;
    if (json && typeof json === "object") return json;
    return null;
  }

  // --- UI INIT ---
  function bindUI() {
    const playBtn = $("playBtn");
    const audio = $("rpAudio");
    const vol = $("vol");
    const drawer = $("playerDrawer");
    const openPlayer = $("openPlayer");
    const closePlayer = $("closePlayer");

    ensureAudioSrc(audio);

    // Volume init
    const startVol = getSavedVolume();
    if (audio) audio.volume = startVol;
    if (vol) vol.value = String(startVol);

    if (vol && audio) {
      vol.addEventListener("input", () => {
        const v = Math.max(0, Math.min(1, parseFloat(vol.value)));
        audio.volume = v;
        saveVolume(v);
      });
    }

    // Drawer open/close
    if (openPlayer && drawer) {
      openPlayer.addEventListener("click", () => {
        drawer.hidden = false;
        drawer.classList.add("open");
      });
    }

    if (closePlayer && drawer) {
      closePlayer.addEventListener("click", () => {
        drawer.classList.remove("open");
        drawer.hidden = true;
      });
    }

    // Play/Pause
    if (playBtn && audio) {
      const updatePlayLabel = () => {
        playBtn.textContent = audio.paused ? "Play" : "Pause";
      };

      playBtn.addEventListener("click", async () => {
        try {
          if (audio.paused) {
            await audio.play();
          } else {
            audio.pause();
          }
          updatePlayLabel();
        } catch (err) {
          console.error("Audio play failed:", err);
          // If autoplay is blocked, open drawer so user can interact.
          if (drawer) {
            drawer.hidden = false;
            drawer.classList.add("open");
          }
        }
      });

      audio.addEventListener("play", updatePlayLabel);
      audio.addEventListener("pause", updatePlayLabel);
      updatePlayLabel();
    }
  }

  // --- NOW PLAYING ---
  async function updateNowPlaying() {
    if (inFlight) {
      try { inFlight.abort(); } catch (_) {}
    }
    inFlight = new AbortController();

    try {
      const res = await fetch(NOWPLAYING_URL, {
        cache: "no-store",
        signal: inFlight.signal
      });

      if (!res.ok) throw new Error(`NowPlaying HTTP ${res.status}`);

      const raw = await res.json();
      const data = normalizePayload(raw);
      if (!data) throw new Error("NowPlaying payload not recognized");

      // Re-query elements (Swup-safe)
      const npText = $("npText");
      const npShow = $("npShow");
      const djName = $("djName");
      const liveStatus = $("liveStatus");
      const listenerText = $("listenerText");
      const artImg = $("artImg");

      // Track
      const song = data?.now_playing?.song;
      safeText(npText, song ? formatSong(song) : "—");

      // Cover art
      const artUrl = (song?.art || "").trim();
      if (artImg) {
        artImg.src = artUrl ? artUrl : "/assets/cover-fallback.png";
      }

      // Listeners
      const listeners = data?.listeners?.current;
      if (typeof listeners === "number") {
        safeText(listenerText, `Listeners: ${listeners}`);
      } else {
        safeText(listenerText, "Listeners: –");
      }

      // Live / DJ / Show title
      const isLive = !!data?.live?.is_live;

      if (isLive) {
        setLiveDot(true);
        safeText(liveStatus, "Live");

        const streamerName = (data?.live?.streamer_name || "").trim();
        safeText(djName, streamerName || "Live DJ");

        const showTitle = (data?.live?.broadcast_title || "").trim();
        if (showTitle) {
          safeText(npShow, showTitle);
          showEl(npShow);
        } else {
          safeText(npShow, "");
          hideEl(npShow);
        }
      } else {
        setLiveDot(false);
        safeText(liveStatus, "Auto DJ");
        safeText(djName, "Auto DJ");

        safeText(npShow, "");
        hideEl(npShow);
      }

    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Now Playing fetch failed:", err);

      // Don't overwrite a previously good state. Only mark Offline if nothing has ever loaded.
      const npText = $("npText");
      const liveStatus = $("liveStatus");
      if (npText && (npText.textContent || "").includes("Loading")) {
        safeText(liveStatus, "Offline");
        setLiveDot(false);
      }
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    updateNowPlaying();
    pollTimer = setInterval(updateNowPlaying, POLL_MS);
  }

  // --- BOOT ---
  document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    startPolling();
  });

})();
