export function initJoinFormAnchors(closeMenu) {
  const joinForm = document.getElementById("alta");
  const joinNameInput = joinForm?.querySelector('input[name="member-name"]');

  function focusJoinNameInput() {
    if (!joinForm || !joinNameInput) return;

    joinForm.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      joinNameInput.focus({ preventScroll: true });
    }, 520);
  }

  document.querySelectorAll('a[href="#alta"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
      history.pushState(null, "", "#alta");
      focusJoinNameInput();
    });
  });

  if (window.location.hash === "#alta") {
    window.setTimeout(focusJoinNameInput, 120);
  }
}
