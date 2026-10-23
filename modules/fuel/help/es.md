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
