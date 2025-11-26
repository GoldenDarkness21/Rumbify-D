let QrScannerClass = null;

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed to load script"));
    document.head.appendChild(s);
  });
}

async function loadQrScanner() {
  if (QrScannerClass) return QrScannerClass;
  if (window.QrScanner) {
    QrScannerClass = window.QrScanner;
    return QrScannerClass;
  }
  // Load QR Scanner library from CDN
  console.log('[QR Scanner] Loading from CDN...');
  await injectScript("https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js");
  if (!window.QrScanner) throw new Error("QrScanner global missing after load");
  console.log('[QR Scanner] Loaded successfully');
  QrScannerClass = window.QrScanner;
  return QrScannerClass;
}

function createModal() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "1000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const box = document.createElement("div");
  box.style.width = "90%";
  box.style.maxWidth = "480px";
  box.style.background = "#111";
  box.style.borderRadius = "12px";
  box.style.padding = "16px";
  box.style.color = "#fff";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  const title = document.createElement("h3");
  title.textContent = "Escanear QR";
  title.style.margin = "0";
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Cerrar";
  closeBtn.style.background = "#333";
  closeBtn.style.color = "#fff";
  closeBtn.style.border = "none";
  closeBtn.style.padding = "8px 12px";
  closeBtn.style.borderRadius = "8px";
  closeBtn.style.cursor = "pointer";
  header.appendChild(title);
  header.appendChild(closeBtn);

  const video = document.createElement("video");
  video.style.width = "100%";
  video.style.borderRadius = "8px";
  video.style.marginTop = "12px";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.marginTop = "12px";
  const flipBtn = document.createElement("button");
  flipBtn.textContent = "Cambiar cámara";
  flipBtn.style.flex = "1";
  flipBtn.style.background = "#333";
  flipBtn.style.color = "#fff";
  flipBtn.style.border = "none";
  flipBtn.style.padding = "8px 12px";
  flipBtn.style.borderRadius = "8px";
  flipBtn.style.cursor = "pointer";
  const uploadLabel = document.createElement("label");
  uploadLabel.textContent = "Subir imagen";
  uploadLabel.style.flex = "1";
  uploadLabel.style.background = "#333";
  uploadLabel.style.color = "#fff";
  uploadLabel.style.border = "none";
  uploadLabel.style.padding = "8px 12px";
  uploadLabel.style.borderRadius = "8px";
  uploadLabel.style.cursor = "pointer";
  uploadLabel.style.textAlign = "center";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  uploadLabel.appendChild(fileInput);
  actions.appendChild(flipBtn);
  actions.appendChild(uploadLabel);

  const status = document.createElement("div");
  status.style.marginTop = "8px";
  status.style.fontSize = "12px";
  status.style.color = "#aaa";
  status.textContent = "Permite acceso a la cámara para escanear.";

  box.appendChild(header);
  box.appendChild(video);
  box.appendChild(actions);
  box.appendChild(status);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  return { overlay, closeBtn, video, flipBtn, fileInput, status };
}

export async function openScannerModal({ onDecoded, onError }) {
  const ui = createModal();
  let scanner = null;
  let useBackCamera = true;

  function cleanup() {
    try {
      scanner && scanner.stop();
    } catch (_) {}
    scanner = null;
    ui.overlay.remove();
  }

  ui.closeBtn.addEventListener("click", cleanup);

  const QrScanner = await loadQrScanner();
  scanner = new QrScanner(
    ui.video,
    (payload) => {
      let decoded = '';
      try {
        decoded = typeof payload === 'string' ? payload : (payload?.data || payload?.rawValue || '');
      } catch (_) {}
      if (!decoded) {
        ui.status.textContent = 'No se pudo leer el código, intenta de nuevo.';
        return;
      }
      cleanup();
      if (onDecoded) onDecoded(decoded);
    },
    {
      highlightScanRegion: true,
      highlightCodeOutline: true,
      preferredCamera: useBackCamera ? "environment" : "user",
      maxScansPerSecond: 8,
      onDecodeError: () => {
        ui.status.textContent = "Buscando código…";
      }
    }
  );

  ui.flipBtn.addEventListener("click", async () => {
    useBackCamera = !useBackCamera;
    try {
      await scanner.setCamera(useBackCamera ? "environment" : "user");
    } catch (e) {}
  });

  ui.fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await QrScanner.scanImage(file, {
        returnDetailedScanResult: false,
      });
      cleanup();
      if (onDecoded) onDecoded(res);
    } catch (err) {
      if (onError) onError(err);
    }
  });

  try {
    await scanner.start();
    ui.status.textContent = "Cámara activa. Apunta al código QR.";
  } catch (err) {
    ui.status.textContent = "No se pudo acceder a la cámara.";
    if (onError) onError(err);
  }
}

export async function scanImageFile(file) {
  const QrScanner = await loadQrScanner();
  const res = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
  return typeof res === 'string' ? res : (res?.data || res?.rawValue || '');
}
