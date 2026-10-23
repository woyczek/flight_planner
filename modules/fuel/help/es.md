# Combustible y nivel

Preparar el combustible de un vuelo y elegir su nivel: una aeronave, una ruta, un nivel, y sale el cálculo — rodaje,
combustible de viaje, reserva, combustible de bloque, tiempo de vuelo e inicio del descenso.

## Cómo usarlo

**La aeronave.** Una sola línea arriba: la aeronave elegida, su matrícula, su indicativo y de dónde viene. La lupa abre
la búsqueda: escriba una ficha, una matrícula, un indicativo o un tipo. Los resultados llegan en este orden: sus fichas
de rendimiento, las aeronaves de la aerolínea (su flota, luego las conocidas por su diario), los tipos publicados y, en
último lugar, el código tal como se escribió. Una aeronave de la aerolínea toma su propia ficha si la tiene, si no la de
su tipo, si no una estimación del tipo — el cálculo la marca entonces «aproximado». La matrícula y el indicativo elegidos
siguen al vuelo hasta el informe. La línea «Crucero» indica de dónde viene el consumo.

**La ruta.** Escriba la salida y la llegada (códigos OACI): la distancia y el rumbo verdadero se calculan solos. Para
una ruta detallada, despliegue «Ruta detallada» y péguela (plan de vuelo OACI, o una línea «punto latitud longitud»
por punto). Si no se reconoce nada, escriba la distancia y el rumbo a mano. Con su identificador SimBrief configurado
(⚙), «Último OFP de SimBrief» retoma de una vez la ruta, el nivel, el viento medio y la aeronave de su último plan.

Bajo la distancia, «Puntos de la ruta» enumera los puntos reconocidos, de la salida a la llegada. Las flechas suben o
bajan un punto en la lista, la cruz lo quita; el campo de abajo añade uno antes de la llegada: un identificador
(radioayuda, punto, aeródromo) o «NOMBRE latitud longitud». Cada punto intermedio tiene un campo de nivel opcional, en
FL: es el nivel mantenido a partir de ese punto, para un ascenso o un descenso por escalones. Un punto sin nivel
continúa el anterior (mostrado en gris); el vuelo sale al nivel del plan. El cálculo cuenta cada escalón (su ascenso o
su descenso, luego el crucero a ese nivel), el resultado muestra la sucesión de niveles (FL100 → FL120), y el descenso
parte del último nivel. Cada cambio reescribe la ruta detallada y se transmite de inmediato al mapa.

**El nivel y el viento.** Indique el nivel de crucero (en FL) y el viento: dirección e intensidad. Sin dirección, o sin
viento alguno, el combustible de bloque se da como horquilla. «Ascenso» elige la forma de subir: económico, mejor
régimen, rápido, a la velocidad de la ficha, o manual (usted da velocidad y régimen de ascenso).

«ISA ±» es la desviación de temperatura respecto a la atmósfera estándar, en °C: cambia la potencia disponible, la
velocidad verdadera y el techo. Una vez leída la meteorología, la línea de debajo la calcula a partir del METAR de la
salida — su temperatura menos la temperatura estándar del aeródromo (15 − 1,98 × elevación del aeródromo en miles de
pies) — y «Usar ISA …» la lleva al campo. La desviación elegida se guarda en sus ajustes: el vuelo siguiente parte de la
misma.

El desplegable «Altitud de densidad» muestra, con la desviación ISA en abscisas, la altitud de densidad de cada altitud
de presión (una recta por cada mil pies): es la altitud que «sienten» el rotor, las hélices y el motor. La línea
vertical es la desviación del vuelo, la horizontal el techo de la ficha; su cruce indica a qué altitud de presión la
aeronave alcanza su techo ese día (recta en negrita). Un punto marca la salida según el METAR (temperatura y QNH).
Importante para los helicópteros: con mucho calor o en altura, el techo real puede caer muy por debajo del de la ficha.

**La meteorología.** Bajo «Nivel y viento», «Leer la meteorología de los aeródromos» muestra la salida, la llegada,
el alternativo y los aeródromos a lo largo de la ruta: todos los que están a menos de 10 NM a cada lado de la ruta
(radio ajustable en los ajustes del cálculo) y tienen un METAR o un TAF; los demás se ignoran. Cada aeródromo indica
su distancia desde la salida (el alternativo, desde la llegada); si son más de dos, los aeródromos intermedios quedan
plegados bajo la salida, la llegada y el alternativo. Para cada uno, lo que cuenta para el vuelo: la categoría (VFR,
MVFR, IFR, LIFR, en color), el viento y sus componentes de cara y de costado en la pista principal del aeródromo (el
sentido más cercano al viento), el techo de nubes, la visibilidad, la temperatura y el QNH, y un aviso cuando se
anuncian CB o TCU; el mensaje bruto está plegado. Con una fecha de vuelo, responde el TAF si cubre esa hora (y sus
cambios temporales), si no el METAR. Marque «Meteorología real» para que el viento del cálculo pase a ser la media de
los vientos de los aeródromos de la ruta (salida, aeródromos intermedios, llegada), tramo por tramo y ponderada por
su longitud — una aproximación a partir del viento en superficie, indicada bajo los campos. Sin conexión, los últimos
valores leídos siguen mostrados con su hora.

**La elección del nivel.** El dibujo muestra, para cada nivel, el combustible del trayecto (línea continua) y su
duración (guiones). El punto verde marca el nivel más económico, el cuadrado naranja el más rápido; la zona gris, los
niveles que no se pueden mantener en este trayecto. Toque la curva para elegir un nivel, o use los dos botones.

**El resultado.** Abajo en la pantalla, siempre visible: combustible de bloque, combustible de viaje, tiempo de vuelo y
distancia del inicio del descenso antes de la llegada. «Detalle del cálculo» lo desglosa fase por fase.

**Las consignas de ascenso.** Despliéguelas para seguir el ascenso hasta el nivel: potencia, régimen, velocidad, régimen
de ascenso, flujo, Mach, tiempo y combustible acumulados en cada escalón, con el perfil dibujado.

**Abrir en.** Bajo el resultado, «Abrir en» prepara el mismo vuelo en otro lugar, en una pestaña nueva: SimBrief
(opciones del vuelo prerrellenadas, se requiere sesión en SimBrief), SkyVector (la ruta trazada, con velocidad y
nivel), Navigraph y ChartFox (las cartas de los aeródromos de salida y llegada, se requiere sesión). Una entrada en gris
indica lo que le falta (aeródromo, tipo de aeronave). No se envía nada que no esté ya en el vuelo.

**Hacia el mapa y el informe.** El vuelo preparado aquí — aeronave, ruta, nivel, perfil de ascenso y de descenso — se
comparte: abra Mapa o Informe, ya está allí.

## Fichas de rendimiento

La pestaña «Fichas» reúne las fichas de la aerolínea, compartidas con todos sus dispositivos.

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
- **Meteorología sin lanzador**: el servicio meteorológico solo es accesible a través del lanzador de un ordenador; en
  otro lugar, la tarjeta muestra la última meteorología guardada, o lo dice.

<!-- fr: 3f5ed3a8110b -->
