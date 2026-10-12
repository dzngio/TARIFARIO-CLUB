# Tarifario de Diseño AR

Calculadora pública de tarifas para diseño gráfico en Argentina. Usa horas por pieza del tarifario de ADG Córdoba, coeficientes por cliente y experiencia de la matriz ARDG, y ajustes por plazo, cesión de derechos e impuestos.

Es un sitio estático: HTML, CSS y JavaScript, sin dependencias ni paso de build. Se publica tal cual en cualquier hosting estático.

## Estructura

```
index.html            Página: estructura y estilos
datos/tarifario.js    Tarifario editable: horas por ítem, coeficientes, valores por defecto
js/motor.js           Fórmulas de cálculo (funciones puras, sin DOM)
js/app.js             Interfaz: selectores, catálogo, resultado, presupuesto
servidor-local.ps1    Servidor de prueba para Windows (solo desarrollo)
.nojekyll             Evita que GitHub Pages procese el sitio con Jekyll
```

## Subirlo a un repositorio de GitHub

Sin instalar nada:

1. Creá un repositorio nuevo en https://github.com/new (por ejemplo `tarifario-diseno`). Puede ser público o privado.
2. En la página del repositorio vacío, elegí **uploading an existing file**.
3. Arrastrá **el contenido** de esta carpeta (no la carpeta en sí): `index.html`, `datos/`, `js/`, `README.md`, `.gitignore`, `.nojekyll`, `servidor-local.ps1`.
   Los archivos que empiezan con punto pueden estar ocultos en Windows: activalos en el Explorador con *Vista → Mostrar → Elementos ocultos*.
4. Confirmá con **Commit changes**.

Con GitHub Desktop (https://desktop.github.com): *File → Add local repository*, elegí esta carpeta, aceptá crear el repositorio y tocá **Publish repository**.

Con git en la terminal:

```bash
git init
git add .
git commit -m "Tarifario de Diseño AR"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/tarifario-diseno.git
git push -u origin main
```

## Publicarlo

Cualquiera de estas opciones conecta el repositorio y republica sola en cada cambio:

- **GitHub Pages**: en el repositorio, *Settings → Pages → Source: Deploy from a branch → main / (root)*. Queda en `https://TU-USUARIO.github.io/tarifario-diseno/`.
- **Netlify**: *Add new site → Import an existing project → GitHub*, elegí el repositorio. Build command: vacío. Publish directory: `/`.
- **Vercel**: *Add New → Project*, importá el repositorio. Framework preset: *Other*. Sin build command.

Para usar un dominio propio, configuralo desde el panel del servicio que elijas.

## Probar en tu computadora

```bash
powershell -ExecutionPolicy Bypass -File servidor-local.ps1
```

Abrí http://localhost:8080.

## Actualización mensual

Todo se edita en `datos/tarifario.js`:

1. `meta.version` y `meta.actualizado`: mes y fecha de la edición.
2. `perfilDefault`: montos de ejemplo en ARS (ingreso, gastos fijos, monotributo).
3. `referencias.adg`: valores hora y factores de cliente de ADG. Revisalos en https://www.adg.com.ar/mi-cuenta/tarifario/.
4. `niveles`, `clientes`, `urgencia`, `licencia`: coeficientes. Cambian solo si se recalibra el modelo.
5. `categorias[].items[]`: horas por entregable. `adg` toma las horas de ADG; `h: [baja, media, alta]` es estimación propia.

El dólar MEP se consulta solo en dolarapi.com al abrir la página. Si falla, se carga a mano.

## Modelo de cálculo

- **Modo rápido**: valor hora ADG según experiencia, llevado a base PyME (÷ 0,8).
- **Con mis costos**: piso = (ingreso + gastos fijos + monotributo + amortización + software) ÷ horas facturables; recomendado = piso × (1 + margen) × coeficiente de experiencia, nunca menor al piso.
- Horas por ítem = horas(complejidad) × eficiencia × cantidad × adicionales × (1 + 0,15 × rondas extra).
- Precio = horas × valor hora × cliente × descuento por volumen (tabla ADG) × urgencia + cesión de derechos + gastos, con descuento y llevado a bruto por IIBB y comisiones (+ IVA si es Responsable Inscripto).
- Banda: mínimo con valor hora piso y complejidad −20 %; alto con complejidad +20 %.

## Créditos y fuentes

- Horas por pieza, valores hora de referencia y descuento por volumen: [Tarifario ADG Córdoba](https://www.adg.com.ar/mi-cuenta/tarifario/). Conviene pedir autorización a ADG antes de publicar.
- Coeficientes de cliente y experiencia: matriz ARDG (Asociación Rosarina de Diseño Gráfico).
- Tipografías: Newsreader, Inter Tight y DM Mono (Google Fonts, licencia OFL).
