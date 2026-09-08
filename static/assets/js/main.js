// Site behaviour. Derived from Future Imperfect by HTML5 UP, rewritten without
// jQuery. Depends only on breakpoints.js, which is already framework-free.
(function () {
  "use strict";

  breakpoints({
    xlarge: ["1200px", "1680px"],
    large: ["1008px", "1199px"],
    medium: ["641px", "1007px"],
    small: ["481px", "640px"],
    xsmall: [null, "480px"],
  });

  window.addEventListener("load", function () {
    setTimeout(function () {
      document.body.classList.remove("is-preload");
    }, 100);
  });

  const main = document.getElementById("main");
  const sidebar = document.getElementById("sidebar");
  const intro = document.getElementById("intro");
  const about = document.getElementById("about");

  // The intro block lives in the sidebar on wide screens and moves into the
  // content column when the sidebar stacks. Must match the breakpoint used by
  // #wrapper and #sidebar in the SCSS.
  if (intro && about && main && sidebar) {
    const aboutBorderTop = getComputedStyle(about).borderTopWidth;

    const setIconColumns = (columns) => {
      document.querySelectorAll("ul.icons").forEach((list) => {
        list.style.columns = columns;
      });
    };

    breakpoints.on("<=medium", function () {
      main.prepend(intro);
      intro.append(about);
      setIconColumns("1");
      about.style.borderTop = "none";
    });

    breakpoints.on(">medium", function () {
      sidebar.prepend(intro);
      setIconColumns("3");
      about.style.borderTop = aboutBorderTop;
    });
  }

  // Tag cloud sits beside the post list when there is room for two columns.
  const tagCloud = document.getElementById("tagCloud");
  const tagPosts = document.getElementById("tagPosts");

  if (tagCloud && tagPosts) {
    breakpoints.on(">small", function () {
      tagCloud.classList.add("col-4");
      tagPosts.classList.add("col-8");
    });

    breakpoints.on("<=small", function () {
      tagCloud.classList.remove("col-4");
      tagPosts.classList.remove("col-8");
    });
  }
})();
