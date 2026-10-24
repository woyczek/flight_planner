# Piloto — manual

La aplicación Piloto reúne las herramientas para preparar y seguir un vuelo: combustible y nivel, mapa, informe, mis
vuelos, paso al sitio de la aerolínea. Funciona en un teléfono como en un ordenador, con o sin red.

## Primer inicio

- **Los verbos.** En un teléfono, la barra inferior ofrece cinco entradas: Preparar, Mapa, Informe, Vuelos, Ajustes
  (Preparar agrupa varias herramientas: toque de nuevo la pestaña ya elegida y se abre encima una pequeña lista para pasar
  de una a otra); en una pantalla, cada
  herramienta es un verbo de la columna izquierda. La dirección de una herramienta (`#fuel`, `#report`…) basta para
  volver a ella.
- **Su identidad.** En ⚙ Ajustes, configure su trigrama y sus identificadores IVAO, VATSIM y SimBrief: las herramientas
  los usan para prerrellenar.
- **El nivel.** También en Ajustes, «Nivel» elige lo que muestra el menú: Descubrimiento, Habitual o Completo. Una
  herramienta oculta sigue accesible por su dirección.
- **La ayuda.** Cada herramienta tiene arriba un panel plegado «Cómo usarlo»; el botón ? (en un teléfono, la última línea
  de la hoja del botón i, «Ayuda de esta pantalla») abre este manual en el capítulo de la herramienta.
- **El botón i.** En la cabecera, junto a ⚙ (y a ?, en una pantalla): un punto verde cuando algo le espera, naranja (en un
  teléfono) cuando algo requiere atención: sin trigrama, escrituras pendientes, conflictos, un error de sincronización, sin
  conexión. Abre una hoja de estado: el vuelo en curso (toque para ir al Mapa), los informes por escribir de sus vuelos
  pasados (toque para abrir el informe ya rellenado), el trigrama que falta (toque para definirlo), el estado de los datos
  (última sincronización, escrituras pendientes, vía de intercambio usada), «Sin conexión» cuando no hay red y, en un
  teléfono, la fuente de la posición durante un vuelo y «Ayuda de esta pantalla». Esc o ✕ la cierra. En un teléfono, la
  cabecera se reduce al nombre, el botón i y ⚙.
- **Pantalla completa.** En el mapa (las herramientas de vista fija), un botón redondo al final de la columna de botones
  sobre el mapa oculta la cabecera y la barra inferior para dejar todo el sitio al mapa; el mismo botón o Esc los devuelven.
- **Teléfono en horizontal.** Girado de lado, el teléfono coloca la barra inferior como un carril de iconos a la izquierda (las
  mismas cinco entradas; un segundo toque en Preparar abre sus herramientas a la derecha del carril), conserva la cabecera, pone
  el bloque de datos del mapa como una columna a la derecha (toque su primera línea, o arrástrela hacia la izquierda, para
  ensancharla o estrecharla) y da al mapa toda la altura que queda. En pantalla completa, la columna se queda.

## Datos y sincronización

- **Primero sin conexión.** Todo lo que hace se guarda en el dispositivo y funciona sin red.
- **Solo en este dispositivo.** Sin intercambio marcado en Ajustes, nada sale a otro lugar: exporte de vez en cuando la
  copia del dispositivo (un fichero), es la única copia.
- **Varios dispositivos, o varios usuarios.** Marque el uso en Ajustes y configure el acceso (repositorio GitHub y token
  personal, o el lanzador de un puesto). Sus escrituras salen juntas en la sincronización: al inicio, cada 10 minutos en
  línea, o con el botón de estado arriba en la pantalla.
- **Conflictos.** Un fichero cambiado aquí y en otro lugar a la vez conserva su versión más reciente; la otra sigue
  disponible (botón de estado, luego «Conflictos») y puede recuperarse.
