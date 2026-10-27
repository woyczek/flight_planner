<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Piloto — manual

La aplicación Piloto reúne las herramientas para preparar y seguir un vuelo: combustible y nivel, mapa, informe, mis
vuelos, paso al sitio de la aerolínea. Funciona en un teléfono como en un ordenador, con o sin red.

## Primer inicio

- **Los verbos.** En un teléfono, la barra inferior ofrece cinco entradas: Preparar, Mapa, Informe, Vuelos, Meteo. Toque
  de nuevo una pestaña ya elegida cuando agrupa varias pantallas: se abre encima una pequeña lista (Preparar: Combustible y
  Fichas de rendimiento). En una pantalla, cada herramienta es un verbo de la columna izquierda. La dirección de una
  herramienta (`#fuel`, `#report`…) basta para volver a ella. Los Ajustes son el botón ⚙ de la cabecera.
- **Su identidad.** En ⚙ Ajustes, configure su trigrama y sus identificadores IVAO, VATSIM y SimBrief: las herramientas
  los usan para prerrellenar.
- **El nivel.** También en Ajustes, «Nivel» elige lo que muestra el menú: Descubrimiento, Habitual o Completo. Una
  herramienta oculta sigue accesible por su dirección.
- **La ayuda.** Cada herramienta tiene arriba un panel plegado «Cómo usarlo»; el botón ? de la cabecera (en un teléfono
  como en una pantalla) abre este manual en el capítulo de la pantalla en la que está.
- **El estado, en el botón ⚙.** En la cabecera, el botón ⚙ lleva un punto: verde cuando algo le espera (un vuelo
  iniciado, un informe por escribir), naranja (en un teléfono) cuando algo requiere atención: sin trigrama, escrituras
  pendientes, conflictos, un error de sincronización, sin conexión. Los Ajustes se abren con el bloque «Estado», que da el
  detalle: el vuelo en curso (toque para ir al Mapa), los informes por escribir de sus vuelos pasados (toque para abrir el
  informe ya rellenado), el trigrama que falta (toque para definirlo), el estado de los datos (última sincronización,
  escrituras pendientes, vía de intercambio usada), la base aeronáutica mientras no esté lista, el lanzador, «Sin conexión»
  cuando no hay red y, en un teléfono, la fuente de la posición durante un vuelo. En un teléfono, la cabecera se reduce al
  nombre, el botón ? y el botón ⚙.
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
lugar de la observación, la aeronave y el nivel de crucero (en FL). La fecha del vuelo es un único valor, guardado en el vuelo actual: la meteorología del cálculo (TAF de los aeródromos, vientos y temperaturas en altura) se lee a esa fecha, el ETA del mapa parte de ella mientras el vuelo no ha empezado, y el deslizador de Atmósfera parte de ella; vacío significa ahora. La aeronave cabe en una línea: la aeronave elegida,
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
sigue por verificar.

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

La pestaña «Fichas» reúne las fichas de la aerolínea, compartidas con todos sus dispositivos. Están ordenadas por
categoría (helicópteros, turbohélices, reactores, pistón, otros); cada tipo que usa la compañía (flota, referencia) y
que aún no tiene ficha figura también, «rendimientos por completar», con «Crear la ficha».

- **Importar**: un archivo (CSV de rendimiento, JSON, `.lnmperf` de Little Navmap, OFP de SimBrief) o un texto pegado
  (los mismos, o la respuesta de ChatGPT). Una ficha sacada de un OFP se calibra con sus tiempos y su consumo reales.
- **Nada se escribe sin usted**: cada cambio de una ficha pasa por una vista previa, una línea por valor, antes y
  después. Desmarque lo que no quiera tomar, luego «Aplicar la selección». Una fila de la tabla de regímenes que se
  quitaría también aparece: desmarcada, se queda.
- **Completar una ficha**: «Completar (EUROCONTROL)» propone los valores conocidos del tipo; los que sustituirían un
  valor ya introducido llegan desmarcados. «Completar desde otra ficha» solo rellena los campos vacíos.
- **ChatGPT**: «Copiar la petición a ChatGPT» prepara la pregunta para el tipo (o solo para los campos vacíos); péguela
  en ChatGPT, luego su respuesta tal cual en la zona prevista, y «Leer».
- **Modificar, exportar**: el editor muestra los campos por grupo. En una pantalla de ordenador, la tabla régimen /
  flujo se modifica fila por fila; en un teléfono es de solo lectura. Exportaciones `.lnmperf` y JSON; eliminación tras
  confirmación.

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

<!-- fr: 74dfdb49af22 -->

<!-- chapter: maps -->
# Mapa

Ver su vuelo en una carta aeronáutica y su perfil vertical, o los mapas de una misión: espacios aéreos, aeródromos,
radioayudas, aerovías, altitudes mínimas. La ruta del vuelo también se modifica en el mapa.

## Cómo usarlo

**El vuelo previsto.** El mapa muestra el vuelo preparado en Combustible: salida, puntos de la ruta, llegada, y el
aeródromo alternativo en guiones grises. Si el OFP de SimBrief presentó una SID o una STAR, se trazan en violeta sobre la ruta, con su nombre («SID ROYAN6P»). Su resumen (nivel, distancia, previsto o en vuelo) no se escribe sobre el dibujo (el dibujo lo muestra): el texto emergente del asa del bloque de datos bajo el mapa lo da, con salida y llegada, alternativa y tipo de aeronave. Cuando el vuelo cambia en Combustible, el mapa lo sigue por sí solo.

**El mapa y lo que muestra.** Alrededor de la ruta: los espacios aéreos que atraviesa o roza (zonas restringidas,
peligrosas, prohibidas, espacios controlados), las aerovías bajas o altas según su nivel, los aeródromos y las
radioayudas, y en cada cuadro de un grado la altitud mínima de seguridad (la cifra marrón, en miles y centenas de pies:
«3⁵» quiere decir 3500 ft). Las pequeñas cifras violetas a lo largo de la ruta son las distancias desde la salida, en
millas náuticas. Deslice el mapa con un dedo, separe dos dedos para hacer zoom; «Recentrar» (la diana, arriba a la derecha del mapa) vuelve a toda la ruta. El
mapa se queda donde usted lo puso, aunque la ruta cambie: solo «Recentrar» (u otro vuelo) lo reencuadra. Visto de lejos,
el mapa solo muestra lo que está cerca de la ruta; acérquese para verlo todo.

**El perfil y el cursor.** En el bloque de datos bajo el mapa, el perfil vertical corta la ruta de punta a punta: el relieve, los espacios
aéreos en los que entra a la altitud prevista, y la trayectoria del vuelo en violeta. Deslice el dedo por el perfil: un
cursor azul lo sigue, y el mismo cursor se coloca en el mapa. Toque la ruta en el mapa para colocarlo allí. La línea
bajo el perfil dice lo que hay bajo el cursor: distancia desde la salida, altitud prevista, altura del relieve, y el
espacio aéreo en el que está en ese momento. Bajo el mapa, este bloque de datos muestra el perfil; la lista de los
espacios de un punto o los puntos de notificación de un aeródromo se abren en su lugar cuando los pide, y el perfil
vuelve al cerrarlos. La pastilla con forma de nube, (las tres pastillas — perfil, nube, «i» — están siempre en la línea superior, a la derecha; la que no tiene nada que mostrar solo se atenúa), lo sustituye (la pastilla del perfil lo devuelve) por el corte
meteorológico a lo largo de la ruta (viento, temperatura, nubes, engelamiento) a la altitud del vuelo; el corte sigue el mismo cursor, y un toque sobre
él lo mueve. Solo muestra la previsión que Atmósfera ya ha cargado: sin ella, la línea «Sin previsión cargada» lleva a Meteo, en Preparar. La última pastilla, «i» (atenuada mientras el dibujo no tiene leyenda), abre sobre el perfil su leyenda (qué es cada trazo, banda y marca); arrastrar el dedo sobre el corte mueve el cursor como en el perfil. El perfil y el corte se dibujan a la altura exacta del bloque, con su eje de distancias siempre a la vista: en un bloque bajo quitan etiquetas de niveles, nunca el eje.

<a id="maps-profile-zoom"></a>**Ampliar el perfil.** Para leer el perfil con precisión, ciérrelo sobre una parte del vuelo: pellizque con dos dedos (el centro de los dedos se queda en su sitio) y arrastre con dos dedos para mover la ventana; un solo dedo sigue siendo el cursor de lectura. La escala de altitudes se reajusta a lo que muestra la ventana (de ahí viene la precisión), las marcas de distancia (NM) se estrechan con ella, y los puntos fuera de la ventana no se dibujan. Un doble toque vuelve al vuelo entero, igual que el botón «Vuelo entero», que aparece en la línea superior mientras el perfil está ampliado. En pantalla: Ctrl + rueda amplía alrededor del puntero, arrastrar mueve la ventana, un doble clic vuelve al vuelo entero. La ampliación se conserva mientras la página siga abierta y la ruta no cambie; nunca se guarda. El corte meteorológico se amplía de la misma manera (mismos gestos, mismo botón «Vuelo entero») y la ventana es la misma para los dos: amplíe uno, pase al otro con la ficha y encontrará la misma parte del vuelo; el corte también reajusta su escala de altura a lo que muestra.

**Una pantalla fija.** Nada entre el encabezado y el mapa: el mapa y el bloque de datos llenan la pantalla, y nada se desplaza salvo el contenido del bloque. Los botones están sobre el mapa: a la derecha, de arriba abajo, «Editar la ruta» (el lápiz), «Recentrar», el modo de mapa, «Editar en el mapa» (las cuatro flechas) y, al final, la pantalla completa (Esc sale de ella); a la izquierda, «Capas». El bloque es una hoja: arrastre su línea superior (la barrita; a su altura normal la línea no lleva título sobre un perfil o un corte, solo las tres pastillas) hacia arriba para
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

**Las capas.** El botón de capas, a la izquierda del mapa, abre en el bloque de datos, en lugar del perfil, la lista de lo que dibuja (la cruz ✕ devuelve el perfil). Primero, bajo la elección del vuelo, el control «Complejidad»: actúa como si el zoom fuera otro, un nivel de zoom por paso (de −4 a +4) — menos detalles hacia la izquierda, más hacia la derecha. Lo que muestra cada zoom lo fija el administrador (Ajustes, tarjeta «Administración»). Luego las familias de espacios (TMA /
CTR, D / R / P, FIR, otros), aerovías inferiores y superiores, radioayudas, puntos de aerovía, puntos de notificación
VFR, obstáculos, altitudes mínimas, ciudades, retícula, alternativo, nombres de los espacios, nombres de las aerovías.
Marque o desmarque: el mapa sigue, y su elección se conserva para este ajuste en este dispositivo. «Restablecer todo»
vuelve a la elección de origen. «Solo alrededor de la ruta», marcada de origen en IFR, limita espacios y aerovías a la
cercanía de la ruta; desmarcada, se dibuja todo el mapa visible, para mirar en otra parte. De cerca, todo se dibuja de
todos modos. Cada elemento del mapa tiene su rango de zoom: los puntos de notificación VFR solo aparecen
muy cerca, los CTR de cerca, las TMA en vista media, las FIR de lejos. El tamaño del mapa también cuenta: en un marco
pequeño (teléfono, panel de la vista doble) muestra menos elementos que en uno grande con el mismo zoom, como si
estuviera más lejos (el zoom se corrige con la media del alto y del ancho del marco, 900 px sin corrección).

**Toque o pase por encima para saber más.** Toque, haga clic o pase sobre el nombre de una aerovía, la etiqueta de un
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

**Los puntos de notificación VFR de un aeródromo.** Pase el ratón sobre un aeródromo: sus puntos de notificación y las
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

**En vuelo.** Una vez iniciado el vuelo en Combustible, el mapa muestra dónde debería estar (avión hueco, «previsto
14:32Z») y dónde está (avión lleno, orientado a su rumbo, con la traza punteada de los últimos 30 minutos). En las notas del bloque de datos, bajo el perfil, una línea da la diferencia: adelantado o retrasado (minutos y NM), a cuántas NM de la ruta, y su altitud frente a
la prevista; el perfil muestra las dos altitudes. De cerca, cada punto lleva su hora estimada (ETA) bajo su nombre, sin tapar nunca un aeródromo, en UTC («14:52Z»), la hora local entre paréntesis en la salida y la llegada. «Seguir» mantiene
el mapa en su posición; mover el mapa lo detiene. Sin posición (GPS o red no activados), una notificación lo dice una vez, la línea queda en las notas y su enlace abre los ajustes; una posición de más de 2 minutos aparece en gris. La línea termina con la fuente de la posición: GPS, red,
IVAO, VATSIM, X-Plane o Little Navmap.

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

**Los mapas de misión.** La primera lista, a la cabeza de las capas (el botón de capas), elige lo que muestra el mapa: el vuelo previsto, o una misión de
la aerolínea. Para una misión, una segunda lista elige entre sus mapas (vista de conjunto, objetivo, detalle…). Cada
mapa se redibuja como en el estudio: mismo marco, mismo perfil de visualización, con los puntos de la misión, sus zonas
rayadas y su recorrido. El perfil vertical muestra entonces el de la misión.

**Modificar la ruta en el mapa.** Toque «Editar en el mapa» (las cuatro flechas, a la derecha del mapa; la primera vez aparece una breve ayuda): los puntos de giro se rodean de un
círculo. Arrastre un punto sobre un fijo, una radioayuda o un aeródromo: se coloca allí (soltado en otro lugar, se
vuelve un punto libre, nombrado por sus coordenadas, como 4530N00030E). Para añadir un punto, toque «+» (en la misma columna)
y luego el lugar deseado (o mantenga pulsado medio segundo): sobre un fijo, una radioayuda o un aeródromo se coloca
allí, en otro lugar es un punto libre; se añade al tramo más cercano. Un toque simple no añade nada: muestra la burbuja.
Toque un punto de la ruta: su tarjeta da su nivel y propone «Quitar». La salida y la llegada no se mueven aquí. En el
perfil, arrastre un nivel hacia arriba o hacia abajo: el nivel cambia desde el punto que abre ese tramo, en pasos de
FL10 (en el primer tramo, es el nivel del vuelo); en la tarjeta de un punto, «−» y «+» hacen lo mismo. «Deshacer»
deshace el último gesto. Cada cambio se guarda enseguida en el vuelo, y Combustible rehace el cálculo; el perfil sigue.
Volver a tocar el botón (o Esc) cierra el modo, y el mapa vuelve a moverse con el dedo. Para escribir la ruta en texto, el lápiz arriba de la columna derecha («Editar la ruta») abre
el paso Ruta de Combustible.

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

<!-- fr: 4f6a636e781c -->

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
a la izquierda) elige lo que se dibuja. Toque un punto del mapa para abrir su corte.

**La zona del vuelo y el mundo.** Una línea fina rodea la zona del vuelo: dentro, la previsión fina cargada para el vuelo
(Météo-France AROME 1,3 km y ARPEGE 0,1° sobre Francia, ICON en Europa); fuera, el sinóptico mundial (GFS de la NOAA,
publicado con una malla de 5°). Los dos modelos no dicen exactamente lo mismo: un salto de las líneas al cruzar la línea
es normal. El panel de capas nombra los dos modelos y su malla.

**La fecha del vuelo.** El cursor bajo el asa adelanta la hora de 0 a 72 horas desde la salida prevista: el mapa, el
corte y los cortes de punto siguen.

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

<!-- fr: 0d64bc05e5c1 -->

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

**Su identidad.** En «Identidad», escriba su trigrama y sus identificadores VID IVAO, CID VATSIM y SimBrief, luego
«Guardar». Las herramientas los usan para prerrellenar; con varios usuarios, el trigrama es necesario.

**El nivel.** «Nivel» elige lo que muestra el menú: Descubrimiento, Habitual o Completo, con un toque. Bajo cada opción,
la línea «Menú:» indica qué herramientas muestra; una herramienta oculta sigue accesible por su dirección.

**El diseño.** «Diseño» muestra una miniatura por aspecto — Estándar, Gabinete, Robusto — y el tono: Automático
(como el sistema), Día o Noche. Un toque lo aplica en el acto, solo en este dispositivo.

**Los usos.** La frase al principio de «Usos» indica cómo se intercambian los datos. Sin casilla marcada, está «Solo en
este dispositivo»: nada sale a otro lugar. Marque «Solo, en varios dispositivos» o «Varios usuarios (repositorio git de
datos)» para intercambiar. En un puesto servido por el lanzador, la aplicación ya lee y escribe la carpeta `data/`
del lanzador, incluso sin casilla marcada; un uso de intercambio la comparte además por git.

**El acceso a los datos.** En un teléfono o en el sitio, configure en «Acceso a los datos» el repositorio
(cuenta/repositorio), la rama y su token personal, luego «Probar» y «Guardar». En un puesto servido por el lanzador no
hay token: la tarjeta muestra el repositorio remoto de `data/` (vea «Un repositorio git para data/»).

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

## Las claves del lanzador

En un puesto servido por el lanzador, «Claves del lanzador» configura la clave de la API IVAO: se queda en la carpeta
`secrets/` del lanzador, nunca en el navegador ni en los datos. «Probar» comprueba que IVAO responde; «Borrar» la
quita.

## La tableta junto al simulador

Vuela en el equipo (X-Plane) y quiere el mapa en una tableta o un teléfono: en el equipo servido por el lanzador,
«Acceso del equipo» abre la aplicación Piloto a los dispositivos de la misma red local (o inicie `lancer.cmd --lan`).

1. **Abrir a los dispositivos de la red local**: la tarjeta muestra la dirección que abrir en el dispositivo, su
   código QR y un código de vinculación de 6 cifras. Windows puede pedir que autorice Python: acéptelo solo para
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
  a un dispositivo, retira solo ese.
- Solo se abre la dirección principal del equipo; las demás (VPN, máquinas virtuales) solo con «Abrirlas también».

## Un repositorio git para data/

En un puesto servido por el lanzador, «Acceso a los datos» muestra el repositorio remoto de `data/`: su dirección y su
rama. Para configurarlo o cambiarlo, escriba la dirección (`git@host:cuenta/repo.git` o `https://…`, sin contraseña ni
token dentro): «Comprobar» indica si el repositorio responde, «Guardar» lo configura. Hacia otra dirección distinta de la configurada, se abre una ventana Sí / No en el equipo, no en la página: la tarjeta lo dice antes del clic; respóndala (puede estar detrás de otras ventanas) y vuelva. Rechazada, cerrada o ya abierta: la tarjeta da el motivo y `data/` se queda tal cual. Es a propósito: una página trampa no debe poder enviar sus datos a otro lugar. Nada bloquea: un repositorio que no responde solo
se señala.

- **El acceso al repositorio** se configura en el equipo: una clave SSH para una dirección `git@…`, credenciales
  guardadas en Git para una dirección `https://…`.
- **Varios usuarios por git** necesitan este repositorio remoto: sin él, la casilla «Varios usuarios» no lleva a
  ninguna parte, y la tarjeta «Usos» lo recuerda.
- **data/ ausente o sin git**: la tarjeta abre una vía. `data/` es una carpeta ignorada por el repositorio del código;
  se convierte en su propio repositorio git, enlazado al repositorio de datos (no un submódulo). Escriba la dirección
  del repositorio de datos y, si hace falta, un usuario y una contraseña o token (nunca guardados por la página;
  «Recordar» los confía a Git en este equipo). Sin `data/`, «Recuperar los datos» lo clona; con un `data/` sin git
  (datos de ejemplo o archivo), «Retomar data/ en este repositorio» lo enlaza al repositorio. La tarjeta sigue el trabajo
  y vuelve a leer el estado al final; un fallo se explica, nada se pierde.

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
salta la cuenta y el token. Sin lanzador, la aplicación solo llega a un repositorio de GitHub: para un repositorio de
framagit o GitLab, configure el acceso en un puesto con el lanzador.

## Administración

**Las páginas de administración.** En el nivel «Completo» (tarjeta «Nivel»), la tarjeta «Administración», bajo «Acerca
de», reúne las páginas de administración y de prueba, **un botón por página**, cada una con una frase; en los demás niveles no aparece, y nada del administrador está en las demás tarjetas. En la
aplicación: el botón «Ajuste de los umbrales del mapa» (`#maps?tune=1`, solo lectura en un teléfono; abre la página de ajuste: para cada elemento del mapa y cada modo, los zooms en que aparece, guardados para la aerolínea, `airline/map_profiles.json`; un modo que nunca guardó toma los umbrales de un modo ajustado, la página lo dice; el control «Complejidad» del mapa solo desplaza el zoom), vuelta con la flecha de retroceso; el botón «Límite de la zona del vuelo», que despliega una casilla
«Mostrar la línea del límite de la zona del vuelo» (guardada al instante para la aerolínea, con los umbrales, en `airline/map_profiles.json`,
clave `edge`; la línea se muestra mientras no ajuste nada); el botón «Exportar una configuración para un piloto» (véase «Configurar un piloto»);
la hoja de ruta (`#roadmap`) y el diagnóstico de la tarjeta «Acerca de».

<a id="settings-datalab"></a>**Laboratorio de datos (temporal).** El botón «Laboratorio de datos» (`#datalab`) mide, en este dispositivo, si la base aeronáutica puede obtenerse, analizarse, compilarse y publicarse desde un teléfono: pruebe la dirección de cada fuente; cuando un servidor rechaza la lectura («bloqueado por CORS»), el enlace «Abrir / Descargar» de la línea abre la propia dirección, sin nada que copiar: en iPhone, **pulsación larga en el enlace y «Descargar archivo enlazado»** (también guarda un JSON o GeoJSON que Safari mostraría), el archivo llega a Archivos › Descargas, luego «Desde un archivo» (en un puesto con lanzador, «Desde Descargas»); dé así el ZIP del SIA. Cuatro botones publican un bloque de prueba de 0,5, 2, 5,3 o 10 MB (el informe guarda el resultado o el error de cada uno, incluso sin respuesta tras 120 s), «Limpiar» lista lo que borra. Un resumen de diez líneas abre el informe; «Copiar el informe» (o «Compartir el informe») y péguelo a la sesión de datos. Nada entra en la base ni en los módulos. El botón de la tarjeta Administración es un enlace real, con debajo la dirección absoluta de la pantalla para abrir o guardar como favorito («Copiar el enlace»). La exportación S3 de openAIP puede tardar en responder (el servidor, no la página): en esa línea, la pulsación larga sobre el enlace es el gesto adecuado.

**Los bancos, en un puesto.** Servidos por el lanzador, solo se abren en un puesto con lanzador (en otros sitios se
nombran sin enlace); rutas relativas a la raíz de la suite: `labs/design_primitives.html` (primitivas y diseños),
`frame/aerodb/bench.html` y `frame/aerodb/offline_bench.html` (base aeronáutica, en línea y sin conexión),
`frame/store/test/` (capa de datos, contra el GitHub falso) y `modules/maps/test/render.html` (renderizado del mapa).

**Las páginas V2 del puesto.** Solo se muestran cuando un lanzador sirve la página: Ajustes › Mantenimiento
(`apps/settings/maintenance.html`), Primer inicio (`apps/settings/premier_lancement.html`) y el estudio cartográfico
(`apps/cpco/map_parser.html`).

## Conviene saber

- **El token**: un token de grano fino de github.com, solo sobre el repositorio de datos, «Contents» lectura y
  escritura, 90 días como máximo. Nunca se vuelve a mostrar; no lo pegue en ningún mensaje.
- **Sus ajustes se quedan al cerrar el navegador**: la identidad, el token y la clave meteorológica se guardan en el mismo
  sitio del dispositivo, nunca sincronizados ni en una copia. Si Safari se los hizo perder igualmente (borra el almacenamiento
  de un sitio poco visitado), añada la aplicación a la pantalla de inicio: allí está mejor guardada. El diagnóstico
  («Copiar») dice si el navegador prometió no borrar (`storage.persisted`).
- **Cortar el acceso**: borra el token de este dispositivo; sus escrituras pendientes se quedan y saldrán cuando el
  acceso vuelva a configurarse. Teléfono perdido o robado: borre también el token en github.com.
- **Ajustes de la V2**: si este navegador ya se usó para la V2, la tarjeta «Ajustes de la V2 encontrados» propone una
  vez retomar su identidad y su acceso.
- **Acerca de**: enlaces a esta ayuda y a la hoja de ruta (lo entregado, en curso, previsto), luego el
  diagnóstico, plegado: transporte, última sincronización, errores, árbol del repositorio, bases de referencia y base
  aeronáutica, línea por línea; «Copiar» lo pone todo en el portapapeles, para pegarlo en su mensaje y señalar un
  problema. El token
  nunca figura en él.

<!-- fr: 7ffb54ffacd9 -->
