# Manual de usuario

Este manual describe la suite SO Group Virtual (Virtual Special Operation Group) para los **pilotos**: un capítulo por página, una sección por pestaña o por
bloque, en el orden en que aparecen. En la suite, la entrada **«Ayuda»** de la barra lateral abre este manual en el
capítulo de la página actual. El Centro y la administración de la suite se describen en el
[manual del administrador](MANUEL_ADMINISTRATEUR.md); para un primer informe paso a paso, consulte el
[tutorial](../TUTORIAL.md). Índice de toda la documentación: [índice de la documentación](../README.md).

## Primeros pasos
<!-- page: index.html -->

La suite «SO Group Virtual» reúne en el navegador todo lo que el piloto necesita: misiones asignadas por el Centro, disponibilidad, mapas de vuelo, combustible, informes de misión, aterrizajes e informes estadísticos.
Todas las páginas comparten las mismas referencias: una barra lateral a la izquierda, una cabecera arriba, a veces pestañas y, después, bloques.
Este capítulo describe estos elementos comunes; los capítulos siguientes detallan cada página.
La página de inicio (`index.html`) muestra las aplicaciones en forma de tarjetas y la versión de la suite.
Abra la suite con el lanzador o un marcador: una página de la suite abierta desde un enlace de otro sitio (correo web, foro…) se rechaza, para que ese sitio no pueda leer ni activar nada en ella.

### La barra lateral

La columna de la izquierda da acceso a las aplicaciones. La entrada de la página mostrada aparece resaltada.

Lo que muestra depende de su **nivel de uso** (Mi perfil › «Nivel de uso»): como mucho siete entradas, nunca más de lo que su uso necesita.

| Entrada | Lo que abre | Nivel |
|---|---|---|
| «Hoy» | Próxima misión, informes por escribir, semana; primera entrada en todos los niveles | 1 |
| «Mis misiones» | Misiones asignadas por el Centro y disponibilidad (pastilla roja: misiones no leídas) | 1 |
| «Informe» | Introducción de un informe de misión | 1 |
| «Planificación» | Planificación de órdenes de la semana (Tablero, en solo lectura en el nivel 1 o sin el Centro); en el nivel 4, franjas comunes y misiones probables de la página ODV | 1 |
| «Misiones» | Generador de misiones y registro, en pestañas; estudio cartográfico en el nivel 4 | 3 |
| «Herramientas» | Mapas de vuelo, combustible, aterrizajes, análisis de misiones (herramientas marcadas en Mi perfil, todas en el nivel 4) | 1 a 4 |

- El nivel ordena la interfaz, no da ningún derecho: las páginas del Centro (Misiones, planificación ODV, modificación del Tablero) siguen requiriendo el Centro activado.
- Al pie de la columna: «Ajustes» (Mi perfil, Apariencia, Centro, Instalación, Mantenimiento, Primer arranque, en pestañas) y **«Ayuda»**. Estas dos entradas quedan fijas al pie de la pantalla: solo la lista de arriba se desplaza cuando hay demasiados iconos (ventana de menos de 460 px de alto: toda la barra se desplaza).
- «Ayuda» abre la documentación en una ventana, encima de la página actual, directamente en el capítulo de esa página. La ventana se cierra con ✕, Esc o un clic al lado; al reabrirla, continúa donde se quedó. «↗» la abre en página completa (Ctrl-clic en «Ayuda»: en una pestaña nueva). Sustituye a la antigua entrada «Menú». También funciona cuando la suite se abre desde el disco, sin el lanzador: los documentos están integrados en la página.
- El logotipo de la parte superior de la columna abre el sitio de la aerolínea virtual en una nueva pestaña.
- La barra se oculta en una pantalla estrecha (menos de 760 px) y al imprimir. Puede ocultarse o mostrarse siempre: Apariencia › Iconos › «Barra lateral».

### La cabecera

La cabecera muestra el título de la página y su subtítulo. A la derecha están las herramientas, que solo aparecen cuando son útiles:

| Elemento | Función |
|---|---|
| Sobre sellado (sobre rojo con un número) | Hay misiones asignadas a usted que aún no ha leído. Un clic abre «Mis misiones». |
| «Sincronizar (n)» | Intercambia los datos compartidos con el repositorio común. N = cambios por enviar + actualizaciones por recibir. En los niveles 1 y 2, un punto sustituye al número (sigue en cabeza del texto emergente); el contador «(n)» se muestra en los niveles 3 y 4. |
| «Guardar en la carpeta (n) · última: …» (botón rojo) | Recordatorio de copia de seguridad de los datos locales, mostrado a partir de 10 cambios sin guardar. |
| «⚠ n» | Alertas de la página ya borradas de la pantalla: un clic las vuelve a mostrar. |
| Bandera «Idioma» | Elección del idioma: «Auto» (idioma del navegador), Français, English, Deutsch, Español. |
| ☰ | Menú completo de la suite. |

**«Sincronizar»** solo existe si la suite se abre con el lanzador y la carpeta `data/` es un repositorio git.
- Un clic escribe primero los archivos guardados en el navegador, después envía sus cambios (firmados con su trigrama), recupera los de los demás y los fusiona.
- En caso de conflicto en una misma ficha, se conserva la versión más reciente; la otra se copia en `_conflits/` y una notificación lo indica.
- El texto emergente da el detalle (cambios por enviar, elementos por recibir, última sincronización). El botón muestra el último estado conocido; se vuelve a comprobar con la frecuencia ajustada en Ajustes › Mantenimiento › Versiones y sincronización (cada 30 minutos por defecto; también en cada página, 3 veces al día o una vez al día, y «Comprobar ahora»).
- Sin trigrama configurado, la sincronización no se inicia: configúrelo en Ajustes › Mi perfil. Consulte [la arquitectura de la sincronización](../technique/SYNCHRONISATION.md).

**«Guardar en la carpeta»** copia todos los datos guardados por el navegador (borradores, perfil, preferencias…) en el archivo `defa_local_store.yaml` de la carpeta de copia de seguridad.
- El primer clic pide elegir esa carpeta; si no es posible usar una carpeta, la copia se descarga.
- Cuando la carpeta está autorizada, la copia también se hace sola al salir de la página y cada 5 minutos.
- Los ajustes de visualización (diseño, idioma, disposición de los bloques…) se guardan, pero no cuentan para el recordatorio.

**El menú ☰** contiene, de arriba abajo:
- los botones «Apariencia» y «Ajustes»;
- la lista de las páginas de la suite y, después, las páginas de ajustes (Mi perfil, Centro, Instalación, Mantenimiento, Apariencia, Primer arranque);
- el grupo «Perfil de piloto» (trigrama; ID IVAO, ID VATSIM y SimBrief en solo lectura, con «Modificar en Mi perfil ↗»), que usan todas las páginas;
- el grupo «Datos locales»: «Guardar en la carpeta», «Restaurar / resincronizar», «Carpeta de copia…», «Descargar la copia», «Restaurar desde un archivo…», y la fecha de la última copia;
- el grupo «Página», cuando la página ofrece sus propias acciones.

La restauración fusiona: para cada dato, gana el más reciente. También sirve para recuperar sus datos en otro navegador o en otro equipo.

### Las pestañas en la parte superior de la página

Algunas entradas de la barra lateral agrupan varias páginas hermanas, presentadas en pestañas bajo la cabecera:

| Entrada | Pestañas |
|---|---|
| «Mis misiones» | «Mis misiones», «Mi disponibilidad» |
| «Ajustes» | «Mi perfil», «Apariencia», «Primer arranque» (desde el nivel 1); «Centro», «Instalación» (nivel 2); «Mantenimiento» (nivel 4) |
| «Misiones» (Centro) | «Generador de misiones», «Estudio cartográfico» |

Un clic en una pestaña abre la página correspondiente. Un clic con Ctrl (o Mayús) la abre en una nueva pestaña del navegador. Las pestañas siguen el nivel de uso (Mi perfil › «Nivel de uso»); una dirección directa a una sección la abre siempre.

### Los bloques

El contenido de las páginas se divide en bloques con título. Cada título de bloque tiene dos controles:
1. «Ocultar» / «Mostrar»: pliega o despliega el bloque (en los diseños con materiales, solo se ve el icono; el texto aparece como texto emergente).
2. ↕ «Mover»: tome este asa y arrastre el bloque sobre otro: soltado en su mitad superior, se coloca delante, en su mitad inferior, detrás; puede cambiar de columna. El bloque de destino se ilumina y la página se desplaza al acercarse al borde inferior de la ventana o a la cabecera.

La disposición (orden, bloques ocultos) se memoriza **por página y por navegador**. Se recupera en cada visita. Menú ☰ › «Restablecer el orden de los bloques» devuelve el orden original de la página (los bloques ocultos siguen ocultos).
Algunos bloques están ocultos de entrada mientras no los haya mostrado una primera vez. Los campos de texto (ruta, observaciones…) crecen con su contenido, hasta tres quintos de la pantalla (Chrome y Edge).

### Las notificaciones flotantes

Los mensajes de la suite (éxitos, advertencias, errores) aparecen en la parte inferior de la pantalla, en el centro, en pequeñas burbujas.
- Se borran solas: unos 5 s para una información, 8 s para una advertencia, 12 s para un error.
- Si deja el puntero encima, el borrado se suspende; la cruz «×» cierra la burbuja de inmediato.
- Quedan como máximo cuatro mensajes en pantalla.
- Un recordatorio repetitivo (por ejemplo «Base SIA ausente de este navegador…» del estudio cartográfico y de los mapas de vuelo) solo se muestra **una vez por sesión** del navegador. Algunos mensajes están reservados a los niveles de uso superiores: por debajo no se muestran, pero las advertencias y los errores quedan en el registro del indicador «⚠ n».
- Las advertencias y los errores borrados siguen disponibles en el indicador «⚠ n» de la cabecera: «ACK» confirma una alerta, «Confirmar todas» las confirma todas, «Vaciar» borra la lista. Este registro se pierde al cambiar de página.
- Una tarea larga (lectura, generación…) muestra una barra de progreso en la misma pila. Salir de la página durante la tarea pide una confirmación. Cuando la tarea puede interrumpirse, la barra lleva un botón **«Detener»**: el paso en curso termina, los siguientes no se inician y la burbuja dice «Cancelado.». El botón existe para la generación y las vistas previas de los mapas (estudio cartográfico y mapas de vuelo: parada entre dos mapas), el cálculo de la MORA (de una zona, de la cuadrícula completa o por bloques), la importación de la MILAIP ENR 5.7 y la puesta a punto de las zonas (Mantenimiento), y la lectura de la carpeta de misiones (Registro).
- Una tarea detenida dice qué queda parcial. Mapas: una generación detenida no descarga ningún ZIP y no guarda nada en la carpeta de la misión (un lote de misiones indica cuántas están terminadas); las vistas previas ya mostradas se quedan. MORA por bloques (botón «Detener (reanudar más tarde)»): los bloques ya calculados se escriben en `mora.csv` (cuadrícula parcial), «Reanudar el cálculo completo…» continúa más tarde. MORA de una zona, cuadrícula MORA e importación de la MILAIP: no se escribe nada. Lectura de la carpeta de misiones: el registro queda sin cambios.
- Los mensajes de error dicen qué ha fallado y qué hacer, en lugar de un código solo. Ejemplos: «el servidor no responde — comprobar que la suite se abre con el lanzador (lancer.cmd / lancer.sh), reiniciarlo si hace falta y volver a intentarlo»; «archivo ausente — comprobar que está en la carpeta esperada (o volver a crearlo) y volver a intentarlo»; «almacenamiento del navegador lleno — liberar espacio (Ajustes › Mantenimiento › Espacio en disco) y volver a intentarlo». Otros casos: servicio en línea que no responde, error del servidor, acceso denegado por el navegador, tiempo agotado; un error inesperado se muestra como «error» seguido del detalle técnico entre paréntesis.
- Las preguntas («¿Borrar…?») se abren en una pequeña ventana con «Confirmar» y «Cancelar».

### Conexión, modo develop o producción, suplantación

La aerolínea funciona en uno de estos dos modos, configurado por un administrador del Centro:

| Modo | Efecto para el piloto |
|---|---|
| develop (por defecto) | Trigrama libre (el del perfil de piloto), conexión opcional. |
| producción | Conexión obligatoria para «Mis misiones» y «Mi disponibilidad»; el trigrama es el de la conexión y ya no se puede modificar. |

- En modo producción, estas páginas muestran «Modo producción: conéctese para ver sus misiones.» con los campos «Trigrama» y «Contraseña», y el botón «Conectarse».
- Una contraseña provisional (dada por un administrador) debe cambiarse: Ajustes › Mi perfil › «Conexión y contraseña».
- Un administrador puede actuar en lugar de un piloto (suplantación). Una barra lo recuerda en todas las páginas: «Suplantación: usuario … (por …, escrituras firmadas «… pour …»)», con el botón «Terminar la suplantación».
- Los controles se hacen en el navegador: no sustituyen una verdadera verificación por un servidor.

### Los diseños

La suite ofrece varios diseños. Cambian la forma de las páginas, no la información.

| Diseño | En resumen |
|---|---|
| Estándar, Aero, Operativo, Consola | Diseños «planos»: esquinas redondeadas, densidad, títulos, barra lateral. |
| Gabinete, Cuaderno de vuelo, Robusto, Aqua, Táctico | Diseños con materiales (cuero, madera, latón, aluminio, acero, cristal); Táctico: noche, vidrio ahumado, acento cian, títulos Orbitron, sin imágenes. Aqua es el diseño de una instalación nueva. |

- En los diseños con materiales, la carpeta de misión de «Mis misiones» se convierte en un auténtico libro, con sus animaciones.
- La elección se hace en Apariencia: cada diseño se muestra en miniatura y se aplica al instante. Consulte el capítulo [Apariencia](#apariencia).

## Hoy
<!-- page: apps/pilot/aujourdhui.html -->

Esta página es la primera entrada de la barra lateral, en cualquier nivel de uso. Responde a tres preguntas sin buscar nada: cuál es mi próxima misión, qué informes me quedan por escribir, qué ocurre esta semana.
Cada bloque ofrece una sola acción. Los datos proceden de las asignaciones del Centro (véase «Mis misiones») y del registro de informes: no hay nada que volver a introducir. La página se vuelve a leer sola cuando cambia de idioma, de trigrama o de sesión.
La página de inicio también la ofrece al principio de «Mis tareas».

### Mi próxima misión

- La misión que se le ha asignado más próxima (por venir, o despegada hace menos de seis horas): hora en UTC, misión y título, aeronave (tipo y matrícula), aeródromo, indicativo; «traslado» o «alerta, listo a las …» si procede, y «● nueva» mientras no la haya abierto.
- Acción: **«Abrir la carpeta»** abre la misión en «Mis misiones».
- Sin trigrama configurado, este bloque lo pide en el acto: el campo «Trigrama» (de dos a cuatro letras) y el botón «Guardar». El trigrama se guarda en el perfil de piloto y los tres bloques se vuelven a leer de inmediato, sin pasar por Ajustes › Mi perfil. En modo producción o durante una suplantación, es el trigrama de la conexión: el bloque indica «Sin trigrama: inicie sesión para ver sus misiones.»
- Sin misión próxima, el bloque lo dice: «Ninguna misión próxima está asignada a …».

### Informes por escribir

- Las misiones que se le han asignado, despegadas hace menos de 21 días, para las que el registro de informes no contiene ningún informe. La más reciente va primero; siete líneas como máximo.
- Un informe es conocido si procede de una orden de misión: el registro (`missions.yaml`) lo vincula a la asignación mediante su referencia de orden (misión, piloto, despegue). Un informe iniciado de otro modo, con la familia elegida a mano, no cuenta: la misión permanece en la lista.
- Cada línea indica la misión, su título, la hora, la aeronave y el aeródromo, con dos botones.
- **«Escribir el informe»** abre la carpeta de la misión en «Mis misiones» y comienza el informe en la familia de la misión, rellenado desde la orden de misión (dirección `?mission=…&do=cr`).
- **«Sin informe»** retira la misión de la lista (misión cancelada, no volada…). La elección se memoriza solo en este navegador; el registro no se toca.
- Si todo está entregado, el bloque dice «Nada pendiente: sus misiones pasadas tienen su informe.» Sin trigrama, remite al campo del primer bloque («Trigrama por introducir arriba.»).

### Mi semana

- Siete columnas, de lunes a domingo de la semana en curso (días en UTC); el día actual aparece rodeado.
- Sus misiones figuran como mosaicos: hora y número de misión, o «alerta».
- Acción: un clic en un mosaico abre la carpeta de la misión en «Mis misiones». Sin trigrama, el bloque dice «Sin trigrama, la semana queda vacía.»

## Mis misiones
<!-- page: apps/pilot/mes_missions.html -->

Esta página reúne las misiones que el Centro le asigna, la carpeta de cada una, su disponibilidad y su trigrama.
Se llega a ella por la entrada «Mis misiones» de la barra lateral, por el sobre sellado de la cabecera o por la pestaña «Mis misiones».
Diseño de la página: la lista de misiones y la carpeta abierta una al lado de la otra (la carpeta ocupa dos tercios del ancho), «Mi disponibilidad» debajo, a todo el ancho. Sin carpeta abierta, la lista ocupa todo el ancho. En una pantalla estrecha (menos de 1100 px), todo pasa a una sola columna: misiones, carpeta, disponibilidad.
En modo producción, la página pide primero conectarse.
Según el nivel de uso (Mi perfil › «Nivel de uso»), la carpeta de la misión muestra más o menos secciones (véase «Misión»); algunos botones y enlaces solo aparecen a partir del nivel Planificación (2) o en el nivel Experto (4).

### Mis misiones de la semana

La lista de las misiones que tiene asignadas para la semana mostrada, ordenadas por hora de despegue (UTC).

- **Barra de semana**: «‹» semana anterior, campo de fecha (ir a la semana de una fecha), «›» semana siguiente, «⟲» volver a la semana actual (visible fuera de la semana actual). Es común a la lista y a la disponibilidad: cambiar de semana aquí cambia los dos bloques.
- **Columnas**: «Despegue (UTC)» (o «guardia» y la hora a la que hay que estar listo), «Misión», «Título», «Aeronave», «Aeródromo», «Indicativo».
- Un punto ● al principio de la línea señala una misión **nueva, aún no abierta**.
- Una mención «traslado» indica que traslada una aeronave para otro piloto: solo se le entrega la orden de traslado, no el brief de la misión.
- Un clic en una línea abre la misión en el bloque «Misión».
- Casilla «mostrar también las misiones pasadas»: por defecto, una misión desaparece unas horas después de su despegue. La elección se memoriza.
- Sin trigrama configurado, el campo para introducirlo aparece bajo la lista (campo «Trigrama», botón «Guardar»): una vez guardado, la lista y la disponibilidad se vuelven a leer. En modo producción o durante una suplantación, es el trigrama de la conexión.
- Una dirección `?mission=…` procedente de «Hoy» o de «Nuevo informe» muestra la semana de esa misión (misiones pasadas mostradas si hace falta); con `?do=cr`, el informe comienza en cuanto se abre la carpeta.
- **Piloto**, **Aeronaves dominadas**, **Simuladores**: tres botones bajo la lista, hacia Ajustes › Mi perfil (sección «Identidad y redes» para el trigrama; sección «Aeronaves y simuladores», en la tarjeta de aeronaves o en la de simuladores). El botón «Piloto» muestra el trigrama utilizado para encontrar sus misiones y su disponibilidad. En modo producción o durante una suplantación, es el trigrama de la conexión.
- Estos tres botones aparecen a partir del nivel Planificación (2). En el nivel Tripulación (1), solo aparece «Piloto», mientras el trigrama no esté configurado.

### Misión

La carpeta de la misión elegida, en solo lectura. Este bloque solo aparece tras un clic en una misión.

**Cubierta y sello**
- Una misión no leída llega sellada: cubierta cerrada con la etiqueta «CONFIDENCIAL» (número, título, aeronave, indicativo, despegue).
- Para abrirla: haga clic en la cubierta o en «Abrir la misión» («romper el sello»). La misión queda entonces marcada como leída: el punto ● de la lista, la pastilla de la barra lateral y el sobre de la cabecera se actualizan.
- Una misión ya leída se muestra cerrada con «Abrir la carpeta», o directamente abierta.
- Mientras la misión está sellada, los botones de acción permanecen en gris.

**Contenido de la carpeta** (en orden):
1. La orden de misión: «Aeronave asignada», «Indicativo», «Aeródromo de salida», «Despegue solicitado» (o «Listo a las» para una guardia), traslado eventual, «Estado», compañeros («Con»), introducción y resumen.
2. El detalle: «Objetivo / sector», «Descripción detallada», «Riesgos y puntos de atención», «Equipos desplegados», «Ruta facilitada» (tabla de puntos y plano).
3. Los «Mapas facilitados»: un clic amplía un mapa en un visor (se cierra con la cruz o con Esc).
4. El final: «Objetivos», «Observaciones», «Ficha técnica», «Historial de asignaciones», y la firma del Centro.
5. Los «Sobres y mensajes en vuelo», si los hay (véase más abajo).

**Según el nivel de uso**:
- Tripulación (1): la orden de misión, el resumen, la ruta facilitada, los mapas, los objetivos, la firma y los sobres;
- Planificación (2): además, la introducción, el objetivo / sector, la descripción detallada, los riesgos, los equipos desplegados, las observaciones y las demás secciones del resumen;
- Diseño (3): además, la ficha técnica y el historial de asignaciones;
- Experto (4): toda la carpeta; en el canal develop de actualizaciones, «Volver a sellar» vuelve a sellar la misión (no leída).

**El libro** (diseños Gabinete, Cuaderno de vuelo, Aqua y Robusto, pantalla de al menos 760 px)
- La carpeta abierta se presenta a doble página. El contenido demasiado largo pasa a la página siguiente; los mapas se colocan de dos en dos por página.
- Para pasar página: la esquina doblada abajo a la derecha (página siguiente) o abajo a la izquierda (página anterior). Un clic en la página hace lo mismo.
- En la primera doble página, la esquina izquierda cierra la carpeta.
- El **marcapáginas** salta al final de la carpeta; desde allí, abre los sobres sellados (si los hay); si no, vuelve al principio.
- Puede aparecer una página «dejada en blanco intencionadamente»: es deliberada, para que el final de la carpeta caiga a la izquierda.
- Los sobres se guardan detrás del marcapáginas, después de una página «Información complementaria».
- En los demás diseños, o en pantalla estrecha, la carpeta se muestra con una presentación normal, en una sola columna.

**Sobres de ejercicio sellados**
- En un ejercicio, algunos sobres o mensajes solo deben leerse a una hora determinada. Cada uno se presenta como un sobre: «Sobre sellado», «Mensaje de radio esperado» o «Mensaje que transmitir», con la mención «A abrir:» seguida de la hora (UTC) y del momento previsto.
- A la hora indicada, el sobre se abre solo; una notificación lo anuncia («…: hora de apertura alcanzada.»).
- Antes de la hora, «Romper el sello» pide una confirmación: el botón pasa a «Confirmar: abrir antes de la hora» durante 5 segundos.
- Un sobre abierto puede volver a cerrarse con «Volver a sellar».
- Cada gesto (apertura a la hora, antes de la hora, nuevo sellado) se anota en el registro; el informe lo utilizará.

**Botones bajo la carpeta**

| Botón | Efecto |
|---|---|
| «Abrir en los mapas de vuelo» | Abre los Mapas de vuelo con esta misión (aeronave asignada en primer lugar). |
| «Combustible (planificador)» | Abre el planificador de combustible en una nueva pestaña, con la ruta, la distancia, el nivel de crucero y la aeronave. |
| «Crear el informe» | Abre el informe de la familia de la misión, ya rellenado. |
| «Cerrar la carpeta» | Cierra la carpeta (la misión sigue marcada como leída). |

Estos botones están en gris si la misión no aporta lo necesario (falta el archivo de misión, ruta demasiado corta).
«Abrir en los mapas de vuelo» y «Combustible (planificador)» solo aparecen si la herramienta correspondiente está marcada en Mi perfil › «Nivel de uso» (siempre en el nivel Experto). Sin los Mapas de vuelo, «Crear el informe» pasa a ser el botón principal.
El botón «⤢ Ancho completo» del título del bloque extiende la carpeta a todo el ancho, por encima de la lista; «⇥ Junto a la lista» la vuelve a poner al lado. La elección se memoriza.

**Animaciones** (desactivadas si el sistema pide menos animaciones)
- Gabinete: el legajo sale del archivador, que se abre, y luego la página pasa.
- Cuaderno de vuelo: el cuaderno sale de su sobre y luego se abre como un libro.
- Aqua: la carpeta se amplía hasta convertirse en libro.
- Robusto: el cierre se resiste y luego cede; la cubierta se abre pesadamente.
- Otros diseños: simple fundido.
- Cambio de misión: la carpeta abierta se cierra y sale hacia la izquierda; la nueva llega por la derecha y se abre si la anterior estaba abierta.

**Idioma**: si la página no está en francés y la misión no trae su traducción, el navegador puede traducir el contenido (Chrome o Edge recientes), con una advertencia «leer con prudencia». Si no, el contenido queda en francés.

### Mi disponibilidad

Su disponibilidad de la semana mostrada, en horas UTC, al minuto. El Centro la utiliza para asignarle misiones. Es la misma introducción que en la página Mi disponibilidad (capítulo siguiente); aquí, la semana es la de la barra de semana de la lista.
Según el nivel de uso: la barra de semana propia del bloque, la antigua cuadrícula horaria y el enlace «Abrir solo la introducción de disponibilidad» solo aparecen en el nivel Experto; en los demás niveles, la semana se cambia con la barra de la lista.

**Paleta**: las categorías se ordenan por grupo, una línea por grupo («Disponible», «Ejercicio SOG», «Ocupado», «No disponible»). Cada pastilla lleva la letra de código ODV y un texto corto; el texto emergente da el nombre completo. La categoría elegida se memoriza. Bajo la paleta, una línea recuerda los temas de misión que abre la categoría elegida; para una categoría personalizada, el enlace «Mis tipos de misión…» lleva a las preferencias de Mi perfil.

Categorías por defecto (el Centro puede modificar esta lista):

| Grupo | Categorías (código ODV) |
|---|---|
| Disponible | Disponible para todo (O), Disponible seguridad civil (SC), Disponible defensa (D+), Seguridad civil personalizada (SC-), Defensa personalizada (D-) |
| Ejercicio SOG | Vuelo en ejercicio SOG (S), Control SOG (AM) |
| Ocupado | Vuelo fuera de SOG (IVAO / VATSIM) (G), DCS (DC), Control fuera de SOG (IVAO / VATSIM) (AT) |
| No disponible | No disponible (IN), Vacaciones (V), Descanso (Q), Actividad real (IR) |

**La cuadrícula**: una fila por día, un eje de tiempo continuo de 0 a 24 h UTC, una línea por hora y una línea más fina a la media hora. El recuadro «Cómo usarlo», plegado bajo la cuadrícula, recoge las reglas siguientes.

- **Dos capas.** El fondo indica la naturaleza de una no disponibilidad (grupo «No disponible»): solo el color, en toda la altura de la fila. La primera capa lleva las disponibilidades, ejercicios y ocupaciones: rectángulos con su letra en el centro, la hora de inicio a la izquierda y la hora de fin a la derecha (abreviadas, «8 O 12», en un rectángulo estrecho). Un minuto solo tiene un estado: donde hay un rectángulo, el fondo de debajo no cuenta, pero se queda en su sitio y vuelve cuando el rectángulo se va. El tiempo sin nada es no disponible.
- **La paleta.** Un clic en una pastilla elige el pincel: solo indica qué trazar.
- **Trazar.** Arrastre en la parte vacía de una fila o en el espacio entre dos filas: la forma se ajusta a la media hora y muestra sus horarios durante el gesto. En varios días, un rectángulo de selección pone el mismo horario en cada día que cruza.
- **Tomar una forma.** Un gesto que empieza sobre una forma, rectángulo o banda de fondo, la toma sea cual sea el pincel: un clic la selecciona, arrastrar la mueve (pasos de 5 min; hacia arriba o abajo: mismo horario, otro día), sus bordes la redimensionan. Mayús+arrastrar traza encima: así se pone una disponibilidad en un día ya cubierto por una banda.
- **Cortar.** La última forma gana: un rectángulo trazado sobre otro lo corta, y un fondo trazado a través de un rectángulo también. El corte se ve durante el gesto.
- **Soltar, doble clic.** Arrastre una pastilla de la paleta sobre una forma: la forma toma esa naturaleza. Soltada en la parte vacía de una fila o en el nombre del día, cubre el día entero; una pastilla de fondo solo cambia entonces el fondo, los rectángulos se quedan. Doble clic en una banda: su color pasa a ser el fondo de todo el día; en una pastilla de fondo: de toda la semana.
- **Corregir.** La ✕ de una forma, o Supr sobre la selección, la borra; las flechas la mueven (← → 5 min, ↑ ↓ un día); Esc quita la selección. Ctrl+Z deshace un retoque, Ctrl+Y o Ctrl+Mayús+Z lo rehace (50 retoques por semana mostrada).
- **Qué se guarda.** Cada retoque se guarda al instante (carpeta de datos, si no este navegador): no hay botón «Guardar». Al pasar el ratón, un texto emergente da el intervalo en palabras, por ejemplo «miércoles 14 de octubre, de 00:00 a 05:30: No disponible».

**«Intervalo preciso»** (plegado: un clic en su título lo abre): «Grupo», «Categoría», casillas de los días, «de» y «a» (UTC, al minuto) y, después, «Añadir». El intervalo se pone en cada día marcado, con la regla de la última forma. Horarios vacíos = día completo; sin fin, hasta medianoche; un fin anterior al inicio se rechaza. Ctrl+Z deshace la adición.

**Otros botones**
- «⧉ Semana anterior»: copia la semana anterior en la semana mostrada (tras confirmación si no está vacía); Ctrl+Z lo deshace.
- «Borrar todo»: vacía la semana mostrada; Ctrl+Z lo deshace.
- «Escribir en la carpeta de datos (n)»: solo aparece si quedaron semanas en el navegador; las escribe en la carpeta compartida.

El mensaje bajo el bloque indica adónde se ha enviado lo introducido: «Guardado en la carpeta de datos.», o «Guardado en este navegador, el Centro no lo ve: …» si la carpeta de datos no está autorizada (consulte [Primer arranque](#primer-arranque), paso 3).
Una cuadrícula horaria antigua existente se importa automáticamente en la semana.
El enlace «Abrir solo la introducción de disponibilidad» lleva a la página Mi disponibilidad. Este enlace solo aparece en el nivel Experto.

## Mis vuelos
<!-- page: apps/pilot/mes_vols.html -->

Esta página (barra lateral «Mis vuelos», bajo «Mis misiones»; desde el nivel Tripulación) es el registro de sus vuelos
pasados, del más reciente al más antiguo, un vuelo por fila. Reúne dos fuentes, sin duplicados (misma fecha, mismo
indicativo, misma matrícula: prevalece el informe):

- sus informes, en el registro de informes (los que usted ha redactado; se conservan los que no tienen autor
  anotado);
- el diario de vuelos de la aerolínea importado del sitio (tarjeta «Registro de vuelos» del Primer arranque), filtrado por su trigrama. Sin trigrama
  (Ajustes › Mi perfil), solo se listan los informes de este navegador.

En la cabecera: «Período» («Últimos 7 días», «Últimos 31 días», «Últimos 12 meses» —por defecto—, «Todo»), la búsqueda
(indicativo, tipo, matrícula, aeródromo, misión), «Exportar (CSV)» (la lista mostrada, mismas columnas) y «Análisis
detallado ↗» (Herramientas › Análisis de misiones). Debajo, los totales: número de vuelos, horas de calzos y los tres
tipos más volados. El período y la búsqueda se guardan en este navegador.

| Columna | Contenido |
|---|---|
| «Fecha» | día del vuelo |
| «Indicativo» | indicativo del vuelo |
| «Aeronave» | silueta, matrícula, tipo |
| «Trayecto» | salida → llegada (OACI) |
| «Duración» | horas de calzos (si no, de vuelo) |
| «Misión» | familia, tipo y operación del informe, o misión del diario |
| «Informe» | n.º del informe (enlace), o «sin informe» |

Un clic en una fila abre su informe; un vuelo «sin informe» despliega su detalle (fuente, hora, aeronave, misión)
con «Redactar el informe», que abre el informe de la familia ya rellenado: fecha, indicativo, aeronave, matrícula,
salida y llegada, duración de calzos declarada. Revise, complete y después «Añadir al registro»: el vuelo aparece
entonces con su informe. Las columnas se ajustan arrastrando el borde de los títulos (doble clic: anchos por defecto).
Con menos de 800 px de ancho, solo quedan la fecha, el indicativo, el trayecto y la duración; un clic despliega el resto.

También se llega a ella con «Mis vuelos ↗» en Mis misiones (junto a «mostrar también las misiones pasadas») y en el
menú «Enviar» de un informe.

## Mi disponibilidad
<!-- page: apps/pilot/disponibilites.html -->

Esta página muestra solo la introducción de disponibilidad, en más grande. Sirve para introducir rápidamente varias semanas.
Se llega a ella por la pestaña «Mi disponibilidad» (bajo la entrada «Mis misiones» de la barra lateral) o por el enlace «Abrir solo la introducción de disponibilidad» de Mis misiones. Este enlace solo aparece en el nivel Experto.
El piloto es el del trigrama de trabajo (perfil de piloto, conexión o suplantación). En modo producción, la página pide primero conectarse.

### Mi disponibilidad

El único bloque de la página. Funciona exactamente como el bloque del mismo nombre de Mis misiones (capítulo anterior): paleta, cuadrícula, «Cómo usarlo», «Intervalo preciso», «⧉ Semana anterior», «Borrar todo».

**Navegación por semanas** (propia de esta página):
- «‹» y «›»: semana anterior o siguiente;
- campo de fecha: salta a la semana que contiene esa fecha;
- «Semana actual»: visible fuera de la semana actual, vuelve a ella.

Consejos y límites:
- Todas las horas están en UTC. Un trazo se ajusta a la media hora; mover y redimensionar van en pasos de 5 min; «Intervalo preciso» va al minuto.
- Cada retoque se guarda de inmediato: no hay botón «Guardar». Ctrl+Z lo deshace.
- Sin trigrama, el bloque muestra «Trigrama no definido: definirlo en Ajustes › Mi perfil (o ☰ › Perfil de piloto).»
- Una dirección del tipo `disponibilites.html?semaine=2026-W41` abre directamente una semana concreta.
- Si la semana todavía se está leyendo, un retoque se rechaza con «Semana aún cargando: reintentar en un momento.»

Para saber cómo utiliza el Centro estas declaraciones, consulte [disponibilidad y reorganización](../technique/DISPOS_ET_REORGANISATION.md).

## Mi perfil
<!-- page: apps/settings/profil.html -->

Esta página reúne los ajustes propios de cada piloto: identidad, conexión, preferencias de misiones, aeronaves y simuladores, altitud sin oxígeno.
Se llega a ella por la entrada «Ajustes» de la barra lateral (primera pestaña, «Mi perfil») o por ☰ › «Ajustes».
La columna de la izquierda muestra las secciones por grupo; un clic muestra una a la derecha, con su título, su presentación, sus botones y un mensaje de estado.
Si una sección contiene cambios sin guardar, cambiar de sección o salir de la página pide una confirmación.
Según el nivel de uso: «Aeronaves pilotadas (informes)» aparece a partir del nivel Planificación (2); «Altitud sin oxígeno», solo si la herramienta Combustible está marcada (siempre en el nivel Experto); en «Identidad y redes», las tarjetas «IVAO — cliente OAuth» y «Idioma» están en el nivel Experto.

### Nivel de uso

Lo que la suite le muestra, según su uso. Cuatro tarjetas, una por nivel (número y nombre, lo que muestra el nivel, «Requiere el Centro» para los niveles 2 a 4); la tarjeta elegida se destaca y la línea «Nivel actual» la recuerda. Basta un clic: la página se recarga y la barra lateral sigue.

| Nivel | Para | Lo que se añade |
|---|---|---|
| 1 · Tripulación | todo piloto | Mis misiones, Informe, Planificación (lectura) |
| 2 · Planificación | oficial de guardia | planificar las órdenes: Tablero modificable, planificación ODV (Centro activado) |
| 3 · Diseño | redactor de misiones | Misiones: generador y registro (Centro activado) |
| 4 · Experto | cartógrafo, analista | todas las herramientas, estudio cartográfico |

«Herramientas opcionales»: Mapas de vuelo (ruta, mapas topográficos, aproximación), Combustible (prestaciones y cálculo de combustible), Aterrizajes (panel de aterrizajes), Análisis de misiones (análisis de los informes de misión); se marcan en cualquier nivel y se agrupan en «Herramientas» en la barra lateral; en el nivel 4, «Todos incluidos en el nivel Experto». Por defecto: nivel 4 si el Centro está activado en este navegador, si no nivel 1. El nivel no da ningún derecho: el Centro conserva su acceso.

### Identidad y redes

Su identidad en la suite, que usan todas las páginas (☰ › Perfil de piloto, informes de misión, informes estadísticos).

| Tarjeta | Campos |
|---|---|
| «Piloto» | «Trigrama», «ID VATSIM (CID)», «ID IVAO (VID)», «SimBrief (usuario o ID)» |
| «Sitio de la aerolínea» | «Identificador», «Contraseña» |
| «IVAO — cliente OAuth (personal)» (nivel Experto) | «Identificador del cliente (client ID)», «Secreto del cliente», «Dirección de redirección a declarar en IVAO» (a copiar en developers.ivao.aero); botón «Guardar el cliente IVAO»: guardado por el lanzador de este equipo, el secreto nunca se vuelve a mostrar |
| «Idioma» (nivel Experto) | «Idioma de la suite»: Automático (idioma del navegador), Français, English, Deutsch, Español |

1. Rellene los campos.
2. Haga clic en «Guardar». El mensaje de estado confirma «Perfil guardado en este navegador».

- El trigrama tiene de 2 a 4 letras o cifras; sirve para encontrar sus misiones asignadas.
- Los identificadores del sitio de la aerolínea se quedan solo en este navegador: nunca se escriben en un archivo ni en una copia de seguridad.
- El idioma se elige normalmente con la bandera «Idioma» de la cabecera; la tarjeta «Idioma» (nivel Experto) se aplica en cuanto se elige, sin «Guardar».
- En modo producción, el trigrama es el del usuario conectado y no se modifica aquí.

### Conexión y contraseña

Su ficha de usuario compartida: rol y contraseña (conservada en forma de huella, nunca en claro).

- Arriba, el modo de la aerolínea (develop o producción) y su estado: «Conectado: … (rol)» o «No conectado.».
- **No conectado**: tarjeta «Conectarse» con «Trigrama», «Contraseña» y el botón «Conectarse». En modo develop, una ficha sin contraseña se conecta sin contraseña: defina una después.
- **Conectado**: tarjeta «Cambiar la contraseña» con «Contraseña actual», «Nueva contraseña (8 caracteres como mínimo)», «Confirmación» y, después, «Cambiar la contraseña».
- El botón «Desconectarse» aparece una vez conectado.
- Una contraseña provisional se señala («contraseña provisional, a cambiar»): cámbiela en la primera conexión.
- Contraseña olvidada: pida un restablecimiento a un administrador del Centro.

### Tipos de misión

Esta sección precisa los temas de misión que abren sus categorías de disponibilidad **personalizadas** («Seguridad civil personalizada», «Defensa personalizada»).

Para cada dominio («Seguridad civil», «Defensa»):
1. Elija un modo: «Todos los temas del dominio», «Lista blanca: solo estos temas» o «Lista negra: todos menos estos temas».
2. Marque los temas correspondientes (por ejemplo HEMS, SAR, FIRE… o COMBAT, ISR, AAR…).
3. La línea inferior muestra al instante el resultado: ««Seguridad civil personalizada» abre: …».
4. Haga clic en «Guardar».

Las preferencias se guardan en su ficha de usuario, compartida con el Centro mediante la sincronización. Sin trigrama, la sección pide configurarlo primero en «Identidad y redes».

### Aeronaves y simuladores

«Mis aeronaves»: sus aeronaves, flota incluida —las que posee en su simulador y las que domina—, y sus simuladores. El Centro los utiliza para asignarle una aeronave y para reunir pilotos en un simulador común. Es la misma lista que la tabla de la página «Fichas de rendimiento», que muestra su rendimiento: mismas aeronaves, mismo orden, mismo nombre.

**Tarjeta «Mis aeronaves»**: un resumen («… tipo(s) dominado(s), … poseído(s) de … tipos de la flota.») y, después, una subtarjeta por categoría (helicópteros, turbohélices, reactores, pistón), con una tabla:

| Columna | Contenido |
|---|---|
| «Aeronave» | Silueta, nombre en negrita, designador OACI y clase en pequeño |
| «Variantes de la flota» | Variantes presentes en la flota |
| «Aeronaves» | Número de aeronaves en servicio (sobre el total) y sus bases |
| «Rendimiento» | Para una aeronave poseída: un enlace — el origen de su ficha, que abre la página «Fichas de rendimiento» en esa aeronave, o «ninguno» y las formas de crear una, que abren esa misma página |
| «Poseído» | Tiene este tipo en su simulador |
| «Dominado» | Lo pilota con soltura |

- Marcar «Dominado» marca también «Poseído»; desmarcar «Poseído» desmarca «Dominado».
- «Buscar una aeronave», encima de las tarjetas, filtra al escribir por nombre, variante, designador, clase y origen del rendimiento: las tarjetas con coincidencia quedan desplegadas, las demás se pliegan, y «n aeronave(s)» da el recuento; campo vacío: todo.
- Variantes: un designador compartido por varios modelos (CL2T: CL-215T y CL-415) tiene una fila por variante declarada, con su nombre («Canadair CL-415», «Canadair CL-215T»); «×» quita una variante. Sin variante declarada, la aeronave lleva el nombre de la ficha y de sus variantes conocidas («Canadair CL-215T / CL-415»). El perfil de rendimiento sigue siendo el del designador: «rendimiento común a las variantes». Al añadir, la lista propone cada variante (modelo de la ficha, variantes de la flota, nombres de uso de la base), o conserve su propio texto; la variante se guarda en su declaración.

**Tarjeta «Otras aeronaves (fuera de la flota)»**: las aeronaves que posee sin que estén en la flota. Siempre se añaden por un nombre, nunca por un código obligatorio: escriba lo que conozca («CL-415», «Canadair 415», «PC-12», «Caravelle»). Al escribir, una lista propone los tipos de la flota, de la base de tipos de este equipo con sus nombres de uso y de la lista OACI publicada, con su procedencia; el cálculo es local, sin red. El designador se encuentra por usted: «CL-415», «Canadair 415» y «CL415» dan CL2T, mostrado «Canadair CL-415» (se conserva el nombre de la variante). Un tipo de la flota simplemente se marca en la tarjeta «Mis aeronaves». Si hay varios tipos posibles, el más cercano se pone en el campo; «Añadir» para confirmarlo, o elija en la lista. Si nada corresponde, la aeronave se guarda con su nombre, marcada «tipo OACI por confirmar»; «Buscar el tipo», en su fila, la asocia más tarde a un designador. Para corregir o eliminar una aeronave añadida, haga clic en su fila: su código o su nombre pasa al campo y «Añadir» se convierte en «Sustituir» («Dominado» se traslada), junto a «Eliminar» y «Cancelar» (o Esc). La base de este equipo solo la completa el lanzador al hacer clic en «Añadir», para un designador que le falte: la fila muestra «completando la base de tipos…» durante una pasada corta, una sola pasada a la vez (un tipo pedido durante una pasada se pone en cola); salir de la página no la interrumpe. Un tipo retirado que las fuentes oficiales ya no conocen se busca como último recurso en Aviation Fanatic; si no está allí, la nota «no encontrado (OACI, EUROCONTROL, Aviation Fanatic)» lo indica. Estas aeronaves van con sus disponibilidades declaradas: el Centro las ve para las asignaciones, y los demás pilotos las encuentran en esta tarjeta, columna «También declarado por»; solo tienen que marcar «Poseído».

**Tarjeta «Simuladores»**: marque los simuladores y herramientas instalados.

No hay botón «Guardar»: cada casilla se guarda al instante en este navegador y después se copia en sus semanas de disponibilidad ya declaradas, a partir de la semana actual. El mensaje inferior indica cuántas semanas se han actualizado.

### Añadir una aeronave y su rendimiento

Para volar en una aeronave que la suite aún no conoce, por ejemplo un CL-415 sin rendimiento:
1. Añádala por su nombre: Ajustes › Mi perfil › Aeronaves y simuladores, tarjeta «Otras aeronaves», o botón «Añadir una aeronave» de la página «Fichas de rendimiento» (la misma ventana de alta). Se une a «Mis aeronaves».
2. Su fila muestra «Rendimiento: ninguno» y tres botones, en este orden: «Crear desde SimBrief» (solo si SimBrief conoce el tipo), «Preguntar a ChatGPT» (perfil vacío y panel de ChatGPT abierto en él), «Estimar por la clase» (perfil mínimo deducido de la clase OACI del tipo: consumo, TAS y techo, marcados «estimado»; una aeronave sin designador no tiene clase: asóciela primero a su tipo).
3. La ficha creada se asocia a la aeronave y la página «Fichas de rendimiento» se abre en ella (desde Ajustes, el botón abre esa página). Complétela después (ascenso, descenso), fusiónela con otra ficha o sustitúyala por una importación. Combustible la propone después en su menú «Avión».

### Altitud sin oxígeno (aviones no presurizados)

Esta sección (grupo «Planificador de combustible») configura el umbral por encima del cual el gráfico de altitud óptima del planificador muestra «oxígeno necesario» para un avión no presurizado. Solo aparece si la herramienta Combustible está marcada en «Nivel de uso» (siempre en el nivel Experto).

1. Introduzca «Altitud máxima sin oxígeno (ft)»: entre 1000 y 30 000 ft, en pasos de 500.
2. Haga clic en «Guardar».
3. «Valor por defecto (10.000 ft)» restablece el valor original.

Referencias recordadas bajo el campo: 10 000 ft (uso habitual, EASA NCO), 12 500 ft (FAA, tripulación más de 30 minutos), 14 000 ft (FAA, tripulación en todo momento).
Es solo una información: el cálculo no se limita. El ajuste se guarda en este navegador.

### Aeronaves pilotadas (informes)

Las aeronaves que ha pilotado o reportado: las de los informes con su trigrama en la tripulación, o que usted redactó (informes guardados desde esta versión) (la aeronave de su puesto cuando el informe lo indica), con tipo, variante, indicativos, operador, número de vuelos y último vuelo. La casilla gris «Flota» indica si la aeronave pertenece a la flota (marcada) o no (desmarcada, indicativo incluido); no se modifica aquí. La lista completa, con la casilla «personal», está en Ajustes › Centro › Flota (reservada al Centro). Arriba, el recuento del diario: informes en total, sus informes, informes sin tripulación introducida (no cuentan para nadie). Sección visible a partir del nivel Planificación (2).

## Apariencia
<!-- page: apps/settings/apparence.html -->

Esta página configura el aspecto de toda la suite: diseño, gráficos, iconos, barra lateral y colores.
La entrada «Apariencia» de la barra lateral (o el botón «Apariencia» del menú ☰) la abre en una ventana encima de la página actual: ve el efecto al instante. Cierre: «✕», Esc o clic fuera de la ventana.
La misma interfaz existe a página completa (☰ › lista de las páginas de ajustes › «Apariencia»).
Los ajustes se memorizan en este navegador y se aplican a todas las páginas; no cuentan para el recordatorio de copia de seguridad.
Según el nivel de uso: en los niveles 1 a 3, la página muestra el diseño, el juego de iconos actual, la barra lateral, el tamaño de los iconos y «Restablecer todo»; la decoración, el color Aqua, la visualización de la barra, los demás juegos de iconos, Gráficos, Colores de los temas y «Demostración completa» se añaden en el nivel Experto.

### Diseño

La forma de las páginas: esquinas redondeadas, densidad, títulos, barra lateral.

- Cada diseño se presenta con una miniatura dibujada en su estilo, con su nombre y su descripción: Estándar, Aero, Operativo, Consola, Gabinete, Cuaderno de vuelo, Robusto, Aqua, Táctico.
- Se muestran seis miniaturas de entrada (más el diseño actual si no está entre ellas); las demás están en «Más diseños», que se despliega.
- Un clic en una miniatura aplica el diseño al instante. La miniatura elegida aparece enmarcada.
- Gabinete, Cuaderno de vuelo, Robusto y Aqua añaden sus materiales, Táctico su vidrio ahumado sobre fondo nocturno; los colores de información siguen siendo los del tema (Táctico: filete en lo alto de los bloques).

**«Decoración (diseños con materiales)»** (nivel Experto):
- «Completo» (por defecto): paneles ilustrados de los bloques, hojas de registro, tornillos, radar;
- «Sobrio»: solo materiales y placas, en todas las páginas.

**«Color Aqua»** (nivel Experto): color de los botones e iconos del diseño Aqua (Azul, Turquesa, Verde, Grafito, Violeta, Naranja, Rojo, Rosa), o «Color de cada aplicación». Los iconos de estado conservan sus colores originales.

### Gráficos

Paleta de colores y estilo de los gráficos (informes, indicadores). Sección del nivel Experto.

- Paletas: «Automático» (sigue el diseño), «Vivos (colores de las páginas)», «Pizarra», «Latón y cuero», «Caqui y oliva». Cada fila muestra una muestra de colores.
- «Estilo»: «Automático», «Plano» o «Relieve».

La elección se aplica al instante a los gráficos de las páginas.

### Iconos

El grosor del trazo de los iconos, o ningún icono. Cada fila muestra una vista previa del juego. En los niveles 1 a 3, solo se ofrece el juego actual; todos los juegos en el nivel Experto.

| Opción | Resultado |
|---|---|
| «Según el diseño» | El juego previsto por el diseño elegido |
| «Trazo fino», «Trazo normal», «Trazo grueso» | Iconos de trazo |
| «Latón (medallones)», «Acero (placas)», «Gel (burbujas)», «Aviónica (instrumentos)» | Juegos con materiales |
| «Sin iconos» | Sin iconos |

**«Barra lateral»**: «Según el diseño», «Siempre» o «Nunca». Por defecto, se muestra siempre (salvo en pantalla estrecha y al imprimir). «Tamaño de los iconos»: «Pequeño», «Mediano» (por defecto) o «Grande». «Visualización» (nivel Experto): «Icono y etiqueta» (por defecto), «Solo icono» (barra más estrecha, nombre de la entrada como información emergente) o «Solo etiqueta».

### Colores de los temas

Cada página de la suite tiene un tema de colores (barra, texto de la barra, acento). Para cada tema, elige una familia de colores y un tono; los colores se calculan a partir de ellos, con un control de legibilidad. Sección del nivel Experto.

Los temas se presentan en tarjetas, en dos grupos: «Aplicaciones» (Combustible, Aterrizajes, Centro, Informe) y «Familias de informes».

En cada tarjeta:
1. La vista previa muestra un «Título» sobre la barra, un «Botón» y un «Enlace, icono».
2. Las pastillas de color eligen la familia (Rojo, Ladrillo, Naranja… Pizarra, Grafito); «↺» vuelve a los colores originales.
3. El cursor «Tono» (de oscuro a claro) ajusta la claridad. Está inactivo con los colores originales.
4. Las pastillas de contraste indican ✓ o ✗ para «texto / barra» y «acento / página» (4,5:1 como mínimo) y para «acento / tarjeta» (3:1 como mínimo).
5. «Ver en esta página» presta los colores del tema a la página actual, para juzgar; un segundo clic (o el cierre de la ventana) lo anula.

Cada cambio se guarda al instante.

**Al pie de la página**:
- «Demostración completa» (nivel Experto) abre una maqueta: generador, catálogo de iconos y contrastes de todos los temas.
- «Restablecer todo» restablece todos los ajustes de Apariencia por defecto (diseño Aqua, iconos del diseño, barra lateral siempre visible, decoración completa, colores originales).

## Primer arranque
<!-- page: apps/settings/premier_lancement.html -->

Esta página configura lo que la suite necesita para trabajar. El lanzador (`lancer.cmd` en Windows, `sh lancer.sh` en macOS o Linux) la abre por sí mismo; se vuelve a ella en cualquier momento por Ajustes › pestaña «Primer arranque», o por la tarjeta «Primer arranque» de la página de inicio, mostrada mientras quede algo por ajustar.
El lanzador solo vuelve al primer arranque si faltan la carpeta de la aplicación o los datos. Una vez pulsado «Terminar», la página de inicio recuerda lo que queda por hacer en un marco gris discreto, sin alerta.

Arriba, un **carril de los seis pasos** (1 Carpetas · 2 Datos · 3 Compañía · 4 Perfil · 5 Datos aeronáuticos y tipos · 6 Centro, y después «Terminar»: «al final», «listo» y rodeado cuando todo está hecho; el paso Centro no se ilumina para un piloto) da el estado de cada uno: ✓ hecho, ○ por hacer, – opcional, 🔒 bloqueado sin el paso 1, ✗ por rehacer; el paso actual va rodeado, un clic abre un paso. El balance detallado, **«Estado de la suite»**, está en un panel plegado: cada línea lleva a su paso (✓ ajustado, ○ por hacer, – opcional, ? desconocido: sin lanzador).
- Para todos: datos, repositorio git de sincronización (opcional), carpeta de la aplicación, aerolínea y sitio, clave de API IVAO (opcional), piloto (trigrama y al menos una red), credenciales del sitio de la aerolínea, datos aeronáuticos.
- Centro: activación (administradores); con el Centro activado, flota y registro del sitio, misiones del registro, usuarios y derechos (al menos un administrador), envío de informes (opcional).

Encima del balance, «📘 Tutorial de instalación, paso a paso» abre en la Ayuda el [tutorial de instalación](../tutorial/installation.en.md), en el idioma de la suite (si no, en inglés).

El mismo estado aparece como distintivo en el título de cada paso (el número se pone en verde cuando está hecho), con debajo una línea «✓ Hecho: …» o «○ Por hacer: …». El paso actual está abierto, los demás plegados; cada paso termina con «Siguiente →».

### 1 Carpetas

El navegador pide designar cada carpeta una vez; después la recuerda.

- **«Carpeta de la aplicación»**: «Elegir la carpeta de la aplicación» y, después, designe la carpeta que contiene `lancer.cmd` y `lancer.sh`. Las demás carpetas (datos, registro, misiones, SIA, rendimiento, copia local) se deducen de ella; el mensaje indica cuántas se han configurado.
- La carpeta debe ser la de la suite servida por el lanzador: si pertenece a otra copia de la suite, el paso queda por hacer (✗ en el balance) con el mensaje «Suite iniciada desde …, carpeta declarada …»; vuelva a elegir la carpeta correcta.
- **«Libro ODV (opcional)»**: «Carpeta OneDrive…» designa la carpeta sincronizada donde la escuadrilla deposita el libro (la Planificación ODV abre el más reciente). Sin OneDrive: «o el archivo Excel…», guardado en este navegador.

Este paso es importante: sin carpeta de datos autorizada, su disponibilidad se queda en el navegador y el Centro no la ve.

### 2 Datos

Este paso instala los datos de la aerolínea (misiones, referencias…). Pasa por el lanzador: sin él, la página muestra «Para este paso, abra la suite con el lanzador…».

Mientras no se elija la carpeta de la aplicación (paso 1), o si pertenece a otra copia de la suite, este paso y los siguientes (aerolínea, perfil, datos aeronáuticos, Centro) aparecen en gris e inactivos, con el motivo arriba de cada uno, igual que «Terminar»; el balance sigue legible.

Tres posibilidades:

| Tarjeta | Procedimiento |
|---|---|
| «Conjunto de prueba» | «Instalar el conjunto de prueba»: datos ficticios entregados con la suite (misiones con un ejercicio, pilotos, flota, disponibilidad y asignaciones de la semana en curso), para descubrir la suite; para sustituir más adelante por los datos de la aerolínea. Se rechaza si ya hay datos. |
| «Repositorio de datos» | Introduzca «Dirección del repositorio» (facilitada por su aerolínea: `https://…` o `git@…`), si hace falta «Identificador (opcional)» y «Contraseña o token (opcional)», marque si hace falta «recordar en el gestor de credenciales de Git» y luego «Obtener los datos». La primera descarga tarda unos minutos. |
| «He recibido los datos por correo» | «Archivo de datos…»: elija el archivo `.zip` recibido (contiene `data_tree.js`). |
- No hay ninguna dirección rellenada de antemano. Repositorio privado por HTTPS: identificador y contraseña, o un token de acceso de lectura si la cuenta tiene doble autenticación; por SSH (`git@…`), la clave SSH del equipo.
- Si Git no está instalado: conjunto de prueba o archivo (o instale Git y vuelva a arrancar).
- **«Repositorio git de sincronización de datos (opcional)»**: la dirección del repositorio remoto de `data/`, que comparte los datos
  entre los equipos (botón «Sincronizar»). Dirección SSH `git@hôte:compte/dépôt.git` (clave SSH del equipo) o
  HTTPS `https://hôte/compte/dépôt.git` (identificadores registrados en Git). La tarjeta muestra el repositorio actual;
  «Comprobar» dice si responde desde este equipo (30 s como máximo), «Guardar» lo convierte en el repositorio remoto de `data/`
  (si aún no hay datos, la dirección sirve para obtenerlos). Nada es bloqueante: un repositorio que no responde se señala,
  Para otro repositorio distinto del actual, el lanzador abre una ventana de confirmación en el equipo (dirección actual
  y nueva, «No» por defecto): responda «Sí» para cambiar; ninguna página puede responder en su lugar. Nunca ponga una contraseña ni un token en la dirección.
  y la suite funciona sin compartir. Detalles: [sincronización](../technique/SYNCHRONISATION.md).
- Una vez presentes los datos, la tarjeta opcional «Registro de vuelos» ofrece «Registro (.html)…»: la página «Log des vols» del sitio de la aerolínea, guardada, rellena los pilotos y las aeronaves de la referencia (ayuda a la introducción).

### 3 Aerolínea

La aerolínea virtual cuyo nombre lleva la suite, y la dirección de su sitio (enlaces, flota, registro de vuelos); ajuste de este navegador.

1. Tarjeta «Aerolínea virtual»: «Nombre», «Sigla», «Nombre completo», «Sitio de la aerolínea» (`https://…`).
2. Tarjeta «Clave de API IVAO (opcional)»: estado de la clave de la instalación («Clave IVAO: guardada ✓» o «ausente»). Se introduce, se prueba y se sustituye en un solo lugar: Ajustes › Instalación › Claves y servicios externos (enlace de la tarjeta).
3. «Guardar la aerolínea».

Los demás campos (centro, páginas del sitio, fuentes externas) están en Ajustes › Instalación › Fuentes y carpetas.

### 4 Perfil y credenciales

1. Tarjeta «Piloto»: «Trigrama», «ID IVAO (VID)», «ID VATSIM (CID)», «SimBrief». En modo producción el trigrama queda fijo (viene de la cuenta).
2. Tarjeta «Sitio de la aerolínea»: «Identificador» y «Contraseña» de su cuenta en el sitio, guardados solo en este navegador (nunca en un archivo ni en una copia).
3. «Guardar el perfil».

La suite nunca pide sus contraseñas IVAO ni VATSIM: sus identificadores (VID, CID) bastan. La cuenta de la suite (contraseña, modo producción), el cliente IVAO personal y las preferencias se ajustan en [Mi perfil](#mi-perfil).

### 5 Datos aeronáuticos y tipos de aeronave

Mapas, misiones y planificación usan los datos aeronáuticos (AIRAC) y la base de tipos de aeronave. El paso muestra los mismos bloques que Ajustes › Instalación:

1. ① Primero «Tipos de aeronave»: la línea de estado nombra los tipos por completar y lleva ella misma «Completar automáticamente» (tipos OACI y rendimientos EUROCONTROL); durante la pasada, «Descarga en curso (paso, n s): la página se recarga al final de la tarea.», y después la página se recarga sola y muestra el balance («Terminado: 8 ficha(s) OACI, 1 rendimiento(s).»), también tras «Instalar todo». Un tipo sin rendimientos EUROCONTROL (militares, helicópteros) se estima: «≈ 2 000 kg/h, 480 kt (tipo conocido)» o «(clase OACI L2J)», como en el planificador de combustible; un tipo sin ficha OACI no bloquea el paso.
2. ② «Datos aeronáuticos», precedidos de sus líneas de estado (base: AIRAC, espacios, fecha de construcción; MORA; X-Plane, opcional): Francia está activa por defecto, un clic en el mapa elige otras zonas, cada fuente conserva su botón (ZIP del SIA: enlace a la tienda, cuenta gratuita, producto del ciclo a 0 €, luego «Obtener el ZIP descargado»; MORA; PDF MILAIP; conjuntos de otros países). Un único botón principal, **«Instalar todo para <zonas>»**, encadena la compleción de los tipos y luego la activación de las zonas, espera el final de cada tarea y dice lo que queda; lo ya instalado no se rehace. Las tarjetas expertas (base aeronáutica, MORA, coherencia) están plegadas en «Herramientas avanzadas» (también en Ajustes › Mantenimiento).

### 6 Centro (administradores)

Reservado a los administradores del SO Group: los pilotos se saltan este paso y hacen clic en «Terminar». Cada enlace del paso dice lo que se hace allí y se abre en una pestaña nueva.
- Tarjeta «Activar el Centro»: «Contraseña del Centro» (mostrada junto al botón, `DEFA` por defecto), luego «Activar el Centro». El resumen indica el modo del Centro (autónomo: contraseña).
- Con el Centro activado:
  - «Flota y registro de vuelos»: última lectura del sitio por el lanzador (flota, ubicación de las aeronaves, registro), «Actualizar ahora» y el enlace a la flota (Ajustes › Centro).
  - «Misiones»: «✓ n misiones en el registro: nada que hacer», si no de dónde vienen (datos del paso 2, si no Centro › Generador de misiones), y el enlace al registro.
  - «Ajustes del SO Group»: enlaces a las rúbricas de Ajustes › Centro — usuarios y derechos (número, administradores, modo), categorías de disponibilidad, planificación ODV, Tablero, envío de informes, cálculo de rutas.

«Terminar» (último punto del carril; bloque final siempre visible bajo los pasos) solo exige los pasos 1 y 2; los pasos 3 a 5 se recomiendan (si quedan, una confirmación lo recuerda al hacer clic); marca la suite como «configurada» y abre la página de inicio. El enlace «Inicio» vuelve a ella sin terminar.

### Empezar de nuevo

Para retomar el primer arranque desde cero, y solo en ese caso. El bloque está plegado por defecto.

- «Limpiar y empezar de nuevo…» borra, **en este navegador**, las carpetas recordadas (aplicación, datos, registro, misiones, SIA, ODV, X-Plane, rendimiento, copia local), la copia del libro ODV, los identificadores del sitio de la aerolínea, el perfil (trigrama, IVAO, VATSIM, SimBrief) y el indicador «suite configurada».
- Se pide una confirmación y, después, la página se recarga en el paso 1.
- Los archivos del disco no se tocan: carpeta `data/`, registros, copia `defa_local_store.yaml`.

## Nuevo informe
<!-- page: apps/cr/mission_cr.html -->

Esta página es la puerta de entrada de todo informe de misión: en ella elige la familia de
misión y, después, se abre la página de informe de esa familia. Está dirigida a todos los pilotos.
Para ir a ella: barra lateral › **Informe**, o el botón «Nuevo informe» de la cabecera del
informe general de misiones. Un informe también puede abrirse directamente, ya rellenado, desde una misión que se le ha
asignado (véase más abajo). Paso a paso completo: [tutorial](../TUTORIAL.md).

### Mis misiones por informar

Primer bloque de la página: las misiones que se le han asignado, ya pasadas (21 días como máximo) y sin informe en el registro, como en el bloque «Informes por escribir» de la página «Hoy» (siete líneas como máximo).

- **«Escribir el informe»** abre la carpeta de la misión en «Mis misiones» y comienza el informe en la familia de la misión, rellenado desde la orden de misión (véase «Retomar una misión asignada»).
- **«Sin informe»** retira la misión de la lista (se memoriza en este navegador).
- Sin trigrama configurado, el bloque lo pide en el acto (campo «Trigrama», botón «Guardar»). La elección de la familia, más abajo, sigue valiendo para una misión fuera de sus asignaciones.

### Familia de misión

El bloque muestra un mosaico por familia (16 familias: HEMS, FIRE, SAR, AIRLIFT, AAR, MARITIME, HADR,
AIRBORNE, FI, SURVEY, LE, ISR, COMMAND, COMBAT, SOF, SPECIAL). Cada mosaico lleva el código de la familia
y su nombre; al pasar el ratón se muestra su descripción.

1. Localice la familia de su misión.
2. Haga clic en su mosaico: se abre la página de informe de la familia, con una misión en blanco.

Consejos:

- la última familia utilizada aparece siempre en primer lugar, enmarcada, con la mención «Continuar con»;
- podrá cambiar de familia más tarde, desde la pastilla «familia · subtipo ▾» de la cabecera de
  la página de informe;
- la página se muestra cada vez: no le remite automáticamente a la última familia.

### Buscar la familia a partir de la misión

El campo de búsqueda (ejemplo mostrado: «evacuación en helicóptero», «reabastecimiento», «lanzamiento
paracaidista»…) encuentra la familia a partir de una descripción libre.

1. Escriba unas palabras: tipo de misión, aeronave, organismo («incendio forestal», «canadair»,
   «paracaidistas»…). Los acentos y los comienzos de palabra bastan («reabast», «paracaid»).
2. Las familias se clasifican: la mejor aparece enmarcada y las que no corresponden aparecen atenuadas.
   Bajo el campo, «Sugerencia (Intro para abrir):» recuerda la familia propuesta.
3. Pulse **Intro** para abrir la primera, o haga clic en otro mosaico.

Si nada corresponde, se muestra el mensaje «Ninguna familia coincide: SPECIAL cubre las demás misiones.»:
SPECIAL (transporte especial, ensayos, formación) acoge todas las demás misiones.

### Retomar una misión asignada

Cuando el Centro le ha asignado una misión, no es necesario pasar por la elección de la familia: el informe
se abre directamente en la familia correcta, ya rellenado.

| Desde dónde | Botón |
|---|---|
| **Mis misiones** (carpeta de la misión abierta) | «Crear el informe» (en gris si la misión no tiene archivo de misión) |
| **Registro** de misiones (Centro) | «Crear informe», o «Nuevo informe (vuelo n)» si la misión ya tiene informes |
| **Generador de misiones** (Centro) | botón de la cabecera «Crear el informe →» |

Lo que se recupera: nombre del ejercicio / operación (título de la misión), identificador de la misión (campo
«Misión»), objetivo e instrucciones (bloque Tarea), aeródromos de salida y de llegada, puntos de ruta y
coordenadas, zona, aeronaves (tipo OACI, matrícula, indicativo), organismo, y un recordatorio de la misión y de la carga
en las Observaciones. Después se aplican las ayudas habituales (aeronave conocida, aeródromo, meteorología).

- La familia se deduce del tipo de misión (MEDEVAC → HEMS, TRAINING → SPECIAL…).
- Si hay un borrador en curso en esa familia, la página pregunta «¿Reemplazar el borrador actual por la
  misión generada (SIA XML)?».
- Desde el Registro, una misión «generada» o «planificada» pasa al estado «volada».
- El n.º de informe se calcula a partir de la misión: `CRM-016-1` y, después, `CRM-016-2` si la misión se vuelve a volar.

## Informe de una familia
<!-- page: apps/cr/AAR/aar_cr.html -->
<!-- page: apps/cr/AIRBORNE/airborne_cr.html -->
<!-- page: apps/cr/AIRLIFT/airlift_cr.html -->
<!-- page: apps/cr/COMBAT/combat_cr.html -->
<!-- page: apps/cr/COMMAND/command_cr.html -->
<!-- page: apps/cr/FIRE/fire_cr.html -->
<!-- page: apps/cr/FLIGHTINSPECTION/fi_cr.html -->
<!-- page: apps/cr/HADR/hadr_cr.html -->
<!-- page: apps/cr/HEMS/hems_medevac_cr.html -->
<!-- page: apps/cr/ISR/isr_cr.html -->
<!-- page: apps/cr/LE/le_cr.html -->
<!-- page: apps/cr/MARITIME/maritime_cr.html -->
<!-- page: apps/cr/SAR/sar_cr.html -->
<!-- page: apps/cr/SOF/sof_cr.html -->
<!-- page: apps/cr/SPECIAL/special_cr.html -->
<!-- page: apps/cr/SURVEY/survey_cr.html -->

Todas las familias comparten la misma página de introducción: los mismos bloques comunes, más algunos bloques propios
de la familia. En ella redacta el informe de un vuelo realizado y, después, lo guarda en el registro de misiones.
Se llega a ella por la página «Nuevo informe», por una misión asignada, o haciendo clic en una misión
en un informe estadístico o en una ficha (la misión se abre entonces en modo de modificación).

**Tres etapas.** El formulario se lee por etapas, señaladas por la barra «1 Vuelo · 2 Misión · 3 Resultado» en la parte
superior (un clic abre la etapa y lleva a ella):
1. **Vuelo**, los hechos: Identificación, Aeronave(s), Cronología, Tripulación, Combustible (y Traza de red a partir del
   nivel 3).
2. **Misión**, lo que usted introduce: los bloques propios de la familia (FIRE: orden de vuelo, horarios de incendio,
   lanzamientos; HEMS: servicio, misión médica, horarios, destinos; SPECIAL: el bloque de la serie), precedidos de
   «Tarea / orden de misión» para las familias que no tienen su propio bloque de orden.
3. **Resultado**: el bloque «Resultado y observaciones». La barra «Añadir al registro» / «Enviar» termina el informe.

Cada etapa se pliega por su título, que indica su estado: «✓» cuando lo esencial está ahí (Vuelo: aeronave, despegue y
aterrizaje, tripulación, combustible a la salida y al aterrizaje; Misión: al menos un campo rellenado en cada bloque
de la familia; Resultado: el resultado elegido); si no, «por completar». Una cuarta etapa, **Detalles del vuelo**,
plegada, reúne los demás bloques: Navegación, Entorno / meteorología, Eventos con hora, Tramos / rotaciones,
Capacidades; abierta, los muestra en todos los niveles (sustituye al antiguo «Informe detallado»), cada uno resumido en
una línea con su insignia, «Modificar» para sus campos.

**Los resúmenes.** Un bloque cuyo contenido esencial está rellenado cabe en una línea: Identificación (fecha · operación ·
organismo), Aeronave(s) («MILAN74 · DH8D F-ZBMD»), Cronología («calzos 13:07 → 15:13, vuelo 13:21 → 15:02», con el
enlace «traza ↗»), Tripulación (los nombres), Combustible («1200 → 650 kg»), Traza de red. Su insignia de procedencia
(«↧ IVAO — último vuelo») dice de dónde vienen sus valores. «Modificar» despliega los campos, «Resumen» los pliega. Un
bloque vacío, incompleto o con una anomalía de coherencia queda desplegado, como aquel en el que usted trabaja; tras un
prerrellenado, los bloques completados vuelven a mostrarse resumidos.

**Según el nivel de uso.** En los niveles 1 (Tripulación) y 2 (Planificación), un bloque desplegado muestra sus campos
esenciales (identificación: misión, n.º de informe, fecha, serie; aeronave: matrícula, tipo, indicativo, aeródromos;
cuatro horas; combustible a la salida y al aterrizaje); «Todos los campos», bajo su título, muestra los demás y
«Campos esenciales» vuelve atrás. En los niveles 3 y 4 están todos los campos. Los valores de campos ocultos
(importación, plan de vuelo, seguimiento de red) permanecen en el informe. Un clic en una anomalía de coherencia, bajo
los cálculos, abre la etapa, el bloque y, si hace falta, todos sus campos, y después coloca el cursor en el campo.

### Cabecera y barra de herramientas

La cabecera permanece fija en la parte superior de la página. De izquierda a derecha:

| Entrada | Función |
|---|---|
| «SAR · SAR terrestre ▾» (familia · subtipo) | ventana «Familia de misión» (abre la página de la otra familia) y «Subtipo de misión» |
| «CRF-A01-0 · 17/10/2026» | n.º del informe y fecha del vuelo, de solo lectura; un clic abre el campo de la fecha |
| «Añadir al registro» / «Guardar cambios» | guarda la misión en el registro |
| «Enviar» ▾ | «Enviar informe»: transmite el informe al servicio web de la aerolínea (con línea de puntos mientras no esté configurado); «Sitio de la aerolínea» (si su dirección está configurada): «Registrar el vuelo en el sitio ↗», el favorito «→ Vol», «Copiar los campos» (véase más abajo) |
| «Prerrellenar» ▾ | todo lo que rellena el informe: nuevo informe desde una orden de misión, un vuelo pasado o un archivo; completar este informe desde mi último vuelo IVAO / VATSIM, un plan de vuelo presentado o un texto pegado (véase «Prerrellenar») |
| «Seguimiento de red» ▾ | seguimiento en directo IVAO / VATSIM, historial VATSIM |
| «Misión» ▾ | «Nueva misión», «Exportar misión (YAML)», «Eliminar esta misión» (en modificación) |
| «Registro de misiones» ▾ | «Ver informe», «Carpeta del registro…», «Configurar el envío de informes (servicio web)…», «Configuración — bases de datos…» |

A la derecha, un mensaje de estado indica el último guardado («Borrador guardado en el
navegador · hora»). Cada bloque tiene en su título **Ocultar / Mostrar** (elección
memorizada); el orden de los bloques es el de las etapas (las disposiciones cambiadas con ↕ antes de las etapas ya no
se aplican). Los bloques que contienen una lista tienen un **+** en su
título para añadir un elemento.

En los niveles 1 y 2, «Misión» y «Registro de misiones» no aparecen (llegan en el nivel 3); «Prerrellenar» está desde el nivel 1, salvo la importación de un archivo (nivel 3). Una nueva misión se abre con ☰ › Misiones › «Nuevo informe».

### Modificación de una misión del registro

Esta barra solo aparece cuando modifica una misión ya guardada (abierta desde un informe estadístico,
una ficha o justo después de «Añadir al registro»). Recuerda el n.º de informe y su lugar en el registro
(p. ej. `CRS-004-1 — missions.yaml #12`).

- El botón principal pasa a ser «Guardar cambios».
- Aparece «Misión ▾ › Eliminar esta misión» (confirmación: «¿Eliminar definitivamente esta
  misión del registro?») y, después, la página vuelve al informe estadístico de la familia.
- Si la misión se ha movido o eliminado mientras tanto, la página lo indica y abre una nueva misión.

### Identificación y organización

Números, fecha, serie, ejercicio u operación real, organización.

| Campo | Lo que hay que saber |
|---|---|
| «Misión (identificador)» | identificador de la misión volada (`M-016`, `S-002A`); vacío: informe sin misión. Debajo aparece un enlace «ver la misión en el registro ↗», con el número de informes de esa misión y la diferencia con el vuelo estimado |
| «N.º de informe» | calculado, no modificable: `CRM-016-1`, `CRM-016-2` si se vuelve a volar; sin misión: `CRM-A01-0` |
| «Serie» / «Subtipo» | tipo de misión de la familia; la serie también aparece en la pastilla de la cabecera |
| «Fecha», «Hora local», «Hora UTC» | fecha del día por defecto; la hora local rellena la hora UTC y viceversa; la hora del briefing las rellena si están vacías |
| «Ejercicio / operación real» | «Ejercicio / simulación» u «Operación real» |
| «Nombre del ejercicio / operación», «Organismo», «Unidad» | se proponen los valores que ya ha introducido |
| «Autoridad solicitante», «Autoridad de control» | tomadas de la última misión del mismo indicativo o del mismo organismo |

Según la familia, se añaden o desaparecen otros campos: «Número de serie», «Clasificación»
(familias no civiles), «Referencia de la orden», «Destacamento». Una fecha en el futuro se
señala: un informe se refiere a un vuelo realizado.

### Resultado y observaciones

Resultado de la misión, observaciones y acciones que derivan de él, en un solo bloque (situado en 2.ª posición para la lectura del informe).

1. Elija el «Resultado»: Éxito, Éxito parcial, Abortada, Cancelada, Desviada, Sin contacto,
   Objetivo no encontrado, Meteorología, Técnico, Operacional, Otro.
2. Para cualquier resultado distinto de Éxito u Otro, aparecen los campos «Motivo de interrupción» y «Causas»; marque todas las causas (meteorología, técnica, simulador, piloto ausente, sin control, red, zona no activada, cisterna ausente, falta de tiempo…): suben a la plaqueta de la orden de vuelo (MNE).
3. Anote sus «Observaciones» y, si es necesario, «Resultado detallado», «Incidentes», «Anomalías técnicas» y
   «Lecciones aprendidas». Observaciones y lecciones forman las secciones «13. Observaciones» y «14. Lecciones
   aprendidas» del informe; una misión asignada deposita aquí un recordatorio de la misión de origen y de su carga.

Este resultado alimenta la tasa de éxito y el gráfico «Resultados» de los informes estadísticos.

### Aeronave(s) +

Una tarjeta por aeronave desplegada; siempre hay al menos una. El «+» del título añade una aeronave.

1. Escriba la matrícula (`F-ZB…`): se proponen las aeronaves conocidas con tipo, indicativo, operador
   y base. Elija una: el tipo, la categoría, el indicativo, el operador OACI, la base y los equipos se
   rellenan.
2. O parta del indicativo: `ctm58` en «Indicativo» da la serie, el número, el indicativo completo
   y el «Indicativo plan de vuelo (máx. 7 car.)».

| Botón / campo | Función |
|---|---|
| «Ficha de aeronave ↗» | abre la ficha de la aeronave (en cuanto se introduce la matrícula) |
| «⟲ Borrar» | vacía la aeronave para volver a buscar (aeronave o tipo equivocado) |
| «Operador OACI (OPR/, casilla 18)» | deducido del organismo o de la aeronave conocida |
| «Base de salida», «Base de regreso», masas, «Autonomía disponible (min)», «Configuración de misión» | completar si es útil |
| «Aeródromo de aterrizaje real (OACI)» | aeródromo donde la aeronave aterrizó realmente, nunca prerrellenado; en un informe abierto desde «Mis misiones» (orden de misión o de traslado), sitúa la aeronave en ese aeródromo para los traslados siguientes. Un informe fuera de orden de misión no desplaza la aeronave |
| «Equipamiento / capacidades técnicas de la aeronave» | plegado; tomado de la aeronave conocida o del plan de vuelo |

Los campos se filtran entre sí (tipo de ala, tipo, serie). Elegir otra aeronave sustituye lo que se había
recuperado automáticamente, nunca lo que usted ha introducido. Un tipo desconocido se añadirá a la base local
al guardar.

### Tripulación +

Miembros de la tripulación y sus funciones; siempre hay al menos una línea. El «+» del título añade un
miembro; la cruz «×» al final de la línea lo quita.

| Columna | Contenido |
|---|---|
| «Función» | función a bordo, lista propia de la familia |
| «Nombre / indicativo» | trigrama o nombre; se proponen los nombres ya introducidos |
| «Aeronave n.º» | número de la tarjeta de aeronave (1 por defecto) |
| «Observación» | texto libre |

El nombre introducido sirve de clave para la [ficha de tripulante](#ficha-de-tripulante): escríbalo siempre de la misma forma.

### Tarea / orden de misión

Objetivo y consignas de la misión: «Objetivo», «Instrucciones particulares», «Prioridad».
Para una misión asignada, el objetivo y las instrucciones ya vienen rellenados desde la misión. Estos
textos figuran en la sección «5. Tarea» del informe. En los niveles 1 y 2, este bloque aparece para las familias sin
bloque de orden propio (FIRE, ISR y LE lo tienen: «Tarea / orden de misión» solo llega allí en el nivel 3).

### Capacidades / técnicas

Técnicas y medios empleados en vuelo, que se marcan en grupos (grúa, lanzamiento, NVG, vuelo nocturno…).

- Este bloque está **oculto por defecto**: haga clic en «Mostrar» en su título para abrirlo.
- Al crear una misión, las casillas se toman de la última misión de la misma serie: basta con
  configurarlas una vez.
- Las capacidades marcadas hacen aparecer algunos bloques propios de la familia (p. ej. SAR: izado si
  la aeronave es un helicóptero y la grúa está marcada).

### Cronología

Horas clave del vuelo, de calzos a calzos, en hora local (HH:MM): «Briefing», «Puesta en marcha», «Fuera
calzos», «Despegue», «Entrada en zona», «Inicio de misión», «Fin de misión», «Salida de zona»,
«Aterrizaje», «En calzos», «Parada de motores».

1. Introduzca las horas, o haga clic en el botón «ahora» junto al campo (hora local del aeródromo
   de salida; en su defecto, hora de París).
2. Las duraciones se calculan solas en «Cálculos automáticos».

Cada hora crea y mantiene al día el evento con hora correspondiente. Una hora incoherente (salida de
zona antes de la entrada, hora no válida, cronología de más de 20 h) se resalta y se lista bajo los
cálculos. El seguimiento de red y la importación de una página de tracker también rellenan estas horas.

### Combustible (aeronave principal)

Combustible embarcado, consumido y restante de la aeronave n.º 1.

- Elija la «Unidad» (kg, lb, L, US gal) y, después, introduzca «FOB inicial», «Rodaje», «Al
  despegue», «Al aterrizaje», «En calzos», «Reserva», «Combustible de alternativa».
- Para las familias que trabajan sobre una zona: «Llegada a la tarea», «Combustible en zona», «Salida de la
  tarea».
- «Combustible consumido» y «Combustible en zona» se calculan en la columna de la derecha.
- Se señala un combustible final superior al combustible de salida.

### Bloques propios de la familia

Se colocan después del Combustible y antes de los Eventos. Su lista figura en la tabla
[Bloques propios de cada familia](#bloques-propios-de-cada-familia). Algunos solo aparecen para una
serie, una categoría de aeronave o una capacidad marcada: la línea «Contexto de visualización», bajo los
cálculos, recuerda la serie, los tipos de aeronave y las capacidades que se tienen en cuenta.

### Eventos con hora +

Eventos destacables, con su hora, en una tabla compacta (una línea por evento, con la descripción en
una 2.ª línea).

1. «+» en el título («+ Añadir evento») añade una línea.
2. Rellene «Hora local» (la hora «UTC» se calcula), «Tipo», «Posición» y, si es útil,
   «Altitud», «Velocidad», «Rumbo», «Combustible», «Descripción», «Resultado».
3. «×» al final de la línea quita el evento.

Los tipos propuestos incluyen los eventos comunes (despegue, desvío…) y los de la familia
(SAR: inicio / fin de búsqueda, baliza detectada, superviviente localizado, superviviente recuperado, kit SAR
lanzado…). Los eventos creados por la cronología siguen sus horas; un evento completado a mano
nunca se quita.

### Tramos / salidas / rotaciones +

Tramos, salidas y rotaciones del vuelo, una línea cada uno: «Desde», «Hasta», «Despegue», «Aterrizaje»,
«Pasajeros», «Carga (kg)», «Observación». El «+» del título añade un tramo.

- Los aeródromos se proponen a partir de la base de aeródromos.
- Los tramos cuentan en las salidas, los pasajeros y la carga de los informes estadísticos.
- La familia HEMS no tiene este bloque: tiene su propio bloque «Destinos / escalas».

### Traza de red IVAO / VATSIM

Traza del vuelo en IVAO o VATSIM.

| Campo | Función |
|---|---|
| «Red» | «Fuera de red / no indicado», IVAO o VATSIM |
| «ID IVAO (VID)», «ID VATSIM (CID)» | tomados de su perfil (Ajustes › Mi perfil) |
| «URL de la traza» | enlace a la traza; aparece en el informe («Abrir traza») y en los informes estadísticos |

La red indicada alimenta el gráfico «Red» y el indicador «En red» de los informes estadísticos.

### Navegación

Aeródromos, ruta, puntos y zona de trabajo. El plan de vuelo presentado (SimBrief, IVAO, VATSIM) se recupera con «Prerrellenar ▾ › Plan de vuelo presentado» (véase «Prerrellenar»).

Campos: «Salida (ADEP)», «Destino (ADES)», «Alternativo (ALTN)», «Ruta» (solo se proponen las rutas
ya utilizadas para el mismo trayecto), «Puntos de ruta (uno por línea)»,
«Coordenadas», «Altitud / FL», «Altitud mínima», «Velocidad (kt)», «Distancia (NM)». Según la
familia: «Zona de operación», «Radio (NM)», «Corredor», «Espera / órbita».

### Entorno / meteorología

Condiciones meteorológicas y de entorno encontradas. En general, **no hay nada que hacer**: en cuanto se conocen el aeródromo de
salida, la fecha y la hora, la página calcula un METAR a la hora del vuelo (modelo Open-Meteo), el
viento, la temperatura, el QNH, la visibilidad, el techo de nubes, la «Altitud densidad (ft)», la salida y la
puesta del sol y el «Día / noche».

- Lo que usted introduce nunca se sustituye.
- Los botones «METAR actual del aeródromo de salida (VATSIM)», «METAR calculado a la hora del vuelo
  (Open-Meteo)» y «Calcular salida / puesta del sol» rehacen el cálculo a petición.
- Un METAR pegado en «METAR» se analiza (viento, T.ª, QNH, visibilidad, techo de nubes).
- «Estado del mar» solo aparece para una misión marítima, embarcada o en anfibio;
  «Iluminación (luna…)», solo para un vuelo nocturno o con NVG.

### Cálculos automáticos

Columna de la derecha, actualizada durante la introducción: «Tiempo calzo», «Tiempo de vuelo», «Tránsito de ida»,
«Tiempo en zona», «Tránsito de vuelta», «Tiempo de misión», «Combustible consumido», «Combustible en zona».

- Debajo, las posibles anomalías empiezan por ⚠ (hora no válida, hora anterior al tramo anterior,
  cronología de más de 20 h, fecha futura, combustible incoherente). Un clic lleva al campo correspondiente.
- «Contexto de visualización» recuerda la familia, la serie, los tipos de aeronave y las capacidades, que
  deciden qué bloques se muestran.
- En los niveles 1 y 2 (informe breve), solo tres cálculos: «Tiempo calzo», «Tiempo de vuelo», «Combustible consumido»; «Contexto de visualización» y los cálculos de zona y de misión llegan en el nivel 3. Un clic en una anomalía abre la etapa y el bloque del campo afectado, y sus demás campos si está oculto.

### Informe

Vista previa del informe, bajo los cálculos, actualizada durante la introducción y en cada cambio de idioma.
Tiene 14 secciones (identificación, resumen redactado automáticamente, aeronaves, tripulación, tarea,
meteorología, cronología, ejecución, datos específicos, resultados, combustible, incidentes, observaciones,
lecciones aprendidas).

| Botón | Función |
|---|---|
| «Generar / actualizar el informe» | rehace la vista previa a petición |
| «PDF / Imprimir» | imprime **solo** el informe (o lo guarda en PDF) |
| «Versión pública (datos sensibles ocultos: informe, impresión, exportación)» | casilla visible para las familias con datos sensibles (COMMAND, ISR, LE, SOF, SPECIAL) |

La versión pública se aplica también a la exportación YAML (archivo con el sufijo `_public`) y al envío.

### Prerrellenar

El menú «Prerrellenar ▾» de la cabecera (desde el nivel 1) reúne todo lo que rellena el informe; los bloques solo
conservan la introducción manual. Es un menú corto, una entrada por línea, en dos grupos; la entrada elegida abre
después su ventana (lista de vuelos, cuadro para pegar…), cuya ayuda está plegada bajo «Ayuda». Esc o un clic fuera
cierra el menú, igual que la ventana.

**Nuevo informe desde…** (el borrador en curso se sustituye, tras confirmación si no está vacío):
- «Una orden de misión»: sus 7 asignaciones recientes (últimos 21 días) sin informe, una línea cada una (fecha y hora
  UTC, indicativo, trayecto, misión); un clic abre el informe prerrellenado desde la orden, como «Crear el informe» en
  Mis misiones. Última línea: «Abrir Mis misiones ↗».
- «Uno de mis vuelos»: sus 7 vuelos recientes del diario de la aerolínea sin informe (fecha, indicativo, trayecto,
  tipo); un clic abre el informe prerrellenado, como «Redactar el informe» en Mis vuelos. Última línea: «Abrir Mis
  vuelos ↗».
- «Un archivo (YAML / JSON)»: un archivo de misión (nivel 3).

Ambas listas necesitan su trigrama (Ajustes › Mi perfil).

**Completar este informe desde…** (**solo se rellenan los campos vacíos**):
- **«Mi último vuelo IVAO»**, **«Mi último vuelo VATSIM»**. La suite debe abrirse con su lanzador, con su ID IVAO o
  VATSIM en Mi perfil (sin ID, la entrada aparece en gris; su información emergente dice lo que falta, «Falta el VID
  IVAO — Mi perfil»); para IVAO, la clave de API de la suite (Ajustes › Instalación).
  - Sus vuelos de los últimos 7 días (UTC), sean cuales sean la familia y la fecha del informe. Un solo vuelo: el
    informe se rellena enseguida; varios: la ventana los lista (indicativo, trayecto, fecha y horas UTC, «en curso»
    si sigue conectado), elíjalo; cada línea tiene su enlace ↗ al tracker IVAO.
  - Vuelo cortado por desconexiones: las sesiones seguidas (mismo indicativo, reanudada menos de 30 min después
    donde se detuvo la anterior, sin que la anterior terminara en el aparcamiento) forman un solo vuelo, «3 sesiones
    (reconexiones)»; plan de vuelo de la última sesión, trazas unidas.
  - Rellenado: indicativo, aeródromos, plan de vuelo presentado (aeronave, equipos, ruta, nivel, velocidad,
    alternativo, observaciones, matrícula `REG/`, autonomía), enlace de la traza, horas sacadas de la traza (puesta
    en marcha, despegue, aterrizaje, parada) y distancia. No rellenado: lo que la red no conoce (misión, tripulación,
    combustible, resultados, incidentes). Un vuelo «en curso» da horas provisionales: vuelva a recuperarlo tras la
    desconexión.
  - VATSIM: mismo principio, pero VATSIM no publica traza: las horas son las de conexión y desconexión (a
    corregir), el plan es el presentado para esa conexión.
  - Sin vuelos, la ventana indica para qué ID y qué periodo. En cuanto se retiene o se pega un vuelo IVAO, aparece
    «Ver en el tracker IVAO ↗» junto al campo «URL de la traza» (bloque Traza de red).
- **«Plan de vuelo presentado (SimBrief / IVAO / VATSIM)»**: la ventana propone «Último OFP de SimBrief» (su
  identificador SimBrief del perfil de piloto), «Plan de vuelo IVAO (vuelo en curso)» (su VID), «Plan de vuelo VATSIM
  (en curso o presentado)» (su CID): aeronave, equipos OACI, ruta, puntos de ruta, niveles, aeródromos, METAR / TAF,
  masas y combustible previstos (SimBrief).
- **«Pegar un plan de vuelo, una página del tracker o un METAR»**: pegue (Ctrl+V) en el cuadro, el análisis es
  inmediato; o «Pegar desde el portapapeles» (Chrome pide permiso una vez). Textos reconocidos: plan de vuelo OACI
  «(FPL-…)», página del tracker IVAO (detalles de un vuelo o lista de conexiones), página de un vuelo StatSim
  (VATSIM), historial VATSIM (JSON), METAR. Los enlaces «↗ Tracker IVAO (mis conexiones)» y «↗ Mis vuelos StatSim
  (VATSIM)» abren sus páginas.
- **«Marcador «→ CR»»**: el enlace «→ CR», que se arrastra una vez a la barra de marcadores, copia la página del
  tracker con un clic.

**El mismo resumen para todas las fuentes**, en una notificación (10 s), con la ventana cerrada: la fuente y la fecha del vuelo
(«Plan de vuelo OACI, vuelo del 19/10»), el número de campos rellenados y los bloques afectados (aeronave,
cronología, ruta, meteorología…), el número de campos ya introducidos que se conservan y lo que la fuente no ha dado
(«ausentes de la fuente: despegue, aterrizaje»). La acompañan dos botones: «Deshacer» deja el informe como estaba
antes del prerrellenado; «Reemplazar los campos ya introducidos (n)», cuando se han conservado campos ya
introducidos, vuelve a aplicar la misma fuente sustituyéndolos. Gana la fuente más explícita: el asistente «aeronave conocida»
(flota) solo rellena lo vacío; nunca sustituye un campo puesto por la fuente ni uno ya introducido, aunque la matrícula
cambie en el mismo paso, y el resumen lo dice («indicativo de la flota MILAN74 no aplicado (CFN12 viene de la
fuente)»). Detalles del pegado: [tutorial](../TUTORIAL.md), § 6.

**Procedencia.** El título de cada bloque rellenado por una fuente lleva una insignia «↧» que la nombra: «Plan de
vuelo OACI, vuelo del 19/10», «IVAO — último vuelo», «Orden de misión M-016», «Diario de la aerolínea», «Seguimiento
de red IVAO»…; su información emergente dice cuántos campos del bloque provienen de ella. Un campo corregido a mano
pierde su procedencia (la insignia desaparece con el último). «Deshacer» también restablece las insignias anteriores.
La procedencia se guarda con el borrador, en este navegador; no entra en el registro.

### Seguimiento de red

Menú de la cabecera para anotar las horas durante el vuelo.

- «Iniciar seguimiento en directo» antes de la puesta en marcha y, después, **mantenga la página abierta** hasta
  la parada de motores. Cada 20 s, la página lee los datos públicos IVAO / VATSIM y rellena puesta en
  marcha, despegue, aterrizaje y fin de misión. «Detener seguimiento» lo interrumpe.
- Después de un vuelo VATSIM sin seguimiento: «Recuperar historial VATSIM» abre el historial en una pestaña;
  copie todo (Ctrl+A, Ctrl+C) y vuelva: se recuperan las horas de conexión (a comprobar).
- Se necesita su ID IVAO o VATSIM (bloque Traza de red o perfil de piloto).

### Borrador, registro y exportación

**Borrador.** Todo lo que introduce se guarda en el navegador («Borrador guardado en el
navegador»). Puede cerrar la página y volver: se vuelve a abrir el borrador de la familia. Salir
sin haber guardado en el registro muestra una advertencia.

**Guardar en el registro.**

1. La primera vez: «Registro de misiones ▾ › Carpeta del registro…» y elija la carpeta `data/cr`
   de los datos (autorización del navegador, válida para todas las familias).
2. Haga clic en «Añadir al registro»: la misión se escribe en el registro único `missions.yaml`
   (todas las familias). Si ese n.º de informe ya existe, la página propone añadirlo de todos modos (duplicado) o
   cancelar para corregir.
3. La página pasa a modo de modificación: «Guardar cambios» guarda las correcciones siguientes.

Sin carpeta autorizada, la misión solo se guarda en el navegador; entonces aparece «Descargar el
registro (YAML)» en el menú «Registro de misiones». El menú recuerda el archivo, el
número de misiones de la familia y la carpeta.

**Otras acciones.**

| Acción | Efecto |
|---|---|
| «Misión ▾ › Nueva misión» | vuelve a empezar desde un informe en blanco (confirmación si el borrador no está guardado) |
| «Misión ▾ › Exportar misión (YAML)» | descarga un archivo con esta sola misión |
| «Enviar ▾ › Enviar informe» | envía misión, informe (HTML y texto) y cálculos al servicio web; la burbuja del botón recuerda el último envío. Una misión no guardada pide confirmación |
| «Enviar ▾ › Registrar el vuelo en el sitio ↗» | abre la página «Enregistrer mon vol» del sitio de la aerolínea con los campos del vuelo (véase más abajo) |
| «Registro de misiones ▾ › Ver informe» | abre el informe estadístico de la familia |

Mientras el servicio web no esté configurado, «Enviar informe» propone abrir su configuración
(«Configurar el envío de informes (servicio web)…»).

**Declarar el vuelo en el sitio de la aerolínea.** El sitio se abre en otra pestaña, donde usted tiene la sesión iniciada. La suite no
se conecta a él ni valida nada en su lugar: prepara el formulario «Ajouter un vol», usted lo revisa y lo
valida.

1. Una sola vez, arrastre el favorito «→ Vol» (menú «Enviar») a la barra de favoritos del navegador.
2. Con el informe guardado, «Enviar ▾ › Registrar el vuelo en el sitio ↗» abre la página «Enregistrer mon vol» del sitio, con
   los campos del vuelo en la dirección (después de «#»: nunca se envían al servidor). Un informe no guardado pide confirmación.
3. Inicie sesión si el sitio lo pide y después haga clic en el favorito «→ Vol»: abre la página de su aeronave
   (reconocida por su matrícula) y después «Ajouter un vol»; vuelva a hacer clic en él en ese formulario.
4. El favorito rellena el indicativo (elegido en la lista del sitio por su nombre, CARAFON, o su código, CFON), el número de
   vuelo, la fecha de fin del vuelo (fecha del informe y hora de fin de calzos, si no de aterrizaje, en hora local como la cronología del informe; el día siguiente si el vuelo
   pasa la medianoche), la duración (calzos, si no vuelo), la misión (familia, tipo, operación) y la llegada. Lo rellenado
   se rodea de verde, lo que falta de rojo. La matrícula y la salida, que impone el sitio (posición actual de la
   aeronave), no se modifican: una diferencia con el informe se señala.
5. Revise, complete y después «Valider» en el sitio.

Si los campos se pierden (inicio de sesión pedido por el camino), vuelva a lanzar «Registrar el vuelo en el sitio ↗». Sin el favorito,
«Copiar los campos» copia una línea (matrícula, tipo, indicativo, fecha, duración, salida → llegada, misión) para
introducir a mano. El menú «Sitio de la aerolínea» solo aparece si la dirección del sitio está configurada (Ajustes ›
Instalación › Fuentes y carpetas).

### Bloques propios de cada familia

Los bloques condicionales solo se muestran si se cumple la condición indicada. La última columna
da los indicadores propios de la familia, que se recogen en los informes estadísticos.

| Familia | Bloques específicos (en el orden de la página) | Indicadores de la familia |
|---|---|---|
| HEMS | Servicio y estado · Misión médica · Horarios HEMS · Destinos / escalas (sustituye a «Tramos / salidas / rotaciones») | pacientes transportados, misiones finalizadas, alerta → despegue (media, ≤ 15 min) |
| FIRE | Orden de vuelo · Horarios de incendio · Lanzamientos y recargas | lanzamientos contraincendios, recargas / amerizajes, consumo medio (/h) |
| SAR | Alerta y coordinación SAR · Personas buscadas · Zonas y patrones de búsqueda · Contactos detectados · Localización y recuperación · Izado (helicóptero + grúa marcada) · Lanzamiento de kit SAR (avión o anfibio + lanzamiento marcado) | zonas de búsqueda, personas localizadas, personas rescatadas, izados, kits SAR lanzados |
| AIRLIFT | Origen, destino y escalas · Manifiesto de carga · Pasajeros y cargas especiales · Pista y operaciones en tierra · Entrega | pasajeros, carga (t), carga entregada (t), rotaciones |
| AAR | Función, zona y encuentro · Receptores y combustible transferido · Balance de combustible e incidentes | receptores, combustible transferido (t), contactos, breakaways |
| MARITIME | Zona marítima y condiciones · Contactos de buques · Contaminación observada · Transmisión del informe | buques detectados, buques identificados, anomalías, contaminación observada |
| HADR | Catástrofe y contexto · Puntos de recogida, evacuación y refugios · Evacuados y personal · Carga de socorro · Lanzamiento de suministros (serie «Lanzamiento de suministros» o lanzamiento marcado) | evacuados, personal de socorro, carga de socorro (t), salidas de socorro |
| AIRBORNE | Zona de lanzamiento (DZ) · Pasadas de lanzamiento | paracaidistas, lanzamientos, carga lanzada (kg), lanzamientos en la DZ |
| FI | Instalación inspeccionada · Pasadas · ILS (series ILS, LOC, Glide path) · VOR / DME / TACAN / NDB (series correspondientes) · Validación de procedimiento (series «Validación de procedimiento», RNAV / GNSS) · Ayudas visuales / balizamiento (series PAPI / VASI, «Balizamiento de aeropuerto») · Conclusión de la inspección | instalaciones inspeccionadas, pasadas, anomalías / fuera de tolerancias, en servicio, fuera de servicio |
| SURVEY | Proyecto y zona de levantamiento · Líneas de levantamiento · Adquisición y datos · Puntos de medición meteorológica (series «Reconocimiento meteorológico» e «Investigación atmosférica») | horas de levantamiento, líneas completadas, superficie cubierta (km²), conjuntos de datos |
| LE | Autoridad y coordinación · Objetivo · Posiciones sucesivas | seguimientos, duración del seguimiento, identificaciones positivas |
| ISR | Tarea de obtención · Sensores empleados · Contactos / trazas · Observaciones de emisores / comunicaciones (series SIGINT, ELINT, COMINT) · Cobertura y difusión | contactos, imágenes obtenidas, grabación, cobertura media (%) |
| COMMAND | Interceptación (serie «Policía aérea / interceptación (QRA)») · Estación y autoridad · Unidades coordinadas · Frecuencias y redes · Registro de coordinación · Eficacia de la misión | tiempo en estación, unidades coordinadas, retransmisiones, cortes de comunicación |
| COMBAT | Dispositivo y zona · Interceptación (serie «Interceptación / identificación (VID)») · Enfrentamientos · Balance de la sesión | enfrentamientos, victorias, disparos válidos, paradas de seguridad (KIO) |
| SOF | Unidad apoyada · Zonas (PZ / LZ / DZ) · Perfil y métodos · Personal | personal desplegado, personal recuperado, zonas utilizadas, misiones nocturnas con NVG |
| SPECIAL | Transporte VIP / gubernamental (series VIP) · Traslado (series de traslado) · Ensayo en vuelo y Puntos de ensayo (series de ensayo) · Formación y Ejercicios (series de formación) | pasajeros VIP, vuelos de traslado, puntos de ensayo conformes / realizados, ejercicios completados |

Las familias HEMS y FIRE pueden recuperar su antiguo registro CSV: consulte
[Informes de una familia](#informes-de-una-familia).

## Ficha de aeronave
<!-- page: apps/cr/appareil.html -->

La ficha reúne todo lo que se conoce de una aeronave, identificada por su matrícula: identidad,
estado, actividad, vida, rendimiento y misiones. Sirve a los pilotos y al Centro para seguir una
aeronave. Se abre haciendo clic en una línea de «Resumen por aeronave» del informe general de misiones, en el enlace
«Ficha de aeronave ↗» de una tarjeta de aeronave del informe, en una matrícula de una ficha de tripulante, o desde
el Flight Planner. No hay nada obligatorio: la ficha se va completando con los informes.

### Cabecera: estado y posición

El título muestra la matrícula, el tipo y el modelo. Debajo, tres pastillas:

- el **estado** (Disponible, No disponible, En mantenimiento, Retirado), en color;
- «📍 Actualmente en»: último aeródromo conocido (llegada de la última misión o del último vuelo del
  diario);
- «🏠 Aeródromo de base».

La barra de **periodo** de los informes estadísticos (preajustes, fechas, ◀ − ▶) está en la cabecera: la actividad, el
gráfico y la tabla la siguen. Una aeronave desconocida en las bases muestra «Desconocido en las bases: la
ficha se completará con los informes».

### Identidad

| Elemento | Modificable | Contenido |
|---|---|---|
| «Estado» | sí | lista anterior |
| «Aeródromo de base» | sí | código OACI, en mayúsculas |
| «Puesta en servicio» | sí | fecha |
| «Tipo», «Variante», «Ala», «Estela», «Operador» | no | tomados de la flota y de la base de tipos |
| «Ficha de flota» | no | enlace a la ficha de la aeronave en el sitio de la flota |
| «Indicativos usados», «Equipamiento» | no | tomados de las misiones, con su número |
| «Notas» | sí | texto libre |

Haga clic en «Guardar ficha»: la ficha se guarda **en este navegador** (incluida en la copia de seguridad
local). La identidad se calcula sobre todo el historial, sea cual sea el periodo.

«Fusionar con… / renombrar»: elija otra matrícula y, después, «Fusionar». Las misiones del
registro que llevan el valor antiguo toman el nuevo (tras confirmación, con una traza en
cada misión); la ficha completa la de la matrícula de destino.

### Actividad

Tarjetas del periodo: «Misiones / vuelos», «Horas de vuelo», «Horas calzo», «Primer vuelo»,
«Último vuelo». Debajo, un gráfico de las horas de vuelo por periodo, apiladas por familia.

- Arrastre sobre el gráfico o haga clic en una barra para hacer zoom en ese periodo.
- Haga doble clic para quitar el zoom.

### Vida de la aeronave (mantenimiento, inspecciones, incidentes…) +

Registro de los eventos de la aeronave.

1. El «+» del título añade una línea al principio, con la fecha del día, de tipo MAINTENANCE, en el aeródromo actual.
2. Corrija «Fecha», «Tipo» (MAINTENANCE, INSPECTION, INCIDENT, MODIFICATION, CONVOYAGE, AUTRE),
   «Aeródromo» y «Descripción».
3. «×» elimina la línea.

Cada cambio se guarda al instante en el navegador.

### Rendimiento y consumo (Flight Planner)

Perfil de rendimiento del Flight Planner para este tipo de aeronave.

- Tarjetas «Ascenso», «Crucero», «Descenso»: consumo horario y velocidad verdadera (y
  variómetro), más «Reserva» si se conoce.
- Curva RPM / potencia → consumo, cuando el perfil contiene una (pase el ratón para ver los valores).
- «Abrir en el Flight Planner ↗» abre el planificador con este tipo.

Sin perfil, el bloque muestra «Aún no hay perfil de rendimiento para este tipo: créelo en el
Flight Planner.»

### Misiones y vuelos

Tabla de las misiones y vuelos de la aeronave en el periodo: fecha, familia, n.º, indicativo, salida →
llegada, tripulación, horas de vuelo, fuente («registro» o «diario»).

- Haga clic en un título de columna para ordenar.
- Haga clic en una misión del registro para abrir su informe en modo de modificación; los vuelos del diario son de
  solo lectura.
- Bajo la tabla, cuando se elige un periodo: botones para ver las misiones anteriores o posteriores al
  periodo, y zoom − / +.

## Ficha de tripulante
<!-- page: apps/cr/equipage.html -->

La ficha de un miembro de la tripulación, identificado por el nombre o el trigrama introducido en los informes: identidad,
calificaciones, actividad y misiones. Se abre haciendo clic en una línea de «Resumen por
tripulante» del informe general de misiones (dirección: `equipage.html?name=PLN`). El periodo de los informes estadísticos está
en la cabecera, como en la ficha de aeronave.

### Identidad

| Elemento | Modificable | Contenido |
|---|---|---|
| «Nombre» | sí | nombre completo, añadido al título de la ficha |
| «Aeródromo de base» | sí | base del piloto |
| «Funciones ejercidas» | no | funciones desempeñadas en los informes, con su número |
| «Calificaciones (una por línea)» | sí | texto libre |
| «Notas» | sí | texto libre |

«Guardar ficha» la guarda en este navegador. «Fusionar con… / renombrar» reúne dos
grafías de un mismo piloto (p. ej. GRR → RBR): las misiones del registro toman el nuevo valor, con
una traza, tras confirmación.

### Actividad

Tarjetas del periodo: «Misiones / vuelos», «Horas de vuelo», «Primer vuelo», «Último vuelo». Después,
«Por tipo»: horas de vuelo por tipo de aeronave. El gráfico apila las horas por familia; arrastrar
o hacer clic hace zoom, hacer doble clic lo quita.

Para un piloto sin misiones en el registro, las cifras proceden de la referencia si lo conoce.

### Misiones y vuelos

La misma tabla que en la ficha de aeronave, con además la columna «Matr.» (enlace a la ficha de
la aeronave) y el tipo. Ordenación por título de columna; clic en una misión del registro: informe en
modo de modificación; vuelos del diario en solo lectura.

## Informes
<!-- page: apps/cr/mission_operations_reporting.html -->

El informe general de misiones presenta la actividad de **todas las familias** a partir del registro único
`data/cr/missions.yaml`: indicadores, gráficos, resúmenes y tabla de misiones. Sirve a los pilotos
para su balance y al Centro para el seguimiento. Para ir a él: barra lateral › **Herramientas**, pestaña «Análisis de misiones» (herramienta opcional, marcada en Mi perfil).

### Familias y periodo

Primer bloque de la página (la cabecera solo conserva el título y el subtítulo): se pliega y se desplaza como los demás; al imprimir solo aparece el periodo.

| Elemento | Función |
|---|---|
| «Nuevo informe» | abre la página de elección de la familia |
| Periodo | preajuste (Todas las fechas, Hoy, Últimos 7 días, Últimos 30 días, Mes en curso, Año en curso, Periodo personalizado), fechas de inicio y de fin, ◀ retroceder, − alejar ×2, ▶ avanzar |
| «Familias» | una etiqueta de color por familia: clic para ocultar / mostrar, Ctrl + clic para conservar solo una, «Todas» para cambiarlas todas |
| «Agrupación» | Automático, Día, Semana, Mes, Trimestre, Año |
| «Medida» | Misiones, Horas de vuelo, Horas calzo a calzo, Tiempo en zona, Horas de misión, Salidas, Distancia (NM) |
| «Datos» | «Mis misiones (registro)», «Diario (vuelos realizados)» (solo lectura) o «Cargar / actualizar el diario…» |

El periodo se comparte con los informes de familia y las fichas. Las familias, la agrupación y la medida
se memorizan.

### Tarjetas de indicadores

En la parte superior de la página: misiones, éxito (%), horas de vuelo, calzo a calzo y en zona (con la media de las
misiones con datos), salidas, distancia, combustible por unidad, personas / carga, vuelos nocturnos /
crepusculares, en red (IVAO / VATSIM), operaciones reales (y ejercicios), aeronaves (y tipos),
tripulación. Una tarjeta sin datos no se muestra.

### Control de datos

Este bloque solo aparece si hay misiones que corregir. Muestra la familia, el n.º de misión, la fecha
y las anomalías (⚠ hora no válida, cronología invertida, más de 20 h, fecha futura, combustible
incoherente, duración declarada sin horas). Haga clic en una línea para abrir el informe y corregir.

### Actividad por periodo

Barras apiladas por familia, según la agrupación y la medida elegidas (recordadas junto al título).

- Pase el ratón por una barra para ver el detalle.
- Arrastre sobre varias barras, o haga clic en una barra, para conservar solo ese periodo: todo el
  informe lo sigue.
- Haga doble clic para quitar el zoom.

### Desgloses

Nueve gráficos, todos calculados según la medida elegida (pase el ratón para ver el detalle):

| Bloque | Contenido |
|---|---|
| «Por familia» | anillo, un color por familia |
| «Resultados» | éxitos, abortadas, desviadas… |
| «Series (tipos de misión)» | familia · serie |
| «Tipos de aeronave» | tipo OACI de la aeronave principal |
| «Capacidades empleadas» | casillas marcadas en los informes |
| «Aeródromos de salida» | ADEP o base de salida |
| «Día / noche» | día, noche, crepúsculo / alba, no indicado |
| «Red» | IVAO, VATSIM, fuera de red |
| «Ejercicio / operación real» | ejercicio / simulación, operación real |

### Resumen por familia

Una tabla, una línea por familia: misiones, salidas, éxito (%), horas de vuelo, vuelo medio, calzo a calzo, en
zona, distancia, combustible, «Indicadores de la familia» (lanzamientos, personas rescatadas, alerta →
despegue…). Haga clic en una línea para abrir el informe de la familia; la columna «Informe» lleva el
mismo enlace (↗).

### Resumen por aeronave

Una línea por matrícula: tipo, indicativos, familias, misiones, horas de vuelo, calzo a calzo, última
misión. Haga clic en una línea para abrir la [ficha de aeronave](#ficha-de-aeronave). Ordenación por título de columna.

### Resumen por tripulante

Una línea por nombre: funciones, familias, misiones, horas de vuelo, última misión. Haga clic en una línea
para abrir la [ficha de tripulante](#ficha-de-tripulante).

### Misiones (ordenar, clic para modificar, eliminar)

Tabla de todas las misiones seleccionadas: familia, n.º de misión, fecha, serie, tipo, matrícula,
indicativo, salida → llegada, resultado, vuelo, calzo a calzo, en zona, día / noche, traza de red.

1. Haga clic en un título de columna para ordenar.
2. Haga clic en una línea: el informe se abre en modo de modificación en la página de su familia.
3. «Eliminar» al final de la línea quita la misión del registro (con confirmación).

**«✎ Modificar en la tabla»** (en el título) hace modificables la fecha, el n.º de misión, la serie,
la matrícula, el indicativo, la salida / llegada, el resultado, el vuelo y el calzo a calzo. Cada celda se guarda
al instante en el registro, con una traza en la misión; «✓ Terminar» vuelve a la visualización normal.
Una duración introducida sin horas queda «declarada» (≈), se cuenta y se señala en el control de datos hasta
que se introduzcan las horas en el informe.

Bajo la tabla, cuando se elige un periodo: «◀ n antes del periodo», «− / +», «m después del
periodo ▶». Los vuelos del diario son de solo lectura.

### Registro de misiones

| Botón | Efecto |
|---|---|
| «Exportar registro (YAML)» | descarga todo el registro |
| «Exportar CSV (hoja de cálculo)» | exportación para una hoja de cálculo |
| «Carpeta del registro…» | elige la carpeta `data/cr` donde escribir `missions.yaml` |
| «PDF / Imprimir» | imprime la página |
| «Importar un registro CSV antiguo» | recupera un antiguo registro HEMS o FIRE / GAAR, sin duplicados (mismo n.º y fecha) |

La línea de información recuerda el archivo, el número de misiones y la carpeta (o «solo
navegador»).

## Informes de una familia
<!-- page: apps/cr/AAR/aar_reporting.html -->
<!-- page: apps/cr/AIRBORNE/airborne_reporting.html -->
<!-- page: apps/cr/AIRLIFT/airlift_reporting.html -->
<!-- page: apps/cr/COMBAT/combat_reporting.html -->
<!-- page: apps/cr/COMMAND/command_reporting.html -->
<!-- page: apps/cr/FIRE/fire_reporting.html -->
<!-- page: apps/cr/FLIGHTINSPECTION/fi_reporting.html -->
<!-- page: apps/cr/HADR/hadr_reporting.html -->
<!-- page: apps/cr/HEMS/hems_medevac_reporting.html -->
<!-- page: apps/cr/ISR/isr_reporting.html -->
<!-- page: apps/cr/LE/le_reporting.html -->
<!-- page: apps/cr/MARITIME/maritime_reporting.html -->
<!-- page: apps/cr/SAR/sar_reporting.html -->
<!-- page: apps/cr/SOF/sof_reporting.html -->
<!-- page: apps/cr/SPECIAL/special_reporting.html -->
<!-- page: apps/cr/SURVEY/survey_reporting.html -->

El informe de una familia solo muestra las misiones de esa familia, con sus propios indicadores.
Se llega a él por «Registro de misiones ▾ › Ver informe» en un informe de misión, por una línea de «Resumen
por familia» del informe general de misiones, o por el menú «familia · subtipo» del bloque «Familia y periodo» de otra página de informes.

### Familia y periodo

| Elemento | Función |
|---|---|
| «familia · subtipo ▾» | cambia de familia (abre su informe) o filtra por un subtipo («Todos los subtipos» por defecto) |
| «+ Nuevo informe» | abre directamente la página de informe de la familia |
| Periodo | el mismo componente y el mismo periodo que el informe general de misiones |
| «Agrupación», «Medida» | ajustes del gráfico de actividad (Misiones, Tiempo de vuelo, Tiempo calzo a calzo, Tiempo en zona), compartidos con el informe general de misiones |
| «Datos» | registro o diario, como en el informe general de misiones |

### Registro de misiones

| Botón | Efecto |
|---|---|
| «Exportar registro (YAML)» | descarga las misiones |
| «Exportar CSV (hoja de cálculo)» | exportación para una hoja de cálculo |
| «Importar misiones (YAML)» | añade al registro una o varias misiones exportadas |
| «Carpeta del registro…» | elige la carpeta `data/cr` |
| «PDF / Imprimir» | imprime la página |
| «Importar el registro HEMS antiguo (CSV)» / «Importar el registro FIRE / GAAR antiguo (CSV)» | solo HEMS y FIRE: recupera el registro antiguo, sin duplicados (mismo n.º y fecha) |

La línea de información recuerda el archivo, el número de misiones y la carpeta.

### Resumen

Tarjetas del periodo y del subtipo elegidos: misiones, salidas, logradas, horas de vuelo, calzo a calzo, de
misión, tiempo en zona, distancia, combustible, personas y carga transportadas y, después, los **indicadores
propios de la familia** (consulte la tabla [Bloques propios de cada familia](#bloques-propios-de-cada-familia)).

### Actividad por periodo

Barras apiladas por **subtipo** de la familia, según la agrupación y la medida. El mismo zoom que en el
informe general de misiones: arrastrar o hacer clic para hacer zoom, doble clic para quitarlo.

### Desglose detallado

Cuatro listas con barras (los 8 primeros valores): «Por serie», «Por resultado», «Por tipo
de aeronave», «Por capacidad empleada».

### Misiones (ordenar, clic para modificar, eliminar)

Columnas: n.º de misión, fecha, serie, aeronave, matrícula, indicativo, resultado, vuelo, calzo a calzo, en
zona, traza, «Control» (⚠ número de anomalías, detalle al pasar el ratón).

- Clic en un título de columna: ordenación.
- Clic en una línea: el informe se abre en modo de modificación.
- «Eliminar» al final de la línea, con confirmación.
- «✎ Modificar en la tabla»: las mismas reglas que en el informe general de misiones.

## Mapas de vuelo
<!-- page: apps/planner/map_planner.html -->

Esta página sirve para preparar sus propios mapas de vuelo: ruta, mapa de la ruta, aproximación, encuentro, aeródromo de destino y perfil vertical.
Está abierta a todos los pilotos. Para ir a ella: barra lateral «Herramientas», pestaña «Mapas de vuelo», botón «Abrir en los mapas de vuelo» de una misión en Mis misiones, o botón «Mapas de vuelo» del planificador de combustible.
Retoma el motor del estudio cartográfico del Centro, pero trabaja en un espacio propio de su navegador: sus ajustes nunca modifican la misión del Centro.
Cada bloque se pliega («Ocultar» / «Mostrar») y se mueve (asa ↕). La base SIA debe leerse una vez en este navegador (consulte el último bloque).
En los niveles 1 a 3 (Mi perfil › «Nivel de uso»), la página se limita a dos bloques: «Ruta» (campo de ruta, «Nivel», «SimBrief», mapa de control con «⤢ Ampliar») y «Mapas», con su único botón «Generar los mapas y el ZIP». Los demás mandos descritos a continuación solo aparecen en el nivel 4 (Experto).

### Recepción de una misión («Abrir en los mapas de vuelo»)

La página no muestra un bloque «Misión»: la misión llega sola desde Mis misiones.

1. En Mis misiones, abra la carpeta de la misión.
2. Haga clic en «Abrir en los mapas de vuelo». La aeronave que tiene asignada se coloca al principio de la misión.
3. La página se abre con la ruta y el nivel de la misión en el bloque «Ruta», y todos los mapas previstos por la misión en «Mapas que producir» (más `profil_vertical.png`). La lista «Mapas que producir» solo es visible en el nivel Experto.
4. Ajuste cada mapa si es necesario (nivel Experto) y, después, haga clic en «Generar los mapas y el ZIP»: en el bloque «Mapas» en los niveles 1 a 3, en el pie de página en el nivel Experto.

El pie de página indica el número de mapas del ZIP («… mapa(s) en el ZIP + mapa de conjunto»), o «Ninguna misión cargada».
Misión recibida: «Trazar» y «Combustible» trabajan sobre la misión cargada sin sustituirla. En los niveles 1 a 3, «Generar los mapas y el ZIP» genera sus mapas tal cual. En el nivel Experto, «Preparar los mapas» pide confirmación antes de sustituirla por un vuelo libre «Vuelo salida → destino» construido a partir de la ruta; sin misión cargada, los mapas se crean directamente.

### Ruta

Este bloque relaciona tres vistas: el plan de vuelo (texto), el mapa y el corte vertical. Al pasar el ratón por un punto en una de ellas, se resalta en las otras dos. Algunos mensajes de la página llaman a este bloque «Ruta».

- Campo de ruta: casilla 15 del plan de vuelo OACI, o lista separada por comas (por ejemplo `LFBO N0160A055 DCT TOU UN460 NTS DCT LFRN`). Vacío: ruta de la misión.
- «Nivel»: nivel de crucero («FL65» o «6500»).
- Menú «Aerovías» / «RTBA (baja altura)» y, después, «Buscar»: calcula una ruta entre los puntos del campo. El resultado sustituye el campo.
- «SimBrief»: toma la ruta del último OFP. El identificador SimBrief se introduce en Ajustes › Mi perfil.
- «Trazar»: dibuja el corte vertical. «Combustible»: abre el planificador de combustible con esta ruta (distancia, nivel, ruta verdadera, aeronave).
- «Copiar OACI»: copia el plan de vuelo OACI estricto (puntos no publicados en coordenadas).
- «Sintaxis y uso»: recordatorio de las formas aceptadas (balizas, puntos de notificación VFR «MM-CV», «REN300010», coordenadas «4330N00125E», niveles «/A035», «VFR»…).
- En los niveles 1 a 3 quedan el campo de ruta, «Nivel», «SimBrief» y «Sintaxis y uso»; el menú «Aerovías» / «RTBA», «Buscar», «Trazar», «Combustible» y «Copiar OACI» están en el nivel Experto.

En el mapa: arrastre un punto para moverlo (se ajusta a balizas, puntos de notificación y aeródromos), haga clic en la ruta para insertar un punto y clic derecho para eliminar uno. En el corte: clic para añadir un punto a esa altitud, arrastrar para cambiar la altitud, clic derecho para eliminar.

### Mapa de control y encuadre (bloque Ruta)

Bajo el campo de ruta, un mapa de control muestra el mapa elegido con su perfil de visualización. Se vuelve a dibujar con cada ajuste. En los niveles 1 a 3, solo se ofrece «⤢ Ampliar»; los demás mandos de la tabla y los «Ajustes del perfil: corte, aeronave, variómetro, salidas» están en el nivel Experto.

| Control | Efecto |
|---|---|
| «Mapa» | Mapa mostrado (por defecto: el mapa general de la ruta). |
| «Perfil» | Perfil de visualización de este mapa (el mismo ajuste que en «Mapas que producir»). |
| «ZIP» | Incluir o no este mapa en el ZIP. |
| «Actualizar» | Volver a dibujar la vista previa. |
| «Mantener este encuadre» | El mapa generado tomará exactamente el encuadre mostrado (zoom y desplazamiento con el ratón). |
| «Recentrar» / «Encuadre automático» | Volver al encuadre guardado / olvidarlo para usar un encuadre calculado a partir de la misión. |
| «⧉ Ventana» / «⤢ Ampliar» | Abrir el mapa en una ventana aparte / ampliarlo (Esc para volver). |

«Ajustes del perfil: corte, aeronave, variómetro, salidas» configura el corte vertical: suelo y techo (0 = auto), aeronave (perfiles del planificador de combustible) o régimen de ascenso y de descenso, imagen `profil_vertical.png` en las salidas, trazado de la ruta en los mapas.

### Ajustes del perfil: mapa de fondo, espacios, símbolos OACI, elementos

Este panel plegable, situado bajo el mapa de control, configura el perfil de visualización del mapa elegido. Los perfiles (IFR, IFR simplificado, VFR detallado, VFR simplificado, AIRWAYS…) son comunes a todas sus misiones y se guardan en el navegador. Perfil por defecto de un mapa: AIRWAYS para el mapa de la ruta de los Mapas de vuelo; IFR simplificado para el mapa principal de una misión y las vistas de conjunto; VFR detallado para los mapas de objetivo, detalle y encuentro; VFR simplificado para la aproximación. Panel del nivel Experto.

- Arriba: «Nombre del perfil», «Mapa de fondo» (OSM estándar, OpenTopoMap, fondos vectoriales…), botones «Guardar», «Nuevo», «Duplicar», «Eliminar».
- Pestaña «Mapa de fondo»: capas OSM (suelo, hidrografía, carreteras, relieve, curvas de nivel, cimas…), ciudades con símbolos OACI y umbral de población, nombres de ciudades, superficies edificadas.
- Pestaña «Espacios»: familias de espacios (R / D / P, CTR, TMA, CTA, SIV, TRA, RMZ, TMZ, PJE), simbología OACI, franja de altitud mostrada, opacidad. «Selección de espacios»: lista blanca o negra (botón «Lista blanca» para cambiar), introducción con autocompletado («R 45 A», «@RTBA»…), «Pegar una lista…», «Eliminar todo». «Espacios seleccionados» muestra el resultado.
- Pestaña «Símbolos OACI»: aeródromos (por categoría, controlados o no, lista blanca), radionavegación, aerovías inferiores y superiores, tracks NAT del día (trazos magenta, «NAT A»; zona Atlántico Norte activa), puntos de notificación VFR y puntos RNAV en ruta (triángulo azul), sobrevuelo prohibido, parques y reservas, obstáculos.
- Pestaña «Elementos»: puntos de ruta, meridianos y paralelos, cuadrícula MORA, nombres de las ciudades, circuito de reabastecimiento, zonas de misión y de búsqueda.

Recuerde hacer clic en «Guardar» para conservar un perfil modificado. Las listas de sugerencias de los campos de entrada (zonas, aeródromos, balizas) solo se rellenan cuando hace clic en el campo correspondiente: la página se abre así más deprisa y la lista aparece con el clic o la primera pulsación.

### Mapas

Este bloque crea los mapas de un vuelo a partir de la ruta, sin misión del Centro; en los niveles 1 a 3, también los genera.

1. Introduzca la ruta y el nivel en el bloque «Ruta» (al menos una salida y un destino conocidos en la base SIA).
2. Opcional: «Encuentro (opcional)», un punto o unas coordenadas «44.2, 0.6».
3. Marque los mapas deseados: «ruta (vista general, IFR)», «aproximación», «encuentro», «destino».
4. Haga clic en «Generar los mapas y el ZIP» (niveles 1 a 3): los mapas se crean y después se generan, el progreso (con «Detener») y el informe se muestran justo debajo y el ZIP se descarga. En el nivel Experto, «Preparar los mapas» solo los crea: ajustes en «Mapas que producir», generación en el pie de página.

La página fabrica una misión «Vuelo salida → destino» con los mapas marcados y el perfil vertical. El mapa de encuentro solo se crea si se introduce un encuentro.
En los niveles 1 a 3, la página no tiene pie de página ni bloque «Vistas previas y generación»: todo parte del botón de este bloque.
Después, cualquier cambio de la ruta, del nivel o del encuentro actualiza los mapas automáticamente.
Llegada desde el planificador de combustible (botón «Mapas de vuelo»): los mapas se crean solos en cuanto se carga la base SIA.
Mensajes de error posibles: «Base SIA ausente en este navegador», «Ruta: desconocido(s) en la base SIA», «Ningún mapa elegido».

### Mapas que producir

Bloque del nivel Experto. La lista «Mapas de la misión» da una línea por mapa:

| Elemento de la línea | Uso |
|---|---|
| Nombre del archivo | Clic: mostrar el mapa en el mapa de control (✎: encuadre personalizado). |
| Perfil | Perfil de visualización del mapa, o «Desactivado». |
| Trazado | «Sin trazado», «Brief: ruta», «Organización: ruta probable», «Ruta + ruta probable». |
| Destinatario | Solo para las misiones de ejercicio: brief, organización, chiffon o tripulación. |
| «ZIP» | Desmarcar para no generar el mapa. |
| «×» | Eliminar el mapa de la misión. |

Para añadir un mapa: introduzca un nombre («nouvelle_carte.png»), elija el tipo (general, objetivo, detalle, zona) y, después, «+ Mapa». Su extensión es la vista mostrada.
Sin misión ni mapas creados, la lista indica «Ningún mapa: añada uno abajo.»

### Vistas previas y generación

Bloque del nivel Experto; en los niveles 1 a 3, el informe de la generación (mapas generados, fallos y «Reintentar solo este») se muestra bajo el botón del bloque «Mapas».

1. «Mostrar todos los mapas»: dibuja una vista previa de cada mapa con su perfil. Las vistas previas no crean ningún archivo. Clic en una vista previa: ampliación.
2. Cada vista previa conserva su casilla «ZIP».
3. «Generar los mapas y el ZIP» (botón del pie de página): descarga un ZIP con cada mapa, el mapa de conjunto y `profil_vertical.png` si esa salida está marcada.

El «Mapa de conjunto» aparece por sí solo bajo las vistas previas; toma el perfil del mapa general.
Formatos: menú ☰ › Salidas de mapas (PNG, SVG editable, ancho PNG de 400 a 5000 px; 1600 px por defecto).
Si un mapa falla (fondo no disponible, tiempo agotado), el ZIP contiene `rapport_generation.txt` y la lista ofrece «Reintentar solo este».
Mantenga la pestaña visible durante la generación: el navegador ralentiza las pestañas en segundo plano y un mapa puede fallar («Tiempo agotado durante la carga del mapa de fondo»); «Reintentar solo este» lo vuelve a lanzar.
Los botones permanecen en gris mientras no haya ningún mapa que producir. Durante las vistas previas y la generación, la barra de progreso lleva un botón «Detener»: el mapa en curso se termina y los siguientes no se hacen. Una generación detenida no descarga ningún ZIP (estaría incompleto); las vistas previas ya mostradas se quedan. Vuelva a lanzar «Generar los mapas y el ZIP» para todos los mapas.

### Base de datos SIA

Este bloque está en el nivel Experto y oculto por defecto: haga clic en «Mostrar». Cuando falta la base en este navegador, se abre por sí solo, sea cual sea el nivel. Lee la carpeta SIA (AIXM) y la guarda en el navegador. Sin ella, la página no reconoce aeródromos, balizas ni espacios.

- Botón «Carpeta SIA: …»: elegir la carpeta `data/sia` (el navegador pide acceso) y, después, lectura.
- «Reconstruir la base aeronáutica»: hay que hacerlo tras cada actualización AIRAC; lee las zonas activas de Ajustes › Mantenimiento › Datos aeronáuticos. Un indicador sigue la lectura; «Cancelar» la interrumpe sin tocar la base guardada.
- «Vaciar la caché»: borra la base guardada (se reconstruirá en la siguiente relectura).
- La línea de estado indica la base guardada, su ciclo AIRAC y su fecha; se muestra «ciclo caducado» si hay un ciclo más reciente en vigor. «Archivos analizados» muestra los archivos leídos.
- Sin base, la página lo indica: «Base SIA ausente de este navegador: bloque “Base de datos SIA”, “Reconstruir la base aeronáutica”, o Ajustes › Mantenimiento.»

Es el mismo bloque que Ajustes › Mantenimiento › Datos aeronáuticos. La misma base sirve para el perfil vertical del planificador de combustible.

## Combustible
<!-- page: apps/planner/flight_performance_planner.html -->

El planificador de combustible (título «Combustible») calcula el combustible de un vuelo a partir del perfil de rendimiento de su aeronave. El consumo de crucero viene, por este orden, de su entrada para este vuelo, del perfil guardado, del modelo de Poll y Schumann (aviones de línea a reacción, según la masa, el nivel y el Mach), de SimBrief y después de una estimación por tipo o clase OACI; un valor aproximado se marca con ≈. Para un tipo sin ficha EUROCONTROL ni SimBrief (militares, helicópteros), la estimación toma la TAS de crucero y el techo publicados por Airframe DB cuando los conoce. También ayuda a elegir el nivel de vuelo y la forma de subir a él.
Para ir a él: barra lateral «Herramientas», pestaña «Combustible», botón «Combustible (planificador)» de una misión en Mis misiones, o botón «Combustible» de los Mapas de vuelo. En ese caso se recuperan la ruta, la distancia, el nivel y la aeronave.
Cabecera: botón «Avión», una lista desplegable con búsqueda (las fichas de rendimiento existentes: «Mis aeronaves» primero, luego por categoría; escriba un nombre, un tipo o un designador para filtrar, ↑ ↓ Intro, Esc), botón «Recuperar último FPL de SimBrief», «Unidades: kg / lbs». Combustible hace el plan de combustible y solo el plan: las fichas se crean y se modifican en «Fichas de rendimiento» (capítulo siguiente), las aeronaves se declaran en «Mis aeronaves» (Ajustes › Mi perfil › Aeronaves y simuladores).
Según el nivel de uso: en los niveles 1 a 3 (Tripulación, Planificación, Diseño), la página muestra el avión, el plan de vuelo (y «Recuperar último FPL de SimBrief»), el plegable «Parámetros del vuelo», «Calcular» y el Resultado, en dos columnas; el menú ☰ solo conserva exportar e importar las preferencias. Curvas, paneles, instrumentos y perfil vertical se añaden en el nivel Experto, donde la página está completa.
En pantalla ancha, en el nivel Experto, la página tiene tres columnas (entrada y curvas | Resultado y paneles | instrumentos): arrastre los tiradores entre columnas para ajustar su anchura; doble clic: anchuras por defecto.

### Elegir el avión

1. Haga clic en el botón de aeronave de la cabecera («Ninguna aeronave» al principio): la lista solo muestra las aeronaves que tienen una ficha de rendimiento, las de «Mis aeronaves» primero y después las demás por categoría (icono, nombre, tipo, origen de la ficha, estado).
2. Elija una aeronave con el ratón, o con las flechas y después Intro; Escape cierra la lista. «Gestionar las fichas de rendimiento ↗», al pie de la lista, abre la página de las fichas.
3. Abierto en una aeronave sin ficha (botón de una misión, dirección `?aircraft=`), el plan de combustible muestra «Ninguna ficha de rendimiento para … — abrir las Fichas de rendimiento ↗»: el enlace abre la página de las fichas en esa aeronave, donde crearla.

La ficha elegida sigue visible en solo lectura en el Resultado (grupo plegable «Regímenes de vuelo — perfil ↔ mapa»), con «Modificar esta ficha en las Fichas de rendimiento ↗». Una ficha guardada en las Fichas de rendimiento abiertas en otra pestaña se retoma de inmediato, y el plan de combustible se rehace.

### Plan de combustible

1. «Plan de vuelo (casilla 15)»: introduzca la ruta. Es el mismo plan que el de los Mapas de vuelo (gana el más reciente). De él se deducen la distancia, la ruta verdadera y el nivel.
2. Complete o corrija los campos del plegable «Parámetros del vuelo» (desplegado de entrada en el nivel Experto, plegado en los demás; los valores por defecto bastan para un cálculo rápido): «Distancia (NM)», «Nivel (FL)», «Ruta verdadera (°)», «Rodaje (min)», «Viento desde (°)», «Viento (kt)», «Reserva (min)», «Contingencia (%)».
3. Opcional, en el mismo plegable: «Masa de despegue prevista», comparada con la MTOW del tipo; «Desviación ISA (°C)», o «Temperatura en tierra (°C)» con «Elevación del aeródromo (ft)», o «Temperatura en el nivel (°C)». «Consumo de crucero (kg/h)»: rellenado desde el perfil; sin perfil, la página dice qué valor usará y de dónde viene (por ejemplo «≈ 4 000 kg/h, estimación tipo A400»); «Usar este valor» lo copia en el campo, «Guardar para este tipo» lo conserva para los próximos vuelos. «Ascenso elegido» (vista detallada): tres cursores, «IAS», variómetro y «Gases (%)» (RPM o N1 si el perfil tiene mapa motor), cada uno precedido de una casilla «fijo»; dos están fijos, el tercero se calcula y aparece en gris; «gases a fondo» aparece bajo el variómetro; la línea de abajo da consumo, TAS y gases a mitad del ascenso. Es el ascenso que cuenta el plan de combustible.
4. Haga clic en «Calcular».

Si deja el viento vacío, la página lo indica («Viento desconocido: horquilla ±25 kt…») y da el combustible como una horquilla.
Con una desviación ISA, un recuadro «Meteorología» del Resultado compara con la atmósfera estándar: trayecto al nivel del plan (tiempo, combustible), nivel óptimo y techo. El QNH no entra en el cálculo (los niveles de vuelo son altitudes de presión).
El perfil sigue calibrado en atmósfera estándar; el plan de combustible vuela en la atmósfera del día: un aire más cálido, menos denso, da una TAS mayor a igual IAS, pero menos empuje o potencia, un variómetro y un techo más bajos y un consumo mayor para un reactor.
El botón «Mapas de vuelo» (nivel Experto) abre los Mapas de vuelo con este plan de vuelo; los mapas y el perfil se crean allí al llegar.
«Sintaxis del plan de vuelo» recuerda las formas aceptadas. Sin base SIA en el navegador, solo se reconocen los puntos en coordenadas.

### Decisión del nivel de vuelo

Tras «Calcular», en la cabecera del plan (vista simple y detallada), un gráfico da para cada nivel el combustible (escala izquierda, curva llena) y el tiempo (escala derecha, curva fina) del trayecto completo: ascenso según el objetivo elegido en «Consignas de ascenso», crucero del perfil, descenso. Cada escala tiene el color y el título de su curva; la ficha da los dos valores en los mismos colores. El nivel del plan es una línea continua, el cursor una línea de puntos.
- Encima del gráfico, dos pastillas: «El más económico» y «El más rápido», con nivel, combustible y tiempo; un clic lleva el cursor allí. En la vista detallada, con el objetivo «Eco», una tercera da el crucero económico.
- Gris: nivel no mantenible — por encima del techo, trayecto demasiado corto (subir y bajar requiere más que la distancia) o empuje insuficiente; la razón y el campo que modificar aparecen en la ficha del cursor.
- Pase el ratón por el gráfico, haga clic en él o mueva el cursor de debajo: la ficha es una tabla, siempre la misma, de tres columnas — «Plan», el nivel del cursor y «Diferencia» (combustible y tiempo del trayecto, ascenso, TOD). Sus filas: combustible y tiempo del trayecto, TAS de crucero, ascenso (tiempo, combustible, distancia), IAS y régimen de ascenso, inicio del descenso (TOD), descenso (tiempo, combustible, distancia), IAS y régimen de descenso (IAS del perfil si figura en Descenso › IAS). Cursor en el nivel del plan: la columna del cursor aparece atenuada, sin diferencia. El bloque «Consignas de ascenso» sigue el nivel elegido (clic, cursor, pastilla o fila de la tabla), no el simple paso del ratón.
- «Usar este nivel» convierte el cursor en el nuevo nivel del plan («Nivel (FL)») y rehace el plan; la comparación se cierra sola.
- La tabla «Niveles», debajo, recoge los niveles redondos (cada 1000 ft; 2000 ft para un techo por encima de 20 000 ft), ordenable por nivel, combustible o tiempo; un clic en una fila elige ese nivel; un nivel no mantenible muestra «—» y su causa.

### Ascenso (vista detallada)

En la vista detallada (botón «Vista detallada» / «Vista simple» del Resultado; detallada por defecto en el nivel Experto), bajo las consignas de ascenso:
- «Ascenso — régimen, combustible y velocidades según la altitud»: tres paneles en el mismo eje y con el mismo cursor que la decisión del nivel — régimen (trazos: régimen máximo a Vy), combustible por 1000 ft, IAS a mantener (línea) y TAS (trazos), para el objetivo elegido en las consignas de ascenso. Con un mapa motor, «por altitud» / «por régimen» muestra también el régimen de ascenso según el ajuste a media subida.
- «Objetivos de ascenso»: un objetivo por fila («Eco», «Vy», «Rápida», «Perfil», «Ajustada») — tiempo, combustible, IAS y régimen, siempre hasta el nivel del plan; ★: mejor tiempo y mejor combustible; un clic en una fila elige el objetivo.
- «Regímenes de ascenso — mapa motor» (solo si existe): régimen y combustible por 1000 ft a media subida para cada régimen; ★: el más económico.

Los cursores «Ascenso elegido» del plan ajustan el objetivo «Ajustada».
Por encima del nivel en que el Mach del perfil ya no se mantiene, un reactor vuela a la mayor velocidad que permite el 92 % de su empuje («empuje máx.» en la ficha); el nivel solo se rechaza por encima del techo.
Sin «Altitud de referencia (ft)» ni «Techo máximo (ft)» en el perfil, el modelo los estima (IAS y TAS de crucero, ficha EUROCONTROL, flujo de ascenso o, si no, valor típico de la clase) y lo indica en el panel de la decisión del nivel. Rellene estos dos campos, o calibre con un OFP de SimBrief: es más fiable.

### Consignas de ascenso

Este bloque, bajo «Calcular», dice cómo ascender, en todos los niveles de uso.
- Cinco objetivos, cada uno con su tiempo y su combustible hasta el nivel: «Eco», «Vy», «Rápida», «Perfil» (velocidad de ascenso del perfil), «Ajustada» (ascenso elegido). La elección se guarda en este navegador.
  «Vy»: régimen de ascenso máximo (nivel alcanzado lo antes posible); «Rápida»: tiempo de bloque mínimo; «Eco»: combustible de trayecto mínimo. En estas dos últimas, la distancia de ascenso se descuenta del crucero, el régimen de ascenso se mantiene al menos en el 50 % del máximo y un reactor queda limitado a 250 kt por debajo del FL100.
- Una consigna en tres partes: «Ajustar» (gases, hélice, RPM o N1), «Mantener» (el instrumento que lleva la consigna, casi siempre la IAS), «Esperado» (variómetro que se debe ver, nivel alcanzado, tiempo y combustible).
- Una tabla por tramo de altitud (suelo, 2 000 ft, FL050, FL100… hasta el nivel del plan, o hasta el nivel estudiado en «Decisión del nivel de vuelo», indicado en el título): gases, RPM o N1 si el perfil tiene mapa motor, IAS a mantener, variómetro esperado, tiempo acumulado.

Las consignas guían el pilotaje; el plan de combustible cuenta el ascenso elegido. Proceden del modelo de rendimiento del perfil (atmósfera del plan, masa no modelada): a contrastar con el manual de vuelo.

### Resultado

Este bloque, en la columna de la derecha, acompaña a la página mientras se desplaza por las curvas.

- «Block fuel» (en horquilla si el viento es desconocido), «Tiempo de vuelo», «TOD».
- Línea de estado «Calculado para <aeronave> a las <hora>: <distancia> NM a FL…, tiempo de vuelo, TOD. Consumo de crucero: …», y después base del cálculo: nivel, ascenso utilizado y origen del consumo de crucero («perfil guardado», «introducido para este vuelo», «Poll-Schumann, 70 t a mitad del crucero, FL350, M0,78», «SimBrief», «estimación…»). Sin consumo conocido, «Combustible de bloque» muestra «—»: introduzca el consumo en el plan de combustible.
- Detalle: rodaje, ascenso, crucero, descenso, contingencia, reserva; masa de despegue prevista y MTOW si la ha introducido (en rojo si se supera).
- Grupo plegable «Regímenes de vuelo — perfil ↔ mapa» (nivel Experto): la ficha de la aeronave en solo lectura — IAS, régimen de ascenso, régimen del motor y flujo por fase, comparados con el mapa del motor, enlaces a las fichas de las aeronaves de ese tipo — y «Modificar esta ficha en las Fichas de rendimiento ↗».

«Fijar» conserva el bloque entero cuando acompaña a la página; si no, se pliega. «Vista simple» oculta las curvas y los instrumentos, «Vista detallada» los muestra (elección guardada en este navegador). En el nivel Experto, bajo el bloque, un panel por gráfico (decisión del nivel, ascenso) da lo esencial en tres líneas; «Saber más» despliega la ayuda de lectura y las hipótesis del modelo. La banda de instrumentos (nivel Experto) muestra IAS, altímetro, variómetro, cronómetro (tiempo de ascenso), combustible y tiempo de vuelo.
En los paneles y los mensajes, un nombre de campo subrayado designa un campo de la ficha (que se modifica en las Fichas de rendimiento). Un nivel «inalcanzable» da su causa y el campo que corregir (bloque «Límites»).
Un clic en el dial de combustible (o su botón) cambia la curva leída, en su color: ascenso elegido, perfil, crucero económico, ascenso rápido, Vy, ascenso económico; elección guardada en este navegador.

### Perfil vertical

Este bloque dibuja un corte a lo largo del plan de vuelo del plan de combustible: relieve, espacios aéreos, obstáculos, trayectoria (TOC, TOD). Bloque del nivel Experto.

1. Compruebe el plan de vuelo en «Plan de combustible».
2. Elija el «Perfil de visualización (estudio)»: son los mismos perfiles que en los Mapas de vuelo.
3. Ajuste «Suelo (ft)» y «Techo (ft, 0 = auto)».
4. Haga clic en «Trazar el perfil».

El ascenso sigue el modelo de rendimiento del avión activo; el descenso sigue su régimen de descenso. Un plan sin nivel (VFR) no tiene trayectoria.
Un OFP de SimBrief importado rellena la ruta y traza el perfil por sí solo.
Se necesita la base SIA de este navegador, leída en los Mapas de vuelo (bloque «Base de datos SIA») o en Ajustes › Mantenimiento. Sin ella, solo se reconocen los puntos en coordenadas, sin espacios aéreos.
El relieve procede de un modelo de terreno de unos 150 m: los límites ASFC siguen ese modelo, no el suelo real.

## Fichas de rendimiento
<!-- page: apps/planner/performance_sheets.html -->

Esta página (barra lateral «Herramientas», a partir del nivel Diseño) gestiona las fichas de rendimiento de sus aeronaves: de ella parten todas las acciones que crean o modifican una ficha. Combustible las usa para el plan; «Mis aeronaves» (Ajustes › Mi perfil › Aeronaves y simuladores) dice qué aeronaves posee. Las dos páginas leen la misma base de este navegador y la misma carpeta de rendimiento: una ficha guardada aquí la retoma de inmediato una página Combustible abierta en otra pestaña.

- Cabecera: el selector «Aeronave», dividido como el menú «Avión» de Combustible («Mis aeronaves» primero, luego por categoría; un tipo sin ficha figura con «sin ficha»), que elige la ficha que se modifica y la aeronave del panel ChatGPT.
- Barra inferior: «Añadir una aeronave» e «Importar…»; «Selección (n) ▾», el menú de las acciones sobre las filas marcadas («Fusionar», «Exportar», «Guardar en la carpeta», «Rellenar los campos que faltan», «Eliminar»); el estado de la ficha, «Guardar la ficha» y «Descartar los cambios», o, para una aeronave sin ficha, «Crear la ficha: desde SimBrief, Preguntar a ChatGPT, Estimar por la clase». Con menos de 800 px de ancho, «Importar…» pasa al menú ☰.
- «Fichas de rendimiento»: bajo la presentación, la línea de la carpeta («Mis aeronaves ↗», el estado de la carpeta de rendimiento, «Releer» y «Carpeta…»); después la búsqueda, el orden y «Preguntar a ChatGPT» encima de la tabla de sus aeronaves y fichas, por grupos; una aeronave sin ficha solo muestra en ella «ninguna». Un clic en una fila elige esa aeronave, con o sin ficha, como el selector de la cabecera (fila resaltada); varias filas marcadas: ninguna aeronave elegida.
- Bajo la tabla, cuatro tarjetas: «Ficha en edición» (regímenes de vuelo y campos de la ficha, desde el nivel Diseño), «Motor» (mapa motor, tabla RPM, interpolación), «SimBrief» (airframe, calibración OFP, trazabilidad, auditoría) y «Archivo» (último JSON importado, plegado), descritas más abajo.
- Una ficha guardada aquí la retoma de inmediato una página Combustible abierta en otra pestaña (la ficha que muestra y su plan).

### Barra inferior y menú ☰

La barra inferior indica «Ficha guardada — …», «Cambios sin guardar — …», «Ninguna ficha para …» (aeronave elegida sin ficha, con los botones de creación) o «Ninguna ficha abierta.». «Guardar la ficha» la escribe en la base local; «Descartar los cambios» (solo si los hay) vuelve a leer la base local y reabre la ficha tal como estaba guardada. Para eliminar la ficha: «Eliminar» (con su fila marcada). Las notificaciones aparecen encima de la barra.
Si elige otra aeronave (clic en su fila, selector de la cabecera) con cambios sin guardar, la página propone «Quedarse», «Descartar y cambiar» o «Guardar y cambiar».
Menú ☰: importar perfiles / CSV / JSON (incluido `.lnmperf` de Little Navmap; la misma ventana que «Importar…»), importar un airframe de SimBrief, elegir la carpeta de rendimiento, exportar el perfil `.lnmperf` o JSON, guardar la base local, restaurar la copia anterior, exportar o importar las preferencias. Estas acciones son del nivel Experto, salvo exportar e importar las preferencias.
«Guardar la base local» escribe `flight_performance_database.fpdb.json` en la carpeta de rendimiento (si no, descarga); «Restaurar la copia anterior» recupera el estado anterior al último guardado.
Una importación (archivo o texto pegado) que coincide con una ficha existente — mismo tipo, alias incluidos, o mismo nombre — no crea nada sin preguntar: «Ya existe una ficha «…» para …» propone «Completar la ficha existente» (por defecto: solo se rellenan sus campos vacíos, mapa motor incluido si no lo tiene, resumen de los campos antes de validar), «Fusionar» (la vista previa de la fusión, campo por campo, gana el más reciente, datos para marcar) o «Crear una segunda ficha» (nombre seguido de «(2)»). Con más de dos duplicados, «Misma elección para los duplicados siguientes», marcada de antemano, evita responder cada vez; dos entradas para la misma ficha se añaden una tras otra. Sin duplicado, la ficha se crea. Al final, se abre la última ficha y «Deshacer» (10 s) deja la base como estaba antes de la importación.

### Fichas de rendimiento (tabla)

Este bloque (a partir del nivel Diseño), el primero de la página, es la cara de rendimiento de «Mis aeronaves» (Ajustes › Mi perfil › Aeronaves y simuladores): mismas aeronaves, mismo orden, mismo nombre. Bajo la presentación de la tabla, «Mis aeronaves ↗» abre esa lista en Ajustes; la misma línea indica el estado de la carpeta de rendimiento («n perfil(es) leído(s) en la carpeta «…» a las …», o «Ninguna carpeta de rendimiento elegida.»).
- Una línea por aeronave, agrupadas por categoría (helicópteros, turbohélices, reactores, pistón) con una cabecera de grupo plegable; «Ordenar por»: categoría, nombre u origen. Después vienen los perfiles guardados fuera de «Mis aeronaves», marcados «no está en «Mis aeronaves»». Sin «Mis aeronaves» (trigrama no configurado, nada declarado), el bloque muestra los perfiles y los tipos de la flota.
- Columnas: «Aeronave» (silueta, nombre en negrita, designador y clase en pequeño, como en Ajustes), «Rendimiento» (origen del perfil: `.lnmperf`, SimBrief, ChatGPT, JSON, entrada, estimado por la clase; o «ninguna»), «Mapa» (mapa motor), «Consumo crucero» y su origen, «Techo», «Falta». Un clic en una fila marca solo esa aeronave y la elige (ficha abierta en el editor, fila resaltada; sin ficha: «Crear la ficha» en la barra inferior); Ctrl o Mayús + clic, o las casillas, marcan varias, y entonces no hay ninguna aeronave elegida.
- «Añadir una aeronave» abre la misma ventana de alta que Ajustes (véase «Añadir una aeronave y su rendimiento»); la aeronave añadida llega con «ninguna». Haga clic en su fila (o elíjala en el selector de la cabecera): la barra inferior propone «Crear la ficha: desde SimBrief» (si SimBrief conoce el tipo), «Preguntar a ChatGPT», «Estimar por la clase» (tipo con clase).
- Un designador declarado con varias variantes (CL2T: «Canadair CL-415», «Canadair CL-215T») tiene una sola fila, con el nombre del tipo: el rendimiento es el del tipo, las variantes no cambian nada aquí. Una aeronave con varios perfiles tiene una fila por perfil, cada una con el nombre del perfil.
- La casilla de la cabecera de la columna marca o desmarca todas las filas mostradas; la casilla de cada grupo (delante de «Helicópteros (n)»…) marca o desmarca todas sus fichas, grupo plegado incluido; toda la celda de una casilla la marca o desmarca (un clic al lado de la casilla no sustituye la selección); los bordes de los títulos se arrastran para ajustar el ancho de las columnas (doble clic: anchos por defecto).
- «Buscar una aeronave», antes de «Ordenar por», filtra igual (nombre, variante, designador, clase, origen): grupos con coincidencia desplegados, los demás plegados, «n aeronave(s)».
- «Importar…» (barra inferior) abre una ventana con dos vías: «Elegir uno o varios archivos…» (`.lnmperf`, JSON, CSV, varios a la vez), o pegar un texto — una ficha JSON, una respuesta de ChatGPT (con su texto y sus bloques de código), un `.lnmperf` o un CSV de rendimiento (separado por «;», «,» o tabulación) — y después «Importar el texto pegado». El texto pegado sigue el mismo camino que un archivo; una respuesta de ChatGPT se convierte en una ficha «… — ChatGPT». Un JSON con varias entradas (una lista, o una lista «sheets», «profiles»…) da tantas fichas: cada una se empareja con las fichas existentes por su identificador, luego su tipo (alias incluidos), luego su nombre; una entrada ilegible no detiene las demás. Al final, un solo resumen: «n ficha(s) completada(s), m fusionada(s), k creada(s)», con las entradas ilegibles. Un texto vacío o ilegible se señala en la ventana, que permanece abierta; Esc o «Cerrar» la cierra. Una ficha que ya existe se completa, se fusiona o se duplica (véase «Barra inferior y menú ☰»).
- «Carpeta…» (elegir la carpeta de rendimiento) y «Releer», en la línea de la carpeta. La carpeta se relee sola cuando cambia en otro lugar (Ajustes, otra pestaña).
- En la ficha del perfil activo, «Actualizar desde SimBrief» toma la ficha SimBrief del tipo (consumo de crucero, masas, techo, velocidad) y conserva sus entradas; frente a un perfil personal, propone «Completar los campos vacíos», «Fusionar» (la ficha cuenta como un perfil fechado en su obtención: el más reciente gana campo por campo, los vacíos se completan), «Sustituir» (valores de SimBrief en su lugar, el resto conservado) o «Perfil nuevo». Cuando cambian campos, una vista previa los muestra antes de validar.
- Las casillas delante de los nombres seleccionan perfiles para el menú «Selección (n) ▾» de la barra inferior (se abre hacia arriba; Esc o un clic en otro lugar lo cierra): «Fusionar (n)» (al menos dos perfiles del mismo tipo, o uno solo cuando SimBrief conoce el tipo: la casilla «Incluir la ficha SimBrief del tipo», marcada de antemano, la añade a las fuentes; nombre elegido, el del más completo por defecto; el más reciente gana campo por campo, los demás completan lo que falta, el mapa motor reúne sus filas; la ventana muestra primero los cambios — valor actual, valor retenido y su origen, campos sin cambios plegados, filas del mapa motor añadidas o sustituidas; una casilla por dato que cambia (desmarcada: se conserva el valor actual), «Tomar todo» / «No tomar nada», y el botón dice lo que se tomará, «Fusionar (7 campos, 1 fila del mapa motor)»; la nota de fusión solo lista lo tomado; la notificación dice qué se tomó de cada fuente, «Deshacer» 10 s), «Exportar (n)» (un archivo descargado por perfil: `.lnmperf` si el perfil está completo, si no JSON), «Guardar en la carpeta (n)» (un archivo JSON por perfil en la carpeta de rendimiento, con el nombre del perfil) y «Eliminar (n)» (una confirmación, un solo mensaje para el lote con «Deshacer» durante 10 s; un perfil de la carpeta de rendimiento también se retira de ella: base exportada reescrita sin él, archivo de un solo perfil renombrado .bak; «Deshacer» también restaura los archivos; si la carpeta no admite escritura, el perfil volverá en la próxima relectura). «Carpeta…» y «Releer» recuperan todo lo que contiene la carpeta; mientras un perfil eliminado siga en ella (CSV con varios perfiles, escritura denegada), una línea «n perfil(es) retirado(s) aún en la carpeta — Restaurar» lo indica.
- «Preguntar a ChatGPT» (encima de la tabla, y ficha del perfil activo) abre un panel para la aeronave elegida (selector de la cabecera o clic en su fila): «Copiar el prompt y abrir ChatGPT» (una sola pestaña de ChatGPT, donde pegar el prompt). El panel sigue la aeronave elegida. El prompt, en el idioma de la página, pide reunir todas las fuentes (manuales, fabricante, autoridades, Wikipedia, foros de simulación), en kt, ft, ft/min y kg/h, valores estimados marcados, mapa motor incluido; también da lo que la suite ya sabe (EUROCONTROL, SimBrief, Airframe DB, perfil actual) para que ChatGPT complete en lugar de repetir. «Ver el prompt» lo muestra. Pegar la respuesta (el JSON, o un CSV de rendimiento) bajo el botón y después «Importar como perfil nuevo» («<nombre> — ChatGPT») o «Fusionar con «…»» (la respuesta lleva la fecha del día: gana campo por campo, los vacíos se completan; primero la vista previa de los cambios, datos para marcar). Las claves desconocidas y los valores ilegibles o fuera de rango se descartan y se señalan; los valores estimados aparecen en «Datos que faltan» («estimado: …») y dejan de serlo en cuanto los cambia a mano (ficha o mapa motor). El tipo y el nombre vienen de la respuesta (la aeronave elegida solo es un recurso); si la respuesta describe otro tipo, una pregunta decide: importar como uno u otro, o, para una fusión, perfil nuevo o fusionar de todos modos. Se acepta un CSV con comas o con puntos y coma.
- «Rellenar los campos que faltan (n)» (menú «Selección», barra inferior) completa las fichas marcadas con una sola pregunta a ChatGPT: el panel ChatGPT se abre con esas fichas (nombre y número de campos vacíos), «Copiar el prompt y abrir ChatGPT» copia la pregunta — para cada ficha, lo que la suite ya sabe y sus campos vacíos, mapa motor incluido si la ficha no tiene. Pegue la respuesta de ChatGPT (una entrada por ficha) y luego «Rellenar los campos que faltan»: solo se rellenan los campos vacíos, no se sustituye nada ya introducido, los valores estimados quedan marcados; antes de validar aparece un resumen por ficha, y después «Deshacer» durante 10 s.

### Ficha en edición

Esta tarjeta (desde el nivel Diseño), bajo la tabla, muestra la ficha de la aeronave elegida.

#### Regímenes de vuelo — perfil ↔ mapa

IAS, variómetro, régimen del motor y flujo de cada fase (ascenso, crucero, descenso, rodaje, alternativa), comparados con el mapa del motor, y los enlaces a las fichas de las aeronaves de ese tipo.

#### Campos de la ficha

Todos los campos de la ficha, exportados tal cual en el archivo `.lnmperf` de Little Navmap.

- Grupos: «Identidad y formato», «Combustible y operación», «Pista y alternativa», «Ascenso», «Crucero», «Descenso», «Régimen y consumo».
- El combustible se muestra en la unidad elegida (kg o lbs).
- Cuando el tipo tiene una ficha EUROCONTROL APD, aparece una etiqueta «APD …» junto a los campos comparables: un clic toma ese valor. No se escribe nada sin clic. Si no: «Sin datos EUROCONTROL APD para este tipo».
- Color de la etiqueta: verde = idéntico (±3 %), naranja = diferente, azul = campo vacío; «rellenar los campos vacíos» toma todos los valores APD de los campos vacíos.

Una casilla vacía sigue vacía y bloquea la exportación `.lnmperf`: no se inventa ningún valor.
Después de modificar, haga clic en «Guardar la ficha» en la barra inferior.

### Motor

Tarjeta del nivel Experto: el mapa motor que editar, la tabla RPM y su curva, la interpolación del flujo.

#### Mapa motor — editar RPM / potencia → consumo

Introducir o corregir la tabla régimen → consumo, punto por punto.

1. «Añadir un punto» crea una línea.
2. Rellene «RPM / N1», «Mín.», «Nominal», «Máx.», «Altitud (ft)» (opcional: una línea por altitud publicada), «Fase de vuelo» y «Comentario».
3. Guarde la ficha («Guardar la ficha», barra inferior).

Consejo: un intervalo escrito en el comentario, por ejemplo «1 000–1 300 kg/h total», rellena mín., nominal y máx. al guardar.
Sin aeronave elegida, la tarjeta muestra «Elija o importe un perfil.»

#### Tabla RPM / potencia → consumo

Esta tabla muestra los puntos del mapa del motor del perfil activo: «RPM / N1», «Mín.», «Nominal», «Máx.», «Altitud (ft)» (opcional: una línea por altitud publicada), «Fase de vuelo», «Comentario».
Haga clic en un título de columna (↕) para ordenar. Arrastre el borde derecho de un título para ajustar el ancho de la columna (doble clic en el borde: anchos por defecto); el ajuste se guarda en el navegador. Un comentario largo se queda en una línea, con puntos suspensivos: el texto completo está en la información emergente y un doble clic en la celda lo despliega.
Es de solo lectura: para modificarla, utilice «Mapa motor — edición», encima.
Sin datos, muestra «No hay curva RPM en este perfil.»

#### Interpolación motor

Esta parte da el consumo para un régimen del motor.

1. Introduzca «RPM / N1». Los campos «Altitud (ft)» y «Fase» completan la ficha.
2. Haga clic en «Interpolar».
3. Lea el «Flujo total» y su horquilla mín.–máx. (interpolación en la tabla, por altitud cuando la columna «Altitud (ft)» está rellenada).

Encima de la tabla RPM, la curva traza los flujos mín., nominal y máx. según el régimen. Pase el ratón por ella para leer los valores a un régimen dado. El punto interpolado aparece marcado.
Sin tabla RPM en el perfil, la página muestra «Curva RPM ausente del perfil.» o «Sin cartografía cuantificada».

### SimBrief

Tarjeta del nivel Experto: el airframe de SimBrief, la calibración con un OFP real, su trazabilidad y la auditoría.

#### Airframe de SimBrief

Pegue el «Internal ID» de un airframe de SimBrief (o su dirección para compartir) y después «Importar airframe de SimBrief»: el airframe se lee (lista pública de SimBrief o, si no, su enlace para compartir) y se abre la ficha obtenida de él. Si SimBrief no publica el airframe, solo se conserva el Internal ID, utilizable como tipo en SimBrief Dispatch. El mensaje bajo el botón indica lo que se ha tomado; si el airframe no trae rendimiento, complételo con un `.lnmperf`.

#### Calibración SimBrief desde OFP

Ajustar la ficha a un plan de vuelo real de SimBrief.

1. Haga clic en «Recuperar último FPL de SimBrief», el primer botón de esta parte. El identificador se introduce en Ajustes › Mi perfil. En su defecto, descargue el OFP JSON en simbrief.com y utilice «Importar OFP JSON».
2. El OFP rellena el plan de combustible y el plan de vuelo; el perfil de la aeronave se crea y se calibra. El mensaje indica una calibración completa o parcial (fases medibles).
3. «Calibrar el perfil activo» aplica la calibración del último OFP al perfil elegido.
4. «Exportar auditoría JSON» descarga la auditoría.

«Trazabilidad de la calibración», debajo, recuerda la última calibración aplicada; si no, «Sin calibración OFP».

#### Auditoría OFP — valores brutos y calculados

Esta tabla compara, fase por fase, los valores leídos en el OFP y los valores recalculados: «Tiempo», «Distancia», «Combustible», «FF calculado», «TAS / GS», «Variómetro».
Se rellena tras importar un OFP («Recuperar último FPL de SimBrief» o «Importar OFP JSON»).
Sin OFP: «Sin datos de OFP.»
Útil para entender una calibración parcial o una diferencia con SimBrief.

### Archivo

La tarjeta «Archivo» (nivel Experto) guarda, plegado bajo «JSON importado / SimBrief», el contenido bruto del último archivo importado (OFP de SimBrief o JSON); un clic lo despliega.
- «Copiar JSON»: copia el contenido en el portapapeles; en gris cuando no hay nada que copiar.
- «Borrar»: vacía la visualización (la ficha no se toca).

Sin importación: «Ningún JSON cargado.»

## Aterrizajes
<!-- page: apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html -->

Este panel (título «Landing Performance — Resumen») analiza la calidad de sus aterrizajes a partir de los archivos exportados del simulador: puntuación, régimen de descenso, G, por aeronave y a lo largo del tiempo.
Para ir a él: barra lateral «Herramientas», pestaña «Aterrizajes». El archivo se lee en el navegador; no se envía nada.
El último archivo cargado se conserva y se vuelve a cargar al abrir la página. Sus aeronaves también se proponen en el menú «Avión» del planificador de combustible.

### Carga del archivo

1. Haga clic en «Elegir archivo» («Archivo de datos») o en ☰ › «Elegir archivos CSV / LOG». También puede soltar los archivos sobre la página.
2. Elija uno o varios archivos CSV o LOG (o suéltelos juntos): se reúnen en un único conjunto de datos llamado «primero.csv + n»; las columnas se asocian por su nombre, y un aterrizaje presente en dos archivos se cuenta una sola vez.
3. La página indica el formato reconocido: «Formato detallado detectado» (puntuación, FPM, G, velocidad respecto al suelo…) o «Formato histórico reducido detectado» (progresión estimada sin puntuación ni G final).

Antes de cualquier archivo, la página muestra «Elige o suelta un archivo CSV o LOG.»
La línea de estado recuerda el archivo, el número de mediciones utilizadas, la aeronave, los filtros activos y el periodo.

### Cabecera: aeronave, periodo, tendencia

- «Aeronave»: «Todos», o un tipo (con su icono).
- «Periodo»: «Todas las fechas», «Hoy», «Últimos 7 días», «Últimos 30 días», «Mes en curso», «Año en curso», «Periodo personalizado», con botones para retroceder, ampliar o avanzar. El periodo se memoriza para cada archivo.
- «Método de tendencia»: «Absoluto / Asíntota», «Primer 25 % ↔ Último 25 %» o «Media móvil» (con «Suavizado»: 5 o 10).
- «Imprimir / PDF»: imprime la página.

Opciones del análisis (menú ☰): «excluir mediciones claramente inverosímiles», «95P — excluir el 5 % de aterrizajes accidentales más extremos» (por aeronave), «Crash — excluir aterrizajes activados» (umbrales FPM ≤ y G ≥, lógica «FPM o G», «FPM y G», «solo FPM», «solo G»), «Usar campos ausentes estimados».
«Usar campos ausentes estimados» completa el score, la G o los FPM que faltan con un modelo calibrado sobre los pares reales CSV + LOG; esos valores, marcados «◇ estimado», nunca se escriben en el archivo.

### Resumen del periodo

Una banda fijada en la parte inferior de la ventana, tras el icono de tendencia, da las cifras clave: «Aterrizajes», «Score medio», «Score mín / máx», «FPM medio», «FPM mín / máx», «G medio», «G mín / máx», «Butter / Very Good».
Los botones «−» y «+» cambian el tamaño de estas tarjetas.
Debajo, el bloque de lectura reúne a la izquierda la conclusión de tendencia: progresión o regresión probable, ligera, «Sin progresión clara», o «datos insuficientes» (se necesitan al menos cuatro mediciones aprovechables), con el método elegido (por ejemplo, asíntota estimada y ganancia restante).
A la derecha, en pequeño, la leyenda: formato leído, rombo «◇ estimado», muestras de las valoraciones, estimación activada o desactivada. En una pantalla estrecha (menos de 800 px), la leyenda pasa debajo de la conclusión.

### Evolución

Este bloque traza los indicadores a lo largo del tiempo, con su tendencia: puntuación, régimen en la toma (FPM), fuerza G, velocidad de rotación del morro, y la nube «FPM × G — distribución de las tomas». En formato reducido: índice técnico relativo, landing rate bruto, float.

- Pase el ratón por un punto: fecha, aeronave, puntuación, valoración, recogida. La misma toma se ilumina en los cinco gráficos (punto ampliado y rodeado, los demás atenuados); la información emergente permanece dentro de la ventana, a la izquierda o por encima del puntero cerca de los bordes.
- Haga clic en un punto para fijar la información emergente: añade el registro completo de la toma (fecha, aeronave, aeródromo y pista si existen, FPM, G, morro, puntuación, fuente), mantiene la toma iluminada en todos los gráficos y resalta su fila en la tabla «Aterrizajes». Para cerrarla: la cruz, un segundo clic en el mismo punto, un clic fuera de los puntos o Esc. Un solo punto fijado a la vez; un clic simple no selecciona ningún periodo.
- Arrastre horizontalmente sobre un gráfico para seleccionar un periodo.
- La banda «Historial completo — arrastra para seleccionar», bajo cada gráfico, permite elegir un periodo en todo el historial.

El periodo elegido se muestra en la cabecera; sus botones permiten volver atrás.
El índice técnico relativo no es una puntuación oficial: 45 % landing rate bruto, 25 % calidad de la recogida, 20 % velocidad de morro, 10 % float, normalizados por aeronave.

### Resumen por aeronave

Esta tabla da una línea por aeronave: «Aeronave», «Tipo», «N» (número de aterrizajes), «P95 puntuación», «σ score», «Mín», «Máx», «P95 FPM», «σ FPM», «P95 G», «σ G», «Pendiente score», «ρ», «Conclusión».
Haga clic en un título de columna para ordenar (▲ / ↕).
La columna «Conclusión» recoge la tendencia de cada aeronave.
Elija una aeronave en la cabecera para analizar solo esa.

### Calidad de datos

Este bloque muestra lo que los filtros han conservado o descartado:

| Línea | Significado |
|---|---|
| «Mediciones totales» | Líneas leídas en el archivo. |
| «Consideradas plausibles» | Mediciones conservadas por el filtro de plausibilidad. |
| «Parciales / estimadas» | Mediciones completadas por estimación. |
| «Marcadas como inverosímiles» | Mediciones físicamente imposibles. |
| «Excluidos como crash» | Aterrizajes descartados por el filtro crash (si está activo). |

Las reglas aplicadas se recuerdan debajo (por ejemplo, velocidad respecto al suelo < 25 o > 250 kt, |FPM| > 5000, G < 0,10 o > 12).

### Aterrizajes

Esta tabla detalla cada aterrizaje conservado: «Fecha», «Aeronave», «Puntuación», «Valoración», «FPM», «G», «Velocidad suelo kt», «Float s», «Morro °/s», «Recogida», «Cabeceo», «Alabeo», valores «log estimado», «Fuente», «Campos estimados», «Calidad de datos».
Haga clic en un título de columna para ordenar. Por defecto, la tabla se ordena por fecha.
La tabla se desplaza dentro de su marco cuando la lista es larga.
Sigue la aeronave, el periodo y los filtros elegidos.
