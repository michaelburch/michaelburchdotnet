// Off-canvas menu. Replaces the jQuery `panel` plugin from the HTML5 UP theme.
//
// Toggled by any <a href="#menu">. Visibility is expressed as a class on <body>
// so the stylesheet can dim the wrapper behind it.
class OffCanvasMenu extends HTMLElement {
  static VISIBLE_CLASS = "is-menu-visible";
  static HIDE_DELAY_MS = 500;
  static SWIPE_THRESHOLD_PX = 20;

  #listeners = new AbortController();
  #touchStart = null;

  connectedCallback() {
    const { signal } = this.#listeners;
    const selector = `a[href="#${this.id}"]`;

    // Clicks inside must not reach the document handler that closes the menu.
    this.addEventListener("click", (event) => event.stopPropagation(), { signal });
    this.addEventListener("touchend", (event) => event.stopPropagation(), { signal });

    this.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link || !this.contains(link)) return;

      const href = link.getAttribute("href");
      if (!href || href === "#" || href === `#${this.id}`) {
        event.preventDefault();
        this.hide();
        return;
      }

      // Let the close animation run before navigating.
      event.preventDefault();
      this.hide();
      setTimeout(() => {
        if (link.target === "_blank") window.open(href);
        else window.location.href = href;
      }, OffCanvasMenu.HIDE_DELAY_MS + 10);
    }, { signal });

    this.addEventListener("touchstart", (event) => {
      this.#touchStart = {
        x: event.touches[0].pageX,
        y: event.touches[0].pageY,
      };
    }, { passive: true, signal });

    this.addEventListener("touchmove", (event) => {
      if (!this.#touchStart) return;
      const dx = this.#touchStart.x - event.touches[0].pageX;
      const dy = this.#touchStart.y - event.touches[0].pageY;

      // Swiping towards the right edge closes a right-hand panel.
      if (Math.abs(dx) > Math.abs(dy) && -dx > OffCanvasMenu.SWIPE_THRESHOLD_PX) {
        this.#touchStart = null;
        this.hide();
      }
    }, { passive: true, signal });

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest(selector);
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        this.toggle();
        return;
      }
      this.hide();
    }, { signal });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.hide();
    }, { signal });
  }

  disconnectedCallback() {
    this.#listeners.abort();
  }

  get visible() {
    return document.body.classList.contains(OffCanvasMenu.VISIBLE_CLASS);
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  show() {
    document.body.classList.add(OffCanvasMenu.VISIBLE_CLASS);
  }

  hide() {
    if (!this.visible) return;
    document.body.classList.remove(OffCanvasMenu.VISIBLE_CLASS);

    setTimeout(() => {
      this.scrollTop = 0;
      this.querySelectorAll("form").forEach((form) => form.reset());
    }, OffCanvasMenu.HIDE_DELAY_MS);
  }
}

customElements.define("off-canvas-menu", OffCanvasMenu);
