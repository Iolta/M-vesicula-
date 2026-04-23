// ── STORAGE Y VARIABLES GLOBALES ──────────────────────────────────────────────
const STORAGE_ALIMENTOS = "vesicula_db_v4";
const STORAGE_LIMITES = "vesicula_limites_v2"; 

let misAlimentos = [];
let miPlato = [];
let editandoId = null;
let limiteGrasaTotal = 5.0; // Tope general
let limiteGrasaSaturada = 2.0; // Tope estricto de saturadas

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
    // Cargar Limites
    const limitesGuardados = localStorage.getItem(STORAGE_LIMITES);
    if (limitesGuardados) {
        try {
            const lims = JSON.parse(limitesGuardados);
            if(lims.total) limiteGrasaTotal = lims.total;
            if(lims.sat) limiteGrasaSaturada = lims.sat;
        } catch(e) {}
    }
    document.getElementById("limite-visual").innerText = limiteGrasaTotal;
    document.getElementById("limite-sat-visual").innerText = limiteGrasaSaturada;

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
    document.getElementById("limite-grasa-sat").value = limiteGrasaSaturada;
    document.getElementById("modal-limites").classList.add("open");
}

function cerrarModalLimites() {
    document.getElementById("modal-limites").classList.remove("open");
}

function guardarLimites() {
    const nuevoTotal = parseFloat(document.getElementById("limite-grasa").value.replace(',', '.'));
    const nuevoSat = parseFloat(document.getElementById("limite-grasa-sat").value.replace(',', '.'));
    
    if (!isNaN(nuevoTotal) && nuevoTotal > 0 && !isNaN(nuevoSat) && nuevoSat > 0) {
        limiteGrasaTotal = nuevoTotal;
        limiteGrasaSaturada = nuevoSat;
        
        localStorage.setItem(STORAGE_LIMITES, JSON.stringify({ total: limiteGrasaTotal, sat: limiteGrasaSaturada }));
        
        document.getElementById("limite-visual").innerText = limiteGrasaTotal;
        document.getElementById("limite-sat-visual").innerText = limiteGrasaSaturada;
        cerrarModalLimites();
        actualizarResumenPlato(); 
        
        if (document.getElementById("calc-porcion").value) {
            calcularPorcionMaxima();
        }
    } else {
        alert("Ingresá valores válidos para ambos topes.");
    }
}

// ── CALCULADORA INTELIGENTE DE ETIQUETA ───────────────────────────────────────

function calcularPorcionMaxima() {
    const porcion = parseFloat(document.getElementById("calc-porcion").value.replace(',', '.'));
    const porcionesEnvase = parseFloat(document.getElementById("calc-porciones-envase").value.replace(',', '.'));
    const grasaTotal = parseFloat(document.getElementById("calc-grasa").value.replace(',', '.'));
    const grasaSatInput = document.getElementById("calc-grasa-sat").value;
    const grasaSat = grasaSatInput ? parseFloat(grasaSatInput.replace(',', '.')) : 0;
    
    const div = document.getElementById("result-scan");
    
    if (isNaN(porcion) || isNaN(grasaTotal) || porcion <= 0 || grasaTotal < 0) {
        return div.innerHTML = "<div class='result amber'>Completá al menos la porción y las grasas totales.</div>";
    }

    // Si tiene 0 grasas en todos los frentes
    if (grasaTotal === 0 && grasaSat === 0) {
        return div.innerHTML = `
            <div class="result green">
                <div class="result-header"><span class="result-icon">✅</span><span class="result-label">¡Vía libre!</span></div>
                <div class="result-text">Este producto tiene 0g de grasa. Podés consumir a voluntad (dentro del sentido común).</div>
            </div>`;
    }

    // Cálculo cruzado
    let maxGramosTotal = (grasaTotal > 0) ? (limiteGrasaTotal * porcion) / grasaTotal : Infinity;
    let maxGramosSat = (grasaSat > 0) ? (limiteGrasaSaturada * porcion) / grasaSat : Infinity;

    // La app elige el límite más estricto
    let maxGramos = Math.min(maxGramosTotal, maxGramosSat);
    let limitante = (maxGramos === maxGramosSat && maxGramosSat < maxGramosTotal) 
                    ? `Saturadas (tope ${limiteGrasaSaturada}g)` 
                    : `Totales (tope ${limiteGrasaTotal}g)`;

    let equivalenciaPorciones = maxGramos / porcion;
    
    // Si sabemos cuántas porciones trae el paquete, sacamos el porcentaje total
    let textoEnvase = "";
    if (!isNaN(porcionesEnvase) && porcionesEnvase > 0) {
        let pesoTotalPaquete = porcion * porcionesEnvase;
        let porcentajePaquete = (maxGramos / pesoTotalPaquete) * 100;
        textoEnvase = `
            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #abc4f0; font-size: 14px; line-height: 1.5;">
                📦 <b>Del paquete entero:</b><br>
                Podés comer el <b>${porcentajePaquete.toFixed(1)}%</b> del contenido total.
            </div>`;
    }

    div.innerHTML = `
        <div class="result" style="background: #e8f0fe; border: 1.5px solid #8ab4f8; color: #174ea6;">
            <div class="result-header">
                <span class="result-icon">⚖️</span>
                <span class="result-label" style="font-size: 13px;">Cortado por ${limitante}</span>
            </div>
            <div class="result-text" style="text-align: center; margin-top: 10px;">
                <span style="font-size: 13px;">Podés comer un máximo de:</span>
                <strong style="font-size: 32px; display: block; margin: 4px 0;">${maxGramos.toFixed(1)} g</strong>
                <span style="font-size: 14px; opacity: 0.9;">Eso equivale a <b>${equivalenciaPorciones.toFixed(1)} porciones</b>.</span>
                ${textoEnvase}
            </div>
        </div>
    `;
}

function limpiarCalculadora() {
    document.getElementById("calc-porcion").value = "";
    document.getElementById("calc-porciones-envase").value = "";
    document.getElementById("calc-grasa").value = "";
    document.getElementById("calc-grasa-sat").value = "";
    document.getElementById("result-scan").innerHTML = "";
}

// ── ARMADOR DE PLATOS (MENÚ) ──────────────────────────────────────────────────

function actualizarSelectorMenu() {
    const select = document.getElementById("menu-selector");
    select.innerHTML = '<option value="">-- Elegí un alimento --</option>';
    
    const alimentosConGrasa = misAlimentos.filter(a => a.grasa100g !== undefined && a.grasa100g !== null);
    
    alimentosConGrasa.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(alimento => {
        const option = document.createElement("option");
        option.value = alimento.id;
        option.text = `${alimento.nombre} (Aprox. ${alimento.grasa100g}g c/100g)`;
        select.appendChild(option);
    });
}

function agregarAlPlato() {
    const id = document.getElementById("menu-selector").value;
    const gramos = parseFloat(document.getElementById("menu-gramos").value);
    
    if (!id || isNaN(gramos) || gramos <= 0) return alert("Seleccioná un alimento e ingresá los gramos.");

    const alimento = misAlimentos.find(a => a.id === id);
    const grasaTotalItem = (alimento.grasa100g / 100) * gramos;

    miPlato.push({
        alimentoId: alimento.id,
        nombre: alimento.nombre,
        gramos: gramos,
        grasaCalculada: grasaTotalItem
    });

    document.getElementById("menu-gramos").value = "";
    renderPlato();
}

function eliminarDelPlato(index) {
    miPlato.splice(index, 1);
    renderPlato();
}

function limpiarPlato() {
    miPlato = [];
    renderPlato();
}

function renderPlato() {
    const listDiv = document.getElementById("lista-plato");
    const resumenDiv = document.getElementById("resumen-plato");
    listDiv.innerHTML = "";

    if (miPlato.length === 0) {
        listDiv.innerHTML = "<p style='color:#9b8d84; font-size:13px; text-align:center;'>El plato está vacío.</p>";
        resumenDiv.style.display = "none";
        return;
    }

    let sumaGrasa = 0;

    miPlato.forEach((item, index) => {
        sumaGrasa += item.grasaCalculada;
        const div = document.createElement("div");
        div.className = "plato-item";
        div.innerHTML = `
            <div class="plato-item-info">
                <strong>${item.nombre}</strong>
                <span>${item.gramos}g aportan ${item.grasaCalculada.toFixed(1)}g de grasa total</span>
            </div>
            <button class="btn-remove" onclick="eliminarDelPlato(${index})">X</button>
        `;
        listDiv.appendChild(div);
    });

    actualizarResumenPlato(sumaGrasa);
}

function actualizarResumenPlato(suma = null) {
    if (suma === null) suma = miPlato.reduce((acc, item) => acc + item.grasaCalculada, 0);
    
    const resumenDiv = document.getElementById("resumen-plato");
    if (miPlato.length === 0) return;

    resumenDiv.style.display = "block";
    let estadoTexto, colorBg;

    if (suma <= limiteGrasaTotal) {
        colorBg = "#166534"; 
        estadoTexto = `Estás dentro de tu límite general de ${limiteGrasaTotal}g.`;
    } else {
        colorBg = "#991b1b"; 
        estadoTexto = `⚠️ Te pasaste de tu límite de ${limiteGrasaTotal}g.`;
    }

    resumenDiv.style.backgroundColor = colorBg;
    resumenDiv.innerHTML = `
        <span style="font-size:14px; opacity:0.9;">Aporte total del plato:</span>
        <strong>${suma.toFixed(1)} g</strong>
        <span style="font-size:13px;">${estadoTexto}</span>
    `;
}

// ── LISTA DE ALIMENTOS Y MODAL ────────────────────────────────────────────────

function renderAlimentos() {
    const container = document.getElementById("food-list");
    container.innerHTML = "";
    const query = document.getElementById("search-input").value.toLowerCase();

    const filtrados = misAlimentos.filter(a => a.nombre.toLowerCase().includes(query));

    filtrados.forEach(alimento => {
        const div = document.createElement("div");
        div.className = `food-item nivel-${alimento.nivel}`;
        div.onclick = () => abrirModalAlimento(alimento.id);
        
        const etiquetaGrasa = alimento.grasa100g !== undefined ? `<br><span style="background:none; padding:0; color:#444;">Aprox. ${alimento.grasa100g}g grasa c/100g</span>` : "";
        
        div.innerHTML = `
            <h3>${alimento.nombre}</h3>
            <span>${alimento.categoria}</span>
            <p style="font-size:12px; margin-top:6px;">${alimento.nota} ${etiquetaGrasa}</p>
        `;
        container.appendChild(div);
    });
}

function abrirModalAlimento(id = null) {
    editandoId = id;
    const modal = document.getElementById("modal-alimento");
    
    if (id) {
        const al = misAlimentos.find(a => a.id === id);
        document.getElementById("modal-nombre").value = al.nombre;
        document.getElementById("modal-categoria").value = al.categoria;
        document.getElementById("modal-nivel").value = al.nivel;
        document.getElementById("modal-grasa100").value = al.grasa100g || "";
        document.getElementById("btn-eliminar").style.display = "block";
    } else {
        document.getElementById("modal-nombre").value = "";
        document.getElementById("modal-grasa100").value = "";
        document.getElementById("btn-eliminar").style.display = "none";
    }
    
    modal.classList.add("open");
}

function cerrarModalAlimento() {
    document.getElementById("modal-alimento").classList.remove("open");
}

function guardarAlimento() {
    const nombre = document.getElementById("modal-nombre").value.trim();
    if (!nombre) return alert("Ingresá un nombre");

    const grasaInput = document.getElementById("modal-grasa100").value;
    const grasa100 = grasaInput ? parseFloat(grasaInput.replace(',', '.')) : undefined;

    const nuevo = {
        id: editandoId || "usr_" + Date.now(),
        nombre: nombre,
        categoria: document.getElementById("modal-categoria").value,
        nivel: document.getElementById("modal-nivel").value,
        grasa100g: grasa100,
        nota: ""
    };

    if (editandoId) {
        const idx = misAlimentos.findIndex(a => a.id === editandoId);
        misAlimentos[idx] = Object.assign(misAlimentos[idx], nuevo);
    } else {
        misAlimentos.unshift(nuevo);
    }

    localStorage.setItem(STORAGE_ALIMENTOS, JSON.stringify(misAlimentos));
    renderAlimentos();
    actualizarSelectorMenu();
    cerrarModalAlimento();
}

function eliminarAlimento() {
    if (confirm("¿Borrar alimento?")) {
        misAlimentos = misAlimentos.filter(a => a.id !== editandoId);
        localStorage.setItem(STORAGE_ALIMENTOS, JSON.stringify(misAlimentos));
        renderAlimentos();
        actualizarSelectorMenu();
        cerrarModalAlimento();
    }
}
