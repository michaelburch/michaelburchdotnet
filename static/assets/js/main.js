// Site behaviour. Derived from Future Imperfect by HTML5 UP, rewritten without
// jQuery.
(function () {
  "use strict";

  window.addEventListener("load", function () {
    setTimeout(function () {
      document.body.classList.remove("is-preload");
    }, 100);
  });

  const searchToggle = document.getElementById("search-toggle");
  const searchBar = document.getElementById("search-bar");

  if (searchToggle && searchBar) {
    const setOpen = (open) => {
      searchBar.hidden = !open;
      searchToggle.setAttribute("aria-expanded", String(open));
      if (open) searchBar.querySelector("input").focus();
    };

    searchToggle.addEventListener("click", function () {
      setOpen(searchBar.hidden);
    });

    document.addEventListener("click", function (event) {
      if (searchBar.hidden) return;
      // The toggle's own click bubbles here, so ignore it or it would reopen and
      // close in the same gesture.
      if (searchBar.contains(event.target) || searchToggle.contains(event.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !searchBar.hidden) {
        setOpen(false);
        searchToggle.focus();
      }
    });
  }

  const themeToggle = document.getElementById("theme-toggle");

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const dark = document.documentElement.dataset.theme !== "dark";
      // Defined by the inline bootstrap in <head>, which also runs before paint.
      window.__setTheme(dark);
      try {
        localStorage.setItem("theme", dark ? "dark" : "light");
      } catch (e) {}
    });
  }
})();

