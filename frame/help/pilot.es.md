<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Piloto — manual

La aplicación Piloto reúne las herramientas para preparar y seguir un vuelo: combustible y nivel, mapa, informe, mis
vuelos, paso al sitio de la aerolínea. Funciona en un teléfono como en un ordenador, con o sin red.

## Primer inicio

- **Los verbos.** En un teléfono, la barra inferior ofrece cinco entradas: Preparar, Mapa, Informe, Vuelos, Meteo. Toque
  de nuevo una pestaña ya elegida cuando agrupa varias pantallas: se abre encima una pequeña lista (Preparar: Combustible y
  Fichas de rendimiento). En una pantalla, cada herramienta es un verbo de la columna izquierda. La dirección de una
  herramienta (`#fuel`, `#report`…) basta para volver a ella. Los Ajustes son el botón ⚙ de la cabecera. El nombre de la aplicación, arriba a la
  izquierda, abre la lista de aplicaciones: Piloto y, en el nivel Completo, Mantenimiento (el mismo avión en
  rojo); un toque pasa a ella.
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
  disponible (botón de estado, luego «Conflictos») y puede recuperarse.

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
(«Bloque · FL060→090→110→070 · viento ARPEGE FL060», completo al tocarlo), el combustible de bloque y tres teselas
«Etapa», «Tiempo» y «TOD» (inicio del descenso). La pantalla se abre siempre en la pestaña «Cálculo»; las fichas se abren
con la pestaña «Fichas». Una ✓ marca un paso completado. Los niveles se escriben igual en todas partes: en FL a partir de
5000 ft (FL060), en pies por debajo (3500 ft).

<a id="fuel-step-1"></a>**1 Vuelo.** La salida, la llegada y la alternativa (códigos OACI), la fecha del vuelo si quiere la previsión (TAF) en
lugar de la observación, la aeronave y el nivel de crucero (en FL). Bajo cada código, una línea fija da el nombre del aeródromo para comprobarlo (« LFPO — Paris-Orly »; « desconocido » si el código no corresponde a nada). Desde dos caracteres, un código o el comienzo de un nombre (« LFP », « orly »), el campo propone siete aeródromos como máximo: ↑ ↓ para elegir, Intro para validar, Esc para cerrar, o un toque; la lista se cierra al salir del campo, y escribir el código entero a mano funciona siempre. El nombre puede escribirse entero («toulouse»): solo un código elegido o tecleado entra en la ruta, y un campo que se deja sin elegir vuelve al aeródromo guardado. La fecha del vuelo (introducida en la hora local del dispositivo) es un único valor, guardado en el vuelo actual: la meteorología del cálculo (TAF de los aeródromos, vientos y temperaturas en altura) se lee a esa fecha, el ETA del mapa parte de ella mientras el vuelo no ha empezado, y el deslizador de Meteo parte de ella; vacío significa ahora. La aeronave cabe en una línea: la aeronave elegida,
su matrícula, su indicativo y de dónde viene. Un vuelo nuevo toma la última aeronave elegida en este
dispositivo; sin elección, el cálculo espera. La lupa abre la búsqueda (la última elegida primero): escriba una ficha, una matrícula, un indicativo
o un tipo. Los resultados llegan en este orden: sus fichas de rendimiento, las aeronaves de la aerolínea (su flota,
luego las conocidas por su diario), los tipos publicados y, en último lugar, el código tal como se escribió. Una
aeronave de la aerolínea toma su propia ficha si la tiene, si no la de su tipo, si no una estimación del tipo — el
cálculo la marca entonces «aproximado». La matrícula y el indicativo elegidos siguen al vuelo hasta el informe. La línea
«Crucero» indica de dónde viene el consumo.

Junto a la fecha, el reloj «+30» pone el vuelo dentro de 30 min (redondeado a 5 min; cada pulsación añade 30 min) y
«Ahora» vuelve a la hora actual: la meteorología de los aeródromos (el TAF si cubre esa hora) y los vientos en altura se
vuelven a leer en el acto.

<a id="fuel-step-2"></a>**2 Ruta.** Escriba la ruta en el campo «Ruta» (Intro la valida), siempre visible: los puntos, las aerovías y los
niveles, como en un plan de vuelo («LFBO TOU UN460 NTS/F280 LFRN»). También puede pegar ahí un plan de vuelo OACI o la
lista de un OFP. Al salir del campo, la ruta se pone en limpio: en mayúsculas en una línea, sin DCT ni grupos
velocidad-nivel, la salida y la llegada en los extremos, un cambio de nivel escrito «/F280» tras el punto donde empieza.
Las aerovías siguen escritas (el cálculo sigue los puntos). Los puntos desconocidos se quedan en su sitio y se señalan
justo debajo; las coordenadas se escriben a la manera OACI («4530N00030E»). La línea siguiente da la distancia y el
rumbo verdadero, y de dónde vienen (la ruta, el OFP de SimBrief). Si la ruta no se resuelve, «Introducir a mano» abre
los dos campos. Con su identificador SimBrief configurado (⚙), «Último OFP de SimBrief» retoma de una vez la ruta, el
nivel, el viento medio y la aeronave de su último plan.

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
campo de la ruta listo para escribir.

**Pista, SID, STAR y aproximación.** Al final del paso Ruta, una tarjeta «Procedimientos» lleva un lado Salida y un lado Llegada. Cada uno tiene un título («Salida LFPO Paris-Orly», con «En el mapa»: el Mapa se abre sobre los procedimientos del aeródromo; lo que allí se elige —pista, procedimiento, aproximación— vuelve aquí de una vez, aplicado como una elección hecha aquí y anunciado en una sola línea; una familia que el Mapa no toca queda como estaba), una sola línea discreta («leído el 29/10 16:53Z · Releer · 3 sin leer», luego «Fuente»: la página codificada del procedimiento elegido, en el SIA, en una pestaña nueva) y una cuadrícula fija, la misma en los dos lados: pista · SID · transición en la salida; pista · STAR · transición en la llegada y, debajo, aproximación · transición de aproximación (una transición solo aparece si el procedimiento elegido la tiene). En un teléfono, una sola columna; ninguna etiqueta se corta. Cada lista viene de aerodb y muestra todos los procedimientos del aeródromo en una sola lista ordenada por pista y luego por nombre (la pista figura en el texto solo si no hay pista elegida y el procedimiento sirve solo una: «OPALE 2E» una vez elegida la pista). Nada está prohibido: un procedimiento en conflicto con su elección se marca con ⚠ (una SID, STAR o aproximación que no sirve a la pista elegida; sin pista elegida, una STAR que no sirve a ninguna pista de la aproximación elegida; el motivo está en la información emergente — una STAR que no enlaza con la aproximación no es un conflicto: el Mapa las une con un trazo discontinuo) y aun así puede elegirlo — el ⚠ y la información emergente bastan, ninguna notificación lo repite. ⌛ (gris) significa caducado, ⚠ (naranja) en conflicto. En cada lista, lo compatible con su elección va primero y los ⚠ después; en la lista de pistas van primero las de la SID o la aproximación ya elegida. Un procedimiento que la fuente no supo leer bien (sin nombre o dudoso) nunca se ofrece: la línea discreta del lado dice cuántos no se leen («3 sin leer»: las páginas no leídas y los procedimientos por verificar del archivo leído). Si los datos del aeródromo no traen ninguna ficha de pista, las pistas ofrecidas son las que nombran sus procedimientos. Cada pista lleva el viento del METAR conocido del aeródromo (el del paso Salida): «13R — ↓ 12 kt · ← 6 kt»: la flecha muestra hacia dónde sopla el viento, con la pista vista hacia arriba como en final (↓ de frente, ↑ de cola, ← viento de la derecha, → viento de la izquierda). En verde un viento de frente; en naranja un viento de cola de hasta 5 kt o un cruzado de más de 10 kt; en rojo un viento de cola de más de 5 kt o un cruzado de más de 20 kt (o del límite de la ficha de la aeronave cuando la tiene); la razón en la información emergente. Sin METAR, no se muestra nada. El título de cada lado termina con el resumen de la elección, el mismo texto que el panel del Mapa: «13R · ↑ 12 kt», «MEN1A via NEPIX», «I13R» («SID ninguna» para una salida sin SID). Elegir una STAR o una aproximación que sirve una sola pista fija esa pista; una STAR ofrece sus transiciones, una aproximación sus transiciones de aproximación. Una aproximación se lee corta, su tipo y su pista («ILS 06», «RNP 06»; el nombre publicado en la información emergente). Los segmentos de aproximación inicial que el SIA publica aparte («INA RNAV RWY 06») nunca son filas: son las transiciones de todas las finales de su pista, «via ODILO 1A» (el IAF y luego el nombre publicado), y «—» sigue siendo el directo al IF. La primera opción, «—», significa «no elegido»; «ninguna» es una elección real (una salida directa, sin SID). Un procedimiento del respaldo X-Plane del puesto va el último, marcado «X-Plane, local»; uno leído en un ciclo anterior se marca ⌛ (volver a leer). En un aeródromo sin procedimiento publicado, la línea discreta lo dice («ningún procedimiento publicado · Leer los procedimientos de LFXX»): un aeródromo por gesto, nunca en silencio. Un aeródromo que ya tiene procedimientos muestra, en esa misma línea, la fecha de su última lectura («leído el 29/10 16:53Z», ⌛ si es de un ciclo anterior) y luego «Releer»: el mismo gesto, que sustituye el archivo leído. Un aeródromo francés se lee en el eAIP del SIA, sin cuenta; un Estado cuyo AIP publica tablas de procedimientos, en EAD Basic (credenciales configuradas en el puesto); para cualquier otro Estado, el mensaje dice que no hay ninguna tabla publicada. Sin lanzador, o en un dispositivo emparejado con el puesto, la lectura se hace en el puesto —el mensaje lo dice— y el OFP de SimBrief sigue siendo la fuente del vuelo. Una vez elegidas la SID y la STAR, el cálculo corre sobre el camino «ruta + procedimientos» (con la distancia de la SID y la STAR) y el Mapa los traza con sus altitudes y velocidades; sus restricciones de altitud no entran en los escalones del cálculo, se leen en el perfil vertical, que mantiene el crucero hasta que debe empezar el descenso y ya no vuelve a subir una vez empezado. «Último OFP de SimBrief» propone su SID y su STAR solo para los lados que aún no ha elegido («ninguna» es una elección): nunca sustituye su elección y dice lo que ha rellenado, una línea por lado («Llegada: STAR — → LERG1R»). Las elecciones hechas seguidas se escriben una sola vez, un momento después de la última. La tarjeta se abre plegada, para leerse sin desplazarse: una línea de resumen por lado («Salida LFRS · 03 · NTS1A», con «En el mapa»); un toque en la línea, o en ▸, despliega sus listas y su línea secundaria («Releer», «Fuente»), un lado a la vez. Un lado sin procedimientos queda desplegado: su línea ofrece la lectura.

<a id="fuel-step-3"></a>**3 Meteorología.** El viento (dirección e intensidad) y la desviación ISA. Sin dirección, o sin viento alguno, el
combustible de bloque se da como horquilla. «Leer la meteorología de los aeródromos» muestra la salida, la llegada, el
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

Despliegue «Consignas de ascenso» para seguir el ascenso hasta el nivel: potencia, régimen, velocidad, régimen de
ascenso, flujo, Mach, tiempo y combustible acumulados en cada escalón, con el perfil dibujado. El resultado da
combustible de bloque, combustible de viaje, tiempo de vuelo y distancia del inicio del descenso antes de la llegada.
«Detalle del cálculo» lo desglosa fase por fase.

«Abrir en» prepara el mismo vuelo en otro lugar, en una pestaña nueva: SimBrief (opciones del vuelo prerrellenadas, se
requiere sesión en SimBrief), SkyVector (la ruta trazada, con velocidad y nivel), Navigraph y ChartFox (las cartas de
los aeródromos de salida y llegada, se requiere sesión). Una entrada en gris indica lo que le falta (aeródromo, tipo de
aeronave). No se envía nada que no esté ya en el vuelo. Los ajustes del cálculo (rodaje, reserva, margen, corredor
meteorológico, unidades) están en el último desplegable.

<a id="fuel-step-5"></a>**5 Salida.** Un resumen de una página: la aeronave, la ruta tal como se presentará, el nivel (y sus escalones), el
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

La pestaña «Fichas» lista las fichas de la compañía, compartidas con todos sus dispositivos, **en solo lectura**: se
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
este vuelo (sustituye al de la ficha). «Unidades mostradas» cambia el combustible (kg o lb), la velocidad, las
altitudes y las distancias en pantalla; los niveles siguen siendo niveles de vuelo, y nada cambia en las fichas.

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

<!-- fr: 7f87e06dbfcb -->

<!-- chapter: maps -->
# Mapa

Ver su vuelo en una carta aeronáutica y su perfil vertical, o los mapas de una misión: espacios aéreos, aeródromos,
radioayudas, aerovías, altitudes mínimas. La ruta del vuelo también se modifica en el mapa.

## Cómo usarlo

**El vuelo previsto.** El mapa muestra el vuelo preparado en Combustible: salida, puntos de la ruta, llegada, y el
aeródromo alternativo en guiones grises. La pista, la SID, la STAR y la aproximación elegidas en Combustible se trazan sobre la ruta (SID en verde, STAR en naranja, aproximación en azul), con su nombre («SID ROYAN6P»). Su resumen (nivel, distancia, previsto o en vuelo) no se escribe sobre el dibujo (el dibujo lo muestra): el texto emergente del asa del bloque de datos bajo el mapa lo da, con salida y llegada, alternativa y tipo de aeronave. Cuando el vuelo cambia en Combustible, el mapa lo sigue por sí solo.

**El mapa y lo que muestra.** Alrededor de la ruta: los espacios aéreos que atraviesa o roza (zonas restringidas,
peligrosas, prohibidas, espacios controlados), las aerovías bajas o altas según su nivel, los aeródromos y las
radioayudas, y en cada cuadro de un grado la altitud mínima de seguridad (la cifra marrón, en miles y centenas de pies:
«3⁵» quiere decir 3500 ft). Las pequeñas cifras violetas a lo largo de la ruta son las distancias desde la salida, en
millas náuticas. Deslice el mapa con un dedo, separe dos dedos para hacer zoom (durante el gesto el mapa conserva solo sus trazos — espacios, aerovías,
ruta, aeródromos en pequeños cuadrados — y sus nombres vuelven en cuanto se detiene); «Recentrar» (la diana, arriba a la derecha del mapa) vuelve a toda la ruta. El
mapa se queda donde usted lo puso, aunque la ruta cambie: solo «Recentrar» (u otro vuelo) lo reencuadra. Mientras «Solo alrededor
del vuelo» esté marcada (Capas), los espacios y aerovías solo se leen cerca del vuelo, de lejos; desmárquela o acérquese
para verlo todo.

<a id="maps-procs"></a>**La pista y los procedimientos elegidos.** Lo que eligió en Combustible (pista, SID, STAR, aproximación) se traza sobre la ruta: la SID en verde, la STAR en naranja, la aproximación y su aproximación frustrada en azul, desde el umbral de la pista de salida hasta el primer punto de la ruta, y desde el último punto de la ruta hasta el umbral de la pista de llegada. Las transiciones y la aproximación frustrada van a trazos; un tramo sin punto (un ascenso en un rumbo, por ejemplo) es un trazo corto a lo largo de su rumbo y luego trazos hasta el punto siguiente; un viraje de radio constante es un arco. Cuando la SID no llega a un punto de la ruta, una recta a trazos la une a la ruta (igual para la STAR). Un procedimiento que no eligió no se dibuja nunca, y la lista de capas no tiene casilla para él. El nombre del procedimiento se escribe sobre su trazo, seguido del origen de sus datos cuando vienen de X-Plane o de Little Navmap («X-Plane, local») y luego del símbolo ⌛ (en gris) cuando se leyeron bajo un ciclo anterior; la leyenda (chip «i») lo recuerda. Desde la vista regional (ajustable en la página de umbrales), cada punto lleva sus restricciones; el nombre del procedimiento se escribe a todas las escalas, por encima de lo demás, como en las cartas de procedimientos: una altitud **subrayada** significa «como mínimo», **sobrerrayada** «como máximo», las dos «exactamente», «5000–7000» «entre las dos»; «≤ 220 kt» es la velocidad que no hay que superar. El perfil vertical sigue el mismo camino y muestra estas restricciones como escalones (flecha hacia arriba: como mínimo, hacia abajo: como máximo, punto: exactamente, barra: entre dos altitudes); su texto toma un lugar libre o ninguno, nunca sobre el nombre de un espacio, TOC / TOD o un escalón; las distancias, las horas estimadas y el cursor se miden a lo largo de ese camino. El mapa nunca cambia esta elección: toque un aeródromo de la ruta y su ficha da la pista y los procedimientos elegidos, con un botón «Cambiar» que abre Combustible en la línea que hay que modificar; un enlace «Fuente» abre en una pestaña nueva la página publicada del procedimiento (eAIP del SIA), y para un procedimiento leído en otro sitio el nombre de su documento aparece al pasar sobre la línea.

<a id="maps-rwy"></a>**Las pistas.** De cerca, cada pista de cada aeródromo dibujado es un vector corto desde su umbral, y el aeródromo muestra su nombre junto al código («LFPO Paris-Orly»); cada vector va en el sentido de la pista, su número en la cola, detrás del umbral: la pista elegida en Combustible en negrita con el color de su lado, las demás finas. Solo aparecen a partir del zoom fijado por la aerolínea (Ajustes › Administración, «Zoom de los umbrales de pista», 11 sin ajuste); por debajo, nada. En «Elegir en el mapa», todas las pistas del aeródromo se dibujan así, la elegida en negrita; los dibujos de la elección pasan por encima de las etiquetas del fondo, atenuadas.

<a id="maps-choose"></a>**Elegir en el mapa.** El botón «En el mapa» de un lado de Combustible (salida o llegada) abre el mapa sobre ese aeródromo —como «Elegir en el mapa» en la ficha del aeródromo de salida o de llegada (toque su símbolo; a todo el ancho en un teléfono)—: la hoja se abre desplegada («Terminar» queda al pie, siempre visible), el mapa de fondo y las capas se atenúan y la vista se ajusta al aeródromo y a sus procedimientos compatibles con su elección, a 40 NM a su alrededor (las entradas lejanas quedan fuera del encuadre; un procedimiento elegido que sale de la vista la amplía solo a él). Arriba del bloque de datos, su selección en una línea por familia («Pista 31 · ↑ 12 kt», «OKRI5L», «I31 vía IAF1»), cada una con ✕ para volver a «Ninguna»; tocar el nombre de una familia («Pista», «STAR», «Aproximación») lleva a su grupo y lo despliega. Debajo, las tres familias a la vez —la pista, la SID (salida) o la STAR, la aproximación (llegada)— en líneas apretadas: tres toques en el orden que prefiera. Cada elección reduce las otras dos familias a lo que le es compatible; el resto queda plegado bajo una línea fina «N más · Todas», que lo despliega marcado con ⚠ (se puede elegir igualmente). Las SID que salen y las STAR que entran en la ruta que ha escrito vienen primero, bajo «Hacia su ruta»; las demás siguen, marcadas «salida LACOU» o «entrada OKRIX». En una ruta directa (ningún punto ni aerovía entre los dos aeródromos), nada de eso: se ordenan por su dirección hacia el otro aeródromo, «Hacia LFPO» encima de las mejor orientadas (a menos de 60°), una pequeña flecha en el sentido del vuelo en cada fila. «Ninguna» es siempre la primera línea. Los procedimientos que solo difieren por la pista (OKRI5L, OKRI5R) forman una línea «OKRI5» con sus pistas en pequeñas etiquetas: tocarla elige la familia y reduce las pistas, tocar una pista elige el procedimiento. Las aproximaciones se leen por su etiqueta corta («ILS 06», «RNP 06», sin etiqueta de pista porque la etiqueta ya la dice, la misma en el mapa; el nombre publicado al pasar por encima); bajo la aproximación elegida, «Sin transición» y luego sus transiciones, entre ellas los segmentos de aproximación inicial que el SIA publica para toda la pista («via ODILO 1A»), en el tono de su final; una STAR elegida solo deja las transiciones que parten de uno de sus puntos (si no, la transición vuelve a «Ninguna»); una transición que no se une a la final en un punto común se enlaza con una línea discontinua. Cada procedimiento tiene su tono (ocho, en ciclo), el mismo en su línea, su etiqueta y su trazado; en el mapa, una pequeña etiqueta por familia y por punto («NIMER 9»), y el procedimiento sobrevolado o tocado pasa por encima de todo, con su nombre completo; pasar sobre una línea de cualquier familia resalta su trazado, pasar sobre un trazado resalta su línea; ⌛ (gris): leído en un ciclo anterior. El código del aeródromo queda escrito por encima de los procedimientos; los números de pista toman su lugar antes que las radioayudas, que les ceden; un número que caería sobre una etiqueta no se escribe (la flecha queda). Cada pista lleva el viento del METAR ya conocido: «↓ 12 kt» de cara, «↑» de cola, luego el cruzado (← viento de la derecha, → viento de la izquierda: la flecha dice hacia dónde sopla, la pista dibujada hacia arriba, como en Combustible), en verde, naranja o rojo según el viento de cola y el cruzado; sin METAR, nada. Un toque en una línea o un trazado añade esa elección y la deja en el mapa (la pista en negrita, el procedimiento en su tono, los demás de su familia atenuados); todavía no se escribe nada. Un procedimiento que sirve una sola pista la elige si no hay ninguna; si no, una línea bajo el grupo propone la corrección, con un toque: «OPAL2E sirve a la 25 — Pasar a la 25», o «OKRIX5A no sirve a la 07 — Elegir OKRIX5B». «Terminar», la cruz ✕ o Escape le devuelven a Combustible con todo lo elegido; Combustible lo escribe y dice qué ha cambiado; el mapa no escribe nada. Para renunciar sin devolver nada: «← Combustible» arriba.

<a id="maps-coverage"></a>**Cobertura.** La capa «Cobertura» (en la lista de capas, apagada al principio, encendida solo por su casilla) colorea los aeródromos según lo que este dispositivo puede dar de sus procedimientos: **verde**, se tienen (publicados, introducidos a mano o leídos en este equipo); **naranja**, se tienen pero leídos en parte (páginas sin leer, fichas por revisar: la ficha del aeródromo dice cuántas) o se leen a petición (Francia mediante el eAIP del SIA, un Estado cuyas tablas se pueden leer, un aeródromo de la base local de Little Navmap); **rojo**, nada legible (solo imágenes, texto en prosa, nada en este equipo). La leyenda (la pastilla «i» del bloque de datos) da una línea por color mientras la capa se muestra. Solo se consultan los aeródromos visibles. Toque un aeródromo: su ficha añade una línea con la pastilla, el nivel y el motivo (⌛ si los procedimientos que se tienen son de un ciclo anterior, y luego cuántas SID, STAR y aproximaciones se tienen). Cuando el dispositivo no puede dar esta información, la capa no se ofrece.

<a id="maps-weather"></a>**El perfil y el cursor.** En el bloque de datos bajo el mapa, el perfil vertical corta la ruta de punta a punta: el relieve, los espacios
aéreos en los que entra a la altitud prevista, y la trayectoria del vuelo en violeta. Deslice el dedo por el perfil: un
cursor azul lo sigue, y el mismo cursor se coloca en el mapa. Toque la ruta en el mapa para colocarlo allí. La línea
bajo el perfil dice lo que hay bajo el cursor: distancia desde la salida, altitud prevista, altura del relieve, y el
espacio aéreo en el que está en ese momento. Bajo el mapa, este bloque de datos muestra el perfil; la lista de los
espacios de un punto o los puntos de notificación de un aeródromo se abren en su lugar cuando los pide, y el perfil
vuelve al cerrarlos. La pastilla con forma de nube, (las tres pastillas — perfil, nube, «i» — están siempre en la línea superior, a la derecha; la que no tiene nada que mostrar solo se atenúa), lo sustituye (la pastilla del perfil lo devuelve) por el corte
meteorológico a lo largo de la ruta (viento, temperatura, nubes, engelamiento) a la altitud del vuelo; el corte sigue el mismo cursor, y un toque sobre
él lo mueve. Solo muestra la previsión que Meteo ya ha cargado: sin ella, la línea «Sin previsión cargada» lleva a Meteo, en Preparar. La última pastilla, «i» (atenuada mientras el dibujo no tiene leyenda), abre sobre el perfil su leyenda (qué es cada trazo, banda y marca); arrastrar el dedo sobre el corte mueve el cursor como en el perfil. El perfil y el corte se dibujan a la altura exacta del bloque, con su eje de distancias siempre a la vista: en un bloque bajo quitan etiquetas de niveles, nunca el eje.

<a id="maps-profile-spaces"></a>**Los espacios del perfil.** El perfil solo muestra los espacios en los que entra la trayectoria vertical prevista (con 500 ft de margen); los sectores de una misma familia que se solapan (las CTA de Dublín) forman allí una sola envolvente, nombrada por la familia; el espacio de ruta libre (FRA) y las zonas W o de investigación meteorológica solo aparecen con la capa «Otros espacios» encendida; como mucho se nombran siete espacios, los demás en la lista de abajo.

<a id="maps-profile-zoom"></a>**Ampliar el perfil.** Para leer el perfil con precisión, ciérrelo sobre una parte del vuelo: pellizque con dos dedos (el centro de los dedos se queda en su sitio) y arrastre con dos dedos para mover la ventana; un solo dedo sigue siendo el cursor de lectura. La escala de altitudes se reajusta a lo que muestra la ventana (de ahí viene la precisión), las marcas de distancia (NM) se estrechan con ella, y los puntos fuera de la ventana no se dibujan. Un doble toque vuelve al vuelo entero, igual que el botón «Vuelo entero», que aparece en la línea superior mientras el perfil está ampliado. En pantalla: Ctrl + rueda amplía alrededor del puntero, arrastrar mueve la ventana, un doble clic vuelve al vuelo entero. La ampliación se conserva mientras la página siga abierta y la ruta no cambie; nunca se guarda. El corte meteorológico se amplía de la misma manera (mismos gestos, mismo botón «Vuelo entero») y la ventana es la misma para los dos: amplíe uno, pase al otro con la ficha y encontrará la misma parte del vuelo; el corte también reajusta su escala de altura a lo que muestra.

**Una pantalla fija.** Nada entre el encabezado y el mapa: el mapa y el bloque de datos llenan la pantalla, y nada se desplaza salvo el contenido del bloque. Los botones están sobre el mapa: a la derecha, de arriba abajo, «Editar la ruta» (el lápiz), «Recentrar», el modo de mapa, «Editar en el mapa» (las cuatro flechas) y, al final, la pantalla completa (Esc sale de ella). «Capas» está en la línea de la hoja, a la izquierda de su asa, junto a lo que abre; sin nada que dibujar, la hoja se reduce a esa línea. El bloque es una hoja: arrastre su línea superior (la barrita; a su altura normal la línea no lleva título sobre un perfil o un corte, solo las tres pastillas) hacia arriba para
ampliarlo, hacia abajo para reducirlo a esa línea, lo que deja toda la altura al mapa; un toque en la línea lo reduce o
lo devuelve a su altura normal.

**Seis modos de mapa.** El botón del modo, a la derecha del mapa, muestra el modo elegido; tóquelo para ver los seis
modos. «IFR bajo»: aerovías inferiores, espacios aéreos, altitudes mínimas y radioayudas. «IFR alto»: aerovías
superiores (UN…, UM…), espacios por encima del FL195. «VFR»: fondo topográfico con las ciudades, los espacios útiles en
VFR, los puntos de notificación y los obstáculos. «Topo»: el relieve y, de cerca, las curvas de nivel (cada 500 ft o 100
m según su unidad, las directoras numeradas), solo con los aeródromos, las ciudades y los obstáculos. «CAM»: vuelo
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
densidad en todas partes, filtrada solo por la complejidad — salvo una vista de más de 600 NM de ancho, leída alrededor
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

**Escalones.** Si la ruta fija un nivel en algunos puntos en Combustible, el perfil dibuja los escalones: ascenso,
nivel, nuevo ascenso o descenso, con el final del ascenso y el inicio del descenso calculados de nuevo. Los puntos de
giro de la ruta también se marcan en el perfil.

**Ascenso y descenso.** Los rombos violetas marcan el final del ascenso (TOC) y el inicio del descenso (TOD), tanto en
el mapa como en el perfil. Vienen del cálculo de Combustible; sin él, el mapa los estima con regímenes de ascenso y de
descenso habituales.

**Los mapas de misión.** La lista al pie de las capas (el botón de capas) elige lo que muestra el mapa: el vuelo previsto, o una misión de
la aerolínea. Para una misión, una segunda lista elige entre sus mapas (vista de conjunto, objetivo, detalle…). Cada
mapa se redibuja como en el estudio: mismo marco, mismo perfil de visualización, con los puntos de la misión, sus zonas
rayadas y su recorrido. El perfil vertical muestra entonces el de la misión.

<a id="maps-edit"></a>**Modificar la ruta en el mapa.** Toque «Editar en el mapa» (las cuatro flechas, a la derecha del mapa; la primera vez aparece una breve ayuda): los puntos de giro se rodean de un
círculo. Arrastre un punto sobre un fijo, una radioayuda o un aeródromo: se coloca allí (soltado en otro lugar, se
vuelve un punto libre, nombrado por sus coordenadas, como 4530N00030E). Para añadir un punto, toque «+» (en la misma columna)
y luego el lugar deseado (o mantenga pulsado medio segundo): sobre un fijo, una radioayuda o un aeródromo se coloca
allí, en otro lugar es un punto libre; se añade al tramo más cercano. Un toque simple no añade nada: muestra la burbuja.
Toque un punto de la ruta: su tarjeta da su nivel y propone «Quitar». La salida y la llegada no se mueven aquí. En el
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

<!-- fr: 6711a441ef6a -->

<!-- chapter: report -->
# Informe

Escribir el informe de un vuelo en unos pocos toques, con o sin misión: el módulo retoma lo que ya sabe de su vuelo,
usted completa, guarda — y, si lo desea, el vuelo se registra en el sitio de la aerolínea en el mismo gesto.

## Cómo usarlo

<a id="report-steps"></a>**Tres pasos.** El informe se rellena en tres pasos: Vuelo, Misión, Resultado. En un teléfono, un paso cada vez
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

**Las otras fuentes.** Despliegue «Otras fuentes» para retomar su último vuelo IVAO o VATSIM, su plan de vuelo
SimBrief, o un texto pegado: un plan de vuelo OACI, la página de un vuelo del tracker IVAO o de StatSim, un METAR. Solo
se rellenan los campos vacíos; la línea «Rellenado desde: …» bajo el título de la tarjeta dice de dónde vienen. Si una fuente da otra cosa para campos ya rellenados, un
botón propone sustituirlos.

<a id="report-step-2"></a>**La misión.** En el segundo paso: la familia (propuesta según su último informe), la serie, el identificador de la
misión si el vuelo sigue una, y después los bloques propios de la familia. Algunos bloques solo aparecen para una serie
(por ejemplo VIP o traslado en las misiones especiales). Mientras no abra este paso, aparece «por ver» en lugar
de ✓: la familia y la serie de un informe nuevo se toman por defecto.

<a id="report-step-3"></a>**El resultado.** En el último paso: el resultado, sus observaciones, la tripulación (usted primero, como comandante) y
el combustible a la salida y al aterrizaje. Las incoherencias — horas desordenadas, fecha futura, combustible que
aumenta — se señalan.

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

<!-- fr: 7c1d42bd47bd -->

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

<a id="flightlog-list"></a>**La lista.** Una línea por vuelo: la fecha, el indicativo, la ruta y el tiempo de bloque. Un punto naranja marca un
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

<!-- fr: ec2aee8de0eb -->

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

<!-- chapter: atmosphere -->
# Meteo

La atmósfera a lo largo del vuelo preparado en Combustible: un mapa meteorológico al nivel elegido, el corte vertical de
la ruta, el corte de un punto, a la hora de salida o más tarde.

## Cómo usarlo

**El vuelo.** Meteo muestra siempre el vuelo preparado en Combustible (ruta, nivel, fecha del vuelo). Sin vuelo previsto,
la página lo dice y lleva a Combustible; «Ver el ejemplo» muestra un vuelo de demostración, marcado como tal en el
asa.

**Cargar la previsión.** El botón de carga (la flecha hacia abajo, a la derecha del mapa) lee la previsión a lo largo de
la ruta y alrededor de ella. No se pide nada al abrir: la página muestra lo que el aparato ya ha guardado. Fuera de la
zona del vuelo, el mapa muestra el sinóptico mundial publicado con la aplicación, sin pedir nada.

**El mapa meteorológico.** Isobaras, isotermas, nubes, viento, corriente en chorro y convección, al nivel elegido con la
pastilla del nivel («Suelo», el nivel solicitado, la trayectoria calculada o una altitud fija). El botón de capas (arriba
a la izquierda) abre un panel sobre el mapa: elige lo que se dibuja en el mapa y en el perfil, y el corte sigue visible
abajo, redibujado con cada casilla; la cruz o Escape lo cierra. Toque un punto del mapa para abrir su corte.

**La zona del vuelo y el mundo.** Una línea fina rodea la zona del vuelo: dentro, la previsión fina cargada para el vuelo
(Météo-France AROME 1,3 km y ARPEGE 0,1° sobre Francia, ICON en Europa); fuera, el sinóptico mundial (GFS de la NOAA,
publicado con una malla de 5°). Los dos modelos no dicen exactamente lo mismo: un salto de las líneas al cruzar la línea
es normal. El panel de capas nombra los dos modelos y su malla.

**La fecha del vuelo.** El cursor bajo el asa adelanta la hora de 0 a 72 horas desde la salida prevista: el mapa, el
corte y los cortes de punto siguen. Cuando una parte del cursor queda fuera de la previsión leída (una salida prevista ya
pasada, días aún no cargados), una banda bajo el cursor muestra las horas cubiertas; fuera de ellas se muestra la hora más
cercana, ⚠ lo indica en la línea del cursor y en el asa, y aparece un aviso.

**El corte y los cortes de punto.** Bajo el mapa, el corte muestra la ruta de un extremo a otro, del suelo hasta por
encima del nivel del vuelo. Tóquelo para abrir el corte del punto más cercano (el perfil vertical de la atmósfera allí);
◀ y ▶ pasan al corte vecino, ✕ vuelve al corte de la ruta. El dibujo cabe siempre en el bloque, con su eje de distancias
visible; amplíe el bloque para ver más detalle.

**Ampliar el corte.** Pellizque el corte con dos dedos (o Ctrl + rueda) para mostrar solo una parte, y deslícelo con dos
dedos; las distancias, los puntos, los vientos y la escala de alturas siguen la parte mostrada. Un solo dedo conserva su
papel (abrir un corte de punto, mover el bloque). «Vuelo entero», en la línea del asa, un doble toque o un doble clic
vuelven a la ruta entera; un cambio de ruta también.

**La leyenda.** La pastilla «i», en la línea del asa a la derecha (después de ◀ y ▶), muestra la leyenda de lo dibujado;
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
- Lo cargado se queda en el aparato y sirve sin conexión; el Mapa reutiliza su corte meteorológico.

<!-- fr: acaaf2c98cee -->

<!-- chapter: data -->
# Datos

Lo que la aerolínea publica para la aplicación —la base aeronáutica, los procedimientos, las aeronaves, la meteorología— y el estado de cada conjunto de datos. Esta pantalla sirve para leer y ofrece acciones sobre cada grupo: descargar las fuentes, construir, purgar y después publicar.

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

<a id="data-zone-map"></a>**El mapa de las zonas por marcar.** Sobre la lista de zonas (panel de la base) y de Estados (panel de procedimientos: Francia y Estados Unidos), un mapa dibuja los contornos: tocar una zona la marca o la desmarca, exactamente como su casilla en la lista (una sola selección: el mapa y la lista se redibujan ambos desde ella). Con el teclado, Tab alcanza cada zona, Espacio o Entrada la marca. Cada zona dice su nombre y su estado con palabras («Francia — ciclo superado o ausente, marcada»); el color sigue el estado (al día, ciclo superado o ausente, en curso, fuera de la cobertura: la leyenda bajo el mapa los nombra) pero nunca va solo: una zona marcada tiene un trazo grueso y un tono lleno. Si una zona fuera demasiado pequeña para el dedo (menos de 44 px) al ancho de la pantalla, como suele pasar en un teléfono, el mapa no se dibuja y la lista queda sola; igual cuando el marco no da los contornos. Durante una operación, el mapa queda congelado como la lista.

<a id="data-pickup"></a>**Tomar el archivo descargado.** Algunas fuentes no se descargan solas (el SIA para Francia, NATS para el Reino Unido): usted las descarga en su navegador y luego «Tomar el archivo descargado» (el segundo botón del panel de la base, y bajo la línea «para depositar a mano» de una descarga) busca en la carpeta Descargas del equipo el zip más reciente con el nombre esperado (por ejemplo EG_*_DS_*_XML.zip). Primero el plan y una sola pregunta: para cada zona el zip encontrado (nombre, número de archivos, tamaño), lo que falta (con el nombre esperado), adónde van los archivos (data/sia/, data/sia/zones/gb/); son fuentes en bruto del equipo, nunca con commit. Si no se encuentra nada: ninguna pregunta, la pantalla dice lo que falta. Al final: «Tomado: n archivos (x MB)», los fallos nombrados (zip demasiado grande, nada útil en el zip…) y «Ahora lance Construir». «Actualizar todo» nunca lanza esta toma: sigue siendo un gesto. El botón queda en gris con su motivo si el lanzador de este equipo aún no conoce la operación.

<a id="data-purge"></a>**Purgar.** El botón «Purgar» retira del equipo las fuentes en bruto de las zonas marcadas (las que se vuelven a descargar) y sus cachés. Primero calcula el plan sin borrar nada y luego hace una sola pregunta: «¿Purgar 15 archivos (14,3 MB) de las fuentes de España, Francia?». Si los archivos del SIA (Francia) forman parte, la pregunta recuerda que sirven también para los contornos de las demás zonas en la construcción; los archivos seguidos por git se conservan siempre y se cuentan. No: no se retira nada. Sí: la purga se hace y la pantalla dice «Purgado: n archivos, x MB», con las rutas rechazadas (dejadas en su sitio). Nada que retirar: «Nada que purgar», sin pregunta.

<a id="data-publish"></a>**Publicar la base.** Bajo «Construir», el panel «Publicar la base» envía al repositorio de datos lo que se construyó en este equipo. Una zona construida se confirma entera en el equipo y sale también en la siguiente sincronización: «Publicar» la envía enseguida. Primero dice cómo está el equipo: «3 archivos modificados · 2 commits por enviar», la fecha del último paso y, si la hay, la fusión que espera en data/ (la publicación la concluye primero). Toque «Publicar»: una sola pregunta recuerda los archivos y los commits, luego se hace el paso; una barra sin fin indica que trabaja. Mientras tanto los botones del panel «Descargar, construir, purgar» están en gris, y «Publicar» lo está durante cualquier operación de ese panel: una operación a la vez.

<a id="data-publish-end"></a>**Al final de la publicación.** Una notificación da las cifras y el resultado queda en el panel: lo que se envió (archivos con commit, archivos recibidos); los archivos de la base conservados en el equipo porque había una construcción en curso; los conflictos (se conserva el más reciente, véase Ajustes › Conflictos); los archivos rechazados porque no tienen el formato de un archivo de datos. Un fallo se dice en una frase, con lo que responde el lanzador: no se pierde nada, los archivos siguen en el equipo. El botón está en gris con su motivo escrito debajo: «Hace falta el lanzador del equipo», «Hay una construcción en curso: publique cuando termine», «Nada que publicar», «El marco aún no sabe publicar la base: actualice la aplicación», «Sin conexión».

<a id="data-set-panels"></a>**Los mismos botones para cada grupo.** Cada grupo tiene su panel «Descargar · Construir · Purgar»: la Base aeronáutica, los Procedimientos, los puntos VFR de las cartas VAC (en el grupo Base aeronáutica, bajo «Publicar») y las Aeronaves. El principio es el mismo en todas partes: una sola operación a la vez, en todos los paneles (se vuelve a encontrar al reabrir la pantalla); una línea por elemento durante la marcha, una frase final y una notificación, una línea en el diario; «Purgar» calcula primero un plan sin borrar nada y luego hace una sola pregunta. Procedimientos: marque los Estados que se leen en bloque, Francia (eAIP del SIA) y Estados Unidos (CIFP de la FAA); ninguno viene marcado. Los Estados leídos por EAD Basic nunca se leen en bloque: un aeródromo a la vez, con «Volver a leer» en Combustible o en el Mapa. Puntos VFR: el ciclo vigente, sin casilla; «Descargar» obtiene las cartas VAC del ciclo («n cartas aún no publicadas» no es un fallo); «Construir» necesita primero la base de Francia de este ciclo, las cartas descargadas y pypdf (el asistente de primera instalación lo instala), y dice si no se hizo commit por falta de trigrama; «Purgar» vacía la caché de cartas de todos los ciclos. Aeronaves: tipos OACI separados por comas o espacios (2 a 4 letras o dígitos); un código rechazado se dice y no se envía nada, un campo vacío significa los tipos de la flota; las líneas de la marcha son los tres pasos (tipos, rendimiento, perfiles SimBrief). La meteorología no tiene panel: se publica con el sitio. Un botón en gris con «El lanzador de este equipo aún no conoce esta operación»: el lanzador de este equipo es más antiguo que la aplicación, actualícelo. «Descargar» y «Purgar» no hacen commit de nada. «Construir» hace commit de sus resultados en el equipo, salvo para las aeronaves: la carpeta AircraftDB/ de este equipo no está versionada, el envío se hace con «Fichas publicadas». Mientras una fusión espera en data/, ninguna construcción ni publicación de fichas escribe nada: la pantalla dice «Una fusión espera en data/: sincronice primero (Ajustes › Sincronización)».

<a id="data-aircraft-sheets"></a>**Las fichas publicadas de la compañía.** Bajo las Aeronaves, «Publicar» copia las fichas de la compañía al repositorio de datos. Calcula primero un plan sin cambiar nada y luego hace una sola pregunta (fichas por copiar, fichas por retirar, tamaño total); si acepta, la copia, el commit y el envío se hacen en un solo gesto. Hace falta su trigrama (Ajustes › Identidad); sin él, la pantalla lo dice y no se envía nada. Si no hay nada que copiar ni retirar: «Nada que publicar».

<a id="data-update-all"></a>**Actualizar todo.** Bajo la cobertura, el botón «Actualizar todo (n conjuntos)» rehace de un gesto lo que han elegido los paneles: para cada conjunto, en el orden publicado (la base aeronáutica, los procedimientos, los puntos VFR, las aeronaves), «Descargar» y luego «Construir»; nunca una purga, nunca las fichas publicadas. Primero un plan y una sola pregunta: el ciclo AIRAC, los conjuntos con lo que toca cada uno (zonas, Estados, ciclo, tipos o los tipos de la flota), el tamaño de las descargas (no se conoce de antemano); un conjunto sin nada marcado, con tipos rechazados o cuyos verbos el lanzador no conoce se omite, con su motivo. Después una línea de cadena dice el conjunto y el paso en curso («2 / 4 conjuntos») con un solo «Detener» para toda la cadena; los demás botones quedan en gris. La cadena se detiene en el primer fallo (aunque sea parcial), en la parada pedida o si una fusión espera en data/: lo ya construido sigue con commit en el equipo, no se publica nada, y la pantalla dice qué conjunto y por qué. Una descarga sin novedades («nada que descargar», cartas aún no publicadas) no la detiene. Si todo salió bien, sale una sola publicación, sin más pregunta que el plan; si es imposible (el marco no sabe publicar, nada que enviar), la cadena lo dice. El diario guarda una línea para toda la cadena, con el resultado de cada conjunto; una sola notificación al final. Si la página se recarga por el camino, se vuelve a encontrar el trabajo en curso del lanzador, pero la cadena no continúa: «Cadena interrumpida por la recarga: vuelva a lanzar «Actualizar todo»». Un punto de atención marca «Construir» de la base y «Actualizar todo» cuando el ciclo publicado es más antiguo que el vigente («Ciclo 2610 superado, reconstruir para 2611»).

<a id="data-journal"></a>**El diario.** Al pie de la pantalla, las últimas 50 operaciones de este dispositivo: hora UTC, verbo, zonas, resultado.

## Casos particulares

- **Sin lanzador**: la pantalla se lee igual; muestra lo que está publicado.
- **Una lectura que falla**: la sección lo dice en una línea y el resto de la pantalla se dibuja.

<!-- fr: 0b1b729ff2bd -->

<!-- chapter: aircraft -->
# Aeronaves

La flota de la compañía, tal como la leen las demás pantallas: el informe (matrícula → tipo, indicativos), el mapa, el CPCO. Las fichas de rendimiento están en la misma pantalla (pestaña «Fichas»); el registro de tipos llegará.

## Cómo usarlo

<a id="aircraft-fleet"></a>**La flota.** Una fila por aeronave: matrícula, tipo, indicativos, base, «fuera de servicio» cuando lo está. La búsqueda filtra por matrícula, tipo, un indicativo o la base; se muestran siete filas, «N más» despliega el resto. «Añadir» abre una aeronave vacía.

<a id="aircraft-edit"></a>**Modificar una aeronave.** Un toque en una fila la abre: identidad (matrícula, tipo, variante, operador) y operación (indicativos separados por comas, base, número táctico, en servicio). Bajo los campos, una línea dice lo que va a cambiar («2 campos cambiados: base, indicativos»); «Guardar» lo escribe. Un tipo que la base no conoce se guarda tal cual, y la pantalla lo dice. La matrícula es la clave: dos aeronaves no pueden compartirla. La ubicación que da el sitio queda como está. «Retirar» pregunta, y luego la aeronave sale de la flota; su ficha de rendimiento, si la tiene, se conserva.

<a id="aircraft-sheets"></a>**Las fichas.** La pestaña «Fichas» lista las fichas de rendimiento por familia (helicópteros, turbohélices, reactores, pistón, otros); la búsqueda filtra por nombre, tipo o matrícula. Cada fila dice de dónde viene la ficha, qué le falta y su fecha; un tipo de la flota sin ficha se propone «por completar». «Importar un archivo» lee un CSV, un JSON, un .lnmperf o un OFP de SimBrief; «Pegar un texto» lee un texto pegado, incluida una respuesta de ChatGPT; «Nueva ficha» pide el código del tipo. No se escribe nada de inmediato: una importación muestra primero, campo por campo, lo que cambiaría; desmarque lo que conserva y luego «Aplicar la selección». La pestaña elegida se guarda en el dispositivo, y el enlace `#aircraft?sheet=<id>` abre directamente el editor de una ficha.

<a id="aircraft-sheet-edit"></a>**Modificar una ficha.** «Editar» abre el editor: los campos por grupo (identidad, combustible, pista y alternativo, ascenso, crucero, descenso, régimen), la tabla régimen / consumo en pantalla grande, y el complemento EUROCONTROL, «completar desde otra ficha» o la petición a ChatGPT para rellenar los campos vacíos. Bajo cada campo rellenado, una línea gris indica su origen y su fecha («lnmperf · 28/10», «editado · 30/10»); al pasar el cursor se ven los valores descartados. «Guardar» abre la vista previa de los cambios, que solo se escriben tras «Aplicar la selección»; así cada campo cambiado conserva su fuente y se guarda el valor anterior. «Exportar .lnmperf» y «Exportar JSON» descargan la ficha; «Eliminar» pregunta antes de retirar la ficha de la base compartida.

## Bueno saber

- El módulo Sitio también actualiza la flota a partir de la página «Flota» del sitio pegada: los dos escriben el mismo archivo, cada guardado relee el archivo justo antes y cambia una sola aeronave.
- Nada sale antes de la próxima sincronización.

<!-- fr: 6c68e01d8018 -->

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
remoto se configura en la tarjeta «Administración» (vea «Un repositorio git para data/»).

**Sin acceso ni lanzador, no hay bases.** Un dispositivo sin acceso configurado y sin lanzador — el sitio abierto en un
teléfono por primera vez, por ejemplo — no tiene ni la base aeronáutica (espacios, aeródromos, radioayudas) ni la base
de aeronaves: «Datos sin conexión» lo dice. Dos vías: configure el acceso al repositorio de datos, incluso sin marcar
intercambio (entonces solo sirve para leer las bases); o, en un puesto con lanzador, publique las bases en el
repositorio (V2: Ajustes › Mantenimiento › Datos aeronáuticos y Tipos de aeronave), luego sincronice. Tres estados distintos cuando falta la base: «Base aeronáutica cargándose…» (la lectura no ha terminado: espere), «Acceso a los datos no configurado en este dispositivo» (configure el acceso arriba; una aplicación añadida a la pantalla de inicio tiene su propio almacenamiento, nada de lo de Safari está allí) y «Base aeronáutica no publicada» (el acceso funciona, nada está publicado en el repositorio).

**La sincronización.** Con un intercambio marcado, la tarjeta «Sincronización» da la última correcta, las escrituras
pendientes y la red; «Sincronizar ahora» envía y recibe en el acto. Si no, se hace sola al inicio, cada 10 minutos en
línea y al volver la red. Mientras haya escrituras pendientes, la tarjeta las lista, las más recientes primero: ruta,
módulo y hora, ✕ para una eliminación, con el último error si lo hay.

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

En un puesto servido por el lanzador, en el nivel Completo, el botón «Repositorio remoto de data/» de la tarjeta
«Administración» muestra el repositorio remoto de `data/`: su dirección y su
rama. Para configurarlo o cambiarlo, escriba la dirección (`git@host:cuenta/repo.git` o `https://…`, sin contraseña ni
token dentro): «Comprobar» indica si el repositorio responde, «Guardar» lo configura. Hacia otra dirección distinta de la configurada, se abre una ventana Sí / No en el equipo, no en la página: la tarjeta lo dice antes del clic; respóndala (puede estar detrás de otras ventanas) y vuelva. Rechazada, cerrada o ya abierta: la tarjeta da el motivo y `data/` se queda tal cual. Es a propósito: una página trampa no debe poder enviar sus datos a otro lugar. Nada bloquea: un repositorio que no responde solo
se señala.

- **El acceso al repositorio** se configura en el equipo: una clave SSH para una dirección `git@…`, credenciales
  guardadas en Git para una dirección `https://…`.
- **El proveedor** no es un ajuste: se lee de la dirección del repositorio remoto. En la parte superior del panel, «Proveedor: GitLab · proyecto grupo/proyecto» (el proyecto es un enlace a su página); para GitLab, el enlace «Tokens de los pilotos» lleva a la creación de los tokens de acogida; para GitHub, el panel propone introducir la dirección de un proyecto GitLab, porque la acogida por token de proyecto lo requiere. La página solo propone: cambiar de repositorio pasa, como siempre, por la ventana Sí / No del lanzador. La configuración exportada lleva el proveedor, y el lado del piloto se abre sobre él.
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

**Preparar la configuración (administrador).** En un puesto servido por el lanzador, o en un dispositivo configurado con
GitHub, en el nivel «Completo», toque «Exportar una configuración para un piloto» en la tarjeta «Administración»: recuerda sus pasos
en orden. Invite primero el nombre de GitHub del piloto al repositorio, con el rol Write (el enlace lleva a la página de
colaboradores del repositorio). Escriba luego su trigrama y la dirección de la aplicación publicada, y «Crear el archivo
y el enlace»: el archivo sog-config-<TRI>.json se guarda, el enlace y su código QR aparecen. Contienen la aerolínea, el
repositorio de datos, el trigrama y las instrucciones del token, nunca un token ni un secreto; el propietario del
repositorio (usuario u organización) queda anotado y decide qué token crear. Envíe el enlace o el archivo, o haga
escanear el código QR con el teléfono del piloto.

**Unirse a la aerolínea (piloto).** El enlace, el código QR, «Importar una configuración…» o «Unirse a la aerolínea…»
(tarjeta «Acceso a los datos») y la tarjeta de bienvenida de la primera apertura abren el asistente «Unirse a la
aerolínea», una pantalla por paso: la configuración recibida; la cuenta (crearla si hace falta, con el enlace de
registro) y el nombre de usuario; la invitación que aceptar; el token, paso a paso (clásico para el repositorio de un
usuario, de grano fino para el de una organización); el token pegado y probado; los identificadores de red; por último
«Terminar y sincronizar», y luego los datos sin conexión. Las casillas marcadas quedan en el dispositivo: una tarjeta de
los ajustes propone retomar donde lo dejó. El tutorial «Unirse a la aerolínea» sigue los mismos pasos.

**Nada más que el archivo.** Solo se configura lo que contiene la configuración, y el acceso solo se guarda una vez
probado el token; «Probar» dice qué falla: invitación aún no aceptada, token mal copiado o caducado, token sin derecho
sobre el contenido. Un token clásico abre todos los repositorios de la cuenta: para el repositorio de un usuario, se
aconseja una cuenta de GitHub dedicada al vuelo. Un archivo de otro formato se rechaza con un mensaje. La aerolínea solo
se escribe en el repositorio si aún no tiene una. En un puesto cuyo data/ ya sigue este repositorio, el asistente se
salta la cuenta y el token. Sin lanzador, la aplicación llega a un repositorio de GitHub o a un proyecto en una
instancia GitLab (gitlab.com, framagit…): pegue la dirección del proyecto (https://gitlab.com/grupo/proyecto) y el token
de acceso de proyecto que le dio el administrador; el token solo se envía a esa instancia. Cuando la configuración recibida o el acceso del dispositivo es un proyecto GitLab, la tarjeta «Acceso a los datos» espera la dirección del proyecto y describe el token de proyecto (rol Developer, `write_repository`).

## Administración

**Las páginas de administración.** En el nivel «Completo» (tarjeta «Nivel»), la tarjeta «Administración», bajo «Acerca
de», reúne las páginas de administración y de prueba, **un botón por página**, cada una con una frase; en los demás niveles no aparece, y nada del administrador está en las demás tarjetas. En la
aplicación: el botón «Ajuste de los umbrales del mapa» (`#maps?tune=1`, solo lectura en un teléfono; abre la página de ajuste: para cada elemento del mapa y cada modo, los zooms en que aparece, guardados para la aerolínea, `airline/map_profiles.json`; un modo que nunca guardó toma los umbrales de un modo ajustado, la página lo dice; el control «Complejidad» del mapa solo desplaza el zoom), vuelta con la flecha de retroceso; el botón «Límite de la zona del vuelo», que despliega una casilla
«Mostrar la línea del límite de la zona del vuelo» (guardada al instante para la aerolínea, con los umbrales, en `airline/map_profiles.json`,
clave `edge`; la línea se muestra mientras no ajuste nada); el botón «Umbrales de pista en el mapa», que despliega una lista de 8 a 16: el zoom a partir del cual el mapa dibuja los umbrales de pista (guardado al instante para la aerolínea, mismo archivo, clave `runwayZoom`; 11 mientras no ajuste nada); el botón «Exportar una configuración para un piloto» (véase «Configurar un piloto»); en un puesto servido por el
lanzador, los botones «Repositorio remoto de data/» y «Claves API de la aerolínea (IVAO, EAD Basic)», que despliegan su ajuste (véase
«Un repositorio git para data/» y «Las claves API de la aerolínea»);
la hoja de ruta (`#roadmap`) y el diagnóstico de la tarjeta «Acerca de».

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
  rechazado si se modificaron archivos de la suite en este equipo. Los datos no se tocan. Después, cierre la ventana del
  lanzador y vuelva a ejecutar lancer.cmd.
- **Carpetas de este equipo** (Administración, con el lanzador): dónde están la suite, los datos, las descargas, las bases
  y fichas de Little Navmap en este equipo, la ruta en solo lectura y de dónde viene; «Abrir» muestra la carpeta en el
  explorador de archivos. Una ruta se cambia donde se indica, nunca aquí; X-Plane es desconocido para el lanzador.
- **Tokens de los pilotos (GitLab)**: en la aplicación Maintenance, en el equipo del lanzador, «Tokens de los pilotos»
  crea un token de acceso de proyecto por piloto (con su trigrama, rol Developer, un año como máximo), lo muestra una sola
  vez y lo revoca. El lanzador usa allí el token del administrador (secrets/gitlab.json), que nunca muestra. Configure la
  rama de datos para que el rol Developer pueda enviar a ella.
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

<!-- fr: 968ef9ef1e3a -->
