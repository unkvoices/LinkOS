const qrContainer = document.querySelector("#qrcode");
const generateButton = document.querySelector("#gr_Gen");
const downloadButton = document.querySelector(".downloadBtn");
const textInput = document.querySelector("#text");
const statusMessage = document.querySelector("#statusMessage");
const modeInputs = document.querySelectorAll('input[name="qrType"]');

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
    setStatus("Digite algum conteúdo antes de gerar o QR code.", true);
    return null;
  }

  if (!mode) {
    setStatus("Selecione um tipo de QR code.", true);
    return null;
  }

  if (mode === "vcard" || mode === "wifi") {
    setStatus("Os modos vCard e Wi-fi ainda não foram implementados nesta versão.", true);
    return null;
  }

  if (mode === "url") {
    const normalizedUrl = normalizeUrl(value);

    if (!isValidUrl(normalizedUrl)) {
      setStatus("Digite uma URL válida para gerar o QR code.", true);
      return null;
    }

    return normalizedUrl;
  }

  return value;
}

function renderQrCode(payload) {
  qrContainer.innerHTML = "";
  new QRCode(qrContainer, {
    text: payload,
    width: 240,
    height: 240,
    colorDark: "#e1e2e3",
    colorLight: "#04373d",
    correctLevel: QRCode.CorrectLevel.H
  });
}

function generateQrCode() {
  const payload = getQrPayload();

  if (!payload) {
    downloadButton.disabled = true;
    return;
  }

  renderQrCode(payload);
  downloadButton.disabled = false;
  setStatus("QR code gerado com sucesso.");
}

function downloadQrCode() {
  const qrImage = qrContainer.querySelector("img");
  const qrCanvas = qrContainer.querySelector("canvas");
  const downloadLink = document.createElement("a");

  if (qrImage?.src) {
    downloadLink.href = qrImage.src;
  } else if (qrCanvas) {
    downloadLink.href = qrCanvas.toDataURL("image/png");
  } else {
    setStatus("Gere um QR code antes de baixar.", true);
    return;
  }

  downloadLink.download = "linkos-qrcode.png";
  downloadLink.click();
}

generateButton.addEventListener("click", generateQrCode);
downloadButton.addEventListener("click", downloadQrCode);

textInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    generateQrCode();
  }
});

modeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.value === "url") {
      textInput.placeholder = "https://exemplo.com";
    } else {
      textInput.placeholder = "Escreva um texto ou cole uma URL";
    }

    setStatus("Modo atualizado. Gere um novo QR code para aplicar a mudança.");
  });
});
