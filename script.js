const qrContainer = document.querySelector("#qrcode");
const generateButton = document.querySelector("#gr_Gen");
const downloadButton = document.querySelector(".downloadBtn");
const textInput = document.querySelector("#text");
const wifiFields = document.querySelector("#wifiFields");
const wifiSsidInput = document.querySelector("#wifiSsid");
const wifiPasswordInput = document.querySelector("#wifiPassword");
const wifiSecuritySelect = document.querySelector("#wifiSecurity");
const wifiHiddenInput = document.querySelector("#wifiHidden");
const whatsappFields = document.querySelector("#whatsappFields");
const waMessageInput = document.querySelector("#waMessage");
const waMessageCounter = document.querySelector("#waMessageCounter");
const statusMessage = document.querySelector("#statusMessage");
const modeInputs = document.querySelectorAll('input[name="qrType"]');
const colorPalette = document.querySelector(".colorPalette");
const colorSwatches = document.querySelectorAll(".colorSwatch");
const moreColorsButton = document.querySelector(".moreColorsBtn");
const optionTabs = document.querySelectorAll(".optionTab");
const optionTabIndicator = document.querySelector(".optionTabIndicator");
const optionCarousel = document.querySelector(".optionCarousel");
const directionButtons = document.querySelectorAll(".directionBtn");
const positionButtons = document.querySelectorAll(".positionBtn");
const clearButton = document.querySelector("#clear_btn");

const QR_EXPORT_SIZE = 1000;
const QR_PREVIEW_SIZE = 240;
const QR_LIGHT_COLOR = "#04373d";
const DEFAULT_PRESET = "frost";
const DEFAULT_DIRECTION = "diagonal";
const DEFAULT_WATERMARK_POSITION = "bottom-right";
const MAX_WA_MESSAGE_LENGTH = 250; // Limite de caracteres para a mensagem do WhatsApp
const WATERMARK_PATH = "assets/linkos-watermark.png";

const QR_PRESETS = {
  frost: {
    type: "linear",
    colors: ["#f4f7fb", "#cfd9df", "#8fa5b3"],
    angle: 135
  },
  aqua: {
    type: "linear",
    colors: ["#d9f8ff", "#0cb8cf", "#0a6170"],
    angle: 135
  },
  whatsapp: {
    type: "linear",
    colors: ["#25D366", "#128C7E", "#075E54"],
    angle: 135
  },
  forest: {
    type: "linear",
    colors: ["#d7ffd9", "#38b000", "#14532d"],
    angle: 135
  },
  sunset: {
    type: "linear",
    colors: ["#fff0c9", "#ffd166", "#ff7b00"],
    angle: 135
  },
  ember: {
    type: "linear",
    colors: ["#ffd6d6", "#f23131", "#7a0404"],
    angle: 135
  },
  copper: {
    type: "linear",
    colors: ["#ffd7c2", "#ff7b00", "#8a3b12"],
    angle: 135
  },
  violet: {
    type: "linear",
    colors: ["#f0dbff", "#9d4edd", "#3c096c"],
    angle: 135
  },
  berry: {
    type: "linear",
    colors: ["#ffd6eb", "#ff4d8d", "#7a003c"],
    angle: 135
  },
  lagoon: {
    type: "linear",
    colors: ["#d7fff8", "#2ec4b6", "#004e64"],
    angle: 135
  },
  lime: {
    type: "linear",
    colors: ["#f4ffd2", "#9ef01a", "#4f772d"],
    angle: 135
  },
  gold: {
    type: "linear",
    colors: ["#fff7d6", "#ffca3a", "#9c6644"],
    angle: 135
  },
  mono: {
    type: "linear",
    colors: ["#fafafa", "#8c8c8c", "#101010"],
    angle: 135
  }
};

const watermarkImage = new Image();
const watermarkReady = new Promise((resolve) => {
  watermarkImage.onload = () => resolve(watermarkImage);
  watermarkImage.onerror = () => resolve(null);
});

watermarkImage.src = WATERMARK_PATH;

let lastGeneratedPayload = "";
let selectedPreset = DEFAULT_PRESET;
let selectedDirection = DEFAULT_DIRECTION;
let selectedWatermarkPosition = DEFAULT_WATERMARK_POSITION;

function getSelectedMode() {
  return document.querySelector('input[name="qrType"]:checked')?.value || "";
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function normalizeUrl(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeWifiValue(value) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function buildWifiPayload() {
  const ssid = wifiSsidInput.value.trim();
  const password = wifiPasswordInput.value.trim();
  const security = wifiSecuritySelect.value;
  const hidden = wifiHiddenInput.checked;

  if (!ssid) {
    setStatus("Digite o nome da rede Wi-Fi.", true);
    return null;
  }

  if (security !== "nopass" && !password) {
    setStatus("Digite a senha da rede Wi-Fi.", true);
    return null;
  }

  const escapedSsid = escapeWifiValue(ssid);
  const escapedPassword = escapeWifiValue(password);
  const hiddenValue = hidden ? "true" : "false";

  return `WIFI:T:${security};S:${escapedSsid};P:${escapedPassword};H:${hiddenValue};;`;
}

function getQrPayload() {
  const value = textInput.value.trim();
  const mode = getSelectedMode();

  if (mode === "wifi") {
    return buildWifiPayload();
  }

  if (!value) {
    setStatus("Digite algum conteudo antes de gerar o QR code.", true);
    return null;
  }

  if (!mode) {
    setStatus("Selecione um tipo de QR code.", true);
    return null;
  }

  if (mode === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    // Um número de WhatsApp internacional geralmente tem entre 11 e 13 dígitos (DDI + DDD + Número).
    // Por exemplo, Brasil: 55 (DDI) + 11 (DDD) + 9xxxx-xxxx (9 dígitos) = 13 dígitos.
    // Um mínimo de 11 dígitos ajuda a garantir que o DDI esteja presente.
    if (!digits || digits.length < 11) {
      setStatus("Digite um número de WhatsApp válido, incluindo o código do país (DDI) e DDD (Ex.: 5511999999999).", true);
      return null;
    }

    const message = waMessageInput.value.trim();
    if (waMessageInput.value.length > MAX_WA_MESSAGE_LENGTH) {
      setStatus(`A mensagem excede o limite de ${MAX_WA_MESSAGE_LENGTH} caracteres. Reduza o texto para gerar o QR code.`, true);
      return null;
    }

    const messageParam = message ? `?text=${encodeURIComponent(message)}` : "";
    return `https://wa.me/${digits}${messageParam}`;
  }

  if (mode === "url") {
    const normalizedUrl = normalizeUrl(value);

    if (!isValidUrl(normalizedUrl)) {
      setStatus("Digite uma URL valida para gerar o QR code.", true);
      return null;
    }

    return normalizedUrl;
  }

  return value;
}

function syncActiveSwatch() {
  colorSwatches.forEach((swatch) => {
    const isActive = swatch.dataset.preset === selectedPreset;
    swatch.classList.toggle("is-active", isActive);
    swatch.setAttribute("aria-pressed", String(isActive));
  });
}

function syncActiveDirection() {
  directionButtons.forEach((button) => {
    const isActive = button.dataset.direction === selectedDirection;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncActivePosition() {
  positionButtons.forEach((button) => {
    const isActive = button.dataset.position === selectedWatermarkPosition;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncActiveOptionTab(targetId) {
  let activeTab = null;

  optionTabs.forEach((tab) => {
    const isActive = tab.dataset.target === targetId;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));

    if (isActive) {
      activeTab = tab;
    }
  });

  updateOptionIndicator(activeTab);
}

function updateOptionIndicator(activeTab) {
  if (!optionTabIndicator || !activeTab) {
    return;
  }

  const tabsRect = activeTab.parentElement.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  const left = tabRect.left - tabsRect.left;

  optionTabIndicator.style.width = `${tabRect.width}px`;
  optionTabIndicator.style.transform = `translateX(${left}px)`;
}

function toggleExtraColors() {
  const expanded = colorPalette.classList.toggle("is-expanded");
  moreColorsButton.textContent = expanded ? "-" : "+";
  moreColorsButton.setAttribute("aria-expanded", String(expanded));
  moreColorsButton.setAttribute("aria-label", expanded ? "Mostrar menos cores" : "Mostrar mais cores");
}

function drawCircle(context, x, y, radius) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.closePath();
}

function getGradientEndpoints(size, angle) {
  const radians = angle * (Math.PI / 180);
  const center = size / 2;
  const radius = size / 2;
  const offsetX = Math.cos(radians) * radius;
  const offsetY = Math.sin(radians) * radius;

  return {
    x0: center - offsetX,
    y0: center - offsetY,
    x1: center + offsetX,
    y1: center + offsetY
  };
}

function createPresetGradient(context, size) {
  const preset = QR_PRESETS[selectedPreset] || QR_PRESETS[DEFAULT_PRESET];
  let gradient;

  if (selectedDirection === "vertical") {
    gradient = context.createLinearGradient(size / 2, 0, size / 2, size);
  } else if (selectedDirection === "radial") {
    gradient = context.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.62);
  } else {
    const { x0, y0, x1, y1 } = getGradientEndpoints(size, preset.angle || 135);
    gradient = context.createLinearGradient(x0, y0, x1, y1);
  }

  const step = 1 / Math.max(1, preset.colors.length - 1);

  preset.colors.forEach((color, index) => {
    gradient.addColorStop(index * step, color);
  });

  return gradient;
}

function paintQrModules(sourceCanvas, size) {
  const outputCanvas = document.createElement("canvas");
  const context = outputCanvas.getContext("2d");
  const sourceContext = sourceCanvas.getContext("2d");
  const sourceImage = sourceContext.getImageData(0, 0, size, size);
  const gradientCanvas = document.createElement("canvas");
  const gradientContext = gradientCanvas.getContext("2d");
  const gradient = createPresetGradient(gradientContext, size);

  outputCanvas.width = size;
  outputCanvas.height = size;
  gradientCanvas.width = size;
  gradientCanvas.height = size;
  gradientContext.fillStyle = gradient;
  gradientContext.fillRect(0, 0, size, size);

  const gradientImage = gradientContext.getImageData(0, 0, size, size);
  const outputImage = context.createImageData(size, size);

  for (let index = 0; index < sourceImage.data.length; index += 4) {
    const red = sourceImage.data[index];
    const green = sourceImage.data[index + 1];
    const blue = sourceImage.data[index + 2];
    const alpha = sourceImage.data[index + 3];
    const isModule = alpha > 0 && red < 128 && green < 128 && blue < 128;

    if (!isModule) {
      outputImage.data[index] = 4;
      outputImage.data[index + 1] = 55;
      outputImage.data[index + 2] = 61;
      outputImage.data[index + 3] = 255;
      continue;
    }

    outputImage.data[index] = gradientImage.data[index];
    outputImage.data[index + 1] = gradientImage.data[index + 1];
    outputImage.data[index + 2] = gradientImage.data[index + 2];
    outputImage.data[index + 3] = 255;
  }

  context.putImageData(outputImage, 0, 0);
  return outputCanvas;
}

function getWatermarkCoordinates(size, badgeSize, badgeMargin) {
  if (selectedWatermarkPosition === "center") {
    return {
      x: Math.round((size - badgeSize) / 2),
      y: Math.round((size - badgeSize) / 2)
    };
  }

  if (selectedWatermarkPosition === "bottom-left") {
    return {
      x: badgeMargin,
      y: size - badgeSize - badgeMargin
    };
  }

  if (selectedWatermarkPosition === "top-right") {
    return {
      x: size - badgeSize - badgeMargin,
      y: badgeMargin
    };
  }

  return {
    x: size - badgeSize - badgeMargin,
    y: size - badgeSize - badgeMargin
  };
}

async function addWatermarkToCanvas(sourceCanvas, size) {
  const outputCanvas = document.createElement("canvas");
  const context = outputCanvas.getContext("2d");
  const logo = await watermarkReady;
  const badgeSize = Math.round(size * 0.16);
  const badgeRadius = badgeSize / 2;
  const badgeMargin = Math.round(size * 0.08);
  const { x: badgeX, y: badgeY } = getWatermarkCoordinates(size, badgeSize, badgeMargin);
  const badgeCenterX = badgeX + badgeRadius;
  const badgeCenterY = badgeY + badgeRadius;

  outputCanvas.width = size;
  outputCanvas.height = size;

  context.imageSmoothingEnabled = true;
  context.drawImage(sourceCanvas, 0, 0, size, size);

  drawCircle(context, badgeCenterX, badgeCenterY, badgeRadius + Math.round(size * 0.01));
  context.fillStyle = "rgba(225, 226, 227, 0.96)";
  context.fill();

  drawCircle(context, badgeCenterX, badgeCenterY, badgeRadius);
  context.fillStyle = QR_LIGHT_COLOR;
  context.fill();
  context.lineWidth = Math.max(2, Math.round(size * 0.004));
  context.strokeStyle = "rgba(12, 184, 207, 0.92)";
  context.stroke();

  if (!logo) {
    return outputCanvas;
  }

  context.save();
  drawCircle(context, badgeCenterX, badgeCenterY, badgeRadius - Math.round(size * 0.006));
  context.clip();
  context.drawImage(logo, badgeX, badgeY, badgeSize, badgeSize);
  context.restore();

  return outputCanvas;
}

function getCanvasFromImage(imageElement, size) {
  const tempCanvas = document.createElement("canvas");
  const tempContext = tempCanvas.getContext("2d");

  tempCanvas.width = size;
  tempCanvas.height = size;
  tempContext.drawImage(imageElement, 0, 0, size, size);

  return tempCanvas;
}

function waitForImageLoad(imageElement) {
  if (imageElement.complete && imageElement.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    imageElement.onload = () => resolve();
    imageElement.onerror = () => resolve();
  });
}

async function getRenderedSourceCanvas(qrRenderContainer, size) {
  const rawCanvas = qrRenderContainer.querySelector("canvas");

  if (rawCanvas) {
    return rawCanvas;
  }

  const rawImage = qrRenderContainer.querySelector("img");

  if (rawImage) {
    await waitForImageLoad(rawImage);
    return getCanvasFromImage(rawImage, size);
  }

  return null;
}

async function createWatermarkedCanvas(payload, size) {
  const qrRenderContainer = document.createElement("div");

  qrRenderContainer.style.position = "fixed";
  qrRenderContainer.style.left = "-99999px";
  qrRenderContainer.style.top = "0";
  qrRenderContainer.style.padding = "0";
  qrRenderContainer.style.background = QR_LIGHT_COLOR;
  document.body.appendChild(qrRenderContainer);

  new QRCode(qrRenderContainer, {
    text: payload,
    width: size,
    height: size,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  const rawCanvas = await getRenderedSourceCanvas(qrRenderContainer, size);
  let watermarkedCanvas = null;

  if (rawCanvas) {
    const gradientCanvas = paintQrModules(rawCanvas, size);
    watermarkedCanvas = await addWatermarkToCanvas(gradientCanvas, size);
  }

  qrRenderContainer.remove();
  return watermarkedCanvas;
}

async function renderQrCode(payload) {
  qrContainer.innerHTML = "";
  const previewCanvas = await createWatermarkedCanvas(payload, QR_PREVIEW_SIZE);

  if (!previewCanvas) {
    setStatus("Nao foi possivel renderizar o QR code.", true);
    return false;
  }

  qrContainer.appendChild(previewCanvas);
  return true;
}

async function generateQrCode() {
  const payload = getQrPayload();

  if (!payload) {
    downloadButton.disabled = true;
    lastGeneratedPayload = "";
    return;
  }

  const rendered = await renderQrCode(payload);

  if (!rendered) {
    downloadButton.disabled = true;
    lastGeneratedPayload = "";
    return;
  }

  lastGeneratedPayload = payload;
  downloadButton.disabled = false;
  setStatus("QR code gerado com sucesso.");
}

async function downloadQrCode() {
  const downloadLink = document.createElement("a");

  if (!lastGeneratedPayload) {
    setStatus("Gere um QR code antes de baixar.", true);
    return;
  }

  const exportCanvas = await createWatermarkedCanvas(lastGeneratedPayload, QR_EXPORT_SIZE);

  if (!exportCanvas) {
    setStatus("Nao foi possivel gerar o arquivo para download.", true);
    return;
  }

  downloadLink.href = exportCanvas.toDataURL("image/png");
  downloadLink.download = "linkos-qrcode.png";
  downloadLink.click();
}

async function updateQrPreset(presetName) {
  selectedPreset = QR_PRESETS[presetName] ? presetName : DEFAULT_PRESET;
  syncActiveSwatch();

  if (!lastGeneratedPayload) {
    setStatus("Paleta atualizada. Gere um QR code para visualizar.", false);
    return;
  }

  const rendered = await renderQrCode(lastGeneratedPayload);

  if (!rendered) {
    setStatus("Nao foi possivel aplicar a nova paleta.", true);
    return;
  }

  setStatus("Gradiente do QR code atualizado.");
}

async function updateGradientDirection(direction) {
  selectedDirection = ["diagonal", "vertical", "radial"].includes(direction)
    ? direction
    : DEFAULT_DIRECTION;
  syncActiveDirection();

  if (!lastGeneratedPayload) {
    setStatus("Direcao do gradiente atualizada.", false);
    return;
  }

  const rendered = await renderQrCode(lastGeneratedPayload);

  if (!rendered) {
    setStatus("Nao foi possivel aplicar a nova direcao.", true);
    return;
  }

  setStatus("Direcao do gradiente atualizada.");
}

async function updateWatermarkPosition(position) {
  selectedWatermarkPosition = [
    "center",
    "bottom-right",
    "bottom-left",
    "top-right"
  ].includes(position)
    ? position
    : DEFAULT_WATERMARK_POSITION;
  syncActivePosition();

  if (!lastGeneratedPayload) {
    setStatus("Posicao da marca d'agua atualizada.", false);
    return;
  }

  const rendered = await renderQrCode(lastGeneratedPayload);

  if (!rendered) {
    setStatus("Nao foi possivel aplicar a nova posicao.", true);
    return;
  }

  setStatus("Posicao da marca d'agua atualizada.");
}

function updateWaMessageCounter() {
  const currentLength = waMessageInput.value.length;
  waMessageCounter.textContent = `${currentLength}/${MAX_WA_MESSAGE_LENGTH}`;

  if (currentLength > MAX_WA_MESSAGE_LENGTH) {
    waMessageCounter.classList.add("exceeded");
    if (getSelectedMode() === "whatsapp") generateButton.disabled = true;
  } else {
    waMessageCounter.classList.remove("exceeded");
    if (getSelectedMode() === "whatsapp") generateButton.disabled = false;
  }
}

function clearAllFields() {
  // Limpa todos os inputs
  textInput.value = "";
  wifiSsidInput.value = "";
  wifiPasswordInput.value = "";
  wifiSecuritySelect.value = "WPA";
  wifiHiddenInput.checked = false;
  waMessageInput.value = "";

  // Atualiza contadores e estado dos botões
  updateWaMessageCounter();
  
  // Reseta a prévia e o estado interno
  qrContainer.innerHTML = "";
  lastGeneratedPayload = "";
  downloadButton.disabled = true;
  generateButton.disabled = false;

  setStatus("Campos limpos. Escolha um tipo e digite o conteúdo.");
}

function scrollToOption(targetId) {
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "start"
  });
  syncActiveOptionTab(targetId);
}

function updateModeFields(mode) {
  const isWifiMode = mode === "wifi";
  const isWhatsappMode = mode === "whatsapp";

  wifiFields.classList.toggle("is-hidden", !isWifiMode);
  whatsappFields.classList.toggle("is-hidden", !isWhatsappMode);
  textInput.disabled = isWifiMode;

  if (mode === "url") {
    textInput.placeholder = "https://exemplo.com";
    generateButton.disabled = false;
  } else if (mode === "text") {
    textInput.placeholder = "Escreva um texto";
    generateButton.disabled = false;
  } else if (mode === "whatsapp") {
    textInput.placeholder = "Ex.: 5511999999999";
    updateWaMessageCounter(); // Atualiza o contador ao selecionar o modo WhatsApp
  } else if (isWifiMode) {
    textInput.placeholder = "Use os campos de Wi-Fi abaixo";
    generateButton.disabled = false;
  } else {
    textInput.placeholder = "Escreva um texto ou cole uma URL";
    generateButton.disabled = false;
  }
}

generateButton.addEventListener("click", () => {
  void generateQrCode();
});

downloadButton.addEventListener("click", () => {
  void downloadQrCode();
});

moreColorsButton.addEventListener("click", toggleExtraColors);

textInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void generateQrCode();
  }
});

clearButton.addEventListener("click", clearAllFields);

waMessageInput.addEventListener("input", () => {
  updateWaMessageCounter();
});

colorSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    void updateQrPreset(swatch.dataset.preset);
  });
});

optionTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    scrollToOption(tab.dataset.target);
  });
});

directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void updateGradientDirection(button.dataset.direction);
  });
});

positionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void updateWatermarkPosition(button.dataset.position);
  });
});

optionCarousel.addEventListener("scroll", () => {
  const panels = Array.from(optionCarousel.querySelectorAll(".optionCard"));
  const carouselLeft = optionCarousel.getBoundingClientRect().left;

  let nearestPanel = panels[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  panels.forEach((panel) => {
    const distance = Math.abs(panel.getBoundingClientRect().left - carouselLeft);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPanel = panel;
    }
  });

  if (nearestPanel?.id) {
    syncActiveOptionTab(nearestPanel.id);
  }
});

window.addEventListener("resize", () => {
  const activeTab = document.querySelector(".optionTab.is-active");
  updateOptionIndicator(activeTab);
});

modeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateModeFields(input.value);
    setStatus("Modo atualizado. Gere um novo QR code para aplicar a mudanca.");
  });
});

syncActiveSwatch();
syncActiveDirection();
syncActivePosition();
syncActiveOptionTab("directionPanel");
updateModeFields(getSelectedMode());
