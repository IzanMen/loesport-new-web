export function initForms(i18n) {
  const toast = document.querySelector(".toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;

    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3800);
  }

  document.querySelectorAll("form[data-success]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      showToast(form.dataset.success);
      form.reset();
    });
  });

  document.querySelectorAll("[data-future]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showToast(i18n.translate("{feature}: página en preparación.", { feature: link.dataset.future }));
    });
  });

  return {
    showToast,
  };
}
