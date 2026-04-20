// ── DEFAULTS ──────────────────────────────────────────────────────────────────
const DEFAULT_PARAMS = {
  grasaMaxPorcion: 5,
  grasaSaturadaMaxPorcion: 2,
  notas: "Límite de grasa por porción. Ajustá según tu tolerancia personal.",
  alimentosProhibidos: [
    "manteca","margarina","crema de leche","crema","nata",
    "queso cremoso","queso blando","reggianito","provolone","parmesano","gruyere","cheddar","roquefort",
    "cerdo graso","falda","asado","matambre","cordero","achuras","vísceras","picadillo",
    "fiambre","chacinado","embutido","salame","chorizo","morcilla","jamón crudo",
    "frito","fritura","rebozado","empanado",
    "chocolate","dulce de leche",
    "maní","maníes","papas fritas","chizitos","palitos",
    "bebida alcohólica","alcohol","cerveza","vino","gaseosa",
    "aderezo","mayonesa","ketchup",
    "pastelería","medialunas","facturas","croissant",
    "nueces","almendras","frutos secos"
  ],
  alimentosPermitidos: [
    "pollo sin piel","pechuga","merluza","lenguado","pescadilla","brótola","corvina",
    "arroz","fideos","pasta","pan francés","mignón","tostado",
    "zanahoria","calabaza","zapallo","zapallito","remolacha","papa hervida","batata hervida",
    "manzana","pera","durazno","damasco",
    "leche descremada","yogur descremado","ricota descremada",
    "claras","huevo poché","huevo duro",
    "aceite de oliva crudo","aceite en spray",
    "mermelada","miel",
    "té","mate cocido","manzanilla","infusión"
  ],
  advertencias: [
    "brócoli","coliflor","repollo","repollito","cebolla","ajo",
    "legumbres","lentejas","garbanzos","porotos",
    "huevo entero","yema",
    "atún en aceite","salmón","caballa",
    "jamón cocido","jamón del país"
  ]
};

const STORAGE_KEY = "vesicula_params_v2";

function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_PARAMS));
}

function saveParamsToStorage(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

let params = loadParams();

// ── UTILS ─────────────────────────────────────────────────────────────────────
function parseNum(val) {
  if (val === null || val === undefined || val === "") return 0;
  return parseFloat(String(val).replace(",", ".")) || 0;
}

function normalize(str) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

// ── ANALYSIS ──────────────────────────────────────────────────────────────────
function analyzeLabel(grasa, grasaSat, porcionGramos, cantidadGramos) {
  const g = parseNum(grasa);
  const gs = parseNum(grasaSat);
  const porcion = parseNum(porcionGramos) || null;
  const cantidad = parseNum(cantidadGramos) || null;

  if (g === 0) return { estado: "si", razon: "Sin grasa declarada. Está bien.", color: "green" };

  let gReal = g, gsReal = gs, cantidadNota = "";
  if (porcion && cantidad && porcion > 0) {
    const factor = cantidad / porcion;
    gReal = parseFloat((g * factor).toFixed(1));
    gsReal = parseFloat((gs * factor).toFixed(1));
    cantidadNota = ` en ${cantidad}g`;
  }

  const porcionesMax = porcion
    ? Math.round(params.grasaMaxPorcion / g * porcion)
    : null;
  const porcionesLabel = porcionesMax ? ` Podés comer hasta ~${porcionesMax}g.` : "";

  const issues = [];
  if (gReal > params.grasaMaxPorcion)
    issues.push(`Grasa total (${gReal}g${cantidadNota}) supera tu límite de ${params.grasaMaxPorcion}g.`);
  if (gsReal > params.grasaSaturadaMaxPorcion)
    issues.push(`Grasa saturada (${gsReal}g${cantidadNota}) supera tu límite de ${params.grasaSaturadaMaxPorcion}g.`);

  if (issues.length === 0) {
    const base = cantidad
      ? `${cantidad}g tienen ${gReal}g de grasa. Dentro del límite.`
      : `${g}g de grasa por porción. Dentro del límite.`;
    return { estado: "si", razon: base + porcionesLabel, color: "green" };
  }

  const ratio = params.grasaMaxPorcion / gReal;
  if (ratio >= 0.5) {
    const sugerencia = porcion
      ? ` Reducí a ~${Math.round(porcion * ratio)}g.`
      : " Considerá una porción más chica.";
    return { estado: "cuidado", razon: issues.join(" ") + sugerencia, color: "amber" };
  }
  return { estado: "no", razon: issues.join(" ") + porcionesLabel, color: "red" };
}

// Devuelve true si la palabra `word` aparece en `text` pero NO está negada
// (precedida por sin / no / sin llevar / no tiene / no lleva / libre de, etc.)
function mentionedPositively(text, word) {
  const t = normalize(text);
  const w = normalize(word);
  const idx = t.indexOf(w);
  if (idx === -1) return false;
  // Tomamos hasta 30 chars antes del match para buscar negaciones
  const before = t.slice(Math.max(0, idx - 30), idx);
  const negations = ["sin ", "no ", "libre de", "sin llevar", "no tiene", "no lleva", "no contiene", "sin contener"];
  return !negations.some(neg => before.includes(neg));
}

function analyzeText(text) {
  for (const p of params.alimentosProhibidos) {
    if (mentionedPositively(text, p))
      return { estado: "no", razon: `Contiene "${p}", que está en tu lista de evitar.`, color: "red" };
  }
  for (const p of params.advertencias) {
    if (mentionedPositively(text, p))
      return { estado: "cuidado", razon: `"${p}" puede generar molestias. Con moderación.`, color: "amber" };
  }
  for (const p of params.alimentosPermitidos) {
    if (mentionedPositively(text, p))
      return { estado: "si", razon: `"${p}" está en tu lista de permitidos.`, color: "green" };
  }
  return { estado: "consulta", razon: "No encontré este alimento en tus listas. Consultando…", color: "blue" };
}

// ── RENDER RESULT ─────────────────────────────────────────────────────────────
const ICONS  = { si: "✓", no: "✕", cuidado: "⚠", consulta: "?" };
const LABELS = { si: "Podés comerlo", no: "Evitalo", cuidado: "Con moderación", consulta: "Sin datos suficientes" };

function renderResult(containerId, result) {
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <div class="result ${result.color}">
      <div class="result-header">
        <span class="result-icon">${ICONS[result.estado]}</span>
        <span class="result-label">${LABELS[result.estado]}</span>
      </div>
      <p class="result-text">${result.razon}</p>
    </div>`;
}

// ── TAB / MODE SWITCHING ──────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("panel-" + tab).classList.add("active");
  const btns = document.querySelectorAll(".tab-btn");
  const map = { scan: 0, describe: 1, config: 2 };
  btns[map[tab]].classList.add("active");
  if (tab === "config") loadConfigForm();
}

function switchMode(mode) {
  document.getElementById("mode-manual").style.display = mode === "manual" ? "block" : "none";
  document.getElementById("mode-photo").style.display  = mode === "photo"  ? "block" : "none";
  document.querySelectorAll(".mode-btn").forEach((b, i) => {
    b.classList.toggle("active", (i === 0 && mode === "manual") || (i === 1 && mode === "photo"));
  });
  document.getElementById("result-scan").innerHTML = "";
}

// ── SCAN MANUAL ───────────────────────────────────────────────────────────────
function handleScan() {
  const grasa   = document.getElementById("grasa").value;
  const grasaSat= document.getElementById("grasaSat").value;
  const porcion = document.getElementById("porcion").value;
  const cantidad= document.getElementById("cantidad").value;
  if (!grasa) return;
  const result = analyzeLabel(grasa, grasaSat, porcion, cantidad);
  renderResult("result-scan", result);
}

// ── SCAN PHOTO ────────────────────────────────────────────────────────────────
let photoGrasa = "", photoGrasaSat = "", photoPorcion = "";

function handlePhotoFile(input) {
  const file = input.files[0];
  if (!file) return;

  // Preview
  const url = URL.createObjectURL(file);
  document.getElementById("preview-img").src = url;
  document.getElementById("photo-preview").style.display = "block";
  document.getElementById("photo-btn").style.display = "none";
  document.getElementById("photo-spinner").style.display = "flex";
  document.getElementById("read-summary").style.display = "none";
  document.getElementById("photo-cantidad-wrap").style.display = "none";
  document.getElementById("result-scan").innerHTML = "";

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(",")[1];
    const mimeType = file.type || "image/jpeg";
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
              { type: "text", text: `Analizá esta etiqueta nutricional. Extraé los valores POR PORCIÓN: grasa total, grasa saturada (en gramos), y tamaño de porción en gramos si está visible. Respondé SOLO con JSON sin markdown ni backticks: {"grasaTotal": número o null, "grasaSaturada": número o null, "porcionGramos": número o null}` }
            ]
          }]
        })
      });
      const data = await resp.json();
      const text = (data.content || []).find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.grasaTotal !== null && parsed.grasaTotal !== undefined) {
        photoGrasa    = String(parsed.grasaTotal ?? "");
        photoGrasaSat = String(parsed.grasaSaturada ?? "");
        photoPorcion  = String(parsed.porcionGramos ?? "");

        let summary = `Grasa ${photoGrasa}g`;
        if (photoGrasaSat) summary += ` · Sat. ${photoGrasaSat}g`;
        if (photoPorcion)  summary += ` · Porción ${photoPorcion}g`;
        document.getElementById("read-text").textContent = summary;
        document.getElementById("read-summary").style.display = "flex";
        document.getElementById("photo-cantidad-wrap").style.display = "block";

        // Auto-analyze
        handleScanFromPhoto();
      } else {
        renderResult("result-scan", { estado: "consulta", razon: "No pude leer los valores. Usá el modo manual.", color: "blue" });
        switchMode("manual");
      }
    } catch (e) {
      renderResult("result-scan", { estado: "consulta", razon: "Error al leer la imagen. Intentá de nuevo o usá el modo manual.", color: "blue" });
    }
    document.getElementById("photo-spinner").style.display = "none";
    input.value = "";
  };
  reader.readAsDataURL(file);
}

function handleScanFromPhoto() {
  const cantidad = document.getElementById("cantidad-photo").value;
  const result = analyzeLabel(photoGrasa, photoGrasaSat, photoPorcion, cantidad);
  renderResult("result-scan", result);
}

function resetPhoto() {
  photoGrasa = ""; photoGrasaSat = ""; photoPorcion = "";
  document.getElementById("photo-preview").style.display = "none";
  document.getElementById("photo-btn").style.display = "flex";
  document.getElementById("read-summary").style.display = "none";
  document.getElementById("photo-cantidad-wrap").style.display = "none";
  document.getElementById("result-scan").innerHTML = "";
  document.getElementById("cantidad-photo").value = "";
}

// ── DESCRIBE ──────────────────────────────────────────────────────────────────
async function handleDescribe() {
  const description = document.getElementById("description").value.trim();
  if (!description) return;

  const btn = document.getElementById("btn-describe");
  btn.disabled = true;
  btn.textContent = "Consultando…";
  document.getElementById("result-describe").innerHTML = "";

  const local = analyzeText(description);
  if (local.estado === "si" || local.estado === "no") {
    renderResult("result-describe", local);
    btn.disabled = false;
    btn.textContent = "Consultar";
    return;
  }

  try {
    const sysPrompt = `Eres un asistente dietético especializado en dieta hipograsa para vesícula biliar con cálculos (sin cólicos recurrentes).
Alimentos PROHIBIDOS: ${params.alimentosProhibidos.join(", ")}.
Alimentos a CUIDAR (moderación): ${params.advertencias.join(", ")}.
Alimentos PERMITIDOS: ${params.alimentosPermitidos.join(", ")}.
Límite de grasa: ${params.grasaMaxPorcion}g por porción.
Regla: bajo en grasas saturadas, sin fritos, sin lácteos enteros, sin carnes grasas. Pescado blanco MUY bien. Sushi de pescado blanco con arroz permitido.
Respondé SOLO con JSON sin markdown: {"estado":"si"|"no"|"cuidado","razon":"explicación breve en español"}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: sysPrompt,
        messages: [{ role: "user", content: `¿Puedo comer esto? ${description}` }]
      })
    });
    const data = await resp.json();
    const text = (data.content || []).find(b => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const colorMap = { si: "green", no: "red", cuidado: "amber" };
    renderResult("result-describe", { ...parsed, color: colorMap[parsed.estado] || "blue" });
  } catch {
    renderResult("result-describe", local);
  }

  btn.disabled = false;
  btn.textContent = "Consultar";
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
function loadConfigForm() {
  document.getElementById("cfg-grasa").value    = params.grasaMaxPorcion;
  document.getElementById("cfg-grasaSat").value = params.grasaSaturadaMaxPorcion;
  document.getElementById("cfg-prohibidos").value   = params.alimentosProhibidos.join(", ");
  document.getElementById("cfg-advertencias").value = params.advertencias.join(", ");
  document.getElementById("cfg-permitidos").value   = params.alimentosPermitidos.join(", ");
  document.getElementById("cfg-notas").value        = params.notas;
}

function saveConfig() {
  params = {
    grasaMaxPorcion: parseNum(document.getElementById("cfg-grasa").value) || 5,
    grasaSaturadaMaxPorcion: parseNum(document.getElementById("cfg-grasaSat").value) || 2,
    notas: document.getElementById("cfg-notas").value,
    alimentosProhibidos: document.getElementById("cfg-prohibidos").value.split(",").map(s=>s.trim()).filter(Boolean),
    advertencias: document.getElementById("cfg-advertencias").value.split(",").map(s=>s.trim()).filter(Boolean),
    alimentosPermitidos: document.getElementById("cfg-permitidos").value.split(",").map(s=>s.trim()).filter(Boolean),
  };
  saveParamsToStorage(params);
  switchTab("scan");
  updateFooter();
}

function resetConfig() {
  if (!confirm("¿Restaurar todos los parámetros a los valores originales?")) return;
  params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
  saveParamsToStorage(params);
  loadConfigForm();
  updateFooter();
}

function updateFooter() {
  document.getElementById("footer-note").textContent = params.notas || "";
}

// ── PWA INSTALL ───────────────────────────────────────────────────────────────
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("install-banner").style.display = "flex";
});

function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    dismissInstall();
  });
}

function dismissInstall() {
  document.getElementById("install-banner").style.display = "none";
}

window.addEventListener("appinstalled", () => dismissInstall());

// ── INIT ──────────────────────────────────────────────────────────────────────
updateFooter();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}


