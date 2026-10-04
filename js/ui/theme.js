/* Thème clair/sombre, et préférence de mouvement réduit. */

export const REDUCE_MOTION = matchMedia("(prefers-reduced-motion: reduce)");

export function initialiserTheme() {
  const btn = document.getElementById("theme-toggle");
  const meta = document.querySelector('meta[name="theme-color"]');
  function apply(dark) {
    document.documentElement.toggleAttribute("data-theme", dark);
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    btn.setAttribute("aria-pressed", String(dark));
    btn.setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
    if (meta) meta.setAttribute("content", dark ? "#15180F" : "#42603A");
  }
  apply(document.documentElement.getAttribute("data-theme") === "dark");
  btn.addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") !== "dark";
    apply(dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  });
}
