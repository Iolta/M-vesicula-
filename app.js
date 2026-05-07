// --- CONFIGURACIÓN Y ESTADO ---
let limites = { total: 5.0, sat: 2.0 };

window.onload = () => {
    const guardados = localStorage.getItem('mis_limites_vesicula');
    if (guardados) limites = JSON.parse(guardados);
    document.getElementById('limite-grasa').value = limites.total;
    document.getElementById('limite-grasa-sat').value = limites.sat;
};

// --- NAVEGACIÓN ---
function switchTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`panel-${tab}`).style.display = 'block';
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// --- LÓGICA DE LÍMITES ---
function abrirModalLimites() { document.getElementById('modal-limites').classList.add('open'); }
function cerrarModalLimites() { document.getElementById('modal-limites').classList.remove('open'); }

function guardarLimites() {
    limites.total = parseFloat(document.getElementById('limite-grasa').value) || 5.0;
    limites.sat = parseFloat(document.getElementById('limite-grasa-sat').value) || 2.0;
    localStorage.setItem('mis_limites_vesicula', JSON.stringify(limites));
    cerrarModalLimites();
    if(document.getElementById('calc-grasa').value) calcularPorcionMaxima();
}

// --- BÚSQUEDA EN OPEN FOOD FACTS ---
async function buscarEnOFF(barcode = null) {
    const query = barcode || document.getElementById('off-search').value;
    const loader = document.getElementById('loader-off');
    const listaResultados = document.getElementById('off-results-list');
    
    if (!barcode && query.length < 3) return;

    loader.style.display = "block";
    loader.innerText = "Buscando productos...";
    listaResultados.innerHTML = ""; 

    try {
        const url = barcode 
            ? `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
            : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&cc=ar`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (barcode) {
            if (data.product) {
                cargarProducto(data.product);
                loader.style.display = "none";
            } else {
                loader.innerText = "Código no encontrado.";
            }
        } else {
            if (data.products && data.products.length > 0) {
                loader.innerText = "Seleccioná el correcto:";
                data.products.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.innerHTML = `
                        <strong>${p.product_name || 'Sin nombre'}</strong>
                        <small>${p.brands || 'Marca desconocida'} | ${p.quantity || ''}</small>
                    `;
                    item.onclick = () => {
                        cargarProducto(p);
                        listaResultados.innerHTML = "";
                        loader.style.display = "none";
                    };
                    listaResultados.appendChild(item);
                });
            } else {
                loader.innerText = "No se encontraron resultados.";
            }
        }
    } catch (error) {
        loader.innerText = "Error de conexión.";
        console.error(error);
    }
}

function cargarProducto(p) {
    // OFF usa fat_100g y saturated-fat_100g
    const grasaTotal = p.nutriments['fat_100g'] || 0;
    const grasaSat = p.nutriments['saturated-fat_100g'] || 0;
    
    document.getElementById('calc-grasa').value = grasaTotal;
    document.getElementById('calc-grasa-sat').value = grasaSat;
    document.getElementById('off-search').value = p.product_name || "";
    
    calcularPorcionMaxima();
}

// --- CÁLCULO DE PORCIÓN SEGURA ---
function calcularPorcionMaxima() {
    const gTotalAlimento = parseFloat(document.getElementById('calc-grasa').value) || 0;
    const gSatAlimento = parseFloat(document.getElementById('calc-grasa-sat').value) || 0;

    const resultDiv = document.getElementById('result-scan');
    resultDiv.classList.add('visible');

    if (gTotalAlimento === 0 && gSatAlimento === 0) {
        mostrarResultado("green", "✅", "Alimento Libre", "Este producto no tiene grasas detectadas.");
        return;
    }

    // (Límite / Contenido en 100g) * 100
    let maxPorTotal = gTotalAlimento > 0 ? (limites.total / gTotalAlimento) * 100 : Infinity;
    let maxPorSat = gSatAlimento > 0 ? (limites.sat / gSatAlimento) * 100 : Infinity;
    
    let porcionSegura = Math.floor(Math.min(maxPorTotal, maxPorSat));

    if (porcionSegura >= 150) {
        mostrarResultado("green", "✅", `Seguro: ${porcionSegura}g`, `Podés comer una porción normal (hasta ${porcionSegura}g).`);
    } else if (porcionSegura >= 60) {
        mostrarResultado("amber", "⚠️", `Moderado: ${porcionSegura}g`, `Cuidado. No te pases de los ${porcionSegura}g.`);
    } else {
        mostrarResultado("red", "🚫", `Riesgo: ${porcionSegura}g`, `Cantidad permitida muy baja (${porcionSegura}g). Mejor evitar.`);
    }
}

function mostrarResultado(clase, icono, titulo, descripcion) {
    const res = document.getElementById('result-scan');
    res.className = `result visible ${clase}`;
    document.getElementById('res-icon').innerText = icono;
    document.getElementById('res-label').innerText = titulo;
    document.getElementById('res-text').innerText = descripcion;
}

function limpiarCalculadora() {
    document.getElementById('calc-grasa').value = '';
    document.getElementById('calc-grasa-sat').value = '';
    document.getElementById('off-search').value = '';
    document.getElementById('off-results-list').innerHTML = '';
    document.getElementById('loader-off').style.display = 'none';
    document.getElementById('result-scan').classList.remove('visible');
}
