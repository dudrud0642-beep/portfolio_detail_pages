/*
 * SIMMONS PORTFOLIO — main.js
 * Every block only runs if its element exists, so removing a section is safe.
 *
 * Shared with the main renewal site (simmons_portfolio/assets/js/main.js).
 * Two differences: block 1 also treats a pointer press as user input (a click
 * on an in-page link must not be undone by the load-time scroll reset), and
 * block 9 blocks placeholder links (href="#") instead of all links, so the
 * product page's in-page navigation works. Blocks 4, 5 and 7 find no element
 * on the product page and skip themselves.
 *
 *   0. Shared settings & helpers     5. Collections slider (autoplay)
 *   1. Page start (scroll reset)     6. Store carousel (swipe / drag / autoplay)
 *   2. Header, menu & scroll state   7. Event popup
 *   3. Scroll reveal                 8. Closing statement
 *   4. Hero slider · intro panels    9. Prototype-only behaviour (links, forms)
 */

// 0. Shared settings & helpers ----------------------------------------------
const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)")
  .matches;
const canHover = window.matchMedia("(hover: hover)");

// Calls onChange(true/false) whenever the element enters or leaves the screen.
const whileOnScreen = (element, onChange) =>
  new IntersectionObserver(([entry]) => onChange(entry.isIntersecting)).observe(
    element,
  );

// 1. Page start: always open at the top ---------------------------------------
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (location.hash) {
  history.replaceState(null, "", location.pathname + location.search);
}
const resetScroll = () => {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};
// Don't yank the page back to the top if the visitor already started scrolling.
let userScrolled = false;
["wheel", "touchstart", "keydown", "pointerdown"].forEach((type) =>
  window.addEventListener(type, () => (userScrolled = true), {
    once: true,
    passive: true,
  }),
);
const resetIfIdle = () => userScrolled || resetScroll();
resetScroll();
document.addEventListener("DOMContentLoaded", resetScroll);
window.addEventListener("load", () => requestAnimationFrame(resetIfIdle));
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return resetIfIdle();
  resetScroll();
  requestAnimationFrame(resetScroll);
});
window.addEventListener("beforeunload", resetScroll);

// 2. Header, mobile menu & scroll state ---------------------------------------
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const mobileMenu = document.querySelector("[data-mobile-menu]");

const closeMenu = () => {
  header?.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.setAttribute("aria-label", "전체 메뉴 열기");
};

menuButton?.addEventListener("click", () => {
  const willOpen = !header.classList.contains("is-open");
  header.classList.toggle("is-open", willOpen);
  document.body.classList.toggle("menu-open", willOpen);
  menuButton.setAttribute("aria-expanded", String(willOpen));
  menuButton.setAttribute(
    "aria-label",
    willOpen ? "전체 메뉴 닫기" : "전체 메뉴 열기",
  );
});
mobileMenu
  ?.querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

// Solid header once the page has scrolled a little.
const updateHeader = () =>
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

// Pause hover effects while scrolling: cards moving under a still cursor would
// otherwise keep firing hover transitions mid-scroll (see html.is-scrolling).
let scrollIdleTimer;
window.addEventListener(
  "scroll",
  () => {
    if (!canHover.matches) return;
    document.documentElement.classList.add("is-scrolling");
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(
      () => document.documentElement.classList.remove("is-scrolling"),
      150,
    );
  },
  { passive: true },
);

// Back-to-top button (hidden on mobile in layout.css).
document
  .querySelector("[data-scroll-top]")
  ?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" }),
  );

// 3. Scroll reveal: .reveal elements fade in once ---------------------------
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.14 },
);
document
  .querySelectorAll(".reveal")
  .forEach((element) => revealObserver.observe(element));

// 4. Hero slider (autoplay every 5.2s) · intro panels ------------------------
const heroSlider = document.querySelector("[data-hero-slider]");
if (heroSlider) {
  const slides = [...heroSlider.querySelectorAll("[data-hero-slide]")];
  const dots = [...document.querySelectorAll("[data-hero-dot]")];
  let heroIndex = 0;
  let heroTimer;
  let heroInView = true;

  const showHero = (nextIndex) => {
    heroIndex = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      const active = index === heroIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      slide.querySelectorAll("a, button").forEach((control) => {
        control.setAttribute("tabindex", active ? "0" : "-1");
      });
    });
    dots.forEach((dot, index) => {
      const active = index === heroIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
      dot.setAttribute("tabindex", active ? "0" : "-1");
    });
  };
  const startHero = () => {
    clearInterval(heroTimer);
    if (motionAllowed && heroInView) {
      heroTimer = setInterval(() => showHero(heroIndex + 1), 5200);
    }
  };
  const stopHero = () => clearInterval(heroTimer);

  slides.forEach((slide, index) => {
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "슬라이드");
    slide.setAttribute("aria-label", `${index + 1} / ${slides.length}`);
  });
  dots.forEach((dot) => dot.setAttribute("role", "tab"));
  showHero(0);

  document
    .querySelector("[data-hero-prev]")
    ?.addEventListener("click", () => (showHero(heroIndex - 1), startHero()));
  document
    .querySelector("[data-hero-next]")
    ?.addEventListener("click", () => (showHero(heroIndex + 1), startHero()));
  dots.forEach((dot, index) =>
    dot.addEventListener("click", () => (showHero(index), startHero())),
  );
  heroSlider.addEventListener("mouseenter", stopHero);
  heroSlider.addEventListener("mouseleave", startHero);
  heroSlider.addEventListener("focusin", stopHero);
  heroSlider.addEventListener("focusout", startHero);
  whileOnScreen(heroSlider, (onScreen) => {
    heroInView = onScreen;
    startHero();
  });
}

// Intro: hovering or focusing a panel makes it the active one.
const introPanels = document.querySelectorAll(".intro-panel");
introPanels.forEach((panel) => {
  const activate = () => {
    introPanels.forEach((item) => item.classList.remove("is-active"));
    panel.classList.add("is-active");
  };
  panel.addEventListener("mouseenter", activate);
  panel.addEventListener("focus", activate);
});

// 5. Collections slider (autoplay every 5s; hover or focus pauses) ----------
const collection = document.querySelector("[data-collection]");
if (collection) {
  const slides = [...collection.querySelectorAll("[data-slide]")];
  const counter = collection.querySelector("[data-counter]");
  const pad = (number) => String(number).padStart(2, "0");
  let index = 0;
  let timer;
  let inView = false;
  let paused = false;

  const showSlide = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    counter.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
  };
  const startAutoplay = () => {
    clearInterval(timer);
    if (motionAllowed && inView && !paused) {
      timer = setInterval(() => showSlide(index + 1), 5000);
    }
  };
  const goTo = (nextIndex) => {
    showSlide(nextIndex);
    startAutoplay();
  };
  const setPaused = (value) => {
    paused = value;
    startAutoplay();
  };

  collection
    .querySelector("[data-prev]")
    .addEventListener("click", () => goTo(index - 1));
  collection
    .querySelector("[data-next]")
    .addEventListener("click", () => goTo(index + 1));
  collection.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") goTo(index - 1);
    if (event.key === "ArrowRight") goTo(index + 1);
  });
  collection.addEventListener("mouseenter", () => setPaused(true));
  collection.addEventListener("mouseleave", () => setPaused(false));
  collection.addEventListener("focusin", () => setPaused(true));
  collection.addEventListener("focusout", () => setPaused(false));

  whileOnScreen(collection, (onScreen) => {
    inView = onScreen;
    // Hidden slides use lazy images; load them now so autoplay never shows a blank frame.
    if (onScreen) {
      collection
        .querySelectorAll("img")
        .forEach((img) => (img.loading = "eager"));
    }
    startAutoplay();
  });
}

// 6. Store carousel (900px and below) ----------------------------------------
// Touch: native swipe + scroll-snap. Mouse: drag handled here. Autoplay 3.8s.
const storeGallery = document.querySelector("[data-store-gallery]");
if (storeGallery) {
  const cards = [...storeGallery.querySelectorAll(".store-card")];
  const carouselMedia = window.matchMedia("(max-width: 900px)");
  let storeIndex = 0;
  let timer;
  let inView = false;
  let dragging = false;
  let dragStart = 0;
  let scrollStart = 0;
  let dragDistance = 0;

  const cardLeft = (card) => card.offsetLeft - cards[0].offsetLeft;
  const showCard = (nextIndex) => {
    if (!carouselMedia.matches) return;
    storeIndex = (nextIndex + cards.length) % cards.length;
    storeGallery.scrollTo({
      left: cardLeft(cards[storeIndex]),
      behavior: motionAllowed ? "smooth" : "auto",
    });
  };
  // Index of the card closest to the current scroll position.
  const syncIndex = () => {
    const left = storeGallery.scrollLeft;
    storeIndex = cards.reduce(
      (closest, card, i) =>
        Math.abs(left - cardLeft(card)) <
        Math.abs(left - cardLeft(cards[closest]))
          ? i
          : closest,
      0,
    );
  };
  const stopAutoplay = () => clearInterval(timer);
  const startAutoplay = () => {
    stopAutoplay();
    if (!motionAllowed || !carouselMedia.matches || !inView) return;
    timer = setInterval(() => {
      syncIndex();
      showCard(storeIndex + 1);
    }, 3800);
  };

  storeGallery.addEventListener("pointerdown", (event) => {
    if (!carouselMedia.matches || event.button > 0) return;
    stopAutoplay();
    if (event.pointerType !== "mouse") return;
    dragging = true;
    dragStart = event.clientX;
    scrollStart = storeGallery.scrollLeft;
    dragDistance = 0;
    storeGallery.classList.add("is-dragging");
    storeGallery.setPointerCapture(event.pointerId);
  });
  storeGallery.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    dragDistance = event.clientX - dragStart;
    storeGallery.scrollLeft = scrollStart - dragDistance;
  });
  const endDrag = (event) => {
    if (dragging) {
      dragging = false;
      storeGallery.classList.remove("is-dragging");
      syncIndex();
      showCard(storeIndex);
      if (storeGallery.hasPointerCapture(event.pointerId)) {
        storeGallery.releasePointerCapture(event.pointerId);
      }
    }
    startAutoplay();
  };
  storeGallery.addEventListener("pointerup", endDrag);
  storeGallery.addEventListener("pointercancel", endDrag);
  // Cards are links with images; stop the browser's native drag-and-drop from
  // hijacking a mouse drag (it would cancel the pointer and snap back).
  storeGallery.addEventListener("dragstart", (event) => event.preventDefault());
  // A drag should not count as a click on the card link.
  storeGallery.addEventListener(
    "click",
    (event) => {
      if (Math.abs(dragDistance) > 8) {
        event.preventDefault();
        event.stopPropagation();
        dragDistance = 0;
      }
    },
    true,
  );
  storeGallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showCard(storeIndex - 1);
    if (event.key === "ArrowRight") showCard(storeIndex + 1);
  });
  carouselMedia.addEventListener("change", () => {
    storeIndex = 0;
    storeGallery.scrollTo({ left: 0, behavior: "auto" });
    startAutoplay();
  });
  whileOnScreen(storeGallery, (onScreen) => {
    inView = onScreen;
    startAutoplay();
  });
}

// 7. Event popup --------------------------------------------------------------
// Opens shortly after load unless "오늘 하루 보지 않기" was chosen today.
// Slides advance when the active progress bar's CSS animation ends
// (popup.css), so pausing that animation also pauses the slider.
const eventPopup = document.querySelector("[data-event-popup]");
if (eventPopup) {
  const SNOOZE_KEY = "simmons-popup-hidden-until";
  const modalMedia = window.matchMedia("(max-width: 900px)");
  const viewport = eventPopup.querySelector("[data-popup-viewport]");
  const track = eventPopup.querySelector("[data-popup-track]");
  const slides = [...track.children];
  const bars = [...eventPopup.querySelectorAll(".popup-progress i")];
  let popupIndex = 0;
  let dragStart = 0;
  let dragOffset = 0;
  let dragging = false;
  let hovering = false;
  let keyboardFocus = false;

  const isOpen = () => !eventPopup.classList.contains("is-hidden");
  const snoozed = () => {
    try {
      return Number(localStorage.getItem(SNOOZE_KEY)) > Date.now();
    } catch {
      return false;
    }
  };
  const updateAccessibility = () => {
    eventPopup.setAttribute(
      "aria-modal",
      String(modalMedia.matches && isOpen()),
    );
    // inert hides the closed popup from screen readers and keyboard focus.
    eventPopup.toggleAttribute("inert", !isOpen());
  };
  const openPopup = () => {
    eventPopup.classList.remove("is-hidden");
    document.body.classList.add("has-event-popup");
    updateAccessibility();
  };
  const closePopup = ({ snooze = false } = {}) => {
    eventPopup.classList.add("is-hidden");
    document.body.classList.remove("has-event-popup");
    updateAccessibility();
    if (!snooze) return;
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    try {
      localStorage.setItem(SNOOZE_KEY, String(midnight.getTime()));
    } catch {
      // Storage blocked (e.g. private mode): the popup just shows next visit.
    }
  };

  const showSlide = (nextIndex) => {
    popupIndex = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(${popupIndex * -100}%)`;
    slides.forEach((slide, index) =>
      slide.toggleAttribute("inert", index !== popupIndex),
    );
    bars.forEach((bar, index) => {
      bar.classList.toggle("is-done", index < popupIndex);
      bar.classList.toggle("is-active", index === popupIndex);
    });
  };
  const syncPause = () =>
    eventPopup.classList.toggle(
      "is-paused",
      hovering || keyboardFocus || dragging,
    );

  // Autoplay: next slide when the active progress bar finishes filling.
  bars.forEach((bar) =>
    bar.addEventListener("animationend", () => {
      if (motionAllowed && isOpen()) showSlide(popupIndex + 1);
    }),
  );
  eventPopup.addEventListener("mouseenter", () => {
    hovering = canHover.matches;
    syncPause();
  });
  eventPopup.addEventListener("mouseleave", () => {
    hovering = false;
    syncPause();
  });
  eventPopup.addEventListener("focusin", (event) => {
    keyboardFocus = event.target.matches(":focus-visible");
    syncPause();
  });
  eventPopup.addEventListener("focusout", () => {
    keyboardFocus = false;
    syncPause();
  });

  // Swipe / drag between slides.
  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button > 0) return;
    event.preventDefault();
    dragging = true;
    dragStart = event.clientX;
    dragOffset = 0;
    eventPopup.classList.add("is-dragging");
    viewport.setPointerCapture(event.pointerId);
    syncPause();
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    dragOffset = event.clientX - dragStart;
    track.style.transform = `translateX(calc(${popupIndex * -100}% + ${dragOffset}px))`;
  });
  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    eventPopup.classList.remove("is-dragging");
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    const swiped = Math.abs(dragOffset) > viewport.clientWidth * 0.18;
    showSlide(popupIndex + (swiped ? (dragOffset < 0 ? 1 : -1) : 0));
    syncPause();
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener(
    "click",
    (event) => {
      if (Math.abs(dragOffset) > 8) event.preventDefault();
    },
    true,
  );

  // Buttons and keys.
  eventPopup
    .querySelector("[data-popup-prev]")
    .addEventListener("click", () => showSlide(popupIndex - 1));
  eventPopup
    .querySelector("[data-popup-next]")
    .addEventListener("click", () => showSlide(popupIndex + 1));
  eventPopup.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showSlide(popupIndex - 1);
    if (event.key === "ArrowRight") showSlide(popupIndex + 1);
  });
  eventPopup
    .querySelector("[data-popup-close]")
    .addEventListener("click", () => closePopup());
  eventPopup
    .querySelector("[data-popup-today]")
    .addEventListener("click", () => closePopup({ snooze: true }));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) closePopup();
  });
  modalMedia.addEventListener("change", updateAccessibility);

  showSlide(0);
  updateAccessibility();
  if (!snoozed()) setTimeout(openPopup, 600);
}

// 8. Closing statement: reveal once it is mostly on screen -------------------
const closingSection = document.querySelector("[data-closing-section]");
if (closingSection) {
  new IntersectionObserver(
    ([entry], observer) => {
      if (!entry.isIntersecting) return;
      closingSection.classList.add("is-counted");
      observer.disconnect();
    },
    { threshold: 0.45 },
  ).observe(closingSection);
}

// 9. Prototype-only behaviour --------------------------------------------------
// This renewal is a visual prototype: placeholder links (href="#"), the
// newsletter form and the quick buttons stay on the page. Links with a real
// target (in-page sections like #options, the main renewal site) still work.
// Replace this block when connecting real pages.
document
  .querySelectorAll(
    '.site-header a[href="#"], main a[href="#"], .event-popup a[href="#"], .site-footer a[href="#"]',
  )
  .forEach((link) => {
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", (event) => event.preventDefault());
    link.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") event.preventDefault();
    });
  });
document
  .querySelector(".newsletter form")
  ?.addEventListener("submit", (event) => event.preventDefault());
document.querySelectorAll("[data-quick]").forEach((button) => {
  button.addEventListener("click", (event) => event.preventDefault());
});
