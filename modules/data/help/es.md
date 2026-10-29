# Datos

Lo que la aerolínea publica para la aplicación —la base aeronáutica, los procedimientos, las aeronaves, la meteorología— y el estado de cada conjunto de datos. Esta pantalla es de solo lectura: no descarga, no construye ni publica nada.

## Cómo usarla

<a id="data-cycle"></a>**El ciclo vigente.** Arriba, el ciclo AIRAC del momento (por ejemplo 2610), sus fechas y el número de días hasta el siguiente. Debajo, «Lanzador de este equipo» o «Sin lanzador: solo lectura» indica si este ordenador tiene un lanzador.

<a id="data-coverage"></a>**La cobertura.** La lista de zonas (países, regiones) que sigue este equipo. En la primera apertura son todas las zonas que publica la aerolínea; la lista se guarda en este dispositivo.

<a id="data-states"></a>**Los Estados.** Bajo la cobertura, los Estados se ordenan por color: verde, ya hay procedimientos publicados; naranja, se pueden leer bajo demanda; rojo, nada es legible. El motivo está escrito en cada línea, el color nunca va solo. Pasadas siete líneas, «n más» despliega el resto.

<a id="data-group-base"></a>**Base aeronáutica.** Una línea por fuente que alimenta una zona de la cobertura: su ciclo, su antigüedad («publicado hace 3 días»), el número de zonas publicadas y una etiqueta de estado. Toque una línea para ver el enlace de la fuente con su dirección, su licencia, las zonas que alimenta y lo que ha publicado cada zona.

<a id="data-group-proc"></a>**Procedimientos.** Los procedimientos de Francia (eAIP del SIA) y de Estados Unidos (CIFP de la FAA), con el número de aeródromos publicados.

<a id="data-group-aircraft"></a>**Aeronaves.** Los tipos de aeronave y sus prestaciones: la fecha de la edición, el número de tipos y de archivos. Pasados 28 días, la etiqueta se vuelve naranja.

<a id="data-group-weather"></a>**Meteorología.** La meteorología mundial y las rutas NAT se publican con el sitio: estas líneas no tienen ciclo ni etiqueta.

<a id="data-states-pill"></a>**Las etiquetas.** «Al día»: nada que hacer. «Ciclo superado»: el ciclo publicado es anterior al ciclo vigente (naranja, rojo pasada una semana). «Analizador antiguo»: publicado por una versión anterior de los constructores. «Más de 28 días»: un conjunto sin ciclo, publicado hace más de 28 días. «Ausente del repositorio»: no hay nada publicado. Un grupo se abre solo cuando una de sus líneas requiere atención.

<a id="data-more"></a>**Los demás conjuntos.** Como máximo siete líneas por grupo; «n conjuntos más» despliega el resto y las fuentes solo consideradas o descartadas (su enlace, su licencia, su estado).

## Casos particulares

- **Sin lanzador**: la pantalla se lee igual; muestra lo que está publicado.
- **Una lectura que falla**: la sección lo dice en una línea y el resto de la pantalla se dibuja.

<!-- fr: 71da719b10a1 -->
