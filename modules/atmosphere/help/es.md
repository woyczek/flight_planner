# Meteo

La atmósfera a lo largo del vuelo preparado en Combustible: un mapa meteorológico al nivel elegido, el corte vertical de
la ruta, el corte de un punto, a la hora de salida o más tarde.

## Cómo usarlo

<a id="atmosphere-flight"></a>**El vuelo.** Meteo muestra siempre el vuelo preparado en Combustible (ruta, nivel, fecha del vuelo). Sin vuelo previsto,
la página lo dice y lleva a Combustible; «Ver el ejemplo» muestra un vuelo de demostración, marcado como tal en el
asa.

<a id="atmosphere-load"></a>**Cargar la previsión.** El botón de carga (la flecha hacia abajo, a la derecha del mapa) lee la previsión a lo largo de
la ruta y alrededor de ella. No se pide nada al abrir: la página muestra lo que el aparato ya ha guardado. Fuera de la
zona del vuelo, el mapa muestra el sinóptico mundial publicado con la aplicación, sin pedir nada.

<a id="atmosphere-map"></a>**El mapa meteorológico.** Isobaras, isotermas, nubes, viento, corriente en chorro y convección, al nivel elegido con la
pastilla del nivel («Suelo», el nivel solicitado, la trayectoria calculada o una altitud fija). El botón de capas (arriba
a la izquierda) elige lo que se dibuja. Toque un punto del mapa para abrir su corte.

<a id="atmosphere-zones"></a>**La zona del vuelo y el mundo.** Una línea fina rodea la zona del vuelo: dentro, la previsión fina cargada para el vuelo
(Météo-France AROME 1,3 km y ARPEGE 0,1° sobre Francia, ICON en Europa); fuera, el sinóptico mundial (GFS de la NOAA,
publicado con una malla de 5°). Los dos modelos no dicen exactamente lo mismo: un salto de las líneas al cruzar la línea
es normal. El panel de capas nombra los dos modelos y su malla.

<a id="atmosphere-date"></a>**La fecha del vuelo.** El cursor bajo el asa adelanta la hora de 0 a 72 horas desde la salida prevista: el mapa, el
corte y los cortes de punto siguen.

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
- Lo cargado se queda en el aparato y sirve sin conexión; el Mapa reutiliza su corte meteorológico.

<!-- fr: f08415c8bd41 -->
