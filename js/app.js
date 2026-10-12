/* Interfaz del tarifario. Depende de window.TARIFARIO (datos) y window.Motor (cálculo). */
(function () {
  "use strict";

  var T = window.TARIFARIO;
  var M = window.Motor;
  var CLAVE = "tarifario-ar-v1";
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Estado ----------
  var uidSeq = 1;
  function nuevaLinea(itemId, cant, comp) {
    return { uid: "l" + uidSeq++, itemId: itemId, cant: cant || 1, comp: comp == null ? 0.5 : comp, extras: {} };
  }

  var S = {
    perfil: Object.assign({}, T.perfilDefault),
    dolarManual: false,
    cond: {
      cliente: "pyme", plazo: "estandar", finde: false,
      alcance: "local", duracion: "3a", exclusividad: "no", atl: false,
      rondas: 2, gastos: 0, descuento: 0, iibb: 0, comision: 0, fiscal: "mono"
    },
    // Proyecto de ejemplo para que la herramienta abra con un cálculo real
    lineas: [nuevaLinea("isologo", 1, 0.5), nuevaLinea("manual", 1, 0.4), nuevaLinea("kitredes", 1, 0.5), nuevaLinea("pieza", 8, 0.4)],
    cat: "identidad",
    pres: { estudio: "", contacto: "", cliente: "Café Tostado (ejemplo)", proyecto: "Identidad de marca y lanzamiento en redes", entrega: "4 semanas", pago: "50/50" }
  };

  try {
    var guardado = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (guardado && guardado.perfil) {
      S.perfil = Object.assign({}, T.perfilDefault, guardado.perfil);
      S.cond = Object.assign({}, S.cond, guardado.cond);
      S.pres = Object.assign({}, S.pres, guardado.pres);
      S.dolarManual = !!guardado.dolarManual;
      if (T.categorias.some(function (c) { return c.id === guardado.cat; })) S.cat = guardado.cat;
      if (Array.isArray(guardado.lineas)) {
        S.lineas = guardado.lineas.filter(function (l) { return M.buscarItem(T, l.itemId); })
          .map(function (l) { var n = nuevaLinea(l.itemId, l.cant, l.comp); n.extras = l.extras || {}; return n; });
      }
    }
  } catch (e) { /* sin almacenamiento: se usan los valores por defecto */ }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) { /* ignorar */ }
  }

  // ---------- Formato ----------
  var fARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
  var fUSD = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  var fNum = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
  // Sin espacio entre el signo y el número: "$2.468.000", "US$17"
  function ars(x) { return fARS.format(Math.round(x)).replace(/\s/g, ""); }
  function usd(x) { return fUSD.format(Math.round(x)).replace(/\s/g, ""); }
  function fmtCampo(v) { return Number(v).toLocaleString("es-AR", { maximumFractionDigits: 1 }); }
  function leerCampo(s) { return parseFloat(String(s).replace(/\./g, "").replace(",", ".")); }
  function horas(x) { return fNum.format(x) + " h"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function enUSD() { return !!(T.clientes[S.cond.cliente] || {}).usd; }
  function dinero(x) { return enUSD() ? usd(x / S.perfil.dolar) : ars(x); }
  function mult(x) { return "×" + x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(x) { var d = Math.round((x - 1) * 100); return d === 0 ? "Base" : (d > 0 ? "+" : "−") + Math.abs(d) + "%"; }
  function cantidad(n, u) { return n + " " + (n > 1 ? u + (/[aeiouáéíóúU]$/.test(u) ? "s" : "es") : u); }

  // ---------- Controles genéricos ----------
  function segmentado(el, opciones, actual, alElegir) {
    el.innerHTML = Object.keys(opciones).map(function (k) {
      var o = opciones[k];
      return '<button type="button" data-k="' + k + '" aria-pressed="' + (k === actual) + '"><b>' + esc(o.nombre) + "</b>" +
        (o.detalle ? "<span>" + esc(o.detalle) + "</span>" : "") + "</button>";
    }).join("");
    el.onclick = function (ev) {
      var b = ev.target.closest("button[data-k]");
      if (!b) return;
      el.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      alElegir(b.dataset.k);
    };
  }

  function sliders(el, defs, obj, alCambiar) {
    el.innerHTML = defs.map(function (d) {
      return '<div class="campo"><div class="campo-cab"><label for="r-' + d.k + '">' + esc(d.label) + "</label>" +
        '<input class="valor-input" id="n-' + d.k + '" type="text" inputmode="decimal" value="' + fmtCampo(obj[d.k]) + '" aria-label="' + esc(d.label) + '"></div>' +
        '<input type="range" id="r-' + d.k + '" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '" value="' + obj[d.k] + '">' +
        (d.ayuda ? "<small>" + d.ayuda + "</small>" : "") + "</div>";
    }).join("");
    defs.forEach(function (d) {
      var r = $("r-" + d.k), n = $("n-" + d.k);
      r.addEventListener("input", function () { obj[d.k] = +r.value; n.value = fmtCampo(r.value); alCambiar(d.k); });
      n.addEventListener("input", function () {
        var v = leerCampo(n.value);
        if (isNaN(v) || v < d.min) return;
        obj[d.k] = v; r.value = v; alCambiar(d.k);
      });
      n.addEventListener("blur", function () { n.value = fmtCampo(obj[d.k]); });
    });
  }

  // ---------- 01 Valor hora ----------
  var defsBasico = [
    { k: "ingresoMensual", label: "Cuánto querés ganar por mes", min: 300000, max: 8000000, step: 50000, ayuda: "Neto, como si fuera un sueldo." },
    { k: "costosFijos", label: "Gastos fijos por mes", min: 0, max: 2000000, step: 10000, ayuda: "Espacio, luz, internet, contador." },
    { k: "monotributo", label: "Monotributo por mes", min: 0, max: 500000, step: 1000, ayuda: "Cuota de tu categoría en ARCA." },
    { k: "horasSemana", label: "Horas de trabajo por semana", min: 10, max: 60, step: 1 }
  ];
  var defsAvanzado = [
    { k: "equiposUSD", label: "Valor de tus equipos (USD)", min: 0, max: 10000, step: 100, ayuda: "Computadora, monitor, tableta, celular." },
    { k: "vidaUtilMeses", label: "Vida útil de los equipos (meses)", min: 12, max: 72, step: 6, ayuda: "En cuánto tiempo los tenés que renovar." },
    { k: "softwareUSD", label: "Software y suscripciones (USD/mes)", min: 0, max: 500, step: 5, ayuda: "Adobe, Figma, tipografías, bancos de imágenes, IA." },
    { k: "dolar", label: "Cotización del dólar (ARS)", min: 300, max: 6000, step: 5, ayuda: '<span class="fila-dolar"><span id="dolar-estado">Usado para equipos y software.</span> <button type="button" class="boton-texto" id="dolar-mep">Usar dólar MEP de hoy</button></span>' },
    { k: "semanasLibres", label: "Semanas sin trabajar por año", min: 0, max: 12, step: 1, ayuda: "Vacaciones, feriados y días de enfermedad." },
    { k: "tiempoAdmin", label: "Tiempo que no podés cobrar (%)", min: 10, max: 60, step: 1, ayuda: "Mails, ventas, administración, formación." },
    { k: "margen", label: "Margen de ganancia (%)", min: 0, max: 60, step: 1, ayuda: "Para ahorro, reinversión y meses flojos." }
  ];

  function pintarValorHora(vh) {
    var p = S.perfil;
    $("bloque-costos").hidden = vh.modo === "rapido";
    if (vh.modo === "rapido") {
      $("vh-resumen").innerHTML =
        '<div class="destacado"><span>Tu valor hora · PyME</span><b class="num">' + ars(vh.vhh) + "</b><span>" + usd(vh.vhh / p.dolar) + "</span></div>" +
        '<div><span>ADG · cliente chico</span><b class="num">' + ars(vh.piso) + "</b></div>" +
        '<div><span>Fuente</span><b>ADG Córdoba</b></div>';
      return;
    }
    $("vh-resumen").innerHTML =
      '<div class="destacado"><span>Tu valor hora</span><b class="num">' + ars(vh.vhh) + "</b><span>" + usd(vh.vhh / p.dolar) + "</span></div>" +
      '<div><span>Mínimo para no perder</span><b class="num">' + ars(vh.piso) + "</b></div>" +
      '<div><span>Horas que cobrás por mes</span><b class="num">' + horas(vh.horasFact) + "</b></div>";
    var partes = [
      { n: "Ingreso", v: p.ingresoMensual, c: "var(--tinta)" },
      { n: "Costos fijos", v: p.costosFijos, c: "var(--gris)" },
      { n: "Monotributo", v: p.monotributo, c: "var(--acento)" },
      { n: "Equipos", v: vh.amortizacion, c: "var(--warn)" },
      { n: "Software", v: vh.software, c: "var(--crit)" }
    ];
    var total = vh.necesidad || 1;
    $("composicion").innerHTML =
      '<span class="ayuda">Necesitás facturar <b class="num">' + ars(vh.necesidad) + "</b> por mes, sin margen. Así se compone:</span>" +
      '<div class="barra-comp" role="img" aria-label="Composición mensual">' + partes.map(function (x) {
        return '<i style="width:' + (x.v / total * 100) + "%;background:" + x.c + '"></i>';
      }).join("") + "</div>" +
      '<div class="leyenda">' + partes.map(function (x) {
        return '<span><i style="background:' + x.c + '"></i>' + x.n + " " + Math.round(x.v / total * 100) + "%</span>";
      }).join("") + "</div>";
  }

  function traerDolar() {
    var estado = $("dolar-estado");
    estado.textContent = "Consultando…";
    fetch("https://dolarapi.com/v1/dolares/bolsa")
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) {
        if (!d || !d.venta) throw new Error();
        S.perfil.dolar = Math.round(d.venta);
        S.dolarManual = false;
        $("r-dolar").value = S.perfil.dolar; $("n-dolar").value = fmtCampo(S.perfil.dolar);
        var fecha = d.fechaActualizacion ? new Date(d.fechaActualizacion).toLocaleDateString("es-AR") : "hoy";
        estado.textContent = "Dólar MEP del " + fecha + " (dolarapi.com).";
        actualizar();
      })
      .catch(function () { estado.textContent = "No se pudo obtener la cotización. Cargala a mano."; });
  }

  // ---------- 02 Servicios ----------
  function pintarCategorias() {
    var el = $("categorias");
    el.innerHTML = T.categorias.map(function (c) {
      return '<button type="button" data-c="' + c.id + '" aria-pressed="' + (c.id === S.cat) + '">' + esc(c.nombre) + "<sup>" + c.items.length + "</sup></button>";
    }).join("");
    el.onclick = function (ev) {
      var b = ev.target.closest("button[data-c]");
      if (!b) return;
      S.cat = b.dataset.c;
      $("buscar").value = "";
      el.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      pintarCatalogo();
      guardar();
    };
  }

  function normalizar(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function pintarCatalogo() {
    var q = normalizar($("buscar").value.trim());
    var lista;
    if (q) {
      lista = [];
      T.categorias.forEach(function (c) {
        c.items.forEach(function (it) {
          if (normalizar(it.n + " " + it.ent + " " + c.nombre).indexOf(q) >= 0) lista.push({ it: it, cat: c.nombre });
        });
      });
    } else {
      var cat = T.categorias.filter(function (c) { return c.id === S.cat; })[0] || T.categorias[0];
      lista = cat.items.map(function (it) { return { it: it }; });
    }
    $("categorias").querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(!q && x.dataset.c === S.cat)); });
    if (!lista.length) { $("catalogo").innerHTML = '<div class="vacio">No encontramos “' + esc($("buscar").value) + '”. Probá con otra palabra o elegí una disciplina.</div>'; return; }
    $("catalogo").innerHTML = lista.map(function (x) {
      var it = x.it;
      var fuente = it.fuente === "ADG"
        ? '<span class="fuente adg" title="Horas del tarifario de ADG Córdoba">ADG</span>'
        : '<span class="fuente" title="Estimación propia: ADG no cubre este entregable">Estimado</span>';
      return '<div class="cat-item"><div><b>' + esc(it.n) + " " + fuente + "</b><small>" + (x.cat ? esc(x.cat) + " · " : "") + esc(it.ent) + "</small></div>" +
        '<span class="cat-horas">' + fNum.format(it.h[0]) + "–" + fNum.format(it.h[2]) + " h</span>" +
        '<button type="button" class="agregar" data-add="' + it.id + '">+ Agregar</button></div>';
    }).join("");
  }

  $("catalogo").addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-add]");
    if (!b) return;
    S.lineas.push(nuevaLinea(b.dataset.add, 1, 0.5));
    pintarLineas();
    actualizar();
    b.textContent = "Agregado ✓";
    setTimeout(function () { b.textContent = "+ Agregar"; }, 1200);
  });

  function pintarLineas() {
    var el = $("lineas");
    if (!S.lineas.length) {
      el.innerHTML = '<div class="vacio">Todavía no hay servicios. Elegí una disciplina arriba y tocá “+ Agregar”.</div>';
      return;
    }
    el.innerHTML = '<div class="proyecto">' + S.lineas.map(function (l) {
      var it = M.buscarItem(T, l.itemId);
      var extras = (it.extras || []).map(function (k) {
        var a = T.adicionales[k];
        return '<label><input type="checkbox" data-extra="' + k + '"' + (l.extras[k] ? " checked" : "") + "> " + esc(a.nombre) + " (" + mult(a.factor) + ")</label>";
      }).join("");
      return '<div class="linea" data-uid="' + l.uid + '">' +
        '<div class="linea-nombre"><b>' + esc(it.n) + "</b><small>" + esc(it.ent) + "</small></div>" +
        '<label class="cant">Cantidad (' + esc(it.u) + ')<input type="number" min="1" step="1" value="' + l.cant + '" data-campo="cant"></label>' +
        '<div class="comp"><div class="comp-seg" role="group" aria-label="Complejidad de ' + esc(it.n) + '">' +
        [[0, "Simple"], [0.5, "Estándar"], [1, "Complejo"]].map(function (o) {
          return '<button type="button" data-comp="' + o[0] + '" aria-pressed="' + (Math.abs(l.comp - o[0]) < 0.25) + '">' + o[1] + "</button>";
        }).join("") + "</div></div>" +
        '<span class="linea-horas num" data-horas></span>' +
        '<button type="button" class="quitar" data-quitar aria-label="Quitar ' + esc(it.n) + '">×</button>' +
        (extras ? '<div class="extras">' + extras + "</div>" : "") +
        "</div>";
    }).join("") + "</div>";
  }

  function lineaDe(el) {
    var row = el.closest("[data-uid]");
    if (!row) return null;
    return S.lineas.filter(function (l) { return l.uid === row.dataset.uid; })[0];
  }

  $("lineas").addEventListener("input", function (ev) {
    var l = lineaDe(ev.target);
    if (!l) return;
    var t = ev.target;
    if (t.dataset.campo === "cant") { var v = parseInt(t.value, 10); if (v >= 1) l.cant = v; }
    else if (t.dataset.extra) l.extras[t.dataset.extra] = t.checked;
    actualizar();
  });
  $("lineas").addEventListener("click", function (ev) {
    var bc = ev.target.closest("[data-comp]");
    if (bc) {
      lineaDe(bc).comp = +bc.dataset.comp;
      bc.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === bc)); });
      actualizar();
      return;
    }
    if (!ev.target.closest("[data-quitar]")) return;
    var l = lineaDe(ev.target);
    S.lineas = S.lineas.filter(function (x) { return x !== l; });
    pintarLineas();
    actualizar();
  });
  $("vaciar").addEventListener("click", function () { S.lineas = []; pintarLineas(); actualizar(); });

  // ---------- 03 Condiciones ----------
  var defsCond = [
    { k: "rondas", label: "Rondas de cambios", min: 1, max: 6, step: 1, ayuda: "2 incluidas. Cada ronda extra suma 15% de horas." },
    { k: "gastos", label: "Gastos directos (ARS)", min: 0, max: 1000000, step: 5000, ayuda: "Pruebas de imprenta, imágenes de stock, tipografías. Se suma 10% de gestión." },
    { k: "descuento", label: "Descuento (%)", min: 0, max: 30, step: 1, ayuda: "Máximo aplicado: " + T.reglas.descuentoMax + "%." },
    { k: "iibb", label: "Ingresos Brutos (%)", min: 0, max: 6, step: 0.5, ayuda: "Dejalo en 0 si tu provincia lo incluye en el monotributo." },
    { k: "comision", label: "Comisión de cobro (%)", min: 0, max: 10, step: 0.5, ayuda: "Mercado Pago, Payoneer, Wise, transferencia internacional." }
  ];

  function opcionesSelect(el, dict, actual) {
    el.innerHTML = Object.keys(dict).map(function (k) {
      return '<option value="' + k + '"' + (k === actual ? " selected" : "") + ">" + esc(dict[k].nombre) + " (" + mult(dict[k].valor) + ")</option>";
    }).join("");
  }

  // ---------- Resultado ----------
  function pintarResultado(r) {
    var vacio = !S.lineas.length;
    $("det-desglose").hidden = vacio;
    $("barra-monto").textContent = vacio ? "—" : dinero(r.rec.total);
    if (vacio) {
      $("res-cuerpo").innerHTML = '<div class="res-vacio">Sumá al menos un servicio para ver el precio.</div>';
      $("res-ref").innerHTML = $("res-alertas").innerHTML = "";
      return;
    }
    var rec = r.rec, min = r.min, alto = r.alto;
    var rango = Math.max(1, alto.total - min.total);
    var pos = Math.min(100, Math.max(0, (rec.total - min.total) / rango * 100));
    var principal = dinero(rec.total);
    var sub = enUSD()
      ? "Equivale a " + ars(rec.total) + " · factura E"
      : (S.cond.fiscal === "ri" ? "IVA incluido · factura A o B" : "Factura C, sin IVA");
    var filas = [
      ["Diseño", horas(rec.horas) + " a " + dinero(r.valorHora.vhh * r.cliente.valor) + " (" + r.cliente.nombre.toLowerCase() + "), con descuento por volumen", rec.base],
      rec.urgencia > 0 && ["Recargo por urgencia", mult(r.urgencia), rec.urgencia],
      rec.licencia > 0 && ["Cesión de derechos", mult(r.licencia) + " sobre el valor intelectual", rec.licencia],
      rec.gastos > 0 && ["Gastos directos", "Incluye 10% de gestión", rec.gastos],
      rec.descuento > 0 && ["Descuento", "", -rec.descuento],
      rec.retenciones > 0 && ["IIBB y comisiones", "Calculado sobre el bruto", rec.retenciones],
      rec.iva > 0 && ["IVA 21%", "", rec.iva]
    ].filter(Boolean);

    $("res-cuerpo").innerHTML =
      '<div class="res-principal"><div class="monto">' + principal + '</div><div class="sub">' + sub + "</div></div>" +
      '<div class="banda"><div class="banda-barra" aria-hidden="true"><i></i><i></i><span class="banda-marca" style="left:' + pos + '%"></span></div>' +
      '<div class="banda-valores">' +
      "<div><span>Mínimo</span><b>" + dinero(min.total) + "</b></div>" +
      "<div><span>Recomendado</span><b>" + dinero(rec.total) + "</b></div>" +
      "<div><span>Alto</span><b>" + dinero(alto.total) + "</b></div></div></div>" +
      '<div class="factores">' + [
        ["Experiencia", r.valorHora.modo === "rapido" ? "ADG" : pct(r.valorHora.nivel.tarifa)],
        ["Cliente", pct(r.cliente.valor)],
        ["Plazo", pct(r.urgencia)]
      ].map(function (f) { return "<span>" + f[0] + "<b>" + f[1] + "</b></span>"; }).join("") + "</div>" +
      '<div class="res-datos"><div><span>Horas estimadas</span><b>' + horas(rec.horas) + '</b><span>entre ' + fNum.format(min.horas) + " y " + fNum.format(alto.horas) + " h</span></div>" +
      "<div><span>Valor hora aplicado</span><b>" + dinero(r.valorHora.vhh) + "</b><span>piso " + dinero(r.valorHora.piso) + "</span></div></div>";
    $("desglose").innerHTML = filas.map(function (f) {
      return "<tr><td>" + f[0] + (f[1] ? "<small>" + esc(f[1]) + "</small>" : "") + "</td><td>" + (f[2] < 0 ? "−" + dinero(-f[2]) : dinero(f[2])) + "</td></tr>";
    }).join("") + '<tr class="total"><td>Total</td><td>' + dinero(rec.total) + "</td></tr>";
    $("res-ref").innerHTML = pintarReferencia(r);
    $("res-alertas").innerHTML = r.alertas.length ? '<div class="alertas">' + r.alertas.map(function (a) {
      return '<div class="alerta ' + a.tipo + '">' + esc(a.texto) + "</div>";
    }).join("") + "</div>" : "";
  }

  // Comparación con el tarifario de ADG Córdoba (mismas horas, valores hora y factores de ADG)
  function pintarReferencia(r) {
    var a = r.adg;
    if (!a || !a.total || r.valorHora.modo === "rapido") return "";
    var diseno = r.rec.base;
    var dif = Math.round((diseno / a.total - 1) * 100);
    var lectura = Math.abs(dif) <= 10 ? "en línea con" : dif > 0 ? dif + "% por encima de" : Math.abs(dif) + "% por debajo de";
    return '<div class="referencia"><div class="ref-cab"><span>Tarifario ' + esc(a.nombre) + '</span><b class="num">' + dinero(a.total) + "</b></div>" +
      "<small>Tu precio de diseño está " + lectura + " la referencia de ADG (sin urgencia, derechos ni impuestos). " +
      '<a href="' + esc(a.url) + '" target="_blank" rel="noopener">Ver ADG</a></small></div>';
  }

  // ---------- 04 Presupuesto ----------
  function fechaCorta(d) { return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }); }

  function itemsPresupuesto(r) {
    var rec = r.rec;
    var pesos = rec.detalle.map(function (d) { return d.manoObra + d.licencia; });
    var totalPeso = pesos.reduce(function (a, b) { return a + b; }, 0) || 1;
    var factor = (1 - Math.min(S.cond.descuento, T.reglas.descuentoMax) / 100) / Math.max(0.01, 1 - (S.cond.iibb + S.cond.comision) / 100);
    var gastos = rec.gastos * factor;
    var netoRedondeado = rec.total / (S.cond.fiscal === "ri" ? 1 + T.reglas.iva : 1);
    var paraItems = netoRedondeado - gastos;
    var paso = enUSD() ? 10 * S.perfil.dolar : 100;
    var acumulado = 0;
    var filas = S.lineas.map(function (l, i) {
      var it = M.buscarItem(T, l.itemId);
      var monto = i === S.lineas.length - 1 ? paraItems - acumulado : Math.round(pesos[i] / totalPeso * paraItems / paso) * paso;
      acumulado += monto;
      var extras = Object.keys(l.extras).filter(function (k) { return l.extras[k]; }).map(function (k) { return T.adicionales[k].nombre.toLowerCase(); });
      return { n: it.n, det: it.ent + (extras.length ? ". Incluye " + extras.join(" y ") : ""), cant: cantidad(l.cant, it.u), monto: monto };
    });
    return { filas: filas, gastos: gastos, neto: netoRedondeado, iva: rec.total - netoRedondeado, total: rec.total };
  }

  function condicionesTexto() {
    var L = T.licencia, c = S.cond;
    var pago = { "50/50": "50% de anticipo para iniciar y 50% contra entrega de archivos finales.", "40/30/30": "40% de anticipo, 30% en la instancia de revisión y 30% contra entrega.", "100": "100% por adelantado." }[S.pres.pago];
    return [
      "Incluye " + c.rondas + " ronda" + (c.rondas > 1 ? "s" : "") + " de cambios. Las rondas adicionales se cotizan aparte.",
      "Cesión de derechos de uso: alcance " + L.alcance[c.alcance].nombre.toLowerCase() + (c.atl ? " con medios masivos" : "") + ", duración " + L.duracion[c.duracion].nombre.toLowerCase() + ", " + L.exclusividad[c.exclusividad].nombre.toLowerCase() + ". La cesión se perfecciona con el pago total (Ley 11.723).",
      "Forma de pago: " + pago,
      "Plazo de entrega: " + (S.pres.entrega || "a convenir") + " desde la aprobación y el pago del anticipo." + (T.urgencia.opciones[c.plazo].ratio < 1 ? " Incluye recargo por entrega " + T.urgencia.opciones[c.plazo].nombre.toLowerCase() + "." : ""),
      "Presupuesto válido por " + T.reglas.validezDias + " días. Los saldos abonados después de esa fecha se actualizan por IPC (INDEC).",
      enUSD() ? "Importes en dólares estadounidenses. Se emite factura E." : (c.fiscal === "ri" ? "Importes con IVA incluido." : "Importes finales. Monotributista: se emite factura C.")
    ];
  }

  function pintarDoc(r) {
    var hoy = new Date();
    var vence = new Date(hoy.getTime() + T.reglas.validezDias * 864e5);
    var numero = "P-" + hoy.toISOString().slice(0, 10).replace(/-/g, "");
    var p = S.pres;
    if (!S.lineas.length) { $("doc").innerHTML = '<p style="margin:0;color:#6a7182">Sumá servicios para generar el presupuesto.</p>'; return; }
    var d = itemsPresupuesto(r);
    $("doc").innerHTML =
      '<div class="doc-cab"><div><h3>' + esc(p.estudio || "Tu nombre o estudio") + "</h3>" + (p.contacto ? "<div>" + esc(p.contacto) + "</div>" : "") + "</div>" +
      '<div class="doc-meta">Presupuesto ' + numero + "<br>Fecha " + fechaCorta(hoy) + "<br>Válido hasta " + fechaCorta(vence) + "</div></div>" +
      '<div class="doc-partes"><div><span>Cliente</span>' + esc(p.cliente || "—") + "</div><div><span>Proyecto</span>" + esc(p.proyecto || "—") + "</div></div>" +
      '<div class="doc-tabla-wrap"><table class="doc-tabla"><thead><tr><th>Servicio</th><th>Cant.</th><th>Importe</th></tr></thead><tbody>' +
      d.filas.map(function (f) { return "<tr><td>" + esc(f.n) + "<small>" + esc(f.det) + "</small></td><td>" + esc(f.cant) + "</td><td>" + dinero(f.monto) + "</td></tr>"; }).join("") +
      (d.gastos > 0 ? "<tr><td>Gastos de producción<small>Pruebas, licencias de imágenes y tipografías</small></td><td>—</td><td>" + dinero(d.gastos) + "</td></tr>" : "") +
      "</tbody><tfoot>" +
      (d.iva > 0 ? "<tr><td>Subtotal</td><td></td><td>" + dinero(d.neto) + "</td></tr><tr><td>IVA 21%</td><td></td><td>" + dinero(d.iva) + "</td></tr>" : "") +
      '<tr class="total"><td>Total</td><td></td><td>' + dinero(d.total) + "</td></tr></tfoot></table></div>" +
      '<div class="doc-cond"><h4>Condiciones</h4><ul>' + condicionesTexto().map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="doc-pie"><span>' + esc(p.estudio || "") + "</span><span>Aceptación del cliente: ____________________</span></div>";
  }

  function textoPlano(r) {
    var d = itemsPresupuesto(r), p = S.pres;
    var l = [];
    l.push("PRESUPUESTO — " + (p.estudio || "Tu nombre o estudio"));
    if (p.contacto) l.push(p.contacto);
    l.push("Cliente: " + (p.cliente || "—"), "Proyecto: " + (p.proyecto || "—"), "");
    d.filas.forEach(function (f) { l.push("• " + f.n + " (" + f.cant + "): " + dinero(f.monto)); });
    if (d.gastos > 0) l.push("• Gastos de producción: " + dinero(d.gastos));
    if (d.iva > 0) l.push("Subtotal: " + dinero(d.neto), "IVA 21%: " + dinero(d.iva));
    l.push("TOTAL: " + dinero(d.total), "", "Condiciones:");
    condicionesTexto().forEach(function (t) { l.push("- " + t); });
    return l.join("\n");
  }

  // ---------- Ciclo de actualización ----------
  var ultimo = null;
  function actualizar() {
    var r = M.cotizar(T, S.perfil, S.cond, S.lineas);
    ultimo = r;
    pintarValorHora(r.valorHora);
    r.rec.detalle.forEach(function (d) {
      var row = document.querySelector('[data-uid="' + d.uid + '"] [data-horas]');
      if (row) row.textContent = horas(d.horas);
    });
    pintarResultado(r);
    pintarDoc(r);
    guardar();
  }

  // ---------- Inicio ----------
  $("n-piezas").textContent = T.categorias.reduce(function (a, c) { return a + c.items.length; }, 0);
  $("n-disciplinas").textContent = T.categorias.length;
  var mesEdicion =new Date(T.meta.version + "-01T12:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  $("version").textContent = mesEdicion.charAt(0).toUpperCase() + mesEdicion.slice(1);
  $("actualizado").textContent = "Coeficientes actualizados al " + T.meta.actualizado.split("-").reverse().join("/") + ".";

  segmentado($("nivel"), Object.keys(T.niveles).reduce(function (o, k) {
    var n = T.niveles[k]; var pct = Math.round((n.tarifa - 1) * 100);
    o[k] = { nombre: n.nombre, detalle: n.detalle + " · " + (pct === 0 ? "base" : (pct > 0 ? "+" : "") + pct + "%") }; return o;
  }, {}), S.perfil.nivel, function (k) { S.perfil.nivel = k; actualizar(); });

  var alCambiarPerfil = function (k) {
    if (k === "dolar") { S.dolarManual = true; $("dolar-estado").textContent = "Cotización cargada a mano."; }
    actualizar();
  };
  segmentado($("modo"), {
    rapido: { nombre: "Rápido", detalle: "Valor hora de referencia ADG" },
    costos: { nombre: "Con mis costos", detalle: "Ingresos, gastos y horas" }
  }, S.perfil.modo, function (k) { S.perfil.modo = k; actualizar(); });
  sliders($("sliders"), defsBasico, S.perfil, alCambiarPerfil);
  sliders($("sliders-av"), defsAvanzado, S.perfil, alCambiarPerfil);
  $("buscar").addEventListener("input", pintarCatalogo);
  $("dolar-mep").addEventListener("click", traerDolar);

  pintarCategorias();
  pintarCatalogo();
  pintarLineas();

  segmentado($("cliente"), T.clientes, S.cond.cliente, function (k) { S.cond.cliente = k; actualizar(); });
  segmentado($("plazo"), T.urgencia.opciones, S.cond.plazo, function (k) { S.cond.plazo = k; actualizar(); });
  segmentado($("fiscal"), {
    mono: { nombre: "Monotributo", detalle: "Factura C, sin IVA" },
    ri: { nombre: "Responsable Inscripto", detalle: "Suma IVA 21%" }
  }, S.cond.fiscal, function (k) { S.cond.fiscal = k; actualizar(); });

  ["alcance", "duracion", "exclusividad"].forEach(function (k) {
    opcionesSelect($(k), T.licencia[k], S.cond[k]);
    $(k).addEventListener("change", function () { S.cond[k] = $(k).value; actualizar(); });
  });
  ["finde", "atl"].forEach(function (k) {
    $(k).checked = S.cond[k];
    $(k).addEventListener("change", function () { S.cond[k] = $(k).checked; actualizar(); });
  });
  sliders($("sliders-cond"), defsCond, S.cond, actualizar);

  ["estudio", "contacto", "cliente", "proyecto", "entrega", "pago"].forEach(function (k) {
    var el = $("p-" + k);
    el.value = S.pres[k];
    el.addEventListener("input", function () { S.pres[k] = el.value; if (ultimo) { pintarDoc(ultimo); guardar(); } });
  });

  $("copiar").addEventListener("click", function () {
    var txt = textoPlano(ultimo);
    var ok = function () { $("estado").textContent = "Presupuesto copiado. Pegalo en un mail o mensaje."; };
    var fallo = function () {
      var range = document.createRange(); range.selectNodeContents($("doc"));
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      $("estado").textContent = "Texto seleccionado. Copialo con Ctrl+C.";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallo);
    else fallo();
  });

  // Imprimir/PDF solo cuando la página no está embebida en otro marco
  var embebida = true;
  try { embebida = window.self !== window.top; } catch (e) { embebida = true; }
  if (!embebida) {
    $("imprimir").hidden = false;
    $("imprimir").addEventListener("click", function () { window.print(); });
  }

  // Marca en el menú la sección visible
  if ("IntersectionObserver" in window) {
    var links = document.querySelectorAll(".nav-links a");
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute("href") === "#" + e.target.id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    ["s-valor", "s-servicios", "s-condiciones", "s-presupuesto"].forEach(function (id) { obs.observe($(id)); });
  }

  actualizar();
  if (!S.dolarManual) traerDolar();
})();
