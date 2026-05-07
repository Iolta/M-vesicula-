// --- CONFIGURACIÓN Y ESTADO ---
let limites = {
    total: 5.0,
    sat: 2.0
};

// Cargar límites al iniciar
window.onload = () => {
    const guardados = localStorage.getItem('mis_limites_vesicula');
    if (guardados) {
        limites = JSON.parse(guardados);
    }
    // Actualizar los inputs del modal con los valores actuales
    document.getElementById('limite-grasa').value = limites.total;
    document.getElementById('limite-grasa-sat').value = limites.sat;
};

// --- NAVEGACIÓN ---
function switchTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`panel-${tab}`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// --- LÓGICA DE LÍMITES ---
function abrirModalLimites() {
    document.getElementById('modal-limites').classList.add('open');
}

function cerrarModalLimites() {
    document.getElementById('modal-limites').classList.remove('open');
}

function guardarLimites() {
    limites.total = parseFloat(document.getElementById('limite-grasa').value) || 5.0;
    limites.sat = parseFloat(document.getElementById('limite-grasa-sat').value) || 2.0;
    
    localStorage.setItem('mis_limites_vesicula', JSON.stringify(limites));
    cerrarModalLimites();
    alert("Límites actualizados correctamente.");
}

// --- BÚSQUEDA EN OPEN FOOD FACTS ---
async function buscarEnOFF() {
    const query = document.getElementById('off-search').value;
    const loader = document.getElementById('loader-off');
    
    if (query.length < 3) {
        alert("Por favor, escribe al menos 3 letras.");
        return;
    }

    loader.style.display = "block";

    try {
        // Buscamos productos priorizando Argentina
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5&cc=ar`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.products && data.products.length > 0) {
            const p = data.products[0];
            
            // OFF entrega valores cada 100g por defecto
            const grasaTotal = p.nutriments['fat_100g'] || 0;
            const grasaSat = p.nutriments['saturated-fat_100g'] || 0;
            const nombre = p.product_name || "Producto";

            document.getElementById('calc-grasa').value = grasaTotal;
            document.getElementById('calc-grasa-sat').value = grasaSat;
            
            alert(`Cargado: ${nombre}\n(Grasas por cada 100g)`);
            calcularPorcionMaxima();
        } else {
            alert("No se encontró el producto. Prueba con otra marca o carga manual.");
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión. Intenta de nuevo.");
    } finally {
        loader.style.display = "none";
    }
}

// --- CÁLCULO DE PORCIÓN SEGURA ---
function calcularPorcionMaxima() {
    const gTotalAlimento = parseFloat(document.getElementById('calc-grasa').value) || 0;
    const gSatAlimento = parseFloat(document.getElementById('calc-grasa-sat').value) || 0;

    const resultDiv = document.getElementById('result-scan');
    const resIcon = document.getElementById('res-icon');
    const resLabel = document.getElementById('res-label');
    const resText = document.getElementById('res-text');

    // Si el alimento no tiene grasa, es libre (ponemos un límite lógico de 500g por ej)
    if (gTotalAlimento === 0 && gSatAlimento === 0) {
        mostrarResultado("green", "✅", "Alimento Libre", "Este alimento no contiene grasas reportadas. Podés consumirlo con tranquilidad.");
        return;
    }

    // Cálculo: (Límite / Grasa en 100g) * 100
    // Calculamos para ambos límites y nos quedamos con el más restrictivo
    let maxPorTotal = (limites.total / gTotalAlimento) * 100;
    let maxPorSat = gSatAlimento > 0 ? (limites.sat / gSatAlimento) * 100 : Infinity;

    let porcionSegura = Math.floor(Math.min(maxPorTotal, maxPorSat));

    // Determinar color del semáforo basado en la porción resultante
    if (porcionSegura >= 150) {
        mostrarResultado("green", "✅", `Porción Segura: ${porcionSegura}g`, `Podés comer una porción generosa. El límite es de ${porcionSegura}g para no exceder tus ${limites.total}g de grasa.`);
    } else if (porcionSegura >= 50) {
        mostrarResultado("amber", "⚠️", `Porción Moderada: ${porcionSegura}g`, `Cuidado. No deberías exceder los ${porcionSegura}g en esta comida.`);
    } else {
        mostrarResultado("red", "🚫", `Porción Muy Limitada: ${porcionSegura}g`, `Riesgo alto. Solo podrías comer ${porcionSegura}g, lo cual es muy poco. Mejor evitar o buscar alternativa.`);
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
    document.getElementById('result-scan').classList.remove('visible');
}
