// ── STORAGE Y BASE DE DATOS ───────────────────────────────────────────────────
const STORAGE_KEY = "vesicula_v3";
let misAlimentos = [];
let editandoId = null;
let filtroActual = 'todos';

const DEFAULT_ALIMENTOS = [
  { id:"a001", nombre:"Leche entera", categoria:"lácteo", nivel:"rojo", nota:"Alta en grasa saturada. Reemplazar por descremada." },
  { id:"a002", nombre:"Leche descremada", categoria:"lácteo", nivel:"verde", nota:"Sin restricción." },
  { id:"a004", nombre:"Crema de leche", categoria:"lácteo", nivel:"rojo", nota:"Muy alta en grasa saturada. Evitar." },
  { id:"a005", nombre:"Manteca / Margarina", categoria:"grasa-saturada", nivel:"rojo", nota:"Grasa pura. Prohibido para vesícula." },
  { id:"a008", nombre:"Queso untable descremado", categoria:"lácteo", nivel:"verde", nota:"Permitido. Verificar versión light." },
  { id:"a009", nombre:"Quesos duros", categoria:"lácteo", nivel:"rojo", nota:"Alto en grasa saturada. Muy poca cantidad." },
  { id:"b001", nombre:"Pechuga de pollo", categoria:"proteína", nivel:"verde", nota:"Carne magra ideal. Sin piel, sin freír." },
  { id:"b003", nombre:"Pescado blanco (Merluza/Lenguado)", categoria:"proteína", nivel:"verde", nota:"Excelente opción." },
  { id:"b008", nombre:"Salmón", categoria:"grasa-saturada", nivel:"amarillo", nota:"Pescado graso. Moderación." },
  { id:"b009", nombre:"Vacuno magro (Lomo/Peceto)", categoria:"proteína", nivel:"verde", nota:"Bien tolerado desgrasado." },
  { id:"b010", nombre:"Carne grasa (Asado/Vacío)", categoria:"grasa-saturada", nivel:"rojo", nota:"Evitar. Alta contracción biliar." },
  { id:"b015", nombre:"Embutidos y Fiambres", categoria:"procesado", nivel:"rojo", nota:"Alta grasa saturada. Evitar." },
  { id:"c001", nombre:"Cualquier Frito / Rebozado", categoria:"grasa-saturada", nivel:"rojo", nota:"La fritura es problemática." },
  { id:"d001", nombre:"Huevo entero", categoria:"grasa-saturada", nivel:"amarillo", nota:"La yema tiene grasa. Máximo 2 semanales." },
  { id:"d002", nombre:"Clara de huevo", categoria:"proteína", nivel:"verde", nota:"Sin grasa. Sin restricción." },
  { id:"e004", nombre:"Arroz / Fideos", categoria:"cereal", nivel:"verde", nota:"Permitido. Evitar salsas con crema." },
  { id:"e003", nombre:"Facturas y Pastelería", categoria:"grasa-saturada", nivel:"rojo", nota:"Mucha manteca. Evitar." },
  { id:"f001", nombre:"Zanahoria / Zapallo / Papa", categoria:"vegetal", nivel:"verde", nota:"Muy bien tolerados hervidos." },
  { id:"f006", nombre:"Cebolla / Ajo", categoria:"irritante", nivel:"amarillo", nota:"Puede generar gases. Consumir cocida." },
  { id:"f010", nombre:"Repollo / Coliflor", categoria:"flatulento", nivel:"rojo", nota:"Muy flatulento. Provoca cólicos." },
  { id:"g001", nombre:"Manzana / Pera / Banana madura", categoria:"fruta", nivel:"verde", nota:"Bien toleradas. Sin cáscara." },
  { id:"g006", nombre:"Palta", categoria:"grasa-saturada", nivel:"amarillo", nota:"Grasa saludable pero estimula vesícula." },
  { id:"i001", nombre:"Aceite de oliva", categoria:"grasa-saludable", nivel:"verde", nota:"Crudo, máximo 2 cucharadas diarias." },
  { id:"j001", nombre:"Chocolate", categoria:"grasa-saturada", nivel:"rojo", nota:"Alto en grasa. Evitar." },
  { id:"l001", nombre:"Alcohol", categoria:"alcohol", nivel:"rojo", nota:"Estimula vesícula. Evitar." },
  { id:"l002", nombre:"Gaseosas", categoria:"irritante", nivel:"rojo", nota:"El gas distiende. Evitar." }
];

// ── INICIALIZACIÓN Y NAVEGACIÓN ───────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    // Cargar base de datos
    const guardados = localStorage.getItem(STORAGE_KEY);
    if (guardados) {
        misAlimentos = JSON.parse(guardados);
    } else {
        misAlimentos = [...DEFAULT_ALIMENTOS];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(misAlimentos));
    }

    // Dibujar lista
    renderAlimentos();

    // Evento de buscador
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", renderAlimentos);
    }

    // Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    }
});

function switchTab(tabId) {
    // Botones
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    // Paneles
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tabId).classList.add('active');
}

// ── LÓGICA DE LA CALCULADORA ──────────────────────────────────────────────────

function ejecutarCalculo() {
    const inputPorcion = document.getElementById("calc-porcion").value;
    const inputGrasa = document.getElementById("calc-grasa").value;
    const inputCantidad = document.getElementById("calc-cantidad").value;
    const divResultado = document.getElementById("result-scan");

    // Limpiar comas por puntos y convertir a números
    const porcion = parseFloat(inputPorcion.replace(',', '.'));
    const grasa = parseFloat(inputGrasa.replace(',', '.'));
    
    if (isNaN(porcion) || isNaN(grasa) || porcion <= 0) {
        divResultado.innerHTML = `<div class="result amber">
            <div class="result-header">
                <span class="result-icon">⚠️</span>
                <span class="result-label">Error en los datos</span>
            </div>
            <div class="result-text">Por favor, ingresá números válidos para la porción y la grasa.</div>
        </div>`;
        return;
    }

    // Cálculo base: Porcentaje de grasa (grasa cada 100g)
    const porcentajeGrasa = (grasa / porcion) * 100;
    
    // Si el usuario indicó cuánto va a comer, calculamos la ingesta real
    let ingestaReal = null;
    let textoIngesta = "";
    if (inputCantidad) {
        const cantidad = parseFloat(inputCantidad.replace(',', '.'));
        if (!isNaN(cantidad) && cantidad > 0) {
            ingestaReal = (grasa / porcion) * cantidad;
            textoIngesta = `<br><br><b>En tu plato:</b> Al comer ${cantidad}g vas a ingerir <b>${ingestaReal.toFixed(1)}g de grasa total</b>.`;
        }
    }

    // Lógica de Semáforo (Basada en Dieta Biliar Estándar)
    let claseCSS, icono, titulo, recomendacion;

    if (porcentajeGrasa <= 3) {
        claseCSS = "green"; icono = "✅"; titulo = "Apto para vesícula";
        recomendacion = `Este producto tiene <b>${porcentajeGrasa.toFixed(1)}% de grasa</b>. Se considera muy bajo en lípidos y es seguro para consumir.`;
    } else if (porcentajeGrasa <= 5) {
        claseCSS = "amber"; icono = "⚠️"; titulo = "Consumo con precaución";
        recomendacion = `Este producto tiene <b>${porcentajeGrasa.toFixed(1)}% de grasa</b>. Está en el límite. Consumilo en poca cantidad y no lo mezcles con otras grasas.`;
    } else {
        claseCSS = "red"; icono = "❌"; titulo = "No recomendado";
        recomendacion = `Este producto tiene <b>${porcentajeGrasa.toFixed(1)}% de grasa</b>. Es muy alto en lípidos y puede estimular la contracción de la vesícula provocando cólicos.`;
    }

    // Mostrar resultado en HTML
    divResultado.innerHTML = `
        <div class="result ${claseCSS}">
            <div class="result-header">
                <span class="result-icon">${icono}</span>
                <span class="result-label">${titulo}</span>
            </div>
            <div class="result-text">${recomendacion} ${textoIngesta}</div>
        </div>
    `;
}

// ── LÓGICA DE LA LISTA Y FILTROS ──────────────────────────────────────────────

function filtrarLista(nivel) {
    filtroActual = nivel;
    
    // Cambiar estilo botones
    document.querySelectorAll('.filter-btn').forEach(b => {
        if(b.innerText.toLowerCase().includes(nivel) || (nivel==='todos' && b.innerText==='Todos')) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    
    renderAlimentos();
}

function renderAlimentos() {
    const container = document.getElementById("food-list");
    if (!container) return;
    
    container.innerHTML = "";
    
    const query = (document.getElementById("search-input").value || "").toLowerCase();

    // Filtrar array
    const filtrados = misAlimentos.filter(a => {
        const coincideTexto = a.nombre.toLowerCase().includes(query) || a.categoria.toLowerCase().includes(query);
        const coincideNivel = filtroActual === 'todos' || a.nivel === filtroActual;
        return coincideTexto && coincideNivel;
    });

    // Dibujar HTML
    filtrados.forEach(alimento => {
        const card = document.createElement("div");
        card.className = `food-item nivel-${alimento.nivel}`; 
        card.onclick = () => abrirModalEditar(alimento.id);
        
        card.innerHTML = `
            <h3>${alimento.nombre}</h3>
            <span>${alimento.categoria}</span>
            <p>${alimento.nota}</p>
        `;
        container.appendChild(card);
    });
}

// ── LÓGICA DEL MODAL ──────────────────────────────────────────────────────────

function abrirModalNueva() {
    editandoId = null;
    document.getElementById("modal-nombre").value = "";
    document.getElementById("modal-categoria").value = "vegetal";
    document.getElementById("modal-nivel").value = "verde";
    document.getElementById("modal-nota").value = "";
    document.getElementById("btn-eliminar").style.display = "none";
    document.getElementById("modal-alimento").classList.add("open");
}

function abrirModalEditar(id) {
    editandoId = id;
    const alimento = misAlimentos.find(a => a.id === id);
    if (!alimento) return;

    document.getElementById("modal-nombre").value = alimento.nombre;
    document.getElementById("modal-categoria").value = alimento.categoria;
    document.getElementById("modal-nivel").value = alimento.nivel;
    document.getElementById("modal-nota").value = alimento.nota || "";
    document.getElementById("btn-eliminar").style.display = "block";
    document.getElementById("modal-alimento").classList.add("open");
}

function cerrarModal() {
    document.getElementById("modal-alimento").classList.remove("open");
}

function guardarAlimento() {
    const nombre = document.getElementById("modal-nombre").value.trim();
    if (!nombre) { alert("Ingresá un nombre"); return; }

    const nuevoAlimento = {
        id: editandoId || "usr_" + Date.now(),
        nombre: nombre,
        categoria: document.getElementById("modal-categoria").value,
        nivel: document.getElementById("modal-nivel").value,
        nota: document.getElementById("modal-nota").value.trim()
    };

    if (editandoId) {
        const index = misAlimentos.findIndex(a => a.id === editandoId);
        misAlimentos[index] = nuevoAlimento;
    } else {
        misAlimentos.unshift(nuevoAlimento);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(misAlimentos));
    renderAlimentos();
    cerrarModal();
}

function eliminarAlimento() {
    if (confirm("¿Borrar este alimento?")) {
        misAlimentos = misAlimentos.filter(a => a.id !== editandoId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(misAlimentos));
        renderAlimentos();
        cerrarModal();
    }
}
