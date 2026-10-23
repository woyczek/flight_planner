# Informe

Escribir el informe de un vuelo en unos pocos toques, con o sin misión: el módulo retoma lo que ya sabe de su vuelo,
usted completa, guarda — y, si lo desea, el vuelo se registra en el sitio de la aerolínea en el mismo gesto.

## Cómo usarlo

**Tres pasos.** El informe se rellena en tres pasos: Vuelo, Misión, Resultado. En un teléfono, un paso cada vez
(«Siguiente» abajo); en un ordenador, los tres uno al lado del otro. Nada es obligatorio: lo que falta se indica en el
último paso, sin bloquear nunca el guardado.

**El último vuelo.** Si su identificador IVAO (o VATSIM) está ajustado (⚙) y el dispositivo está en línea, una tarjeta
propone su último vuelo en la red: «Usar» rellena la aeronave, el indicativo, el trayecto y las horas sacadas de la
traza. El vuelo preparado en Combustible o Mapa se propone de la misma forma («Vuelo actual»); si se ha iniciado en
Combustible («Iniciar el vuelo»), aparece primero, «Vuelo iniciado a las hh:mm». La tarjeta dice en una línea todo lo
que se va a retomar, incluso lo que un tipo de misión no tiene casilla para mostrar (distancia, nivel). «Usar» rellena
también la hora de puesta en marcha (la hora de salida en Combustible) y el combustible a la salida (el combustible de
bloque del cálculo), cada uno marcado con su fuente. Guardar el informe termina el vuelo iniciado: Combustible vuelve a
la preparación, Mis vuelos quita «En curso», y el vuelo ya no se propone.

**Las otras fuentes.** Despliegue «Otras fuentes» para retomar su último vuelo IVAO o VATSIM, su plan de vuelo
SimBrief, o un texto pegado: un plan de vuelo OACI, la página de un vuelo del tracker IVAO o de StatSim, un METAR. Solo
se rellenan los campos vacíos; junto a cada uno, su fuente. Si una fuente da otra cosa para campos ya rellenados, un
botón propone sustituirlos.

**La misión.** En el segundo paso: la familia (propuesta según su último informe), la serie, el identificador de la
misión si el vuelo sigue una, y después los bloques propios de la familia. Algunos bloques solo aparecen para una serie
(por ejemplo VIP o traslado en las misiones especiales). Mientras no abra este paso, aparece «por ver» en lugar
de ✓: la familia y la serie de un informe nuevo se toman por defecto.

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

<!-- fr: 5bd862ad5bb7 -->
