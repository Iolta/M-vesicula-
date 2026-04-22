// ── STORAGE Y VARIABLES GLOBALES ──────────────────────────────────────────────
const STORAGE_ALIMENTOS = "vesicula_db_v4";
const STORAGE_LIMITES = "vesicula_limites_v1";

let misAlimentos = [];
let miPlato = [];
let editandoId = null;
let limiteGrasaTotal = 2.0; // Límite por defecto configurado a 2g

const DEFAULT_ALIMENTOS = [
  { id:"b001", nombre:"Pechuga de pollo (sin piel)", categoria:"proteína", nivel:"verde", grasa100g: 1.5, nota:"Magra." },
  { id:"b003", nombre:"Trucha / Pescado blanco", categoria:"proteína", nivel:"verde", grasa100g: 3.0, nota:"Excelente opción." },
  { id:"b009", nombre:"Carne vacuna magra (Lomo)", categoria:"proteína", nivel:"verde", grasa100g: 4.0, nota:"Desgrasada." },
  { id:"f001", nombre:"Zanahoria / Zapallo", categoria:"vegetal", nivel:"verde", grasa100g: 0.1, nota:"Hervidos." },
  { id:"f003", nombre:"Papa / Batata", categoria:"vegetal", nivel:"verde", grasa100g: 0.1, nota:"Hervida o puré sin manteca." },
  { id:"e004", nombre:"Arroz blanco", categoria:"cereal", nivel:"verde", grasa100g: 0.3, nota:"Hervido." },
  { id:"e005", nombre:"Fideos", categoria:"cereal", nivel:"verde", grasa100g: 1.5, nota:"Salsas sin aceite." },
  { id:"i001", nombre:"Aceite de oliva", categoria:"grasa", nivel:"amarillo", grasa100g: 100, nota:"Usar por gotas." },
  { id:"a002", nombre:"Queso untable descremado", categoria:"lácteo", nivel:"verde", grasa100g: 4.0, nota:"Verificar marca." }
];

document.addEventListener("DOMContentLoaded", () => {
    // Cargar Limites (si el usuario ya lo había guardado)
    const limitesGuardados = localStorage.getItem(STORAGE_LIMITES);
    if (limitesGuardados) {
        limiteGrasaTotal = parseFloat(limitesGuardados);
    }
    document.getElementById("limite-visual").innerText = limiteGrasaTotal;

    // Cargar Alimentos
    const guardados = localStorage.getItem(STORAGE_ALIMENTOS);
    if (guardados) {
        misAlimentos = JSON.parse(guardados);
    } else {
        misAlimentos = [...DEFAULT_ALIMENTOS];
        localStorage.setItem(STORAGE_ALIMENTOS, JSON.stringify(misAlimentos));
    }

    renderAlimentos();
    actualizarSelectorMenu();
    
    document.getElementById("search-input").addEventListener("input", renderAlimentos);
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tabId).classList.add('active');
}

// ── LÍMITES PERSONALES ────────────────────────────────────────────────────────

function abrirModalLimites() {
    document.getElementById("limite-grasa").value = limiteGrasaTotal;
    document.getElementById("modal-limites").classList.add("open");
}

function cerrarModalLimites() {
    document.getElementById("modal-limites").classList.remove("open");
}

function guardarLimites() {
    const nuevoLimite = parseFloat(document.getElementById("limite-grasa").value.replace(',', '.'));
    if (!isNaN(nuevoLimite) && nuevoLimite > 0) {
        limiteGrasaTotal = nuevoLimite;
        localStorage.setItem(STORAGE_LIMITES, limiteGrasaTotal);
        document.getElementById("limite-visual").innerText = limiteGrasaTotal;
        cerrarModalLimites();
        actualizarResumenPlato(); 
        
        // Si hay un cálculo en pantalla, lo recalculamos con el nuevo límite
        if (document.getElementById("calc-porcion").value) {
            calcularPorcionMaxima();
        }
    }
}

// ── CALCULADORA DE PORCIÓN EXACTA ─────────────────────────────────────────────

function calcularPorcionMaxima() {
    const porcion = parseFloat(document.getElementById("calc-porcion").value.replace(',', '.'));
    const grasa = parseFloat(document.getElementById("calc-grasa").value.replace(',', '.'));
    const div = document.getElementById("result-scan");
    
    if (isNaN(porcion) || isNaN(grasa) || porcion <= 0 || grasa < 0) {
        return div.innerHTML = "<div class='result amber'>Ingresá números válidos para calcular.</div>";
    }

    // Si el alimento tiene 0g de grasa, no hay límite matemático.
    if (grasa === 0) {
        return div.innerHTML = `
            <div class="result green">
                <div class="result-header"><span class="result-icon">✅</span><span class="result-label">¡Vía libre!</span></div>
                <div class="result-text">Este producto declara 0g de grasa. Podés consumir la cantidad que desees (dentro de parámetros normales).</div>
            </div>`;
    }

    // Regla de 3: Si en 'porcion' hay 'grasa
