const qrContainer = document.querySelector("#qrcode");
const generateButton = document.querySelector("#gr_Gen");
const downloadButton = document.querySelector(".downloadBtn");
const textInput = document.querySelector("#text");
const statusMessage = document.querySelector("#statusMessage");
const modeInputs = document.querySelectorAll('input[name="qrType"]');
const colorPalette = document.querySelector(".colorPalette");
const colorSwatches = document.querySelectorAll(".colorSwatch");
const moreColorsButton = document.querySelector(".moreColorsBtn");
const directionButtons = document.querySelectorAll(".directionBtn");

const QR_EXPORT_SIZE = 1000;
const QR_PREVIEW_SIZE = 240;
const QR_LIGHT_COLOR = "#04373d";
const DEFAULT_PRESET = "frost";
const DEFAULT_DIRECTION = "diagonal";
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

function getQrPayload() {
  const value = textInput.value.trim();
  const mode = getSelectedMode();

  if (!value) {
    setStatus("Digite algum conteudo antes de gerar o QR code.", true);
    return null;
  }

  if (!mode) {
    setStatus("Selecione um tipo de QR code.", true);
    return null;
  }

  if (mode === "vcard" || mode === "wifi") {
    setStatus("Os modos vCard e Wi-fi ainda nao foram implementados nesta versao.", true);
    return null;
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

async function addWatermarkToCanvas(sourceCanvas, size) {
  const outputCanvas = document.createElement("canvas");
  const context = outputCanvas.getContext("2d");
  const logo = await watermarkReady;
  const badgeSize = Math.round(size * 0.2);
  const badgeRadius = badgeSize / 2;
  const badgeX = Math.round((size - badgeSize) / 2);
  const badgeY = Math.round((size - badgeSize) / 2);
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

colorSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    void updateQrPreset(swatch.dataset.preset);
  });
});

directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void updateGradientDirection(button.dataset.direction);
  });
});

modeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.value === "url") {
      textInput.placeholder = "https://exemplo.com";
    } else {
      textInput.placeholder = "Escreva um texto ou cole uma URL";
    }

    setStatus("Modo atualizado. Gere um novo QR code para aplicar a mudanca.");
  });
});

syncActiveSwatch();
syncActiveDirection();
