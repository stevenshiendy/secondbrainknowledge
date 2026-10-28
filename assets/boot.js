/* Runs in <head> before first paint so the saved theme and type settings apply without a flash.
   Keep the theme rule in step with resolveTheme() in secondbrain.js. */
(function () {
  var p = {};
  try { p = JSON.parse(localStorage.getItem("sb-prefs") || "{}") || {}; } catch (e) {}
  var d = document.documentElement;
  var sysDark = !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  var theme = p.auto === false && p.theme ? p.theme : (sysDark ? p.lastDark || "dark" : p.lastLight || "sepia");
  d.setAttribute("data-theme", theme);
  d.setAttribute("data-mode", /^(dark|navy|charcoal)$/.test(theme) ? "dark" : "light");
  // notebook reading mode: two-page "slide" spreads on wide screens, "scroll" on phones, until the reader picks one
  d.setAttribute("data-layout", p.layout || (window.innerWidth >= 1024 ? "slide" : "scroll"));
  d.setAttribute("data-reading", /^#(cards|quiz|mock)$/.test(location.hash) ? location.hash.slice(1) : "learn");
  if (p.bold) d.setAttribute("data-bold", "");
  if (p.justify) d.setAttribute("data-justify", "");
  if (p.contrast) d.setAttribute("data-contrast", "high");
  var s = d.style;
  if (p.size) s.setProperty("--fs", p.size + "px");
  if (p.lh) s.setProperty("--lh", p.lh);
  if (p.ls) s.setProperty("--ls", p.ls / 100 + "em");
  if (p.ws) s.setProperty("--ws", p.ws / 100 + "em");
  if (p.width) s.setProperty("--measure", p.width + "px");
  if (p.fontStack) s.setProperty("--reader", p.fontStack);
})();
