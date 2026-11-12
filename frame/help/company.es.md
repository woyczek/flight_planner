<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Compañía — manual

La app Compañía es la del piloto de la aerolínea: las misiones que la aerolínea propone (módulo Misiones). En ella elige
su próximo vuelo, o lo sortea entre los que aún no ha volado; «Preparar este vuelo» pasa entonces a la app Piloto, en
Combustible, con la misión preparada. El vuelo en curso es el mismo en las dos apps.

## Primer inicio

- **Las entradas.** Misiones y Flota (la de la aerolínea actual, en el nivel Completo), en la barra inferior de un teléfono y en la columna izquierda de una
  pantalla. Arriba a la derecha, «?» abre esta ayuda y ⚙ los Ajustes.
- **Las apps.** El nombre de la aplicación, arriba a la izquierda, abre la lista de aplicaciones (el nombre de su aerolínea
  bajo «Compañía»): un toque pasa a Piloto.
- **La ayuda.** Se abre en el capítulo de la pantalla mostrada; «Toda la ayuda», al principio, lleva a los demás manuales y
  a los tutoriales.
- **El logotipo.** El icono de la app es el logotipo de su aerolínea cuando el repositorio de datos tiene uno (un archivo png
  o webp de 512 KB como máximo, nombrado en airline/settings.json: «logo»: «airline/logo.png»); si no, el avión teñido.

<!-- chapter: missions -->
# Misiones

Las misiones de la compañía, en la aplicación Compañía: las del repositorio común (escritas con el CPCO): elegir una, o sortear una, y prepararla luego en Combustible.

## Cómo usarlo

<a id="missions-list"></a>**La lista.** Las misiones de las series más recientes primero, agrupadas por familia. Cada fila da el identificador, el título, el trayecto, el tipo de aeronave y el bloque estimado; «volada el …» marca una misión cuyo informe ha escrito usted. La búsqueda filtra por identificador, título, aeródromo (código OACI), tipo de aeronave, indicativo (SAMU66) o actividad (MEDEVAC, HEMS, SAMU…); la lista desplegable conserva una familia. Se muestran siete filas, «N más» despliega el resto. Las misiones de organización de un ejercicio (las que terminan en Z) no son vuelos y no aparecen. Solo se listan las misiones de la compañía elegida en Ajustes › Compañía; una misión que no nombra compañía es personal: está en «Personnel». La lista «Mi compañía · Personal · Todas las compañías», encima de la búsqueda, muestra también las misiones personales o las de otras compañías, cada una con el nombre de su compañía; se preparan igual. Cuando la compañía tiene categorías (carga, pasajeros…), una segunda lista desplegable conserva una categoría, y la misión abierta dice la suya.

<a id="missions-open"></a>**Elegir, o sortear.** Un toque en una fila abre la ficha de la misión: su categoría, su resumen en dos líneas, sus riesgos (los tres primeros, «peligro → medida», los demás plegados, o «Ningún riesgo declarado»), los equipos implicados y sus zonas. «Detalle» muestra el resto en secciones plegables: descripción, objetivos, zonas que activar, encuentros, ruta facilitada, mapas facilitados, carga y aeronaves; «Ver en el Mapa» abre el Mapa en una zona o en un mapa de la misión (trazado a partir de sus coordenadas). En un teléfono, el retroceso del navegador vuelve del detalle a la ficha y luego a la lista; en una pantalla grande, la ficha y el detalle están lado a lado. «Sortear» toma una al azar entre las misiones de la lista filtrada que aún no ha volado; «Sortear otra» toma otra. Nada arranca solo: «Preparar este vuelo» abre Combustible, en la aplicación Piloto, con la salida, la llegada, los puntos de la misión (en coordenadas), el nivel y el tipo de aeronave; la pista, los procedimientos, el combustible y la meteorología se preparan después como para cualquier vuelo.

<a id="missions-add"></a>**Añadir misiones.** «Añadir misiones», junto a «Sortear», lee uno o varios archivos YAML de misiones (un archivo puede contener varias, separadas por «---» o en una lista `missions:`), o un YAML pegado. Antes de escribir, la pantalla muestra lo leído (identificador, título, familia, serie, compañía) y lo rechazado, con la razón (identificador fuera de la regla, organización de ejercicio, duplicado, YAML ilegible en tal línea). «Añadir (n)» escribe cada misión en su lugar, `missions/<letra>_<FAMILIA>/<ID>/mission<ID>.yaml`; una misión que ya existe solo se reemplaza si «¿reemplazar?» está marcado. Una misión sin compañía es personal. Salen en la próxima sincronización.

<a id="missions-airline"></a>**Cambiar de compañía.** En la ficha de una misión, «Compañía: … · Cambiar» propone las compañías y «Personal»; la frase «… pasa de … a …» se dice antes de «Escribir». En la lista, «Asignar a una compañía…» toma las misiones mostradas (alcance, familia, búsqueda), cada una marcada: la pantalla dice cuántas cambian y cuáles son ilegibles (se dejan tal cual) antes de escribir. Al añadir desde un YAML, «Añadir estas misiones a» elige su compañía. Solo cambia el campo `airline` del archivo.

## Bueno saber

- El módulo lee las misiones y nunca las modifica; se escriben en el CPCO.
- Una misión cuyo archivo no llega lo dice: «no encontrado» (el repositorio no lo tiene), «aún no está en el dispositivo» (la sincronización lo trae, la misión aparece al llegar) o «ilegible» (con el motivo). Entonces solo se muestra el registro.
- Una misión llegada con la sincronización sin el registro que la nombra se lista igualmente, leída de su archivo, en la siguiente visualización; ningún botón que pulsar.
- Un vuelo en preparación solo se sustituye tras una pregunta; un vuelo iniciado nunca (anule la salida, o termine el vuelo, antes).
- El sobre, el lector página a página y las asignaciones llegarán más tarde.

<!-- fr: e786600425be -->

<!-- chapter: aircraft -->
# Aeronaves

La flota de la compañía, tal como la leen las demás pantallas: el informe (matrícula → tipo, indicativos), el mapa, el CPCO. Las fichas de rendimiento están en la misma pantalla (pestaña «Fichas»); el registro de tipos llegará.

## Cómo usarlo

<a id="aircraft-fleet"></a>**La flota.** Una fila por aeronave: matrícula, tipo, indicativos, base, «fuera de servicio» cuando lo está. La búsqueda filtra por matrícula, tipo, un indicativo o la base; se muestran siete filas, «N más» despliega el resto. «Añadir» abre una aeronave vacía. La flota es la de la compañía elegida en Ajustes › Compañía; cambiar de compañía cambia la lista, y una aeronave añadida va a la flota de esa compañía.

<a id="aircraft-edit"></a>**Modificar una aeronave.** Un toque en una fila la abre: identidad (matrícula, tipo, variante, propietario u operador: una compañía, un aeroclub, un particular) y operación (indicativos separados por comas, base, número táctico, en servicio). Bajo los campos, una línea dice lo que va a cambiar («2 campos cambiados: base, indicativos»); «Guardar» lo escribe. Desde dos caracteres (mayúsculas o no), el campo Tipo propone los tipos de la base y las fichas que coinciden («H145 · Airbus H145 · ficha H145»); un toque, o ↓ y luego Intro, escribe el código del tipo. Un tipo que la base no conoce se guarda tal cual, y la pantalla lo dice. La matrícula es la clave: dos aeronaves no pueden compartirla. La ubicación que da el sitio queda como está. «Retirar» pregunta, y luego la aeronave sale de la flota; su ficha de rendimiento, si la tiene, se conserva.

<a id="aircraft-sheets"></a>**Las fichas.** La pestaña «Fichas» lista las fichas de rendimiento por familia (helicópteros, turbohélices, reactores, pistón, otros); la búsqueda filtra por nombre, tipo o matrícula. Cada fila dice de dónde viene la ficha, qué le falta y su fecha; un tipo de la flota sin ficha se propone «por completar». «Importar un archivo» lee un CSV, un JSON, un .lnmperf o un OFP de SimBrief; «Pegar un texto» lee un texto pegado, incluida una respuesta de ChatGPT; «Nueva ficha» pide el código del tipo. No se escribe nada de inmediato: una importación muestra primero, campo por campo, lo que cambiaría; desmarque lo que conserva y luego «Aplicar la selección». Varias fichas a la vez: cada vista previa nombra su ficha y su rango («3 / 13»), una ficha que no cambia se pasa sola, «Omitir esta ficha» va a la siguiente sin escribir nada, y al final se da el balance; una nota ya escrita solo se sustituye si la marca. La pestaña elegida se guarda en el dispositivo, y el enlace `#aircraft?sheet=<id>` abre directamente el editor de una ficha.

<a id="aircraft-sheet-edit"></a>**Modificar una ficha.** Un toque en su nombre (o en su línea) abre el editor: los campos por grupo (identidad, combustible, pista y alternativo, ascenso, crucero, descenso, régimen), la tabla régimen / consumo en pantalla grande, y el complemento EUROCONTROL, «Completar desde otra ficha…» (un botón que abre la búsqueda de las fichas, nada elegido de antemano) o «Completar con ChatGPT», que copia la petición y abre ChatGPT en una pestaña nueva: pegue allí la petición si no está y luego pegue su respuesta bajo el botón. «Combustible en volumen» y «Densidad del combustible» se explican bajo el campo; una densidad fuera de 0,5 a 1,0 se rechaza. Una tabla régimen / consumo cuyo consumo baja cuando sube el régimen se señala (la fila en naranja, «¿horquilla mal leída?»); no se corrige nada sin usted. Un punto «•» al final de la etiqueta de un campo rellenado indica su origen y su fecha («lnmperf · 28/10», «editado · 30/10») al pasar el cursor o con un toque, con los valores descartados; el título de cada tarjeta recuerda sus fuentes una vez («Fuentes: base V2 · 28/10, editado · 30/10»). «Guardar» abre la vista previa de los cambios, que solo se escriben tras «Aplicar la selección»; así cada campo cambiado conserva su fuente y se guarda el valor anterior. «Exportar .lnmperf» y «Exportar JSON» descargan la ficha; «Eliminar» pregunta antes de retirar la ficha de la base compartida. Una altitud en la columna «ft» forma una curva propia: las filas de esa altitud; si su consumo baja mientras el régimen sube, una línea lo dice con la altitud («… a 8000 ft: ¿horquilla mal leída?») y marca la fila, sin corregir nada. Bajo la tabla, «Proponer desde las mediciones» lee uno o varios registros Fuel Phase Monitor (.csv, .csv.gz) elegidos en el dispositivo (no se guardan ni se envían): los niveles estables del tipo de la ficha se listan por altitud y régimen, con la desviación respecto a la curva de la misma altitud («ficha 40, desviación -5 %») o «fila nueva»; marque los que quiera conservar, «Añadir las filas marcadas al borrador» y luego «Guardar» y «Aplicar» como para cualquier cambio. Con varias altitudes, la tabla es un grupo plegable por altitud («8000 ft · 4 regímenes»); cada fila tiene además una TAS opcional (kt), que Combustible lee cuando dos filas enmarcan el régimen de crucero. En el puesto, «Desde la carpeta Output» lista los registros de la carpeta Output de X-Plane (ajustada una vez con «Ajustar la carpeta Output»): márquelos, «Leer los registros marcados», y los niveles se muestran igual. En la cabecera de la tabla, «Curvas» traza el consumo según el régimen, un color por altitud con su leyenda; los niveles medidos se añaden como cuadrados. El ascenso y el descenso medidos tienen cada uno una línea (régimen, consumo, régimen vertical, velocidad, mando de gases y el valor actual de la ficha): marcada, rellena el ascenso o el descenso del borrador. La línea superior del editor sigue visible: el nombre de la ficha y su unidad («lb · lb/h»); un toque en la unidad lleva a su elección. Los niveles se colocan en niveles significativos (hasta 5000 ft de 1000 en 1000, luego FL100, 150, 200 … 450: un FL181 cuenta como FL200); un nivel sin medición entre dos medidos se calcula, en gris y dicho «extrapolado». Las mediciones aceptadas quedan en el dispositivo para un cálculo futuro, nunca publicadas.

<a id="aircraft-fuel-volume"></a>**Combustible en volumen.** Marcado: las cantidades de esta ficha (utilizable, rodaje, reserva, consumos) son volúmenes — litros o galones, como los muestra el simulador —, no masas; la densidad de abajo las convierte a kilos.

<a id="aircraft-fuel-density"></a>**Densidad.** Kilos por litro del combustible: Jet A-1 unos 0,80, Avgas unos 0,72. Depende del combustible, no de la aeronave: déjela vacía para el valor de la compañía (Ajustes), si no el típico. Entre 0,5 y 1,0.

**Unidades del combustible.** Arriba del editor, «Combustible leído y escrito en» ofrece kg, lb, l o US gal (y kg/h, lb/h, l/h, gal/h para los consumos); cada campo y la tabla régimen / consumo llevan la unidad elegida. Un valor convertido se escribe con dos cifras significativas (12 407,6 lb/h se lee 12000); un valor escrito por usted queda tal cual, y la ficha conserva su valor mientras no toque el campo. La ficha guarda su unidad de almacenamiento: una línea la dice con la densidad usada; un valor escrito se convierte al guardar, un valor sin tocar no cambia.

## Bueno saber

- El módulo Sitio también actualiza la flota a partir de la página «Flota» del sitio pegada: los dos escriben el mismo archivo, cada guardado relee el archivo justo antes y cambia una sola aeronave.
- Nada sale antes de la próxima sincronización.

<!-- fr: c202cf6c2d68 -->

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

**Los grupos.** En el nivel Descubrimiento, la pantalla muestra siete tarjetas como mucho, una debajo de otra:
Identidad, Acceso a los datos, Sincronización (cuando sirve), Usos, Nivel, Diseño y Acerca de. La copia de seguridad, los
datos sin conexión, la clave meteorológica, las fichas de Little Navmap y el acceso del equipo llegan en el nivel
Habitual. En los niveles Habitual y Completo, las tarjetas se ordenan bajo siete títulos, en el orden en que se
configuran las cosas: Identidad, Acceso, Datos, Dispositivo, Visualización, Administración (nivel Completo) y Ayuda.
Cada título está plegado; tóquelo para abrirlo. Un grupo que requiere atención (un aviso, un error o la tarjeta a la que
lleva una línea naranja del estado) se abre solo, con un punto naranja; una línea del bloque «Estado» abre el grupo de su
tarjeta. Un grupo abierto a mano sigue abierto mientras la página está abierta. Las tarjetas de circunstancia (ajustes de
la V2 encontrados, configuración recibida, reanudación de la adhesión) van primero, en todos los niveles, y desaparecen
una vez atendidas. Una tarjeta abierta por su dirección (el botón «Datos sin conexión» del asistente «Unirse a la
aerolínea», por ejemplo) se muestra sola, sea cual sea el nivel; «← Ajustes» vuelve a la lista.

**Su identidad.** En «Identidad», escriba su trigrama y sus identificadores VID IVAO, CID VATSIM y SimBrief, luego
«Guardar». Las herramientas los usan para prerrellenar; con varios usuarios, el trigrama es necesario.

**El nivel.** «Nivel» elige lo que muestra el menú: Descubrimiento, Habitual o Completo, con un toque. Bajo cada opción,
la línea «Menú:» indica qué herramientas muestra; una herramienta oculta sigue accesible por su dirección.

**El diseño.** «Diseño» muestra una miniatura por aspecto — Estándar, Gabinete, Robusto — y el tono: Automático
(como el sistema), Día o Noche. Un toque lo aplica en el acto, solo en este dispositivo. Un diseño reservado al
ordenador no se aplica en un teléfono: la tarjeta dice cuál se muestra en su lugar, y su miniatura está marcada; tocar
una miniatura sustituye esa elección.

**Los usos.** La frase al principio de «Usos» indica cómo se intercambian los datos. Sin casilla marcada, está «Solo en
este dispositivo»: nada sale a otro lugar. Marque «Solo, en varios dispositivos» o «Varios usuarios (repositorio git de
datos)» para intercambiar. En un puesto servido por el lanzador, la aplicación ya lee y escribe la carpeta `data/`
del lanzador, incluso sin casilla marcada; un uso de intercambio la comparte además por git.

**El acceso a los datos.** En un teléfono o en el sitio, configure en «Acceso a los datos» el repositorio
(cuenta/repositorio), la rama y su token personal, luego «Probar» y «Guardar». En un puesto servido por el lanzador no
hay token; mientras `data/` no es un repositorio git, la tarjeta abre la vía para obtenerlo o retomarlo; su repositorio
remoto se configura en la tarjeta «Administración» (vea «Un repositorio git para data/»). En el equipo del lanzador, la tarjeta «Acceso a los datos» empieza con una línea «Repositorio de datos:» que da la dirección y la rama del repositorio remoto: la pantalla no la espera (el lanzador puede tardar varios segundos en leerlo), la línea muestra «…» y luego su valor, sin moverse; lo que depende del repositorio (el panel «Repositorio remoto» de la Administración, por ejemplo) aparece cuando llega.

**Sin acceso ni lanzador, no hay bases.** Un dispositivo sin acceso configurado y sin lanzador — el sitio abierto en un
teléfono por primera vez, por ejemplo — no tiene ni la base aeronáutica (espacios, aeródromos, radioayudas) ni la base
de aeronaves: «Datos sin conexión» lo dice. Dos vías: configure el acceso al repositorio de datos, incluso sin marcar
intercambio (entonces solo sirve para leer las bases); o, en un puesto con lanzador, publique las bases en el
repositorio (V2: Ajustes › Mantenimiento › Datos aeronáuticos y Tipos de aeronave), luego sincronice. Tres estados distintos cuando falta la base: «Base aeronáutica cargándose…» (la lectura no ha terminado: espere), «Acceso a los datos no configurado en este dispositivo» (configure el acceso arriba; una aplicación añadida a la pantalla de inicio tiene su propio almacenamiento, nada de lo de Safari está allí) y «Base aeronáutica no publicada» (el acceso funciona, nada está publicado en el repositorio).

**La sincronización.** La tarjeta «Sincronización» es el resumen de lo que aún no ha salido: arriba, un recuento por tipo (fichas de aeronaves, misiones, vuelos, flota; «Otros» solo si hay algo),
luego la última correcta, la red y el último error. Una lista plegada por tipo da lo que espera: el título legible (por ejemplo «Ficha A320 Navy», «Vuelo LFPO → LFBO del 3/11»), la fecha, ✕ para una
eliminación y, si la hay, el error que retiene la cola; siete elementos visibles como máximo, «… y n más» para el resto. Con el lanzador del puesto se añaden «modificado aquí» (aún no guardado en los datos) y
«para enviar» (guardado, aún no enviado). «Enviar todo» envía y recibe en el acto; si no, la sincronización se hace sola al inicio, cada 10 minutos en línea y al volver la red. La tarjeta aparece en cuanto se
marca un intercambio o algo espera. Debajo, una línea dice lo que acaba de salir («Enviado a las 18:04: Fichas de aeronaves: 2 · Misiones: 1», con «de ellos 1 rechazado(s)» si lo hay); desplegada, da los archivos uno a uno por su título legible, los rechazos primero con el motivo que dio el transporte, siete como máximo. Es la última sincronización que envió algo: un paso sin nada que enviar la deja como estaba, y antes del primer envío no se dice nada. En un puesto con lanzador, dos líneas dicen **cuánto tardó la sincronización**: la última y **la más larga de hoy** (guardada en este dispositivo), en segundos, paso a paso (ajuste, commit, recepción, envío…), con el número de comandos git y lo enviado («8 s — commit 1 s · recepción 2 s · envío 4 s · 12 comandos git (1 s) · 38 Ko enviados»); un paso más corto no sustituye al más largo, otro día lo borra.

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

## Las claves API de la aerolínea

En un puesto servido por el lanzador, en el nivel Completo, el botón «Claves API de la aerolínea (IVAO, EAD Basic)» de la tarjeta
«Administración» despliega el ajuste de la clave de la API IVAO: se queda en la carpeta `secrets/` del lanzador, nunca en
el navegador ni en los datos. «Probar» comprueba que IVAO responde; «Borrar» la quita.

Bajo la clave IVAO, el bloque «EAD Basic (EUROCONTROL)» recibe el usuario y la contraseña de su cuenta EAD Basic: los entrega una sola vez al lanzador de este equipo (carpeta `secrets/`), que los guarda; la página no los vuelve a mostrar nunca, solo dice si están guardados y cuándo. Sirven para «Leer un aeródromo desde EAD» (un aeródromo por gesto). EAD Basic es una herramienta de demostración con datos no operativos, para usar solo en simulación (el aviso sigue visible). «Borrar» los quita del lanzador.

<a id="settings-ivao-app"></a>Bajo el bloque EAD Basic, un enlace lleva al asistente «Aplicación IVAO (conexión de los pilotos)» (la tarjeta del mismo nombre, grupo «Administración», o `#settings?card=ivaoapp`). Permite a los pilotos conectarse a IVAO por el relé de la compañía o por este equipo: le guía en IVAO (`https://developers.ivao.aero/create`: Name = el nombre de la compañía, App Type = Third Party, Active = Enabled), enumera las direcciones de retorno que declarar con «+ Add Redirect URL» (la de este equipo y, si su dirección pública está configurada, la del relé; «Copiar» las da tal cual) y luego recibe el Client ID y el Client Secret que muestra IVAO. El lanzador los escribe en `secrets/ivao_oauth.json`: no edita ningún archivo, y la página no los vuelve a mostrar nunca (solo dice si la aplicación está guardada y cuándo). «Probar» alcanza el documento de descubrimiento OpenID de IVAO; «Borrar» quita la aplicación. La clave API de la aplicación (`secrets/ivao.json`) es otro ajuste: la de una aplicación nueva se traslada a «Clave IVAO».

## La tableta junto al simulador

Vuela en el equipo (X-Plane) y quiere el mapa en una tableta o un teléfono: en el equipo servido por el lanzador,
«Acceso del equipo» abre la aplicación Piloto a los dispositivos de la misma red local (o inicie `lancer.cmd --lan`).

1. **Abrir a los dispositivos de la red local**: la tarjeta muestra la dirección que abrir en el dispositivo, su
   código QR y un código de vinculación de 8 cifras (6 hasta el 30 de octubre de 2026). Windows puede pedir que autorice Python: acéptelo solo para
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
  a un dispositivo (con su fecha de vinculación, en UTC), retira solo ese.
- Solo se abre la dirección principal del equipo; las demás (VPN, máquinas virtuales) solo con «Abrirlas también». Una
  dirección que no puede abrirse se nombra en la tarjeta; la ventana del lanzador dice por qué.

## Un repositorio git para data/

**¿GitHub o GitLab?** No es un ajuste: el proveedor se lee de la dirección del repositorio remoto y se muestra al principio de «Administración › Repositorio remoto de data/»; la tarjeta «Acceso a los datos» lleva allí.

En un puesto servido por el lanzador, en el nivel Completo, el botón «Repositorio remoto de data/» de la tarjeta
«Administración» muestra el repositorio remoto de `data/`: su dirección y su
rama. Para configurarlo o cambiarlo, escriba la dirección (`git@host:cuenta/repo.git` o `https://…`, sin contraseña ni
token dentro): «Comprobar» indica si el repositorio responde, «Guardar» lo configura. Hacia otra dirección distinta de la configurada, se abre una ventana Sí / No en el equipo, no en la página: la tarjeta lo dice antes del clic; respóndala (puede estar detrás de otras ventanas) y vuelva. Rechazada, cerrada o ya abierta: la tarjeta da el motivo y `data/` se queda tal cual. Es a propósito: una página trampa no debe poder enviar sus datos a otro lugar. Nada bloquea: un repositorio que no responde solo
se señala.

- **El acceso al repositorio** se configura en el equipo: una clave SSH para una dirección `git@…`, credenciales
  guardadas en Git para una dirección `https://…`.
- **El proveedor** de una configuración se elige (github o gitlab), nunca se adivina; el panel solo lee la dirección del repositorio remoto (GitHub, gitlab.com, framagit.org, o un GitLab autoalojado que la configuración del dispositivo nombra con el mismo host; si no, «Proveedor no reconocido»). En la parte superior del panel, «Proveedor: GitLab · proyecto grupo/proyecto» (el proyecto es un enlace a su página); para GitLab, el enlace «Tokens de los pilotos» lleva a la creación de los tokens de acogida; para GitHub, el panel propone introducir la dirección de un proyecto GitLab, porque la acogida por token de proyecto lo requiere. La página solo propone: cambiar de repositorio pasa, como siempre, por la ventana Sí / No del lanzador. La configuración exportada lleva siempre el proveedor (github o gitlab; un repositorio desconocido se rechaza, nunca se exporta como «other»), y el lado del piloto se abre sobre él. Una configuración antigua sin proveedor solo se acepta para github.com. Sin lanzador, una configuración GitLab se aplica en el dispositivo como una de GitHub.
- **Varios usuarios por git** necesitan este repositorio remoto: sin él, la casilla «Varios usuarios» no lleva a
  ninguna parte, y la tarjeta «Usos» lo recuerda.
- **data/ ausente o sin git**: la tarjeta «Acceso a los datos» abre una vía, en todos los niveles. `data/` es una carpeta ignorada por el repositorio del código;
  se convierte en su propio repositorio git, enlazado al repositorio de datos (no un submódulo). Escriba la dirección
  del repositorio de datos y, si hace falta, un usuario y una contraseña o token (nunca guardados por la página;
  «Recordar» los confía a Git en este equipo). Sin `data/`, «Recuperar los datos» lo clona; con un `data/` sin git
  (datos de ejemplo o archivo), «Retomar data/ en este repositorio» lo enlaza al repositorio. La tarjeta sigue el trabajo
  y vuelve a leer el estado al final; un fallo se explica, nada se pierde.
- **Historial del repositorio reescrito** (por ejemplo para purgar archivos grandes): la sincronización de este equipo
  rechaza entonces toda fusión y lo dice; no se pierde nada. Aquí, «Retomar el nuevo historial» muestra primero lo que
  saldrá (sus commits, los archivos de datos trasladados), pregunta, guarda el estado anterior en una referencia local,
  traslada sus archivos de datos al nuevo historial y luego sincroniza. Un archivo fuera de los datos sincronizados
  nunca se vuelve a enviar.

## Configurar un piloto

**Preparar la configuración (administrador).** En la tarjeta « Administración » (nivel « Completo »), « Añadir un piloto » prepara la configuración de un piloto (véase « Añadir un piloto (administrador) » más abajo). Da **tres formas de la misma configuración**: el archivo sog-config-<TRI>.json, el enlace y su código QR; envíe la que quiera. El piloto escanea el código QR con la cámara de su teléfono: abre el enlace, que lleva al asistente. Contienen la aerolínea, el repositorio de datos, el trigrama y el modo de empleo del token, nunca un token ni un secreto; el propietario del repositorio (usuario u organización) figura en ellos, decide qué token crear. Para un repositorio GitHub, invite primero el nombre GitHub del piloto en el repositorio, con el derecho Write (el enlace lleva a la página de colaboradores del repositorio).

**Unirse a la aerolínea (piloto).** El código QR (escaneado con la cámara del teléfono: abre el enlace), el enlace, «Unirse a la aerolínea…» (tarjeta «Acceso a los datos»: el asistente sin configuración pide pegar el enlace recibido, o elegir el archivo) y la tarjeta de bienvenida de la primera apertura abren el asistente «Unirse a la
aerolínea», una pantalla por paso: la configuración recibida; la cuenta (crearla si hace falta, con el enlace de
registro) y el nombre de usuario; la invitación que aceptar; el token, paso a paso (clásico para el repositorio de un
usuario, de grano fino para el de una organización); el token pegado y probado; los identificadores de red; por último
«Terminar y sincronizar», y luego los datos sin conexión. Las casillas marcadas quedan en el dispositivo: una tarjeta de
los ajustes propone retomar donde lo dejó. El tutorial «Unirse a la aerolínea» sigue los mismos pasos.

**Unirse a un proyecto GitLab (piloto).** Cuando la configuración recibida es un proyecto GitLab, no crea nada: ni cuenta, ni invitación, ni token. El asistente tiene solo tres pantallas: la configuración leída (aerolínea, proyecto), luego « Pegar el token » — pegue el token que el administrador le envió aparte (nunca en el enlace); su trigrama se lee de la configuración, no lo escribe — y « Terminar y sincronizar ». Sus identificadores VID, CID y SimBrief se rellenan más tarde en Ajustes › Identidad. Antes de aceptar el token, la aplicación pregunta a GitLab de qué token se trata. Un token personal (vale para todos sus proyectos) da una pregunta: prefiera el token de proyecto pedido al administrador; si responde « No », no se guarda nada. Un token sin fecha de caducidad (o a más de un año), o con más derechos de los necesarios, se señala con una línea de aviso, sin bloquearle. La tarjeta « Acceso a los datos » dice lo mismo de un token personal, sin pregunta: solo con su propio repositorio, un token personal es el adecuado.

**Nada más que el archivo.** Solo se configura lo que contiene la configuración, y el acceso solo se guarda una vez
probado el token; «Probar» dice qué falla: invitación aún no aceptada, token mal copiado o caducado, token sin derecho
sobre el contenido. Un token clásico abre todos los repositorios de la cuenta: para el repositorio de un usuario, se
aconseja una cuenta de GitHub dedicada al vuelo. Un archivo de otro formato se rechaza con un mensaje. La aerolínea solo
se escribe en el repositorio si aún no tiene una. En un puesto cuyo data/ ya sigue este repositorio, el asistente se
salta la cuenta y el token. Sin lanzador, la aplicación llega a un repositorio de GitHub o a un proyecto en una
instancia GitLab (gitlab.com): pegue la dirección del proyecto (https://gitlab.com/grupo/proyecto) y el token
de acceso de proyecto que le dio el administrador; el token solo se envía a esa instancia. Cuando la configuración recibida o el acceso del dispositivo es un proyecto GitLab, la tarjeta «Acceso a los datos» espera la dirección del proyecto y describe el token de proyecto (rol Developer, `write_repository`).

## Administración

**Las páginas de administración.** En el nivel «Completo» (tarjeta «Nivel»), la tarjeta «Administración», bajo «Acerca
de», reúne las páginas de administración y de prueba, **un botón por página**, cada una con una frase; en los demás niveles no aparece, y nada del administrador está en las demás tarjetas. En la
aplicación: el botón «Ajuste de los umbrales del mapa» (`#maps?tune=1`, solo lectura en un teléfono; abre la página de ajuste: para cada elemento del mapa y cada modo, los zooms en que aparece, guardados para la aerolínea, `airline/map_profiles.json`; un modo que nunca guardó toma los umbrales de un modo ajustado, la página lo dice; el control «Complejidad» del mapa solo desplaza el zoom), vuelta con la flecha de retroceso; el botón «Límite de la zona del vuelo», que despliega una casilla
«Mostrar la línea del límite de la zona del vuelo» (guardada al instante para la aerolínea, con los umbrales, en `airline/map_profiles.json`,
clave `edge`; la línea se muestra mientras no ajuste nada); el botón «Umbrales de pista en el mapa», que despliega una lista de 8 a 16: el zoom a partir del cual el mapa dibuja los umbrales de pista (guardado al instante para la aerolínea, mismo archivo, clave `runwayZoom`; 11 mientras no ajuste nada); el botón «Añadir un piloto» (véase más abajo); en un puesto servido por el
lanzador, los botones «Repositorio remoto de data/» y «Claves API de la aerolínea (IVAO, EAD Basic)», que despliegan su ajuste (véase
«Un repositorio git para data/» y «Las claves API de la aerolínea»);
la hoja de ruta (`#roadmap`, que se abre en «Prioridades»: columnas Entregado, En prueba, una por hito abierto, Backlog, donde se arrastran las fichas (al principio de la columna donde se sueltan; «Al principio», «Subir», «Bajar» en la ficha); «Por tema» las muestra por ámbito); la recepción (`#recette`): una prueba funcional por ficha entregada, con «Válido», «Rechazado» y un comentario (obligatorio en un rechazo), escritos por el lanzador en `organisation/RECETTE.json`; un defecto ya conocido dice «en curso, no volver a probar»; una segunda pestaña «Por decidir (n)» plantea los puntos por decidir como test con campo libre (respuestas escritas por el lanzador en `organisation/DECISIONS_REPONSES.json`); y el diagnóstico de la tarjeta «Acerca de».

**El asistente del administrador.** El botón « Asistente del administrador » (tarjeta « Administración », o la dirección `#settings?card=assistant`) lleva al administrador de la mano: seis pasos, en orden, cada uno con su estado leído de la instalación (hecho, por hacer, opcional, desconocido), una frase y un botón hacia la tarjeta que ajusta el paso. El primer paso por hacer tiene el botón de color. El repositorio de datos (un repositorio remoto para data/ y, con GitLab, su token de administrador en este puesto), la aerolínea (su nombre, en el módulo Sitio; su trigrama está en Ajustes › Identidad), la base aeronáutica (al menos una zona publicada), el primer piloto (« Añadir un piloto »), luego, opcionales, los dispositivos y las claves (IVAO, EAD). El estado de la instalación, tal como lo da el marco, está al final. El asistente no escribe nada: cada botón abre la tarjeta que ya existe.

**Añadir un piloto (administrador).** En el nivel « Completo », el botón « Añadir un piloto » de la tarjeta « Administración » (donde la exportación es posible) lo prepara todo para un piloto que aún no tiene nada. Escriba su trigrama, su nombre si quiere saludarlo, el idioma del mensaje y la dirección de la aplicación publicada, y pulse « Preparar »: obtiene el archivo, el enlace y el código QR (tres formas de la misma configuración), sus pasos y un mensaje listo para copiar, en el idioma elegido. Para un repositorio GitLab, sus pasos son: crear el token de proyecto del piloto (uno por piloto, nombre = su trigrama, rol Developer, ámbito `api`, fecha de caducidad 90 días aconsejados y 365 como máximo, nunca sin fecha), copiarlo enseguida (GitLab lo muestra solo una vez), comprobar que la rama de datos deja enviar a los Developers, y saber revocar (Settings › Access tokens › Revoke). Con el lanzador, « Crear su token » abre la pantalla « Tokens de los pilotos » con el trigrama ya escrito: el lanzador crea el token con el del administrador; los pasos a mano quedan plegados debajo. Sin lanzador, están abiertos. **Envíe el token aparte del mensaje** (otro canal, o péguelo delante del piloto): nunca va en el enlace ni en el mensaje. Para un repositorio GitHub, los pasos son los de la exportación.

<a id="settings-sources"></a>**Fuentes de datos.** El botón «Fuentes de datos» (`#sources`, nivel Completo) enumera las fuentes de datos aeronáuticos que la suite utiliza, considera o ha descartado: para cada una, lo que da, su licencia, su estado y un enlace que se abre en una pestaña nueva; para las que cambian con cada ciclo AIRAC (SIA, VAC, eAIP, CIFP), el enlace es el del ciclo vigente, escrito arriba de la pantalla. La pantalla no descarga nada. Bajo el botón de la tarjeta Administración, la dirección absoluta de la pantalla, para abrirla o guardarla en favoritos («Copiar el enlace»). Sustituye al laboratorio de datos, retirado el 28 de octubre de 2026.

**Los bancos, en un puesto.** Servidos por el lanzador, solo se abren en un puesto con lanzador (en otros sitios se
nombran sin enlace); rutas relativas a la raíz de la suite: `frame/aerodb/bench.html` y `frame/aerodb/offline_bench.html` (base aeronáutica, en línea y sin conexión),
`frame/store/test/` (capa de datos, contra el GitHub falso) y `modules/maps/test/render.html` (renderizado del mapa).

**Las páginas V2.** Ya no hay ningún botón en esta tarjeta: todas las páginas de la versión antigua (Ajustes › Mantenimiento, Primer inicio, estudio cartográfico…) están en la pantalla «Páginas antiguas (V2)» (`#legacy`), la última entrada de la columna de navegación de cada aplicación.

## Conviene saber

- **Cuenta IVAO**: la tarjeta «Cuenta IVAO» vincula este dispositivo a su cuenta IVAO por el relé de la aerolínea (o
  el lanzador del puesto): «Iniciar sesión en IVAO» abre la página de IVAO y luego vuelve aquí. El relé guarda el secreto
  de la aplicación de la aerolínea; su token se queda en este dispositivo, renovado solo, nunca en una copia de
  seguridad. «Desvincular» lo borra y pide a IVAO que retire el acceso; si IVAO no puede, la suite le dice
  que lo retire en su cuenta IVAO. Sin aplicación IVAO configurada, el botón está apagado y la tarjeta dice dónde falta: en este
  puesto, Administración › «Aplicación IVAO» la configura (da la dirección de retorno que se declara en IVAO); en el relé,
  la configura el administrador.
- **Dispositivos**: una sola pantalla, Mantenimiento › «Dispositivos», para todos los dispositivos de los pilotos, vengan
  de la red local o del relé de la aerolínea (cuando el lanzador funciona como relé, detrás del proxy inverso del NAS, en
  https). Un piloto vincula cada dispositivo una vez con un código de 8 cifras que el administrador pide allí para su
  trigrama (una vez, 10 minutos, en uno u otro canal); sus escrituras llevan ese trigrama. Cada línea dice el canal del
  dispositivo; la de un dispositivo vinculado con el código de la consola dice «código de consola», y «Nombrar» le pone un
  trigrama. Un dispositivo perdido, o todos los de un piloto que se va, se revocan allí.
- **Actualizar la suite** (Administración, con el lanzador): elegir un canal — estable, preversiones o seguimiento del
  desarrollo —, «Comprobar» dice lo que cambiaría sin tocar nada, luego «Actualizar» (tras una pregunta). Nunca un paso atrás;
  rechazado si se modificaron archivos de la suite en este equipo, y mientras haya un trabajo del módulo Datos o una
  sincronización en curso (inténtelo de nuevo cuando termine). Los datos no se tocan. La versión que se toma es la que anuncia
  el repositorio de la suite: sus etiquetas no están firmadas, la confianza es la misma que la de una actualización hecha a
  mano con git. Es la que «Comprobar» mostró: si el canal cambió entretanto, no se escribe nada y el panel pide comprobar
  de nuevo.
  Después, cierre la ventana del lanzador y vuelva a ejecutar lancer.cmd.
- **Carpetas de este equipo** (Administración, con el lanzador): dónde están la suite, los datos, las descargas, las bases
  y fichas de Little Navmap en este equipo, la ruta en solo lectura y de dónde viene; «Abrir» muestra la carpeta en el
  explorador de archivos. Una ruta se cambia donde se indica, nunca aquí; X-Plane es desconocido para el lanzador.
- **Tokens de los pilotos (GitLab)**: en la aplicación Maintenance, en el equipo del lanzador, «Tokens de los pilotos»
  crea un token de acceso de proyecto por piloto (con su trigrama, rol Developer, un año como máximo) y lo revoca. Tras
  «Crear el token», la pantalla solo muestra ese token, arriba: cópielo enseguida (no se volverá a mostrar), con lo que
  hay que decir al piloto y el enlace a su mensaje («Añadir un piloto»); la lista «Tokens existentes» queda plegada
  debajo, el nuevo figura en ella como «creado ahora mismo». El lanzador usa allí el token del administrador, que nunca muestra: un token de acceso personal de
  su cuenta de GitLab (Preferences › Access tokens), alcance api, con caducidad (un año como máximo), siendo esta cuenta
  Maintainer u Owner del proyecto. Péguelo en «Token del administrador», bajo la lista; «Probar el token del
  administrador» indica la cuenta, su rol, sus alcances y su caducidad; el título del bloque dice si hay un token puesto (su fecha, la
  instancia, el proyecto, la hora de la última prueba), nunca su valor. Un rechazo de GitLab se indica por su causa:
  token rechazado (ausente, caducado o sin api), cuenta que no es Maintainer, proyecto no encontrado. La rama de
  datos debe estar protegida, abierta al rol Developer y sin envío forzado (en gitlab.com la rama por defecto está
  reservada a los Maintainers): la
  pantalla lo comprueba, y «Abrir la rama a los Developers» lo hace tras una pregunta, planteada también antes del primer
  token. Un piloto cuyo token se rechaza al escribir lee «la rama main del proyecto no está abierta a los Developers».
- **El token**: en github.com, un token de grano fino, solo sobre el repositorio de datos, «Contents» lectura y
  escritura, 90 días como máximo; en GitLab, un token de acceso de proyecto (uno por piloto, con su trigrama), creado por
  el administrador. Nunca se vuelve a mostrar; no lo pegue en ningún mensaje.
- **Sus ajustes se quedan al cerrar el navegador**: la identidad, el token y la clave meteorológica se guardan en el mismo
  sitio del dispositivo, nunca sincronizados ni en una copia. Si Safari se los hizo perder igualmente (borra el almacenamiento
  de un sitio poco visitado), añada la aplicación a la pantalla de inicio: allí está mejor guardada. El diagnóstico
  («Copiar») dice si el navegador prometió no borrar (`storage.persisted`).
- **Cortar el acceso**: borra el token de este dispositivo; sus escrituras pendientes se quedan y saldrán cuando el
  acceso vuelva a configurarse. Teléfono perdido o robado: borre también el token en el alojamiento (github.com, gitlab.com…).
- **Ajustes de la V2**: si este navegador ya se usó para la V2, la tarjeta «Ajustes de la V2 encontrados» propone una
  vez retomar su identidad y su acceso.
- **Acerca de**: enlaces a esta ayuda y a la hoja de ruta (lo entregado, en curso, previsto), luego el
  diagnóstico, plegado: transporte, última sincronización, errores, árbol del repositorio, bases de referencia y base
  aeronáutica, línea por línea; «Copiar» lo pone todo en el portapapeles, para pegarlo en su mensaje y señalar un
  problema. El token
  nunca figura en él.

<!-- fr: c75cd2a9eb9f -->

**La compañía.** En el nivel Completo (o con #settings?card=company), la tarjeta «Compañía» lista las compañías de data/airline/index.json y «Personal»: el nombre, el código, las redes (IVAO, VATSIM, sin conexión) y el número de aeronaves de la flota. La tarjeta se llama «Compañía de este dispositivo»: una lista de botones de opción, una línea por compañía (el nombre, el código, el tipo dicho con palabras —«Comercial», «Escuadrón SO» o «Personal»—, las redes y la flota). Tocar una línea la convierte en la compañía actual de este dispositivo (la elección es por dispositivo): solo cambian los botones de opción, la lista no se redibuja. Mientras el marco no sepa aún guardar esta elección, los botones están en gris y la tarjeta lo dice. Debajo, la ficha de la compañía elegida (las demás no tienen), desplegada: el **tipo** (dos botones de opción, una frase cada uno) y las **familias de misiones** (una casilla por familia: la sigla y el nombre), marcados según el tipo mientras no se marque nada; marcar o desmarcar escribe themes.json, al menos una familia queda marcada. **Añadir una familia** (una sigla de 2 a 8 letras o cifras, un nombre de 1 a 40 caracteres; ocho como máximo; se propone una **letra** libre para numerar los informes de la familia, rechazada con sus motivos si ya la tiene una familia de la tabla, M, D, X u otra familia añadida; una familia añadida antes de las letras recibe una letra libre propuesta, escrita solo cuando se fija) y **Añadir una serie** (una familia de la lista, un nombre; veinte por familia): el nombre escrito en el idioma de la pantalla se copia en los cuatro idiomas; la familia o la serie se quita con «Quitar». Siguen tres gestos, en este orden: «Crear una compañía» abre un **asistente en la misma pantalla**: el paso **Identidad** (el nombre; el código, propuesto según el nombre y editable, 2 a 8 letras minúsculas o cifras, nunca uno ya en uso; el **tipo**, Comercial o Escuadrón SO, Comercial preelegido; las redes) luego el paso **Familias de vuelos** (las del tipo, marcadas de antemano: desmarque lo que no vuela; si no toca nada no se escribe nada para las familias) luego el paso **Flota** («Flota · 2 aeronaves»: busque un tipo en la base de fichas, escriba la matrícula, «Añadir la aeronave»; «Quitar»; «Más tarde» si prefiere añadir las aeronaves desde Aeronaves) y después el **Resumen** en palabras («Rennes Motoculture · Comercial · IVAO · 1 familia · 2 aeronaves»). «Atrás» conserva todo lo escrito. **No se escribe nada antes de «Crear la compañía»**: entonces los ajustes, la flota (vacía) y, al final, la inscripción en la lista (una compañía solo aparece completa); un archivo existente nunca se sobrescribe. Si la creación se interrumpe, el mensaje dice qué está hecho y «Reanudar» termina sin sobrescribir nada. Al final, «Volar para esta compañía» la elige y abre Misiones. Si el código escrito ya tiene su carpeta pero la compañía falta en la lista, el asistente lo dice y ofrece **«Recuperar esta compañía»**: vuelve a la lista, no se escribe nada más. Veinte compañías como máximo; todo lo que se lee de data/airline/ se trata como texto no fiable. «Unirse a una compañía» abre otro asistente: pegue la página «Flota» del sitio de la compañía (o «Leer el portapapeles») y luego «Leer la página»; la pantalla muestra **lo que se ha leído** («4 aeronaves · 3 operadores»), el nombre y el código propuestos, el tipo («Escuadrón SO» por defecto), las redes y la dirección del sitio (opcional, https) **antes de escribir nada**; «Unirse» escribe entonces los ajustes, la flota leída y, al final, la inscripción en la lista. El paso «lo leído» dice también **cuántas misiones del registro ya tienen este código** («Registro: 2 misiones ya con este código») y sigue el código que escribe. Una compañía que ya está en la lista no se vuelve a unir: su flota se actualiza pegando en la pantalla del sitio de la compañía. En el equipo del lanzador, mientras su compañía siga en la raíz de data/airline/, la tarjeta ofrece **migrarla**: un código opcional (propuesto según el nombre), «Ver lo que se haría» (el nombre, la carpeta data/airline/<code>/, los archivos y su tamaño, la flota que estará vacía allí) y después «Migrar a «<code>»». No se borra ni se sobrescribe nada: los archivos actuales quedan como copia. En la ficha: sin tipo todas las familias vienen marcadas y la ficha invita a elegir el tipo; una compañía comercial tiene la familia Comercial (carga, pasajeros, vuelo en vacío, VIP, entrenamiento, tránsito, vuelos de prueba), un escuadrón las dieciséis familias militares. «Personal» (todas las familias) no tiene nada que ajustar.
