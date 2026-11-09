<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Mantenimiento — manual

La aplicación Mantenimiento es para el administrador de la aerolínea: los datos que publica para los pilotos (módulo
Datos), la flota y sus fichas de rendimiento (módulo Aeronaves) y la administración de la suite (Ajustes, tarjeta
Administración). Se abre en el nivel Completo. Con el lanzador del puesto escribe; sin lanzador, o desde un dispositivo
emparejado, solo se lee.

## Primer arranque

- **Las entradas.** En un teléfono, la barra inferior lleva los módulos de Mantenimiento: Datos, y Aeronaves en el nivel
  que lo abre. Arriba a la derecha, como en Piloto, «?» abre esta ayuda y ⚙ los Ajustes, tarjeta Administración incluida.
  En una pantalla son las entradas de la columna izquierda, con Administración y las páginas de servicio del puesto
  (tokens de los pilotos, dispositivos, página de mantenimiento V2). El nombre de la aplicación, arriba a la izquierda,
  abre la lista de aplicaciones: un toque pasa a Piloto.
- **La ayuda.** Una sola puerta, el «?»: se abre en el capítulo de la pantalla mostrada, con el índice y «Toda la
  ayuda» (los manuales y los tutoriales) al principio; este manual solo trata de Mantenimiento, el de Piloto se
  queda en Piloto.
- **El estado de la aplicación.** El punto del ⚙ (verde: algo nuevo; naranja: algo requiere su atención) lleva al bloque
  «Estado» al principio de los Ajustes.

<!-- chapter: data -->
# Datos

Lo que la aerolínea publica para la aplicación —la base aeronáutica, los procedimientos, las aeronaves, la meteorología— y el estado de cada conjunto de datos. Esta pantalla sirve para leer y ofrece acciones sobre cada grupo: descargar las fuentes, construir, purgar y después publicar.

## Cómo usarla

<a id="data-cycle"></a>**El ciclo vigente.** Arriba, el ciclo AIRAC del momento (por ejemplo 2610), sus fechas y el número de días hasta el siguiente. Debajo, «Lanzador de este equipo» o «Sin lanzador: solo lectura» indica si este ordenador tiene un lanzador.

<a id="data-coverage"></a>**La cobertura.** La lista de zonas (países, regiones) que sigue este equipo. En la primera apertura son todas las zonas que publica la aerolínea; la lista se guarda en este dispositivo. «Añadir un país» pone en la cobertura una zona que la suite conoce, aunque nadie la publique todavía: queda marcada para «Construir».

<a id="data-packs"></a>**Los paquetes de países.** Junto al mapa, con la lista de zonas (debajo en un teléfono), cuando AeroDB da paquetes: una fila por paquete regional (Europa occidental, Asia…) con su número de países y su tamaño. La fila es un **interruptor «todo el paquete en la cobertura»**: encendido, todas sus zonas están en la cobertura (marcadas); a medias, una parte lo está; encenderlo añade las que faltan; **apagarlo quita todas sus zonas de la cobertura**, tras una pregunta que las nombra: se desmarcan y salen de la lista de este puesto, **no se purga nada** (sus archivos se quedan). Pasar el ratón por una fila, o pulsarla en un teléfono, **resalta sus zonas en el mapa**. Un paquete vacío dice por qué («hoy ni zona ni fuente»). Los **temas** (islas, desiertos…) son filtros: un tema muestra sus zonas (las de la cobertura y las que se añaden una a una con «Añadir») y no añade ninguna por sí mismo.

<a id="data-states"></a>**Los Estados.** Bajo la cobertura, los Estados se ordenan por color: verde, ya hay procedimientos publicados; naranja, se pueden leer bajo demanda; rojo, nada es legible. El motivo está escrito en cada línea, el color nunca va solo. Pasadas siete líneas, «n más» despliega el resto.

<a id="data-group-base"></a>**Base aeronáutica.** Una línea por fuente que alimenta una zona de la cobertura: su ciclo, su antigüedad («publicado hace 3 días»), el número de zonas publicadas y una etiqueta de estado. Toque una línea para ver el enlace de la fuente con su dirección, su licencia, las zonas que alimenta y lo que ha publicado cada zona.

<a id="data-group-proc"></a>**Procedimientos.** Los procedimientos de Francia (eAIP del SIA) y de Estados Unidos (CIFP de la FAA), con el número de aeródromos publicados. Cada línea de Estado dice también los aeródromos cuyos procedimientos ya están aquí (« Francia — 3.069 aeródromos, ciclo 2611 »; « n aeródromos leídos » para los demás Estados).

<a id="data-group-aircraft"></a>**Aeronaves.** Los tipos de aeronave y sus prestaciones: la fecha de la edición, el número de tipos y de archivos. Pasados 28 días, la etiqueta se vuelve naranja.

<a id="data-group-weather"></a>**Meteorología.** La meteorología mundial y las rutas NAT se publican con el sitio: estas líneas no tienen ciclo ni etiqueta.

<a id="data-world"></a>**Sinóptico mundial (GFS).** En el grupo Meteorología, una fila para la previsión sinóptica mundial del mapa de Atmósfera: su estado («Ausente del puesto» mientras no haya ninguna publicada, «Más de 12 h» al envejecer), la pasada GFS, el número de pasos, su tamaño y su edad. «Construir» la hace en el puesto (unos 2 minutos la primera vez; unos segundos si la pasada ya está, entonces se reutiliza). Se publica **localmente**, en data/local/weather/world/: nunca sincronizada ni confirmada. Un fallo dice su motivo (ninguna pasada publicada o NOAA inaccesible, carpeta no válida, tiempo agotado) y la publicación anterior se queda.

<a id="data-zone-link"></a>**Enlaces a una zona.** `#data?zone=<id>` abre la base, marca solo esa zona y lleva a «Actualizar»; una zona fuera de la cobertura se dice, con «Añadir un país». También cuentan los motivos de una zona por reconstruir: archivo del ciclo ausente, construida antes de que el archivo de una fuente estuviera, archivo presente pero casilla «personal» sin marcar (reconstruir con la casilla), archivo por dejar. Un **aviso** («zona sin puntos ni aerovías: la fuente no los incluye») no hace caducar la zona.

<a id="data-states-pill"></a>**Las etiquetas.** «Al día»: nada que hacer. «Ciclo superado»: el ciclo publicado es anterior al ciclo vigente (naranja, rojo pasada una semana). «Analizador antiguo»: publicado por una versión anterior de los constructores. «Más de 28 días»: un conjunto sin ciclo, publicado hace más de 28 días. «Ausente del repositorio»: no hay nada publicado. Un grupo se abre solo cuando una de sus líneas requiere atención.

<a id="data-more"></a>**Los demás conjuntos.** Como máximo siete líneas por grupo; «n conjuntos más» despliega el resto y las fuentes solo consideradas o descartadas (su enlace, su licencia, su estado).

<a id="data-build"></a>**Construir la base.** Al principio del grupo Base aeronáutica, el panel «Descargar, construir, purgar» actúa sobre las zonas marcadas con tres botones, en este orden: Descargar · Construir · Purgar. «Construir» rehace la base de las zonas marcadas en el lanzador de este equipo: un navegador sin ventana (Edge o, si no, Chrome) construye las zonas una tras otra y cada una se guarda en el repositorio de datos en cuanto está lista. Al empezar están marcadas todas las zonas de la cobertura; desmarque las que no quiera rehacer. Los tres botones se ponen en gris a la vez, con su motivo escrito una sola vez debajo: «Hace falta el lanzador del equipo», «Hay otra operación en curso», «Marque al menos una zona», «Sin conexión».

<a id="data-build-personal"></a>**Fuentes con licencia personal.** ENAIRE (España), NATS (Reino Unido) y los datos de X-Plane solo se ofrecen si una zona marcada los usa, y nunca vienen marcados: márquelos solo si el repositorio de datos lo usa únicamente usted. Con X-Plane marcado, la construcción se hace en la página, lo que todavía no es posible aquí: terminará con ese motivo. **Una fuente marcada se recuerda en este puesto**: se encuentra marcada en cada apertura de Datos y sale con cada «Descargar» y «Construir» sin tener que marcarla de nuevo, con la mención «Personal · recordado» debajo. Solo su propia casilla la deshace; desmarcar una zona no la olvida (simplemente no se ofrece ni se envía mientras la zona esté desmarcada).

<a id="data-build-run"></a>**Durante la construcción.** Una barra, «n de m zonas», la etapa y el tiempo transcurrido; una línea por zona dice en espera, construcción (n / m fuentes), construida, fallo con su motivo o cancelada. «Detener» pide la parada: la zona en curso termina y las zonas ya construidas se conservan. Puede salir de la pantalla: la construcción sigue en el lanzador y se encuentra al volver. Si el lanzador se detuvo por el camino, la pantalla dice «Construcción interrumpida» con el último estado de cada zona: vuelva a empezar, desmarcando las zonas ya hechas si quiere.

<a id="data-build-end"></a>**Al final.** Una notificación da las cuentas («Base construida: 3 zonas; 1 con fallo (gb)») y el resumen queda en el panel con lo que hay que hacer: una zona con fallo (el motivo está escrito en su línea: navegador sin ventana, tiempo agotado, salida no válida, no se pudo escribir…), una construcción detenida, ningún navegador encontrado («No se encontró Edge ni Chrome en este equipo: instale uno de los dos.»). Después se vuelve a leer el estado de las líneas. Cuando una fuente de la base es de un ciclo pasado (el SIA en 2610 mientras rige el 2611), una línea naranja la nombra una vez, con su página y el archivo que hay que coger: «Construir» rehará el ciclo antiguo. Una zona sin fuente fechada (openAIP, GeoNames, relieve) nunca se dice caducada. Cuando falta el ciclo vigente de una fuente que se coge a mano, una línea naranja bajo los botones lo dice («SIA Francia 2611 falta: descargue export_xml_bd_SIA_<fecha>-v<nn>.zip en el sitio del SIA»); «Tomar el archivo descargado» pasa entonces a ser el botón principal y «Construir» lo pierde. Esa línea viene de la última descarga o construcción (el diario la conserva): no se lanza nada para leerla, y «Ciclo X superado» nombra la fuente responsable.

<a id="data-update"></a>**Actualizar.** El botón principal del panel de la base: descarga las fuentes de las zonas marcadas (como «Descargar») y luego lee en el lanzador el **estado de cada zona** y reconstruye solo las que no están al día y que la construcción puede tratar. Una sola pregunta nombra esas zonas, la razón de cada una (una sola frase cuando son muchas: «45 zonas: construidas con un analizador antiguo») y su tamaño, y dice que puede tardar; si nada hay que reconstruir, una frase lo dice. Las zonas que esperan un archivo de Descargas se nombran: primero «Tomar el archivo descargado». Si no se puede leer el estado, no se reconstruye nada. «Actualizar» es el único botón a la vista; **«Más»** (plegado) guarda «Descargar», «Tomar el archivo descargado» (que sigue a la vista, como principal, cuando falta un ciclo manual), «Recalcular todo» (la construcción de antes, sobre toda la selección sea cual sea su estado: tras una purga, o en caso de duda) y «Purgar». Por encima de 60 zonas marcadas los verbos trabajan por tandas de 60, una tras otra; «Purgar» planifica primero cada tanda y luego hace **una sola pregunta** que da la suma. Cada zona de la lista y del mapa dice su estado según el lanzador: **verde** (al día), **naranja** (por reconstruir: toque la insignia para leer por qué — fuente más reciente, archivos fuente cambiados, analizador antiguo, archivos que faltan, un archivo por tomar…), **gris** (nunca construida), **roja** (la última construcción falló), **azul** (la página la construye). El estado se vuelve a leer tras cada operación: un país naranja pasa a verde sin recargar la página.

<a id="data-select"></a>**Elegir un conjunto de zonas.** Sobre la lista, «Solo las caducadas» lee el estado en el lanzador y deja marcadas solo las zonas por reconstruir (si ninguna lo está, la selección se queda como está), «Deseleccionar todo» desmarca todo, y la línea «Selección» dice el número de zonas marcadas y su tamaño antes de cualquier verbo. En el mapa, **Mayús + arrastrar** (ordenador) o **dos dedos apoyados medio segundo** (teléfono; el rectángulo va de un dedo al otro) traza un rectángulo que marca las zonas de la cobertura que toca, con el número dicho antes de soltar («14 países»); un rectángulo se añade a la selección, no la sustituye. Tocar un país sigue igual. La selección solo existe en pantalla: no se escribe nada antes de un verbo.

<a id="data-download"></a>**Descargar.** El botón «Descargar» trae, en el lanzador de este equipo, las fuentes en bruto de las zonas marcadas (openAIP, FAA, UK Mil AIP, NAV CANADA, tracks NAT del día; ENAIRE solo si está marcada entre las fuentes con licencia personal). Una línea por zona dice cómo va («descarga (2 / 3 fuentes)») y, debajo, una línea por fuente: descargada (n archivos), sin cambios, fallo con su motivo y su código HTTP («HTTP 404»), omitida (licencia no declarada) o manual. Lo que no ha cambiado no se reescribe nunca. Al final una notificación da las cuentas («Descargado: 2 zonas cambiadas, 1 sin cambios; 1 fallo»); las fuentes que el lanzador no descarga (el SIA, por ejemplo) se listan con su nombre, con enlace solo si su dirección es https, «para depositar a mano»; si se modificaron archivos de fuentes seguidos por git, la pantalla lo dice («n archivos de fuentes modificados, fuera de los datos sincronizados»). «Nada que descargar para estas zonas»: ninguna de las zonas marcadas tiene una fuente descargable. Dos descargas no pueden sucederse en menos de 30 s: la pantalla dice «Vuelva a intentarlo en n s».

<a id="data-zone-map"></a>**El mapa de las zonas por marcar.** Sobre la lista de zonas (panel de la base) y de Estados (panel de los procedimientos: Francia y Estados Unidos), un mapa de verdad (la base de mapa compartida de la aplicación, como la usan el Mapa y la Meteo) dibuja las zonas rellenas con el tono de su estado: se desplaza y se amplía con el dedo, y el botón « Recentrar » devuelve la vista al conjunto de las zonas. Tocar una zona la marca o la desmarca, exactamente como su casilla en la lista (una sola selección: el mapa y la lista se redibujan ambos a partir de ella); arrastrar o pellizcar el mapa no marca nada. Un país que la suite conoce pero que no está en su cobertura se dibuja en gris («fuera de la cobertura»): tocarlo lo añade a la cobertura y lo marca, como «Añadir un país»; tocarlo otra vez lo desmarca. Un país de la cobertura solo se marca o se desmarca: un toque nunca lo quita. Con el teclado, la lista es el camino: sus casillas se marcan con Espacio. El color sigue al estado (al día, ciclo superado o ausente, en curso, fuera de la cobertura: la leyenda bajo el mapa los nombra con palabras) pero nunca va solo: una zona marcada tiene un trazo grueso y un tono más lleno. Durante una operación, el mapa, como la lista, queda congelado. Un contorno que es solo el marco de la zona va punteado; la leyenda lo recuerda. Cuando el mapa no puede venir (sin conexión y sin fondo de mapa en memoria, sin WebGL, o el marco no da los contornos), la lista queda sola, sin mensaje de error. Cuando el mapa está lo bastante ampliado (el mapa de los Estados), los aeródromos cuyos procedimientos ya están aquí aparecen como puntos: verdes si están al día, naranja si son de un ciclo pasado; un toque en un punto dice su código y su ciclo, sin marcar el Estado. Más lejos, solo queda el recuento de la línea del Estado. Es una lectura de la base de este dispositivo: no se descarga ni se escribe nada.

<a id="data-route"></a>**Ruta (RAD, puntos FRA).** En el grupo Procedimientos, una fila más: los libros de EUROCONTROL del cálculo de ruta. Dice los ciclos presentes en este puesto («RAD del … · puntos FRA del … · importado hace n días») y toma la insignia de los demás conjuntos: «Ausente del repositorio» sin importación, «Ciclo superado» cuando el último RAD es anterior al ciclo en vigor, «Al día» en los demás casos. «Importar de Descargas» busca primero, sin escribir nada, los libros `RAD_<cycle>_v….xlsx` y `eurocontrol-airac-<cycle>-fra-points-….xlsx` de su carpeta de Descargas, y luego plantea una pregunta que los nombra (tipo, ciclo, tamaño) y recuerda la licencia: documentos de EUROCONTROL Network Manager, uso de la compañía, publicados solo en su repositorio privado. Tras «Importar», solo se compilan en `data/route/` los libros mostrados (un ciclo sustituye al mismo ciclo, los demás se conservan) y se hace un commit; la fila dice entonces los ciclos presentes. Sin libros en Descargas lo dice y no pregunta nada.

<a id="data-pickup"></a>**Tomar el archivo descargado.** Algunas fuentes no se descargan solas (el SIA para Francia, NATS para el Reino Unido): usted las descarga en su navegador y luego «Tomar el archivo descargado» (el segundo botón del panel de la base, y bajo la línea «para depositar a mano» de una descarga) busca en la carpeta Descargas del equipo el zip más reciente con el nombre esperado (por ejemplo EG_*_DS_*_XML.zip). Primero el plan y una sola pregunta: para cada zona el zip encontrado (nombre, número de archivos, tamaño), lo que falta (con el nombre esperado), adónde van los archivos (data/sia/, data/sia/zones/gb/); son fuentes en bruto del equipo, nunca con commit. Si no se encuentra nada: ninguna pregunta, la pantalla dice lo que falta. Al final: «Tomado: n archivos (x MB)», los fallos nombrados (zip demasiado grande, nada útil en el zip…) y «Ahora lance Construir». «Actualizar todo» nunca lanza esta toma: sigue siendo un gesto. El botón queda en gris con su motivo si el lanzador de este equipo aún no conoce la operación. La toma solo trae el zip que mostró el plan (nombre y tamaño): si llegó otro zip durante la pregunta, esa fuente se rechaza («el archivo cambió desde el plan») y no se toma nada de ella; «Repetir el plan» lo muestra de nuevo. Un zip cuyo nombre sale de la regla (letras, cifras, punto, guion, guion bajo, espacio, paréntesis) lo muestra el plan pero nunca se toma: su línea dice «nombre de archivo por renombrar: letras, cifras, . _ -»; si no queda nada más que tomar, no se hace ninguna pregunta. Las exportaciones de openAIP (archivos GeoJSON o JSON depositados en Descargas) no son un zip: el plan muestra los archivos uno a uno («n archivos (x KB), de ellos n convertidos de JSON a GeoJSON») y la toma devuelve exactamente lo que mostró el plan. Una exportación que la suite no lee se dice, nunca se toma: un XML («no se lee (formato XML): expórtelo en GeoJSON o JSON en openaip.net») o la capa «hot» («no se usa»). Si solo hay eso, no se hace ninguna pregunta.

<a id="data-purge"></a>**Purgar.** El botón «Purgar» retira del equipo las fuentes en bruto de las zonas marcadas (las que se vuelven a descargar) y sus cachés. Primero calcula el plan sin borrar nada y luego hace una sola pregunta: «¿Purgar 15 archivos (14,3 MB) de las fuentes de España, Francia?». Si los archivos del SIA (Francia) forman parte, la pregunta recuerda que sirven también para los contornos de las demás zonas en la construcción; los archivos seguidos por git se conservan siempre y se cuentan. No: no se retira nada. Sí: la purga se hace y la pantalla dice «Purgado: n archivos, x MB», con las rutas rechazadas (dejadas en su sitio). Nada que retirar: «Nada que purgar», sin pregunta.

<a id="data-publish"></a>**Publicar la base.** Bajo «Construir», el panel «Publicar la base» envía al repositorio de datos lo que se construyó en este equipo. Una zona construida se confirma entera en el equipo y sale también en la siguiente sincronización: «Publicar» la envía enseguida. Primero dice cómo está el equipo: «3 archivos modificados · 2 commits por enviar», la fecha del último paso y, si la hay, la fusión que espera en data/ (la publicación la concluye primero). Toque «Publicar»: una sola pregunta recuerda los archivos y los commits, luego se hace el paso; una barra sin fin indica que trabaja. Mientras tanto los botones del panel «Descargar, construir, purgar» están en gris, y «Publicar» lo está durante cualquier operación de ese panel: una operación a la vez.

<a id="data-publish-end"></a>**Al final de la publicación.** Una notificación da las cifras y el resultado queda en el panel: lo que se envió (archivos con commit, archivos recibidos); los archivos de la base conservados en el equipo porque había una construcción en curso; los conflictos (se conserva el más reciente, véase Ajustes › Conflictos); los archivos rechazados porque no tienen el formato de un archivo de datos. Un fallo se dice en una frase, con lo que responde el lanzador: no se pierde nada, los archivos siguen en el equipo. El botón está en gris con su motivo escrito debajo: «Hace falta el lanzador del equipo», «Hay una construcción en curso: publique cuando termine», «Nada que publicar», «El marco aún no sabe publicar la base: actualice la aplicación», «Sin conexión».

<a id="data-set-panels"></a>**Los mismos botones para cada grupo.** Cada grupo tiene su panel «Descargar · Construir · Purgar»: la Base aeronáutica, los Procedimientos, los puntos VFR de las cartas VAC (en el grupo Base aeronáutica, bajo «Publicar») y las Aeronaves. El principio es el mismo en todas partes: una sola operación a la vez, en todos los paneles (se vuelve a encontrar al reabrir la pantalla); una línea por elemento durante la marcha, una frase final y una notificación, una línea en el diario; «Purgar» calcula primero un plan sin borrar nada y luego hace una sola pregunta. Procedimientos: marque los Estados que se leen en bloque, Francia (eAIP del SIA) y Estados Unidos (CIFP de la FAA); ninguno viene marcado. Los Estados leídos por EAD Basic nunca se leen en bloque: un aeródromo a la vez, con «Volver a leer» en Combustible o en el Mapa. Puntos VFR: el ciclo vigente, sin casilla; «Descargar» obtiene las cartas VAC del ciclo («n cartas aún no publicadas» no es un fallo); «Construir» necesita primero la base de Francia de este ciclo, las cartas descargadas y pypdf (el asistente de primera instalación lo instala), y dice si no se hizo commit por falta de trigrama; «Purgar» vacía la caché de cartas de todos los ciclos. Aeronaves: tipos OACI separados por comas o espacios (2 a 4 letras o dígitos); un código rechazado se dice y no se envía nada, un campo vacío significa los tipos de la flota; las líneas de la marcha son los tres pasos (tipos, rendimiento, perfiles SimBrief). La meteorología no tiene panel: se publica con el sitio. Un botón en gris con «El lanzador de este equipo aún no conoce esta operación»: el lanzador de este equipo es más antiguo que la aplicación, actualícelo. «Descargar» y «Purgar» no hacen commit de nada. «Construir» hace commit de sus resultados en el equipo, salvo para las aeronaves: la carpeta AircraftDB/ de este equipo no está versionada, el envío se hace con «Fichas publicadas». Mientras una fusión espera en data/, ninguna construcción ni publicación de fichas escribe nada: la pantalla dice «Una fusión espera en data/: sincronice primero (Ajustes › Sincronización)». Durante una actualización de la suite no arranca ninguna operación (base, otros conjuntos, cadena, toma del archivo, fichas): la pantalla dice «Actualización de la suite en curso: vuelva a intentarlo tras el reinicio del lanzador»; el estado y el seguimiento de un trabajo ya lanzado continúan.

<a id="data-aircraft-sheets"></a>**Las fichas publicadas de la compañía.** Bajo las Aeronaves, «Publicar» copia las fichas de la compañía al repositorio de datos. Calcula primero un plan sin cambiar nada y luego hace una sola pregunta (fichas por copiar, fichas por retirar, tamaño total); si acepta, la copia, el commit y el envío se hacen en un solo gesto. Hace falta su trigrama (Ajustes › Identidad); sin él, la pantalla lo dice y no se envía nada. Si no hay nada que copiar ni retirar: «Nada que publicar».

<a id="data-update-all"></a>**Actualizar todo.** Bajo la cobertura, el botón «Actualizar todo (n conjuntos)» rehace de un gesto lo que han elegido los paneles: para cada conjunto, en el orden publicado (la base aeronáutica, los procedimientos, los puntos VFR, las aeronaves), «Descargar» y luego «Construir»; nunca una purga, nunca las fichas publicadas. Primero un plan y una sola pregunta: el ciclo AIRAC, los conjuntos con lo que toca cada uno (zonas, Estados, ciclo, tipos o los tipos de la flota), el tamaño de las descargas (no se conoce de antemano); un conjunto sin nada marcado, con tipos rechazados o cuyos verbos el lanzador no conoce se omite, con su motivo. Después una línea de cadena dice el conjunto y el paso en curso («2 / 4 conjuntos») con un solo «Detener» para toda la cadena; los demás botones quedan en gris. La cadena se detiene en el primer fallo (aunque sea parcial), en la parada pedida o si una fusión espera en data/: lo ya construido sigue con commit en el equipo, no se publica nada, y la pantalla dice qué conjunto y por qué. Una descarga sin novedades («nada que descargar», cartas aún no publicadas) no la detiene. Si todo salió bien, sale una sola publicación, sin más pregunta que el plan; si es imposible (el marco no sabe publicar, nada que enviar), la cadena lo dice. El diario guarda una línea para toda la cadena, con el resultado de cada conjunto; una sola notificación al final. Si la página se recarga por el camino, se vuelve a encontrar el trabajo en curso del lanzador, pero la cadena no continúa: «Cadena interrumpida por la recarga: vuelva a lanzar «Actualizar todo»». Un punto de atención marca «Construir» de la base y «Actualizar todo» cuando el ciclo publicado es más antiguo que el vigente («Ciclo 2610 superado, reconstruir para 2611»).

<a id="data-inventory"></a>**El inventario de datos.** Bajo los grupos, un bloque plegado «Inventario de datos» dice lo que abarca «data» en este puesto: siete líneas (el repositorio de datos, la carpeta local del puesto, las fuentes brutas del SIA, la copia de este dispositivo, las carpetas de trabajo de la suite, Descargas, las copias dejadas), cada una con su tamaño, «seguido», «local» o «fuera del repositorio», y quién la escribe. Solo se lee cuando lo abre. No lee ningún archivo, no mueve nada, no escribe nada; sin lanzador, o con uno antiguo, dice «inventario ilegible». Con un lanzador que sepa hacerlo, también ofrece «Guardar las fuentes brutas»: los archivos XML brutos del SIA de data/sia/ pasan a data/local/sources/sia/<cycle>/. Primero viene el plan (los archivos y su tamaño, nunca una ruta) y no se mueve nada antes de su confirmación; cada archivo se copia, se verifica y se retira el antiguo (se conserva si git lo sigue, nunca se borra para todos los puestos). El resultado dice los archivos movidos, ya en su sitio, conservados y rechazados con su motivo; «Devolverlas a su sitio» deshace el guardado por el mismo camino. No sale nada mientras otra operación está en curso o hay una fusión pendiente, ni desde un dispositivo emparejado.

<a id="data-journal"></a>**El diario.** Al pie de la pantalla, las últimas 50 operaciones de este dispositivo: hora UTC, verbo, zonas, resultado.

## Casos particulares

- **Sin lanzador**: la pantalla se lee igual; muestra lo que está publicado.
- **Una lectura que falla**: la sección lo dice en una línea y el resto de la pantalla se dibuja.

<!-- fr: 69b06f8905d8 -->

<!-- chapter: aircraft -->
# Aeronaves

La flota de la compañía, tal como la leen las demás pantallas: el informe (matrícula → tipo, indicativos), el mapa, el CPCO. Las fichas de rendimiento están en la misma pantalla (pestaña «Fichas»); el registro de tipos llegará.

## Cómo usarlo

<a id="aircraft-fleet"></a>**La flota.** Una fila por aeronave: matrícula, tipo, indicativos, base, «fuera de servicio» cuando lo está. La búsqueda filtra por matrícula, tipo, un indicativo o la base; se muestran siete filas, «N más» despliega el resto. «Añadir» abre una aeronave vacía. La flota es la de la compañía elegida en Ajustes › Compañía; cambiar de compañía cambia la lista, y una aeronave añadida va a la flota de esa compañía.

<a id="aircraft-edit"></a>**Modificar una aeronave.** Un toque en una fila la abre: identidad (matrícula, tipo, variante, operador) y operación (indicativos separados por comas, base, número táctico, en servicio). Bajo los campos, una línea dice lo que va a cambiar («2 campos cambiados: base, indicativos»); «Guardar» lo escribe. Desde dos caracteres (mayúsculas o no), el campo Tipo propone los tipos de la base y las fichas que coinciden («H145 · Airbus H145 · ficha H145»); un toque, o ↓ y luego Intro, escribe el código del tipo. Un tipo que la base no conoce se guarda tal cual, y la pantalla lo dice. La matrícula es la clave: dos aeronaves no pueden compartirla. La ubicación que da el sitio queda como está. «Retirar» pregunta, y luego la aeronave sale de la flota; su ficha de rendimiento, si la tiene, se conserva.

<a id="aircraft-sheets"></a>**Las fichas.** La pestaña «Fichas» lista las fichas de rendimiento por familia (helicópteros, turbohélices, reactores, pistón, otros); la búsqueda filtra por nombre, tipo o matrícula. Cada fila dice de dónde viene la ficha, qué le falta y su fecha; un tipo de la flota sin ficha se propone «por completar». «Importar un archivo» lee un CSV, un JSON, un .lnmperf o un OFP de SimBrief; «Pegar un texto» lee un texto pegado, incluida una respuesta de ChatGPT; «Nueva ficha» pide el código del tipo. No se escribe nada de inmediato: una importación muestra primero, campo por campo, lo que cambiaría; desmarque lo que conserva y luego «Aplicar la selección». Varias fichas a la vez: cada vista previa nombra su ficha y su rango («3 / 13»), una ficha que no cambia se pasa sola, «Omitir esta ficha» va a la siguiente sin escribir nada, y al final se da el balance; una nota ya escrita solo se sustituye si la marca. La pestaña elegida se guarda en el dispositivo, y el enlace `#aircraft?sheet=<id>` abre directamente el editor de una ficha.

<a id="aircraft-sheet-edit"></a>**Modificar una ficha.** «Editar» abre el editor: los campos por grupo (identidad, combustible, pista y alternativo, ascenso, crucero, descenso, régimen), la tabla régimen / consumo en pantalla grande, y el complemento EUROCONTROL, «Completar desde otra ficha…» (un botón que abre la búsqueda de las fichas, nada elegido de antemano) o «Completar con ChatGPT», que copia la petición y abre ChatGPT en una pestaña nueva: pegue allí la petición si no está y luego pegue su respuesta bajo el botón. «Combustible en volumen» y «Densidad del combustible» se explican bajo el campo; una densidad fuera de 0,5 a 1,0 se rechaza. Una tabla régimen / consumo cuyo consumo baja cuando sube el régimen se señala (la fila en naranja, «¿horquilla mal leída?»); no se corrige nada sin usted. Un punto «•» al final de la etiqueta de un campo rellenado indica su origen y su fecha («lnmperf · 28/10», «editado · 30/10») al pasar el cursor o con un toque, con los valores descartados; el título de cada tarjeta recuerda sus fuentes una vez («Fuentes: base V2 · 28/10, editado · 30/10»). «Guardar» abre la vista previa de los cambios, que solo se escriben tras «Aplicar la selección»; así cada campo cambiado conserva su fuente y se guarda el valor anterior. «Exportar .lnmperf» y «Exportar JSON» descargan la ficha; «Eliminar» pregunta antes de retirar la ficha de la base compartida. Una altitud en la columna «ft» forma una curva propia: las filas de esa altitud; si su consumo baja mientras el régimen sube, una línea lo dice con la altitud («… a 8000 ft: ¿horquilla mal leída?») y marca la fila, sin corregir nada. Bajo la tabla, «Proponer desde las mediciones» lee uno o varios registros Fuel Phase Monitor (.csv, .csv.gz) elegidos en el dispositivo (no se guardan ni se envían): los niveles estables del tipo de la ficha se listan por altitud y régimen, con la desviación respecto a la curva de la misma altitud («ficha 40, desviación -5 %») o «fila nueva»; marque los que quiera conservar, «Añadir las filas marcadas al borrador» y luego «Guardar» y «Aplicar» como para cualquier cambio. Con varias altitudes, la tabla es un grupo plegable por altitud («8000 ft · 4 regímenes»); cada fila tiene además una TAS opcional (kt), que Combustible lee cuando dos filas enmarcan el régimen de crucero. En el puesto, «Desde la carpeta Output» lista los registros de la carpeta Output de X-Plane (ajustada una vez con «Ajustar la carpeta Output»): márquelos, «Leer los registros marcados», y los niveles se muestran igual. En la cabecera de la tabla, «Curvas» traza el consumo según el régimen, un color por altitud con su leyenda; los niveles medidos se añaden como cuadrados. El ascenso y el descenso medidos tienen cada uno una línea (régimen, consumo, régimen vertical, velocidad, mando de gases y el valor actual de la ficha): marcada, rellena el ascenso o el descenso del borrador. La línea superior del editor sigue visible: el nombre de la ficha y su unidad («lb · lb/h»); un toque en la unidad lleva a su elección. Los niveles se colocan en niveles significativos (hasta 5000 ft de 1000 en 1000, luego FL100, 150, 200 … 450: un FL181 cuenta como FL200); un nivel sin medición entre dos medidos se calcula, en gris y dicho «extrapolado». Las mediciones aceptadas quedan en el dispositivo para un cálculo futuro, nunca publicadas.

<a id="aircraft-fuel-volume"></a>**Combustible en volumen.** Marcado: las cantidades de esta ficha (utilizable, rodaje, reserva, consumos) son volúmenes — litros o galones, como los muestra el simulador —, no masas; la densidad de abajo las convierte a kilos.

<a id="aircraft-fuel-density"></a>**Densidad.** Kilos por litro del combustible: Jet A-1 unos 0,80, Avgas unos 0,72. Depende del combustible, no de la aeronave: déjela vacía para el valor de la compañía (Ajustes), si no el típico. Entre 0,5 y 1,0.

**Unidades del combustible.** Arriba del editor, «Combustible leído y escrito en» ofrece kg, lb, l o US gal (y kg/h, lb/h, l/h, gal/h para los consumos); cada campo y la tabla régimen / consumo llevan la unidad elegida. La ficha guarda su unidad de almacenamiento: una línea la dice con la densidad usada; un valor escrito se convierte al guardar, un valor sin tocar no cambia.

## Bueno saber

- El módulo Sitio también actualiza la flota a partir de la página «Flota» del sitio pegada: los dos escriben el mismo archivo, cada guardado relee el archivo justo antes y cambia una sola aeronave.
- Nada sale antes de la próxima sincronización.

<!-- fr: 4d2f04af9b1b -->

<!-- chapter: settings -->
# Ajustes

Los ajustes de este dispositivo (⚙ arriba en la pantalla): su identidad, lo que la aplicación le muestra, cómo se
intercambian los datos y lo que el dispositivo guarda sin conexión. Se quedan en el dispositivo, nunca se sincronizan.

## Cómo usarlo

**El estado.** La pantalla se abre con el bloque «Estado», con el mismo punto que el botón ⚙ de la cabecera (verde: algo
nuevo; naranja: atención). Una línea por cosa, toque para actuar: el vuelo en curso (al Mapa), los informes por escribir (al
informe ya rellenado), el trigrama que falta (a «Identidad»), la base aeronáutica mientras no esté lista (a «Acceso a los
datos»), el estado de los datos y la vía de intercambio usada (a «Sincronización», o a los conflictos), el lanzador, «Sin
conexión» y, en un teléfono, la posición durante un vuelo.

**Los grupos.** En el nivel Descubrimiento, la pantalla muestra siete tarjetas como mucho, una debajo de otra:
Identidad, Acceso a los datos, Sincronización (cuando sirve), Usos, Nivel, Diseño y Acerca de. La copia de seguridad, los
datos sin conexión, la clave meteorológica, las fichas de Little Navmap y el acceso del equipo llegan en el nivel
Habitual. En los niveles Habitual y Completo, las tarjetas se ordenan bajo siete títulos, en el orden en que se
configuran las cosas: Identidad, Acceso, Datos, Dispositivo, Visualización, Administración (nivel Completo) y Ayuda.
Cada título está plegado; tóquelo para abrirlo. Un grupo que requiere atención (un aviso, un error o la tarjeta a la que
lleva una línea naranja del estado) se abre solo, con un punto naranja; una línea del bloque «Estado» abre el grupo de su
tarjeta. Un grupo abierto a mano sigue abierto mientras la página está abierta. Las tarjetas de circunstancia (ajustes de
la V2 encontrados, configuración recibida, reanudación de la adhesión) van primero, en todos los niveles, y desaparecen
una vez atendidas. Una tarjeta abierta por su dirección (el botón «Datos sin conexión» del asistente «Unirse a la
aerolínea», por ejemplo) se muestra sola, sea cual sea el nivel; «← Ajustes» vuelve a la lista.

**Su identidad.** En «Identidad», escriba su trigrama y sus identificadores VID IVAO, CID VATSIM y SimBrief, luego
«Guardar». Las herramientas los usan para prerrellenar; con varios usuarios, el trigrama es necesario.

**El nivel.** «Nivel» elige lo que muestra el menú: Descubrimiento, Habitual o Completo, con un toque. Bajo cada opción,
la línea «Menú:» indica qué herramientas muestra; una herramienta oculta sigue accesible por su dirección.

**El diseño.** «Diseño» muestra una miniatura por aspecto — Estándar, Gabinete, Robusto — y el tono: Automático
(como el sistema), Día o Noche. Un toque lo aplica en el acto, solo en este dispositivo. Un diseño reservado al
ordenador no se aplica en un teléfono: la tarjeta dice cuál se muestra en su lugar, y su miniatura está marcada; tocar
una miniatura sustituye esa elección.

**Los usos.** La frase al principio de «Usos» indica cómo se intercambian los datos. Sin casilla marcada, está «Solo en
este dispositivo»: nada sale a otro lugar. Marque «Solo, en varios dispositivos» o «Varios usuarios (repositorio git de
datos)» para intercambiar. En un puesto servido por el lanzador, la aplicación ya lee y escribe la carpeta `data/`
del lanzador, incluso sin casilla marcada; un uso de intercambio la comparte además por git.

**El acceso a los datos.** En un teléfono o en el sitio, configure en «Acceso a los datos» el repositorio
(cuenta/repositorio), la rama y su token personal, luego «Probar» y «Guardar». En un puesto servido por el lanzador no
hay token; mientras `data/` no es un repositorio git, la tarjeta abre la vía para obtenerlo o retomarlo; su repositorio
remoto se configura en la tarjeta «Administración» (vea «Un repositorio git para data/»). En el equipo del lanzador, la tarjeta «Acceso a los datos» empieza con una línea «Repositorio de datos:» que da la dirección y la rama del repositorio remoto: la pantalla no la espera (el lanzador puede tardar varios segundos en leerlo), la línea muestra «…» y luego su valor, sin moverse; lo que depende del repositorio (el panel «Repositorio remoto» de la Administración, por ejemplo) aparece cuando llega.

**Sin acceso ni lanzador, no hay bases.** Un dispositivo sin acceso configurado y sin lanzador — el sitio abierto en un
teléfono por primera vez, por ejemplo — no tiene ni la base aeronáutica (espacios, aeródromos, radioayudas) ni la base
de aeronaves: «Datos sin conexión» lo dice. Dos vías: configure el acceso al repositorio de datos, incluso sin marcar
intercambio (entonces solo sirve para leer las bases); o, en un puesto con lanzador, publique las bases en el
repositorio (V2: Ajustes › Mantenimiento › Datos aeronáuticos y Tipos de aeronave), luego sincronice. Tres estados distintos cuando falta la base: «Base aeronáutica cargándose…» (la lectura no ha terminado: espere), «Acceso a los datos no configurado en este dispositivo» (configure el acceso arriba; una aplicación añadida a la pantalla de inicio tiene su propio almacenamiento, nada de lo de Safari está allí) y «Base aeronáutica no publicada» (el acceso funciona, nada está publicado en el repositorio).

**La sincronización.** La tarjeta «Sincronización» es el resumen de lo que aún no ha salido: arriba, un recuento por tipo (fichas de aeronaves, misiones, vuelos, flota; «Otros» solo si hay algo),
luego la última correcta, la red y el último error. Una lista plegada por tipo da lo que espera: el título legible (por ejemplo «Ficha A320 Navy», «Vuelo LFPO → LFBO del 3/11»), la fecha, ✕ para una
eliminación y, si la hay, el error que retiene la cola; siete elementos visibles como máximo, «… y n más» para el resto. Con el lanzador del puesto se añaden «modificado aquí» (aún no guardado en los datos) y
«para enviar» (guardado, aún no enviado). «Enviar todo» envía y recibe en el acto; si no, la sincronización se hace sola al inicio, cada 10 minutos en línea y al volver la red. La tarjeta aparece en cuanto se
marca un intercambio o algo espera. Debajo, una línea dice lo que acaba de salir («Enviado a las 18:04: Fichas de aeronaves: 2 · Misiones: 1», con «de ellos 1 rechazado(s)» si lo hay); desplegada, da los archivos uno a uno por su título legible, los rechazos primero con el motivo que dio el transporte, siete como máximo. Es la última sincronización que envió algo: un paso sin nada que enviar la deja como estaba, y antes del primer envío no se dice nada. En un puesto con lanzador, dos líneas dicen **cuánto tardó la sincronización**: la última y **la más larga de hoy** (guardada en este dispositivo), en segundos, paso a paso (ajuste, commit, recepción, envío…), con el número de comandos git y lo enviado («8 s — commit 1 s · recepción 2 s · envío 4 s · 12 comandos git (1 s) · 38 Ko enviados»); un paso más corto no sustituye al más largo, otro día lo borra.

**La copia.** Solo en este dispositivo, «Exportar (un fichero)» guarda todos sus datos en un fichero: es la única
copia. «Importar (fusión)…» la retoma sin perder nada de aquí; «Sustituir por un fichero…» borra primero lo que hay en
el dispositivo.

**Los datos sin conexión.** Cada zona publicada tiene su línea: su estado en este dispositivo, su ciclo y su tamaño.
«Guardar sin conexión» la descarga entera (mejor por wifi); «Liberar» devuelve el espacio.

## La clave meteorológica

El METAR funciona sin clave. El TAF, en un dispositivo sin lanzador (teléfono, sitio), requiere una clave personal y
gratuita de avwx.rest: «Crear una clave en avwx.rest ↗» abre la página del proveedor. Péguela en «Clave meteorológica
(TAF, avwx.rest)», luego «Guardar»; «Probar» pide el TAF de un aeródromo, «Borrar» la quita. La clave se queda solo en
este dispositivo (guardada con su identidad: sobrevive al cierre del navegador), nunca en el repositorio ni en una copia, y nunca vuelve a mostrarse. En un puesto servido por el
lanzador es innecesaria: el lanzador proporciona el TAF.

## Fichas de Little Navmap

En un equipo servido por el lanzador, la tarjeta «Fichas de Little Navmap (.lnmperf)» une sus fichas de rendimiento con
los archivos .lnmperf de una carpeta, en ambos sentidos. Elija la carpeta (se propone la de Little Navmap cuando se
encuentra) y luego «Guardar». Después, nada que hacer: una ficha cambiada en Combustible reescribe su archivo, un
archivo cambiado en Little Navmap actualiza la ficha, un archivo nuevo se vuelve ficha. Si el mismo valor cambió en
ambos lados, gana el más reciente y el otro queda guardado en la ficha; el botón de sincronización lo indica. Un
archivo nunca se borra: el de una ficha retirada va a la subcarpeta `_removed`. «Sincronizar ahora» hace la pasada en
seguida, «Detener» corta el vínculo. Las fichas a las que les falta un valor requerido por Little Navmap se listan y no
se escriben. En un teléfono, Combustible descarga la ficha en .lnmperf.

## Las claves API de la aerolínea

En un puesto servido por el lanzador, en el nivel Completo, el botón «Claves API de la aerolínea (IVAO, EAD Basic)» de la tarjeta
«Administración» despliega el ajuste de la clave de la API IVAO: se queda en la carpeta `secrets/` del lanzador, nunca en
el navegador ni en los datos. «Probar» comprueba que IVAO responde; «Borrar» la quita.

Bajo la clave IVAO, el bloque «EAD Basic (EUROCONTROL)» recibe el usuario y la contraseña de su cuenta EAD Basic: los entrega una sola vez al lanzador de este equipo (carpeta `secrets/`), que los guarda; la página no los vuelve a mostrar nunca, solo dice si están guardados y cuándo. Sirven para «Leer un aeródromo desde EAD» (un aeródromo por gesto). EAD Basic es una herramienta de demostración con datos no operativos, para usar solo en simulación (el aviso sigue visible). «Borrar» los quita del lanzador.

<a id="settings-ivao-app"></a>Bajo el bloque EAD Basic, un enlace lleva al asistente «Aplicación IVAO (conexión de los pilotos)» (la tarjeta del mismo nombre, grupo «Administración», o `#settings?card=ivaoapp`). Permite a los pilotos conectarse a IVAO por el relé de la compañía o por este equipo: le guía en IVAO (`https://developers.ivao.aero/create`: Name = el nombre de la compañía, App Type = Third Party, Active = Enabled), enumera las direcciones de retorno que declarar con «+ Add Redirect URL» (la de este equipo y, si su dirección pública está configurada, la del relé; «Copiar» las da tal cual) y luego recibe el Client ID y el Client Secret que muestra IVAO. El lanzador los escribe en `secrets/ivao_oauth.json`: no edita ningún archivo, y la página no los vuelve a mostrar nunca (solo dice si la aplicación está guardada y cuándo). «Probar» alcanza el documento de descubrimiento OpenID de IVAO; «Borrar» quita la aplicación. La clave API de la aplicación (`secrets/ivao.json`) es otro ajuste: la de una aplicación nueva se traslada a «Clave IVAO».

## La tableta junto al simulador

Vuela en el equipo (X-Plane) y quiere el mapa en una tableta o un teléfono: en el equipo servido por el lanzador,
«Acceso del equipo» abre la aplicación Piloto a los dispositivos de la misma red local (o inicie `lancer.cmd --lan`).

1. **Abrir a los dispositivos de la red local**: la tarjeta muestra la dirección que abrir en el dispositivo, su
   código QR y un código de vinculación de 8 cifras (6 hasta el 30 de octubre de 2026). Windows puede pedir que autorice Python: acéptelo solo para
   redes privadas.
2. En la tableta, escanee el código QR con la cámara (o escriba la dirección) y luego introduzca el código. Se pide
   **una sola vez por dispositivo**.
3. La tableta ve entonces los datos del equipo, la posición del simulador en la insignia del vuelo y «Lanzador de
   <equipo>» arriba.

- **Solo en una red de confianza**: todo pasa por http, sin cifrado. En casa, sí; en una wifi pública o de hotel,
  nunca.
- El acceso se cierra con el lanzador, o con «Cerrar el acceso». Un dispositivo vinculado sigue vinculado; «Olvidar
  los dispositivos» vuelve a pedirles un código a todos (una tableta perdida, por ejemplo).
- En la tableta, la aplicación no funciona sin conexión y no usa su GPS: el navegador solo los concede en https. La
  posición viene del simulador del equipo.
- Un código sirve una sola vez y dura 10 minutos: «Código nuevo» da otro. 5 códigos erróneos desde un dispositivo:
  un minuto de espera; 30 en una hora: la vinculación se cierra hasta el siguiente «Código nuevo». «Olvidar», junto
  a un dispositivo (con su fecha de vinculación, en UTC), retira solo ese.
- Solo se abre la dirección principal del equipo; las demás (VPN, máquinas virtuales) solo con «Abrirlas también». Una
  dirección que no puede abrirse se nombra en la tarjeta; la ventana del lanzador dice por qué.

## Un repositorio git para data/

**¿GitHub o GitLab?** No es un ajuste: el proveedor se lee de la dirección del repositorio remoto y se muestra al principio de «Administración › Repositorio remoto de data/»; la tarjeta «Acceso a los datos» lleva allí.

En un puesto servido por el lanzador, en el nivel Completo, el botón «Repositorio remoto de data/» de la tarjeta
«Administración» muestra el repositorio remoto de `data/`: su dirección y su
rama. Para configurarlo o cambiarlo, escriba la dirección (`git@host:cuenta/repo.git` o `https://…`, sin contraseña ni
token dentro): «Comprobar» indica si el repositorio responde, «Guardar» lo configura. Hacia otra dirección distinta de la configurada, se abre una ventana Sí / No en el equipo, no en la página: la tarjeta lo dice antes del clic; respóndala (puede estar detrás de otras ventanas) y vuelva. Rechazada, cerrada o ya abierta: la tarjeta da el motivo y `data/` se queda tal cual. Es a propósito: una página trampa no debe poder enviar sus datos a otro lugar. Nada bloquea: un repositorio que no responde solo
se señala.

- **El acceso al repositorio** se configura en el equipo: una clave SSH para una dirección `git@…`, credenciales
  guardadas en Git para una dirección `https://…`.
- **El proveedor** de una configuración se elige (github o gitlab), nunca se adivina; el panel solo lee la dirección del repositorio remoto (GitHub, gitlab.com, framagit.org, o un GitLab autoalojado que la configuración del dispositivo nombra con el mismo host; si no, «Proveedor no reconocido»). En la parte superior del panel, «Proveedor: GitLab · proyecto grupo/proyecto» (el proyecto es un enlace a su página); para GitLab, el enlace «Tokens de los pilotos» lleva a la creación de los tokens de acogida; para GitHub, el panel propone introducir la dirección de un proyecto GitLab, porque la acogida por token de proyecto lo requiere. La página solo propone: cambiar de repositorio pasa, como siempre, por la ventana Sí / No del lanzador. La configuración exportada lleva siempre el proveedor (github o gitlab; un repositorio desconocido se rechaza, nunca se exporta como «other»), y el lado del piloto se abre sobre él. Una configuración antigua sin proveedor solo se acepta para github.com. Sin lanzador, una configuración GitLab se aplica en el dispositivo como una de GitHub.
- **Varios usuarios por git** necesitan este repositorio remoto: sin él, la casilla «Varios usuarios» no lleva a
  ninguna parte, y la tarjeta «Usos» lo recuerda.
- **data/ ausente o sin git**: la tarjeta «Acceso a los datos» abre una vía, en todos los niveles. `data/` es una carpeta ignorada por el repositorio del código;
  se convierte en su propio repositorio git, enlazado al repositorio de datos (no un submódulo). Escriba la dirección
  del repositorio de datos y, si hace falta, un usuario y una contraseña o token (nunca guardados por la página;
  «Recordar» los confía a Git en este equipo). Sin `data/`, «Recuperar los datos» lo clona; con un `data/` sin git
  (datos de ejemplo o archivo), «Retomar data/ en este repositorio» lo enlaza al repositorio. La tarjeta sigue el trabajo
  y vuelve a leer el estado al final; un fallo se explica, nada se pierde.
- **Historial del repositorio reescrito** (por ejemplo para purgar archivos grandes): la sincronización de este equipo
  rechaza entonces toda fusión y lo dice; no se pierde nada. Aquí, «Retomar el nuevo historial» muestra primero lo que
  saldrá (sus commits, los archivos de datos trasladados), pregunta, guarda el estado anterior en una referencia local,
  traslada sus archivos de datos al nuevo historial y luego sincroniza. Un archivo fuera de los datos sincronizados
  nunca se vuelve a enviar.

## Configurar un piloto

**Preparar la configuración (administrador).** En la tarjeta « Administración » (nivel « Completo »), « Añadir un piloto » prepara la configuración de un piloto (véase « Añadir un piloto (administrador) » más abajo). Da **tres formas de la misma configuración**: el archivo sog-config-<TRI>.json, el enlace y su código QR; envíe la que quiera. El piloto escanea el código QR con la cámara de su teléfono: abre el enlace, que lleva al asistente. Contienen la aerolínea, el repositorio de datos, el trigrama y el modo de empleo del token, nunca un token ni un secreto; el propietario del repositorio (usuario u organización) figura en ellos, decide qué token crear. Para un repositorio GitHub, invite primero el nombre GitHub del piloto en el repositorio, con el derecho Write (el enlace lleva a la página de colaboradores del repositorio).

**Unirse a la aerolínea (piloto).** El código QR (escaneado con la cámara del teléfono: abre el enlace), el enlace, «Unirse a la aerolínea…» (tarjeta «Acceso a los datos»: el asistente sin configuración pide pegar el enlace recibido, o elegir el archivo) y la tarjeta de bienvenida de la primera apertura abren el asistente «Unirse a la
aerolínea», una pantalla por paso: la configuración recibida; la cuenta (crearla si hace falta, con el enlace de
registro) y el nombre de usuario; la invitación que aceptar; el token, paso a paso (clásico para el repositorio de un
usuario, de grano fino para el de una organización); el token pegado y probado; los identificadores de red; por último
«Terminar y sincronizar», y luego los datos sin conexión. Las casillas marcadas quedan en el dispositivo: una tarjeta de
los ajustes propone retomar donde lo dejó. El tutorial «Unirse a la aerolínea» sigue los mismos pasos.

**Unirse a un proyecto GitLab (piloto).** Cuando la configuración recibida es un proyecto GitLab, no crea nada: ni cuenta, ni invitación, ni token. El asistente tiene solo tres pantallas: la configuración leída (aerolínea, proyecto), luego « Pegar el token » — pegue el token que el administrador le envió aparte (nunca en el enlace); su trigrama se lee de la configuración, no lo escribe — y « Terminar y sincronizar ». Sus identificadores VID, CID y SimBrief se rellenan más tarde en Ajustes › Identidad. Antes de aceptar el token, la aplicación pregunta a GitLab de qué token se trata. Un token personal (vale para todos sus proyectos) da una pregunta: prefiera el token de proyecto pedido al administrador; si responde « No », no se guarda nada. Un token sin fecha de caducidad (o a más de un año), o con más derechos de los necesarios, se señala con una línea de aviso, sin bloquearle. La tarjeta « Acceso a los datos » dice lo mismo de un token personal, sin pregunta: solo con su propio repositorio, un token personal es el adecuado.

**Nada más que el archivo.** Solo se configura lo que contiene la configuración, y el acceso solo se guarda una vez
probado el token; «Probar» dice qué falla: invitación aún no aceptada, token mal copiado o caducado, token sin derecho
sobre el contenido. Un token clásico abre todos los repositorios de la cuenta: para el repositorio de un usuario, se
aconseja una cuenta de GitHub dedicada al vuelo. Un archivo de otro formato se rechaza con un mensaje. La aerolínea solo
se escribe en el repositorio si aún no tiene una. En un puesto cuyo data/ ya sigue este repositorio, el asistente se
salta la cuenta y el token. Sin lanzador, la aplicación llega a un repositorio de GitHub o a un proyecto en una
instancia GitLab (gitlab.com): pegue la dirección del proyecto (https://gitlab.com/grupo/proyecto) y el token
de acceso de proyecto que le dio el administrador; el token solo se envía a esa instancia. Cuando la configuración recibida o el acceso del dispositivo es un proyecto GitLab, la tarjeta «Acceso a los datos» espera la dirección del proyecto y describe el token de proyecto (rol Developer, `write_repository`).

## Administración

**Las páginas de administración.** En el nivel «Completo» (tarjeta «Nivel»), la tarjeta «Administración», bajo «Acerca
de», reúne las páginas de administración y de prueba, **un botón por página**, cada una con una frase; en los demás niveles no aparece, y nada del administrador está en las demás tarjetas. En la
aplicación: el botón «Ajuste de los umbrales del mapa» (`#maps?tune=1`, solo lectura en un teléfono; abre la página de ajuste: para cada elemento del mapa y cada modo, los zooms en que aparece, guardados para la aerolínea, `airline/map_profiles.json`; un modo que nunca guardó toma los umbrales de un modo ajustado, la página lo dice; el control «Complejidad» del mapa solo desplaza el zoom), vuelta con la flecha de retroceso; el botón «Límite de la zona del vuelo», que despliega una casilla
«Mostrar la línea del límite de la zona del vuelo» (guardada al instante para la aerolínea, con los umbrales, en `airline/map_profiles.json`,
clave `edge`; la línea se muestra mientras no ajuste nada); el botón «Umbrales de pista en el mapa», que despliega una lista de 8 a 16: el zoom a partir del cual el mapa dibuja los umbrales de pista (guardado al instante para la aerolínea, mismo archivo, clave `runwayZoom`; 11 mientras no ajuste nada); el botón «Añadir un piloto» (véase más abajo); en un puesto servido por el
lanzador, los botones «Repositorio remoto de data/» y «Claves API de la aerolínea (IVAO, EAD Basic)», que despliegan su ajuste (véase
«Un repositorio git para data/» y «Las claves API de la aerolínea»);
la hoja de ruta (`#roadmap`) y el diagnóstico de la tarjeta «Acerca de».

**El asistente del administrador.** El botón « Asistente del administrador » (tarjeta « Administración », o la dirección `#settings?card=assistant`) lleva al administrador de la mano: seis pasos, en orden, cada uno con su estado leído de la instalación (hecho, por hacer, opcional, desconocido), una frase y un botón hacia la tarjeta que ajusta el paso. El primer paso por hacer tiene el botón de color. El repositorio de datos (un repositorio remoto para data/ y, con GitLab, su token de administrador en este puesto), la aerolínea (su nombre, en el módulo Sitio; su trigrama está en Ajustes › Identidad), la base aeronáutica (al menos una zona publicada), el primer piloto (« Añadir un piloto »), luego, opcionales, los dispositivos y las claves (IVAO, EAD). El estado de la instalación, tal como lo da el marco, está al final. El asistente no escribe nada: cada botón abre la tarjeta que ya existe.

**Añadir un piloto (administrador).** En el nivel « Completo », el botón « Añadir un piloto » de la tarjeta « Administración » (donde la exportación es posible) lo prepara todo para un piloto que aún no tiene nada. Escriba su trigrama, su nombre si quiere saludarlo, el idioma del mensaje y la dirección de la aplicación publicada, y pulse « Preparar »: obtiene el archivo, el enlace y el código QR (tres formas de la misma configuración), sus pasos y un mensaje listo para copiar, en el idioma elegido. Para un repositorio GitLab, sus pasos son: crear el token de proyecto del piloto (uno por piloto, nombre = su trigrama, rol Developer, ámbito `api`, fecha de caducidad 90 días aconsejados y 365 como máximo, nunca sin fecha), copiarlo enseguida (GitLab lo muestra solo una vez), comprobar que la rama de datos deja enviar a los Developers, y saber revocar (Settings › Access tokens › Revoke). Con el lanzador, « Crear su token » abre la pantalla « Tokens de los pilotos » con el trigrama ya escrito: el lanzador crea el token con el del administrador; los pasos a mano quedan plegados debajo. Sin lanzador, están abiertos. **Envíe el token aparte del mensaje** (otro canal, o péguelo delante del piloto): nunca va en el enlace ni en el mensaje. Para un repositorio GitHub, los pasos son los de la exportación.

<a id="settings-sources"></a>**Fuentes de datos.** El botón «Fuentes de datos» (`#sources`, nivel Completo) enumera las fuentes de datos aeronáuticos que la suite utiliza, considera o ha descartado: para cada una, lo que da, su licencia, su estado y un enlace que se abre en una pestaña nueva; para las que cambian con cada ciclo AIRAC (SIA, VAC, eAIP, CIFP), el enlace es el del ciclo vigente, escrito arriba de la pantalla. La pantalla no descarga nada. Bajo el botón de la tarjeta Administración, la dirección absoluta de la pantalla, para abrirla o guardarla en favoritos («Copiar el enlace»). Sustituye al laboratorio de datos, retirado el 28 de octubre de 2026.

**Los bancos, en un puesto.** Servidos por el lanzador, solo se abren en un puesto con lanzador (en otros sitios se
nombran sin enlace); rutas relativas a la raíz de la suite: `labs/design_primitives.html` (primitivas y diseños),
`frame/aerodb/bench.html` y `frame/aerodb/offline_bench.html` (base aeronáutica, en línea y sin conexión),
`frame/store/test/` (capa de datos, contra el GitHub falso) y `modules/maps/test/render.html` (renderizado del mapa).

**Las páginas V2 del puesto.** Solo se muestran cuando un lanzador sirve la página: Ajustes › Mantenimiento
(`apps/settings/maintenance.html`), Primer inicio (`apps/settings/premier_lancement.html`) y el estudio cartográfico
(`apps/cpco/map_parser.html`).

## Conviene saber

- **Cuenta IVAO**: la tarjeta «Cuenta IVAO» vincula este dispositivo a su cuenta IVAO por el relé de la aerolínea (o
  el lanzador del puesto): «Iniciar sesión en IVAO» abre la página de IVAO y luego vuelve aquí. El relé guarda el secreto
  de la aplicación de la aerolínea; su token se queda en este dispositivo, renovado solo, nunca en una copia de
  seguridad. «Desvincular» lo borra y pide a IVAO que retire el acceso; si IVAO no puede, la suite le dice
  que lo retire en su cuenta IVAO. Sin aplicación IVAO configurada, el botón está apagado y la tarjeta dice dónde falta: en este
  puesto, Administración › «Aplicación IVAO» la configura (da la dirección de retorno que se declara en IVAO); en el relé,
  la configura el administrador.
- **Dispositivos**: una sola pantalla, Mantenimiento › «Dispositivos», para todos los dispositivos de los pilotos, vengan
  de la red local o del relé de la aerolínea (cuando el lanzador funciona como relé, detrás del proxy inverso del NAS, en
  https). Un piloto vincula cada dispositivo una vez con un código de 8 cifras que el administrador pide allí para su
  trigrama (una vez, 10 minutos, en uno u otro canal); sus escrituras llevan ese trigrama. Cada línea dice el canal del
  dispositivo; la de un dispositivo vinculado con el código de la consola dice «código de consola», y «Nombrar» le pone un
  trigrama. Un dispositivo perdido, o todos los de un piloto que se va, se revocan allí.
- **Actualizar la suite** (Administración, con el lanzador): elegir un canal — estable, preversiones o seguimiento del
  desarrollo —, «Comprobar» dice lo que cambiaría sin tocar nada, luego «Actualizar» (tras una pregunta). Nunca un paso atrás;
  rechazado si se modificaron archivos de la suite en este equipo, y mientras haya un trabajo del módulo Datos o una
  sincronización en curso (inténtelo de nuevo cuando termine). Los datos no se tocan. La versión que se toma es la que anuncia
  el repositorio de la suite: sus etiquetas no están firmadas, la confianza es la misma que la de una actualización hecha a
  mano con git. Es la que «Comprobar» mostró: si el canal cambió entretanto, no se escribe nada y el panel pide comprobar
  de nuevo.
  Después, cierre la ventana del lanzador y vuelva a ejecutar lancer.cmd.
- **Carpetas de este equipo** (Administración, con el lanzador): dónde están la suite, los datos, las descargas, las bases
  y fichas de Little Navmap en este equipo, la ruta en solo lectura y de dónde viene; «Abrir» muestra la carpeta en el
  explorador de archivos. Una ruta se cambia donde se indica, nunca aquí; X-Plane es desconocido para el lanzador.
- **Tokens de los pilotos (GitLab)**: en la aplicación Maintenance, en el equipo del lanzador, «Tokens de los pilotos»
  crea un token de acceso de proyecto por piloto (con su trigrama, rol Developer, un año como máximo) y lo revoca. Tras
  «Crear el token», la pantalla solo muestra ese token, arriba: cópielo enseguida (no se volverá a mostrar), con lo que
  hay que decir al piloto y el enlace a su mensaje («Añadir un piloto»); la lista «Tokens existentes» queda plegada
  debajo, el nuevo figura en ella como «creado ahora mismo». El lanzador usa allí el token del administrador, que nunca muestra: un token de acceso personal de
  su cuenta de GitLab (Preferences › Access tokens), alcance api, con caducidad (un año como máximo), siendo esta cuenta
  Maintainer u Owner del proyecto. Péguelo en «Token del administrador», bajo la lista; «Probar el token del
  administrador» indica la cuenta, su rol, sus alcances y su caducidad; el título del bloque dice si hay un token puesto (su fecha, la
  instancia, el proyecto, la hora de la última prueba), nunca su valor. Un rechazo de GitLab se indica por su causa:
  token rechazado (ausente, caducado o sin api), cuenta que no es Maintainer, proyecto no encontrado. La rama de
  datos debe estar protegida, abierta al rol Developer y sin envío forzado (en gitlab.com la rama por defecto está
  reservada a los Maintainers): la
  pantalla lo comprueba, y «Abrir la rama a los Developers» lo hace tras una pregunta, planteada también antes del primer
  token. Un piloto cuyo token se rechaza al escribir lee «la rama main del proyecto no está abierta a los Developers».
- **El token**: en github.com, un token de grano fino, solo sobre el repositorio de datos, «Contents» lectura y
  escritura, 90 días como máximo; en GitLab, un token de acceso de proyecto (uno por piloto, con su trigrama), creado por
  el administrador. Nunca se vuelve a mostrar; no lo pegue en ningún mensaje.
- **Sus ajustes se quedan al cerrar el navegador**: la identidad, el token y la clave meteorológica se guardan en el mismo
  sitio del dispositivo, nunca sincronizados ni en una copia. Si Safari se los hizo perder igualmente (borra el almacenamiento
  de un sitio poco visitado), añada la aplicación a la pantalla de inicio: allí está mejor guardada. El diagnóstico
  («Copiar») dice si el navegador prometió no borrar (`storage.persisted`).
- **Cortar el acceso**: borra el token de este dispositivo; sus escrituras pendientes se quedan y saldrán cuando el
  acceso vuelva a configurarse. Teléfono perdido o robado: borre también el token en el alojamiento (github.com, gitlab.com…).
- **Ajustes de la V2**: si este navegador ya se usó para la V2, la tarjeta «Ajustes de la V2 encontrados» propone una
  vez retomar su identidad y su acceso.
- **Acerca de**: enlaces a esta ayuda y a la hoja de ruta (lo entregado, en curso, previsto), luego el
  diagnóstico, plegado: transporte, última sincronización, errores, árbol del repositorio, bases de referencia y base
  aeronáutica, línea por línea; «Copiar» lo pone todo en el portapapeles, para pegarlo en su mensaje y señalar un
  problema. El token
  nunca figura en él.

<!-- fr: 3f0b4754c1b8 -->

**La compañía.** En el nivel Completo (o con #settings?card=company), la tarjeta «Compañía» lista las compañías de data/airline/index.json y «Personal»: el nombre, el código, las redes (IVAO, VATSIM, sin conexión) y el número de aeronaves de la flota. «Elegir» convierte una en la compañía actual de este dispositivo (la elección es por dispositivo); la actual no tiene botón. Mientras el marco no sepa aún guardar esta elección, los botones están en gris y la tarjeta lo dice. «Añadir una compañía» pide un nombre, un código (2 a 8 letras minúsculas o cifras, nunca uno ya en uso) y las redes, y luego escribe la carpeta data/airline/<code>/ (ajustes y flota vacía) y la añade al índice; un código en uso no sobrescribe nada. Veinte compañías como máximo; todo lo que se lee de data/airline/ se trata como texto no fiable. En el equipo del lanzador, mientras su compañía siga en la raíz de data/airline/, la tarjeta ofrece **migrarla**: un código opcional (propuesto según el nombre), «Ver lo que se haría» (el nombre, la carpeta data/airline/<code>/, los archivos y su tamaño, la flota que estará vacía allí) y después «Migrar a «<code>»». No se borra ni se sobrescribe nada: los archivos actuales quedan como copia. Bajo cada compañía (salvo «Personal», comercial por naturaleza), dos ajustes: el **tipo** («Comercial» o «Escuadrón (SOG)»; un segundo toque lo quita) y las **categorías de misiones**. Sin tipo, el grupo «Comercial» (carga, pasajeros, VIP, entrenamiento, tránsito, vuelos de prueba, posicionamiento) está inactivo; el pliegue «Categorías de misiones» lo dice. Allí se añaden o se quitan las categorías propias de la compañía (grupo «Virtual»); el grupo de la suite no se modifica y se rechaza un nombre ya usado.
