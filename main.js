(() => {
  "use strict";

  const config = window.SITE_CONFIG || {};
  const analyticsKey = "aiProjectsAnalytics";
  const toast = document.querySelector("#toast");
  let toastTimer;

  function track(eventName, details = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      query: window.location.search,
      ...details
    };

    try {
      const stored = JSON.parse(localStorage.getItem(analyticsKey) || "[]");
      const events = Array.isArray(stored) ? stored : [];
      events.push(event);
      localStorage.setItem(analyticsKey, JSON.stringify(events.slice(-100)));
    } catch (error) {
      console.warn("Не удалось сохранить событие в localStorage", error);
    }

    console.log("[Лето с AI]", event);
  }

  function isPlaceholder(value) {
    return !value || value === "#" || /^PASTE_/i.test(value.trim());
  }

  function paymentIsReady() {
    return !isPlaceholder(config.paymentUrl);
  }

  function paymentUrlWithQuery() {
    const target = new URL(config.paymentUrl, window.location.href);
    const sourceParams = new URLSearchParams(window.location.search);
    sourceParams.forEach((value, key) => {
      if (!target.searchParams.has(key)) target.searchParams.set(key, value);
    });
    return target.href;
  }

  function showToast() {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 6500);
  }

  document.querySelectorAll("[data-config-price]").forEach((node) => {
    node.textContent = config.productPrice || "990 ₽";
  });

  document.querySelectorAll("[data-payment]").forEach((button) => {
    button.setAttribute("aria-label", `Купить набор за ${config.productPrice || "990 ₽"}`);
  });

  document.querySelectorAll("[data-config-name]").forEach((node) => {
    node.textContent = config.productName || "7 AI-проектов для школьника на лето";
  });

  const emailLink = document.querySelector("[data-contact-email]");
  if (emailLink && !isPlaceholder(config.contactEmail)) {
    emailLink.textContent = config.contactEmail;
    emailLink.href = `mailto:${config.contactEmail}`;
  } else if (emailLink) {
    emailLink.addEventListener("click", (event) => event.preventDefault());
  }

  document.querySelectorAll("[data-event]").forEach((element) => {
    element.addEventListener("click", () => {
      if (!element.hasAttribute("data-payment")) track(element.dataset.event);
    });
  });

  document.querySelectorAll("[data-payment]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      track(button.dataset.event);

      if (!paymentIsReady()) {
        track("payment_url_missing", { source: button.dataset.event });
        showToast();
        document.querySelector("#inside")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      try {
        window.location.assign(paymentUrlWithQuery());
      } catch (error) {
        console.error("Некорректная ссылка на оплату", error);
        track("payment_url_missing", { source: button.dataset.event, reason: "invalid_url" });
        showToast();
      }
    });
  });

  document.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) {
        track("faq_open", { question: details.querySelector("summary")?.textContent.trim() || "" });
      }
    });
  });

  toast?.querySelector("button")?.addEventListener("click", () => {
    window.clearTimeout(toastTimer);
    toast.classList.remove("is-visible");
  });

  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-nav");
  menuButton?.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    menuButton.setAttribute("aria-label", expanded ? "Открыть меню" : "Закрыть меню");
    navigation?.classList.toggle("is-open", !expanded);
  });

  navigation?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuButton?.setAttribute("aria-expanded", "false");
      menuButton?.setAttribute("aria-label", "Открыть меню");
      navigation.classList.remove("is-open");
    });
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  }

  const year = document.querySelector("#current-year");
  if (year) year.textContent = new Date().getFullYear();
})();
