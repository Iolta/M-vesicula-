// ── STORAGE KEY ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "vesicula_v3";

// ── BASE DE ALIMENTOS ─────────────────────────────────────────────────────────
// nivel: "verde" | "amarillo" | "rojo"
// umbrales: si grasa_por_porcion < umbralBajar → baja un nivel
// categoria: grasa-saturada | irritante | flatulento | picante | alcohol | procesado | lácteo
const DEFAULT_ALIMENTOS = [

  // ── LÁCTEOS ──
  { id:"a001", nombre:"Leche entera", sinonimos:["leche","leche común","leche fluida"], categoria:"lácteo", nivel:"rojo",
    umbralBajar: null, nota:"Alta en grasa saturada. Reemplazar siempre por descremada." },
  { id:"a002", nombre:"Leche descremada", sinonimos:["leche desnatada","leche light"], categoria:"lácteo", nivel:"verde",
    umbralBajar: null, nota:"Sin restricción. Preferida frente a cualquier lácteo entero." },
  { id:"a003", nombre:"Yogur descremado", sinonimos:["yogurt descremado","yogur light"], categoria:"lácteo", nivel:"verde",
    umbralBajar: null, nota:"Bien tolerado. Preferir sin frutas azucaradas." },
  { id:"a004", nombre:"Crema de leche", sinonimos:["nata","crema","cream"], categoria:"lácteo", nivel:"rojo",
    umbralBajar: 2, nota:"Muy alta en grasa saturada. En cantidades menores a 2g por porción puede tolerarse ocasionalmente en preparaciones." },
  { id:"a005", nombre:"Manteca", sinonimos:["butter","mantequilla"], categoria:"grasa-saturada", nivel:"rojo",
    umbralBajar: 3, nota:"Grasa saturada pura. Menos de 3g en una preparación puede tolerarse; más de eso es problemático para la vesícula." },
  { id:"a006", nombre:"Margarina", sinonimos:["margarina vegetal"], categoria:"grasa-saturada", nivel:"rojo",
    umbralBajar: null, nota:"Grasas trans y saturadas. Evitar siempre. No tiene umbral seguro." },
  { id:"a007", nombre:"Ricota descremada", sinonimos:["ricotta descremada"], categoria:"lácteo", nivel:"verde",
    umbralBajar: null, nota:"Excelente opción. Baja en grasa, fácil digestión." },
  { id:"a008", nombre:"Queso untable descremado", sinonimos:["queso crema light","casancrem diet","mendicrim light"], categoria:"lácteo", nivel:"verde",
    umbralBajar: null, nota:"Permitido. Verificar que sea versión light/descremada." },
  { id:"a009", nombre:"Queso duro", sinonimos:["reggianito","parmesano","gruyere","provolone","cheddar","roquefort","mar del plata","pategrás"], categoria:"lácteo", nivel:"rojo",
    umbralBajar: 5, nota:"Alto en grasa saturada. Menos de 5g total en la preparación puede tolerarse esporádicamente como condimento." },
  { id:"a010", nombre:"Queso blando", sinonimos:["cuartirolo","port salut","mozzarella"], categoria:"lácteo", nivel:"amarillo",
    umbralBajar: null, nota:"Moderado en grasa. Cantidad pequeña como acompañamiento es aceptable; no como plato principal." },

  // ── CARNES ──
  { id:"b001", nombre:"Pechuga de pollo", sinonimos:["pollo sin piel","pechuga","pollo a la plancha","pollo hervido"], categoria:"proteína", nivel:"verde",
    umbralBajar: null, nota:"Carne magra ideal. Siempre sin piel y sin fritura." },
  { id:"b002", nombre:"Pollo con piel", sinonimos:["pollo entero","pollo a la parrilla con piel"], categoria:"grasa-saturada", nivel:"rojo",
    umbralBajar: null, nota:"La piel concentra toda la grasa. Retirarla siempre antes de comer." },
  { id:"b003", nombre:"Merluza", sinonimos:["pescadilla","merluza negra"], categoria:"proteína", nivel:"verde",
    umbralBajar: null, nota:"Pescado blanco ideal. Hervida, al vapor o a la plancha sin aceite." },
  { id:"b004", nombre:"Lenguado", sinonimos:["linguado"], categoria:"proteína", nivel:"verde",
    umbralBajar: null, nota:"Muy bajo en grasa. Excelente opción." },
  { id:"b005", nombre:"Corvina", sinonimos:["brótola","pejerrey","palometa"], categoria:"proteína", nivel:"verde",
    umbralBajar: null, nota:"Pescados blancos del río/mar, todos permitidos." },
  { id:"b006", nombre:"Atún en agua", sinonimos:["atún al natural"], categoria:"proteína", nivel:"verde",
    umbralBajar: null, nota:"Bien tolerado. Siempre elegir al natural, no en aceite." },
  { id:"b007", nombre:"Atún en aceite", sinonimos:["atún en aceite de oliva","atún en aceite girasol"], categoria:"grasa-saturada", nivel:"amarillo",
    umbralBajar: null, nota:"El aceite suma grasa significativa. Escurrir muy bien. Ocasionalmente y en poca cantidad." },
  { id:"b008", nombre:"Salmón", sinonimos:["trucha","salmon rosado"], categoria:"grasa-saturada", nivel:"amarillo",
    umbralBajar: null, nota:"Pescado graso. Rico en omega-3 pero puede estimular la vesícula. Porción pequeña, no más de 2 veces por semana." },
  { id:"b009", nombre:"Vacuno magro", sinonimos:["lomo","cuadrada","peceto","nalga","bola de lomo"], categoria:"proteína", nivel:"verde",
    umbralBajar: null, nota:"Cortes magros bien tolerados. Siempre desgrasado, a la plancha o hervido." },
  { id:"b010", nombre:"Carne grasa", sinonimos:["asado","falda","matambre","costilla","bife de chorizo","entrecote","vacío"], categoria:"grasa-saturada", nivel:"rojo",
    umbralBajar: null, nota:"Cortes con alto contenido graso. Estimulan fuertemente la contracción de la vesícula. Evitar." },
  { id:"b011", nombre:"Cerdo", sinonimos:["bondiola","lomo de cerdo","carré","costeleta de cerdo"], categoria:"grasa-saturada", nivel:"amarillo",
    umbralBajar: null, nota:"El lomo de cerdo magro puede tolerarse ocasionalmente. El resto de los cortes tiene demasiada grasa." },
  { id:"b012", nombre:"Cordero", sinonimos:["corderito","cordero patagónico","chivito"], categoria:"grasa-saturada", nivel:"rojo",
    umbralBajar: null, nota:"Carne muy grasa. Evitar siempre." },
  { id:"b013", nombre:"Achuras", sinonimos:["vísceras","riñón","hígado","chinchulines","molleja","mondongo"], categoria:"grasa-saturada", nivel:"rojo",
    umbralBajar: null, nota:"Muy alto en colesterol y grasa saturada. Prohibido." },
  { id:"b014", nombre:"Jamón cocido", sinonimos:["jamón del país","paleta cocida"], categoria:"procesado", nivel:"amarillo",
    umbralBajar: null, nota:"Magro y bajo en grasa si es de buena calidad. En cantidad moderada y sin combinar con otros grasos." },
  { id:"b015", nombre:"Fiambre", sinonimos:["salame","chorizo seco","longaniza","mortadela","paté","picadillo","leberwurst"], categoria:"procesado
