/*
 * SIMMONS PRODUCT DETAIL — product.js (Beautyrest Black Brigitte)
 * Runs after main.js, which already handles the header, mobile menu,
 * .reveal, the closing statement and placeholder links. Every block only runs
 * if its element exists.
 *
 *   0. Settings & scroll engine        6. Timeline (horizontal gallery)
 *   1. In-page links                   7. Gallery & buy form
 *   2. Hero exit                       8. Accordion
 *   3. Parallax                        9. Dock & page progress
 *   4. Detail zoom                    10. Demo feedback (toast)
 *   5. Anatomy (layer story)
 *
 * Scroll-linked ("scrub") motion only runs on desktop with a fine pointer and
 * motion allowed. Tablet, mobile and reduced-motion get the same states as
 * one-shot transitions or native swipe.
 */
(() => {
  // 0. Settings & scroll engine ---------------------------------------------
  const scrubMedia = window.matchMedia(
    "(min-width: 1101px) and (min-height: 640px) and (hover: hover) and (pointer: fine)",
  );
  const reducedMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canScrub = () => scrubMedia.matches && !reducedMedia.matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));
  const smooth = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const pad = (number) => String(number).padStart(2, "0");
  const headerHeight = () =>
    parseFloat(
      getComputedStyle(document.body).getPropertyValue("--pd-header"),
    ) || 0;

  // 0 → 1 while a tall section scrolls past its pinned (sticky) stage.
  const pinProgress = (rect, viewport, top = headerHeight()) =>
    clamp((top - rect.top) / Math.max(1, rect.height - (viewport - top)));

  // Scroll tasks run in one rAF, only while their element is near the screen.
  const tasks = new Map();
  const nearby = new Set();
  let frame = 0;
  const runTasks = () => {
    frame = 0;
    const viewport = window.innerHeight;
    nearby.forEach((task) => {
      if (task.enabled())
        task.update(task.element.getBoundingClientRect(), viewport);
    });
  };
  const requestRun = () => {
    if (!frame) frame = requestAnimationFrame(runTasks);
  };
  const nearObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        const task = tasks.get(entry.target);
        if (entry.isIntersecting) {
          nearby.add(task);
          // After a jump (anchor, End key) no scroll event may follow.
          requestRun();
        } else {
          // One last update so a fast scroll never leaves a half-way state.
          if (task.enabled()) {
            task.update(entry.boundingClientRect, window.innerHeight);
          }
          nearby.delete(task);
        }
      }),
    { rootMargin: "25% 0px" },
  );
  const addScrollTask = (element, update, enabled = canScrub) => {
    tasks.set(element, { element, update, enabled });
    nearObserver.observe(element);
  };
  window.addEventListener("scroll", requestRun, { passive: true });
  window.addEventListener("resize", requestRun);

  // Components that switch between scrub and one-shot mode register here.
  const modeListeners = [];
  const onModeChange = (listener) => {
    modeListeners.push(listener);
    listener(canScrub());
  };
  const emitMode = () => {
    modeListeners.forEach((listener) => listener(canScrub()));
    requestRun();
  };
  scrubMedia.addEventListener("change", emitMode);
  reducedMedia.addEventListener("change", emitMode);

  // 1. In-page links: smooth scroll and move focus to the section -----------
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({
        behavior: reducedMedia.matches ? "auto" : "smooth",
        block: "start",
      });
      if (!target.hasAttribute("tabindex"))
        target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  // 2. Hero exit: the picture settles back, the copy lifts away -------------
  const hero = document.querySelector("[data-hero]");
  if (hero) {
    addScrollTask(hero, (rect) => {
      hero.style.setProperty(
        "--exit",
        clamp(-rect.top / rect.height).toFixed(3),
      );
    });
    onModeChange((scrub) => {
      if (!scrub) hero.style.removeProperty("--exit");
    });
  }

  // 3. Parallax: photos drift a little slower than their frames -------------
  document.querySelectorAll("[data-parallax]").forEach((figure) => {
    const image = figure.querySelector("img");
    addScrollTask(figure, (rect, viewport) => {
      const progress = clamp((viewport - rect.top) / (viewport + rect.height));
      const range = rect.height * 0.045;
      image.style.setProperty(
        "--py",
        `${((0.5 - progress) * 2 * range).toFixed(1)}px`,
      );
    });
    onModeChange((scrub) => {
      if (!scrub) image.style.removeProperty("--py");
    });
  });

  // 4. Detail zoom: hover magnifies under the cursor, + opens a viewer ------
  const zoomDialog = document.querySelector("[data-zoom-dialog]");
  if (zoomDialog) {
    const zoomImage = zoomDialog.querySelector("[data-zoom-image]");
    const zoomCaption = zoomDialog.querySelector("[data-zoom-caption]");
    zoomDialog
      .querySelector("[data-zoom-close]")
      .addEventListener("click", () => zoomDialog.close());
    // A click on the dimmed backdrop closes it too.
    zoomDialog.addEventListener("click", (event) => {
      if (event.target === zoomDialog) zoomDialog.close();
    });

    document.querySelectorAll("[data-zoom]").forEach((figure) => {
      const frame = figure.querySelector(".pd-figure__frame");
      const image = frame.querySelector("img");
      const open = () => {
        zoomImage.src = image.currentSrc || image.src;
        zoomImage.alt = image.alt;
        zoomCaption.textContent =
          figure.querySelector("figcaption").textContent;
        zoomDialog.showModal();
      };
      figure.querySelector("[data-zoom-open]").addEventListener("click", open);
      frame.addEventListener("click", open);
      frame.addEventListener("pointermove", (event) => {
        if (!finePointer.matches || event.pointerType !== "mouse") return;
        const box = frame.getBoundingClientRect();
        frame.style.setProperty(
          "--zx",
          `${((event.clientX - box.left) / box.width) * 100}%`,
        );
        frame.style.setProperty(
          "--zy",
          `${((event.clientY - box.top) / box.height) * 100}%`,
        );
        frame.classList.add("is-zooming");
      });
      frame.addEventListener("pointerleave", () =>
        frame.classList.remove("is-zooming"),
      );
    });
  }

  // 5. Anatomy: the sticky model opens layer by layer -----------------------
  const anatomy = document.querySelector("[data-anatomy]");
  if (anatomy) {
    const body = anatomy.querySelector(".pd-anatomy__body");
    const stage = anatomy.querySelector(".pd-anatomy__stage");
    const model = anatomy.querySelector("[data-anatomy-model]");
    const layers = [...model.querySelectorAll(".pd-layer")];
    const steps = [...anatomy.querySelectorAll(".pd-step")];
    const count = anatomy.querySelector("[data-anatomy-count]");
    const name = anatomy.querySelector("[data-anatomy-name]");
    const bar = anatomy.querySelector("[data-anatomy-bar]");
    const layerCount = layers.length; // steps 1–5 are layers, 6 is the finale
    let active = 0;
    let scrubbing = false;

    const setExplode = (amount) => {
      model.style.setProperty("--e", amount.toFixed(3));
      model.classList.toggle("is-open", amount > 0.5);
    };
    const setProgress = (amount) =>
      bar.style.setProperty("--progress", amount.toFixed(3));

    const setStep = (index) => {
      if (index === active) return;
      active = index;
      const step = steps[index - 1];
      anatomy.dataset.step = String(index);
      steps.forEach((item) =>
        item.classList.toggle("is-active", item === step),
      );
      layers.forEach((layer) =>
        layer.classList.toggle(
          "is-active",
          Number(layer.dataset.layer) === index,
        ),
      );
      model.classList.toggle("has-active", index <= layerCount);
      count.textContent = pad(index);
      name.textContent = step.dataset.name;
      if (!scrubbing) {
        // One-shot mode: open for the layer steps, close for the finale.
        setExplode(index <= layerCount ? 1 : 0);
        setProgress(index / steps.length);
      }
    };

    // The active step is the one crossing the reading line: the middle of the
    // screen, or of the area under the pinned model on narrow screens.
    // Stacked layout = ≤ 900px, except phones in landscape, which show the
    // model beside the steps (same queries as product.css section 4).
    const stackedMedia = window.matchMedia("(max-width: 900px)");
    const sideBySideMedia = window.matchMedia(
      "(max-width: 900px) and (max-height: 500px) and (orientation: landscape)",
    );
    let stepObserver;
    const observeSteps = () => {
      stepObserver?.disconnect();
      const viewport = window.innerHeight;
      const stacked = stackedMedia.matches && !sideBySideMedia.matches;
      // The pinned model never takes more than half the screen; capping it
      // also guards against reading the height before layout has settled
      // (Safari can run this before styles are applied).
      const top = stacked
        ? headerHeight() + Math.min(stage.offsetHeight, viewport * 0.5)
        : 0;
      const line = top + (viewport - top) / 2;
      const linePercent = clamp((line / viewport) * 100, 10, 90);
      stepObserver = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting)
              setStep(Number(entry.target.dataset.step));
          }),
        {
          rootMargin: `-${(linePercent - 2).toFixed(1)}% 0px -${(98 - linePercent).toFixed(1)}% 0px`,
        },
      );
      steps.forEach((step) => stepObserver.observe(step));
    };
    observeSteps();
    window.addEventListener("load", observeSteps);
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(observeSteps, 200);
    });

    // Desktop: the opening follows the scroll. It opens during step 01 and
    // closes again over the finale.
    addScrollTask(body, (rect, viewport) => {
      const progress = pinProgress(rect, viewport);
      setExplode(
        smooth(progress / 0.1) * (1 - smooth((progress - 0.84) / 0.13)),
      );
      setProgress(progress);
    });
    onModeChange((scrub) => {
      scrubbing = scrub;
      anatomy.classList.toggle("is-scrub", scrub);
      if (!scrub && active) {
        setExplode(active <= layerCount ? 1 : 0);
        setProgress(active / steps.length);
      }
    });
  }

  // 6. Timeline: vertical scroll moves the night sideways (desktop) ---------
  const opening = document.querySelector("[data-scale-reveal]");
  const night = opening?.closest(".pd-night");
  if (opening) {
    addScrollTask(opening, (rect, viewport) => {
      const progress = clamp(-rect.top / Math.max(1, rect.height - viewport));
      opening.style.setProperty("--s", smooth(progress / 0.8).toFixed(3));
    });
    // One-shot mode grows the picture once it is on screen.
    new IntersectionObserver(
      ([entry], observer) => {
        if (!entry.isIntersecting) return;
        opening.classList.add("is-shown");
        observer.disconnect();
      },
      { threshold: 0.35 },
    ).observe(opening);
    onModeChange((scrub) => {
      night.classList.toggle("is-scrub", scrub);
      if (!scrub) opening.style.removeProperty("--s");
    });
  }

  const timeline = document.querySelector("[data-timeline]");
  if (timeline) {
    const track = timeline.querySelector("[data-timeline-track]");
    const sticky = timeline.querySelector(".pd-timeline__sticky");
    const marks = [...timeline.querySelectorAll(".pd-timeline__progress li")];
    const moments = [...track.children];
    let distance = 0;

    const showProgress = (progress) => {
      timeline.style.setProperty("--tl-p", progress.toFixed(3));
      const current = Math.round(progress * (marks.length - 1));
      marks.forEach((mark, index) =>
        mark.classList.toggle("is-active", index === current),
      );
    };

    const measure = () => {
      if (!canScrub()) {
        timeline.style.removeProperty("--tl-height");
        track.style.removeProperty("--tl-x");
        return;
      }
      distance = Math.max(0, track.scrollWidth - track.clientWidth);
      timeline.style.setProperty(
        "--tl-height",
        `${sticky.offsetHeight + distance}px`,
      );
      requestRun();
    };

    addScrollTask(timeline, (rect, viewport) => {
      const progress = pinProgress(rect, viewport);
      track.style.setProperty("--tl-x", (progress * distance).toFixed(1));
      showProgress(progress);
      // Each photo drifts inside its frame while the track moves.
      moments.forEach((moment) => {
        const box = moment.getBoundingClientRect();
        const offset =
          (box.left + box.width / 2 - window.innerWidth / 2) /
          window.innerWidth;
        moment.style.setProperty("--mx", `${(offset * -24).toFixed(1)}px`);
      });
    });

    // Swipe mode: the time marks follow the native horizontal scroll.
    track.addEventListener(
      "scroll",
      () => {
        if (canScrub()) return;
        const max = track.scrollWidth - track.clientWidth;
        showProgress(max > 0 ? track.scrollLeft / max : 0);
      },
      { passive: true },
    );

    // Swipe mode with a mouse (narrow desktop window): drag to scroll, then
    // settle on the nearest card. Touch keeps the native swipe.
    let drag = null;
    const nearestCard = () => {
      const start =
        track.getBoundingClientRect().left +
        parseFloat(getComputedStyle(track).paddingLeft);
      const offsets = moments.map(
        (moment) => moment.getBoundingClientRect().left - start,
      );
      const closest = offsets.reduce((a, b) =>
        Math.abs(b) < Math.abs(a) ? b : a,
      );
      return track.scrollLeft + closest;
    };
    track.addEventListener("pointerdown", (event) => {
      if (canScrub() || event.pointerType !== "mouse" || event.button > 0)
        return;
      drag = { x: event.clientX, left: track.scrollLeft, moved: 0 };
      track.classList.add("is-dragging");
      track.setPointerCapture(event.pointerId);
    });
    track.addEventListener("pointermove", (event) => {
      if (!drag) return;
      drag.moved = event.clientX - drag.x;
      track.scrollLeft = drag.left - drag.moved;
    });
    const endDrag = (event) => {
      if (!drag) return;
      drag = null;
      track.classList.remove("is-dragging");
      if (track.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
      track.scrollTo({
        left: nearestCard(),
        behavior: reducedMedia.matches ? "auto" : "smooth",
      });
    };
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    // Images would otherwise start the browser's own drag-and-drop.
    track.addEventListener("dragstart", (event) => event.preventDefault());

    onModeChange((scrub) => {
      timeline.classList.toggle("is-scrub", scrub);
      // Pinned, the track is not scrollable itself, so it leaves the tab order.
      track.tabIndex = scrub ? -1 : 0;
      if (!scrub)
        moments.forEach((moment) => moment.style.removeProperty("--mx"));
      measure();
    });
    let measureTimer;
    window.addEventListener("resize", () => {
      clearTimeout(measureTimer);
      measureTimer = setTimeout(measure, 150);
    });
    window.addEventListener("load", measure);
  }

  // 7. Gallery & buy form -----------------------------------------------------
  const gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    const images = [...gallery.querySelectorAll("[data-gallery-image]")];
    const thumbs = [...gallery.querySelectorAll("[data-gallery-thumb]")];
    thumbs.forEach((thumb, index) =>
      thumb.addEventListener("click", () => {
        images.forEach((image, i) =>
          image.classList.toggle("is-active", i === index),
        );
        thumbs.forEach((item, i) => {
          item.classList.toggle("is-active", i === index);
          item.setAttribute("aria-pressed", String(i === index));
        });
      }),
    );
  }

  const toast = document.querySelector("[data-toast]");
  let toastTimer;
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3600);
  };

  const won = (number) => `${number.toLocaleString("ko-KR")}원`;
  const dockPrice = document.querySelector("[data-dock-price]");
  const buy = document.querySelector("[data-buy]");
  if (buy) {
    const sizes = [...buy.querySelectorAll('input[name="size"]')];
    const bed = buy.querySelector("[data-size-bed]");
    const sizeLabel = buy.querySelector("[data-size-label]");
    const sizeDims = buy.querySelector("[data-size-dims]");
    const qtyValue = buy.querySelector("[data-qty-value]");
    const [qtyDown, qtyUp] = buy.querySelectorAll("[data-qty]");
    const totalText = buy.querySelector("[data-total-text]");
    const roll = buy.querySelector("[data-total-roll]");
    const MAX = { w: 1900, l: 2075 }; // GK, the dashed outline
    let quantity = 1;

    // Price roll: old figure slides up, new one rises in.
    const rollTo = (text) => {
      const current = roll.lastElementChild;
      if (current.textContent === text) return;
      if (reducedMedia.matches) {
        current.textContent = text;
        return;
      }
      const next = document.createElement("span");
      next.textContent = text;
      next.className = "is-entering";
      roll.append(next);
      requestAnimationFrame(() => {
        current.classList.add("is-leaving");
        next.classList.remove("is-entering");
      });
      setTimeout(() => current.remove(), 560);
    };

    const selected = () => sizes.find((input) => input.checked);
    const render = () => {
      const input = selected();
      const { name, price, w, l } = input.dataset;
      bed.style.setProperty("--w", (w / MAX.w).toFixed(3));
      bed.style.setProperty("--l", (l / MAX.l).toFixed(3));
      sizeLabel.textContent = `${input.value} ${name}`;
      sizeDims.textContent = `${Number(w).toLocaleString("ko-KR")} × ${Number(l).toLocaleString("ko-KR")} × 400mm`;
      qtyValue.textContent = String(quantity);
      qtyDown.disabled = quantity <= 1;
      qtyUp.disabled = quantity >= 9;
      const total = won(Number(price) * quantity);
      totalText.textContent = total;
      rollTo(total);
      if (dockPrice) dockPrice.textContent = won(Number(price));
    };

    sizes.forEach((input) => input.addEventListener("change", render));
    [qtyDown, qtyUp].forEach((button) =>
      button.addEventListener("click", () => {
        quantity = clamp(quantity + Number(button.dataset.qty), 1, 9);
        render();
      }),
    );
    buy.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = selected();
      showToast(
        `${input.value} ${input.dataset.name} ${quantity}개 · ${won(Number(input.dataset.price) * quantity)}\n포트폴리오 데모 화면이라\n결제는 진행되지 않습니다.`,
      );
    });
    render();
  }

  // 8. Accordion: <details> works without JS; this adds the height motion ---
  document.querySelectorAll("[data-accordion] details").forEach((details) => {
    const summary = details.querySelector("summary");
    const content = details.querySelector(".pd-accordion__body");
    const timing = { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
    summary.addEventListener("click", (event) => {
      if (reducedMedia.matches || details.classList.contains("is-closing"))
        return;
      event.preventDefault();
      if (details.open) {
        details.classList.add("is-closing");
        const animation = content.animate(
          [
            { height: `${content.offsetHeight}px`, opacity: 1 },
            { height: "0px", opacity: 0 },
          ],
          timing,
        );
        animation.onfinish = () => {
          details.open = false;
          details.classList.remove("is-closing");
        };
      } else {
        details.open = true;
        content.animate(
          [
            { height: "0px", opacity: 0 },
            { height: `${content.offsetHeight}px`, opacity: 1 },
          ],
          timing,
        );
      }
    });
  });

  // 9. Dock & page progress ---------------------------------------------------
  const dock = document.querySelector("[data-dock]");
  if (dock && hero) {
    const progressBar = dock.querySelector("[data-dock-progress]");
    const links = [...dock.querySelectorAll("[data-dock-link]")];
    // The dock steps aside while any of these is on screen: the buy form's own
    // buttons (the dock would cover them near the bottom edge), the closing
    // CTA and the footer.
    const ends = [
      document.querySelector(".pd-buy__actions"),
      document.querySelector(".pd-closing"),
      document.querySelector(".site-footer"),
    ];
    let pastHero = false;
    const endsInView = new Set();

    const sync = () => {
      const show = pastHero && endsInView.size === 0;
      dock.classList.toggle("is-visible", show);
      dock.inert = !show;
      document.body.classList.toggle("dock-on", show);
      document.body.classList.toggle("past-hero", pastHero);
    };
    new IntersectionObserver(([entry]) => {
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sync();
    }).observe(hero);
    const endObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) =>
        entry.isIntersecting
          ? endsInView.add(entry.target)
          : endsInView.delete(entry.target),
      );
      sync();
    });
    ends.filter(Boolean).forEach((element) => endObserver.observe(element));

    // Highlight the section under the middle of the screen.
    const sectionObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => {
            if (link.getAttribute("href") === `#${entry.target.id}`) {
              link.setAttribute("aria-current", "true");
            } else link.removeAttribute("aria-current");
          });
        }),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    links.forEach((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      if (section) sectionObserver.observe(section);
    });

    // Page scroll progress on the dock's top edge.
    let progressFrame = 0;
    const updateProgress = () => {
      progressFrame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.setProperty(
        "--page-p",
        clamp(window.scrollY / max).toFixed(4),
      );
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!progressFrame)
          progressFrame = requestAnimationFrame(updateProgress);
      },
      { passive: true },
    );
    updateProgress();
  }

  // 10. Demo feedback: placeholder actions explain themselves ---------------
  const demoMessages = {
    // First line = title, then the explanation (.pd-toast is pre-line).
    store:
      "매장 안내\n포트폴리오 데모 화면이라\n매장 안내는 연결되지 않습니다.",
    cart: "장바구니\n포트폴리오 데모 화면이라\n장바구니에 담기지 않습니다.",
  };
  document
    .querySelectorAll("[data-demo]")
    .forEach((element) =>
      element.addEventListener("click", () =>
        showToast(demoMessages[element.dataset.demo]),
      ),
    );

  requestRun();
})();
