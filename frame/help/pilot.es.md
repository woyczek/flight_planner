<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Piloto — manual

La aplicación Piloto reúne las herramientas para preparar y seguir un vuelo: combustible y nivel, mapa, informe, mis
vuelos, paso al sitio de la aerolínea. Funciona en un teléfono como en un ordenador, con o sin red.

## Primer inicio

- **Los verbos.** Cada herramienta es un verbo del menú (☰ en un teléfono, columna izquierda en una pantalla). La
  dirección de una herramienta (`#fuel`, `#report`…) basta para volver a ella.
- **Su identidad.** En ⚙ Ajustes, configure su trigrama y sus identificadores IVAO, VATSIM y SimBrief: las herramientas
  los usan para prerrellenar.
- **El nivel.** También en Ajustes, «Nivel» elige lo que muestra el menú: Descubrimiento, Habitual o Completo. Una
  herramienta oculta sigue accesible por su dirección.
- **La ayuda.** Cada herramienta tiene arriba un panel plegado «Cómo usarlo»; el botón ? abre este manual en el
  capítulo de la herramienta.

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

**La aeronave.** Elija su ficha de rendimiento en la primera tarjeta. Sin ficha, tome «Otro tipo (código OACI)…» y
escriba su código OACI (C30J, EC45…): el cálculo parte entonces de una estimación del tipo, marcada «aproximado». La
línea «Crucero» indica de dónde viene el consumo empleado.

**La ruta.** Escriba la salida y la llegada (códigos OACI): la distancia y el rumbo verdadero se calculan solos. Para
una ruta detallada, despliegue «Ruta detallada» y péguela (plan de vuelo OACI, o una línea «punto latitud longitud»
por punto). Si no se reconoce nada, escriba la distancia y el rumbo a mano. Con su identificador SimBrief configurado
(⚙), «Último OFP de SimBrief» retoma de una vez la ruta, el nivel, el viento medio y la aeronave de su último plan.

**El nivel y el viento.** Indique el nivel de crucero (en FL) y el viento: dirección e intensidad. Sin dirección, o sin
viento alguno, el combustible de bloque se da como horquilla. «Ascenso» elige la forma de subir: económico, mejor
régimen, rápido, a la velocidad de la ficha, o manual (usted da velocidad y régimen de ascenso).

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
- **Sin conexión**: todo se calcula en el dispositivo, a partir de las fichas ya recibidas. Solo la llamada a SimBrief
  espera a la red; el último OFP se queda guardado en el dispositivo.

<!-- fr: cad99988d12f -->

<!-- chapter: maps -->
# Mapa

Ver su vuelo en una carta aeronáutica y su perfil vertical, o los mapas de una misión: espacios aéreos, aeródromos,
radioayudas, aerovías, altitudes mínimas. El mapa solo se consulta: no modifica nada.

## Cómo usarlo

**El vuelo previsto.** El mapa muestra el vuelo preparado en Combustible: salida, puntos de la ruta, llegada, y el
aeródromo alternativo en guiones grises. Arriba, una línea lo resume: salida y llegada, alternativa, nivel, distancia,
tipo de aeronave. Cuando el vuelo cambia en Combustible, el mapa lo sigue por sí solo.

**El mapa y lo que muestra.** Alrededor de la ruta: los espacios aéreos que atraviesa o roza (zonas restringidas,
peligrosas, prohibidas, espacios controlados), las aerovías bajas o altas según su nivel, los aeródromos y las
radioayudas, y en cada cuadro de un grado la altitud mínima de seguridad (la cifra marrón, en miles y centenas de pies:
«3⁵» quiere decir 3500 ft). Las pequeñas cifras violetas a lo largo de la ruta son las distancias desde la salida, en
millas náuticas. Deslice el mapa con un dedo, separe dos dedos para hacer zoom; «Recentrar» vuelve a toda la ruta.
Visto de lejos, el mapa solo muestra lo que está cerca de la ruta; acérquese para verlo todo.

**El perfil y el cursor.** Bajo el mapa, el perfil vertical corta la ruta de punta a punta: el relieve, los espacios
aéreos en los que entra a la altitud prevista, y la trayectoria del vuelo en violeta. Deslice el dedo por el perfil: un
cursor azul lo sigue, y el mismo cursor se coloca en el mapa. Toque la ruta en el mapa para colocarlo allí. La línea
bajo el perfil dice lo que hay bajo el cursor: distancia desde la salida, altitud prevista, altura del relieve, y el
espacio aéreo en el que está en ese momento.

**Ascenso y descenso.** Los rombos violetas marcan el final del ascenso (TOC) y el inicio del descenso (TOD), tanto en
el mapa como en el perfil. Vienen del cálculo de Combustible; sin él, el mapa los estima con regímenes de ascenso y de
descenso habituales.

**Los mapas de misión.** La primera lista de arriba elige lo que muestra el mapa: el vuelo previsto, o una misión de
la aerolínea. Para una misión, una segunda lista elige entre sus mapas (vista de conjunto, objetivo, detalle…). Cada
mapa se redibuja como en el estudio: mismo marco, mismo perfil de visualización, con los puntos de la misión, sus zonas
rayadas y su recorrido. El perfil vertical muestra entonces el de la misión.

**Modificar la ruta.** El mapa no cambia la ruta: «Editar la ruta» abre Combustible, donde usted la retoma. Al volver
al mapa, el nuevo vuelo ya está allí.

## Sin conexión

**Lo que funciona sin conexión.** El mapa, los espacios aéreos, los aeródromos, las radioayudas y el perfil siguen
disponibles sin conexión para las zonas ya consultadas, y para las guardadas en Ajustes › Datos sin conexión. Guarde
allí la zona de su vuelo antes de salir: todo estará allí, incluso sin conexión.

**El mapa de fondo.** El fondo (carreteras, ciudades, relieve en color) viene de Internet. Sin conexión, el mapa se
dibuja sobre un fondo liso con el contorno de los países, y una línea lo indica; todo lo demás está allí.

**El relieve del perfil.** El relieve del perfil también viene de Internet. Sin conexión, el perfil muestra en su lugar
la altitud mínima de seguridad de cada cuadro atravesado (en guiones marrones), y una línea lo indica.

## Casos particulares

**Sin vuelo.** Sin vuelo preparado, el mapa queda oculto y propone «Abrir Combustible». Los mapas de misión siguen
accesibles desde la lista de arriba.

**Base aeronáutica ausente.** Si la base aeronáutica todavía no ha sido publicada por un dispositivo de la aerolínea,
el mapa solo muestra la ruta, y lo dice.

**Zona no guardada.** Sin conexión, sobre una zona nunca consultada ni guardada, el mapa no tiene nada que mostrar; el
botón «Datos sin conexión» abre los ajustes para guardarla la próxima vez.

**Ciclo distinto.** Cada mapa de misión conserva el ciclo de datos con el que se hizo. Si la base actual es de otro
ciclo, una línea lo dice: los espacios aéreos pueden haber cambiado desde entonces.

**Misión antigua.** Una misión guardada antes de esta versión no lleva su perfil de visualización. El mapa toma
entonces el perfil habitual del tipo de mapa (detallado para un objetivo o un detalle, simplificado si no) y lo indica.
Basta con abrir la misión en el estudio y guardarla para que conserve después el suyo.

<!-- fr: 83aa8c905f0e -->

<!-- chapter: report -->
# Informe

Escribir el informe de un vuelo en unos pocos toques, con o sin misión: el módulo retoma lo que ya sabe de su vuelo,
usted completa, guarda — y, si lo desea, el vuelo se registra en el sitio de la aerolínea en el mismo gesto.

## Cómo usarlo

**Tres pasos.** El informe se rellena en tres pasos: Vuelo, Misión, Resultado. En un teléfono, un paso cada vez
(«Siguiente» abajo); en un ordenador, los tres uno al lado del otro. Nada es obligatorio: lo que falta se indica en el
último paso, sin bloquear nunca el guardado.

**El último vuelo.** Si su identificador IVAO (o VATSIM) está ajustado (⚙) y el dispositivo está en línea, una tarjeta
propone su último vuelo en la red: «Usar» rellena la aeronave, el indicativo, el trayecto y las horas sacadas de la
traza. El vuelo preparado en Combustible o Mapa se propone de la misma forma («Vuelo actual»).

**Las otras fuentes.** Despliegue «Otras fuentes» para retomar su último vuelo IVAO o VATSIM, su plan de vuelo
SimBrief, o un texto pegado: un plan de vuelo OACI, la página de un vuelo del tracker IVAO o de StatSim, un METAR. Solo
se rellenan los campos vacíos; junto a cada uno, su fuente. Si una fuente da otra cosa para campos ya rellenados, un
botón propone sustituirlos.

**La misión.** En el segundo paso: la familia (propuesta según su último informe), la serie, el identificador de la
misión si el vuelo sigue una, y después los bloques propios de la familia. Algunos bloques solo aparecen para una serie
(por ejemplo VIP o traslado en las misiones especiales).

**El resultado.** En el último paso: el resultado, sus observaciones, la tripulación (usted primero, como comandante) y
el combustible a la salida y al aterrizaje. Las incoherencias — horas desordenadas, fecha futura, combustible que
aumenta — se señalan.

**Guardar.** El botón de abajo guarda el informe y le da su número en el primer guardado. Mientras no haya guardado, lo
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
- **Las horas** se escriben en la hora de su dispositivo.
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

<!-- fr: b8fc73c91418 -->

<!-- chapter: flightlog -->
# Mis vuelos

Todos sus vuelos pasados en un mismo lugar, una línea por vuelo, del más reciente al más antiguo: sus informes, el
diario del sitio de la aerolínea y sus conexiones IVAO o VATSIM, sin duplicados.

## Cómo usarlo

**Los totales.** Arriba, tres casillas: el número de vuelos, las horas bloque y los vuelos que aún no tienen informe,
para el período elegido. Justo debajo, los tres tipos de aeronave que más ha volado.

**Los filtros.** Elija el período (7 días, 31 días, 1 año, todo), busque un indicativo, un tipo, una matrícula, un
aeródromo, una misión o un número de informe, o marque «Sin informe» para ver solo los vuelos que esperan uno. Sus
elecciones se quedan en el dispositivo.

**La lista.** Una línea por vuelo: la fecha, el indicativo, la ruta y el tiempo de bloque. Un punto naranja marca un
vuelo sin informe. En un ordenador, la línea muestra también la aeronave y el número del informe.

**El detalle de un vuelo.** Toque una línea para desplegarla: de dónde viene el vuelo (informe, diario del sitio, red
IVAO o VATSIM), su hora, la aeronave, la misión y las observaciones.

**Escribir o abrir el informe.** En un vuelo que no lo tiene, «Escribir el informe» abre un informe nuevo, ya rellenado
con este vuelo — fecha, aeronave, indicativo, aeródromos — y una familia de misión propuesta. En un vuelo que lo tiene,
«Abrir el informe» lo vuelve a abrir para modificarlo.

**Más.** Despliegue «Más» para exportar la lista filtrada en CSV (hoja de cálculo) o releer sus conexiones IVAO y
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

<!-- fr: 99d023557d9a -->

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
repositorio (V2: Ajustes › Mantenimiento › Datos aeronáuticos y Tipos de aeronave), luego sincronice.

**La sincronización.** Con un intercambio marcado, la tarjeta «Sincronización» da la última correcta, las escrituras
pendientes y la red; «Sincronizar ahora» envía y recibe en el acto. Si no, se hace sola al inicio, cada 10 minutos en
línea y al volver la red.

**La copia.** Solo en este dispositivo, «Exportar (un fichero)» guarda todos sus datos en un fichero: es la única
copia. «Importar (fusión)…» la retoma sin perder nada de aquí; «Sustituir por un fichero…» borra primero lo que hay en
el dispositivo.

**Los datos sin conexión.** Cada zona publicada tiene su línea: su estado en este dispositivo, su ciclo y su tamaño.
«Guardar sin conexión» la descarga entera (mejor por wifi); «Liberar» devuelve el espacio.

## Las claves del lanzador

En un puesto servido por el lanzador, «Claves del lanzador» configura la clave de la API IVAO: se queda en la carpeta
`secrets/` del lanzador, nunca en el navegador ni en los datos. «Probar» comprueba que IVAO responde; «Borrar» la
quita.

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

## Conviene saber

- **El token**: un token de grano fino de github.com, solo sobre el repositorio de datos, «Contents» lectura y
  escritura, 90 días como máximo. Nunca se vuelve a mostrar; no lo pegue en ningún mensaje.
- **Cortar el acceso**: borra el token de este dispositivo; sus escrituras pendientes se quedan y saldrán cuando el
  acceso vuelva a configurarse. Teléfono perdido o robado: borre también el token en github.com.
- **Ajustes de la V2**: si este navegador ya se usó para la V2, la tarjeta «Ajustes de la V2 encontrados» propone una
  vez retomar su identidad y su acceso.
- **Acerca de**: enlaces a esta ayuda y a la hoja de ruta (lo entregado, en curso, previsto), luego el
  diagnóstico, plegado; «Copiar» lo pone en el portapapeles para señalar un problema. El token
  nunca figura en él.

<!-- fr: d3ca81fe9923 -->
