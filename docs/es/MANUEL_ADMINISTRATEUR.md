# Manual del administrador

Este manual describe la suite SO Group Virtual (Virtual Special Operation Group) para el **Centro** (planificación y conducción de las operaciones) y para los
**administradores** de la suite: un capítulo por página, una sección por pestaña, apartado o bloque, y después la
sincronización de los datos y el lanzador. En la suite, la entrada **«Ayuda»** de la barra lateral abre este manual
en el capítulo de la página actual (páginas del Centro y de los ajustes). Las páginas de los pilotos se describen en el
[manual del usuario](MANUEL_UTILISATEUR.md); la explotación en detalle (datos, copias de seguridad, resolución de problemas, publicación),
en el [manual de explotación](../MANUEL_EXPLOITATION.md). Índice de toda la documentación:
[índice documental](../README.md).

## Acceso al Centro

El Centro de planificación y conducción de operaciones (CPCO) reúne el generador de misiones, el estudio cartográfico, el registro de misiones y la planificación ODV. Está reservado a los administradores de la suite.
Se aplican dos protecciones independientes: el **bloqueo del Centro**, propio de cada navegador, y los **derechos de los usuarios** (roles, modo develop o production), comunes a toda la compañía.
Los ajustes se encuentran en ☰ › Ajustes, pestaña «Centro».

### Bloqueo del Centro

El bloqueo oculta el Centro mientras no se haya activado en este navegador.

- Centro bloqueado: la barra lateral, el menú ☰ y la página de inicio siguen el nivel de uso, no el bloqueo; una página del Centro abierta sin él muestra el aviso «Acceso restringido», salvo el Tablero (entrada «Planificación»), consultable en solo lectura.
- Una página del Centro abierta directamente (favorito, enlace) queda cubierta por un aviso «Acceso reservado» con los enlaces «Activar el Centro…» e «Inicio».
- En Ajustes › Centro solo queda visible el apartado «Acceso al Centro y ajustes»; los demás («Usuarios y derechos», «Categorías de disponibilidad», «Planificación ODV», «Envío de informes (servicio web)») quedan ocultos.
- La activación se guarda solo en este navegador: hay que repetirla en cada puesto y después de borrar los datos del sitio.

Límite: es un bloqueo de uso, no una medida de seguridad. La contraseña está escrita en claro en `data/config/centre.json`, compartida con los datos (`DEFA` por defecto), y se muestra junto al botón «Activar el Centro»: es el **modo autónomo**. El modo grupo (registro firmado, acceso por el rol de administrador) se ajusta en el apartado «Modo grupo (registro firmado)» más abajo ([diseño](../technique/COMPTES_SIGNES.md)).

### Activar o bloquear el Centro

1. Abra ☰ › Ajustes, pestaña «Centro», apartado «Acceso al Centro y ajustes».
2. Introduzca la contraseña mostrada junto al botón («Contraseña: DEFA» por defecto) en «Contraseña del Centro» (no distingue mayúsculas y minúsculas).
3. Haga clic en «Activar el Centro» o pulse Intro. La línea de estado indica «Centro activado en este navegador».

Las entradas del Centro aparecen de inmediato, sin recargar la página. El apartado muestra entonces «Modo y acceso» (modo del Centro; «Contraseña del Centro (compartida con los datos)» y «Guardar la contraseña»: escrita en `data/config/centre.json`, sale en la próxima «Sincronizar»), y luego los ajustes «Cálculo de las rutas de tránsito»:

| Campo | Función |
|---|---|
| «Tramo enrutado a partir de (NM)» | Longitud mínima de un tránsito para que se enrute |
| «Aerovías a partir de (ft)» | Nivel a partir del cual una aeronave sigue las aerovías |
| «Baja altura hasta (ft)» | Techo del enrutamiento por la RTBA |
| «Entrada / salida de aerovías (NM)», «Entrada / salida de la RTBA (NM)» | Distancia máxima para entrar en la red o salir de ella |
| «Desvío admitido, aerovías (%)», «Desvío admitido, RTBA (%)» | Por encima de este valor, el tramo sigue siendo directo |

Botones: «Guardar», «Valores por defecto» y «Bloquear el Centro». Estos ajustes se guardan en este navegador; son los mismos que los del bloque «Duración estimada» del generador.

### Roles «admin_centre» y «utilisateur»

Cada usuario tiene una ficha compartida (`data/utilisateurs/<TRI>.json`, sincronizada): trigrama, nombre mostrado, rol, estado activo y contraseña (guardada como huella, nunca en claro).

| Rol | Etiqueta mostrada | Derechos |
|---|---|---|
| `admin_centre` | Administrador del Centro | Acceso al Centro en modo production, gestión de los usuarios, suplantación, cambio de modo |
| `utilisateur` | Usuario | Páginas de piloto («Mis misiones», disponibilidades) |

Gestión en Ajustes › Centro › «Usuarios y derechos»:
- la tabla lista las fichas; «Nombre mostrado», «Rol» y «Activo» se modifican en la línea y se guardan de inmediato;
- «Restablecer…» abre «Restablecer la contraseña de TRI»: introduzca una contraseña provisional (8 caracteres como mínimo), que el usuario deberá cambiar en su próxima conexión;
- «Añadir un usuario»: trigrama, nombre mostrado, rol y después «Añadir».

Consejo: si la carpeta de usuarios está vacía, el apartado crea una ficha por cada piloto de la referencia.

### Modo develop y modo production

El modo se aplica a toda la compañía (`data/config/suite.json`). Se ajusta en «Usuarios y derechos», recuadro «Modo de la compañía», lista «Modo».

| Modo | Efecto |
|---|---|
| develop (por defecto) | Seguridad probada, no impuesta: trigrama libre, conexión opcional. Una ficha sin contraseña se conecta sin contraseña. |
| production | Conexión obligatoria para «Mis misiones» y para el Centro; trigrama fijado por la conexión (no modificable en Mi perfil). |

En production, una página del Centro (o Ajustes › Centro) sin un administrador conectado muestra una ventana «Conexión» (trigrama, contraseña, «Conectarse»). Una cuenta sin el rol `admin_centre` se rechaza: «Cuenta sin derechos de administración del Centro».

Para pasar a production hace falta al menos un administrador del Centro activo con contraseña. Una vez en production, solo un `admin_centre` conectado puede volver a develop.

Límite: los controles se hacen en el navegador; no protegen realmente mientras la verificación no pase por un servidor. El bloqueo del Centro sigue siendo independiente del modo: también hay que activarlo en cada puesto.

### Suplantar a un usuario

Un administrador puede actuar en lugar de otro usuario, por ejemplo para corregir sus disponibilidades o sus misiones.

1. En «Usuarios y derechos», haga clic en «Suplantar» en la línea del usuario.
2. Una notificación confirma «Actúa como TRI».
3. En todas las páginas aparece una banda: «Suplantación: usuario TOTO (por ADM, escrituras firmadas «ADM pour TOTO»)».
4. Para terminar, haga clic en «Terminar la suplantación» en la banda (o en «Suplantar» en su propia línea).

Durante la suplantación, el trigrama de trabajo es el del usuario suplantado y cada escritura se firma «ADM pour TOTO». En modo production, la suplantación exige un `admin_centre` conectado; en develop, basta con haber ajustado el propio trigrama. No se puede cambiar la contraseña durante una suplantación.

## Ajustes › Centro
<!-- page: apps/settings/centre.html -->

Esta página reúne los ajustes habituales del Centro: acceso, usuarios, categorías de disponibilidad, planificación ODV y envío de los informes. Está dirigida a los administradores del Centro.
Para abrirla: barra lateral › «Ajustes» y después la pestaña «Centro». Los apartados aparecen en el menú lateral, grupo «Centro (CPCO)».
Mientras el Centro esté bloqueado, solo es visible el apartado de acceso. En modo production, la página pide además una conexión `admin_centre`.

### Acceso al Centro y ajustes

Este apartado activa el Centro en este navegador: generador de misiones, estudio cartográfico, registro y planificación ODV.
1. Introduzca la «Contraseña del Centro», mostrada junto al botón (`DEFA` por defecto; sin distinguir mayúsculas).
2. Haga clic en «Activar el Centro» o pulse Intro. El mensaje «Centro activado en este navegador» confirma la activación.

Una vez activado el Centro, el apartado muestra «Modo y acceso» (modo, cambio de la contraseña compartida), y luego «Cálculo de las rutas de tránsito»:

| Campo | Función |
|---|---|
| Tramo enrutado a partir de (NM) | distancia a partir de la cual se enruta un tramo |
| Aerovías a partir de (ft) | altitud a partir de la cual se utilizan las aerovías |
| Baja altura hasta (ft) | techo del vuelo a baja altura |
| Entrada / salida de aerovías (NM), Entrada / salida de la RTBA (NM) | distancia máxima para entrar en las aerovías o en la RTBA |
| Desvío admitido, aerovías (%), Desvío admitido, RTBA (%) | desvío tolerado |

Un campo vacío toma el valor por defecto, mostrado en gris. Botones: «Guardar», «Valores por defecto», «Bloquear el Centro». Estos ajustes se quedan en este navegador.

### Usuarios y derechos

Este apartado gestiona las fichas de los usuarios. Hay una ficha por usuario (`data/utilisateurs/<TRI>.json`), sincronizada con el conjunto de datos.
- **Modo de la compañía**: `develop` (seguridad probada pero no impuesta: trigrama libre, conexión opcional) o `production` (conexión obligatoria para Mis misiones y el Centro, trigrama fijado por la conexión). Este ajuste se aplica a toda la compañía (`data/config/suite.json`).
- Límite: los controles se hacen en el navegador. Solo protegen de verdad una vez que la verificación la asegura un servidor (servicio web).
- **Tabla**: «Trigrama», «Nombre mostrado», «Rol» («Administrador del Centro» o «Usuario»), «Activo», «Contraseña» (definida, provisional o ninguna). Todo cambio en una línea se escribe de inmediato.
- **«Restablecer…»**: introduzca una contraseña provisional (8 caracteres como mínimo) y después «Restablecer la contraseña». El usuario deberá cambiarla en su próxima conexión.
- **«Suplantar»**: usted actúa en nombre del usuario. Una banda lo recuerda en todas las páginas, cada escritura se firma «ADM pour TOTO» y el botón «Terminar la suplantación» le pone fin.
- **«Añadir un usuario»**: trigrama, nombre mostrado, rol y después «Añadir».
- Si la carpeta está vacía, se crea una ficha para cada piloto de la referencia.
- Si todavía no se han podido escribir algunos archivos en la carpeta de datos, haga clic en «Escribir en la carpeta de datos».
- En modo production, el restablecimiento de una contraseña, la suplantación y el cambio de modo están reservados a un
  `admin_centre` conectado; añadir un usuario y modificar una línea (rol, activo) solo están protegidos
  por el bloqueo del Centro (véase la [deuda técnica](../technique/DETTE_TECHNIQUE.md)).

### Modo grupo (registro firmado)

Para una aerolínea que comparte `data/` por git: roles, cuentas y contraseñas vienen del **registro firmado de
usuarios** (`data/utilisateurs/_registre.json`). Cada navegador rechaza lo que no está firmado por un admin: una ficha
modificada en el repositorio («me doy el rol de admin») ya no tiene efecto. Diseño:
[cuentas firmadas](../technique/COMPTES_SIGNES.md).
- **Estado**: modo (autónomo, grupo en constitución, grupo activo), versión aceptada del registro, fundador
  confirmado, admins y huellas de sus equipos, clave de emergencia, huella de este equipo.
- **«Pasar a modo grupo»** (Centro activado, lanzador actualizado: se exige su política de seguridad): usted pasa a
  ser el primer admin con la clave de este equipo; las fichas existentes entran en la versión 1 del registro.
  Introduzca dos veces la contraseña de la **clave de emergencia**: se descarga el archivo
  `sog-cle-secours-<huella>.json`, cifrado con esa contraseña. Guárdelo fuera de línea (memoria USB) y la contraseña
  aparte. Envíe su huella a los pilotos por otro canal (Discord, SMS, correo).
- **Grupo en constitución**: mientras no haya dos admins con clave de equipo, el Centro sigue accesible con su
  contraseña. Una vez activo el grupo, el acceso al Centro pasa por la clave de equipo de un admin del registro.
- **Cambiar un rol, un estado o una contraseña** (Usuarios y derechos) publica una nueva versión, firmada con la clave
  de este equipo: reservado a un admin del registro; si no, el mensaje lo dice y no se escribe nada.
- **«Nueva clave de emergencia»** (admin) sustituye la clave de emergencia; **«Volver al modo autónomo»** (admin): el
  registro queda en los datos pero ya no se lee.
- **«Usar la clave de emergencia»** (apartado abierto incluso con el Centro bloqueado): archivo, contraseña y
  trigrama; ese trigrama pasa a ser admin con la clave de este equipo. Para admins que han perdido su equipo.
- **«Refundar el grupo»** (último recurso, todas las claves perdidas): nuevo registro, nueva clave de emergencia; cada
  otro equipo tendrá que confirmar su huella.
- **Versiones rechazadas**: una versión mal firmada, fuera de la cadena o más antigua se rechaza; el equipo conserva
  la suya, una notificación y este apartado lo dicen.
- En la primera lectura del registro, un equipo muestra la huella del fundador con «Confirmar» y «Rechazar»:
  compárela con la recibida antes de confirmar.
- **Solicitudes de acceso de los equipos**: un piloto solicita el acceso desde Mi perfil › Este equipo, en un equipo
  con lanzador como en la app sin lanzador (teléfono); la solicitud es un fichero firmado con la clave de su equipo
  (`data/utilisateurs/demandes/`). El apartado lista trigrama, nombre del equipo, fecha y la huella recalculada por su
  página («usuario nuevo» si el trigrama aún no está en el registro; «solicitud no válida» si la firma o la huella no
  cuadran). Compare la huella con la que el piloto le dio por otro canal y luego **«Aprobar»** (nueva versión del
  registro con su clave, usuario creado si hace falta con el rol de usuario) o **«Rechazar»** (solicitud retirada). Una
  solicitud puede venir de cualquiera con acceso al repositorio: solo la huella prueba el equipo.
- **Claves de los equipos**: cada clave del registro, por usuario; **«Revocar»** (admin) publica una versión sin ella:
  sus firmas posteriores se rechazan y el equipo tendrá que solicitarlo de nuevo. Desactivar un usuario (Usuarios y
  derechos) revoca todas sus claves. El último admin con clave no puede perderla, ni un grupo activo bajar de dos
  admins con clave.
- **«Activar el grupo»**: la tarjeta solo aparece cuando dos admins tienen clave de equipo (un segundo admin: rol
  «Administrador del Centro» en Usuarios y derechos, y luego su solicitud aprobada). Hasta entonces nada cambia y no se
  ignora nada. Una vez activo el grupo: el Centro solo se abre con la clave de un admin (la contraseña ya no cuenta); los
  datos no firmados se aceptan 30 días, con la mención «no firmado», y luego se ignoran (asignaciones firmadas: lote
  siguiente).
- App sin lanzador (modo GitHub): un equipo nuevo sigue la cadena del registro por el historial del repositorio (API de
  commits); solicitudes, aprobaciones y revocaciones son commits allí. Pasar a modo grupo o refundar requiere un equipo
  con lanzador.

### Categorías de disponibilidad

Este apartado define lo que los pilotos pueden declarar como disponibilidades (`data/config/disponibilites.json`, sincronizado).

| Columna | Uso |
|---|---|
| id | identificador, fijo una vez guardada la categoría; se introduce para una categoría nueva |
| Grupo | grupo mostrado en la ODV (Disponible, Ejercicio SOG, Ocupado, No disponible…) |
| Etiqueta, Color | etiqueta **solo en francés**, color de la casilla |
| Temas abiertos | «todos los temas», «ninguno», «dominio …», «… según preferencias, entre …» o «lista de temas» (campo libre, temas separados por espacios) |
| Tipo | disponible, control, ocupado, no disponible |
| Códigos ODV | códigos del libro leídos como esta categoría al importar, separados por espacios; el primero aparece en la cuadrícula |
| Retirada | casilla de verificación: la categoría se oculta de las listas pero se conserva para el historial |

- Una categoría ya utilizada no se elimina: se **retira**. Solo una categoría nueva, todavía no guardada, se puede eliminar con «✕».
- «Añadir una categoría» y después «Guardar». El guardado se rechaza si un identificador está vacío o duplicado, o si falta una etiqueta en francés.
- Más abajo: «Grupos (ODV)» (etiqueta, color) y «Temas por dominio» (familias de misión separadas por espacios).
- Traducciones: si modifica una etiqueta en francés, pierde sus traducciones al inglés, al alemán y al español hasta la próxima auditoría de las traducciones (`tools/audit_i18n.html`).
- «Valores por defecto» restablece las categorías de origen. Las categorías añadidas se conservan, pero retiradas.
Véase también [disponibilidades y reorganización](../technique/DISPOS_ET_REORGANISATION.md).

### Planificación ODV

Este apartado contiene los ajustes propios de la compagnie para la página Planificación ODV. Se guardan en este navegador y no se sincronizan. Una página ODV abierta en otra pestaña los aplica de inmediato.

| Ajuste | Por defecto |
|---|---|
| Franjas (horas z): Mañana, Tarde, Noche | 8 a 12, 12 a 18, 18 a 23 (por medias horas; el fin debe ser posterior al inicio) |
| País preferido (perímetro ATC) | «Francia metropolitana»; sesiones ATC (entrenamientos, exámenes, reservas) importadas y mostradas solo para este país, planificación ODV y el Tablero (indicadores OACI del país: LF salvo LFV para Francia) |
| Fechas de la semana | «Semana ISO (n.º de semana del archivo)»; si no, «Fecha introducida en la cronología» |
| Casilla vacía | «Sin rellenar» (nunca cuenta como disponible); si no, «No disponible» |
| Tipos FLOTTE tenidos en cuenta para las funciones | «Todos salvo los rojos (NQ: poseídos, no calificados)»; «Solo verdes»; «Todos» |
| Misiones mostradas por franja | 3 (de 1 a 10) |
| Orden de preferencia en caso de empate | AAR, AIRBORNE, ISR, SPECIAL, SAR, MARITIME, FIRE, AIRLIFT, HEMS, TRAINING (familias desconocidas ignoradas, con un aviso) |
| Código restringido (SC, C, T, N): solo funciones de su ámbito | marcado |
| Ignorar una línea de grupo coloreada los 7 días en una franja (decoración) | marcado |

Cada cambio se guarda de inmediato. «Ajustes por defecto» restablece todos los valores anteriores.

### Tablero

Esta sección ajusta la página Tablero (`data/config/odv.json`, sincronizado).

| Ajuste | Uso |
|---|---|
| Aeródromo (OACI) | día y noche aeronáuticos en la cronología |
| Red por defecto de los vuelos | IVAO o VATSIM, para el estado de las activaciones de zonas |
| Plazo sin informe antes de MNE (horas) | 48 por defecto |
| Días mostrados, horas de servicio | 7 días, de 06:00 a 23:00 z; sirven a la cronología y a las estadísticas |
| Plantillas de vuelos, de varios, de control | etiqueta, duración, color, relleno; «Color del indicativo»: la ficha toma el color de su indicativo |
| Colores de los indicativos | prefijo (gana el más largo contenido en el indicativo), relleno, contorno |
| Configuraciones de aeronave | texto (KNON, TALIOS…), color; propuestas en la tabla de aeronaves de un vuelo |
| Franjas LL / RTBA (respaldo) | nombre, inicio, fin, días, color, zona de la base |
| Personal | grupo Staff o Miembros, color, orden en la paleta |
| Recurrencias | elementos repetidos; «✕» detiene una recurrencia |

«Guardar» escribe los ajustes; «Valores por defecto» restablece los ajustes de origen, salvo el personal, los colores de los indicativos, las franjas LL y las recurrencias.

### Envío de informes (servicio web)

Este apartado configura el botón «Enviar informe» de las páginas de introducción. Envía un POST JSON (misión, informe en HTML y en texto, cálculos) a la dirección indicada.
- Campos: «Dirección del servicio web (https://…)», «Cabecera de la clave» (`Authorization` por defecto), «Prefijo (Bearer, vacío para la clave sola)», «Clave».
- La dirección debe ser `https://`, salvo `http://localhost` o `127.0.0.1` para pruebas.
- La clave se queda en este navegador (`missionSendKey:v1`) y no entra en las copias de seguridad. «Olvidar la clave» la borra.
- El servicio debe aceptar las llamadas que vienen de la dirección de la suite (CORS).
- La línea de estado indica el número de informes enviados desde este navegador.
Detalles: [Manual de explotación](../MANUEL_EXPLOITATION.md), § 10.

## Ajustes › Instalación
<!-- page: apps/settings/installation.html -->

Esta página reúne los ajustes que se hacen una sola vez: carpetas locales, fuentes externas, aerolínea virtual, datos aeronáuticos y tipos de aeronave.
Para abrirla: barra lateral › «Ajustes» y después la pestaña «Instalación». Esta pestaña aparece a partir del nivel de uso Planificación (2); una dirección directa a uno de sus apartados la abre en cualquier nivel.
El menú lateral tiene un solo grupo, «Carpetas y fuentes»: «Fuentes y carpetas» (abierto de entrada), «Claves y servicios externos», «Datos aeronáuticos» y «Tipos de aeronave».
El primer arranque tiene su propia pestaña, «Primer arranque», descrita en el [manual de usuario](MANUEL_UTILISATEUR.md#primer-arranque); «Limpiar y empezar de nuevo…» está al pie de esa página. Véase también [Instalación](../INSTALL.md), § 1.
Estos apartados se asignan a la página mediante `config/repository_tree` (clave `settings.sections`: `sources` y `keys` → installation; `sia` y `types` → installation,maintenance, es decir, en las dos páginas: la puesta en marcha aquí, la actualización en Mantenimiento, mismos bloques). Todos los demás apartados de mantenimiento se abren en la página Mantenimiento.

En modo GitHub (app sin lanzador: sitio web, app iOS; acceso a los datos configurado en Mi perfil › Acceso a los datos), Instalación muestra solo la tarjeta «Acceso a los datos»: repositorio de datos (enlace `https://github.com/<repositorio>`) y rama, estado del acceso (prueba del token), última lectura correcta, escrituras pendientes en la bandeja de salida del navegador (botón «Sincronizar» para enviarlas), la base de tipos de aeronave leída del repositorio, un enlace al sitio de la aerolínea virtual y un enlace a Mi perfil › Acceso a los datos. Las carpetas locales, las claves IVAO y la importación del SIA se ajustan en un equipo con lanzador: las tarjetas «Fuentes y carpetas», «Claves y servicios externos», «Datos aeronáuticos» y «Tipos de aeronave» y la pestaña «Primer arranque» no se ofrecen. El modo depende solo del ajuste del acceso, no del dispositivo: la tarjeta es la misma en un navegador de escritorio. En la página Mantenimiento, este modo solo ofrece lo que funciona sin lanzador ni carpetas: versiones, datos aeronáuticos (la base publicada en el repositorio de datos por un puesto con lanzador: zonas, ciclo, «Releer la base publicada»), cachés y almacenamiento del navegador, copia de seguridad del navegador (archivo descargado, sin carpeta de copia) y registro; las actualizaciones, las referencias y dependencias y los tipos de aeronave no se ofrecen. Las carpetas recordadas por este navegador de un uso anterior con lanzador se ignoran: los datos vienen del repositorio de GitHub. Si la página la sirve el lanzador (modo GitHub configurado en ese mismo navegador), Mantenimiento muestra todas sus tarjetas y sus botones, con en «Datos aeronáuticos» y «Tipos de aeronave» la frase «Modo GitHub activo en este navegador: los datos leídos vienen del repositorio, las publicaciones se hacen en este puesto (lanzador).»

### Fuentes y carpetas

Este apartado es el único lugar donde se ajustan las carpetas locales y las direcciones de las fuentes externas.
- **Primer arranque** (llegada desde el lanzador): un recuadro pide elegir la primera línea, «Carpeta del repositorio». Las demás carpetas se deducen de ella.
- **Carpetas locales**: cada línea tiene su botón de elección y un estado («no elegida», «autorizada», «a reautorizar»). Un control señala una carpeta que no parece la correcta (falta el archivo de referencia). El navegador recuerda la autorización, pero puede pedir que se confirme tras un reinicio.
- **Aviso de carpeta**: si la suite no puede comprobar que la carpeta de datos autorizada es la de la suite servida, un aviso lo indica una vez (la lectura y la escritura se hacen entonces en esa carpeta); si un guardado se queda en el navegador por no poder escribirse, el aviso indica la causa real.

| Carpeta | Contenido esperado |
|---|---|
| Carpeta del repositorio | raíz de la aplicación (contiene `lancer.cmd`, `config/repository_tree`) |
| Carpeta de datos | `data/` (contiene `data_tree.js`) |
| «Carpetas deducidas (3)», plegadas: registro, misiones, SIA | `data/cr`, `data/missions`, `data/sia`, ajustadas con la carpeta de datos |
| Carpeta del libro ODV | carpeta sincronizada (OneDrive…) donde la escuadrilla deja el `.xlsx` |
| X-Plane (segunda línea: «Registros de aterrizaje: otra carpeta…»), Carpeta de rendimiento, Carpeta de copia local | carpeta de instalación de X-Plane (datos de navegación `earth_*.dat`, Custom Data; registros CSV de aterrizaje, salvo otra carpeta elegida), perfiles `.lnmperf` / `.json` (releídos por Combustible, bloque «Perfiles de rendimiento», en cuanto cambia la carpeta), `defa_local_store.yaml`; opcionales, indicados «opcional, no elegida» (información) mientras no se elijan |

- **Fuentes externas**: la dirección por defecto aparece en gris. Un valor introducido solo vale para este navegador; «↺» vuelve al valor por defecto y «Abrir ↗» abre la dirección.
- **Claves de API (servicios externos)**: remite al apartado «Claves y servicios externos», único lugar de las claves de la suite.
- **Sitios que la suite puede contactar**: lista fija (mapas, redes, meteorología, SimBrief) y direcciones de la configuración, más los sitios autorizados en este equipo («Quitar»); un sitio se añade con «Autorizar este sitio…» en la notificación de bloqueo, confirmado en la ventana del lanzador (guardado en secrets/sites.json).
- **Carpetas de solo lectura**: la carpeta de la aplicación, las de X-Plane, el libro ODV y las carpetas añadidas a la copia están autorizadas en lectura («autorizada (lectura)»); la escritura solo se pide en el momento de una acción que la necesita (restauración, «Guardar en el repositorio» para AircraftDB). Los datos (`data/` y sus subcarpetas) están autorizados en escritura.
- **Apertura desde otro sitio o una extensión**: rechazada por defecto (una página de la suite abierta por un enlace de otro sitio, o por una extensión como Claude in Chrome, muestra «Suite page opened from another website: refused»). «Autorizar hasta cerrar el lanzador…» la permite tras confirmarlo en la ventana del lanzador; un botón rojo «⚠ Protección reducida — restablecer» queda entonces en la cabecera de cada página. Datos, scripts y ajustes del lanzador siguen cerrados a otros sitios.
- **Aerolínea virtual**: «Nombre», «Nombre completo», «Sigla», «Centro (sigla)», «Centro (nombre completo)» y las páginas del sitio («Página de inicio», «Registro de vuelos», «Flota», «Ficha de un avión»). Un campo vacío mantiene el valor por defecto. «Volver a SO Group Virtual» borra todos estos ajustes.
- **Primer arranque**: «Reabrir el primer inicio». Para empezar desde cero, «Limpiar y empezar de nuevo…» está al pie de la página del primer arranque (apartado «Empezar de nuevo»).

### Claves y servicios externos

Un solo lugar para las claves de la suite, comunes a todos sus usuarios: una tarjeta por servicio. En otros sitios
(primer arranque, informes, Tablero, planificación ODV), la suite solo muestra el estado de la clave y remite aquí.
- **IVAO**: clave de API de la suite (developers.ivao.aero). La guarda el lanzador (`secrets/ivao.json` en la raíz
  de la aplicación, excluido de git, fuera de los datos y de las copias); la página solo ve su estado: «guardada el …
  UTC (…abcd)», «ausente» o «variable de entorno IVAO_API_KEY» (prioritaria, no modificable aquí). «Guardar»
  sustituye la clave y la prueba; «Probar» hace una llamada de control («OK: clave aceptada por IVAO, N sesiones del
  tracker leídas en la última hora», o «clave rechazada»); «Retirar» la borra tras confirmación. «Sirve para»:
  Informe › Rellenar desde mi último vuelo, Tablero (activaciones y sesiones ATC IVAO), planificación ODV (sesiones
  ATC IVAO).
- **VATSIM**, **SimBrief**: sin clave (API públicas); la tarjeta indica qué los usa y remite a Mi perfil para el CID
  y el identificador SimBrief.
- **Sitio de la aerolínea**: sin clave ni contraseña (el lanzador lee las páginas públicas); dirección en Fuentes y
  carpetas, identificador en Mi perfil.
- **Servicio web de envío de informes**: su clave queda en este navegador, ajustada en Ajustes › Centro › Envío de
  informes (enlace); la tarjeta indica si está guardada.

Una clave ausente o rechazada por IVAO (401 / 403) se señala donde se usa («Clave IVAO rechazada por IVAO:
sustituirla en Ajustes › Instalación › Claves y servicios externos») con el enlace «Abrir las claves ↗».

## Ajustes › Mantenimiento
<!-- page: apps/settings/maintenance.html -->

Esta página sirve para el mantenimiento de la suite: actualizaciones, versiones, datos SIA, cachés, copias de seguridad y bases de referencia.
Para abrirla: barra lateral › «Ajustes» y después la pestaña «Mantenimiento». La página se abre en «Actualizaciones». Esta pestaña solo aparece en el nivel de uso Experto (4); una dirección directa a uno de sus apartados la abre en cualquier nivel.
El menú lateral tiene tres partes:
- el grupo «Mantenimiento»: Actualizaciones, Versiones, Referencias y dependencias, Datos aeronáuticos, Tipos de aeronave;
- el grupo «Almacenamiento y copia»: Cachés, Espacio en disco, Copia total, Registro;
- las bases de datos, agrupadas en «Archivos del repositorio», «Referencia y registro», «Misiones» y «Datos del navegador». Estos grupos solo aparecen en el nivel Experto.

### Actualizaciones de la suite

Este bloque define de dónde vienen las actualizaciones del código y cuándo las busca la suite.
- **Canal**: `master` (estable, versiones publicadas) o `develop` (early bird, últimas novedades antes de su publicación).
- **Modo**: «Manual» (botón «Comprobar ahora»); «Automático, regularmente», en cada apertura, cada día, cada semana, en cada ciclo AIRAC o cada mes; «Desactivada» (ningún control, ningún aviso).
- El control consulta framagit. Cuando hay una novedad, aparece un aviso «Actualización» en la cabecera de todas las páginas.
- **Aplicar la actualización**: una página web no puede reescribir el repositorio. Copie los comandos (botón «Copiar») y ejecútelos en un terminal, en la raíz: `python tools/update_suite.py channel <canal>` y después `python tools/update_suite.py update`. Para un diagnóstico: `python tools/update_suite.py doctor`.
- `update` se niega a ejecutarse si hay archivos versionados modificados, solo avanza en fast-forward y registra cada operación.
- **Repositorio git local**: elija la «Carpeta del repositorio» y después «Leer el estado git». La tabla muestra la rama, HEAD, origin, el seguimiento, master / develop, el último fetch y el canal recordado por git. Se señala cualquier diferencia con el canal elegido.
- Una instalación mediante archivo ZIP no tiene `.git`: se actualiza con un archivo nuevo.

### Versiones y sincronización

Esta tabla da la versión y la fecha de actualización de cada elemento, con un estado (✓, ⚠, ✗) y la fuente o la herramienta de actualización.
- Código: suite (`repository_tree`), versión de caché de los scripts, git, canal remoto.
- SIA / AIRAC: ciclo vigente y ciclo siguiente, base del estudio cartográfico, carpeta SIA XML, `mora.csv`, ejes AAR (ENR 5.7).
- Bases de referencia: tipos OACI, rendimientos APD, flota, referencia, indicativos.
- Datos de usuario: planes de vuelo SimBrief, perfiles del planificador, registro de informes, registro de misiones generadas, registros de aterrizaje, datos locales, última copia de seguridad total.
- «Actualizar» vuelve a leer el estado git y la carpeta SIA.
- Aparece un aviso si los datos locales no se han guardado desde hace más de 7 días, o si no ha habido una copia de seguridad total desde hace más de 30 días.

### Referencias y dependencias

Este bloque describe cada referencia de la suite:

| Columna | Contenido |
|---|---|
| Referencia, Archivo | la referencia y su archivo |
| Trazado | cómo se traza la versión |
| Actualización | procedimiento de actualización |
| Dependientes | datos que dependen de ella |
| Control | coherencia comprobada |

Referencias seguidas: XML SIA, base analizada del estudio, cuadrícula MORA, ejes AAR, rendimientos APD, flota, perfiles del planificador y prompt de las misiones.
Ejemplos de controles: ciclos mezclados en la base SIA, obstáculos MORA de otro ciclo, tipos de la flota ausentes de la base OACI, prompt que regenerar (`python tools/build_mission_prompt.py`).
El botón «Comprobar» vuelve a lanzar los controles.

### Datos aeronáuticos: zonas del mundo, fuentes y ciclos AIRAC

**Mapa de zonas**: una zona por país (Francia agrupa la metrópoli y ultramar, cobertura del SIA), más una zona oceánica, «Atlántico Norte (oceánico, NAT)», cuyas fuentes son X-Plane (puntos y rutas oceánicos, fuera de cualquier país) y los tracks NAT del día. Al pasar el ratón se muestran sus fuentes en el panel derecho. **Un clic añade el país a la selección, otro lo quita** (países elegidos en azul con contorno oscuro); la barra bajo el mapa los enumera (por activar, por desactivar, «Cancelar»). **«Activar»** aplica la selección y luego encadena sola, para todos los países elegidos aún incompletos, todo lo que la suite puede hacer: descargas de sus fuentes, últimos ZIP de Descargas (SIA, NATS…), una sola reconstrucción de la base y después la MORA de cada país que no la tenga — solo si la base se ha reconstruido (doble indicador: paso y detalle; una fuente fallida no detiene las demás; resumen en una notificación). El panel de un país conserva «Activar la zona» / «Desactivar la zona» y, para una zona activa, «Obtener y recalcular todo». Lo que queda por hacer a mano (pedido en el sitio del SIA, PDF que importar, carpeta de X-Plane, archivos que depositar…) figura bajo el mapa, «Acciones pendientes»: una línea por fuente, con su enlace y su botón; las descargas y la MORA, que hace «Activar», caben en una sola línea «automático».
- Colores: solo contorno = inactiva, sin datos; gris = inactiva, con datos; naranja = activa, datos incompletos; verde = activa, todos los datos de las fuentes marcadas; azul claro = zona bajo el ratón; azul con contorno azul oscuro = país elegido («Activar» para aplicar).
- Cada fuente se marca o desmarca para su zona; solo las fuentes marcadas de las zonas activas entran en la base. Una fuente «enlace» (PDF o sitio de consulta) no la lee la suite. **La puesta en marcha solo rehace lo que falta**: una fuente al día no se vuelve a descargar («Obtener y recalcular todo» la vuelve a comprobar, sin reescribir nada si el servidor no tiene nada nuevo), un archivo idéntico no se reescribe y la base solo se relee si ha cambiado un archivo, una zona o una fuente; relanzada sin nada nuevo, no descarga, no escribe y no recalcula nada. **«Purgar la zona…»** (zona con datos) borra, tras confirmación, sus archivos de la carpeta SIA (para Francia: los XML del SIA y los ejes ENR 5.7) y sus casillas de `mora.csv` (archivo anterior en `_archives/`), la desactiva y relee la base; la carpeta de X-Plane no se toca. Una nueva activación lo reinstala todo.
- Según la fuente, el panel ofrece:
  - una descarga directa por el lanzador (`tools/aero_fetch.py`): openAIP (cada país), ENAIRE (España), FAA (Estados Unidos: zonas y rutas militares, clases de espacio), AIP militar británico (ENR 5.2, PDF oficial leído por el lanzador: zonas de vuelo a baja altura, VATA, zona de evitación TVAA, ejes de reabastecimiento AARA añadidos a los de la DIRCAM), NAV CANADA (Designated Airspace Handbook, edición vigente leída por el lanzador: zonas peligrosas, restringidas y de aviso de Canadá, a descargar de nuevo cada 56 días), tracks NAT del día (zona Atlántico Norte: mensaje de Shanwick y Gander publicado por la FAA, a descargar de nuevo antes de cada vuelo transatlántico, ya que los tracks cambian dos veces al día; «antiguo» pasadas 12 horas; puntos con nombre situados según la fuente X-Plane de la zona);
  - un pedido o un registro, con el enlace y el modo de empleo: SIA Francia (pedido a 0 €, a repetir en cada ciclo), NATS (Reino Unido, archivo depositado en `data/sia/zones/gb/`);
  - un PDF, con el enlace y el modo de empleo: DIRCAM / MILAIP ENR 5.7 (ejes de reabastecimiento);
    DIRCAM: «Importar el PDF MILAIP…» lee el PDF de la sección ENR 5.7 (pdf.js, red en la primera importación), muestra el número de ejes y las anomalías encontradas, y luego «Escribir miam-enr-5-7-tracks.xml» guarda el archivo en la carpeta SIA (el anterior en `_archives/`) y actualiza la base («Detener» durante la lectura: no se guarda ni se escribe nada);
  - una carpeta del ordenador: X-Plane (radioayudas, puntos, aerovías, rejilla MORA, recortados a los contornos de las zonas activas que lo marcaron);
  - un cálculo: la MORA de la zona. Una zona muy extensa (más de 1500 casillas de un grado: Estados Unidos, Canadá…) toma por defecto la MORA de X-Plane; «Cálculo completo…» la calcula por bloques de 10°, tras una confirmación que indica el volumen (teselas abiertas de relieve de AWS aumentadas en 100 m, sin consulta a OpenStreetMap): cada bloque se escribe enseguida en `mora.csv`, «Detener» entre dos bloques, «Reanudar el cálculo completo…» más tarde.
- SIA Francia (zona Francia): «Recuperar el ZIP descargado» (el lanzador lo toma de Descargas), «ZIP de exportación…», «Extraer …» si ya está en la carpeta, «Archivar los ciclos antiguos» (`_archives/`); «Contenido de la carpeta SIA» lista los archivos del ciclo.
- El SIA conserva la prioridad: dentro de las FIR francesas solo cuentan sus espacios; en otros lugares, un espacio, aeródromo o radioayuda ya leído no se añade dos veces. Fuera de Francia, las zonas R, D, TRA, TSA, MOA, W, A y las rutas MTR que cruza una misión figuran en sus espacios por activar.
- Las direcciones de los sitios (SIA, DIRCAM, NATS, AIP militar británico, NAV CANADA) se ajustan en Ajustes › Instalación › Fuentes y carpetas › Fuentes externas; las carpetas SIA y X-Plane de allí son las mismas que aquí.

**Base aeronáutica: fuentes, ciclos y reconstrucción**: ciclo vigente, ciclo siguiente y ciclo de la base, y luego una tabla de todas las fuentes marcadas de las zonas activas (zona, fuente, archivos, ciclo o fecha, antigüedad, tamaño, estado). Un clic en una fila fija su zona y actualiza la fuente (descarga, ZIP del SIA, importación del PDF MILAIP, carpeta X-Plane, MORA de la zona). Al principio de la tabla: el número de controles sin problemas, luego los problemas (fuentes que faltan) y los avisos (antiguas); «Mostrar los problemas» conserva solo estos. La tabla está ordenada por estado (problemas primero) y se ordena por columna.
«Recalcular todo» reconstruye la base con todas las zonas activas (unos segundos; el navegador puede pedir autorizar la carpeta); «Vaciar la caché» la vacía. Es el mismo bloque que en el estudio cartográfico.
Estados de la tabla:
- SIA: ciclo leído en el nombre de los archivos, «antiguo» si precede al ciclo vigente;
- X-Plane: ciclo de «Custom Data»;
- archivos descargados: «antiguo» pasados 28 días (un ciclo AIRAC) desde la descarga o la última comprobación sin cambios.

**Base publicada en el repositorio de datos**: en cada reconstrucción, la base también se escribe zona por zona en la carpeta de datos, `data/sia/base/<zona>/<ciclo>.json` (una zona, JSON en claro: de unos cientos de KB a unos 5 MB para Francia), y las ciudades en `data/sia/base/cities.json`. Un archivo solo se reescribe si su contenido cambia; los ciclos más antiguos de la zona se retiran. El informe de la reconstrucción dice lo que se ha publicado; «Sincronizar» lo envía. La carpeta de datos debe estar autorizada (Instalación › Fuentes y carpetas); si no, el informe dice por qué la base no se ha publicado. Los teléfonos y el sitio (modo GitHub) leen estos archivos: no tienen carpeta SIA ni reconstrucción, pero sí la misma base que el puesto que la publicó. La misma publicación escribe también la base dividida por tipo, que lee la V3: `data/sia/base/<zona>/<ciclo>/` (un archivo por tipo: espacios, aeródromos, radioayudas, puntos, VRP, aerovías, obstáculos, MORA, ciudades de la zona…), las grandes ciudades del mundo (`data/sia/base/cities_major.json`, más de 100 000 habitantes) y el sumario de las zonas publicadas (`data/sia/base/index.json`); una página solo lee lo que pide (los aeródromos de Francia: unos 400 KB en lugar de 5,5 MB). Ambos formatos se escriben durante la transición. Estos archivos solo van al repositorio compartido con el botón «Sincronizar» (o el propio trabajo de construcción): la actualización al arrancar y los intercambios automáticos los guardan en el equipo y lo dicen, para que una zona escrita a medias por una reconstrucción nunca se vaya sola.

**MORA**: varias fuentes.
- La rejilla calculada (`data/sia/mora.csv`) tiene prioridad. «Recálculo simple» toma los obstáculos del nuevo ciclo (sin red); «Cálculo completo» rehace relieve y cumbres (red, un minuto aproximadamente) para los teatros y las misiones; «Calcular la MORA de la zona» (panel) lo hace sobre la extensión de una zona, conservando las demás celdas.
- Si cambian celdas: «Escribir mora.csv (antiguo archivado)», y luego hacer commit del repositorio de datos.
- En otros lugares, la rejilla MORA de X-Plane completa, si la fuente X-Plane está marcada.

Método de la rejilla calculada: para cada casilla de 1° × 1°, el punto más alto entre el relieve (teselas de altitud AWS Terrarium), las cimas de OpenStreetMap y los obstáculos del AIXM del SIA, más 1000 ft (2000 ft por encima de 5000 ft), redondeado a la centena superior; sin las cimas OSM, el relieve se aumenta en 100 m. Teatros cubiertos: metrópoli, Córcega y ultramar, más las extensiones de las misiones del registro situadas en otros lugares (solo relieve y cimas). En los mapas, el valor se escribe en el centro de la casilla en notación OACI (3⁵ = 3500 ft); al alejar el zoom, las casillas se agrupan de 2 × 2 y luego de 4 × 4 (valor más alto). El mapa ENR 6.1 del SIA no sirve de fuente (zonas irregulares).

**Coherencia**: «Comprobar» verifica espacios, aeronaves, flota, rendimientos y aeródromos de las misiones.
Los XML AIRAC (unos 80 MB por ciclo) quedan fuera del repositorio, como los archivos de las demás fuentes. Los valores MORA son calculados, no certificados.

**Puntos de notificación VFR de las cartas VAC.** El mapa puede mostrar, para cada aeródromo, sus puntos de notificación, las secuencias y las consignas de sus cartas VAC, extraídos de los PDF por `tools/report-vfr/refresh_vfr.py` (en este equipo, con el módulo Python opcional `pypdf`: `python -m pip install -r tools/report-vfr/requirements-vfr.txt`). En cada nuevo ciclo VAC: ajustar `sourceDirectory` en `tools/report-vfr/config.json` a la carpeta de las nuevas VAC y relanzar `python tools/report-vfr/refresh_vfr.py --config tools/report-vfr/config.json` (instrucciones en `tools/report-vfr/`), luego, en esta sección, «Importar una compilación VFR (VAC)…» (nivel Experto) y elegir el `vfr-compiled.json` producido. La página lo comprueba (nada se escribe al menor error, se muestra la lista de errores), coteja sus puntos con los VRP de la base, muestra el resumen (aeródromos, puntos, puntos no cotejados, secuencias, páginas de consignas, archivos cambiados) y pide conformidad; escribe entonces un archivo por aeródromo en `sia/vfr/` del repositorio de datos, y sincroniza. Estos datos siguen siendo candidatos: el mapa los marca «extraído de las VAC, a verificar» y nunca los presenta como itinerarios publicados.

### Cachés

Este bloque purga los datos que la suite sabe reconstruir. No se toca ningún dato de usuario (registros, borradores, perfiles, OFP, copias de seguridad).

| Caché | Tras «Purgar» |
|---|---|
| Índice de datos (IndexedDB `defaIndex`) | borrado y después reconstruido a partir de los archivos en la siguiente carga de las páginas |
| Aeródromos usados | se vuelven a leer en la base mundial en el siguiente uso |
| Base mundial de aeródromos (jsDelivr) | se solicita la purga de la CDN y después se recarga el archivo |
| Base SIA analizada | hay que volver a leerla desde la carpeta SIA (se pide confirmación) |
| Control de actualizaciones | se vuelve a leer en el siguiente control |
| Archivos de la aplicación (caché HTTP) | «Recargar sin caché»: archivos recargados y después página recargada |

Purgue el «Índice de datos» cuando una página muestre un dato caducado tras un cambio de archivos hecho fuera de la suite, sin el lanzador.
«Purgar todo y recargar» encadena todas las purgas, previa confirmación.

### Espacio en disco

Este bloque solo aparece si el Centro está activado.
- «Calcular el espacio usado» mide la carpeta de misiones (`data/missions`): por misión, por tipo de archivo y en total. Indica también el espacio usado por el navegador.
- «Datos aeronáuticos, por zona»: espacio de la carpeta SIA por zona (fuentes y número de archivos; mora.csv cuenta para todas las zonas). Una zona desactivada conserva sus archivos: borrarlos a mano para liberar espacio.
- «Eliminar los mapas sobrantes» quita los mapas que ya no figuran en la lista de su misión.
- «Purgar todos los mapas generados» y «Purgar los PDF» liberan espacio; estos archivos se regeneran a partir del YAML.
- Cada eliminación pide confirmación.
- Las versiones anteriores y los textos recibidos forman el historial: aquí nunca se purgan.
- La carpeta de misiones debe estar autorizada en Fuentes y carpetas.

### Copia de seguridad total

Este bloque produce un archivo ZIP con todos los datos locales, con un manifiesto (`manifest.json`, huellas SHA-256).
- **Contenido**:
  - el navegador, siempre incluido;
  - «Repositorio de datos (data/ …)»;
  - los registros de aterrizaje (carpeta X-Plane);
  - los perfiles de rendimiento;
  - las carpetas añadidas con «Añadir carpeta…» (un nombre y un filtro de archivos).
- Cada fuente se puede marcar o desmarcar. La opción «incluir los archivos pesados» añade los mapas PNG, ZIP y PDF, así como los XML AIRAC.
- «Crear copia total» escribe el archivo en `sauvegardes/` de la carpeta de copia local; si esa carpeta no está autorizada, el archivo se descarga.
- «Cambios desde» compara las carpetas con la última copia de seguridad total.
- **Recargar una copia de seguridad total**: «Elegir el archivo…». Cada archivo recibe un estado: idéntico, ausente del disco, más antiguo o más reciente en el disco. Marque los archivos deseados y después «Restaurar la selección».
- Antes de sustituirse, los archivos se copian en `_avant_restauration/` de su carpeta. Los datos del navegador se fusionan: prevalece el valor más reciente.
- Excluidos a propósito de la copia: clave del servicio web, seguimiento de red en curso, base SIA analizada, autorizaciones de carpetas, diario de vuelos (recargado desde el sitio web), credenciales del sitio de la compañía.

### Registro de copias y recargas

Esta tabla registra cada operación sobre los datos, con la fecha, la operación (y la página), el origen y el resultado. El detalle de las claves añadidas (+) o modificadas (~) se despliega.
Operaciones registradas:
- recarga de los datos locales (☰ › Datos locales › Restaurar);
- copia de seguridad total y restauración de una copia de seguridad total;
- extracción de la exportación SIA y archivado de los ciclos antiguos;
- recálculo MORA.
Mientras no haya tenido lugar ninguna de estas operaciones, el registro está vacío.

### Flota (aeronaves conocidas)

Esta base (`data/references/aircraft_fleet.js`) lista las aeronaves propuestas en los informes: «Operador», «Tipo OACI», «Variante», «Matrícula», «Código», «Número», «Indicativos» (separados por comas), «Aeródromo base», «Operativo». «Tipo OACI» propone la base de tipos (lista desplegable con búsqueda, por código o nombre del modelo); la entrada libre sigue siendo posible.
- **«Pegar la página Flota del sitio…»**:
  1. abra la página «Flota virtual» del sitio de la compañía (enlace en la ventana);
  2. pulse Ctrl+A y después Ctrl+C, y pegue en la zona (Ctrl+V); también puede usar «Leer el portapapeles» u «o página guardada…»;
  3. haga clic en «Leer».
- Una aeronave de la página sustituye a la del archivo (misma matrícula) pero conserva sus indicativos adicionales. Las aeronaves ausentes de la página se conservan.
- La línea de estado da el número de aeronaves actualizadas, añadidas y conservadas. Compruebe y después «Guardar en el repositorio».
- **Botones comunes a las bases del repositorio**: «Guardar en el repositorio» destacado (escribe el archivo en la Carpeta del repositorio, para hacer commit); en «Más…», «Aplicar en este navegador» (cambios locales prioritarios), «Descargar», «Descartar cambios», «Volver al archivo del repositorio». La línea de estado dice de dónde viene el contenido: «Estado: archivo del repositorio, sin cambios en este navegador», o los cambios locales y su fecha.
- **Automático**: el lanzador lee él mismo las páginas públicas Flota y Diario de vuelos del sitio (sin conexión), una vez al día al abrir una página, con las mismas reglas que el pegado; escribe `data/references/aircraft_fleet.js` y `defa_reference.js`, que se envían con «Sincronizar». Ajuste y «Actualizar ahora»: bajo la lista de aeronaves del reporting (abajo). El pegado y el script (`python AircraftDB/update_fleet.py Flotte.html`) siguen siendo posibles.
- **Dónde**: Ajustes › Centro › «Flota (aeronaves conocidas)», reservada mientras el Centro está bloqueado (antes en Mantenimiento).
- **Mapa de la flota**: página aparte, para todos (Informe › Flota, ver el manual de usuario); el botón «Mapa de la flota», encima de la tabla, lleva a ella. Muestra cada aeronave en su aeródromo actual, con filtros, paso del ratón (último vuelo) y selección; con el Centro activado, su botón «Modificar la flota» devuelve aquí.
- **Aeronaves del reporting**: bajo la flota, todas las aeronaves que vuelan en el diario de misiones (tipo, indicativos, operador, vuelos, último vuelo). Casilla «personal», marcada por defecto: aeronave individual, fuera de la flota del SOG; desmarcarla la añade a la flota (pasa a ser asignable), volver a marcarla la retira. Luego «Guardar en el repositorio»: la flota y el índice de aeronaves individuales (`data/references/aircraft_personal.js`) se escriben juntos. Una aeronave de la página Flota del sitio vuelve a la flota en la siguiente actualización.
- **Tipos y rendimientos**: «Actualizar tipos y rendimientos» completa los tipos desconocidos de la base (flota y reporting); la actualización diaria desde el sitio también lo hace, en segundo plano, para la flota, el diario y las aeronaves individuales.
- **Aeródromo (base) de una aeronave**: solo cambia con la actualización desde el sitio o con un informe emitido desde una orden de misión con un aeródromo de aterrizaje real; un informe fuera de orden de misión o un landing report no desplaza la aeronave. Una aeronave añadida desde el reporting entra sin aeródromo. El aeródromo actual es la columna «Ubicación» de la página Flota del sitio (guardada con la fecha de su último cambio), salvo si un informe más reciente emitido desde una orden de misión da un aeródromo de aterrizaje real (`missions/aircraft_positions.json`); los traslados parten de ahí (asignación, planificación ODV, Tablero, ficha de aeronave).

### Tipos de aeronave (base OACI)

Esta base (`AircraftDB/aircraft_db.js`) contiene dos tablas:
- «Tipos»: «Designador», «Modelo», «Descripción OACI», «WTC», «Ala», «Fuente»;
- «Alias (nombre común → designador)».
Los cambios también se trasladan a `aircraft_overrides.json`. Los botones son los de las bases del repositorio.
El «Procedimiento» da los comandos del script de actualización, que se ejecuta desde `AircraftDB`: `python update_aircraft_db.py --no-network`, `--add <types>`, `--refresh-icao`. La base no se publica con la suite (datos de la OACI y de EUROCONTROL): la rúbrica «Tipos de aeronave» de Ajustes › Mantenimiento la completa en este equipo, tipo por tipo, nunca toda a la vez. Se lee en tres tiempos: «Qué es» (la ficha OACI, que da el icono y la clase 2P, 2T, 4T…, y los rendimientos EUROCONTROL); la tabla de los tipos de la flota, de las misiones y de los informes (silueta, código y modelo, clase OACI, ficha ✓ o ausente, rendimientos clave — techo, crucero, V2, Vat — con el detalle en texto emergente y el enlace EUROCONTROL, uso); y después «Completar automáticamente (n)», que descarga lo que falta. Un código libre se introduce en «Descargar otros tipos…» (plegado); «Editar la base a mano…» (nivel Experto) abre esta base. Un solo grupo por aeronave: las etiquetas de misiones e informes («A332 A330 MRTT Phénix», «A330 MRTT PHÉNIX») se reducen al código OACI (flota, alias, nombres de uso; cadena de alias seguida, por ejemplo A4M → A400, un código propio reducido al designador OACI); un tipo escrito en claro en un informe se reconoce en lugar de crear un tipo local. Un tipo sin rendimientos EUROCONTROL se estima: «≈ 2 000 kg/h, 480 kt (tipo conocido)» o «(clase OACI L2J)», el mismo recurso que el planificador de combustible (`shared/fuel_reference.js`). Hacen falta el lanzador y la red; al final de la pasada, la página se recarga sola y muestra el balance. Los archivos escritos (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) no requieren nada: las páginas los leen; no versionados, se completan en cada equipo o se copian de uno a otro. La misma pasada lee también la lista pública de SimBrief (una petición, guardada una semana; `--simbrief` en línea de comandos): consumo de crucero (kg/h), masas (vacío, sin combustible, aterrizaje, combustible máximo), techo y velocidad de 224 tipos, guardados en `aircraft_perf.js` junto a las fichas de EUROCONTROL; un valor cuya precisión SimBrief no garantiza es una estimación. Por último, Airframe DB (`--airframedb`, 40 fichas como máximo por pasada, caché de 30 días) añade alias (nombres de uso, como H125 → AS50, y nombres de simuladores → código OACI, sin sustituir nunca un alias existente ni desviar un designador oficial) y las características publicadas (velocidades, techo, variómetro, masas, alcance) de los tipos sin ficha EUROCONTROL ni SimBrief, militares y helicópteros incluidos. Como último recurso, un designador que ni la OACI ni EUROCONTROL conocen (tipo retirado, como la Caravelle S210) se busca en Aviation Fanatic: una página por tipo, nombre, descripción OACI (L2J…) y categoría de estela, guardados en este equipo (fuente «Aviation Fanatic»).

Para los teléfonos y el sitio (modo GitHub), que no tienen lanzador, «Publicar la base de aeronaves en el repositorio de datos» (nivel Experto, bajo la tabla) copia `aircraft_db.js` y `aircraft_perf.js` en `AircraftDB/` del repositorio de datos, con su copia en JSON (`aircraft_db.json`, `aircraft_perf.json`, leída por la V3, que nunca ejecuta un script del repositorio), y retira todo lo demás de esa carpeta (cachés, scripts, `__pycache__`), y luego sincroniza. Antes de hacer nada, la página muestra la lista de lo que se copiará (+) y retirará (−) y pide conformidad. Ambos archivos deben ser valores simples (control de `tools/data_guard.py`, como los demás archivos de datos). La base nunca se publica en el sitio público.
Límite: un tipo eliminado aquí puede volver en la siguiente actualización si forma parte de la lista de base del script.

### Correspondencia de indicativos

Esta base (`data/references/callsigns.js`) relaciona el indicativo completo (conservado en los informes) con su forma de plan de vuelo (casilla 7) y con el operador OACI (OPR/, casilla 18).
- Tabla «Indicativos»: «Indicativo completo», «Plan de vuelo», «Otras formas», «Organización», «OPR/», «Tipos», «Función», «Genérico», «Radiotelefonía», «Nota».
- Tabla «Organizaciones → designador OACI (OPR/)».
- No existe ningún script: esta página (o el archivo, editado a mano) es la fuente.
- Para alimentarla: las formas corregidas en los informes llegan a «Indicativos aprendidos», y las series vistas en el diario llegan mediante «Añadir» o «Completar».

### Flota y pilotos de la compañía (referencia anonimizada)

Esta base (`data/references/defa_reference.js`) recoge los pilotos (trigramas) y las aeronaves de la compagnie, sin los vuelos ni las misiones. Sirve de ayuda a la introducción de datos y no es exhaustiva.
- Tabla «Aeronaves»: matrícula, tipo, variante, estado, adscripción (modificable), último AD conocido, puesta en servicio, indicativos utilizados, primer y último vuelo, vuelos, ficha de flota, nota.
- Tabla «Pilotos»: trigrama, primer y último vuelo, vuelos, tipos, nota.
- Actualización:
  1. cargue el registro de vuelos (apartado siguiente);
  2. haga clic en «Actualizar desde el registro de vuelos» (aquí) o «Actualizar la referencia (anonimizada)» (en el registro): no se elimina nada y se conservan las entradas manuales;
  3. «Guardar en el repositorio» y después haga commit.
- Alternativa por script: `tools/defa_reference.py`.

### Registro de vuelos (vuelos realizados)

Esta base es distinta del registro de misiones. Solo se guarda en este navegador: fuera del repositorio y fuera de la copia local, porque contiene trigramas.
- «Cargar / actualizar el registro…» acepta la página «Log des vols» copiada o guardada, o una exportación CSV / JSON. Los vuelos se fusionan sin duplicados.
- «Series de indicativos»: «Añadir a la correspondencia» crea la línea en la correspondencia de indicativos (notificación con «Abrir la correspondencia», filtrada en la línea); la serie pasa a «En la correspondencia ✓»; «Completar» le añade las formas y los tipos vistos desde entonces.
- «Vuelos»: filtro de texto completo, 300 líneas mostradas como máximo.
- Acciones:
  - «Actualizar la referencia (anonimizada)»;
  - «Exportar CSV»;
  - «Exportar JSON (recargable)»;
  - «Borrar la base de este navegador».

### Fusiones y renombrados (pilotos, aeronaves)

Esta tabla lista las equivalencias creadas con «Fusionar con… / renombrar» desde las fichas. Columnas: «Tipo» (piloto o aeronave), «Antiguo», «Pasa a ser», «Resultado».
Estas equivalencias se aplican al diario recargado, a la referencia y al catálogo.
«Eliminar» quita una equivalencia, previa confirmación.
Un bucle (A → B y B → A) aparece resaltado: intercambia los dos nombres. Elimine la entrada errónea y después vuelva a hacer la fusión desde la ficha.

### Registros de misiones (base de operaciones)

El registro único `data/cr/missions.yaml` reúne todas las familias. Es la fuente de verdad de los informes de seguimiento.
- Una línea por familia, con el número de misiones y los botones «Editar (YAML)», «YAML», «CSV», «Informes».
- «Editar el registro completo (YAML)» abre el editor; «Comprobar y guardar» verifica el YAML antes de escribir. En el registro completo, cada misión debe tener su familia.
- «Carpeta del registro…» elige la carpeta donde escribir. Sin esta carpeta, el guardado se queda en el navegador.
- «Descargar el registro (YAML)», «Exportar CSV (hoja de cálculo)».
- Para corregir una sola misión, es mejor pasar por su informe (clic en la línea del informe de seguimiento).

### Aeronaves de misiones registradas

Esta base la guarda el navegador (`missionAircraftRegistry:v1`). Las aeronaves se registran en ella cada vez que se guarda una misión; el dato más reciente prevalece sobre la flota.
Columnas: matrícula, tipo, variante, categoría, indicativo, código, operador, fecha.
Botones: «Guardar» (en el navegador) y «Descartar cambios».

### Tipos añadidos localmente

Esta base lista los tipos desconocidos introducidos en misiones: designador, modelo, categoría, fecha de alta.
«Integrar en la base del repositorio» copia estos tipos en «Tipos de aeronave (base OACI)» y abre esa base. Después solo queda aplicarla o guardarla en el repositorio.

### Indicativos aprendidos (formas de plan de vuelo corregidas)

Esta base lista las formas de plan de vuelo corregidas a mano en los informes: indicativo completo, plan de vuelo, fecha.
«Integrar en la base del repositorio» las añade a la «Correspondencia de indicativos» y abre esa base. Compruebe y después aplique o guarde.

### Aeródromos utilizados (caché)

Esta base conserva las coordenadas y los husos horarios de los aeródromos ya utilizados, para la salida y la puesta del sol y para la meteorología: OACI, nombre, país, latitud, longitud, altitud (ft), huso horario.
Se corrige a mano («Guardar»). También se purga en «Cachés»: entonces se reconstituye a partir de la base mundial.

## Sincronizar los datos

Los datos compartidos (disponibilidades, usuarios, configuración, misiones y asignaciones, informes, sesiones ATC) están en `data/`. Esta carpeta es un repositorio git distinto del del código. El botón «Sincronizar» de la cabecera la intercambia con los demás puestos.

### El botón «Sincronizar (n)»

- El botón solo aparece si la suite la sirve el lanzador y `data/` es un repositorio git.
- (n) suma los cambios de este puesto pendientes de enviar y los commits pendientes de recibir. El repositorio remoto se vuelve a leer con la frecuencia ajustada en Ajustes › Mantenimiento › Versiones y sincronización (cada 30 minutos por defecto; en cada página, 3 veces al día, una vez al día); entre dos comprobaciones, el botón muestra el último estado conocido, guardado por el navegador, y el lanzador responde con su última lectura. La información emergente da la rama y la fecha de la última sincronización.
- La sincronización se lanza a mano, con un clic:
  1. primero se escriben en la carpeta los archivos guardados en el navegador;
  2. el lanzador hace commit en nombre del trigrama conectado (incluido el usuario suplantado);
  3. recupera y fusiona los cambios de los demás puestos y después envía.
- Sin trigrama, la sincronización se rechaza: ajústelo en Ajustes › Mi perfil.
- Al terminar, una notificación da el número de archivos enviados y recibidos, y las páginas vuelven a leer los archivos modificados.
- **Desfase con la copia**: el botón pasa a naranja (cambio sin enviar desde hace más de 48 h, 20 archivos o más por enviar, 10 commits por recibir, commit sin enviar, archivo modificado fuera de los datos sincronizados) o a rojo (`data/` sin repositorio git o sin remoto, fusión en curso, umbrales altos: 100 archivos, 7 días, 50 commits); motivos en la información emergente, alerta en notificación una vez por sesión. Sin repositorio git (salvo datos de prueba), un botón «⚠ Copia» lo indica. Umbrales ajustables: `data/config/suite.json`, clave `sync`.

### Primera sincronización

El primer clic envía todo lo que nunca se ha incluido en un commit en `data/`. Si la rama remota no existe, la crea.
Mensaje «Solo commit local: no hay repositorio remoto»: `data/` no tiene repositorio remoto, así que no se comparte nada.
Los identificadores git son los del sistema (clave SSH, gestor de credenciales); la suite no guarda ninguno.

### Varios usuarios, a la espera del servidor central

- Cada puesto **recibe** en cada arranque (el lanzador actualiza `data/` desde el repositorio, sin enviar nada) y **envía** con el botón
  «Sincronizar» (commit, fusión con los demás, envío).
- Por cada puesto que envía hace falta: git, la suite abierta por el lanzador, un **derecho de escritura en el repositorio de datos**
  (una cuenta por persona en el alojamiento git, o una cuenta compartida) y una clave SSH o credenciales HTTPS
  guardadas en Git.
- La dirección del repositorio se indica y se comprueba en el Primer arranque (paso 1, tarjeta «Repositorio git de sincronización de
  datos»): nunca es bloqueante; un repositorio que no responde solo se señala.
- Un puesto sin git ni derecho de escritura puede escribir en una **carpeta compartida** (Synology, OneDrive…) que un puesto
  equipado sincroniza. El servidor central eliminará estos requisitos previos: bastará con una cuenta
  ([hoja de ruta](../technique/ROADMAP.md), etapa 2).

### Conflictos y carpeta `_conflits/`

El lanzador resuelve los conflictos ficha por ficha, sin perder nunca nada:
- **ficha modificada en dos puestos**: prevalece la más reciente. La otra versión se guarda en `<dossier>/_conflits/` y se señala mediante una notificación;
- **asignaciones**: se fusionan asignación por asignación;
- **registro de asignaciones**: se reúnen los dos lados;
- **archivo eliminado en un lado y modificado en el otro**: se conserva la versión modificada.
Tras una notificación de conflicto:
1. abra la copia indicada en `_conflits/`;
2. traslade a mano lo que falte al archivo conservado;
3. vuelva a sincronizar y después elimine la copia.
El registro de informes (`cr/missions.yaml`) se fusiona a mano.
Fusión pendiente en `data/` (pasada interrumpida, equipo apagado en plena fusión): la pasada siguiente, o la actualización al arrancar el lanzador, la concluye si ningún archivo está en conflicto; si no, la cancela y la rehace; el informe lo dice. Nada que hacer a mano. Mientras está pendiente, los commits del lanzador (lotes de la app, trabajos de regeneración, publicaciones) no se hacen y lo dicen. Mensaje «Hay un rebase en curso en data/»: termine o cancele el rebase (`git -C data rebase --abort`) y vuelva a empezar.
Detalles, esquemas y pruebas sin riesgo: [arquitectura de la sincronización](../technique/SYNCHRONISATION.md).

## Lanzador, datos y copias de seguridad

La suite la sirve un pequeño servidor local, incluido con ella. Los datos están en tres lugares: la carpeta `data/`, el navegador y el archivo de copia local.

### Iniciar la suite

- **Windows**: haga doble clic en `lancer.cmd`. **macOS / Linux**: `sh lancer.sh`. Ambos llaman a `tools/launch.py`, que sigue tres pasos:
  1. **Python**: se busca y, si es necesario, se instala (versión 3.8 como mínimo).
  2. **Datos**: si `data/` está presente, se actualiza sin `git pull`: los archivos del pool modificados en este equipo se confirman primero («Modifications du poste <TRI>»), luego la rama remota se fusiona registro por registro como con el botón «Sincronizar», sin enviar nada. Un archivo fuera del pool modificado localmente (por ejemplo `sia/mora.csv`) se deja tal cual; si la actualización lo sobrescribiera, se aplaza y la consola lo nombra. La consola dice lo que se hizo (archivos confirmados, recibidos, recepción aplazada y por qué); nunca bloquea. Si no, se extrae un archivo `.zip` dejado junto al lanzador; en su defecto, se clona el repositorio de datos.
  3. **Servidor y navegador**: el servidor arranca en `http://127.0.0.1`, en el primer puerto libre a partir de 8000, y después se abre el navegador. Si la suite ya está en marcha, solo se abre el navegador.
- Deje abierta la ventana del lanzador mientras use la suite; ciérrela (o pulse Ctrl+C) para detener la suite.
- Opciones: `--port 8010`, `--page apps/…`, `--no-browser`, `--no-data` y `--data <dossier>` para servir otra copia de los datos bajo `/data/`, sin clon ni actualización. La opción `--data` sirve para pruebas, por ejemplo de sincronización.
- Navegador recomendado: Chrome o Edge. Para Brave, véase [Instalación](../INSTALL.md).

### La carpeta `data/`

- La aplicación y los datos están separados. `data/` es un repositorio git aparte, privado, situado en la carpeta de la aplicación; el repositorio del código lo ignora.
- Sin acceso al repositorio de datos, la suite arranca con los ejemplos de `examples/`. También puede pedir un archivo de los datos por correo.
- Una carpeta sincronizada (Synology Drive, OneDrive…) sirve, siempre que se **excluyan las carpetas `.git`** de la sincronización.
- Los archivos de `data/` son la referencia: el índice del navegador se reconstruye a partir de ellos (Mantenimiento › Cachés › «Índice de datos»).

### Copias de seguridad

- **Datos del navegador**: pase por ☰ › Datos locales.
  - «Carpeta de copia…» se elige una sola vez, idealmente en una carpeta sincronizada.
  - El archivo `defa_local_store.yaml` se escribe después automáticamente.
  - «Restaurar / resincronizar» fusiona este archivo con el navegador: prevalece el dato más reciente.
- **Copia de seguridad total** (navegador y archivos de las carpetas autorizadas): Ajustes › Mantenimiento › Copia total (véase más arriba).
- No versione `defa_local_store.yaml`: contiene datos personales.
- Actualización del código: Mantenimiento › Actualizaciones, o `python tools/update_suite.py update`. Una actualización del código no toca los datos.
Para saber más: [Manual de explotación](../MANUEL_EXPLOITATION.md), § 2 y § 3; [Instalación](../INSTALL.md).
