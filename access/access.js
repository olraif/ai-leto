const ACCESS_FORM_ENDPOINT = ""; // TODO: добавить endpoint проверки заказа, когда он будет готов.

const DOWNLOADS_READY = true;

const AI_LETO_DOWNLOADS = {
  workbook: "/materials/ai-leto-student-workbook-v1.pdf",
  mentorGuide: "/materials/ai-leto-mentor-guide-v1.pdf"
};

const form = document.querySelector("#access-form");
const statusNode = document.querySelector("#form-status");
const downloadsSection = document.querySelector("#downloads");
const downloadStatus = document.querySelector("#download-status");

function configureDownload(link, url) {
  if (!DOWNLOADS_READY) return;
  link.href = url;
  link.setAttribute("download", "");
  link.removeAttribute("aria-disabled");
}

function showDownloads() {
  configureDownload(document.querySelector("#workbook-download"), AI_LETO_DOWNLOADS.workbook);
  configureDownload(document.querySelector("#guide-download"), AI_LETO_DOWNLOADS.mentorGuide);

  downloadStatus.textContent = DOWNLOADS_READY
    ? "Если загрузка не началась, нажмите на нужный материал ещё раз."
    : "Финальные материалы готовятся к загрузке. Если вы уже оплатили заказ, напишите на info@ai-leto.ru.";

  downloadsSection.hidden = false;
  downloadsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getPayload() {
  const data = new FormData(form);
  return {
    orderId: String(data.get("orderId") || "").trim(),
    email: String(data.get("email") || "").trim(),
    partnerCode: String(data.get("partnerCode") || "").trim(),
    personalUseAccepted: data.get("personalUse") === "on"
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusNode.textContent = "";

  if (!form.checkValidity()) {
    form.querySelectorAll("input").forEach((input) => {
      input.classList.toggle("user-invalid", !input.checkValidity());
    });
    form.reportValidity();
    statusNode.textContent = "Проверьте обязательные поля и подтверждение условий.";
    return;
  }

  const payload = getPayload();
  const submitButton = form.querySelector("button[type='submit']");

  if (!ACCESS_FORM_ENDPOINT) {
    showDownloads();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Проверяем заказ…";

  try {
    const response = await fetch(ACCESS_FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    showDownloads();
  } catch (error) {
    console.error("Не удалось проверить заказ", error);
    statusNode.textContent = "Автоматическая проверка временно недоступна. Материалы открыты ниже; при вопросах напишите на info@ai-leto.ru.";
    showDownloads();
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Открыть материалы →";
  }
});

form.addEventListener("input", (event) => {
  if (event.target.matches("input")) event.target.classList.remove("user-invalid");
});

document.querySelectorAll(".download-card[aria-disabled='true']").forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});
