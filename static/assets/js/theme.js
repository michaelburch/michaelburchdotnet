// Loaded render-blocking from <head> so a stored preference cannot flash the
// other theme. External rather than inline so the CSP needs no 'unsafe-inline'.
(function () {
  "use strict";

  function apply(dark) {
    var root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    var light = document.getElementById("hl-light");
    var night = document.getElementById("hl-dark");
    if (light) light.media = dark ? "not all" : "all";
    if (night) night.media = dark ? "all" : "not all";
  }

  var stored = null;
  try { stored = localStorage.getItem("theme"); } catch (e) {}
  apply(stored !== "light");
  window.__setTheme = apply;
})();
