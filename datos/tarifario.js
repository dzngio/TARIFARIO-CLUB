/*
 * Tarifario de Diseño Gráfico — datos editables
 * ------------------------------------------------------------
 * Este es el ÚNICO archivo que hay que tocar para actualizar el tarifario.
 *
 * Horas de cada ítem:
 *   adg: n          → horas del tarifario ADG Córdoba. Se usan como valor "media";
 *                     baja = 70% y alta = 150% (estimación propia).
 *   adg: [c, b, a]  → ADG da horas distintas por tamaño de cliente (chico, mediano, grande),
 *                     o por complejidad baja/media/alta. Se usan como baja / media / alta.
 *   h: [b, m, a]    → estimación propia, para entregables que ADG no cubre.
 * phi: fracción de valor intelectual del ítem sobre la que se cobra la cesión de derechos (0–1).
 */
window.TARIFARIO = {
  meta: {
    version: "2026-10",
    actualizado: "2026-10-12",
    notas: "Montos por defecto de ejemplo. Cada profesional debe ajustarlos a sus costos reales."
  },

  // Valores iniciales del perfil (calculadora de valor hora). Montos en ARS salvo que diga USD.
  perfilDefault: {
    modo: "rapido",          // "rapido" = valor hora ADG · "costos" = calculado con tus costos
    ingresoMensual: 1800000,
    costosFijos: 280000,
    monotributo: 60000,
    equiposUSD: 2500,
    vidaUtilMeses: 36,
    softwareUSD: 80,
    dolar: 1500,
    horasSemana: 40,
    semanasLibres: 4,
    tiempoAdmin: 35,
    margen: 20,
    nivel: "ssr"
  },

  // Referencias de mercado con las que se compara el precio calculado
  referencias: {
    adg: {
      nombre: "ADG Córdoba",
      url: "https://www.adg.com.ar/mi-cuenta/tarifario/",
      consultado: "2026-10-12",
      // Valor hora sugerido por ADG para cliente chico (base 1)
      valorHora: { jr: 18500, ssr: 21500, sr: 25000, lead: 25000 },
      // Factores de cliente ADG: C/pequeño 1 · B/mediano 1,35 · A/grande 1,70
      clientes: { emprendedor: 1.0, pyme: 1.35, grande: 1.7, internacional: 1.7 }
    }
  },

  // Coeficientes de seniority (referencia: matriz ARDG, ±20–40%).
  // tarifa: ajuste sobre el valor hora · eficiencia: ajuste sobre las horas estimadas.
  niveles: {
    jr:   { nombre: "Junior",      detalle: "0–2 años",  tarifa: 0.80, eficiencia: 1.20 },
    ssr:  { nombre: "Semi senior", detalle: "2–5 años",  tarifa: 1.00, eficiencia: 1.00 },
    sr:   { nombre: "Senior",      detalle: "5–10 años", tarifa: 1.20, eficiencia: 0.90 },
    lead: { nombre: "Director/a",  detalle: "+10 años",  tarifa: 1.40, eficiencia: 0.85 }
  },

  // Coeficientes por cliente (referencia: matriz ARDG — Grande +40%, PyME base, Emprendedor −20%).
  clientes: {
    emprendedor:   { nombre: "Emprendedor",          detalle: "−20%",                valor: 0.80 },
    pyme:          { nombre: "PyME",                 detalle: "Base",                valor: 1.00 },
    grande:        { nombre: "Empresa grande",       detalle: "+40%",                valor: 1.40 },
    internacional: { nombre: "Cliente del exterior", detalle: "+80%, cotiza en USD", valor: 1.80, usd: true }
  },

  // Urgencia: M = min(tope, 1 + k × (1 − plazo pedido / plazo estándar))
  urgencia: {
    k: 1.5,
    tope: 2.0,
    recargoFinde: 0.25,
    opciones: {
      estandar:    { nombre: "Estándar",    detalle: "Plazo normal",   ratio: 1.00 },
      prioritario: { nombre: "Prioritario", detalle: "70% del plazo",  ratio: 0.70 },
      express:     { nombre: "Express",     detalle: "Mitad de plazo", ratio: 0.50 },
      rush:        { nombre: "Rush",        detalle: "24–48 h",        ratio: 0.33 }
    }
  },

  // Cesión de derechos (Ley 11.723). M_lic = alcance × duración × exclusividad (mínimo 1).
  licencia: {
    alcance: {
      local:         { nombre: "Local / un medio",      valor: 1.00 },
      regional:      { nombre: "Provincial / regional", valor: 1.15 },
      nacional:      { nombre: "Nacional",              valor: 1.30 },
      internacional: { nombre: "Internacional",         valor: 1.60 }
    },
    recargoATL: 0.20,
    duracion: {
      "1a":     { nombre: "1 año",    valor: 0.85 },
      "3a":     { nombre: "3 años",   valor: 1.00 },
      perpetua: { nombre: "Perpetua", valor: 1.25 }
    },
    exclusividad: {
      no:        { nombre: "No exclusiva",             valor: 1.00 },
      exclusiva: { nombre: "Exclusiva",                valor: 1.30 },
      total:     { nombre: "Cesión patrimonial total", valor: 1.60 }
    }
  },

  reglas: {
    rondasIncluidas: 2,
    costoRondaExtra: 0.15,   // fracción de las horas del ítem por cada ronda extra
    feeGastos: 0.10,         // gestión sobre gastos directos (imprenta de pruebas, stock, fuentes)
    descuentoMax: 20,        // %
    iva: 0.21,
    redondeo: 1000,
    validezDias: 15,
    bandaComplejidad: 0.2,   // ± sobre la complejidad elegida para armar la banda de precios
    // Descuento por volumen sobre las horas de cada ítem (tabla de ADG Córdoba): [desde horas, factor]
    descuentoVolumen: [[35, 0.99], [41, 0.98], [47, 0.97], [53, 0.96], [59, 0.94], [70, 0.92], [81, 0.90], [96, 0.88], [101, 0.87], [121, 0.86], [141, 0.80]]
  },

  // Adicionales que multiplican las horas del ítem
  adicionales: {
    devReady:  { nombre: "Entrega dev-ready", detalle: "Componentes, variables, estados y specs", factor: 1.35 },
    prototipo: { nombre: "Prototipo interactivo", factor: 1.15 },
    editables: { nombre: "Archivos editables", detalle: "Se entregan los archivos fuente", factor: 1.20 }
  },

  categorias: [
    {
      id: "identidad", nombre: "Identidad",
      items: [
        { id: "identidad_completa", n: "Proyecto de identidad visual completo", u: "proyecto", adg: [45, 80, 105], phi: 1, ent: "Marca, sistema gráfico y aplicaciones principales", extras: ["editables"] },
        { id: "isologo", n: "Isologo / imagotipo", u: "proyecto", adg: [25, 40, 60], phi: 1, ent: "Rutas creativas, versiones y archivos finales", extras: ["editables"] },
        { id: "manual", n: "Manual de marca", u: "proyecto", adg: [15, 25, 35], phi: 0.6, ent: "Usos, paleta, tipografía y usos incorrectos" },
        { id: "normalizacion", n: "Normalización de isologo", u: "proyecto", adg: [8, 12, 16], phi: 0.3, ent: "Redibujo técnico de una marca existente" },
        { id: "rediseno", n: "Rediseño de isologo", u: "proyecto", adg: [20, 40, 60], phi: 1, ent: "Nueva marca a partir de una existente", extras: ["editables"] },
        { id: "restyling", n: "Restyling de isologo", u: "proyecto", adg: [16, 24, 32], phi: 0.8, ent: "Actualización conservando el reconocimiento" },
        { id: "naming_corp", n: "Naming corporativo / institucional", u: "proyecto", adg: [9, 18, 28], phi: 1, ent: "Exploración, propuestas y chequeo preliminar en INPI" },
        { id: "naming_prod", n: "Naming de producto o evento", u: "proyecto", adg: [9, 18, 28], phi: 1, ent: "Exploración y propuestas" },
        { id: "slogan", n: "Slogan / lema", u: "pieza", adg: [4, 6, 8], phi: 1, ent: "Propuestas de frase de marca" },
        { id: "claim", n: "Claim o tagline", u: "pieza", adg: 5, phi: 0.8, ent: "Frase de posicionamiento" },
        { id: "marca_efimera", n: "Marca efímera", u: "proyecto", adg: 20, phi: 0.8, ent: "Para eventos, campañas o temporadas" },
        { id: "tipografia", n: "Diseño de tipografía", u: "proyecto", adg: 210, phi: 1, ent: "Familia tipográfica a medida" },
        { id: "estrategia", n: "Estrategia y plataforma de marca", u: "proyecto", h: [12, 25, 45], phi: 0.8, ent: "Workshop, brief, posicionamiento y tono de voz" },
        { id: "papeleria_completa", n: "Papelería completa", u: "proyecto", adg: 12, phi: 0.4, ent: "Tarjeta, hoja membrete, sobre y carpeta" },
        { id: "papeleria_comercial", n: "Papelería comercial", u: "proyecto", adg: 6, phi: 0.4, ent: "Facturas, remitos y formularios" },
        { id: "carpeta", n: "Carpeta institucional", u: "pieza", adg: 7, phi: 0.4, ent: "Con troquel y bolsillo" },
        { id: "membrete", n: "Hoja membrete", u: "pieza", adg: 2, phi: 0.3, ent: "Impresa y digital" },
        { id: "sobres", n: "Sobres", u: "pieza", adg: 3, phi: 0.3, ent: "Bolsa, A4, oficio inglés o carta" },
        { id: "tarjeta", n: "Tarjeta personal", u: "pieza", adg: 2, phi: 0.3, ent: "Frente y dorso" },
        { id: "certificado", n: "Certificado", u: "pieza", adg: 5, phi: 0.3, ent: "Diploma o constancia" },
        { id: "postal", n: "Postal", u: "pieza", adg: 5, phi: 0.4, ent: "Frente y dorso" },
        { id: "uniforme", n: "Uniforme", u: "prenda", adg: 3, phi: 0.3, ent: "Aplicación de marca en una prenda" },
        { id: "uniforme_sistema", n: "Sistema de uniformes", u: "proyecto", adg: 23, phi: 0.5, ent: "Línea completa de indumentaria" }
      ]
    },
    {
      id: "editorial", nombre: "Editorial",
      items: [
        { id: "libro_simple", n: "Libro completo: diseño simple + maquetación", u: "libro", adg: 70, phi: 0.4, ent: "Proyecto editorial completo" },
        { id: "libro_complejo", n: "Libro completo: diseño complejo + maquetación", u: "libro", adg: 100, phi: 0.5, ent: "Con imágenes, tablas o múltiples estilos" },
        { id: "libro_maquetacion", n: "Libro: maquetación", u: "libro", adg: 45, phi: 0.2, ent: "Sobre diseño existente" },
        { id: "libro_pag_simple", n: "Libro: diseño de página simple", u: "página", adg: 1, phi: 0.2, ent: "Por página" },
        { id: "libro_pag_compleja", n: "Libro: diseño de página compleja", u: "página", adg: 1.5, phi: 0.3, ent: "Por página" },
        { id: "tapa_libro", n: "Arte de tapa de libro", u: "pieza", adg: 15, phi: 0.7, ent: "Tapa, lomo y contratapa" },
        { id: "senalador", n: "Señalador", u: "pieza", adg: 4, phi: 0.3, ent: "Frente y dorso" },
        { id: "revista_completa", n: "Revista completa: diseño + maquetación", u: "edición", adg: 90, phi: 0.5, ent: "Proyecto editorial completo" },
        { id: "revista_diseno", n: "Revista: solo diseño", u: "edición", adg: 55, phi: 0.5, ent: "Maqueta y páginas modelo" },
        { id: "revista_maquetacion", n: "Revista: solo maquetación", u: "edición", adg: 20, phi: 0.2, ent: "Sobre diseño existente" },
        { id: "tapa_revista", n: "Arte de tapa de revista", u: "pieza", adg: 15, phi: 0.7, ent: "Portada" },
        { id: "pieza_8pag", n: "Pieza editorial de 8 páginas: diseño + maquetación", u: "pieza", adg: 23, phi: 0.4, ent: "A4, 2 pliegos, 4 colores, textos provistos" },
        { id: "pieza_8pag_diseno", n: "Pieza editorial de 8 páginas: solo diseño", u: "pieza", adg: 15, phi: 0.4, ent: "A4, 2 pliegos, 4 colores" },
        { id: "pieza_8pag_maq", n: "Pieza editorial de 8 páginas: solo maquetación", u: "pieza", adg: 10, phi: 0.2, ent: "Sobre diseño existente" },
        { id: "catalogo", n: "Catálogo de productos", u: "catálogo", adg: 40, phi: 0.3, ent: "Diseño y armado completo" },
        { id: "brochure", n: "Folleto tipo brochure", u: "pieza", adg: 24, phi: 0.4, ent: "Institucional o comercial" },
        { id: "folleto_instructivo", n: "Folleto instructivo", u: "pieza", adg: 24, phi: 0.3, ent: "Pasos, diagramas y textos técnicos" },
        { id: "manual_instrucciones", n: "Manual de instrucciones", u: "página", adg: 2, phi: 0.2, ent: "Por página" },
        { id: "menu", n: "Menú / carta gastronómica", u: "pieza", adg: 14, phi: 0.4, ent: "Diseño y armado" },
        { id: "entrada", n: "Entrada / ticket", u: "pieza", adg: 4, phi: 0.3, ent: "Con numeración o troquel" },
        { id: "tarjeta_salutacion", n: "Tarjeta de salutación", u: "pieza", adg: 6, phi: 0.4, ent: "Fiestas o fechas especiales" },
        { id: "memoria_pag", n: "Memoria y balance", u: "página", h: [0.5, 0.9, 1.5], phi: 0.3, ent: "Diagramación con tablas, por página" },
        { id: "preimpresion", n: "Preimpresión y arte final", u: "proyecto", h: [2, 4, 8], phi: 0, ent: "Cierre de archivos y control con imprenta" }
      ]
    },
    {
      id: "publicitario", nombre: "Publicidad",
      items: [
        { id: "kv", n: "Key visual de campaña", u: "pieza", h: [8, 16, 30], phi: 1, ent: "Concepto y pieza madre" },
        { id: "aviso", n: "Aviso publicitario", u: "pieza", adg: 16, phi: 0.6, ent: "Gráfica para medios" },
        { id: "via_publica", n: "Vía pública", u: "pieza", adg: 15, phi: 0.6, ent: "Gigantografía, séxtuple, chupete" },
        { id: "afiche", n: "Afiche", u: "pieza", adg: 6, phi: 0.6, ent: "Pieza individual" },
        { id: "poster", n: "Póster interno", u: "pieza", adg: 6, phi: 0.5, ent: "Comunicación interna" },
        { id: "flyer_fd", n: "Volante / flyer frente y dorso", u: "pieza", adg: 8, phi: 0.4, ent: "Listo para imprenta" },
        { id: "flyer_f", n: "Volante / flyer solo frente", u: "pieza", adg: 6, phi: 0.4, ent: "Listo para imprenta" },
        { id: "bandeau", n: "Bandeau", u: "pieza", adg: 6, phi: 0.3, ent: "Pieza horizontal para punto de venta" },
        { id: "banner_autoportante", n: "Banner autoportante", u: "pieza", adg: 7, phi: 0.3, ent: "Roll-up o araña" },
        { id: "cenefa", n: "Cenefa", u: "pieza", adg: 7, phi: 0.3, ent: "Para góndola o mostrador" },
        { id: "pared", n: "Diseño de pared", u: "pieza", adg: 8, phi: 0.5, ent: "Gráfica mural o vinilo" },
        { id: "vidriera", n: "Vidriera", u: "pieza", adg: 8, phi: 0.4, ent: "Gráfica de vidriera" },
        { id: "vidriera_ploteo", n: "Vidriera ploteada", u: "pieza", adg: 14, phi: 0.4, ent: "Con archivo de corte" },
        { id: "ploteo_vehicular", n: "Ploteo vehicular", u: "vehículo", adg: [9, 12, 16], phi: 0.5, ent: "Baja o alta complejidad" }
      ]
    },
    {
      id: "web", nombre: "Web y apps",
      items: [
        { id: "sitio_completo", n: "Sitio web: diseño + maquetación", u: "sitio", adg: [45, 65, 95], phi: 0.4, ent: "ADG: 45 h baja complejidad, 65 h media" },
        { id: "sitio_diseno", n: "Sitio web: solo diseño", u: "sitio", adg: [15, 20, 30], phi: 0.4, ent: "ADG: 15 h baja complejidad, 20 h media", extras: ["devReady", "prototipo"] },
        { id: "sitio_maquetacion", n: "Sitio web: solo maquetación", u: "sitio", adg: [30, 45, 65], phi: 0.1, ent: "ADG: 30 h baja complejidad, 45 h media" },
        { id: "sitio_actualizacion", n: "Actualización de sitio HTML/CSS", u: "actualización", adg: 16, phi: 0.1, ent: "Cambios sobre sitio existente" },
        { id: "landing_completa", n: "Landing page: diseño + maquetación", u: "landing", adg: 30, phi: 0.4, ent: "Página única publicada" },
        { id: "landing_diseno", n: "Landing page: solo diseño", u: "landing", adg: 10, phi: 0.4, ent: "Desktop y mobile", extras: ["devReady", "prototipo"] },
        { id: "landing_maquetacion", n: "Landing page: solo maquetación", u: "landing", adg: 20, phi: 0.1, ent: "Sobre diseño existente" },
        { id: "tienda", n: "Tienda online básica", u: "tienda", adg: 35, phi: 0.2, ent: "Tiendanube, Wix o similar" },
        { id: "app_ux", n: "App: diseño UX", u: "app", adg: 30, phi: 0.3, ent: "Flujos, arquitectura y wireframes" },
        { id: "app_ui", n: "App: diseño UI", u: "app", adg: 30, phi: 0.4, ent: "Interfaz en alta fidelidad", extras: ["devReady", "prototipo"] },
        { id: "app_hibrida", n: "App: maquetación híbrida", u: "app", adg: 30, phi: 0.1, ent: "Programación híbrida" },
        { id: "app_nativa", n: "App: maquetación nativa", u: "app", adg: 45, phi: 0.1, ent: "Programación nativa" },
        { id: "ui_pantalla", n: "UI por pantalla", u: "pantalla", h: [3, 5, 9], phi: 0.3, ent: "Alta fidelidad en Figma", extras: ["devReady", "prototipo"] },
        { id: "design_system", n: "Design system / UI kit", u: "proyecto", h: [25, 60, 140], phi: 0.6, ent: "Tokens, componentes y documentación", extras: ["devReady"] },
        { id: "research", n: "Research / test de usabilidad", u: "ronda", h: [12, 25, 50], phi: 0.3, ent: "Entrevistas, tests e informe" },
        { id: "presentacion", n: "Presentación interactiva", u: "pieza", adg: 10, phi: 0.3, ent: "Tipo PowerPoint o Keynote" }
      ]
    },
    {
      id: "digital", nombre: "Digital y redes",
      items: [
        { id: "perfil_rrss", n: "Perfil en redes sociales", u: "red", adg: 4, phi: 0.4, ent: "Avatar, portada y destacadas" },
        { id: "plan_social", n: "Plan de social media", u: "plan", adg: 15, phi: 0.4, ent: "Estrategia, pilares y calendario" },
        { id: "gestion_posteos", n: "Gestión de posteos", u: "mes", adg: 15, phi: 0.3, ent: "Diseño y publicación mensual" },
        { id: "kitredes", n: "Kit inicial de redes", u: "proyecto", h: [10, 18, 30], phi: 0.6, ent: "Perfil, portada, 6 plantillas y destacadas" },
        { id: "plantilla", n: "Plantilla editable (Canva / Figma)", u: "plantilla", h: [2, 3.5, 6], phi: 0.5, ent: "Para feed o stories" },
        { id: "pieza", n: "Pieza estática para redes", u: "pieza", h: [1, 1.5, 3], phi: 0.3, ent: "Post o story" },
        { id: "carrusel", n: "Carrusel", u: "slide", h: [0.6, 1, 1.5], phi: 0.3, ent: "Por slide" },
        { id: "banner_animado", n: "Banner publicitario animado", u: "pieza", adg: 7, phi: 0.4, ent: "GIF o HTML5" },
        { id: "newsletter", n: "Mailing / newsletter", u: "pieza", adg: 6, phi: 0.4, ent: "Diseño de envío" },
        { id: "firma_mail", n: "Firma o encabezado de e-mail", u: "pieza", adg: 2, phi: 0.3, ent: "HTML o imagen" },
        { id: "sem", n: "Campaña SEM básica", u: "campaña", adg: 6, phi: 0.1, ent: "Anuncios en buscadores" },
        { id: "seo", n: "Posicionamiento SEO", u: "sitio", adg: 6, phi: 0, ent: "Optimización básica" },
        { id: "analytics", n: "Configuración de Google Analytics", u: "sitio", adg: 5, phi: 0, ent: "Alta y eventos básicos" },
        { id: "fotomontaje", n: "Fotomontaje", u: "imagen", adg: 5, phi: 0.3, ent: "Composición de imágenes" },
        { id: "retoque", n: "Retoque básico de imagen", u: "imagen", adg: 2, phi: 0.1, ent: "Color, recorte y limpieza" }
      ]
    },
    {
      id: "packaging", nombre: "Packaging",
      items: [
        { id: "etiqueta_simple", n: "Etiqueta simple", u: "pieza", adg: 15, phi: 0.7, ent: "Una cara" },
        { id: "etiqueta_compuesta", n: "Etiqueta compuesta", u: "pieza", adg: [40, 50, 60], phi: 0.8, ent: "Frente, dorso e información legal" },
        { id: "caja_compleja", n: "Caja / pack de producto complejo", u: "pieza", adg: [30, 50, 70], phi: 0.8, ent: "Diseño gráfico sobre troquel" },
        { id: "caja_promo", n: "Caja / pack promocional", u: "pieza", adg: [20, 26, 32], phi: 0.6, ent: "Edición especial o regalo" },
        { id: "sku", n: "Adaptación por variante / SKU", u: "SKU", h: [1, 2, 4], phi: 0.2, ent: "Cambio de sabor, color o gramaje" },
        { id: "troquel", n: "Diseño estructural de troquel", u: "pieza", h: [6, 14, 30], phi: 0.9, ent: "Desarrollo de forma y plano técnico" },
        { id: "mockup", n: "Mockup / render 3D", u: "vista", h: [2, 4, 10], phi: 0.2, ent: "Visualización fotorrealista" },
        { id: "linea", n: "Sistema de packaging de línea", u: "proyecto", h: [40, 80, 150], phi: 1, ent: "Arquitectura visual para toda la línea", extras: ["editables"] },
        { id: "pruebacolor", n: "Supervisión de prueba de color", u: "visita", h: [2, 4, 8], phi: 0, ent: "Control en planta o imprenta" }
      ]
    },
    {
      id: "promocional", nombre: "Promocionales",
      items: [
        { id: "merch_pack", n: "Merchandising (pack)", u: "pack", adg: 15, phi: 0.4, ent: "Aplicación a varios objetos" },
        { id: "remeras", n: "Remera", u: "diseño", adg: 6, phi: 0.6, ent: "Estampa o aplicación de marca" },
        { id: "estampa", n: "Gráfica para indumentaria / streetwear", u: "diseño", h: [4, 8, 16], phi: 0.9, ent: "Estampa original separada en colores" },
        { id: "almanaque_simple", n: "Almanaque de pared simple", u: "pieza", adg: 9, phi: 0.4, ent: "Una hoja" },
        { id: "almanaque_anillado", n: "Almanaque de pared anillado", u: "pieza", adg: 20, phi: 0.5, ent: "Doce meses" },
        { id: "bolsas", n: "Bolsas / envoltorios", u: "pieza", adg: 3, phi: 0.3, ent: "Aplicación de marca" },
        { id: "bandera", n: "Bandera", u: "pieza", adg: 2, phi: 0.3, ent: "Aplicación de marca" },
        { id: "calcos", n: "Calcos", u: "pieza", adg: 2, phi: 0.3, ent: "Con archivo de corte" },
        { id: "objetos", n: "Lapiceras, pins, llaveros", u: "objeto", adg: 2, phi: 0.2, ent: "Aplicación de marca" },
        { id: "tazas", n: "Tazas, pads, fundas", u: "objeto", adg: 2, phi: 0.2, ent: "Aplicación de marca" }
      ]
    },
    {
      id: "ilustracion", nombre: "Ilustración e infografía",
      items: [
        { id: "ilus_vectorial", n: "Ilustración vectorial", u: "ilustración", adg: 12, phi: 0.9, ent: "Pieza original" },
        { id: "ilus_mano", n: "Ilustración a mano alzada", u: "ilustración", adg: 12, phi: 0.9, ent: "Pieza original" },
        { id: "ilus_3d", n: "Ilustración / modelado 3D", u: "ilustración", adg: 24, phi: 0.9, ent: "Modelado y render" },
        { id: "digitalizacion", n: "Digitalización", u: "imagen", adg: 3, phi: 0.1, ent: "Vectorización de un original" },
        { id: "infografia", n: "Infografía", u: "pieza", adg: [20, 30, 45], phi: 0.5, ent: "ADG: 20 h baja complejidad, 45 h alta" },
        { id: "infografia_animada", n: "Infografía animada", u: "pieza", adg: [20, 25, 30], phi: 0.5, ent: "ADG: 20 h baja complejidad, 30 h alta" }
      ]
    },
    {
      id: "senaletica", nombre: "Señalética y volumétrico",
      items: [
        { id: "senaletica", n: "Señalética", u: "proyecto", adg: [15, 35, 60], phi: 0.7, ent: "Pictogramas y tipologías de carteles" },
        { id: "senaletica_soporte", n: "Señalética: sistema + diseño de soporte", u: "proyecto", adg: [15, 35, 60], phi: 0.8, ent: "Incluye diseño de los soportes" },
        { id: "cartel_ext", n: "Cartel para exteriores", u: "pieza", adg: 12, phi: 0.5, ent: "Marquesina, cartel frontal o tótem" },
        { id: "senal_pieza", n: "Plano técnico por cartel", u: "pieza", h: [1, 2, 3], phi: 0.1, ent: "Para producción" },
        { id: "stand_morfologico", n: "Stand: diseño morfológico", u: "stand", adg: 30, phi: 0.8, ent: "Forma y estructura" },
        { id: "stand_grafica", n: "Stand: gráfica sobre estructura", u: "stand", adg: 18, phi: 0.5, ent: "Paneles y aplicaciones" },
        { id: "stand_3d", n: "Stand: modelado 3D básico", u: "stand", adg: 8, phi: 0.3, ent: "Render de presentación" },
        { id: "colgantes", n: "Colgantes para locales", u: "pieza", adg: 4, phi: 0.3, ent: "Supermercados y comercios" },
        { id: "llamadores", n: "Llamadores de góndola", u: "pieza", adg: 5, phi: 0.3, ent: "Punto de venta" }
      ]
    },
    {
      id: "video", nombre: "Video y motion",
      items: [
        { id: "preproduccion", n: "Preproducción", u: "proyecto", adg: 12, phi: 0.5, ent: "Guion, storyboard y planificación" },
        { id: "placa_estatica", n: "Placa estática", u: "placa", adg: 5, phi: 0.3, ent: "Para video o TV" },
        { id: "placa_animada", n: "Placa animada 2D", u: "placa", adg: 8, phi: 0.4, ent: "Animación breve" },
        { id: "spot", n: "Spot publicitario / animación", u: "spot", adg: [12, 24, 36], phi: 0.6, ent: "ADG: 12 h complejidad baja, 24 h media" },
        { id: "edicion", n: "Edición de video", u: "video", adg: 8, phi: 0.2, ent: "Montaje con material provisto" },
        { id: "zocalo", n: "Zócalo / lower third", u: "pieza", adg: 9, phi: 0.4, ent: "Gráfica para video o streaming" },
        { id: "logo_anim", n: "Logo animado / loop", u: "pieza", h: [6, 12, 24], phi: 0.8, ent: "3 a 6 segundos" },
        { id: "bumper", n: "Bumper / intro / outro", u: "pieza", h: [8, 16, 30], phi: 0.6, ent: "5 a 10 segundos" },
        { id: "anim2d", n: "Animación 2D explicativa", u: "segundo", h: [0.7, 1.3, 2.5], phi: 0.5, ent: "Por segundo de animación final" },
        { id: "reel", n: "Reel motion para redes", u: "pieza", h: [4, 8, 16], phi: 0.3, ent: "15 a 60 segundos con material provisto" },
        { id: "subtitulos", n: "Subtitulado dinámico", u: "minuto", h: [1.5, 3, 6], phi: 0.1, ent: "Kinetic captions" }
      ]
    }
  ]
};

// Normaliza las horas: los ítems con dato ADG obtienen h = [baja, media, alta] y fuente "ADG".
(function (T) {
  var r1 = function (x) { return Math.round(x * 10) / 10; };
  T.categorias.forEach(function (c) {
    c.items.forEach(function (it) {
      if (it.adg != null) {
        it.h = Array.isArray(it.adg) ? it.adg.slice() : [r1(it.adg * 0.7), it.adg, r1(it.adg * 1.5)];
        it.fuente = "ADG";
      } else {
        it.fuente = "propia";
      }
    });
  });
})(window.TARIFARIO);
