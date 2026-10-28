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
remoto se configura en la tarjeta «Administración» (vea «Un repositorio git para data/»).

**Sin acceso ni lanzador, no hay bases.** Un dispositivo sin acceso configurado y sin lanzador — el sitio abierto en un
teléfono por primera vez, por ejemplo — no tiene ni la base aeronáutica (espacios, aeródromos, radioayudas) ni la base
de aeronaves: «Datos sin conexión» lo dice. Dos vías: configure el acceso al repositorio de datos, incluso sin marcar
intercambio (entonces solo sirve para leer las bases); o, en un puesto con lanzador, publique las bases en el
repositorio (V2: Ajustes › Mantenimiento › Datos aeronáuticos y Tipos de aeronave), luego sincronice. Tres estados distintos cuando falta la base: «Base aeronáutica cargándose…» (la lectura no ha terminado: espere), «Acceso a los datos no configurado en este dispositivo» (configure el acceso arriba; una aplicación añadida a la pantalla de inicio tiene su propio almacenamiento, nada de lo de Safari está allí) y «Base aeronáutica no publicada» (el acceso funciona, nada está publicado en el repositorio).

**La sincronización.** Con un intercambio marcado, la tarjeta «Sincronización» da la última correcta, las escrituras
pendientes y la red; «Sincronizar ahora» envía y recibe en el acto. Si no, se hace sola al inicio, cada 10 minutos en
línea y al volver la red. Mientras haya escrituras pendientes, la tarjeta las lista, las más recientes primero: ruta,
módulo y hora, ✕ para una eliminación, con el último error si lo hay.

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

En un puesto servido por el lanzador, en el nivel Completo, el botón «Claves API de la aerolínea (IVAO)» de la tarjeta
«Administración» despliega el ajuste de la clave de la API IVAO: se queda en la carpeta `secrets/` del lanzador, nunca en
el navegador ni en los datos. «Probar» comprueba que IVAO responde; «Borrar» la quita.

## La tableta junto al simulador

Vuela en el equipo (X-Plane) y quiere el mapa en una tableta o un teléfono: en el equipo servido por el lanzador,
«Acceso del equipo» abre la aplicación Piloto a los dispositivos de la misma red local (o inicie `lancer.cmd --lan`).

1. **Abrir a los dispositivos de la red local**: la tarjeta muestra la dirección que abrir en el dispositivo, su
   código QR y un código de vinculación de 6 cifras. Windows puede pedir que autorice Python: acéptelo solo para
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

En un puesto servido por el lanzador, en el nivel Completo, el botón «Repositorio remoto de data/» de la tarjeta
«Administración» muestra el repositorio remoto de `data/`: su dirección y su
rama. Para configurarlo o cambiarlo, escriba la dirección (`git@host:cuenta/repo.git` o `https://…`, sin contraseña ni
token dentro): «Comprobar» indica si el repositorio responde, «Guardar» lo configura. Hacia otra dirección distinta de la configurada, se abre una ventana Sí / No en el equipo, no en la página: la tarjeta lo dice antes del clic; respóndala (puede estar detrás de otras ventanas) y vuelva. Rechazada, cerrada o ya abierta: la tarjeta da el motivo y `data/` se queda tal cual. Es a propósito: una página trampa no debe poder enviar sus datos a otro lugar. Nada bloquea: un repositorio que no responde solo
se señala.

- **El acceso al repositorio** se configura en el equipo: una clave SSH para una dirección `git@…`, credenciales
  guardadas en Git para una dirección `https://…`.
- **Varios usuarios por git** necesitan este repositorio remoto: sin él, la casilla «Varios usuarios» no lleva a
  ninguna parte, y la tarjeta «Usos» lo recuerda.
- **data/ ausente o sin git**: la tarjeta «Acceso a los datos» abre una vía, en todos los niveles. `data/` es una carpeta ignorada por el repositorio del código;
  se convierte en su propio repositorio git, enlazado al repositorio de datos (no un submódulo). Escriba la dirección
  del repositorio de datos y, si hace falta, un usuario y una contraseña o token (nunca guardados por la página;
  «Recordar» los confía a Git en este equipo). Sin `data/`, «Recuperar los datos» lo clona; con un `data/` sin git
  (datos de ejemplo o archivo), «Retomar data/ en este repositorio» lo enlaza al repositorio. La tarjeta sigue el trabajo
  y vuelve a leer el estado al final; un fallo se explica, nada se pierde.

## Configurar un piloto

**Preparar la configuración (administrador).** En un puesto servido por el lanzador, o en un dispositivo configurado con
GitHub, en el nivel «Completo», toque «Exportar una configuración para un piloto» en la tarjeta «Administración»: recuerda sus pasos
en orden. Invite primero el nombre de GitHub del piloto al repositorio, con el rol Write (el enlace lleva a la página de
colaboradores del repositorio). Escriba luego su trigrama y la dirección de la aplicación publicada, y «Crear el archivo
y el enlace»: el archivo sog-config-<TRI>.json se guarda, el enlace y su código QR aparecen. Contienen la aerolínea, el
repositorio de datos, el trigrama y las instrucciones del token, nunca un token ni un secreto; el propietario del
repositorio (usuario u organización) queda anotado y decide qué token crear. Envíe el enlace o el archivo, o haga
escanear el código QR con el teléfono del piloto.

**Unirse a la aerolínea (piloto).** El enlace, el código QR, «Importar una configuración…» o «Unirse a la aerolínea…»
(tarjeta «Acceso a los datos») y la tarjeta de bienvenida de la primera apertura abren el asistente «Unirse a la
aerolínea», una pantalla por paso: la configuración recibida; la cuenta (crearla si hace falta, con el enlace de
registro) y el nombre de usuario; la invitación que aceptar; el token, paso a paso (clásico para el repositorio de un
usuario, de grano fino para el de una organización); el token pegado y probado; los identificadores de red; por último
«Terminar y sincronizar», y luego los datos sin conexión. Las casillas marcadas quedan en el dispositivo: una tarjeta de
los ajustes propone retomar donde lo dejó. El tutorial «Unirse a la aerolínea» sigue los mismos pasos.

**Nada más que el archivo.** Solo se configura lo que contiene la configuración, y el acceso solo se guarda una vez
probado el token; «Probar» dice qué falla: invitación aún no aceptada, token mal copiado o caducado, token sin derecho
sobre el contenido. Un token clásico abre todos los repositorios de la cuenta: para el repositorio de un usuario, se
aconseja una cuenta de GitHub dedicada al vuelo. Un archivo de otro formato se rechaza con un mensaje. La aerolínea solo
se escribe en el repositorio si aún no tiene una. En un puesto cuyo data/ ya sigue este repositorio, el asistente se
salta la cuenta y el token. Sin lanzador, la aplicación solo llega a un repositorio de GitHub: para un repositorio de
framagit o GitLab, configure el acceso en un puesto con el lanzador.

## Administración

**Las páginas de administración.** En el nivel «Completo» (tarjeta «Nivel»), la tarjeta «Administración», bajo «Acerca
de», reúne las páginas de administración y de prueba, **un botón por página**, cada una con una frase; en los demás niveles no aparece, y nada del administrador está en las demás tarjetas. En la
aplicación: el botón «Ajuste de los umbrales del mapa» (`#maps?tune=1`, solo lectura en un teléfono; abre la página de ajuste: para cada elemento del mapa y cada modo, los zooms en que aparece, guardados para la aerolínea, `airline/map_profiles.json`; un modo que nunca guardó toma los umbrales de un modo ajustado, la página lo dice; el control «Complejidad» del mapa solo desplaza el zoom), vuelta con la flecha de retroceso; el botón «Límite de la zona del vuelo», que despliega una casilla
«Mostrar la línea del límite de la zona del vuelo» (guardada al instante para la aerolínea, con los umbrales, en `airline/map_profiles.json`,
clave `edge`; la línea se muestra mientras no ajuste nada); el botón «Exportar una configuración para un piloto» (véase «Configurar un piloto»); en un puesto servido por el
lanzador, los botones «Repositorio remoto de data/» y «Claves API de la aerolínea (IVAO)», que despliegan su ajuste (véase
«Un repositorio git para data/» y «Las claves API de la aerolínea»);
la hoja de ruta (`#roadmap`) y el diagnóstico de la tarjeta «Acerca de».

<a id="settings-sources"></a>**Fuentes de datos.** El botón «Fuentes de datos» (`#sources`, nivel Completo) enumera las fuentes de datos aeronáuticos que la suite utiliza, considera o ha descartado: para cada una, lo que da, su licencia, su estado y un enlace que se abre en una pestaña nueva; para las que cambian con cada ciclo AIRAC (SIA, VAC, eAIP, CIFP), el enlace es el del ciclo vigente, escrito arriba de la pantalla. La pantalla no descarga nada. Bajo el botón de la tarjeta Administración, la dirección absoluta de la pantalla, para abrirla o guardarla en favoritos («Copiar el enlace»). Sustituye al laboratorio de datos, retirado el 28 de octubre de 2026.

**Los bancos, en un puesto.** Servidos por el lanzador, solo se abren en un puesto con lanzador (en otros sitios se
nombran sin enlace); rutas relativas a la raíz de la suite: `labs/design_primitives.html` (primitivas y diseños),
`frame/aerodb/bench.html` y `frame/aerodb/offline_bench.html` (base aeronáutica, en línea y sin conexión),
`frame/store/test/` (capa de datos, contra el GitHub falso) y `modules/maps/test/render.html` (renderizado del mapa).

**Las páginas V2 del puesto.** Solo se muestran cuando un lanzador sirve la página: Ajustes › Mantenimiento
(`apps/settings/maintenance.html`), Primer inicio (`apps/settings/premier_lancement.html`) y el estudio cartográfico
(`apps/cpco/map_parser.html`).

## Conviene saber

- **El token**: un token de grano fino de github.com, solo sobre el repositorio de datos, «Contents» lectura y
  escritura, 90 días como máximo. Nunca se vuelve a mostrar; no lo pegue en ningún mensaje.
- **Sus ajustes se quedan al cerrar el navegador**: la identidad, el token y la clave meteorológica se guardan en el mismo
  sitio del dispositivo, nunca sincronizados ni en una copia. Si Safari se los hizo perder igualmente (borra el almacenamiento
  de un sitio poco visitado), añada la aplicación a la pantalla de inicio: allí está mejor guardada. El diagnóstico
  («Copiar») dice si el navegador prometió no borrar (`storage.persisted`).
- **Cortar el acceso**: borra el token de este dispositivo; sus escrituras pendientes se quedan y saldrán cuando el
  acceso vuelva a configurarse. Teléfono perdido o robado: borre también el token en github.com.
- **Ajustes de la V2**: si este navegador ya se usó para la V2, la tarjeta «Ajustes de la V2 encontrados» propone una
  vez retomar su identidad y su acceso.
- **Acerca de**: enlaces a esta ayuda y a la hoja de ruta (lo entregado, en curso, previsto), luego el
  diagnóstico, plegado: transporte, última sincronización, errores, árbol del repositorio, bases de referencia y base
  aeronáutica, línea por línea; «Copiar» lo pone todo en el portapapeles, para pegarlo en su mensaje y señalar un
  problema. El token
  nunca figura en él.

<!-- fr: 47f9199a8ffd -->
