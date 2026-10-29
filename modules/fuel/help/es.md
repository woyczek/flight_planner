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
lugar de la observación, la aeronave y el nivel de crucero (en FL). La fecha del vuelo (introducida en la hora local del dispositivo) es un único valor, guardado en el vuelo actual: la meteorología del cálculo (TAF de los aeródromos, vientos y temperaturas en altura) se lee a esa fecha, el ETA del mapa parte de ella mientras el vuelo no ha empezado, y el deslizador de Meteo parte de ella; vacío significa ahora. La aeronave cabe en una línea: la aeronave elegida,
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

**Pista, SID, STAR y aproximación.** Al final del paso Ruta, una tarjeta «Procedimientos» lleva un lado Salida y un lado Llegada. Cada uno tiene un título («Salida LFPO Paris-Orly»), una sola línea discreta («leído el 29/10 16:53Z · Releer · 3 sin leer») y una cuadrícula fija, la misma en los dos lados: pista · SID · transición en la salida; pista · STAR · transición en la llegada y, debajo, aproximación · transición de aproximación (una transición solo aparece si el procedimiento elegido la tiene). En un teléfono, una sola columna; ninguna etiqueta se corta. Cada lista viene de aerodb y muestra todos los procedimientos del aeródromo en una sola lista ordenada por pista y luego por nombre (la pista figura en el texto solo si no hay pista elegida y el procedimiento sirve solo una: «OPALE 2E» una vez elegida la pista). Nada está prohibido: un procedimiento en conflicto con su elección se marca con ⚠ (una SID, STAR o aproximación que no sirve a la pista elegida; sin pista elegida, una STAR que no sirve a ninguna pista de la aproximación elegida; el motivo está en la información emergente — una STAR que no enlaza con la aproximación no es un conflicto: el Mapa las une con un trazo discontinuo) y aun así puede elegirlo — el ⚠ y la información emergente bastan, ninguna notificación lo repite. ⌛ (gris) significa caducado, ⚠ (naranja) en conflicto. En cada lista, lo compatible con su elección va primero y los ⚠ después; en la lista de pistas van primero las de la SID o la aproximación ya elegida. Un procedimiento que la fuente no supo leer bien (sin nombre o dudoso) nunca se ofrece: la línea discreta del lado dice cuántos no se leen («3 sin leer»: las páginas no leídas y los procedimientos por verificar del archivo leído). Si los datos del aeródromo no traen ninguna ficha de pista, las pistas ofrecidas son las que nombran sus procedimientos. Elegir una STAR o una aproximación que sirve una sola pista fija esa pista; una STAR ofrece sus transiciones, una aproximación sus transiciones de aproximación. La primera opción, «—», significa «no elegido»; «ninguna» es una elección real (una salida directa, sin SID). Un procedimiento del respaldo X-Plane del puesto va el último, marcado «X-Plane, local»; uno leído en un ciclo anterior se marca ⌛ (volver a leer). En un aeródromo sin procedimiento publicado, la línea discreta lo dice («ningún procedimiento publicado · Leer los procedimientos de LFXX»): un aeródromo por gesto, nunca en silencio. Un aeródromo que ya tiene procedimientos muestra, en esa misma línea, la fecha de su última lectura («leído el 29/10 16:53Z», ⌛ si es de un ciclo anterior) y luego «Releer»: el mismo gesto, que sustituye el archivo leído. Un aeródromo francés se lee en el eAIP del SIA, sin cuenta; un Estado cuyo AIP publica tablas de procedimientos, en EAD Basic (credenciales configuradas en el puesto); para cualquier otro Estado, el mensaje dice que no hay ninguna tabla publicada. Sin lanzador, o en un dispositivo emparejado con el puesto, la lectura se hace en el puesto —el mensaje lo dice— y el OFP de SimBrief sigue siendo la fuente del vuelo. Una vez elegidas la SID y la STAR, el cálculo corre sobre el camino «ruta + procedimientos» (con la distancia de la SID y la STAR) y el Mapa los traza con sus altitudes y velocidades; sus restricciones de altitud no entran en los escalones del cálculo, se leen en el perfil vertical, que mantiene el crucero hasta que debe empezar el descenso y ya no vuelve a subir una vez empezado. «Último OFP de SimBrief» propone su SID y su STAR solo para los lados que aún no ha elegido («ninguna» es una elección): nunca sustituye su elección y dice lo que ha rellenado, una línea por lado («Llegada: STAR — → LERG1R»). Las elecciones hechas seguidas se escriben una sola vez, un momento después de la última.

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

La pestaña «Fichas» reúne las fichas de la aerolínea, compartidas con todos sus dispositivos. Están ordenadas por
categoría (helicópteros, turbohélices, reactores, pistón, otros); cada tipo que usa la compañía (flota, referencia) y
que aún no tiene ficha figura también, «rendimientos por completar», con «Crear la ficha». Cada ficha dice lo que le
falta, por familias («Por completar: regímenes, velocidades, crucero, rodaje, pista»), o «completa» si no falta nada.

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
  confirmación. La célula (avión, helicóptero, planeador…) y la propulsión (pistón, turbohélice, turboeje, reactor…) vienen de
  la base OACI del tipo: deje «auto» salvo que la base se equivoque o no conozca el tipo; entonces ni se cuentan como
  faltantes ni se piden a ChatGPT.

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

<!-- fr: 79d663b45441 -->
