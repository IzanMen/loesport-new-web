import { collectFormSubmission, sendFormSubmission } from "./form-submission.js";

function formSubject(form) {
  const heading =
    form.dataset.emailSubject ||
    form.closest("section")?.querySelector("h1, h2, h3")?.textContent ||
    document.title ||
    "Formulario web";
  return heading.trim();
}

function formType(form) {
  if (form.classList.contains("inline-form")) return "newsletter";
  if (form.classList.contains("sponsor-contact-form")) return "patrocinio";
  if (form.classList.contains("member-form") || form.classList.contains("join-form")) return "socio";
  return "contacto";
}

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
    let submitting = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting || !form.reportValidity()) return;

      submitting = true;
      const button = form.querySelector('button[type="submit"]');
      const originalButtonContent = button?.innerHTML;
      try {
        const submission = collectFormSubmission(form);
        await sendFormSubmission({
          form,
          type: formType(form),
          title: formSubject(form),
          answers: submission.answers,
          attachments: submission.attachments,
          replyTo: submission.replyTo,
          onCaptured: () => {
            if (!button) return;
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
            button.textContent = "Enviando...";
          },
        });
        showToast(form.dataset.success);
        form.reset();
      } catch (error) {
        showToast(error.message || "No se ha podido enviar el formulario. Inténtalo de nuevo.");
      } finally {
        submitting = false;
        if (button) {
          button.disabled = false;
          button.removeAttribute("aria-busy");
          button.innerHTML = originalButtonContent;
        }
      }
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
