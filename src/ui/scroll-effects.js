export function initScrollEffects() {
  const header = document.querySelector(".site-header");
  const runner = document.querySelector(".scroll-runner");
  const runnerVideo = runner?.querySelector("video");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let previousScroll = window.scrollY;
  let runnerScrollTimer;
  let runnerDirection = 1;
  let runnerPlaying = false;

  function setRunnerPlayback(shouldPlay) {
    if (!runnerVideo) return;

    if (reducedMotion.matches) {
      runnerVideo.pause();
      runnerPlaying = false;
      return;
    }

    if (runnerPlaying === shouldPlay) return;
    runnerPlaying = shouldPlay;

    if (shouldPlay) {
      runnerVideo.play().catch(() => {
        runnerPlaying = false;
      });
    } else {
      runnerVideo.pause();
    }
  }

  function playRunnerWhileScrolling(isRunnerVisible, scrollDelta) {
    window.clearTimeout(runnerScrollTimer);

    if (!isRunnerVisible || Math.abs(scrollDelta) <= 0.5) {
      setRunnerPlayback(false);
      return;
    }

    setRunnerPlayback(true);
    runnerScrollTimer = window.setTimeout(() => {
      setRunnerPlayback(false);
    }, 140);
  }

  function updateScrollUI() {
    const y = window.scrollY;
    const scrollDelta = y - previousScroll;
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(y / maxScroll, 1);
    const trackWidth = Math.max(window.innerWidth - 72, 0);

    if (Math.abs(scrollDelta) > 0.5) {
      runnerDirection = scrollDelta > 0 ? 1 : -1;
    }

    header?.classList.toggle("is-sticky", y > 120);
    document.body.classList.toggle("has-scrolled", y > 120);
    const isRunnerVisible = y > window.innerHeight * 0.6 && progress < 0.97;

    if (runner && runnerVideo) {
      runner.classList.toggle("is-visible", isRunnerVisible);
      runnerVideo.style.setProperty("--runner-x", `${progress * trackWidth}px`);
      runnerVideo.style.setProperty("--runner-direction", runnerDirection);
      playRunnerWhileScrolling(isRunnerVisible, scrollDelta);
    }

    previousScroll = y;
  }

  runnerVideo?.addEventListener("loadedmetadata", updateScrollUI);
  window.addEventListener("scroll", updateScrollUI, { passive: true });
  window.addEventListener("resize", updateScrollUI);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      setRunnerPlayback(false);
    } else {
      updateScrollUI();
    }
  });
  updateScrollUI();
}
