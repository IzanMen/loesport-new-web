import { initI18n } from "./src/i18n/index.js";
import { initCurrentYear } from "./src/ui/current-year.js";
import { initGroupFinder } from "./src/ui/group-finder.js";
import { initNavigation } from "./src/ui/navigation.js";
import { initRevealAnimations } from "./src/ui/reveal.js";
import { initScrollEffects } from "./src/ui/scroll-effects.js";

const i18n = initI18n();
const navigation = initNavigation(i18n);

initScrollEffects();
initRevealAnimations();
initGroupFinder();
initCurrentYear();

document.addEventListener("loesport:languagechange", () => {
  navigation.updateMenuButtonLabel();
});
