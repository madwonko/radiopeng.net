/* /assets/player.js
   RadioPeng unified player controller + Now Playing updater
   Works with:
   - Header button:   #playToggle
   - Bottom bar:      #playBtn, #vol, #npText, #artImg, #djName, #listenerText, #liveStatus, #liveDot, #npShow
   - Ribbon:          #nowPlayingText
   - Header NP text:  #headerNowPlaying
   Audio element (preferred): #radioPlayer
   Fallback audio element:    #rpAudio
*/

(() => {
  // --------- CONFIG ----------
  const STREAM_URL = "https://a5.asurahosting.com:7780/radio.mp3";
  const NOWPLAYING_URL = "https://a5.asurahosting.com/api/nowplaying/239";
  const NOWPLAYING_INTERVAL_MS = 15000;

  // --------- HELPERS ----------
  const $ = (id) => document.getElementById(id);

  function setText(el, value) {
    if (!el) return;
    el.textContent = value;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle("hidden", !!hidden);
  }

  function safeTrim(s) {
    return (s ?? "").toString().trim();
  }

  function formatSong(np) {
    const artist = safeTrim(np?.artist);
    const title = safeTrim(np?.title);
    if (artist && title) return `${artist} — ${title}`;
    return artist || title || "Loading…";
  }

  // --------- AUDIO (single source of truth) ----------
  function getAudioEl() {
    // Prefer the hidden/global audio, fallback to drawer audio if that’s what exists
    return $("radioPlayer") || $("rpAudio");
  }

  function ensureAudioSource(audio) {
    if (!audio) return;

    // If <source> exists and already points to STREAM_URL, cool.
    // If not, set src directly to be safe.
    const source = audio.querySelector("source");
    const current = source?.getAttribute("src") || audio.getAttribute("src") || "";
    if (!current || current !== STREAM_URL) {
      if (source) {
        source.setAttribute("src", STREAM_URL);
        // reload source list
        audio.load();
      } else {
        audio.src = STREAM_URL;
      }
    }
  }

  // --------- UI BINDING ----------
  function bindControls() {
    const audio = getAudioEl();
    if (!audio) {
      console.warn("[player.js] No audio element found (#radioPlayer or #rpAudio).");
      return;
    }
    ensureAudioSource(audio);

    const playBtn = $("playBtn"); // bottom bar button
    const playToggle = $("playToggle"); // header button
    const vol = $("vol");

    const setPlayingUI = (isPlaying) => {
      if (playBtn) playBtn.textContent = isPlaying ? "Pause" : "Play";
      if (playToggle) playToggle.textContent = isPlaying ? "❚❚" : "▶︎";
    };

    // Initial UI state
    setPlayingUI(!audio.paused);

    // Keep UI synced even if playback state changes elsewhere
    audio.addEventListener("play", () => setPlayingUI(true));
    audio.addEventListener("pause", () => setPlayingUI(false));
    audio.addEventListener("ended", () => setPlayingUI(false));

    async function togglePlay() {
      try {
        if (audio.paused) {
          const p = audio.play();
          if (p && typeof p.then === "function") await p;
        } else {
          audio.pause();
        }
      } catch (err) {
        console.warn("[player.js] Play blocked by browser policy:", err);
        // Optional: you could open the drawer here if you want
        // $("playerDrawer")?.removeAttribute("hidden");
      }
    }

    playBtn?.addEventListener("click", togglePlay);
    playToggle?.addEventListener("click", togglePlay);

    // Volume
    if (vol) {
      const initial = parseFloat(vol.value);
      if (!Number.isNaN(initial)) audio.volume = initial;

      vol.addEventListener("input", () => {
        const v = parseFloat(vol.value);
        if (!Number.isNaN(v)) audio.volume = v;
      });
    }

    // If you still use the drawer open/close buttons, wire them safely
    const openPlayer = $("openPlayer");
    const closePlayer = $("closePlayer");
    const drawer = $("playerDrawer");

    openPlayer?.addEventListener("click", () => {
      if (!drawer) return;
      drawer.hidden = false;
      // If the drawer contains the audio element (rpAudio), this is helpful on iOS
      // Otherwise harmless.
    });

    closePlayer?.addEventListener("click", () => {
      if (!drawer) return;
      drawer.hidden = true;
    });
  }

  // --------- NOW PLAYING ----------
  async function updateNowPlayingOnce() {
    // Elements across the site
    const ribbon = $("nowPlayingText");
    const headerNP = $("headerNowPlaying");

    const npText = $("npText");
    const artImg = $("artImg");
    const djName = $("djName");
    const listenerText = $("listenerText");
    const liveStatus = $("liveStatus");
    const liveDot = $("liveDot");
    const npShow = $("npShow");

    try {
      const res = await fetch(NOWPLAYING_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // AzuraCast now playing objects vary slightly; these are common
      const np = data?.now_playing?.song;
      const text = formatSong(np);

      // Ribbon + header text
      if (ribbon) ribbon.textContent = `▶ Now Playing: ${text}`;
      if (headerNP) headerNP.textContent = text;

      // Bottom bar main text
      setText(npText, text);

      // Artwork
      const art =
        data?.now_playing?.song?.art ||
        data?.now_playing?.song?.artwork ||
        data?.now_playing?.song?.art_url ||
        data?.now_playing?.song?.artUrl;
      if (artImg && art) artImg.src = art;

      // Live vs AutoDJ
      const isLive =
        !!data?.live?.is_live ||
        !!data?.live?.isLive ||
        safeTrim(data?.live?.streamer_name) !== "";

      setText(liveStatus, isLive ? "Live" : "Idle");
      if (liveDot) liveDot.style.opacity = isLive ? "1" : "0.35";

      // DJ name
      const streamer =
        safeTrim(data?.live?.streamer_name) ||
        safeTrim(data?.live?.streamerName) ||
        "";
      setText(djName, streamer || "Auto DJ");

      // Listeners
      const listeners =
        data?.listeners?.current ??
        data?.listeners?.unique ??
        data?.listeners ??
        null;
      if (listenerText) {
        listenerText.textContent =
          listeners === null || listeners === undefined
            ? "Listeners: –"
            : `Listeners: ${listeners}`;
      }

      // Optional: show/program name if provided
      const showTitle =
        safeTrim(data?.now_playing?.sh_id) || // sometimes numeric, not useful
        safeTrim(data?.now_playing?.playlist) ||
        safeTrim(data?.playing_next?.playlist) ||
        safeTrim(data?.station?.name);

      if (npShow) {
        // If you have a better show field, swap it here
        if (showTitle && showTitle.toLowerCase() !== "radiopeng") {
          npShow.textContent = showTitle;
          setHidden(npShow, false);
        } else {
          npShow.textContent = "";
          setHidden(npShow, true);
        }
      }
    } catch (e) {
      console.warn("[player.js] Now Playing fetch failed:", e);
      // Don’t spam the UI with errors; keep previous values.
      if (ribbon && ribbon.textContent.includes("loading")) {
        ribbon.textContent = "▶ Now Playing: unavailable";
      }
    }
  }

  function startNowPlayingLoop() {
    updateNowPlayingOnce();
    setInterval(updateNowPlayingOnce, NOWPLAYING_INTERVAL_MS);
  }

  // --------- BOOT ----------
  document.addEventListener("DOMContentLoaded", () => {
    bindControls();
    startNowPlayingLoop();
  });

  // If Swup is swapping #swup content, some UI nodes might be replaced.
  // Rebind lightly after navigation events if Swup exists.
  document.addEventListener("swup:contentReplaced", () => {
    bindControls();
    // Now playing loop continues; just refresh once for new DOM targets.
    updateNowPlayingOnce();
  });
})();
