/*
 * Motor de cálculo — funciones puras, sin DOM.
 * Todas las fórmulas del modelo viven acá para poder testearlas por separado.
 */
(function () {
  "use strict";

  // Valor hora a partir de costos reales (lógica tipo calculadora freelance).
  function valorHora(p, T) {
    // Modo rápido: valor hora de referencia ADG (cliente chico) llevado a base PyME,
    // de modo que "Emprendedor" coincida con el valor ADG para cliente chico.
    if (p.modo === "rapido" && T.referencias && T.referencias.adg) {
      var nivelR = T.niveles[p.nivel] || T.niveles.ssr;
      var vhADG = T.referencias.adg.valorHora[p.nivel] || T.referencias.adg.valorHora.ssr;
      return {
        modo: "rapido",
        horasFact: 0, amortizacion: 0, software: 0, costos: 0, necesidad: 0,
        piso: vhADG,
        base: vhADG / T.clientes.emprendedor.valor,
        vhh: vhADG / T.clientes.emprendedor.valor,
        limitadoAlPiso: false,
        nivel: nivelR
      };
    }
    var horasMes = (p.horasSemana * (52 - p.semanasLibres)) / 12;
    var horasFact = horasMes * (1 - p.tiempoAdmin / 100);
    var amortizacion = (p.equiposUSD * p.dolar) / Math.max(1, p.vidaUtilMeses);
    var software = p.softwareUSD * p.dolar;
    var costos = p.costosFijos + p.monotributo + amortizacion + software;
    var necesidad = p.ingresoMensual + costos;
    var piso = horasFact > 0 ? necesidad / horasFact : 0;
    var base = piso * (1 + p.margen / 100);
    var nivel = T.niveles[p.nivel] || T.niveles.ssr;
    var ajustado = base * nivel.tarifa;
    return {
      modo: "costos",
      horasMes: horasMes,
      horasFact: horasFact,
      amortizacion: amortizacion,
      software: software,
      costos: costos,
      necesidad: necesidad,
      piso: piso,
      base: base,
      vhh: Math.max(piso, ajustado),
      limitadoAlPiso: ajustado < piso,
      nivel: nivel
    };
  }

  // Interpola horas [baja, media, alta] según complejidad 0..1
  function horasPorComplejidad(h, c) {
    c = Math.min(1, Math.max(0, c));
    return c <= 0.5 ? h[0] + (h[1] - h[0]) * (c / 0.5) : h[1] + (h[2] - h[1]) * ((c - 0.5) / 0.5);
  }

  function buscarItem(T, id) {
    for (var i = 0; i < T.categorias.length; i++) {
      var items = T.categorias[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].id === id) return items[j];
    }
    return null;
  }

  function multUrgencia(T, cond) {
    var op = T.urgencia.opciones[cond.plazo] || T.urgencia.opciones.estandar;
    var m = Math.min(T.urgencia.tope, 1 + T.urgencia.k * (1 - op.ratio));
    return m + (cond.finde ? T.urgencia.recargoFinde : 0);
  }

  function multLicencia(T, cond) {
    var L = T.licencia;
    var alcance = L.alcance[cond.alcance].valor + (cond.atl ? L.recargoATL : 0);
    return Math.max(1, alcance * L.duracion[cond.duracion].valor * L.exclusividad[cond.exclusividad].valor);
  }

  // Horas de un ítem del proyecto con un corrimiento de complejidad
  function horasItem(T, linea, eficiencia, rondas, delta) {
    var it = buscarItem(T, linea.itemId);
    if (!it) return 0;
    var c = linea.comp + delta;
    var extras = 1;
    if (linea.extras) for (var k in linea.extras) if (linea.extras[k] && T.adicionales[k]) extras *= T.adicionales[k].factor;
    var rondasExtra = Math.max(0, rondas - T.reglas.rondasIncluidas);
    return horasPorComplejidad(it.h, c) * eficiencia * Math.max(1, linea.cant) * extras * (1 + rondasExtra * T.reglas.costoRondaExtra);
  }

  // Factor de descuento por volumen según las horas del ítem (tabla ADG)
  function factorVolumen(T, horas) {
    var f = 1;
    T.reglas.descuentoVolumen.forEach(function (t) { if (horas >= t[0]) f = t[1]; });
    return f;
  }

  // Precio de referencia con el modelo ADG: horas × valor hora ADG × factor cliente ADG × volumen.
  // No incluye urgencia, cesión de derechos ni impuestos.
  function referenciaADG(T, nivel, cond, lineas) {
    var ref = T.referencias && T.referencias.adg;
    if (!ref) return null;
    var vh = ref.valorHora[nivel] || ref.valorHora.ssr;
    var fc = ref.clientes[cond.cliente] || 1;
    var total = lineas.reduce(function (acc, l) {
      var it = buscarItem(T, l.itemId);
      if (!it) return acc;
      var h = horasPorComplejidad(it.h, l.comp) * Math.max(1, l.cant);
      return acc + h * vh * fc * factorVolumen(T, h);
    }, 0);
    return { total: total, valorHora: vh, factorCliente: fc, nombre: ref.nombre, url: ref.url, consultado: ref.consultado };
  }

  function redondearArriba(x, paso) {
    return Math.ceil(x / paso) * paso;
  }

  // Un escenario de precio: tarifa horaria + corrimiento de complejidad
  function escenario(T, ctx, lineas, tarifa, delta, cli) {
    var R = T.reglas;
    var detalle = lineas.map(function (l) {
      var it = buscarItem(T, l.itemId);
      var horas = horasItem(T, l, ctx.eficiencia, ctx.cond.rondas, delta);
      var base = horas * tarifa * cli * factorVolumen(T, horas);
      return {
        uid: l.uid,
        horas: horas,
        base: base,
        manoObra: base * ctx.urg,
        licencia: base * (it ? it.phi : 0) * (ctx.mlic - 1)
      };
    });
    var horas = sum(detalle, "horas");
    var base = sum(detalle, "base");
    var manoObra = sum(detalle, "manoObra");
    var licencia = sum(detalle, "licencia");
    var gastos = ctx.cond.gastos * (1 + R.feeGastos);
    var subtotal = manoObra + licencia + gastos;
    var descPct = Math.min(ctx.cond.descuento, R.descuentoMax) / 100;
    var descuento = subtotal * descPct;
    var conDesc = subtotal - descuento;
    var retenciones = (ctx.cond.iibb + ctx.cond.comision) / 100;
    var neto = conDesc / Math.max(0.01, 1 - retenciones);
    var iva = ctx.cond.fiscal === "ri" ? neto * R.iva : 0;
    var total = redondearArriba(neto + iva, R.redondeo);
    return {
      detalle: detalle,
      horas: horas,
      base: base,
      urgencia: manoObra - base,
      licencia: licencia,
      gastos: gastos,
      descuento: descuento,
      retenciones: neto - conDesc,
      neto: neto,
      iva: iva,
      total: total
    };
  }

  function sum(arr, k) {
    return arr.reduce(function (a, x) { return a + x[k]; }, 0);
  }

  function cotizar(T, perfil, cond, lineas) {
    var vh = valorHora(perfil, T);
    var cliente = T.clientes[cond.cliente] || T.clientes.pyme;
    var ctx = {
      cond: cond,
      eficiencia: vh.nivel.eficiencia,
      urg: multUrgencia(T, cond),
      mlic: multLicencia(T, cond)
    };
    var b = T.reglas.bandaComplejidad;
    var rec = escenario(T, ctx, lineas, vh.vhh, 0, cliente.valor);
    // El mínimo nunca aplica descuento por tipo de cliente: es el piso de costos.
    var min = escenario(T, ctx, lineas, vh.piso, -b, Math.max(1, cliente.valor));
    var alto = escenario(T, ctx, lineas, vh.vhh, b, cliente.valor);
    // Costo puro de las horas recomendadas, para detectar precios que no cubren costos
    var costoHoras = rec.horas * vh.piso;

    var alertas = [];
    if (vh.limitadoAlPiso)
      alertas.push({ tipo: "aviso", texto: "Con el ajuste de " + vh.nivel.nombre.toLowerCase() + " el valor hora quedaba por debajo de tus costos. Se usa tu valor hora piso." });
    if (cond.descuento > T.reglas.descuentoMax)
      alertas.push({ tipo: "aviso", texto: "El descuento se limitó al " + T.reglas.descuentoMax + "%." });
    if (lineas.length && (rec.base + rec.urgencia + rec.licencia - rec.descuento) < costoHoras)
      alertas.push({ tipo: "critico", texto: "Con estas condiciones el precio no cubre tus costos ni tu ingreso objetivo." });
    if (ctx.urg >= 1.75)
      alertas.push({ tipo: "info", texto: "El recargo por urgencia es alto. Confirmá el plazo por escrito antes de empezar." });
    if (cliente.usd)
      alertas.push({ tipo: "info", texto: "Para clientes del exterior se emite factura E (exportación de servicios). Verificá la normativa vigente de cobro de divisas." });

    return {
      valorHora: vh,
      cliente: cliente,
      urgencia: ctx.urg,
      licencia: ctx.mlic,
      min: min,
      rec: rec,
      alto: alto,
      adg: referenciaADG(T, perfil.nivel, cond, lineas),
      alertas: alertas
    };
  }

  window.Motor = {
    valorHora: valorHora,
    horasPorComplejidad: horasPorComplejidad,
    buscarItem: buscarItem,
    multUrgencia: multUrgencia,
    multLicencia: multLicencia,
    horasItem: horasItem,
    factorVolumen: factorVolumen,
    referenciaADG: referenciaADG,
    cotizar: cotizar
  };
})();
