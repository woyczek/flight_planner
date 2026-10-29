# Datos

Lo que la aerolínea publica para la aplicación —la base aeronáutica, los procedimientos, las aeronaves, la meteorología— y el estado de cada conjunto de datos. Esta pantalla sirve para leer y ofrece acciones sobre la base aeronáutica: descargar sus fuentes, construirla, purgar las fuentes y después publicarla.

## Cómo usarla

<a id="data-cycle"></a>**El ciclo vigente.** Arriba, el ciclo AIRAC del momento (por ejemplo 2610), sus fechas y el número de días hasta el siguiente. Debajo, «Lanzador de este equipo» o «Sin lanzador: solo lectura» indica si este ordenador tiene un lanzador.

<a id="data-coverage"></a>**La cobertura.** La lista de zonas (países, regiones) que sigue este equipo. En la primera apertura son todas las zonas que publica la aerolínea; la lista se guarda en este dispositivo. «Añadir un país» pone en la cobertura una zona que la suite conoce, aunque nadie la publique todavía: queda marcada para «Construir».

<a id="data-states"></a>**Los Estados.** Bajo la cobertura, los Estados se ordenan por color: verde, ya hay procedimientos publicados; naranja, se pueden leer bajo demanda; rojo, nada es legible. El motivo está escrito en cada línea, el color nunca va solo. Pasadas siete líneas, «n más» despliega el resto.

<a id="data-group-base"></a>**Base aeronáutica.** Una línea por fuente que alimenta una zona de la cobertura: su ciclo, su antigüedad («publicado hace 3 días»), el número de zonas publicadas y una etiqueta de estado. Toque una línea para ver el enlace de la fuente con su dirección, su licencia, las zonas que alimenta y lo que ha publicado cada zona.

<a id="data-group-proc"></a>**Procedimientos.** Los procedimientos de Francia (eAIP del SIA) y de Estados Unidos (CIFP de la FAA), con el número de aeródromos publicados.

<a id="data-group-aircraft"></a>**Aeronaves.** Los tipos de aeronave y sus prestaciones: la fecha de la edición, el número de tipos y de archivos. Pasados 28 días, la etiqueta se vuelve naranja.

<a id="data-group-weather"></a>**Meteorología.** La meteorología mundial y las rutas NAT se publican con el sitio: estas líneas no tienen ciclo ni etiqueta.

<a id="data-states-pill"></a>**Las etiquetas.** «Al día»: nada que hacer. «Ciclo superado»: el ciclo publicado es anterior al ciclo vigente (naranja, rojo pasada una semana). «Analizador antiguo»: publicado por una versión anterior de los constructores. «Más de 28 días»: un conjunto sin ciclo, publicado hace más de 28 días. «Ausente del repositorio»: no hay nada publicado. Un grupo se abre solo cuando una de sus líneas requiere atención.

<a id="data-more"></a>**Los demás conjuntos.** Como máximo siete líneas por grupo; «n conjuntos más» despliega el resto y las fuentes solo consideradas o descartadas (su enlace, su licencia, su estado).

<a id="data-build"></a>**Construir la base.** Al principio del grupo Base aeronáutica, el panel «Descargar, construir, purgar» actúa sobre las zonas marcadas con tres botones, en este orden: Descargar · Construir · Purgar. «Construir» rehace la base de las zonas marcadas en el lanzador de este equipo: un navegador sin ventana (Edge o, si no, Chrome) construye las zonas una tras otra y cada una se guarda en el repositorio de datos en cuanto está lista. Al empezar están marcadas todas las zonas de la cobertura; desmarque las que no quiera rehacer. Los tres botones se ponen en gris a la vez, con su motivo escrito una sola vez debajo: «Hace falta el lanzador del equipo», «Hay otra operación en curso», «Marque al menos una zona», «Sin conexión».

<a id="data-build-personal"></a>**Fuentes con licencia personal.** ENAIRE (España), NATS (Reino Unido) y los datos de X-Plane solo se ofrecen si una zona marcada los usa, y nunca vienen marcados: márquelos solo si el repositorio de datos lo usa únicamente usted. Con X-Plane marcado, la construcción se hace en la página, lo que todavía no es posible aquí: terminará con ese motivo.

<a id="data-build-run"></a>**Durante la construcción.** Una barra, «n de m zonas», la etapa y el tiempo transcurrido; una línea por zona dice en espera, construcción (n / m fuentes), construida, fallo con su motivo o cancelada. «Detener» pide la parada: la zona en curso termina y las zonas ya construidas se conservan. Puede salir de la pantalla: la construcción sigue en el lanzador y se encuentra al volver. Si el lanzador se detuvo por el camino, la pantalla dice «Construcción interrumpida» con el último estado de cada zona: vuelva a empezar, desmarcando las zonas ya hechas si quiere.

<a id="data-build-end"></a>**Al final.** Una notificación da las cuentas («Base construida: 3 zonas; 1 con fallo (gb)») y el resumen queda en el panel con lo que hay que hacer: una zona con fallo (el motivo está escrito en su línea: navegador sin ventana, tiempo agotado, salida no válida, no se pudo escribir…), una construcción detenida, ningún navegador encontrado («No se encontró Edge ni Chrome en este equipo: instale uno de los dos.»). Después se vuelve a leer el estado de las líneas.

<a id="data-download"></a>**Descargar.** El botón «Descargar» trae, en el lanzador de este equipo, las fuentes en bruto de las zonas marcadas (openAIP, FAA, UK Mil AIP, NAV CANADA, tracks NAT del día; ENAIRE solo si está marcada entre las fuentes con licencia personal). Una línea por zona dice cómo va («descarga (2 / 3 fuentes)») y, debajo, una línea por fuente: descargada (n archivos), sin cambios, fallo con su motivo y su código HTTP («HTTP 404»), omitida (licencia no declarada) o manual. Lo que no ha cambiado no se reescribe nunca. Al final una notificación da las cuentas («Descargado: 2 zonas cambiadas, 1 sin cambios; 1 fallo»); las fuentes que el lanzador no descarga (el SIA, por ejemplo) se listan con su nombre, con enlace solo si su dirección es https, «para depositar a mano»; si se modificaron archivos de fuentes seguidos por git, la pantalla lo dice («n archivos de fuentes modificados, fuera de los datos sincronizados»). «Nada que descargar para estas zonas»: ninguna de las zonas marcadas tiene una fuente descargable. Dos descargas no pueden sucederse en menos de 30 s: la pantalla dice «Vuelva a intentarlo en n s».

<a id="data-purge"></a>**Purgar.** El botón «Purgar» retira del equipo las fuentes en bruto de las zonas marcadas (las que se vuelven a descargar) y sus cachés. Primero calcula el plan sin borrar nada y luego hace una sola pregunta: «¿Purgar 15 archivos (14,3 MB) de las fuentes de España, Francia?». Si los archivos del SIA (Francia) forman parte, la pregunta recuerda que sirven también para los contornos de las demás zonas en la construcción; los archivos seguidos por git se conservan siempre y se cuentan. No: no se retira nada. Sí: la purga se hace y la pantalla dice «Purgado: n archivos, x MB», con las rutas rechazadas (dejadas en su sitio). Nada que retirar: «Nada que purgar», sin pregunta.

<a id="data-publish"></a>**Publicar la base.** Bajo «Construir», el panel «Publicar la base» envía al repositorio de datos lo que se construyó en este equipo. Una zona construida se confirma entera en el equipo y sale también en la siguiente sincronización: «Publicar» la envía enseguida. Primero dice cómo está el equipo: «3 archivos modificados · 2 commits por enviar», la fecha del último paso y, si la hay, la fusión que espera en data/ (la publicación la concluye primero). Toque «Publicar»: una sola pregunta recuerda los archivos y los commits, luego se hace el paso; una barra sin fin indica que trabaja. Mientras tanto los botones del panel «Descargar, construir, purgar» están en gris, y «Publicar» lo está durante cualquier operación de ese panel: una operación a la vez.

<a id="data-publish-end"></a>**Al final de la publicación.** Una notificación da las cifras y el resultado queda en el panel: lo que se envió (archivos con commit, archivos recibidos); los archivos de la base conservados en el equipo porque había una construcción en curso; los conflictos (se conserva el más reciente, véase Ajustes › Conflictos); los archivos rechazados porque no tienen el formato de un archivo de datos. Un fallo se dice en una frase, con lo que responde el lanzador: no se pierde nada, los archivos siguen en el equipo. El botón está en gris con su motivo escrito debajo: «Hace falta el lanzador del equipo», «Hay una construcción en curso: publique cuando termine», «Nada que publicar», «El marco aún no sabe publicar la base: actualice la aplicación», «Sin conexión».

<a id="data-journal"></a>**El diario.** Al pie de la pantalla, las últimas 50 operaciones de este dispositivo: hora UTC, verbo, zonas, resultado.

## Casos particulares

- **Sin lanzador**: la pantalla se lee igual; muestra lo que está publicado.
- **Una lectura que falla**: la sección lo dice en una línea y el resto de la pantalla se dibuja.

<!-- fr: 116007677a97 -->
