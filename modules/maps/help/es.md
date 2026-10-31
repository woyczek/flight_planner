# Mapa

Ver su vuelo en una carta aeronáutica y su perfil vertical, o los mapas de una misión: espacios aéreos, aeródromos,
radioayudas, aerovías, altitudes mínimas. La ruta del vuelo también se modifica en el mapa.

## Cómo usarlo

**El vuelo previsto.** El mapa muestra el vuelo preparado en Combustible: salida, puntos de la ruta, llegada, y el
aeródromo alternativo en guiones grises. La pista, la SID, la STAR y la aproximación elegidas en Combustible se trazan sobre la ruta (SID en verde, STAR en naranja, aproximación en azul), con su nombre como en Combustible («ROYAN6P», «ILS 06»). Su resumen (nivel, distancia, previsto o en vuelo) no se escribe sobre el dibujo (el dibujo lo muestra): el texto emergente del asa del bloque de datos bajo el mapa lo da, con salida y llegada, alternativa y tipo de aeronave. Cuando el vuelo cambia en Combustible, el mapa lo sigue por sí solo.

**El mapa y lo que muestra.** Alrededor de la ruta: los espacios aéreos que atraviesa o roza (zonas restringidas,
peligrosas, prohibidas, espacios controlados), las aerovías bajas o altas según su nivel, los aeródromos y las
radioayudas, y en cada cuadro de un grado la altitud mínima de seguridad (la cifra marrón, en miles y centenas de pies:
«3⁵» quiere decir 3500 ft). Las pequeñas cifras violetas a lo largo de la ruta son las distancias desde la salida, en
millas náuticas. Deslice el mapa con un dedo, separe dos dedos para hacer zoom (durante el gesto el mapa conserva solo sus trazos — espacios, aerovías,
ruta, aeródromos en pequeños cuadrados — y sus nombres vuelven en cuanto se detiene); «Recentrar» (la diana, arriba a la derecha del mapa) vuelve a toda la ruta. El
mapa se queda donde usted lo puso, aunque la ruta cambie: solo «Recentrar» (u otro vuelo) lo reencuadra. Al volver al mapa (desde Combustible, o tras «Terminar»), recupera su encuadre
mientras la ruta y los procedimientos elegidos no hayan cambiado; si no, el vuelo se reencuadra, procedimientos incluidos. Mientras «Solo alrededor
del vuelo» esté marcada (Capas), los espacios y aerovías solo se leen cerca del vuelo, de lejos; desmárquela o acérquese
para verlo todo.

<a id="maps-procs"></a>**La pista y los procedimientos elegidos.** Lo que eligió en Combustible (pista, SID, STAR, aproximación) se traza sobre la ruta: la SID en verde, la STAR en naranja, la aproximación y su aproximación frustrada en azul, desde el umbral de la pista de salida hasta el primer punto de la ruta, y desde el último punto de la ruta hasta el umbral de la pista de llegada. Las transiciones y la aproximación frustrada van a trazos; un tramo sin punto (un ascenso en un rumbo, por ejemplo) es un trazo corto a lo largo de su rumbo y luego trazos hasta el punto siguiente; un viraje de radio constante es un arco. Cuando la SID no llega a un punto de la ruta, una recta a trazos la une a la ruta (igual para la STAR). Un procedimiento que no eligió no se dibuja nunca, y la lista de capas no tiene casilla para él. El nombre del procedimiento se escribe sobre su trazo, seguido del origen de sus datos cuando vienen de X-Plane o de Little Navmap («X-Plane, local») y luego del símbolo ⌛ (en gris) cuando se leyeron bajo un ciclo anterior; la leyenda (chip «i») lo recuerda. Desde la vista regional (ajustable en la página de umbrales), cada punto lleva sus restricciones; el nombre del procedimiento se escribe a todas las escalas, por encima de lo demás, como en las cartas de procedimientos: una altitud **subrayada** significa «como mínimo», **sobrerrayada** «como máximo», las dos «exactamente», «5000–7000» «entre las dos»; «≤ 220 kt» es la velocidad que no hay que superar. El perfil vertical sigue el mismo camino y muestra estas restricciones como escalones (flecha hacia arriba: como mínimo, hacia abajo: como máximo, punto: exactamente, barra: entre dos altitudes); su texto toma un lugar libre o ninguno, nunca sobre el nombre de un espacio, TOC / TOD o un escalón; las distancias, las horas estimadas y el cursor se miden a lo largo de ese camino. El mapa nunca cambia esta elección: toque un aeródromo de la ruta y su ficha da la pista y los procedimientos elegidos, con un botón «Cambiar» que abre Combustible en la línea que hay que modificar; un enlace «Fuente» abre en una pestaña nueva la página publicada del procedimiento (eAIP del SIA), y para un procedimiento leído en otro sitio el nombre de su documento aparece al pasar sobre la línea.

<a id="maps-rwy"></a>**Las pistas.** De cerca, cada pista de cada aeródromo dibujado es un vector corto desde su umbral, y el aeródromo muestra su nombre junto al código («LFPO Paris-Orly»); cada vector va en el sentido de la pista, su número en la cola, detrás del umbral: la pista elegida en Combustible en negrita con el color de su lado, las demás finas. Solo aparecen a partir del zoom fijado por la aerolínea (Ajustes › Administración, «Zoom de los umbrales de pista», 11 sin ajuste); por debajo, nada. En «Elegir en el mapa», todas las pistas del aeródromo se dibujan así, la elegida en negrita; los dibujos de la elección pasan por encima de las etiquetas del fondo, atenuadas.

<a id="maps-choose"></a>**Elegir en el mapa.** El botón «En el mapa» de un lado de Combustible (salida o llegada) abre el mapa sobre ese aeródromo —como «Elegir en el mapa» en la ficha del aeródromo de salida o de llegada (toque su símbolo; a todo el ancho en un teléfono)—: la hoja se abre desplegada («Terminar» queda al pie, siempre visible), el mapa de fondo y las capas se atenúan y la vista se ajusta al aeródromo y a sus procedimientos compatibles con su elección, a 40 NM a su alrededor, el aeródromo en el centro (las entradas lejanas quedan fuera del encuadre; un procedimiento elegido que sale de la vista la amplía solo a él); desde la entrada, los procedimientos compatibles de la primera familia se dibujan atenuados: toque uno en el mapa para elegirlo, como su línea. Arriba del bloque de datos, su selección en una línea por familia («Pista 31 · ↑ 12 kt», «OKRI5L», «I31 vía IAF1»), cada una con ✕ para volver a «Ninguna»; tocar el nombre de una familia («Pista», «STAR», «Aproximación») lleva a su grupo y lo despliega. Debajo, las tres familias a la vez —la pista, la SID (salida) o la STAR, la aproximación (llegada)— en líneas apretadas: tres toques en el orden que prefiera. Cada elección reduce las otras dos familias a lo que le es compatible; el resto queda plegado bajo una línea fina «N más · Todas», que lo despliega marcado con ⚠ (se puede elegir igualmente). Las SID que salen y las STAR que entran en la ruta que ha escrito vienen primero, bajo «Hacia su ruta»; las demás siguen, marcadas «salida LACOU» o «entrada OKRIX». En una ruta directa (ningún punto ni aerovía entre los dos aeródromos), nada de eso: se ordenan por su dirección hacia el otro aeródromo, «Hacia LFPO» encima de las mejor orientadas (a menos de 60°), una pequeña flecha en el sentido del vuelo en cada fila. «Ninguna» es siempre la primera línea. Los procedimientos que solo difieren por la pista (OKRI5L, OKRI5R) forman una línea «OKRI5» con sus pistas en pequeñas etiquetas: tocarla elige la familia y reduce las pistas, tocar una pista elige el procedimiento. Las aproximaciones se leen por su etiqueta corta («ILS 06», «RNP 06», sin etiqueta de pista porque la etiqueta ya la dice, la misma en el mapa; el nombre publicado al pasar por encima); bajo la aproximación elegida, «Sin transición» y luego sus transiciones, entre ellas los segmentos de aproximación inicial que el SIA publica para toda la pista («via ODILO 1A»), en el tono de su final; una STAR elegida solo deja las transiciones que parten de uno de sus puntos (si no, la transición vuelve a «Ninguna»); una transición que no se une a la final en un punto común se enlaza con una línea discontinua. Cada procedimiento tiene su tono (ocho, en ciclo), el mismo en su línea, su etiqueta y su trazado; en el mapa, una pequeña etiqueta por familia y por punto («NIMER 9»), y el procedimiento sobrevolado o tocado pasa por encima de todo, con su nombre completo; pasar sobre una línea de cualquier familia resalta su trazado, pasar sobre un trazado resalta su línea; ⌛ (gris): leído en un ciclo anterior. El código del aeródromo queda escrito por encima de los procedimientos; los números de pista toman su lugar antes que las radioayudas, que les ceden; un número que caería sobre una etiqueta no se escribe (la flecha queda). Cada pista lleva el viento del METAR ya conocido: «↓ 12 kt» de cara, «↑» de cola, luego el cruzado (← viento de la derecha, → viento de la izquierda: la flecha dice hacia dónde sopla, la pista dibujada hacia arriba, como en Combustible), en verde, naranja o rojo según el viento de cola y el cruzado; sin METAR, nada. Un toque en una línea o un trazado añade esa elección y la deja en el mapa (la pista en negrita, el procedimiento en su tono, los demás de su familia atenuados); todavía no se escribe nada. Un procedimiento que sirve una sola pista la elige si no hay ninguna; si no, una línea bajo el grupo propone la corrección, con un toque: «OPAL2E sirve a la 25 — Pasar a la 25», o «OKRIX5A no sirve a la 07 — Elegir OKRIX5B». «Terminar», la cruz ✕ o Escape le devuelven a Combustible con todo lo elegido; Combustible lo escribe y dice qué ha cambiado; el mapa no escribe nada. Para renunciar sin devolver nada: «← Combustible» arriba.

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
descenso habituales. Cuando falta sitio, el mapa escribe primero el nombre del aeródromo, luego los números de pista,
las radioayudas, los procedimientos, la ruta (nombres, horas, TOC / TOD) y por último lo demás; una hora estimada o el
nombre de TOC / TOD se desliza a lo largo de la ruta antes de callarse (el rombo queda).

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

<!-- fr: ab9ff462f78b -->
