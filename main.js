(() => {
  "use strict";

  const config = window.SITE_CONFIG || {};
  const analyticsKey = "aiProjectsAnalytics";
  const promoStorageKey = "aiSummerPromoCode";
  const toast = document.querySelector("#toast");
  const toastTitle = document.querySelector("#toast-title");
  const toastMessage = document.querySelector("#toast-message");
  const promoInput = document.querySelector("#promo-code");
  const promoForm = document.querySelector("#promo-form");
  const promoStatus = document.querySelector("#promo-status");
  const promoResult = document.querySelector("#promo-result");
  let toastTimer;
  let appliedPromo = "";
  let lastTrackedPromo = "";

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

    console.log("[AI-Лето]", event);
  }

  function isPlaceholder(value) {
    return !value || value === "#" || /^PASTE_/i.test(value.trim());
  }

  function normalizePromo(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "-").slice(0, 50);
  }

  function readStoredPromo() {
    try {
      return normalizePromo(localStorage.getItem(promoStorageKey));
    } catch (error) {
      return "";
    }
  }

  function savePromo(code) {
    try {
      localStorage.setItem(promoStorageKey, code);
    } catch (error) {
      console.warn("Не удалось сохранить промокод в localStorage", error);
    }
  }

  function urlWithCurrentQuery(rawUrl, promo = "") {
    if (/^mailto:/i.test(String(rawUrl || ""))) return rawUrl;

    const target = new URL(rawUrl, window.location.href);
    const sourceParams = new URLSearchParams(window.location.search);

    sourceParams.forEach((value, key) => {
      if (key !== "promo" && !target.searchParams.has(key)) {
        target.searchParams.set(key, value);
      }
    });

    if (promo) target.searchParams.set("promo", promo);
    return target.href;
  }

  function showToast(title, message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 7500);
  }

  function getContactEmail() {
    return isPlaceholder(config.contactEmail) ? "info@ai-leto.ru" : config.contactEmail;
  }

  async function copyContactEmail() {
    const email = getContactEmail();

    try {
      await navigator.clipboard.writeText(email);
      showToast("Email скопирован", `Откройте любую почту и напишите на ${email}.`);
      track("email_copy_click", { email });
    } catch (error) {
      console.warn("Не удалось скопировать email", error);
      showToast("Email для связи", email);
      track("email_copy_failed", { email });
    }
  }

  function showPromoState(code, shouldTrack = true) {
    appliedPromo = normalizePromo(code);
    if (!appliedPromo) return;

    if (promoInput) promoInput.value = appliedPromo;
    if (promoResult) promoResult.hidden = false;
    if (promoStatus) {
      promoStatus.textContent = `Промокод ${appliedPromo} сохранен. Его действительность и индивидуальные условия проверяются на странице оплаты.`;
      promoStatus.classList.add("is-success");
    }
    document.querySelectorAll("[data-applied-promo]").forEach((node) => {
      node.textContent = appliedPromo;
    });
    document.documentElement.classList.add("promo-applied");
    savePromo(appliedPromo);

    if (shouldTrack) track("promo_applied", { promo: appliedPromo });
  }

  document.querySelectorAll("[data-config-price]").forEach((node) => {
    node.textContent = config.productPrice || config.standardPrice || "999 ₽";
  });
  document.querySelectorAll("[data-config-standard-price]").forEach((node) => {
    node.textContent = config.standardPrice || config.productPrice || "999 ₽";
  });
  document.querySelectorAll("[data-config-partner-price]").forEach((node) => {
    node.textContent = config.partnerPrice || "около 399 ₽";
  });
  document.querySelectorAll("[data-config-name]").forEach((node) => {
    node.textContent = config.productName || "AI-Лето: 7 AI-проектов на лето";
  });

  document.querySelectorAll("[data-payment]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (button.dataset.event) track(button.dataset.event);
      const paymentType = button.dataset.paymentType || "partner";
      const buttonUrl = button.getAttribute("href");
      const configuredPaymentUrl = paymentType === "standard"
        ? config.standardPaymentUrl
        : (config.partnerPaymentUrl || config.paymentUrl);
      const paymentUrl = !isPlaceholder(buttonUrl) ? buttonUrl : configuredPaymentUrl;
      track("buy_click", { source: button.dataset.event || "payment_button", paymentType });

      if (isPlaceholder(paymentUrl)) {
        track("payment_url_missing", { source: button.dataset.event || "payment_button", paymentType });
        if (paymentType === "standard") {
          showToast(
            "Ссылка на покупку за 999 ₽ скоро появится",
            "Пока можно купить по коду площадки или написать нам на info@ai-leto.ru."
          );
        } else {
          showToast(
            "Ссылка на оплату по коду скоро появится",
            "Напишите нам на info@ai-leto.ru, если код уже есть, а кнопка не открывается."
          );
        }
        return;
      }

      try {
        window.location.assign(urlWithCurrentQuery(paymentUrl));
      } catch (error) {
        console.error("Некорректная ссылка на оплату", error);
        track("payment_url_missing", { source: button.dataset.event || "payment_button", paymentType, reason: "invalid_url" });
        showToast("Не удалось открыть оплату", "Проверьте ссылку или свяжитесь с нами по email.");
      }
    });
  });

  promoInput?.addEventListener("change", () => {
    const code = normalizePromo(promoInput.value);
    if (code && code !== lastTrackedPromo) {
      lastTrackedPromo = code;
      track("promo_entered", { promo: code });
    }
  });

  promoForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = normalizePromo(promoInput?.value);
    if (!code) {
      if (promoStatus) {
        promoStatus.textContent = "Введите промокод.";
        promoStatus.classList.remove("is-success");
      }
      promoInput?.focus();
      return;
    }

    if (code !== lastTrackedPromo) {
      lastTrackedPromo = code;
      track("promo_entered", { promo: code });
    }
    showPromoState(code, true);
  });

  document.querySelectorAll("[data-promo-open]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#promo")?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => promoInput?.focus(), 500);
    });
  });

  document.querySelectorAll("[data-organization-cta]").forEach((button) => {
    button.addEventListener("click", (event) => {
      track("organization_cta_click", { source: button.textContent.trim() });
      const buttonUrl = button.getAttribute("href");
      const targetUrl = !isPlaceholder(buttonUrl) ? buttonUrl : config.organizationFormUrl;

      if (!isPlaceholder(targetUrl) && /^mailto:/i.test(targetUrl)) {
        return;
      }

      event.preventDefault();

      if (isPlaceholder(config.organizationFormUrl)) {
        const email = getContactEmail();
        showToast("Напишите нам на email", `Чтобы получить промокод, напишите на ${email}.`);
        document.querySelector("#organization-application")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      try {
        window.location.assign(urlWithCurrentQuery(config.organizationFormUrl));
      } catch (error) {
        console.error("Некорректная ссылка на форму", error);
        showToast("Не удалось открыть форму", "Пожалуйста, свяжитесь с нами по email.");
      }
    });
  });

  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      copyContactEmail();
    });
  });

  document.querySelectorAll("[data-event]").forEach((element) => {
    if (element.hasAttribute("data-payment") || element.hasAttribute("data-organization-cta")) return;
    element.addEventListener("click", () => track(element.dataset.event));
  });

  document.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) track("faq_open", { question: details.querySelector("summary")?.textContent.trim() || "" });
    });
  });

  document.querySelectorAll("[data-contact-email]").forEach((emailLink) => {
    if (!isPlaceholder(config.contactEmail)) {
      emailLink.textContent = config.contactEmail;
      emailLink.href = `mailto:${config.contactEmail}`;
    } else {
      emailLink.addEventListener("click", (event) => event.preventDefault());
    }
  });

  const storedPromo = readStoredPromo();
  if (storedPromo) showPromoState(storedPromo, false);

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
