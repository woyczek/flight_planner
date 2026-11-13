# Piloto — manual

La aplicación Piloto reúne las herramientas para preparar y seguir un vuelo: combustible y nivel, mapa, informe, mis
vuelos, paso al sitio de la aerolínea. Funciona en un teléfono como en un ordenador, con o sin red.

## Primer inicio

- **Los verbos.** En un teléfono, la barra inferior ofrece cinco entradas: Preparar, Mapa, Meteo, Informe, Vuelos. Toque
  de nuevo una pestaña ya elegida cuando agrupa varias pantallas: se abre encima una pequeña lista (Preparar: Combustible y
  Fichas de rendimiento). En una pantalla, cada herramienta es un verbo de la columna izquierda. La dirección de una
  herramienta (`#fuel`, `#report`…) basta para volver a ella. Los Ajustes son el botón ⚙ de la cabecera. El nombre de la aplicación, arriba a la
  izquierda, abre la lista de aplicaciones: Piloto, Compañía (las misiones de la aerolínea) y, en el nivel Completo,
  Mantenimiento (el mismo avión en rojo); un toque pasa a ella.
- **Su identidad.** En ⚙ Ajustes, configure su trigrama y sus identificadores IVAO, VATSIM y SimBrief: las herramientas
  los usan para prerrellenar.
- **El nivel.** También en Ajustes, «Nivel» elige lo que muestra el menú: Descubrimiento, Habitual o Completo. Una
  herramienta oculta sigue accesible por su dirección.
- **La ayuda.** Cada herramienta tiene, bajo su contenido, un panel plegado «Cómo usarlo»; el botón ? de la cabecera (en un teléfono
  como en una pantalla) abre este manual en el capítulo de la pantalla en la que está.
- **El estado, en el botón ⚙.** En la cabecera, el botón ⚙ lleva un punto: verde cuando algo le espera (un vuelo
  iniciado, un informe por escribir), naranja (en un teléfono) cuando algo requiere atención: sin trigrama, escrituras
  pendientes, conflictos, un error de sincronización, sin conexión. Los Ajustes se abren con el bloque «Estado», que da el
  detalle: el vuelo en curso (toque para ir al Mapa), los informes por escribir de sus vuelos pasados (toque para abrir el
  informe ya rellenado), el trigrama que falta (toque para definirlo), el estado de los datos (última sincronización,
  escrituras pendientes, vía de intercambio usada), la base aeronáutica mientras no esté lista, el lanzador, «Sin conexión»
  cuando no hay red, el número de llamadas meteorológicas del día (previsiones Open-Meteo, 10 000 permitidas al día), el fin
  del ciclo AIRAC cuando la base aeronáutica o los procedimientos publicados van por detrás del ciclo en vigor y, en un teléfono, la fuente de la posición durante un vuelo. En un teléfono, la cabecera se reduce al
  nombre, el botón ? y el botón ⚙.
- **Pantalla completa.** En el mapa (las herramientas de vista fija), un botón redondo al final de la columna de botones
  sobre el mapa oculta la cabecera y la barra inferior para dejar todo el sitio al mapa; el mismo botón o Esc los devuelven.
- **Teléfono en horizontal.** Girado de lado, el teléfono coloca la barra inferior como un carril de iconos a la izquierda (las
  mismas cinco entradas; un segundo toque en Preparar abre sus herramientas a la derecha del carril), conserva la cabecera, pone
  el bloque de datos del mapa como una columna a la derecha (toque su primera línea, o arrástrela hacia la izquierda, para
  ensancharla o estrecharla) y da al mapa toda la altura que queda. En pantalla completa, la columna se queda.

## Datos y sincronización

- **Posición y traza del vuelo.** Con el uso «varios usuarios», la posición real y la traza de su vuelo en curso (un punto
  por milla náutica o por minuto, con unos 100 m de precisión) se comparten con el grupo y quedan en el historial del
  repositorio; nunca van a un servicio externo sin un gesto suyo.
- **Primero sin conexión.** Todo lo que hace se guarda en el dispositivo y funciona sin red.
- **Solo en este dispositivo.** Sin intercambio marcado en Ajustes, nada sale a otro lugar: exporte de vez en cuando la
  copia del dispositivo (un fichero), es la única copia.
- **Varios dispositivos, o varios usuarios.** Marque el uso en Ajustes y configure el acceso (repositorio GitHub y token
  personal, o el lanzador de un puesto). Sus escrituras salen juntas en la sincronización: al inicio, cada 10 minutos en
  línea, o con el botón de estado arriba en la pantalla.
- **Conflictos.** Un fichero cambiado aquí y en otro lugar a la vez conserva su versión más reciente; la otra sigue
  disponible (botón de estado, luego «Conflictos») y puede recuperarse; «Visto» quita un conflicto de la lista y del recuento, «Marcar
  todo como visto» lo hace con todos a la vez.

## Informar de un problema o hacer una petición

En la Ayuda, «Informar de un problema o hacer una petición»: elija un tipo (error, regresión, ergonomía, rendimiento, petición), escriba un título y lo que pasó (2000 signos); la pantalla de la que venía, el tamaño, el diseño, el idioma y la versión se anotan solos (nunca datos de vuelo ni claves) y se pueden desmarcar. En el puesto de la ergonomía, el informe se escribe de inmediato en el archivo de informes de la suite, con hasta tres capturas de pantalla (se quedan en ese puesto, no se publica nada); en cualquier otro dispositivo sale hacia el repositorio de la compañía con el próximo envío agrupado, sin correo. «Mis informes» guarda los diez últimos y su estado; sin acceso, el informe se queda en el dispositivo («no enviado») y sale al volver el acceso.
