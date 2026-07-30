import { initI18n } from "./src/i18n/index.js";
import { initCoachCarousel } from "./src/ui/coach-carousel.js";
import { initCurrentYear } from "./src/ui/current-year.js";
import { initForms } from "./src/ui/forms.js";
import { initJoinFormAnchors } from "./src/ui/join-form.js";
import { initLocationCards } from "./src/ui/location-cards.js";
import { initNavigation } from "./src/ui/navigation.js";
import { initRevealAnimations } from "./src/ui/reveal.js";
import { initRegistrationForms } from "./src/ui/registration-forms.js";
import { initScrollEffects } from "./src/ui/scroll-effects.js";

initRegistrationForms();
const i18n = initI18n();
const navigation = initNavigation(i18n);
const locationCards = initLocationCards(i18n);

initScrollEffects();
initRevealAnimations();
initCoachCarousel();
initForms(i18n);
initJoinFormAnchors(navigation.closeMenu);
initCurrentYear();

document.addEventListener("loesport:languagechange", () => {
  locationCards.updateLocationToggleLabels();
  navigation.updateMenuButtonLabel();
});
