/** Seleção de Elementos da Interface **/
const qrContainer = document.querySelector("#qrcode");
const generateButton = document.querySelector("#gr_Gen");
const downloadButton = document.querySelector(".downloadBtn");
const shareButton = document.querySelector("#share_btn");
const copyButton = document.querySelector("#copy_btn");
const textInput = document.querySelector("#text");
const mainTextarea = document.querySelector("#mainTextarea");
const mainTextareaCounter = document.querySelector("#mainTextareaCounter");
const textareaFooter = document.querySelector("#textareaFooter");
const copyTextareaBtn = document.querySelector("#copy_textarea_btn");
const pasteTextareaBtn = document.querySelector("#paste_textarea_btn");
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
const qrThemeInputs = document.querySelectorAll('input[name="qrTheme"]');
const clearButton = document.querySelector("#clear_btn");
const historyList = document.querySelector("#historyList");
const clearHistoryBtn = document.querySelector("#clear_history");
const installBanner = document.querySelector("#pwa-install-banner");
const installBtn = document.querySelector("#install-pwa-btn");
const closeBannerBtn = document.querySelector("#close-install-banner");

let deferredPrompt;

/** Configurações do Gerador **/
const QR_EXPORT_SIZE = 1500;
const QR_PREVIEW_SIZE = 240;
const MAX_WA_MESSAGE_LENGTH = 250;
const MAX_TEXT_LENGTH = 150;
const WATERMARK_PATH = "assets/Ativo 1logo.png";
const MAX_HISTORY = 5;
const DEFAULT_PREVIEW_TEXT = "Francisco Armando";

const QR_THEMES = {
  claro: {
    bg: "#000000",
    dots: "#ffffff"
  },
  escuro: {
    bg: "#ffffff",
    dots: "#000000"
  }
};
const DEFAULT_QR_THEME = "claro";

/** Gera uma prévia padrão ao iniciar ou resetar **/
async function renderDefaultPreview() {
  const blob = await createWatermarkedCanvas(DEFAULT_PREVIEW_TEXT, QR_PREVIEW_SIZE);
  const imageUrl = URL.createObjectURL(blob);
  const img = document.createElement("img");
  img.src = imageUrl;
  img.onload = () => URL.revokeObjectURL(imageUrl);
  qrContainer.innerHTML = "";
  qrContainer.appendChild(img);
  setStatus("QR padrão carregado. Digite um texto e gere o seu.");
}

/** Carregamento da Marca d'água (Logo Central) **/
const watermarkImage = new Image();
const watermarkReady = new Promise((resolve) => {
  watermarkImage.onload = () => resolve(watermarkImage);
  watermarkImage.onerror = (e) => {
    console.error("Erro ao carregar a imagem da marca d'água:", e);
    resolve(null);
  };
});

watermarkImage.src = WATERMARK_PATH;

let lastGeneratedPayload = "";
let selectedQrTheme = DEFAULT_QR_THEME;

/** Obtém o modo selecionado (texto, url, wifi, whatsapp) **/
function getSelectedMode() {
  return document.querySelector('input[name="qrType"]:checked')?.value || "";
}

/** Atualiza a mensagem de status na UI **/
function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

/** Gerenciamento do Histórico Local **/
function addToHistory(payload, mode) {
  let history = JSON.parse(localStorage.getItem("linkos_history") || "[]");
  const newItem = {
    payload,
    mode,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString()
  };

  // Evita duplicados consecutivos
  if (history.length > 0 && history[0].payload === payload) return;

  history.unshift(newItem);
  history = history.slice(0, MAX_HISTORY);
  localStorage.setItem("linkos_history", JSON.stringify(history));
  renderHistory();
}

/** Renderiza a lista de itens do histórico no HTML **/
function renderHistory() {
  const history = JSON.parse(localStorage.getItem("linkos_history") || "[]");
  if (history.length === 0) {
    historyList.innerHTML = '<p class="emptyHistory">Nenhum QR code gerado ainda.</p>';
    return;
  }

  historyList.innerHTML = history.map((item, index) => `
    <div class="historyItem" onclick="loadHistoryItem(${index})">
      <span>${item.mode.toUpperCase()}: ${item.payload.substring(0, 20)}${item.payload.length > 20 ? '...' : ''}</span>
      <small>${item.timestamp}</small>
    </div>
  `).join('');
}

/** Carrega um item do histórico de volta para os campos **/
window.loadHistoryItem = (index) => {
  const history = JSON.parse(localStorage.getItem("linkos_history") || "[]");
  const item = history[index];
  if (!item) return;

  // Restaurar o modo
  const radio = document.querySelector(`input[name="qrType"][value="${item.mode}"]`);
  if (radio) {
    radio.checked = true;
    updateModeFields(item.mode);
  }

  // Restaurar payload (simplificado: joga no campo de texto se não for wifi)
  if (item.mode !== 'wifi') {
    textInput.value = item.payload;
  }

  generateQrCode();
};

/** Compartilha o QR Code gerado (Nativo Mobile) **/
async function shareQrCode() {
  if (!lastGeneratedPayload) return;
  const blob = await createWatermarkedCanvas(lastGeneratedPayload, QR_EXPORT_SIZE);
  const file = new File([blob], "qrcode.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Meu QR Code', text: 'Gerado via linkOS' }); }
    catch (err) { console.error("Erro ao compartilhar:", err); }
  } else { setStatus("Seu navegador não suporta compartilhamento de arquivos.", true); }
}

/** Copia a imagem do QR Code para a área de transferência **/
async function copyQrCode() {
  if (!lastGeneratedPayload) return;
  try {
    const blob = await createWatermarkedCanvas(lastGeneratedPayload, QR_EXPORT_SIZE);
    const item = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([item]);
    setStatus("QR Code copiado para a área de transferência!");
  } catch (err) {
    console.error("Erro ao copiar:", err);
    setStatus("Não foi possível copiar a imagem.", true);
  }
}

/** Salva o estado atual dos campos no LocalStorage **/
function saveState() {
  const state = {
    mode: getSelectedMode(),
    text: textInput.value,
    longText: mainTextarea.value,
    wifi: {
      ssid: wifiSsidInput.value,
      pass: wifiPasswordInput.value,
      sec: wifiSecuritySelect.value,
      hid: wifiHiddenInput.checked
    },
    wa: waMessageInput.value,
    qrTheme: selectedQrTheme,
    hasQr: !!lastGeneratedPayload
  };
  localStorage.setItem("linkos_state", JSON.stringify(state));
}

/** Carrega o estado salvo anteriormente **/
function loadState() {
  const saved = localStorage.getItem("linkos_state");
  if (!saved) {
    void renderDefaultPreview();
    return;
  }

  const state = JSON.parse(saved);
  textInput.value = state.text || "";
  mainTextarea.value = state.longText || "";
  wifiSsidInput.value = state.wifi?.ssid || "";
  wifiPasswordInput.value = state.wifi?.pass || "";
  wifiSecuritySelect.value = state.wifi?.sec || "WPA";
  wifiHiddenInput.checked = !!state.wifi?.hid;
  waMessageInput.value = state.wa || "";

  selectedQrTheme = state.qrTheme || DEFAULT_QR_THEME;

  modeInputs.forEach(input => {
    if (input.value === state.mode) input.checked = true;
  });

  qrThemeInputs.forEach(input => {
    if (input.value === selectedQrTheme) input.checked = true;
  });

  if (state.hasQr) {
    generateQrCode();
  } else {
    void renderDefaultPreview();
  }
}

/** Normaliza URLs adicionando https:// caso falte **/
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

/** Validação simples de URL **/
function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Escapa caracteres especiais para o protocolo WIFI **/
function escapeWifiValue(value) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/** Constrói o Payload para redes Wi-Fi **/
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

/** Coleta os dados dos campos conforme o modo e retorna a string do QR Code **/
function getQrPayload() {
  const mode = getSelectedMode();
  const value = (mode === "text" ? mainTextarea.value : textInput.value).trim();

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

/** Gera o Canvas do QR Code usando a biblioteca QRCodeStyling com a marca d'água **/
async function createWatermarkedCanvas(payload, size) {
  const qrRenderContainer = document.createElement("div");

  qrRenderContainer.style.position = "fixed";
  qrRenderContainer.style.left = "-99999px";
  qrRenderContainer.style.top = "0";
  qrRenderContainer.style.padding = "0";
  const theme = QR_THEMES[selectedQrTheme] || QR_THEMES[DEFAULT_QR_THEME];
  qrRenderContainer.style.background = theme.bg;
  document.body.appendChild(qrRenderContainer);

  const qrCode = new QRCodeStyling({
    width: size,
    height: size,
    data: payload,
    margin: 0,
    qrOptions: {
      errorCorrectionLevel: "H"
    },
    dotsOptions: {
      type: "rounded", // Cantos arredondados!
      color: theme.dots
    },
    backgroundOptions: {
      color: theme.bg
    },
    image: WATERMARK_PATH,
    imageOptions: {
      imageSize: 0.25, // Tamanho da logo
      margin: 4, // Margem em volta da logo
      hideBackgroundDots: true
    }
  });

  qrCode.append(qrRenderContainer);
  return qrCode.getRawData("png").then(buffer => {
    qrRenderContainer.remove();
    return new Blob([buffer], { type: "image/png" });
  });
}

/** Renderiza o QR Code na tela (Previa) **/
async function renderQrCode(payload) {
  qrContainer.innerHTML = "";
  const blob = await createWatermarkedCanvas(payload, QR_PREVIEW_SIZE);

  if (!blob) {
    setStatus("Nao foi possivel renderizar o QR code.", true);
    return false;
  }

  const imageUrl = URL.createObjectURL(blob);
  const img = document.createElement("img");
  img.src = imageUrl;
  img.onload = () => URL.revokeObjectURL(imageUrl);
  qrContainer.appendChild(img);
  return true;
}

/** Orquestra a geração do QR Code e atualiza os botões **/
async function generateQrCode() {
  const payload = getQrPayload();

  if (!payload) {
    downloadButton.disabled = true;
    copyButton.disabled = true;
    shareButton.disabled = true;
    lastGeneratedPayload = "";
    return;
  }

  const rendered = await renderQrCode(payload);

  if (!rendered) {
    downloadButton.disabled = true;
    copyButton.disabled = true;
    shareButton.disabled = true;
    lastGeneratedPayload = "";
    return;
  }

  lastGeneratedPayload = payload;
  downloadButton.disabled = false;
  copyButton.disabled = false;
  shareButton.disabled = false;
  setStatus("QR code gerado com sucesso.");
  saveState();
  addToHistory(payload, getSelectedMode());
}

/** Realiza o download do QR Code em alta resolução **/
async function downloadQrCode() {
  const downloadLink = document.createElement("a");

  if (!lastGeneratedPayload) {
    setStatus("Gere um QR code antes de baixar.", true);
    return;
  }

  const blob = await createWatermarkedCanvas(lastGeneratedPayload, QR_EXPORT_SIZE);

  if (!blob) {
    setStatus("Nao foi possivel gerar o arquivo para download.", true);
    return;
  }

  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = "linkos-qrcode.png";
  downloadLink.click();
  URL.revokeObjectURL(downloadLink.href);
}

/** Atualiza o esquema de cores do QR Code **/
async function updateQrTheme(themeName) {
  selectedQrTheme = QR_THEMES[themeName] ? themeName : DEFAULT_QR_THEME;

  if (!lastGeneratedPayload) {
    setStatus("Tema do QR atualizado. Gere um QR code para visualizar.", false);
    return;
  }

  const rendered = await renderQrCode(lastGeneratedPayload);

  if (!rendered) {
    setStatus("Nao foi possivel aplicar o novo tema.", true);
    return;
  }

  setStatus("Tema do QR code atualizado.");
  saveState();
}

/** Atualiza contador de caracteres do Textarea principal **/
function updateMainTextareaCounter() {
  const currentLength = mainTextarea.value.length;
  mainTextareaCounter.textContent = `${currentLength}/${MAX_TEXT_LENGTH}`;

  if (currentLength > MAX_TEXT_LENGTH) {
    if (!mainTextareaCounter.classList.contains("exceeded")) {
      mainTextareaCounter.classList.add("shake");
      mainTextareaCounter.addEventListener("animationend", () => {
        mainTextareaCounter.classList.remove("shake");
      }, { once: true });
    }
    mainTextareaCounter.classList.add("exceeded");
    if (getSelectedMode() === "text") generateButton.disabled = true;
  } else {
    mainTextareaCounter.classList.remove("exceeded");
    if (getSelectedMode() === "text") generateButton.disabled = false;
  }
}

/** Atualiza contador de caracteres da mensagem de WhatsApp **/
function updateWaMessageCounter() {
  const currentLength = waMessageInput.value.length;
  waMessageCounter.textContent = `${currentLength}/${MAX_WA_MESSAGE_LENGTH}`;

  if (currentLength > MAX_WA_MESSAGE_LENGTH) {
    if (!waMessageCounter.classList.contains("exceeded")) {
      waMessageCounter.classList.add("shake");
      waMessageCounter.addEventListener("animationend", () => {
        waMessageCounter.classList.remove("shake");
      }, { once: true });
    }
    waMessageCounter.classList.add("exceeded");
    if (getSelectedMode() === "whatsapp") generateButton.disabled = true;
  } else {
    waMessageCounter.classList.remove("exceeded");
    if (getSelectedMode() === "whatsapp") generateButton.disabled = false;
  }
}

/** Limpa todos os campos da aplicação **/
function clearAllFields() {
  // Limpa todos os inputs
  textInput.value = "";
  mainTextarea.value = "";
  wifiSsidInput.value = "";
  wifiPasswordInput.value = "";
  wifiSecuritySelect.value = "WPA";
  wifiHiddenInput.checked = false;
  waMessageInput.value = "";

  // Atualiza contadores e estado dos botões
  updateWaMessageCounter();
  updateMainTextareaCounter();

  // Reseta altura do textarea
  mainTextarea.style.height = "100px";

  // Reseta a prévia e o estado interno
  qrContainer.innerHTML = "";
  lastGeneratedPayload = "";
  downloadButton.disabled = true;
  copyButton.disabled = true;
  shareButton.disabled = true;
  generateButton.disabled = false;
  localStorage.removeItem("linkos_state");

  setStatus("Campos limpos. Escolha um tipo e digite o conteúdo.");
}

/** Alterna a exibição dos campos dependendo do tipo de QR selecionado **/
function updateModeFields(mode) {
  const isWifiMode = mode === "wifi";
  const isWhatsappMode = mode === "whatsapp";
  const isTextMode = mode === "text";

  wifiFields.classList.toggle("is-hidden", !isWifiMode);
  whatsappFields.classList.toggle("is-hidden", !isWhatsappMode);

  // Alterna entre Input e Textarea
  textInput.classList.toggle("is-hidden", isTextMode);
  mainTextarea.classList.toggle("is-hidden", !isTextMode);
  mainTextareaCounter.classList.toggle("is-hidden", !isTextMode);
  textareaFooter.classList.toggle("is-hidden", !isTextMode);
  copyTextareaBtn.classList.toggle("is-hidden", !isTextMode);
  pasteTextareaBtn.classList.toggle("is-hidden", !isTextMode);
  textInput.disabled = isWifiMode || isTextMode;

  if (mode === "url") {
    textInput.placeholder = "https://exemplo.com";
    generateButton.disabled = false;
  } else if (mode === "text") {
    textInput.placeholder = "Escreva um texto";
    updateMainTextareaCounter();
    generateButton.disabled = false;
  } else if (mode === "whatsapp") {
    textInput.placeholder = "Ex.: +258 999999999";
    updateWaMessageCounter(); // Atualiza o contador ao selecionar o modo WhatsApp
  } else if (isWifiMode) {
    textInput.placeholder = "Use os campos de Wi-Fi abaixo";
    generateButton.disabled = false;
  } else {
    textInput.placeholder = "Escreva um texto ou cole uma URL";
    generateButton.disabled = false;
  }
}

/** Event Listeners **/
generateButton.addEventListener("click", () => {
  void generateQrCode();
});

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem("linkos_history");
  renderHistory();
});

clearButton.addEventListener("click", clearAllFields);

downloadButton.addEventListener("click", () => {
  void downloadQrCode();
});

textInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void generateQrCode();
  }
});

mainTextarea.addEventListener("input", () => {
  mainTextarea.style.height = "auto";
  mainTextarea.style.height = mainTextarea.scrollHeight + "px";
  updateMainTextareaCounter();
});

copyTextareaBtn.addEventListener("click", () => {
  const text = mainTextarea.value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Texto copiado!");
  }).catch(() => {
    setStatus("Erro ao copiar texto.", true);
  });
});

pasteTextareaBtn.addEventListener("click", () => {
  navigator.clipboard.readText().then(text => {
    if (text) {
      mainTextarea.value = text;
      mainTextarea.dispatchEvent(new Event('input'));
      showToast("Texto colado!");
    }
  }).catch(() => {
    setStatus("Erro ao colar texto. Verifique as permissões.", true);
  });
});

window.addEventListener('beforeinstallprompt', (e) => {
  // Impede o banner padrão do navegador
  e.preventDefault();
  // Guarda o evento para disparar depois
  deferredPrompt = e;
  // Mostra o nosso banner personalizado
  installBanner.classList.remove('is-hidden');
});

/** Lógica de instalação PWA **/
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install: ${outcome}`);
  deferredPrompt = null;
  installBanner.classList.add('is-hidden');
});

closeBannerBtn.addEventListener('click', () => {
  installBanner.classList.add('is-hidden');
});

window.addEventListener('appinstalled', () => {
  installBanner.classList.add('is-hidden');
  showToast("LinkOS instalado com sucesso!");
});

shareButton.addEventListener("click", shareQrCode);

copyButton.addEventListener("click", copyQrCode);

waMessageInput.addEventListener("input", () => {
  updateWaMessageCounter();
});

qrThemeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    void updateQrTheme(input.value);
  });
});

/** Mostra notificação Toast temporária **/
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fas fa-check-circle" style="color:var(--c1)"></i> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

/** Registro do Service Worker **/
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && !navigator.serviceWorker.controller) {
              showToast("LinkOS pronto para uso offline!");
            }
          };
        };
      })
      .catch(err => console.log('Erro no SW', err));
  });
}

const SPLASH_PHRASES = [
  "Gerando conexões...",
  "Dica: Tente o modo escuro!",
  "Rápido. Simples. LinkOS.",
  "Seu QR Code, seu estilo.",
  "Otimizando sua experiência...",
  "Quase lá..."
];

/** Inicialização do App com simulação de carregamento (Skeletons) **/
function initApp() {
  const splash = document.getElementById('splash-screen');
  const phraseEl = document.getElementById('splash-phrase');
  // Ativa bloqueio de scroll e estado de loading inicial
  document.body.classList.add('no-scroll', 'is-loading');

  if (phraseEl) phraseEl.textContent = SPLASH_PHRASES[Math.floor(Math.random() * SPLASH_PHRASES.length)];

  updateModeFields(getSelectedMode());
  renderHistory();

  // Elementos que receberão o estado de skeleton
  const skeletonElements = [
    textInput,
    mainTextarea,
    generateButton,
    clearButton,
    statusMessage,
    downloadButton,
    shareButton,
    copyButton,
    document.querySelector('.qr_mode'),
    document.querySelector('#themeElement')
  ];

  // Aplica a classe skeleton e injeta o círculo no QR container
  skeletonElements.forEach(el => el?.classList.add('skeleton'));
  qrContainer.innerHTML = '<div class="skeleton skeleton-circle"><div class="spinner"></div></div>';

  // Aguarda 2 segundos (simulação de carregamento)
  const minWait = new Promise(resolve => setTimeout(resolve, 2000));

  // Otimização de fontes: espera o navegador carregar as fontes antes de prosseguir
  Promise.all([minWait, document.fonts.ready]).then(() => {
    // Remove bloqueios e inicia a transição de nitidez (blur -> sharp)
    document.body.classList.remove('no-scroll', 'is-loading');

    // Remove o Splash Screen adicionando a classe de fade-out
    if (splash) splash.classList.add('fade-out');

    // Aplica o efeito de fade-out suave em todos os skeletons
    const activeSkeletons = document.querySelectorAll('.skeleton, .skeleton-circle');
    activeSkeletons.forEach(el => el.classList.add('skeleton-fade-out'));

    // Aguarda o fim da transição de opacidade (500ms) para limpar e restaurar a UI
    setTimeout(() => {
      skeletonElements.forEach(el => el?.classList.remove('skeleton', 'skeleton-fade-out'));
      qrContainer.innerHTML = '';
      loadState();
    }, 500);
  }, 2000);
}

initApp();
