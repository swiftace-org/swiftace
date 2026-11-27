// The screenshots' light/dark switch: the section shows the images of the theme in its
// data-theme.
const screenshots = document.querySelector(".screenshots");
const themeSwitch = screenshots?.querySelector(".theme-switch");
if (screenshots && themeSwitch) {
  themeSwitch.hidden = false;
  const choices = themeSwitch.querySelectorAll("button");
  for (const choice of choices) {
    choice.addEventListener("click", () => {
      screenshots.dataset.theme = choice.value;
      for (const other of choices) {
        other.setAttribute("aria-pressed", String(other === choice));
      }
    });
  }
}
