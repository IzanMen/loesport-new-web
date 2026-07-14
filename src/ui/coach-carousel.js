export function initCoachCarousel() {
  const coachTrack = document.querySelector(".coach-track");
  const coachCards = [...document.querySelectorAll(".coach-card")];
  const prevCoach = document.querySelector(".coach-prev");
  const nextCoach = document.querySelector(".coach-next");

  let coachIndex = 0;

  function visibleCoachCount() {
    if (window.innerWidth < 650) return 1;
    if (window.innerWidth < 1000) return 2;
    return 3;
  }

  function updateCoachPosition() {
    const card = coachCards[0];
    if (!card || !coachTrack) return;

    const gap = 1;
    const maxIndex = Math.max(coachCards.length - visibleCoachCount(), 0);
    coachIndex = Math.min(coachIndex, maxIndex);
    coachTrack.style.transform = `translateX(-${coachIndex * (card.getBoundingClientRect().width + gap)}px)`;
    if (prevCoach) prevCoach.disabled = coachIndex === 0;
    if (nextCoach) nextCoach.disabled = coachIndex === maxIndex;
  }

  prevCoach?.addEventListener("click", () => {
    coachIndex = Math.max(coachIndex - 1, 0);
    updateCoachPosition();
  });

  nextCoach?.addEventListener("click", () => {
    const maxIndex = Math.max(coachCards.length - visibleCoachCount(), 0);
    coachIndex = Math.min(coachIndex + 1, maxIndex);
    updateCoachPosition();
  });

  window.addEventListener("resize", updateCoachPosition);
  updateCoachPosition();
}
