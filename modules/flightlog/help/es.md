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
