/* RadioPeng inline player
   iOS-safe: no popups, play triggered directly by user gesture
*/

(() => {
  const openBtn  = document.getElementById("openPlayer");
  const closeBtn = document.getElementById("closePlayer");
  const drawer   = document.getElementById("playerDrawer");
  const audio    = document.getElementById("rpAudio");

  // If the page doesn't have a player, do nothing
  if (!openBtn || !drawer || !audio) return;

  // iOS Safari prefers preload=none
  audio.preload = "none";

  // Ensure inline playback on iOS
  audio.setAttribute("playsinline", "");
  audio.setAttribute("webkit-playsinline", "");

  openBtn.addEventListener("click", async () => {
    drawer.hidden = false;

    // IMPORTANT:
    // play() must happen immediately in the same user gesture
    try {
      await audio.play();
    } catch (err) {
      // If Safari blocks it, user can still tap native controls
      console.warn("RadioPeng: autoplay blocked", err);
    }
  });

  closeBtn?.addEventListener("click", () => {
    audio.pause();
    drawer.hidden = true;
  });

  // Optional: pause when navigating away
  window.addEventListener("pagehide", () => {
    audio.pause();
  });
})();
