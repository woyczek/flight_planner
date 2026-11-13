<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

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

<!-- chapter: fuel -->
# Combustible y nivel

Preparar el combustible de un vuelo y elegir su nivel: una aeronave, una ruta, un nivel, y sale el cálculo — rodaje,
combustible de viaje, reserva, combustible de bloque, tiempo de vuelo e inicio del descenso.

## Cómo usarlo

<a id="fuel-quote"></a>La preparación sigue cinco pasos, en el orden en que se prepara un vuelo:
**1 Vuelo, 2 Ruta, 3 Meteorología, 4 Resultado, 5 Salida**. En un teléfono, la barra superior muestra un paso cada vez
(toque un número para ir a él, «Siguiente» al pie de cada paso); en una pantalla ancha, los cinco pasos están uno debajo
de otro. Todo se recalcula con cada cambio: corrija la ruta, y la meteorología, el cálculo y el viento siguen, sin botón
que pulsar. El resultado (combustible de bloque, combustible de viaje, tiempo, inicio del descenso) sigue visible abajo
en la pantalla en cada paso, con la procedencia del viento («viento: METAR LFRS», «viento: previsión ICON FL060»,
«viento introducido»). En un teléfono esta barra ocupa tres líneas: el contexto
(«FA50 · F-GXXX · Bloque · FL060→090→110→070 · viento ARPEGE FL060»: primero la aeronave del cálculo, «estimación del tipo» cuando ninguna ficha sirve, y un toque sobre ella abre la elección de la aeronave; luego la unidad del combustible, «lb · lb/h»; completo al tocar la línea), el combustible de bloque y tres teselas
«Etapa», «Tiempo» y «TOD» (inicio del descenso). La pantalla se abre siempre en la pestaña «Cálculo»; las fichas se abren
con la pestaña «Fichas». Una ✓ marca un paso completado. Los niveles se escriben igual en todas partes: en FL a partir de
5000 ft (FL060), en pies por debajo (3500 ft).

**La misión.** Un vuelo preparado desde una misión lleva, arriba en la pantalla, la etiqueta «Misión <ID>»: abre la ficha de la misión sobre el paso (primero los riesgos, luego el resumen, los objetivos, los equipos y las zonas, cada una en el mapa), sin salir del paso; la cruz la cierra.

**Puntos impuestos por la misión.** Los encuentros, el objetivo y la fuente (carga de agua) de una misión son puntos impuestos de la ruta: en la lista de puntos llevan «impuesto por la misión» y no se suben, bajan ni quitan; si el texto de la ruta pierde uno, se vuelve a poner al salir del campo. Los demás puntos (tránsito) son suyos: añada o quite libremente los suyos entre ellos.

**Vuelo nuevo.** El botón «Nuevo vuelo», arriba en la pantalla, borra el vuelo en preparación (salida, llegada, ruta, procedimientos, nivel, OFP), tras una pregunta si ya contiene algo o está iniciado; la aeronave se queda. Cambiar un aeródromo por otro a más de 150 NM, o cambiar la salida y la llegada, también forma un par nuevo: se borran la ruta, los procedimientos y el OFP del vuelo anterior, y la pantalla lo dice. Un aeródromo cercano (una corrección) solo sustituye al anterior en la ruta.

<a id="fuel-step-1"></a>**1 Vuelo.** La aeronave va primero en el paso: sin ella no se calcula nada. La salida, la llegada y la alternativa (códigos OACI), la fecha del vuelo si quiere la previsión (TAF) en
lugar de la observación, la aeronave y el nivel de crucero (en FL); «Auto», junto al nivel, toma el que menos combustible consume en la ruta entre los niveles de la regla semicircular (hasta el techo de la ficha), dice «auto» y el tiempo de vuelo bajo el campo, y lo sigue cuando cambian la ruta, la aeronave o el viento, hasta que escriba un nivel. Bajo cada código, una línea fija da el nombre del aeródromo para comprobarlo (« LFPO — Paris-Orly »; « desconocido » si el código no corresponde a nada). «⇄», entre la salida y la llegada, las invierte: es un nuevo par de aeródromos, se borran la ruta, los procedimientos y el OFP del vuelo de ida. Desde dos caracteres, un código, el comienzo de un nombre, una ciudad o un país (« LFP », « orly », « stockholm », « suecia », « usa »), el campo propone siete aeródromos como máximo: ↑ ↓ para elegir, Intro para validar, Esc para cerrar, o un toque; la lista se cierra al salir del campo, y escribir el código entero a mano funciona siempre. El nombre puede escribirse entero («toulouse»): solo un código elegido o tecleado entra en la ruta, y un campo que se deja sin elegir vuelve al aeródromo guardado. La fecha del vuelo (introducida en la hora local del dispositivo) es un único valor, guardado en el vuelo actual: la meteorología del cálculo (TAF de los aeródromos, vientos y temperaturas en altura) se lee a esa fecha, el ETA del mapa parte de ella mientras el vuelo no ha empezado, y el deslizador de Meteo parte de ella; vacío significa ahora. La aeronave cabe en una línea: la aeronave elegida,
su matrícula, su indicativo y de dónde viene. Un vuelo nuevo toma la última aeronave elegida en este
dispositivo; sin elección, el cálculo espera. «Cambiar», justo después de la aeronave, abre la búsqueda (la última elegida primero): escriba una ficha, una matrícula, un indicativo
o un tipo. Los resultados llegan en este orden: sus fichas de rendimiento, las aeronaves de la aerolínea (su flota,
luego las conocidas por su diario), los tipos publicados y, en último lugar, el código tal como se escribió. Una
aeronave de la aerolínea toma su propia ficha si la tiene, si no la de su tipo, si no una estimación del tipo — el
cálculo la marca entonces «aproximado». La matrícula y el indicativo elegidos siguen al vuelo hasta el informe. La línea
«Crucero» indica de dónde viene el consumo; leído en la tabla régimen / consumo de la ficha, dice las dos filas de régimen y, cuando la tabla tiene varias altitudes, las dos curvas entre las que se interpola el nivel («2400 rpm entre 2300 y 2500 rpm, entre las curvas de 4000 y 8000 ft»). La tabla solo sirve si dos de sus filas con consumo enmarcan el régimen de crucero (o una fila está en ese régimen): si no, cuenta el consumo de crucero escrito en la ficha, nunca la fila más cercana prolongada.

Junto a la fecha, el reloj «+30» pone el vuelo dentro de 30 min (redondeado a 5 min; cada pulsación añade 30 min) y
«Ahora» vuelve a la hora actual: la meteorología de los aeródromos (el TAF si cubre esa hora) y los vientos en altura se
vuelven a leer en el acto.

<a id="fuel-theme"></a>**Familia y serie.** Bajo la fecha, «Familia» y «Serie» dicen lo que va a hacer: un vuelo de carga, de pasajeros, de ensayo, una misión SAR… Opcionales, las rellena la misión que prepara y solo proponen las familias de su compañía (una compañía comercial: CAT · Transporte aéreo comercial). El informe las toma y puede cambiarlas: olvidadas aquí, se eligen allí.

<a id="fuel-step-2"></a>**2 Ruta.** Escriba la ruta en el campo «Ruta» (Intro la valida), siempre visible: los puntos, las aerovías y los Un tramo directo se vuela a rumbo: su distancia y su rumbo son los de la loxodrómica, la línea recta del mapa. Cuando un directo a rumbo supera en más de un 2 % el círculo máximo (un trayecto largo en un solo tramo), una línea bajo la ruta lo dice: añada puntos intermedios, por ejemplo con «Calcular A → B». Cada punto de la lista puede llevar un tiempo en zona (⏱, en minutos): el presupuesto lo cuenta, una línea por punto, al consumo de espera de la ficha (si no, al crucero del nivel del punto), y las horas de los puntos siguientes se desplazan otro tanto. Preparado desde una misión, se toma el tiempo en zona de sus puntos; un intervalo («5 a 40 min») cuenta su máximo por defecto, y usted cambia el valor; una duración que la misión escribe de otro modo se dice («duración no leída»).
niveles, como en un plan de vuelo («LFBO/32L TOU UN460 NTS/F280 LFRN/28»). También puede pegar ahí un plan de vuelo OACI o la
lista de un OFP. Al salir del campo, la ruta se pone en limpio: en mayúsculas en una línea, sin DCT ni grupos
velocidad-nivel, la salida y la llegada en los extremos, un cambio de nivel escrito «/F280» tras el punto donde empieza.
Las aerovías siguen escritas (el cálculo sigue los puntos). Los puntos desconocidos se quedan en su sitio y se señalan
justo debajo; las coordenadas se escriben a la manera OACI («4530N00030E»). La línea siguiente da la distancia y el
rumbo verdadero, y de dónde vienen (la ruta, el OFP de SimBrief). Si la ruta no se resuelve, «Introducir a mano» abre
los dos campos. Con su identificador SimBrief configurado (⚙), «Último OFP de SimBrief» retoma de una vez la ruta, el
nivel, el viento medio y la aeronave de su último plan.

**Calcular y comprobar la ruta.** En un puesto cuyo lanzador lleva el cálculo de ruta, aparecen dos botones bajo el campo (si el lanzador se ha detenido desde entonces, el toque lo dice, «Disponible con el lanzador del puesto (no responde)», con «Reintentar»): «Calcular A → B» propone itinerarios de un aeródromo al otro (los puntos que escribió son pasos impuestos), con su longitud, el FL mantenido y el número de desviaciones de las reglas; tocar un itinerario lo muestra (resaltado aquí y en el Mapa, su detalle desplegado) sin tomarlo; «Elegir» escribe su ruta, su SID y su STAR. «Comprobar» analiza la ruta escrita tal cual: los segmentos erróneos se ponen en rojo en la lista de puntos con su motivo (RAD, FRA, suelo, techo…), y su número aparece en la barra de resultado; «N desviaciones de las reglas» se despliega en una línea por desviación: el segmento, la regla (el identificador RAD o FRA) y la frase del motor. Un itinerario cuyo control está incompleto por falta de datos se marca «control incompleto»: no está validado ni en desviación. Cada itinerario dice también su parte controlada: «controlado 22 % · incompleto 65 % · respaldo 14 %» («respaldo»: un tramo que el motor unió sin poder controlarlo), y un pliegue lista sus tramos por capa (SID, FRA, aerovías, STAR). Cuando no se puede calcular ningún itinerario, lo que el motor encontró viene aparte, bajo «Propuestas no validadas»: nunca dichas controladas, a verificar si toma una. Cada tramo dice su naturaleza con el trazo del Mapa: aerovía (continuo), DCT (discontinuo), FRA (punteado), SID, STAR, aproximación; «Leyenda», bajo la lista, las muestra todas. Los itinerarios se dibujan en el Mapa: junto al Combustible en una pantalla grande, o con «En el mapa»; tocar un trazado también lo muestra, la lista se queda. Su escritura nunca se sustituye sin «Elegir». Sin RAD importado en el puesto, un enlace lleva a su línea en Datos para importarlo. Es un precontrol de simulación, no una validación IFPS. «Elegir» toma el itinerario y cambia la ruta: las demás propuestas desaparecen al instante, aquí y en el mapa, y una línea dice el itinerario elegido. Desde la pulsación, los dos botones quedan ocupados y «Calculando…» cuenta los segundos a partir de dos; una segunda pulsación no lanza nada. Un cálculo de más de 3 s se indica bajo la lista, con su mayor parte («Calculado en 7,4 s — de ellos 6,8 s en el lanzador») y «Copiar el diagnóstico»: las duraciones, en milisegundos, para adjuntar a un aviso.

**Las propuestas se quedan.** Las rutas propuestas por «Calcular A → B», y aquella cuyo detalle está abierto, se quedan al pasar al Mapa, cambiar de pantalla o recargar la página, sin nuevo cálculo; se dice su hora («Calculado a las 14:32Z»). Se van al tomar una ruta, tocar «Cerrar las propuestas», lanzar un nuevo cálculo o cambiar la salida, la llegada o la aeronave. Al cambiar el ciclo AIRAC, si la base aeronáutica cambió desde entonces, o al día siguiente para una ruta por los NAT, se dicen «caducadas», con «Recalcular», sin desaparecer.

**Puntos NAT.** Un punto de las rutas del Atlántico norte se escribe como en el mensaje del día: «51/20» (51° N 020° W), «5030/30» (50° 30' N 030° W); se lee como una coordenada y se guarda tal como está escrito. Fuera del Atlántico norte, la barra conserva su sentido habitual (un punto y su nivel o su pista).

El botón «Auto» junto al campo «Ruta» inscribe las aerovías entre los puntos: para cada pareja de puntos con nombre que se
siguen sin aerovía entre ellos, busca el camino más corto por las aerovías de la base publicada, abiertas al nivel previsto
(suelo y techo de cada tramo, con 100 ft de margen; sin nivel previsto, 6 500 ft, y una notificación lo dice), con entrada y
salida directas a 60 NM como máximo y sin desvío de más del 40 %. El texto pasa a «LFRS TSA01 UT460 TSA05 LFML»; los puntos
intermedios de la aerovía, que el texto no escribe, se guardan en los puntos (la distancia, el mapa y el perfil los siguen).
Una notificación da el resultado («3 aerovías inscritas, 254 NM») o «Ninguna aerovía útil entre X y Y». Límites: las aerovías
se toman en los dos sentidos (la base aún no lleva el sentido único), sin restricción fina de nivel ni SID / STAR; la ruta
sigue por verificar. «Auto» parte siempre de los puntos fijados —la salida, el final de la SID elegida, los puntos que usted escribió, la entrada de la STAR, la llegada— y sustituye lo que un «Auto» anterior había escrito: dos «Auto» seguidos dan el mismo texto, nunca una ruta que crece en bucle. Un tramo que pasaría dos veces por un punto, o que alargaría demasiado el conjunto, queda directo, y la notificación dice por qué («ninguna aerovía cerca de LACOU», «desvío de más del 40 %»). Cuando el nombre de la SID está en el texto, su final se escribe después («LFBO LACOU7B LACOU …») y el tramo del final al primer punto se rutea. Una aerovía que usted escribe entre dos puntos («GILUX A3 MOTAL») se lee siempre como aerovía, nunca como un punto del mismo nombre en otro lugar; solo se sigue si une de verdad esos dos puntos; si no, el tramo queda directo y una línea lo dice («A3 no une GILUX con MOTAL: tramo directo»). El texto de la ruta sigue sus procedimientos, en forma OACI: el nombre de la SID y luego su final tras la salida, la entrada y luego el nombre de la STAR antes de la llegada, «DCT» entre dos puntos sin aerovía («LFRS NTS1A NT102 DCT LUGEN … MEN01 MEN1A LFML»); la aproximación nunca aparece. Cuando el final de la SID no está en su ruta, una línea dice que se une por un directo («NTS1A sale por NT102: NT102 DCT LUGEN»). En sentido inverso, el texto se relee: escribir el nombre de una SID de la salida o de una STAR de la llegada la elige, borrarlo quita la elección. En la lista «Puntos (N)», cada procedimiento elegido es una sola fila plegada, en su color del mapa («SID NTS1A · 2 puntos», «STAR MEN1A via NEPIX · 4 puntos»): sus fijos se muestran con un toque, nunca al nivel de los puntos que usted escribió; el número cuenta sus puntos y estas filas. Cuando una aerovía une dos puntos pero no está abierta al nivel del tramo, la línea la nombra con su banda abierta, para que usted decida («A34 une LACOU con LMG, cerrada a FL260 (abierta de 6 500 ft a FL195): tramo directo»); «Auto» nunca la sigue de todos modos. Al escribir en el campo, desde dos caracteres de la palabra bajo el cursor, una lista propone (siete como máximo) las SID de la salida y las STAR de la llegada, las aerovías alrededor del punto anterior, los puntos y radioayudas de la base: ↑ ↓ y Intro, o un toque, escriben la palabra en el cursor; Escape cierra la lista. Las listas del paso se quedan, para el teclado y los lectores de pantalla.

El desplegable «Puntos» enumera los puntos reconocidos, de la salida a la llegada. Las flechas suben o bajan un punto en
la lista, la cruz lo quita; el campo de abajo añade uno antes de la llegada: un identificador (radioayuda, punto,
aeródromo) o «NOMBRE latitud longitud». Cada punto intermedio tiene un campo de nivel opcional, en FL: es el nivel
mantenido a partir de ese punto, para un ascenso o un descenso por escalones. Un punto sin nivel continúa el anterior
(mostrado en gris); el vuelo sale al nivel del plan. El cálculo cuenta cada escalón (su ascenso o su descenso, luego el
crucero a ese nivel), el resultado muestra la sucesión de niveles (FL100 → FL120), y el descenso parte del último nivel.
Cada cambio reescribe el campo «Ruta» y se transmite de inmediato al mapa; una aerovía escrita se mantiene mientras los
dos puntos que la enmarcan sigan siendo vecinos y en su sitio.

«Mostrar el mapa» muestra el vuelo en el mapa: en un teléfono se abre el Mapa (el botón de la cabecera devuelve aquí);
en una pantalla ancha se abre al lado y sigue cada cambio. «Editar la ruta» en el mapa devuelve a este paso, con el
campo de la ruta listo para escribir. En una pantalla ancha, pasar el puntero sobre un punto de la lista de la ruta lo resalta en el mapa con sus dos tramos, sin mover el mapa.

**Pista, SID, STAR y aproximación.** Al final del paso Ruta, una tarjeta «Procedimientos» lleva un lado Salida y un lado Llegada, uno solo abierto a la vez. La cabecera de un lado nombra el aeródromo («Salida LFPO Paris-Orly») y lleva un solo gesto, «Elegir en el mapa» (bajo el nombre en un teléfono): el Mapa se abre sobre los procedimientos del aeródromo; lo que allí se elige —pista, procedimiento, aproximación— vuelve aquí de una vez, aplicado como una elección hecha aquí y anunciado en una sola línea; una familia que el Mapa no toca queda como estaba. Plegado, un lado se lee en una frase y una marca: «✓ pista 13R · MEN1A · ILS 13R» (completo), «!» mientras una línea espera su elección, «⌛» cuando todo está elegido sobre procedimientos de un ciclo pasado. Abierto, tiene tres líneas —Pista, Salida (SID) o Llegada (STAR), y Aproximación en la llegada—, cada una con su valor en palabras («13R — de cara 12 kt · cruzado 1 kt», nunca una flecha sola), su fuente en pequeño («METAR de las 13:54 Z, 130° / 12 kt», el enlace «Carta» del procedimiento elegido cuando la base conoce su carta oficial) y un botón «Cambiar» a la derecha, que abre la lista de esa línea solamente, en su sitio («Cerrar» la cierra). En la línea de un procedimiento, «Carta» abre su carta dibujada y «Datos» su página de datos (la tabla del AIP) cuando la base la conoce; una «carta» que solo es la página de datos no se llama «Carta». La aproximación se dice en palabras («ILS 13R», aunque la base la llame «I13R»), con el indicativo y la frecuencia de su radioayuda cuando la base los tiene («TST 110,30», la línea completa —eje, DME— al pasar el puntero). La lista de pistas pone en cabeza la mejor orientada («la mejor orientada»), luego las demás por viento de cara decreciente, marca el viento de cola («viento de cola») y deja al final una pista que ninguna salida (llegada) publicada sirve («ninguna salida publicada»). Cuando la pista elegida no es la mejor orientada, su línea pasa a aviso («31L — de cola 12 kt») con «Tomar la 13R (viento de cara)». Al pie, plegado, «Fuente y cartas»: la fecha de la lectura («leído el 29/10 16:53Z») y «Releer», las páginas sin leer, la lectura del suelo, «Todas las cartas del aeródromo» (la página del aeródromo en el AIP oficial de su Estado —eAIP del SIA, ENAIRE, AirNav Ireland— en una pestaña nueva; nada para un Estado cuyo AIP la base no conoce). Un aeródromo sin procedimiento leído muestra su línea de lectura, siempre visible. La misma tarjeta una vez iniciado el vuelo, en el paso Salida. Cada lista viene de aerodb y muestra todos los procedimientos del aeródromo en una sola lista ordenada por pista y luego por nombre (la pista figura en el texto solo si no hay pista elegida y el procedimiento sirve solo una: «OPALE 2E» una vez elegida la pista). Nada está prohibido: un procedimiento en conflicto con su elección se marca con ⚠ (una SID, STAR o aproximación que no sirve a la pista elegida; sin pista elegida, una STAR que no sirve a ninguna pista de la aproximación elegida; el motivo está en la información emergente — una STAR que no enlaza con la aproximación no es un conflicto: el Mapa las une con un trazo discontinuo) y aun así puede elegirlo — el ⚠ y la información emergente bastan, ninguna notificación lo repite. ⌛ (gris) significa caducado, ⚠ (naranja) en conflicto. En cada lista, lo compatible con su elección va primero y los ⚠ después; en la lista de pistas van primero las de la SID o la aproximación ya elegida. Un procedimiento que la fuente no supo leer bien (sin nombre o dudoso) nunca se ofrece: la línea discreta del lado dice cuántos no se leen («3 sin leer»: las páginas no leídas y los procedimientos por verificar del archivo leído). Si los datos del aeródromo no traen ninguna ficha de pista, las pistas ofrecidas son las que nombran sus procedimientos. Cada pista lleva el viento del METAR conocido del aeródromo (el del paso Salida): «13R — ↓ 12 kt · ← 6 kt»: la flecha muestra hacia dónde sopla el viento, con la pista vista hacia arriba como en final (↓ de frente, ↑ de cola, ← viento de la derecha, → viento de la izquierda). En verde un viento de frente; en naranja un viento de cola de hasta 5 kt o un cruzado de más de 10 kt; en rojo un viento de cola de más de 5 kt o un cruzado de más de 20 kt (o del límite de la ficha de la aeronave cuando la tiene); la razón en la información emergente. Sin METAR, no se muestra nada. El título de cada lado termina con el resumen de la elección, el mismo texto que el panel del Mapa: «13R · ↑ 12 kt», «MEN1A via NEPIX», «I13R» («SID ninguna» para una salida sin SID). Elegir una STAR o una aproximación que sirve una sola pista fija esa pista; una STAR ofrece sus transiciones, una aproximación sus transiciones de aproximación. Una aproximación se lee corta, su tipo y su pista («ILS 06», «RNP 06»; el nombre publicado en la información emergente). Una aproximación ILS dice, bajo la lista, la ayuda que la base lleva: «ILS 25 · DO 109.35 · eje 246° · DME» (indicativo, frecuencia, eje); nada cuando la base no la lleva; el resumen plegado de la llegada conserva su indicativo y su frecuencia («I13R · TST 110.30»). Los segmentos de aproximación inicial que el SIA publica aparte («INA RNAV RWY 06») nunca son filas: son las transiciones de todas las finales de su pista, «via ODILO 1A» (el IAF y luego el nombre publicado), y «—» sigue siendo el directo al IF. La primera opción, «—», significa «no elegido»; «ninguna» es una elección real (una salida directa, sin SID). Un procedimiento del respaldo X-Plane del puesto va el último, marcado «X-Plane, local»; uno leído en un ciclo anterior se marca ⌛ (volver a leer). En un aeródromo sin procedimiento publicado, la línea discreta lo dice («ningún procedimiento publicado · Leer los procedimientos de LFXX»): un aeródromo por gesto, nunca en silencio. Si el Estado no publica sus procedimientos en tablas (imágenes, solo etiquetas…), la línea lo dice y propone Navigraph y ChartFox en lugar de una lectura abocada al fracaso; un Estado legible bajo demanda ofrece «Leer bajo demanda». Cuando falta la zona de la base (no instalada, por reconstruir, o sin puntos ni aerovías), la misma línea lo dice, ofrece «Añadir» o «Actualizar» en Datos y cita los recursos de este equipo: Little Navmap si está, Navigraph, ChartFox. Un aeródromo que ya tiene procedimientos muestra, en esa misma línea, la fecha de su última lectura («leído el 29/10 16:53Z», ⌛ si es de un ciclo anterior) y luego «Releer»: el mismo gesto, que sustituye el archivo leído. La misma línea dice cómo está el suelo del aeródromo (calles de rodaje y estacionamientos, leídos con sus procedimientos, para el Mapa): «Leyendo el suelo…», «Suelo leído», o «Suelo no leído» y por qué, con «Reintentar», que vuelve a leer solo el suelo; son las palabras del panel Suelo del Mapa. Un aeródromo francés se lee en el eAIP del SIA, sin cuenta; un Estado cuyo AIP publica tablas de procedimientos, en EAD Basic (credenciales configuradas en el puesto); para cualquier otro Estado, el mensaje dice que no hay ninguna tabla publicada. Sin lanzador, o en un dispositivo emparejado con el puesto, la lectura se hace en el puesto —el mensaje lo dice— y el OFP de SimBrief sigue siendo la fuente del vuelo. Una vez elegidas la SID y la STAR, el cálculo corre sobre el camino «ruta + procedimientos» (con la distancia de la SID y la STAR) y el Mapa los traza con sus altitudes y velocidades; sus restricciones de altitud no entran en los escalones del cálculo, se leen en el perfil vertical, que mantiene el crucero hasta que debe empezar el descenso y ya no vuelve a subir una vez empezado. «Último OFP de SimBrief» propone su SID y su STAR solo para los lados que aún no ha elegido («ninguna» es una elección): nunca sustituye su elección y dice lo que ha rellenado, una línea por lado («Llegada: STAR — → LERG1R»). Las elecciones hechas seguidas se escriben una sola vez, un momento después de la última. La tarjeta se abre plegada, para leerse sin desplazarse: una línea de resumen por lado («Salida LFRS · 03 · NTS1A», con «En el mapa»); un toque en la línea, o en ▸, despliega sus listas y su línea secundaria («Releer», «Cartas»), un lado a la vez. Un lado sin procedimientos queda desplegado: su línea ofrece la lectura. Con un METAR de viento dirigido (3 kt o más), la pista del viento de cara más fuerte se dice primero — «Pista probable: 31L (METAR 1230Z, viento 310/12)» — con «Tomar la pista probable»; nunca se pone sola, y no se dice nada con viento en calma o variable. Cuando la compañía vuela en IVAO o VATSIM y usted tiene su identificador en esa red, el ATIS del aeródromo se lee al abrir el paso (y con «Leer la meteorología de los aeródromos»): «Pista en servicio: 25 (ATIS VATSIM, información F, 1655Z)» aparece primero, con «Tomar la pista del ATIS»; la línea del METAR sigue cuando dice otra cosa. Solo se toman la pista, la letra y la hora, y solo de una expresión reconocida («ARR RWY 25», «RWY IN USE 25»…) para una pista que existe; un ATIS de más de 90 min, o que se contradice, no se dice. La ruta también se puede pegar en el formato de los planes de vuelo de las herramientas, con la pista: «LFPO/07 OPAL2E OPALE DCT … LFML/31R» fija la pista de salida, la SID, la STAR y la pista de llegada; una pista elegida se escribe igual tras su aeródromo. Una pista que el aeródromo no tiene se indica y no se elige nada; borrar «/07» quita la pista, y se dice. Un grupo de velocidad y nivel al principio («N0450F350») se ignora, y se dice: el nivel sigue siendo el del paso Vuelo.

**Aproximaciones a comprobar.** Una aproximación cuya lectura es dudosa (filas de la tabla de codificación no leídas, una geometría que no cuadra…) se propone igualmente, marcada «⚑ a comprobar», su razón en la información emergente: puede elegirla a mano, nada la elige por usted. Las aproximaciones que el AIP solo da como carta (sin tabla de codificación) se dicen bajo las listas, «Solo carta en el AIP», cada una con su carta. Elegida, una aproximación a comprobar dice su motivo en una línea bajo la lista, y el resumen plegado de la llegada lleva «⚑». Tras las aproximaciones codificadas, cada aproximación que el AIP solo da en carta tiene su línea («NDB RWY 13L — solo carta en el AIP · carta»): se lee en su carta, no se elige. Una aproximación de la que la base solo tiene el tramo final (FAF y umbral) se dice «— solo tramo final». «Ninguna aproximación publicada» solo se dice cuando el AIP realmente no publica ninguna.

**Procedimientos leídos de Little Navmap.** Un procedimiento leído en la base de Little Navmap de este equipo lleva «Little Navmap, leída en este equipo» en la lista; elegido, una línea de aviso lo repite bajo las listas («⚠ Leída de Little Navmap en este equipo, para su uso personal») y la línea de resumen del lado lleva «⚠ Little Navmap», también plegada. Se queda en este equipo: el vuelo solo guarda su nombre, ninguno de sus puntos. Los archivos para X-Plane y MSFS lo llevan como los demás procedimientos.

**Leer desde Little Navmap.** Para un aeródromo sin ningún procedimiento en la base (KDEN, por ejemplo), en un equipo donde el lanzador encontró una base de Little Navmap, «Leer desde Little Navmap» lee sus procedimientos en esa base, a través del lanzador. Antes hay que marcar el uso personal en Datos › Fuentes con licencia personal; si no, una línea lo recuerda y no se lee nada.

**Niveles y puntos de los procedimientos.** Cuando los puntos de la ruta llevan un nivel («/F180») y el plan otro, una línea bajo el nivel lo dice con el ascenso y el crucero que resultan («Puntos a FL180, plan a FL320: 0:36 de ascenso para 0:09 de crucero»); «Alinear los puntos con el plan» quita los niveles de los puntos. En la lista de puntos, cada punto de una SID, una STAR o una aproximación elegida tiene su campo de nivel: un nivel puesto lo sigue el perfil (y el Mapa); por encima del techo de la ficha, o demasiado pronunciado para alcanzarlo, se rechaza y la pantalla dice por qué. Un nombre de la ruta que ninguna base conoce pero que lleva el procedimiento elegido (BEPAN de la BEPA4E) toma la posición del procedimiento; si sigue desconocido cerca de un aeródromo en torno al cual la base no tiene ningún punto publicado, la línea lo dice. Un nombre que llevan varios puntos (homónimos) toma el más cercano al punto anterior (un código de aeródromo sigue siendo el aeródromo), y la línea bajo la ruta lo dice, igual que un salto de más de 1 000 NM de un punto al siguiente. Un nombre cuyo único lugar conocido está muy lejos de la ruta (más del doble de la distancia directa, más 400 NM) no se coloca: la línea lo dice, y la base de su zona quizá esté incompleta. Un punto desconocido dice el estado de su zona: base no instalada («Añadir»), falta el archivo del ciclo («Actualizar») o una fuente sin puntos ni aerovías. Una STAR publicada una vez por pista sigue la pista elegida.

**Un aeródromo nunca es un punto de la ruta.** Si el texto de la ruta empieza todavía por la antigua salida tras un cambio de aeródromo (o termina con la antigua llegada), ese aeródromo no se lista, «Auto» no lo enruta ni se vuelve a escribir: el vuelo sale siempre de su salida. Otro aeródromo en medio de la ruta se queda (una ruta VFR puede pasar por uno). En la lista de puntos, un nombre de la ruta que ninguna base conoce se queda en su sitio, sin posición, con su motivo («desconocido en la base», o «ningún punto publicado alrededor de EIDW» cuando falta la zona): la lista muestra toda la ruta, nunca menos.

<a id="fuel-step-3"></a>**3 Meteorología.** El viento (dirección e intensidad) y la desviación ISA. Sin dirección, o sin viento alguno, el
combustible de bloque se da como horquilla. El viento se cuenta tramo a tramo, con el rumbo de cada uno (el viento previsto en sus dos extremos cuando se ha leído, si no el del vuelo), con la deriva: un fuerte viento cruzado también frena; la barra de resultado dice «viento por tramo». «Leer la meteorología de los aeródromos» muestra la salida, la llegada, el
alternativo y los aeródromos a lo largo de la ruta: todos los que están a menos de 10 NM a cada lado de la ruta (radio
ajustable en los ajustes del cálculo) y tienen un METAR o un TAF; los demás se ignoran. Cada aeródromo indica su
distancia desde la salida (el alternativo, desde la llegada); si son más de dos, los aeródromos intermedios quedan
plegados bajo la salida, la llegada y el alternativo. Para cada uno, lo que cuenta para el vuelo: la categoría (VFR,
MVFR, IFR, LIFR, en color), el viento y sus componentes de cara y de costado en la pista principal del aeródromo (el
sentido más cercano al viento), el techo de nubes, la visibilidad, la temperatura y el QNH, y un aviso cuando se
anuncian CB o TCU; el mensaje bruto está plegado. Con una fecha de vuelo, responde el TAF si cubre esa hora (y sus
cambios temporales), si no el METAR. Marque «Meteorología real» para que el viento del cálculo pase a ser la media de
los vientos de los aeródromos de la ruta (salida, aeródromos intermedios, llegada), tramo por tramo y ponderada por su
longitud — una aproximación a partir del viento en superficie, indicada bajo los campos. Sin conexión, los últimos
valores leídos siguen mostrados con su hora.

«ISA ±» es la desviación de temperatura respecto a la atmósfera estándar, en °C: cambia la potencia disponible, la
velocidad verdadera y el techo. Una vez leída la meteorología, la línea de debajo la calcula a partir del METAR de la
salida — su temperatura menos la temperatura estándar del aeródromo (15 − 1,98 × elevación del aeródromo en miles de
pies) — y «Usar ISA …» la lleva al campo. La desviación elegida se guarda en sus ajustes: el vuelo siguiente parte de la
misma. Una vez leída la previsión en altura, una segunda línea propone la desviación al nivel planificado, promediada a
lo largo de la ruta («ISA −5 a FL060 según la previsión ARPEGE»); con «Meteorología real», el cálculo toma esa, como el
viento. «Leer la meteorología de los aeródromos» dice «Leyendo…» durante las consultas.

«Leer la meteorología de los aeródromos» lee también la previsión en altura (Open-Meteo, sin clave, con o sin lanzador)
en los puntos de la ruta: la tarjeta «Vientos y temperaturas en altura» da, para cada punto, el nivel planificado
(incluidos sus escalones), el viento, la temperatura y la desviación ISA a ese nivel, con el modelo (Météo-France AROME
/ ARPEGE sobre Francia, ICON en el resto de Europa, GFS más allá), la hora prevista (la fecha del vuelo, si no ahora) y
la hora de la pasada. Con «Meteorología real», el viento del cálculo pasa a ser la media de esos vientos al nivel
planificado, a lo largo de la ruta, en lugar del viento en superficie de los METAR; la línea bajo los campos lo indica.
Los mismos vientos van al Mapa, que los dibuja como flechas. Sin conexión, se mantiene la última previsión leída. Cuando
cambian la ruta o la hora, el viento en altura anterior se mantiene, marcado «previsión en curso…», hasta la nueva
previsión; si no llega, el viento en superficie de los METAR toma el relevo y se indica («previsión en altura no
disponible»).

<a id="fuel-step-4"></a>**4 Resultado.** El dibujo muestra, para cada nivel, el combustible del trayecto (línea continua) y su duración (guiones).
El punto verde marca el nivel más económico, el cuadrado naranja el más rápido; la zona gris, los niveles que no se
pueden mantener en este trayecto. Cada nivel se calcula como el cálculo, con el viento previsto a ese nivel cuando el tiempo real
está activado: en el nivel elegido, la curva y el cálculo dan la misma cifra. En una ruta con escalones, cada punto de la curva es un vuelo a nivel constante en su nivel, sin los escalones: el rombo negro marca el cálculo real del plan (con los escalones de la ruta y el viento del plan), indicado bajo el dibujo («Plan: FL160, 856 kg, 0:54»); su distancia a la curva es el coste de los escalones. El eje del combustible sigue la unidad elegida (kg o lb). Toque la curva para elegir un nivel, o use los dos botones. «Ascenso» elige la forma
de subir: económico, mejor régimen, rápido, a la velocidad de la ficha, o manual (usted da velocidad y régimen de
ascenso).

El desplegable «Altitud de densidad» muestra, con la desviación ISA en abscisas, la altitud de densidad de cada altitud
de presión (una recta por cada mil pies): es la altitud que «sienten» el rotor, las hélices y el motor. La línea
vertical es la desviación del vuelo, la horizontal el techo de la ficha; su cruce indica a qué altitud de presión la
aeronave alcanza su techo ese día (recta en negrita). Un punto marca la salida según el METAR (temperatura y QNH).
Importante para los helicópteros: con mucho calor o en altura, el techo real puede caer muy por debajo del de la ficha.

Bajo el ábaco, «Atmósfera real en la salida» muestra la temperatura prevista a cada altitud sobre la salida (línea
continua) frente a la atmósfera tipo (guiones): donde la curva se aparta de ella, la desviación ISA cambia con la
altitud, y las capas de inversión (la temperatura que sube con la altitud) se resaltan y se indican debajo. La línea de
lectura da, al nivel planificado, la temperatura, la desviación ISA y la altitud de densidad reales.

El título de «Consignas de ascenso» dice el régimen de ascenso de la ficha («Ascenso: 8000 rpm») cuando lo tiene. Despliéguelas para seguir el ascenso hasta el nivel: potencia, régimen, velocidad, régimen de
ascenso, flujo, Mach, tiempo y combustible acumulados en cada escalón, con el perfil dibujado. El resultado da
combustible de bloque, combustible de viaje, tiempo de vuelo y distancia del inicio del descenso antes de la llegada.
«Detalle del cálculo» lo desglosa fase por fase.

«Abrir en» prepara el mismo vuelo en otro lugar, en una pestaña nueva: SimBrief (opciones del vuelo prerrellenadas, se
requiere sesión en SimBrief), SkyVector (la ruta trazada, con velocidad y nivel), Navigraph y ChartFox (las cartas de
los aeródromos de salida y llegada, se requiere sesión). Una entrada en gris indica lo que le falta (aeródromo, tipo de
aeronave). No se envía nada que no esté ya en el vuelo. Los ajustes del cálculo (rodaje, reserva, margen, corredor
meteorológico, unidades, consumo de este vuelo) son el primer desplegable del paso Resultado, plegado; su título dice la unidad del combustible («Ajustes del cálculo · lb/h»).

<a id="fuel-alternate"></a>**Combustible de alternativa.** El combustible de bloque cuenta ahora la alternativa: rodaje + trayecto + contingencia + alternativa + reserva final. Su línea, en el «Detalle del presupuesto», da la distancia de la llegada a la alternativa, el nivel, de dónde viene la cifra (el consumo de alternativa de la ficha, o el modelo del trayecto) y el viento (el de la ruta cerca de la llegada, o «viento desconocido»). Sin alternativa introducida, o sin su posición, la línea lo dice y no se añade nada. El bloque de un vuelo con alternativa es por tanto mayor que antes: es lo previsto.

<a id="fuel-step-5"></a>**5 Salida.** Un resumen de una página: la aeronave, la ruta tal como se presentará, el nivel (y sus escalones), el

**Directo a un punto.** En un vuelo iniciado, cuando el control da un directo, escriba el nombre del punto en «Directo a…» del paso Salida (o toque «Directo a este punto» en el Mapa) y luego «Preparar el directo». El panel dice desde dónde parte el directo (su posición de menos de dos minutos, si no la posición prevista, si no el último punto pasado), los puntos omitidos y la diferencia (distancia, tiempo y combustible estimados); nada se escribe antes de «Aplicar el directo». Un punto fuera de la ruta se inserta y la ruta se reanuda en el punto siguiente (se puede elegir otro). Un punto impuesto por la misión que se omite se dice en rojo y pide una segunda confirmación; su tiempo en zona se retira del cálculo y el informe dirá «no sobrevolado: directo del control». Un punto de la ruta se pide por su nombre o por su nombre de misión («PT4»). Un punto fuera de la ruta se permite, aunque esté lejos: un aviso dice su distancia a la ruta. Solo se rechaza un punto ya pasado. «Deshacer el directo» devuelve la ruta anterior mientras nada más haya cambiado.

**Enviar este vuelo a mis dispositivos.** El vuelo en curso se guarda al momento en este dispositivo, pero no sale con el envío agrupado de los datos (cada cinco minutos como mucho): sus otros dispositivos (teléfono, tableta) solo lo reciben cuando lo envía. Mientras espera, el resumen lo dice y ofrece «Enviar este vuelo a mis dispositivos»; sale enseguida, y la línea dice «Vuelo enviado a sus dispositivos a las 17:52». «Sincronizar» también lo envía. Si no sale (sin conexión), una nota lo dice: queda en este dispositivo.

**Radioayudas.** Bajo el resumen, «Radioayudas» da de un vistazo el ILS de la aproximación elegida (pista, indicativo, frecuencia, eje, DME) y luego, plegados, los VOR / DME de la ruta en el orden del vuelo, cada uno con su frecuencia y el tramo donde sirve. Nada se inventa: sin ayuda en la base, la tarjeta lo dice.
viento y su fuente, el combustible de bloque. «Iniciar el vuelo» lanza el plan de vuelo (puesta en marcha, retroceso,
rodaje…). La preparación puede tener varios días: por eso empieza rehaciéndolo todo a la hora real — la fecha del vuelo
vuelve a ahora, la meteorología de los aeródromos y los vientos en altura se vuelven a leer, el cálculo se rehace — y
dice en una línea lo que ha cambiado («viento 273°/35 kt → 284°/44 kt · bloque 684 → 644 kg · llegada prevista 15:03Z (17:03)»);
sin conexión, lo dice y arranca con el último cálculo. Después anota la hora de salida, que pasa a ser la puesta en
marcha del informe. En un teléfono abre el Mapa, en una pantalla grande se queda aquí con el Mapa a la derecha. Cambiar
después el aeródromo de salida es preparar otro vuelo: la hora de salida se borra. Cambiar la llegada después de la
salida es un desvío: la hora se conserva y el desvío queda anotado.

Plan de vuelo para el simulador: bajo el resumen, tres botones — «.fms (XP 11/12)», «.fms (XP 10)» y «.pln (MSFS)» — descargan la ruta y los procedimientos elegidos (pista, SID, STAR, aproximación y sus transiciones) para X-Plane o Microsoft Flight Simulator, en un archivo llamado «LFPO-EIDW_2026-10-30.fms». La ruta necesita al menos dos puntos situados. Después copie el archivo en la carpeta «Output/FMS plans» de X-Plane (el envío directo llegará con el lanzador).

Una vez iniciado el vuelo, este paso lleva una tarjeta «Procedimientos»: nada está bloqueado: los lados Salida y Llegada siguen modificables en todo momento (otra salida es una salida nueva). Un cambio no rehace el cálculo: el combustible de bloque, el de trayecto y las reservas siguen siendo los de la salida; solo las horas en los puntos, el perfil vertical y la distancia restante siguen el nuevo camino. El botón «Cambiar» del Mapa abre Combustible en la línea de Llegada (`#fuel?focus=arr`): el paso Ruta antes del arranque, el paso Salida después.

Una vez iniciado el vuelo, el resultado al pie de la pantalla dice «Vuelo iniciado a las 11:14Z (13:14) · desde hace 1 h 10». Las horas están en UTC
(«Z»); la hora del dispositivo se añade entre paréntesis en la salida, el despegue y la llegada previstos. Un
vuelo iniciado termina al escribir su informe: al guardarlo, Combustible vuelve a la preparación y Mis vuelos quita «en
curso». Para volver a la preparación sin informe, «Anular la salida» (tras confirmación). La tarjeta «Progreso previsto»
muestra dónde debería estar el vuelo, en teoría: la hora prevista de paso por cada punto (rodaje, ascenso, crucero tramo
por tramo con su viento, descenso), el próximo punto resaltado, la distancia recorrida y la restante y el combustible
restante previsto. Sigue la hora, minuto a minuto, hasta el informe o la anulación, y pasa al Mapa con el vuelo. El
vuelo preparado aquí — aeronave, ruta, nivel, perfil de ascenso y de descenso — se comparte: Mapa e Informe ya lo
tienen.

## Fichas de rendimiento <a id="fuel-sheets"></a>

La pestaña «Fichas» empieza con la misma búsqueda de aeronave que el paso Vuelo (el campo «Ficha, matrícula, indicativo o tipo»: un resultado tocado pasa a ser la aeronave del vuelo). Luego lista las fichas de la compañía (primero las de los tipos de la flota de la compañía actual, las demás plegadas en «Otras fichas»; la búsqueda también da primero sus matrículas), compartidas con todos sus dispositivos, **en solo lectura**: se
modifican en Mantenimiento › Aeronaves, pestaña «Fichas». Están ordenadas por categoría (helicópteros, turbohélices,
reactores, pistón, otros); cada tipo que usa la compañía (flota, referencia) y aún no tiene ficha figura también,
«rendimientos por completar», con «Crear en Mantenimiento». Cada ficha dice lo que le falta, por familia («Por completar:
regímenes, velocidades, crucero, rodaje, pista»); «completa» cuando no falta nada; la del vuelo lleva «usada para este vuelo».

- **Usar**: elige esta ficha para el vuelo y vuelve al cálculo.
- **Modificar en Mantenimiento**: el nombre de la ficha y este botón abren su editor en la misma pestaña. Ahí se hacen la
  importación (archivo, texto pegado, respuesta de ChatGPT), los complementos EUROCONTROL, la vista previa campo por campo
  antes de escribir, el origen y la fecha de cada campo, las exportaciones `.lnmperf` y JSON y la eliminación.

## Ajustes y unidades

En «Ajustes del cálculo»: minutos de rodaje y de reserva, porcentaje de contingencia, y un flujo de crucero propio de
este vuelo (sustituye al de la ficha), escrito en la unidad del cálculo que dice su etiqueta («lb/h»). «Unidades mostradas» cambia el combustible (kg o lb), la velocidad, las
altitudes y las distancias en pantalla; los niveles siguen siendo niveles de vuelo, y nada cambia en las fichas. Las unidades mostradas y el radio meteorológico son ajustes de este dispositivo: no siguen en sus otros dispositivos (un teléfono puede mostrar km, el ordenador NM).

## Casos particulares

- **Sin ficha**: el cálculo se basa en una estimación del tipo, marcada «aproximado»; importe o cree una ficha en
  cuanto pueda.
- **Sin consumo conocido**: el cálculo lo dice en lugar de mostrar un cero engañoso.
- **Ruta desconocida**: se enumeran los puntos no reconocidos; la distancia y el rumbo verdadero se escriben a mano.
- **Sin conexión**: todo se calcula en el dispositivo, a partir de las fichas ya recibidas. Solo SimBrief y la
  meteorología esperan a la red; el último OFP y la última meteorología se quedan guardados en el dispositivo.
- **Meteorología sin lanzador** (un teléfono, una tableta): los METAR vienen entonces de metar.vatsim.net, sin nada que
  configurar. Los TAF (útiles cuando da una fecha de vuelo) vienen de avwx.rest, con su clave meteorológica personal,
  introducida una vez en el dispositivo en Ajustes, tarjeta «Clave meteorológica (TAF, avwx.rest)»; sin clave, la
  tarjeta lo dice y responde el METAR en su lugar. La tarjeta meteorológica indica de dónde vienen los mensajes. Sin red
  alguna, muestra la última meteorología guardada, con su hora.

<!-- fr: ddf7571d1e89 -->

<!-- chapter: maps -->
# Mapa

Ver su vuelo en una carta aeronáutica y su perfil vertical, o los mapas de una misión: espacios aéreos, aeródromos,
radioayudas, aerovías, altitudes mínimas. La ruta del vuelo también se modifica en el mapa.

## Cómo usarlo

**El vuelo previsto.** El mapa muestra el vuelo preparado en Combustible: salida, puntos de la ruta, llegada, y el
aeródromo alternativo en guiones grises. La pista, la SID, la STAR y la aproximación elegidas en Combustible se trazan sobre la ruta (SID en verde, STAR en naranja, aproximación en azul), con su nombre como en Combustible («ROYAN6P», «ILS 06»). Su resumen (nivel, distancia, previsto o en vuelo) no se escribe sobre el dibujo (el dibujo lo muestra): el texto emergente del asa del bloque de datos bajo el mapa lo da, con salida y llegada, alternativa y tipo de aeronave. Cuando el vuelo cambia en Combustible, el mapa lo sigue por sí solo.

**El mapa y lo que muestra.** Alrededor de la ruta: los espacios aéreos que atraviesa o roza (zonas restringidas,
peligrosas, prohibidas, espacios controlados), las aerovías bajas o altas según su nivel, los aeródromos y las
radioayudas, y en cada cuadro de un grado la altitud mínima de seguridad (la cifra marrón, en miles y centenas de pies:
«3⁵» quiere decir 3500 ft). Las pequeñas cifras violetas a lo largo de la ruta son las distancias desde la salida, en
millas náuticas. Deslice el mapa con un dedo, separe dos dedos para hacer zoom (durante el gesto el mapa conserva solo sus trazos — espacios, aerovías,
ruta con la SID y la STAR elegidas, aeródromos y radioayudas en pequeños círculos, los mismos que muestra en reposo — y sus nombres vuelven en cuanto se detiene); «Recentrar» (la diana, arriba a la derecha del mapa) vuelve a toda la ruta. El
mapa se queda donde usted lo puso, aunque la ruta cambie: solo «Recentrar» (u otro vuelo) lo reencuadra. Al volver al mapa (desde Combustible, o tras «Terminar»), recupera su encuadre
mientras la ruta y los procedimientos elegidos no hayan cambiado; si no, el vuelo se reencuadra, procedimientos incluidos. Mientras «Solo alrededor
del vuelo» esté marcada (Capas), los espacios y aerovías solo se leen cerca del vuelo, de lejos; desmárquela o acérquese
para verlo todo.

**La ruta ortodrómica.** En cuanto se conocen la salida y la llegada, el mapa traza el camino más corto entre ellas (el círculo máximo) con una línea de puntos fina, en el tono atenuado de la ruta y debajo de ella: la diferencia con su ruta se ve de un vistazo. Pase el ratón o toque la línea de puntos: la burbuja da su longitud en NM.

**Un directo del control.** Tras un «Directo a…» (Combustible), el mapa conserva la ruta original: la parte abandonada sigue en violeta, en trazo fino y pálido, y el directo se traza con un trazo continuo en oro oscuro con la etiqueta «DCT» (nunca punteado: los puntos son el círculo máximo). El perfil sigue el directo. Al pasar el puntero por el nombre de un punto bajo el perfil (o tocarlo), el mapa resalta ese punto y sus dos tramos, como la lista de la ruta de Combustible.

**Las rutas propuestas.** Cuando Combustible calcula o comprueba una ruta («Calcular A → B», «Comprobar»), el mapa dibuja las rutas propuestas: la elegida en trazo continuo, las demás atenuadas, la que pasa por encima en la lista más gruesa, los tramos con falta en rojo. En un mapa solo, la lista pequeña muestra enseguida la primera ruta (trazo resaltado, fila marcada): toque otro trazo u otra fila para cambiar esa elección, y «Elegir esta ruta» (siempre activo) la toma: Combustible la toma como su botón «Tomar». El mapa de otro vuelo no dibuja nada. Cuando el motor dice lo que ha comprobado de un tramo, el trazo lo muestra: continuo = comprobado, rayas = incompleto, puntos = sustituto, rojo = error; la lista pequeña da la leyenda. El trazo tiene el grosor de la ruta del vuelo: la elegida continua, las demás atenuadas. Dice la naturaleza del tramo cuando Combustible la da: una aerovía continua con su nombre a lo largo del trazo, un directo (DCT) a rayas, una ruta libre (FRA) punteada, una SID, una STAR o una aproximación con el tono de los procedimientos, una falta en rojo y un trazo más fino cuando el tramo no está comprobado por completo. Los puntos de la ruta elegida están marcados y nombrados (entrada, salida y cambios de aerovía siempre, los demás si hay sitio). Una leyenda plegable está en la lista y en la leyenda del mapa; pasar el cursor sobre un trazo del mapa lo resalta.

**El detalle y la edad de las propuestas.** La ventana de las rutas propuestas es la misma junto a Combustible y en el mapa solo: conserva la fila cuyo detalle abrió (ruta, distancia, nivel, desviaciones), en la pantalla en que la mire, y dice la hora del cálculo («Calculado a las 14:32Z»); dice «Caducado» con «Recalcular» (en vez de desaparecer) cuando cambió el ciclo AIRAC, la base o —en una ruta por el NAT— al día siguiente. Junto a Combustible, es el botón «Elegir» de Combustible el que toma la ruta.

<a id="maps-procs"></a>**La pista y los procedimientos elegidos.** Lo que eligió en Combustible (pista, SID, STAR, aproximación) se traza sobre la ruta: la SID en verde, la STAR en naranja, la aproximación y su aproximación frustrada en azul, desde el umbral de la pista de salida hasta el primer punto de la ruta, y desde el último punto de la ruta hasta el umbral de la pista de llegada. Las transiciones y la aproximación frustrada van a trazos; un tramo sin punto (un ascenso en un rumbo, por ejemplo) es un trazo corto a lo largo de su rumbo y luego trazos hasta el punto siguiente; un viraje de radio constante es un arco. Cuando la SID no llega a un punto de la ruta, una recta a trazos la une a la ruta (igual para la STAR). Un procedimiento que no eligió no se dibuja nunca, y la lista de capas no tiene casilla para él. El nombre del procedimiento se escribe sobre su trazo, seguido del origen de sus datos cuando vienen de X-Plane o de Little Navmap («X-Plane, local») y luego del símbolo ⌛ (en gris) cuando se leyeron bajo un ciclo anterior; la leyenda (chip «i») lo recuerda. Desde la vista regional (ajustable en la página de umbrales), cada punto lleva sus restricciones; el nombre del procedimiento se escribe a todas las escalas, por encima de lo demás, como en las cartas de procedimientos: una altitud **subrayada** significa «como mínimo», **sobrerrayada** «como máximo», las dos «exactamente», «5000–7000» «entre las dos»; «≤ 220 kt» es la velocidad que no hay que superar. El perfil vertical sigue el mismo camino y muestra estas restricciones como escalones (flecha hacia arriba: como mínimo, hacia abajo: como máximo, punto: exactamente, barra: entre dos altitudes); su texto toma un lugar libre o ninguno, nunca sobre el nombre de un espacio, TOC / TOD o un escalón; las distancias, las horas estimadas y el cursor se miden a lo largo de ese camino. El mapa nunca cambia esta elección: toque un aeródromo de la ruta y su ficha da la pista y los procedimientos elegidos, con un botón «Cambiar» que abre Combustible en la línea que hay que modificar; un enlace «Fuente» abre en una pestaña nueva la página publicada del procedimiento (eAIP del SIA), y para un procedimiento leído en otro sitio el nombre de su documento aparece al pasar sobre la línea.

<a id="maps-rwy"></a>**Las pistas.** De cerca, cada pista de cada aeródromo dibujado es un vector corto desde su umbral, y el aeródromo muestra su nombre junto al código («LFPO Paris-Orly»); cada vector va en el sentido de la pista, su número en la cola, detrás del umbral: la pista elegida en Combustible en negrita con el color de su lado, las demás finas. Solo aparecen a partir del zoom fijado por la aerolínea (Ajustes › Administración, «Zoom de los umbrales de pista», 11 sin ajuste); por debajo, nada. En «Elegir en el mapa», todas las pistas del aeródromo se dibujan así, la elegida en negrita; los dibujos de la elección pasan por encima de las etiquetas del fondo, atenuadas.

**El sentido de una aerovía.** Un tramo de aerovía de sentido único lleva una pequeña flecha en el sentido permitido, a partir de un zoom medio (junto al nombre de la aerovía); un tramo de doble sentido, o cuya fuente no dice nada, no lleva ninguna. La ayuda del nombre de la aerovía dice «sentido único LMG → NEPIX» o «doble sentido».

<a id="maps-choose"></a>**Elegir en el mapa.** El botón «En el mapa» de un lado de Combustible (salida o llegada) abre el mapa sobre ese aeródromo —como «Elegir en el mapa» en la ficha del aeródromo de salida o de llegada (toque su símbolo; a todo el ancho en un teléfono)—: la hoja se abre desplegada («Terminar» queda al pie, siempre visible), el mapa de fondo y las capas se atenúan y la vista se ajusta al aeródromo y a sus procedimientos compatibles con su elección, a 40 NM a su alrededor, el aeródromo en el centro (las entradas lejanas quedan fuera del encuadre; un procedimiento elegido que sale de la vista la amplía solo a él); desde la entrada, los procedimientos compatibles de la primera familia se dibujan atenuados: toque uno en el mapa para elegirlo, como su línea. Arriba del bloque de datos, su selección en una línea por familia («Pista 31 · ↑ 12 kt», «OKRI5L», «I31 vía IAF1»), cada una con ✕ para volver a «Ninguna»; tocar el nombre de una familia («Pista», «STAR», «Aproximación») lleva a su grupo y lo despliega. Debajo, las tres familias a la vez —la pista, la SID (salida) o la STAR, la aproximación (llegada)— en líneas apretadas: tres toques en el orden que prefiera. Cada elección reduce las otras dos familias a lo que le es compatible; el resto queda plegado bajo una línea fina «N más · Todas», que lo despliega marcado con ⚠ (se puede elegir igualmente). Las SID que salen y las STAR que entran en la ruta que ha escrito vienen primero, bajo «Hacia su ruta»; las demás siguen, marcadas «salida LACOU» o «entrada OKRIX». En una ruta directa (ningún punto ni aerovía entre los dos aeródromos), nada de eso: se ordenan por su dirección hacia el otro aeródromo, «Hacia LFPO» encima de las mejor orientadas (a menos de 60°), una pequeña flecha en el sentido del vuelo en cada fila. «Ninguna» es siempre la primera línea. Los procedimientos que solo difieren por la pista (OKRI5L, OKRI5R) forman una línea «OKRI5» con sus pistas en pequeñas etiquetas: tocarla elige la familia y reduce las pistas, tocar una pista elige el procedimiento. Las aproximaciones se leen por su etiqueta corta («ILS 06», «RNP 06», sin etiqueta de pista porque la etiqueta ya la dice, la misma en el mapa; el nombre publicado al pasar por encima); bajo la aproximación elegida, «Sin transición» y luego sus transiciones, entre ellas los segmentos de aproximación inicial que el SIA publica para toda la pista («via ODILO 1A»), en el tono de su final; una STAR elegida solo deja las transiciones que parten de uno de sus puntos (si no, la transición vuelve a «Ninguna»); una transición que no se une a la final en un punto común se enlaza con una línea discontinua. Cada procedimiento tiene su tono (ocho, en ciclo), el mismo en su línea, su etiqueta y su trazado; en el mapa, una pequeña etiqueta por familia y por punto («NIMER 9»), y el procedimiento sobrevolado o tocado pasa por encima de todo, con su nombre completo; pasar sobre una línea de cualquier familia resalta su trazado, pasar sobre un trazado resalta su línea; ⌛ (gris): leído en un ciclo anterior. El código del aeródromo queda escrito por encima de los procedimientos; los números de pista toman su lugar antes que las radioayudas, que les ceden; un número que caería sobre una etiqueta no se escribe (la flecha queda). Cada pista lleva el viento del METAR ya conocido, dicho con palabras: «de cara 12 kt · cruzado 6 kt», o «de cola 12 kt» (subrayado), en verde, naranja o rojo según el viento de cola y el cruzado; la pista mejor orientada (más viento de cara, luego menos cruzado) va primero, el viento de cola después; la información emergente da el detalle y el lado de donde viene el viento (← de la derecha, → de la izquierda); sin METAR, nada y el orden habitual. Un toque en una línea o un trazado añade esa elección y la deja en el mapa (la pista en negrita, el procedimiento en su tono, los demás de su familia atenuados); todavía no se escribe nada. Un procedimiento que sirve una sola pista la elige si no hay ninguna; si no, una línea bajo el grupo propone la corrección, con un toque: «OPAL2E sirve a la 25 — Pasar a la 25», o «OKRIX5A no sirve a la 07 — Elegir OKRIX5B». «Terminar», la cruz ✕ o Escape le devuelven a Combustible con todo lo elegido; Combustible lo escribe y dice qué ha cambiado; el mapa no escribe nada. Para renunciar sin devolver nada: «← Combustible» arriba.

**El circuito de tránsito (vista VFR).** Los circuitos trazados por su extractor (Ajustes › Datos › «Circuitos VFR») se dibujan alrededor del aeródromo: línea negra continua para ala fija, verde punteada para rotatoria, una flecha en el orden del vuelo en cada tramo, la altitud sobre la línea cuando se da. En el contenido del aeródromo: si su carta VAC no está leída, nada; si está leída y no se extrae ningún circuito, «Circuito de tránsito: mano izquierda (nada publicado en la carta)»; si no, la mano del circuito extraído y su altitud. Sin lanzador no se dibuja nada. El mapa nunca inventa un circuito.

<a id="maps-ground"></a>**El suelo de un aeródromo.** El botón «Suelo» de la ficha del aeródromo, o la lupa «Suelo: buscar una calle de rodaje, un puesto, un punto de espera» de la columna de botones del mapa (aparece cuando la vista muestra la salida o la llegada del vuelo, desde el zoom 11), abre la lista de sus calles de rodaje, puestos y puntos de espera: un campo filtra por nombre (sin mayúsculas ni acentos), las etiquetas eligen el tipo, y pasar el puntero o tocar una fila la resalta en el mapa (el toque la encuadra). En el mapa, tocar una calle o un puesto abre su fila; tocar en otro lugar del aeródromo (entre las pistas y las calles) abre la ficha del aeródromo, y la salida y la llegada del vuelo se tocan sin apuntar: la zona sensible mide 44 px de ancho a cualquier zoom y va antes que cualquier otra cosa bajo el dedo. La capa se dibuja de cerca (calles y sus nombres desde el zoom 13, esperas (cartel rojo, letras blancas) a 15, puestos a 16); un nombre sin sitio se marca «no dibujado» en la lista. El suelo se lee con los procedimientos del aeródromo: mientras no estén leídos, el panel lo dice y enlaza a los procedimientos; una vez leído, indica la fecha. Datos © colaboradores de OpenStreetMap, ODbL. Si no se pudo leer el suelo, el panel lo dice con el motivo y ofrece «Reintentar» (solo el suelo, sin volver a leer los procedimientos).

<a id="maps-coverage"></a>**Cobertura.** La capa «Cobertura» (en la lista de capas, apagada al principio, encendida solo por su casilla) colorea los aeródromos según lo que este dispositivo puede dar de sus procedimientos: **verde**, se tienen (publicados, introducidos a mano o leídos en este equipo); **naranja**, se tienen pero leídos en parte (páginas sin leer, fichas por revisar: la ficha del aeródromo dice cuántas) o se leen a petición (Francia mediante el eAIP del SIA, un Estado cuyas tablas se pueden leer, un aeródromo de la base local de Little Navmap); **rojo**, nada legible (solo imágenes, texto en prosa, nada en este equipo). La leyenda (la pastilla «i» del bloque de datos) da una línea por color mientras la capa se muestra. Solo se consultan los aeródromos visibles. Toque un aeródromo: su ficha añade una línea con la pastilla, el nivel y el motivo (⌛ si los procedimientos que se tienen son de un ciclo anterior, y luego cuántas SID, STAR y aproximaciones se tienen). Cuando el dispositivo no puede dar esta información, la capa no se ofrece.

<a id="maps-weather"></a>**El perfil y el cursor.** En el bloque de datos bajo el mapa, el perfil vertical corta la ruta de punta a punta: el relieve, los espacios
aéreos en los que entra a la altitud prevista, y la trayectoria del vuelo en violeta. Deslice el dedo por el perfil: un
cursor azul lo sigue, y el mismo cursor se coloca en el mapa. Toque la ruta en el mapa para colocarlo allí. La línea
bajo el perfil dice lo que hay bajo el cursor: distancia desde la salida, altitud prevista y altitud del relieve (ambas sobre el nivel del mar, AMSL), altura sobre el suelo (su diferencia), y el
espacio aéreo en el que está en ese momento. Bajo el mapa, este bloque de datos muestra el perfil; la lista de los
espacios de un punto o los puntos de notificación de un aeródromo se abren en su lugar cuando los pide, y el perfil
vuelve al cerrarlos. La pastilla con forma de nube, (las tres pastillas — perfil, nube, «i» — están siempre en la línea superior, a la derecha; la que no tiene nada que mostrar solo se atenúa), lo sustituye (la pastilla del perfil lo devuelve) por el corte
meteorológico a lo largo de la ruta (viento, temperatura, nubes, engelamiento) a la altitud del vuelo; el corte sigue el mismo cursor, y un toque sobre
él lo mueve. El botón «Meteo de la ruta» es la única acción: muestra la previsión ya guardada y, si no hay, la lee; después nombra el modelo elegido por el medio de la ruta («Meteo de la ruta · AROME 12 h»); desde el toque, la hoja dice «Leyendo el tiempo de la ruta…» con los segundos transcurridos y el botón queda ocupado (diez toques son una lectura); la lectura se detiene a los 20 s; el final siempre se dice: el corte, o el motivo (sin conexión, límite del día, más de 20 s, respuesta HTTP, nada recibido, vuelo sin nivel) con «Reintentar». La última pastilla, «i» (atenuada mientras el dibujo no tiene leyenda), abre sobre el perfil su leyenda (qué es cada trazo, banda y marca); arrastrar el dedo sobre el corte mueve el cursor como en el perfil. El perfil y el corte se dibujan a la altura exacta del bloque, con su eje de distancias siempre a la vista: en un bloque bajo quitan etiquetas de niveles, nunca el eje.

<a id="maps-profile-spaces"></a>**Los espacios del perfil.** El perfil solo muestra los espacios en los que entra la trayectoria vertical prevista (con 500 ft de margen); los sectores de una misma familia que se solapan (las CTA de Dublín) forman allí una sola envolvente, nombrada por la familia; el espacio de ruta libre (FRA) y las zonas W o de investigación meteorológica solo aparecen con la capa «Otros espacios» encendida; como mucho se nombran siete espacios, los demás en la lista de abajo. Las aerovías que sigue la ruta son allí bloques con nombre (« UN460 », suelo – techo): donde un espacio de clase superior (A a D) las cubre, se dibuja ese espacio, no la aerovía; un espacio de clase F no cubre nada. Los espacios de clase E, F y G se dibujan con un fondo claro y se nombran los últimos, para no ocultar el resto.

**Los espacios según el zoom y la complejidad.** La visualización solo depende del zoom y del nivel de complejidad: todos los espacios, las grandes familias (FIR y UIR, TMA y CTA, CTR) incluidas, se leen en el corredor del vuelo mientras «Solo alrededor del vuelo» está marcada, en toda la vista si no (las notas lo dicen y cómo ver más); cada familia aparece en su umbral de zoom, que un nivel de complejidad desplaza un nivel. El tamaño de la hoja no cambia nada. Los FIR solo existen en las bases publicadas para Francia.

**La ficha de un espacio.** Toque un espacio —su bloque en el perfil, o su fila en la lista de los espacios de un punto del mapa (sin pasar el ratón: un dedo no lo tiene, y las condiciones ocupan varias líneas)— y se abre su ficha: nombre y tipo (una P dice «prohibido»), límites, la activación publicada (AZBA, NOTAM), horarios y condiciones del AIP cuando la base los lleva, organismo y frecuencia, fuente y fecha. Queda una línea franca para las zonas R, D, TSA y TRA: «actividad real no conocida: solo horarios publicados (ni NOTAM ni AZBA leídos)». Siete líneas, luego «n más». La base actual del SIA aún no lleva los horarios ni las observaciones: la ficha lo dice. En el perfil, un primer toque en un bloque lo elige (se resalta, su nombre y sus límites aparecen sobre el perfil con un botón «Ficha»); un segundo toque en ese bloque, o el botón, abre la ficha; un toque en otro sitio no elige nada: el perfil nunca se sustituye sin un gesto explícito. La ficha conserva la pila de los espacios del punto: bloques suelo → techo sobre la escala de niveles, encuadrada en sus límites (nunca vacía), el elegido resaltado; un toque en un bloque cambia la ficha. Está junto a la pila en vista ancha, debajo en el teléfono, donde la pila queda arriba mientras la ficha se desplaza.

<a id="maps-profile-zoom"></a>**Ampliar el perfil.** Para leer el perfil con precisión, ciérrelo sobre una parte del vuelo: pellizque con dos dedos (el centro de los dedos se queda en su sitio) y arrastre con dos dedos para mover la ventana; un solo dedo sigue siendo el cursor de lectura. La escala de altitudes se reajusta a lo que muestra la ventana (de ahí viene la precisión), las marcas de distancia (NM) se estrechan con ella, y los puntos fuera de la ventana no se dibujan. Un doble toque vuelve al vuelo entero, igual que el botón «Vuelo entero», que aparece en la línea superior mientras el perfil está ampliado. En pantalla: la rueda amplía alrededor del puntero (con Ctrl siempre; sin Ctrl, salvo que el perfil se desplace con la página; el panel lateral de Combustible se queda en su sitio, la rueda amplía allí también), la rueda horizontal mueve la ventana ajustada, arrastrar también (con el vuelo entero, arrastrar es el cursor de lectura), Mayús + arrastrar traza un rectángulo sobre las distancias y lo amplía, un doble clic vuelve al vuelo entero. La ampliación se conserva mientras la página siga abierta y la ruta no cambie; nunca se guarda. El corte meteorológico se amplía de la misma manera (mismos gestos, mismo botón «Vuelo entero») y la ventana es la misma para los dos: amplíe uno, pase al otro con la ficha y encontrará la misma parte del vuelo; el corte también reajusta su escala de altura a lo que muestra.

**Una pantalla fija.** Nada entre el encabezado y el mapa: el mapa y el bloque de datos llenan la pantalla, y nada se desplaza salvo el contenido del bloque. Los botones están sobre el mapa: a la derecha, de arriba abajo, «Editar la ruta» (el lápiz), «Recentrar», el modo de mapa, «Editar en el mapa» (las cuatro flechas) y, al final, la pantalla completa (Esc sale de ella). «Capas» está en la línea de la hoja, a la izquierda de su asa, junto a lo que abre; sin nada que dibujar, la hoja se reduce a esa línea. El bloque es una hoja: arrastre su línea superior (la barrita; a su altura normal la línea no lleva título sobre un perfil o un corte, solo las tres pastillas) hacia arriba para
ampliarlo, hacia abajo para reducirlo a esa línea, lo que deja toda la altura al mapa; un toque en la línea lo reduce o
lo devuelve a su altura normal.

**Seis modos de mapa.** El botón del modo, a la derecha del mapa, muestra el modo elegido; tóquelo para ver los seis
modos. «IFR bajo»: aerovías inferiores, espacios aéreos, altitudes mínimas y radioayudas. «IFR alto»: aerovías
superiores (UN…, UM…), espacios por encima del FL195. «VFR»: fondo topográfico con las ciudades, los espacios útiles en
VFR, los puntos de notificación y los obstáculos. «Topo»: el fondo OpenTopoMap (relieve y curvas de nivel en sus teselas; «© OpenTopoMap, © OpenStreetMap» bajo la «i»), solo con los aeródromos, las ciudades y los obstáculos, sin hipódromos ni RTBA; la casilla «Curvas de nivel» está atenuada en ese fondo (lleva las suyas); si sus teselas no llegan, el Mapa lo dice («fondo topográfico no disponible: fondo de reserva») y recupera el fondo anterior con el relieve sombreado y nuestras curvas (cada 500 ft o 100 m según su unidad, las directoras numeradas), la casilla actúa entonces; una casilla «Curvas de nivel» marcada que no muestra nada dice que solo aparecen desde el zoom 9. La casilla «Relieve sombreado» apaga el relieve en las vistas que lo tienen (VFR de un mapa de misión, fondo de reserva), y el marco graduado (grados de latitud y longitud) está marcado en las vistas VFR y topográfica. «CAM»: vuelo
militar, el IFR de su nivel más las pistas de reabastecimiento, los tracks NAT del día, las zonas R, D, P, TSA, TRA, CBA
y la red de vuelo bajo a todos los niveles. «Auto» elige según el nivel de su vuelo (IFR alto desde el FL195). El modo
se conserva en este dispositivo.

**Cuanto más se acerca, más dice.** De lejos, el mapa solo muestra los grandes aeródromos, las aerovías y sus nombres.
Más cerca: los puntos de las aerovías (triángulos y radioayudas), el nivel mínimo de cada aerovía («F195»), luego la
distancia del tramo, su rumbo («097°»), los puntos de notificación y los obstáculos. De cerca, cada obstáculo lleva su
altura sobre el suelo, y la altitud de su cima entre paréntesis («434 AGL (771)»).

<a id="maps-layers"></a>**Las capas.** El botón de capas, a la izquierda del mapa, abre en el bloque de datos, en lugar del perfil, la lista de lo que dibuja (la cruz ✕ devuelve el perfil). Primero, bajo la elección del vuelo, el control «Complejidad»: actúa como si el zoom fuera otro, un nivel de zoom por paso (de −4 a +4) — menos detalles hacia la izquierda, más hacia la derecha. Lo que muestra cada zoom lo fija el administrador (Ajustes, tarjeta «Administración»). Luego las familias de espacios (TMA /
CTR, D / R / P, FIR, otros), aerovías inferiores y superiores, radioayudas, puntos de aerovía, puntos de notificación
VFR, obstáculos, altitudes mínimas, ciudades, retícula, alternativo, nombres de los espacios, nombres de las aerovías.
Marque o desmarque: el mapa sigue, y su elección se conserva para este ajuste en este dispositivo. «Restablecer todo»
vuelve a la elección de origen. Arriba del todo, «Solo alrededor del vuelo (más rápido)», marcada de origen en IFR, limita
espacios y aerovías a la cercanía del vuelo: el título del panel termina entonces con «alrededor del vuelo», y el chip «i»
dice que fuera del corredor no se lee nada; desmarcada («si no, toda la vista»), se lee toda la vista, con la misma
densidad en todas partes, filtrada solo por la complejidad — salvo una vista de más de 3 000 NM de ancho, leída alrededor
del vuelo de todos modos (el chip «i» lo dice). De cerca, todo se dibuja de todos modos. Cada elemento del mapa tiene su rango de zoom: los puntos de notificación VFR solo aparecen
muy cerca, los CTR de cerca, las TMA en vista media, las FIR de lejos. El tamaño del mapa también cuenta: en un marco
pequeño (teléfono, panel de la vista doble) muestra menos elementos que en uno grande con el mismo zoom, como si
estuviera más lejos (el zoom se corrige con la media del alto y del ancho del marco, 900 px sin corrección).

<a id="maps-airspaces"></a>**Toque o pase por encima para saber más.** Toque, haga clic o pase sobre el nombre de una aerovía, la etiqueta de un
espacio o una barba de viento: una pequeña burbuja da lo esencial en dos líneas — para una aerovía, el tramo (punto →
punto), su distancia, sus rumbos, su límite inferior y superior; para un espacio, su nombre y sus límites en notación
AIP («TMA 8 AQUITAINE 2000|FL145 D»). Tocado en otro punto dentro de un espacio, el bloque de datos bajo el mapa muestra
los espacios bajo el dedo, uno o varios, en lugar del perfil: un gráfico de niveles, como el perfil vertical (una
columna numerada por espacio, de su límite inferior al superior), y luego la lista numerada con sus límites, leída como el eje vertical: lo más alto arriba (el número 1 es el espacio de techo más alto, a la izquierda del gráfico), lo más bajo abajo. Las FIR, UIR, SIV y sectores de control sin límites, como todo espacio de la superficie al techo, no se dibujan ni se cuentan (no se atraviesan): sus nombres se leen en una línea plegada «También aquí (n)» bajo la lista y en una última línea gris del globo de paso del ratón («También aquí: FIR PARIS · SIV POITIERS»), la FIR o el SIV a llamar, sin columna. La cruz ✕,
Esc o un toque en un lugar vacío del mapa lo cierran y el perfil vuelve, otro toque sobre espacios lo reemplaza; mover
el mapa lo deja. El mapa no se mueve ni cambia de tamaño. El globo de paso del ratón sigue el puntero, dura 5 segundos,
cede el sitio al siguiente y se cierra con un toque en otra parte o un movimiento del mapa. Sobre una radioayuda, el
globo da su tipo, su indicativo y su frecuencia; cuando varias están en el mismo sitio, el mapa guarda la más útil (VOR,
TACAN o DME, luego NDB, luego ILS) y el globo nombra las demás («también aquí: ILS 25L BG 109.9»). En el perfil, el dedo
o el ratón dan igualmente los espacios atravesados.

<a id="maps-vfr"></a>**Los puntos de notificación VFR de un aeródromo.** Pase el ratón sobre un aeródromo: sus puntos de notificación y las
secuencias tomadas de sus cartas VAC se iluminan (círculos con nombre, trazos entre los puntos). En el mapa, un punto de
notificación solo lleva su código corto («NA», «E», «SE»…), para que el mapa siga siendo legible; el nombre largo está
en el globo y en la lista. Toque el aeródromo: el mapa se acerca a sus puntos si están apretados, y el bloque de datos
bajo el mapa, en lugar del perfil, da la lista de puntos (código, nombre largo, restricciones), las secuencias (con la
página de la VAC) y luego las instrucciones de la VAC, plegadas página por página; se desplaza si el contenido es largo.
Sigue abierto mientras mueve el mapa: la cruz ✕ o Esc lo cierran y el perfil vuelve, otro aeródromo lo reemplaza. Tocar
un punto de notificación abre igualmente el contenido de su aeródromo, ese punto primero. En modo VFR, los puntos de los
aeródromos de salida y de llegada se muestran de oficio. Estos datos se extraen automáticamente de las VAC: están
marcados «por verificar» y no son la ruta publicada; la carta VAC prevalece. Cuando el aeródromo se ha analizado a mano,
el bloque lo dice, las rutas llevan su nombre, sus pistas y sus condiciones, un trazado revisado sigue la carta VAC
(trazos largos) y una flecha marca una ruta de sentido único. Los puntos de notificación de la base siempre están, en
negro para los aviones y en verde para los helicópteros; las secuencias y las instrucciones de las VAC se añaden una vez
importadas por el administrador (Ajustes › Mantenimiento). Un punto de notificación es una sola línea en la lista y una sola etiqueta en el mapa, aunque la base y la carta VAC
lo nombren a la vez: la línea conserva la descripción y la posición publicada de la base, y dice «posición VAC a 1,2 NM» cuando la carta VAC
lo sitúa a más de media milla de allí.

<a id="maps-started"></a>**En vuelo.** Una vez iniciado el vuelo en Combustible, el mapa muestra dónde debería estar (avión hueco, «previsto
14:32Z») y dónde está (avión lleno, orientado a su rumbo, con la traza volada punteada, desde la salida, conservada al cambiar de pestaña). En las notas del bloque de datos, bajo el perfil, una línea da la diferencia: adelantado o retrasado (minutos y NM), a cuántas NM de la ruta, y su altitud frente a
la prevista; el perfil muestra las dos altitudes. De cerca, cada punto lleva su hora estimada (ETA) bajo su nombre, sin tapar nunca un aeródromo, en UTC («14:52Z»), la hora local entre paréntesis en la salida y la llegada. «Seguir» mantiene
el mapa en su posición; mover el mapa lo detiene. Sin posición (GPS o red no activados), una notificación lo dice una vez, la línea queda en las notas con un botón «Activar la posición»; una posición de más de 2 minutos aparece en gris. La línea termina con la fuente de la posición: GPS, red,
IVAO, VATSIM, X-Plane o Little Navmap. Las horas estimadas también se muestran para un vuelo fechado en Combustible, antes de su salida. Una vez llegado, la nota «Llegado» sustituye a la línea y «Seguir» desaparece; un desvío se indica en las notas.

**Vientos en altura.** Cuando Combustible tiene la previsión del viento al nivel del vuelo, el mapa la muestra en barbas
a lo largo de la ruta: en cada punto, y cada 50 NM entre dos puntos. El asta señala de dónde viene el viento; un
banderín vale 50 kt, una barba 10 kt, media barba 5 kt. Toque una barba (o pase el ratón por encima): la burbuja da la
dirección, la fuerza, la temperatura, el nivel y la hora de la previsión. La capa «Vientos en altura» las oculta.
Las barbas se leen de la misma previsión que el corte meteorológico (no se pide nada más): si el corte tiene viento, el mapa también. Donde el modelo elegido no cubre la ruta (el medio de la ruta lo elige) no hay flecha: la burbuja dice «Sin viento aquí (fuera de ARPEGE)»; nunca la misma flecha repetida. El gesto «Meteo de la ruta» lee entonces el modelo que cubre (GFS) para esos huecos, y cada barba dice su modelo en la burbuja. En una vista de más de 3 000 NM de ancho (una ruta a otro continente) las barbas están ocultas y las notas lo dicen: acerque para verlas.

**Escalones.** Si la ruta fija un nivel en algunos puntos en Combustible, el perfil dibuja los escalones: ascenso,
nivel, nuevo ascenso o descenso, con el final del ascenso y el inicio del descenso calculados de nuevo. Los puntos de
giro de la ruta también se marcan en el perfil.

**Ascenso y descenso.** Los rombos violetas marcan el final del ascenso (TOC) y el inicio del descenso (TOD), tanto en
el mapa como en el perfil. Vienen del cálculo de Combustible; sin él, el mapa los estima con regímenes de ascenso y de
descenso habituales. Cuando falta sitio, el mapa escribe primero el nombre del aeródromo, luego los números de pista,
las radioayudas, los procedimientos, la ruta (nombres, horas, TOC / TOD) y por último lo demás; una hora estimada o el
nombre de TOC / TOD se desliza a lo largo de la ruta antes de callarse (el rombo queda).

**Un vuelo que nombra una misión.** El mapa sigue siendo el del vuelo, con todo lo que sabe hacer (meteo, procedimientos, edición de la ruta, casillas de Capas, rutas propuestas); la misión se dibuja encima: sus zonas, sus puntos con función (salida, llegada, objetivo…) y, arriba a la izquierda, una ventana con su título, identificador, familia y dos listas: «Mapa suministrado» («Vuelo» primero, luego los mapas de la misión: elegir uno lo muestra en el sitio, Combustible sigue al lado, «Vuelo» vuelve al vuelo) y «Vista».

**Los mapas de misión.** Una misión se abre desde Misiones («Ver en el mapa»), o desde la ventana de un vuelo que la nombra; una ventana arriba a la izquierda del mapa es el único lugar para elegir la misión, su mapa suministrado (vista de conjunto, objetivo, detalle…) y su vista; la pestaña Capas solo ajusta lo que se muestra.
Cada
mapa se redibuja como en el estudio: mismo marco, mismo perfil de visualización, con los puntos de la misión, sus zonas
rayadas y su recorrido. El perfil vertical muestra entonces el de la misión.
Un mapa suministrado (elegido en la ventana de un vuelo, o «Ver en el mapa» desde Misiones) muestra: una banda arriba da su título, su identificador, su familia, el mapa suministrado mostrado y, si hay varios, su elección (siete como máximo). Las zonas son una mancha ligera con su nombre, los puntos llevan su función (salida, llegada, objetivo…) y la leyenda («i») las nombra. La lista de vistas de la banda depende de la familia de la misión: civil, VFR, IFR y solo fondo; militar, VFR, topográfica, IFR y tránsito a baja altitud (RTBA y reabastecimiento); rescate, búsqueda, aduanas, VFR, topográfica, IFR bajo e IFR alto. El guion «−» de la banda la pliega (no se abandona nada: un botón de la columna, a la derecha del mapa, la vuelve a abrir). La cruz de la banda de una misión en preparación pregunta primero: «¿Abandonar la preparación de la misión?»; si se rechaza, nada cambia; si se acepta, se van la banda, el mapa elegido y los puntos que impone la misión (sus otros puntos se quedan) y se vuelve al vuelo con todas sus capas; otra misión se elige en la lista de capas. El mapa se abre en la vista de su uso: el perfil que lleva el YAML del mapa tiene prioridad; si no, los mapas de objetivo, detalle, cita y zona de una misión operativa (SAR, MEDEVAC, FIRE, LE, ISR, COMBAT, MARITIME, AAR, AIRLIFT, COMMAND: todo salvo comercial) se abren en VFR topo (relieve, obstáculos, VRP, aeródromos VFR, espacios bajos), el mapa general y una misión comercial mantienen la vista del vuelo. La banda ofrece «Vista»: VFR topo, IFR o Solo fondo; la elección se recuerda para ese mapa en el dispositivo, y quitar la banda devuelve la vista del vuelo.

<a id="maps-edit"></a>**Modificar la ruta en el mapa.** Toque «Editar en el mapa» (las cuatro flechas, a la derecha del mapa; un pliegue «Cómo hacerlo», arriba a la izquierda del mapa, da la ayuda del modo): los puntos de giro se rodean de un
círculo. Arrastre un punto sobre un fijo, una radioayuda o un aeródromo: se coloca allí (soltado en otro lugar, se
vuelve un punto libre, nombrado por sus coordenadas, como 4530N00030E). Para añadir un punto, toque «+» (en la misma columna)
y luego el lugar deseado (o mantenga pulsado medio segundo): sobre un fijo, una radioayuda o un aeródromo se coloca
allí, en otro lugar es un punto libre; se añade al tramo más cercano. Un toque simple no añade nada: muestra la burbuja.
Toque un punto de la ruta: su tarjeta da su nivel y propone «Quitar». Un punto que la misión impone (encuentro, objetivo, fuente; cuadrado lleno, «impuesto por la misión» en su tarjeta) no se mueve ni se quita: el piloto conserva los demás puntos. La salida y la llegada no se mueven aquí. En el
perfil, arrastre un nivel hacia arriba o hacia abajo: el nivel cambia desde el punto que abre ese tramo, en pasos de
FL10 (en el primer tramo, es el nivel del vuelo); en la tarjeta de un punto, «−» y «+» hacen lo mismo. «Deshacer»
deshace el último gesto. Cada cambio se guarda enseguida en el vuelo, y Combustible rehace el cálculo; el perfil sigue.
Volver a tocar el botón (o Esc) cierra el modo, y el mapa vuelve a moverse con el dedo. Para escribir la ruta en texto, el lápiz arriba de la columna derecha («Editar la ruta») abre
el paso Ruta de Combustible. Mientras el modo está activo, la columna derecha solo conserva «Editar en el mapa», «+», «Deshacer», «Recentrar» y la pantalla completa.

## Sin conexión

**Lo que funciona sin conexión.** El mapa, los espacios aéreos, los aeródromos, las radioayudas y el perfil siguen
disponibles sin conexión para las zonas ya consultadas, y para las guardadas en Ajustes › Datos sin conexión. Guarde
allí la zona de su vuelo antes de salir: todo estará allí, incluso sin conexión.

**El mapa de fondo.** El fondo (carreteras, ciudades, relieve en color) viene de Internet. Sin conexión, el mapa se
dibuja sobre un fondo liso con el contorno de los países, y una línea lo indica; todo lo demás está allí.

**El relieve del perfil.** El relieve del perfil también viene de Internet. Sin conexión, el perfil muestra en su lugar
la altitud mínima de seguridad de cada cuadro atravesado (en guiones marrones), y una línea lo indica.

## Casos particulares

**Sin vuelo.** Sin vuelo preparado, el mapa queda vacío y propone «Abrir Combustible». Los mapas de misión siguen accesibles desde la lista de las capas.

**Vuelo que cruza la línea de cambio de fecha.** Un vuelo que cruza el meridiano 180° (de Siberia a Alaska, por ejemplo) se dibuja de una sola pieza: el mapa continúa al otro lado de la línea, las marcas de distancia, el perfil y el corte meteorológico siguen la ruta, que sigue guardada con longitudes entre −180° y 180°.

**Base aeronáutica ausente.** Si la base aeronáutica todavía no ha sido publicada por un dispositivo de la aerolínea,
el mapa solo muestra la ruta, y lo dice una vez (notificación, luego nota del bloque de datos).

**Zona no guardada.** Sin conexión, sobre una zona nunca consultada ni guardada, el mapa no tiene nada que mostrar; el
botón «Datos sin conexión» abre los ajustes para guardarla la próxima vez.

**Ciclo distinto.** Cada mapa de misión conserva el ciclo de datos con el que se hizo. Si la base actual es de otro
ciclo, una línea lo dice: los espacios aéreos pueden haber cambiado desde entonces.

**Misión antigua.** Una misión guardada antes de esta versión no lleva su perfil de visualización. El mapa toma
entonces el perfil habitual del tipo de mapa (detallado para un objetivo o un detalle, simplificado si no) y lo indica.
Basta con abrir la misión en el estudio y guardarla para que conserve después el suyo.

<!-- fr: 8fdd30cdbb88 -->

<!-- chapter: atmosphere -->
# Meteo

La atmósfera a lo largo del vuelo preparado en Combustible: un mapa meteorológico al nivel elegido, el corte vertical de
la ruta, el corte de un punto, a la hora de salida o más tarde.

## Cómo usarlo

<a id="atmosphere-flight"></a>**El vuelo.** Meteo muestra siempre el vuelo preparado en Combustible (ruta, nivel, fecha del vuelo). Sin vuelo previsto,
la página lo dice y lleva a Combustible; «Ver el ejemplo» muestra un vuelo de demostración, marcado como tal en el
asa.

<a id="atmosphere-load"></a>**Cargar la previsión.** El botón de carga (la flecha hacia abajo, a la derecha del mapa) lee la previsión a lo largo de
la ruta y alrededor de ella. No se pide nada al abrir: la página muestra lo que el aparato ya ha guardado, y el botón dice de antemano lo que
costaría la carga («Cargar (≈ 120 llamadas)», o «ya en el dispositivo»). Fuera de la
zona del vuelo, el mapa muestra el sinóptico mundial publicado con la aplicación, sin pedir nada.

<a id="atmosphere-map"></a>**El mapa meteorológico.** Isobaras, isotermas, nubes, viento, corriente en chorro y convección, al nivel elegido con la
pastilla del nivel («Suelo», el nivel solicitado, la trayectoria calculada o una altitud fija). La pastilla de capas, a la izquierda del asa de la
hoja, abre un panel sobre el mapa, justo encima de la hoja: elige lo que se dibuja en el mapa y en el perfil, y el corte sigue visible
abajo, redibujado con cada casilla; la cruz o Escape lo cierra. Toque un punto del mapa para abrir su corte.

<a id="atmosphere-zones"></a>**La zona del vuelo y el mundo.** Una línea fina rodea la zona del vuelo: dentro, la previsión fina cargada para el vuelo
(Météo-France AROME 1,3 km y ARPEGE 0,1° sobre Francia, ICON en Europa); fuera, el sinóptico mundial (GFS de la NOAA,
publicado con una malla de 5°). Los dos modelos no dicen exactamente lo mismo: un salto de las líneas al cruzar la línea
es normal. El panel de capas nombra los dos modelos y su malla. Sin sinóptico mundial, o con uno de más de 12 h, la primera línea de la hoja inferior lo dice y ofrece «Construir (2 min)»: el lanzador de este equipo lo calcula (GFS de la NOAA, sin clave) y la capa llega al mapa; sin lanzador, la línea dice dónde hacerlo.

<a id="atmosphere-date"></a>**La fecha del vuelo.** El cursor bajo el asa adelanta la hora de 0 a 72 horas desde la salida prevista: el mapa, el
corte y los cortes de punto siguen. Cuando una parte del cursor queda fuera de la previsión leída (una salida prevista ya
pasada, días aún no cargados), una banda bajo el cursor muestra las horas cubiertas; fuera de ellas se muestra la hora más
cercana, ⚠ lo indica en la línea del cursor y en el asa, y aparece un aviso.

<a id="atmosphere-cut"></a>**El corte y los cortes de punto.** Bajo el mapa, el corte muestra la ruta de un extremo a otro, del suelo hasta por
encima del nivel del vuelo. Tóquelo para abrir el corte del punto más cercano (el perfil vertical de la atmósfera allí);
◀ y ▶ pasan al corte vecino, ✕ vuelve al corte de la ruta. El dibujo cabe siempre en el bloque, con su eje de distancias
visible; amplíe el bloque para ver más detalle.

<a id="atmosphere-zoom"></a>**Ampliar el corte.** Pellizque el corte con dos dedos (o Ctrl + rueda) para mostrar solo una parte, y deslícelo con dos
dedos; las distancias, los puntos, los vientos y la escala de alturas siguen la parte mostrada. Un solo dedo conserva su
papel (abrir un corte de punto, mover el bloque). «Vuelo entero», en la línea del asa, un doble toque o un doble clic
vuelven a la ruta entera; un cambio de ruta también.

<a id="atmosphere-details"></a>**Los detalles.** El botón de la lista, a la derecha del mapa, muestra en el bloque el resumen
del vuelo (distancia, perfil, ascenso, viento medio y desviación de la atmósfera tipo en crucero, isoterma de 0 °C), los
aeródromos (METAR y TAF) y la tabla a lo largo de la trayectoria calculada; toque una fila de la tabla para abrir el corte
de ese lugar.

<a id="atmosphere-settings"></a>**Vuelo y ajustes.** El botón del avión, a la derecha del mapa, abre el vuelo mostrado: su
origen (el vuelo actual de Combustible, el ejemplo, un archivo `current_flight.json` o una ruta escrita), la salida (UTC),
el nivel solicitado, la velocidad de crucero, los datos (previsión Open-Meteo o demostración sin conexión) y la cuadrícula
del mapa. Un segundo toque en el botón vuelve al corte.

<a id="atmosphere-legend"></a>**La leyenda.** La pastilla «i», en la línea del asa a la derecha (después de ◀ y ▶), muestra la leyenda de lo dibujado;
un toque en la leyenda, en la pastilla o Escape la cierra.

- Corte: trayectoria calculada (continua: ascenso, crucero, descenso), nivel previsto (guiones), nivel solicitado
  (puntos), fin del ascenso e inicio del descenso (TOC, TOD), nubes (gris, más oscuro: más cubierto), isotermas cada
  5 °C (0 °C azul grueso), inversiones y engelamiento (rayado), viento (barbas: media 5 kt, entera 10, banderín 50),
  base estimada de los cúmulos (puntos grises), relieve, puntos de la ruta (líneas verticales); en un bloque alto, las
  bandas inferiores: nubosidad baja, media, alta, precipitación, visibilidad inferior a 8 km.
- Corte de punto: temperatura (rojo), punto de rocío (verde), atmósfera tipo (guiones), los tres niveles del vuelo en
  ese lugar, inversiones, nubes (columna a la derecha), viento, relieve.

## Conviene saber

- La previsión viene de Open-Meteo (Météo-France AROME y ARPEGE sobre Francia, ICON en Europa, GFS en otros lugares);
  el sinóptico mundial viene de GFS (NOAA), cada 3 horas hasta 72 horas.
- Lo cargado se queda en el aparato y sirve sin conexión, en la reserva meteorológica que comparten Combustible, el
  Mapa y Meteo; el Mapa reutiliza su corte meteorológico. Las llamadas del día a Open-Meteo se cuentan en el bloque
  de estado de Ajustes.

<!-- fr: 730918eb6af9 -->

<!-- chapter: report -->
# Informe

Escribir el informe de un vuelo en unos pocos toques, con o sin misión: el módulo retoma lo que ya sabe de su vuelo,
usted completa, guarda — y, si lo desea, el vuelo se registra en el sitio de la aerolínea en el mismo gesto.

## Cómo usarlo

<a id="report-steps"></a>**Tres pasos.** Bajo el título, «Informe para …» dice la compañía y su tipo; mientras el informe no está guardado, «Cambiar» al lado propone las compañías y «Personal»: la elección se hace ahí mismo, el borrador queda tal cual; una vez guardado conserva la suya, y la cabecera dice «AAA ≠ BBB» cuando la compañía actual no es la suya. El informe se rellena en tres pasos: Vuelo, Misión, Resultado. En un teléfono, un paso cada vez
(«Siguiente» abajo); en un ordenador, los tres uno al lado del otro. Nada es obligatorio: lo que falta se indica en el
último paso, sin bloquear nunca el guardado.

<a id="report-step-1"></a>**El último vuelo.** Si su identificador IVAO (o VATSIM) está ajustado (⚙) y el dispositivo está en línea, una tarjeta
propone su último vuelo en la red: «Usar» rellena la aeronave, el indicativo, el trayecto y las horas sacadas de la
traza. El vuelo preparado en Combustible o Mapa se propone de la misma forma («Vuelo actual»); si se ha iniciado en
Combustible («Iniciar el vuelo»), aparece primero, «Vuelo iniciado a las hh:mm». La tarjeta dice en una línea todo lo
que se va a retomar, incluso lo que un tipo de misión no tiene casilla para mostrar (distancia, nivel). «Usar» rellena
también la hora de puesta en marcha (la hora de salida en Combustible) y el combustible a la salida (el combustible de
bloque del cálculo), todo recordado en la línea «Rellenado desde: …» bajo el título de la tarjeta. Guardar el informe termina el vuelo iniciado: Combustible vuelve a
la preparación, Mis vuelos quita «En curso», y el vuelo ya no se propone.

**Un vuelo de otra compañía.** Un vuelo preparado para una compañía y retomado cuando el dispositivo ha pasado a otra conserva la suya: la cabecera lo dice, la lista de familias es la suya y el informe se guarda para ella. Su familia y su serie vienen del paso Vuelo de Combustible (rellenadas por la misión); si se olvidaron en la salida, elíjalas aquí: el informe tiene la última palabra.

**Las otras fuentes.** Despliegue «Otras fuentes» para retomar su último vuelo IVAO o VATSIM, su plan de vuelo
SimBrief, o un texto pegado: un plan de vuelo OACI, la página de un vuelo del tracker IVAO o de StatSim, un METAR. Solo
se rellenan los campos vacíos; la línea «Rellenado desde: …» bajo el título de la tarjeta dice de dónde vienen. Si una fuente da otra cosa para campos ya rellenados, un
botón propone sustituirlos.

<a id="report-step-2"></a>**La misión.** En el segundo paso: la familia, dicha por su sigla y luego su nombre («SAR · Recuperación de personal», propuesta según su último informe), la serie, el identificador de la
misión si el vuelo sigue una, y después los bloques propios de la familia. Algunos bloques solo aparecen para una serie
(por ejemplo VIP o traslado en las misiones especiales). Mientras no abra este paso, aparece «por ver» en lugar
de ✓: la familia y la serie de un informe nuevo se toman por defecto. La serie por defecto es la primera de la familia, salvo en Comercial: «Pasajeros». Una familia añadida por la compañía numera sus informes con la letra que recibió en Ajustes.

<a id="report-step-3"></a>**El resultado.** En el último paso: el resultado, sus observaciones, la tripulación (usted primero, como comandante) y
el combustible a la salida y al aterrizaje. Las incoherencias — horas desordenadas, fecha futura, combustible que
aumenta — se señalan.

<a id="report-load"></a>**Carga.** «Usar» toma la familia y la serie del vuelo; puede cambiarlos, el informe tiene la última palabra. Una serie que transporta (Carga, Pasajeros, VIP) añade, en el último paso, la tarjeta «Carga» con un solo campo: la carga embarcada en kg o el número de pasajeros. Cualquier otra serie no añade nada.

<a id="report-measures"></a>**Mediciones.** Al final del último paso, «Mediciones» lee los registros del Fuel Phase Monitor («Elegir registros», o «Desde la carpeta Output» en el puesto) y propone el vuelo que salió del aeródromo de salida de este informe y llegó a su llegada, a sus horas UTC con una hora de margen — nunca por la matrícula, la de una librea de X-Plane no es la suya; si varios vuelos encajan, se listan y usted elige; «Guardar este vuelo» pone su combustible consumido, su duración y sus fases en el informe, guardados con él. Nada más del registro se guarda.

<a id="report-save"></a>**Guardar.** El botón de abajo guarda el informe y le da su número en el primer guardado. Mientras no haya guardado, lo
introducido se conserva en el dispositivo y se recupera la próxima vez que lo abra.

**Registrar en el sitio.** «Guardar y registrar en el sitio» guarda y abre, en el mismo gesto, el formulario «Añadir un
vuelo» del sitio de la aerolínea con su vuelo. Inicie sesión en el sitio si hace falta, lance el marcador «→ Vol»:
rellena el formulario sin enviarlo; revíselo y envíelo en el sitio. El botón está en gris mientras la dirección del
sitio no esté ajustada (módulo Sitio).

**Mis últimos informes.** Plegados al final del primer paso, una línea por informe: toque uno para reabrirlo y
modificarlo. «Nuevo informe» vuelve a empezar con un informe en blanco.

## El prerrelleno en detalle

- **IVAO y VATSIM**: los vuelos de los últimos siete días de su identificador. Un vuelo cortado por desconexiones
  cuenta como un solo vuelo. La puesta en marcha y la parada corresponden a la conexión y a la desconexión cuando la
  traza empieza y termina en tierra; el despegue y el aterrizaje vienen de la traza.
- **Las horas** están en UTC, marcadas «(Z)» en los campos; el vuelo iniciado y la red las rellenan en UTC. Un
  informe más antiguo, introducido en la hora del dispositivo, se muestra convertido con la hora introducida en la línea bajo el título de la tarjeta
  («Despegue introducido 18:30 local»); solo se reescribe en UTC si lo guarda.
- **SimBrief**: su último plan (identificador ajustado en ⚙) — aeronave, ruta, nivel, velocidad, combustible previsto,
  METAR y TAF.
- **Desde Mis vuelos**: «Escribir el informe» de un vuelo abre un informe nuevo, ya rellenado con ese vuelo y su fecha;
  «Abrir el informe» reabre el que existe.

## Los números de informe

Con un identificador de misión, el número sigue la misión y cuenta los intentos (CRM-016-1, CRM-016-2…). Sin misión,
cada familia tiene su propia serie (CRM-A01-0, CRM-A02-0… para HEMS). Los números ya usados, incluidos los de los
informes de la suite completa, nunca se reutilizan.

## El marcador «→ Vol»

Despliegue «En el sitio de la aerolínea» en el último paso y arrastre el enlace «→ Vol» a la barra de marcadores de su
navegador. Solo sirve en el sitio: en la lista de aeronaves, abre la de su vuelo; en su página, «Añadir un vuelo»; en
el formulario, rellena los campos y señala las diferencias. En un teléfono, donde los marcadores son incómodos,
«Copiar los campos» pone la línea del vuelo en el portapapeles.

## Casos particulares

- **Sin conexión**: todo se escribe y se guarda en el dispositivo; el informe sale en la próxima sincronización. Solo
  las fuentes de red (IVAO, VATSIM, SimBrief) esperan a la red.
- **Sin lanzador**: IVAO y VATSIM solo son accesibles a través del lanzador de un ordenador; en otro lugar, pegue la
  página del vuelo (tracker IVAO, StatSim) en «Otras fuentes».
- **Sin trigrama**: el informe se escribe de todos modos; ajuste su trigrama (⚙) para que esté a su nombre.

<!-- fr: c7defe7f33ab -->

<!-- chapter: flightlog -->
# Mis vuelos

Todos sus vuelos pasados en un mismo lugar, una línea por vuelo, del más reciente al más antiguo: sus informes, el
diario del sitio de la aerolínea y sus conexiones IVAO o VATSIM, sin duplicados.

## Cómo usarlo

<a id="flightlog-totals"></a>**Los totales.** Arriba, tres casillas: el número de vuelos, las horas bloque y los vuelos que aún no tienen informe,
para el período elegido. Justo debajo, los tres tipos de aeronave que más ha volado.

<a id="flightlog-filters"></a>**Los filtros.** Elija el período (7 días, 31 días, 1 año, todo), busque un indicativo, un tipo, una matrícula, un
aeródromo, una misión o un número de informe, o marque «Sin informe» para ver solo los vuelos que esperan uno. Sus
elecciones se quedan en el dispositivo: en la visita siguiente, una pastilla las recuerda («1 año · LFRS ✕») y las
quita de un toque. Un «—» en lugar del bloque: un informe sin horas.

<a id="flightlog-list"></a>**La lista.** Una línea por vuelo: la fecha, el indicativo, la ruta y el tiempo de bloque; cuando vuela para más de una compañía, la compañía de cada informe. Un punto naranja marca un
vuelo sin informe. En un ordenador, la línea muestra también la aeronave y el número del informe.

<a id="flightlog-detail"></a>**El detalle de un vuelo.** Toque una línea para desplegarla: de dónde viene el vuelo (informe, diario del sitio, red
IVAO o VATSIM), su hora, la aeronave, la misión y las observaciones.

<a id="flightlog-report"></a>**Escribir o abrir el informe.** En un vuelo que no lo tiene, «Escribir el informe» abre un informe nuevo, ya rellenado
con este vuelo — fecha, aeronave, indicativo, aeródromos — y una familia de misión propuesta. En un vuelo que lo tiene,
«Abrir el informe» lo vuelve a abrir para modificarlo.

<a id="flightlog-current"></a>**El vuelo en curso.** Un vuelo iniciado en Combustible («Iniciar el vuelo») y aún sin informe aparece en cabeza, «En
curso — iniciado a las hh:mm» (se señala el desvío), incluso antes de que el diario del sitio lo conozca. «Escribir el
informe» abre el informe, que propone este vuelo en primer lugar; una vez guardado el informe, la línea desaparece.

<a id="flightlog-more"></a>**Más.** Despliegue «Más» para exportar la lista filtrada en CSV (hoja de cálculo) o releer sus conexiones IVAO y
VATSIM.

## De dónde vienen los vuelos

- **Sus informes**: los que ha escrito, incluidos los de la suite completa. Un informe de la suite completa se abre en
  la suite completa.
- **El diario del sitio**: sus líneas del «Log des vols» de la aerolínea, recogidas por el módulo Sitio (pegado, o
  lectura por el lanzador).
- **La red**: sus conexiones IVAO y VATSIM de los últimos siete días (identificadores configurados en ⚙). Se muestran,
  nunca se guardan como vuelos.
- **Sin duplicados**: un mismo vuelo (misma fecha, mismo indicativo, misma matrícula) aparece una sola vez. El informe
  va antes que el diario, el diario antes que la red; un informe sin horas toma el tiempo de bloque del diario.

## Casos particulares

- **Sin conexión**: se muestran los informes y el diario ya recibidos; la red espera a la conexión.
- **Sin lanzador**: IVAO y VATSIM solo se releen a través del lanzador de un equipo.
- **Sin trigrama**: configúrelo (⚙); es él quien elige sus informes y sus líneas del diario.

<!-- fr: 7b729c25101f -->

<!-- chapter: website -->
# Sitio de la aerolínea

El enlace entre la aplicación y el sitio de la aerolínea, que no tiene interfaz para aplicaciones: su diario de vuelos y
su flota llegan copiando y pegando (o a través del lanzador de un ordenador), y la dirección del sitio se ajusta aquí,
una sola vez para toda la aerolínea.

## Cómo usarlo

**Mi diario de vuelos.** En el sitio, abra la página «Log des vols» (el enlace «Abrir la página» lleva a ella),
seleccionar todo, copiar, luego pegue en la zona de la tarjeta y «Leer». Solo se conservan sus filas, las de su
trigrama; alimentan Mis vuelos.

**Flota de la aerolínea.** El mismo gesto con la página «Flotte» del sitio: las aeronaves, sus indicativos, su base y
su ubicación. El informe y el mapa la usan.

**Nada se escribe sin usted.** Tras «Leer», una vista previa dice lo que cambia: filas o aeronaves nuevas, modificadas,
sin cambios (y, para el diario, las filas de los otros pilotos, ignoradas). «Guardar» escribe, «Cancelar» lo deja todo
como antes.

**Leer a través del lanzador.** En un ordenador donde el lanzador sirve la aplicación, «Leer a través del lanzador» va a
buscar la página del sitio por usted, sin pegar, y luego muestra la misma vista previa. Donde el sitio no es accesible
(teléfono sin lanzador), el botón desaparece y pegar sigue siendo la vía.

**La aerolínea.** La tarjeta Aerolínea da el nombre, la dirección del sitio y la ruta de sus páginas («Registrar mi vuelo», diario, flota, página de una aeronave). Se modifica en una pantalla de ordenador y se muestra en solo lectura en
un teléfono. Este ajuste es común a toda la aerolínea; es el que activa «Guardar y registrar en el sitio» en el
informe.

## Conviene saber

- **La aplicación nunca escribe en el sitio** y nunca conoce su contraseña: usted inicia sesión en el sitio, y el
  marcador «→ Vol» del informe rellena el formulario sin enviarlo.
- **Pegar el HTML**: copiar la página desde el navegador conserva los enlaces de las aeronaves; «Pegar desde el
  portapapeles» los lee directamente cuando el navegador lo permite.
- **El diario se completa**: las filas que la página del sitio ya no muestra (páginas anteriores) se siguen
  conservando.
- **La flota se fusiona**: una aeronave de la página sustituye a la ya conocida (sus indicativos adicionales se
  conservan); las que no están en la página se quedan.

## Casos particulares

- **Sin trigrama**: el diario no puede elegir sus filas; ajústelo (⚙).
- **Dirección sin ajustar**: los enlaces a las páginas y el registro del vuelo esperan a la tarjeta Aerolínea.
- **Sin conexión**: pegar siempre funciona; lo guardado sale en la próxima sincronización.

<!-- fr: cfdf162727aa -->

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
Habitual. En los niveles Habitual y Completo la pantalla se ordena **por frecuencia de uso**: siempre visibles, el bloque «Estado», la visualización (nivel de uso, diseño) y la compañía del dispositivo; lo que se usa de vez en cuando está plegado, con su frecuencia a la derecha: Datos (una vez al mes), Sincronización (en caso de problema), Dispositivo; Administración es una línea «›» que abre su propia página (con «← Ajustes» para volver); lo que solo se usa una vez va abajo del todo, plegado, en «Puesta en marcha» (identidad, acceso, crear o unirse a una compañía); «Acerca de» cierra la pantalla. Toque un título plegado para abrirlo. Un grupo que requiere atención (un aviso, un error o la tarjeta a la que
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

En un equipo servido por el lanzador, la tarjeta «Fichas de Little Navmap (.lnmperf)» exporta sus fichas de
rendimiento a los archivos .lnmperf de una carpeta. La ficha JSON es la única fuente: elija la carpeta (se propone la
de Little Navmap cuando se encuentra), «Guardar», y luego «Exportar las fichas» cuando quiera; no se hace nada en
segundo plano. Una ficha sin archivo recibe uno, una ficha cambiada reescribe el suyo; un archivo cambiado en Little
Navmap, o venido solo de Little Navmap, nunca se recoge en silencio ni se sobrescribe: la tarjeta lo lista, y se
importa por Aeronaves › «Importar un archivo», que muestra la ficha antes de escribirla. Un archivo nunca se borra: el
de una ficha retirada va a la subcarpeta `_removed`. «Detener» corta el vínculo. Las fichas a las que les falta un
valor requerido por Little Navmap se listan y no se escriben. En un teléfono, Combustible descarga la ficha en
.lnmperf.

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
la hoja de ruta (`#roadmap`, que se abre en «Prioridades»: columnas Entregado, En prueba, una por hito abierto, Backlog, donde se arrastran las fichas (al principio de la columna donde se sueltan; «Al principio», «Subir», «Bajar» en la ficha); «Por tema» las muestra por ámbito); la recepción (`#recette`): una prueba funcional por ficha entregada, con «Válido», «Rechazado» y un comentario (obligatorio en un rechazo), escritos por el lanzador en `organisation/RECETTE.json`; un defecto ya conocido dice «en curso, no volver a probar»; una segunda pestaña «Por decidir (n)» plantea los puntos por decidir como test con campo libre (respuestas escritas por el lanzador en `organisation/DECISIONS_REPONSES.json`); y el diagnóstico de la tarjeta «Acerca de».

**El asistente del administrador.** El botón « Asistente del administrador » (tarjeta « Administración », o la dirección `#settings?card=assistant`) lleva al administrador de la mano: seis pasos, en orden, cada uno con su estado leído de la instalación (hecho, por hacer, opcional, desconocido), una frase y un botón hacia la tarjeta que ajusta el paso. El primer paso por hacer tiene el botón de color. El repositorio de datos (un repositorio remoto para data/ y, con GitLab, su token de administrador en este puesto), la aerolínea (su nombre, en el módulo Sitio; su trigrama está en Ajustes › Identidad), la base aeronáutica (al menos una zona publicada), el primer piloto (« Añadir un piloto »), luego, opcionales, los dispositivos y las claves (IVAO, EAD). El estado de la instalación, tal como lo da el marco, está al final. El asistente no escribe nada: cada botón abre la tarjeta que ya existe.

**Añadir un piloto (administrador).** En el nivel « Completo », el botón « Añadir un piloto » de la tarjeta « Administración » (donde la exportación es posible) lo prepara todo para un piloto que aún no tiene nada. Escriba su trigrama, su nombre si quiere saludarlo, el idioma del mensaje y la dirección de la aplicación publicada, y pulse « Preparar »: obtiene el archivo, el enlace y el código QR (tres formas de la misma configuración), sus pasos y un mensaje listo para copiar, en el idioma elegido. Para un repositorio GitLab, sus pasos son: crear el token de proyecto del piloto (uno por piloto, nombre = su trigrama, rol Developer, ámbito `api`, fecha de caducidad 90 días aconsejados y 365 como máximo, nunca sin fecha), copiarlo enseguida (GitLab lo muestra solo una vez), comprobar que la rama de datos deja enviar a los Developers, y saber revocar (Settings › Access tokens › Revoke). Con el lanzador, « Crear su token » abre la pantalla « Tokens de los pilotos » con el trigrama ya escrito: el lanzador crea el token con el del administrador; los pasos a mano quedan plegados debajo. Sin lanzador, están abiertos. **Envíe el token aparte del mensaje** (otro canal, o péguelo delante del piloto): nunca va en el enlace ni en el mensaje. Para un repositorio GitHub, los pasos son los de la exportación.

<a id="settings-sources"></a>**Fuentes de datos.** El botón «Fuentes de datos» (`#sources`, nivel Completo) enumera las fuentes de datos aeronáuticos que la suite utiliza, considera o ha descartado: para cada una, lo que da, su licencia, su estado y un enlace que se abre en una pestaña nueva; para las que cambian con cada ciclo AIRAC (SIA, VAC, eAIP, CIFP), el enlace es el del ciclo vigente, escrito arriba de la pantalla. La pantalla no descarga nada. Bajo el botón de la tarjeta Administración, la dirección absoluta de la pantalla, para abrirla o guardarla en favoritos («Copiar el enlace»). Sustituye al laboratorio de datos, retirado el 28 de octubre de 2026.

**Los bancos, en un puesto.** Servidos por el lanzador, solo se abren en un puesto con lanzador (en otros sitios se
nombran sin enlace); rutas relativas a la raíz de la suite: `frame/aerodb/bench.html` y `frame/aerodb/offline_bench.html` (base aeronáutica, en línea y sin conexión),
`frame/store/test/` (capa de datos, contra el GitHub falso) y `modules/maps/test/render.html` (renderizado del mapa).

**Las páginas V2.** Ya no hay ningún botón en esta tarjeta: todas las páginas de la versión antigua (Ajustes › Mantenimiento, Primer inicio, estudio cartográfico…) están en la pantalla «Páginas antiguas (V2)» (`#legacy`), la última entrada de la columna de navegación de cada aplicación.

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
- **Caducidad de los tokens (GitLab)**: la lista «Tokens existentes» dice de cada token «caduca el … · en 12 días» (naranja bajo 30 días, rojo bajo 7, «caducó el …» una vez pasada la fecha); la fecha se vuelve a leer en GitLab cada vez que se abre la pantalla, no se guarda nada. En el equipo del lanzador, el bloque «Estado» de los Ajustes dice «2 tokens de piloto caducan pronto (el más próximo: …)»: el número y la fecha más próxima, releídos como mucho una vez al día, nunca un nombre. Para su propio token, el dispositivo guarda solo la fecha de caducidad que da GitLab (nunca el token), la relee como mucho una vez al día, la dice en el bloque «Estado» y, bajo 30 días, una vez al día en una notificación. Un token rechazado solo se dice «caducó el …» cuando esa fecha conocida ya pasó: GitLab responde igual a un token caducado, revocado o desconocido. Con GitHub no se lee ninguna fecha (el navegador no puede leer la cabecera que la lleva).
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

<!-- fr: c75cd2a9eb9f -->

**La compañía.** En el nivel Completo (o con #settings?card=company), la tarjeta «Compañía» lista las compañías de data/airline/index.json y «Personal»: el nombre, el código, las redes (IVAO, VATSIM, sin conexión) y el número de aeronaves de la flota. La tarjeta se llama «Compañía de este dispositivo»: una lista de botones de opción, una línea por compañía (el nombre, el código, el tipo dicho con palabras —«Comercial», «Escuadrón SO» o «Personal»—, las redes y la flota). Tocar una línea la convierte en la compañía actual de este dispositivo (la elección es por dispositivo): solo cambian los botones de opción, la lista no se redibuja. Mientras el marco no sepa aún guardar esta elección, los botones están en gris y la tarjeta lo dice. Debajo, la ficha de la compañía elegida (las demás no tienen), desplegada: el **tipo** (dos botones de opción, una frase cada uno) y las **familias de misiones** (una casilla por familia: la sigla y el nombre), marcados según el tipo mientras no se marque nada; marcar o desmarcar escribe themes.json, al menos una familia queda marcada. **Añadir una familia** (una sigla de 2 a 8 letras o cifras, un nombre de 1 a 40 caracteres; ocho como máximo; se propone una **letra** libre para numerar los informes de la familia, rechazada con sus motivos si ya la tiene una familia de la tabla, M, D, X u otra familia añadida; una familia añadida antes de las letras recibe una letra libre propuesta, escrita solo cuando se fija) y **Añadir una serie** (una familia de la lista, un nombre; veinte por familia): el nombre escrito en el idioma de la pantalla se copia en los cuatro idiomas; la familia o la serie se quita con «Quitar». Siguen tres gestos, en este orden: «Crear una compañía» abre un **asistente en la misma pantalla**: el paso **Identidad** (el nombre; el código, propuesto según el nombre y editable, 2 a 8 letras minúsculas o cifras, nunca uno ya en uso; el **tipo**, Comercial o Escuadrón SO, Comercial preelegido; las redes) luego el paso **Familias de vuelos** (las del tipo, marcadas de antemano: desmarque lo que no vuela; si no toca nada no se escribe nada para las familias) luego el paso **Flota** («Flota · 2 aeronaves»: busque un tipo en la base de fichas, escriba la matrícula, «Añadir la aeronave»; «Quitar»; «Más tarde» si prefiere añadir las aeronaves desde Aeronaves) y después el **Resumen** en palabras («Rennes Motoculture · Comercial · IVAO · 1 familia · 2 aeronaves»). «Atrás» conserva todo lo escrito. **No se escribe nada antes de «Crear la compañía»**: entonces los ajustes, la flota (vacía) y, al final, la inscripción en la lista (una compañía solo aparece completa); un archivo existente nunca se sobrescribe. Si la creación se interrumpe, el mensaje dice qué está hecho y «Reanudar» termina sin sobrescribir nada. Al final, «Volar para esta compañía» la elige y abre Misiones. Si el código escrito ya tiene su carpeta pero la compañía falta en la lista, el asistente lo dice y ofrece **«Recuperar esta compañía»**: vuelve a la lista, no se escribe nada más. Veinte compañías como máximo; todo lo que se lee de data/airline/ se trata como texto no fiable. «Unirse a una compañía» abre otro asistente: pegue la página «Flota» del sitio de la compañía (o «Leer el portapapeles») y luego «Leer la página»; la pantalla muestra **lo que se ha leído** («4 aeronaves · 3 operadores»), el nombre y el código propuestos, el tipo («Escuadrón SO» por defecto), las redes y la dirección del sitio (opcional, https) **antes de escribir nada**; «Unirse» escribe entonces los ajustes, la flota leída y, al final, la inscripción en la lista. El paso «lo leído» dice también **cuántas misiones del registro ya tienen este código** («Registro: 2 misiones ya con este código») y sigue el código que escribe. Una compañía que ya está en la lista no se vuelve a unir: su flota se actualiza pegando en la pantalla del sitio de la compañía. En el equipo del lanzador, mientras su compañía siga en la raíz de data/airline/, la tarjeta ofrece **migrarla**: un código opcional (propuesto según el nombre), «Ver lo que se haría» (el nombre, la carpeta data/airline/<code>/, los archivos y su tamaño, la flota que estará vacía allí) y después «Migrar a «<code>»». No se borra ni se sobrescribe nada: los archivos actuales quedan como copia. En la ficha: sin tipo todas las familias vienen marcadas y la ficha invita a elegir el tipo; una compañía comercial tiene la familia Comercial (carga, pasajeros, vuelo en vacío, VIP, entrenamiento, tránsito, vuelos de prueba), un escuadrón las dieciséis familias militares. «Personal» (todas las familias) no tiene nada que ajustar.
