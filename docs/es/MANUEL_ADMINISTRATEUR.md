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

- Centro bloqueado: las páginas del Centro desaparecen del menú ☰, de la barra lateral (separador «Centro» y entradas «Misiones», «Registro», «ODV») y de la página de inicio.
- Una página del Centro abierta directamente (favorito, enlace) queda cubierta por un aviso «Acceso reservado» con los enlaces «Activar el Centro…» e «Inicio».
- En Ajustes › Centro solo queda visible el apartado «Acceso al Centro y ajustes»; los demás («Usuarios y derechos», «Categorías de disponibilidad», «Planificación ODV», «Envío de informes (servicio web)») quedan ocultos.
- La activación se guarda solo en este navegador: hay que repetirla en cada puesto y después de borrar los datos del sitio.

Límite: es un bloqueo de uso, no una medida de seguridad. Las páginas siguen siendo archivos legibles por quien tenga acceso a la carpeta.

### Activar o bloquear el Centro

1. Abra ☰ › Ajustes, pestaña «Centro», apartado «Acceso al Centro y ajustes».
2. Introduzca la contraseña en «Contraseña del Centro» (no distingue mayúsculas y minúsculas).
3. Haga clic en «Activar el Centro» o pulse Intro. La línea de estado indica «Centro activado en este navegador».

Las entradas del Centro aparecen de inmediato, sin recargar la página. El apartado muestra entonces los ajustes «Cálculo de las rutas de tránsito»:

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

## Generador de misiones
<!-- page: apps/cpco/mission_editor.html -->

El generador prepara el dosier de una misión: identificación, textos del briefing, ejercicio, duración estimada, zonas que activar y, por último, los PDF que se entregan a las tripulaciones. También sirve para encargar una misión a ChatGPT y recibir su respuesta.
Acceso: barra lateral «Misiones» (sección «Centro») o ☰ › «Generador de misiones (SIA)». Desde el registro, «Abrir en el generador» carga la misión elegida.
Véase también [misiones SIA](../SIA_MISSIONS.md) y [prompt del generador](../technique/PROMPT_GENERATEUR_MISSIONS.md).

### Pestañas «Generador de misiones» y «Estudio cartográfico»

Las dos páginas comparten una pestaña en la cabecera y trabajan sobre **la misma misión**.
- Pase de una pestaña a otra: la misión en curso le acompaña, con sus cambios.
- Todo cambio se guarda en este navegador y la otra página abierta lo vuelve a leer de inmediato (extensiones, mapas añadidos o eliminados en el estudio, por ejemplo). El generador muestra entonces «Misión actualizada por el estudio cartográfico».

La cabecera ofrece además:
- «Crear el informe →»: abre un nuevo informe de la familia que corresponde al tipo de misión, rellenado con la misión;
- cuando una operación tiene varias misiones: ◀ y ▶ («Misión anterior», «Misión siguiente») y una lista para cambiar de misión dentro del lote;
- tras abrir desde el registro: «← Registro (M-016)» para volver a él.

### Misión

Este bloque muestra la misión cargada y reúne el guardado y la importación.

| Botón | Efecto |
|---|---|
| «Nueva misión» | Vacía el formulario (fecha del día) |
| «Encargar a ChatGPT…» | Despliega el formulario de encargo (véase más abajo) |
| «Guardar en la carpeta» | Escribe el YAML modificado en `data/missions/<lettre>_<FAMILLE>/<ID>/`; la versión anterior se sustituye y el historial se conserva en el YAML |
| «Guardar borrador» / «Recargar borrador» | Guarda o vuelve a leer el texto de la misión en este navegador (las imágenes hay que volver a seleccionarlas) |

El panel «Importar otra misión: archivos, texto pegado, encargo a ChatGPT» está abierto cuando no hay ninguna misión cargada:
- «YAML y/o Markdown»: seleccione juntos `mission<ID>.yaml` y `summary<ID>.md`, o haga clic en «o pegar su contenido…» y después en «Leer la misión»;
- «Mapas o ZIP entregado por el generador»: elija directamente el ZIP del estudio; los PNG y el mapa de conjunto se asocian automáticamente;
- «Encargar una misión a ChatGPT»: el mismo formulario que el del registro (tipo, subtipo, teatro, serie, equipos, aeronaves…). «Encargar: copiar el prompt y abrir ChatGPT» copia el prompt, abre ChatGPT en una pestaña nueva e inscribe el encargo en el registro («encargada»).

Una misión recibida se inscribe en el registro y se guarda en su carpeta si la carpeta de misiones está autorizada; si no, haga clic en «Archivar en la carpeta de misiones…». Enlace «Abrir el registro ↗».

### Operación

Bloque que solo aparece cuando la misión pertenece a una operación (`operation` en el YAML).
- Cada misión de la operación es un botón: identificador, indicativo u «Organización», hora de despegue. Haga clic para mostrarla. «no cargada» o «por crear» señalan una misión que falta en el lote.
- «Crear la organización del ejercicio» crea la misión …Z (briefing general, hora H, participantes, blancos, cronología) y retoma las pistas y los injects de las misiones del formato antiguo.
- Misión aislada: una línea discreta propone «Añadir una organización de ejercicio…».
- «Crear las misiones de los blancos jugados (n)»: cada blanco jugado se convierte en una misión de la operación (base de la primera tripulación, ruta de la pista, despegue calculado). Compruebe después aeronave, base y horario, abra cada una en el estudio y, por último, «Guardar en la carpeta».

### Identificación

| Campo | Contenido |
|---|---|
| «Título» | Título de la misión |
| «Familia» | Familia de misión (lista de la orden de misión) |
| «Subtipo» | Propuestas según la familia; también admite texto libre |
| «Identificador» | Letra de la familia, guion, número de 3 cifras y después letra de equipo (A, B…) o Z para la organización: M-016, S-002A, I-001Z |
| «Serie de generación» | Lote de generación dentro de la familia (un encargo a ChatGPT = una serie) |
| «Autor», «Fecha del documento» | Firma del dosier |

El siguiente identificador libre y la serie siguiente aparecen en gris en los campos vacíos: son indicaciones, no valores. Aparece una alerta si el identificador no empieza por la letra de la familia.
Cambiar el identificador de una misión citada por otras (operación, mapas, textos) abre una confirmación: acepte para migrar todo el lote (el identificador antiguo se conserva en `mission.former_id`) o rechace para mantener el antiguo.

### Duración estimada

Estimación del vuelo a partir de la ruta probable y de la aeronave; se recalcula con cada cambio. Oculto en una misión de organización.
- «Tránsito»: «automático (según aeronave y nivel)», «aerovías (IFR)», «RTBA (baja altura)» o «directo». La elección se escribe en la misión.
- «Parámetros del cálculo de rutas (comunes a todas las misiones)»: los mismos campos que en Ajustes › Centro, con «Valores por defecto».
- Visualización: «Vuelo estimado», «Bloque», ida / sobre la zona / vuelta, distancia; opciones de regreso y briefings sucesivos si procede.
- Los **tiempos comprobados** (informes de misiones con la misma salida y los mismos puntos) sustituyen al cálculo cuando existen.
- Una tabla compara la estimación con los informes ya hechos de la misión (vuelo real, diferencia).
- Casilla «Mostrar la ruta probable»: croquis y tabla de los tramos.

Límite: sin base SIA en el navegador, las rutas siguen siendo directas; un aviso invita a releer la carpeta SIA.

### Zonas que activar

Lista de las zonas R, D, TRA y de la RTBA atravesadas por la ruta probable y las zonas de trabajo, con gestor, límites, modo de activación y punto de intersección. Las zonas P se señalan «a evitar».
- Misión de organización: zonas de todas las misiones de las tripulaciones (solicitudes hechas por la organización).
- Misión de un ejercicio coordinado: lista solo a título informativo.
- Misión aislada: solicitudes que debe hacer la tripulación; la lista se incluye en el briefing PDF.

Límite: cálculo indicativo, que no sustituye ni los mapas AZBA ni los NOTAM. Sin base SIA, el bloque indica dónde leerla (estudio, bloque «Base de datos SIA», o Ajustes › Mantenimiento › Datos aeronáuticos).

### Ejercicio

Bloque que aparece en una misión de ejercicio.

En la misión de organización (…Z), editor completo:
- «Hora H y participantes»: «Hora H (etiqueta u hora real)» y después una línea por participante («Indicativo», «Misión», «Despegue (H-20mn, H+1h)», «Función»); «+ Participante», «Tomar las misiones de la operación».
- «Blancos de ejercicio»: pistas que reconocer, interceptar o escoltar (nombre, «Jugado», indicativo, salida, naturaleza, puntos, nivel, velocidad, lo que las tripulaciones deben establecer, consignas); «+ Blanco», «Importar una tabla Markdown de pistas».
- «Cronología»: un evento por tarjeta («Disparador»: hora o paso por un punto; «Forma»: mensaje de radio o sobre sellado; «Emisor», «Título», «Destinatarios», «Pistas reveladas», texto); «+ Mensaje de radio», «+ Sobre sellado», «Quitar este evento».
- «Lo que recibe cada uno»: resumen por destinatario.

En una misión de tripulación, el bloque se titula «Ejercicio: lo que recibe esta tripulación» y es de solo lectura. La línea «Mapas de ejercicio» indica los mapas cargados o por generar en el estudio.

### Textos de la misión

«Summary» (resumen), «Descripción detallada» y después apartados libres: «Añadir una sección de texto», cada uno con «Título de la sección», «Contenido» y «Eliminar».
Si el archivo recibido no tiene ni resumen ni descripción, se proponen a partir de los datos: reléalos.
En una misión de organización, el bloque pasa a ser «Briefing general»: situación, objetivos comunes, franjas, criterios de fin, entregado a todos.

### Todos los datos YAML

Bloque oculto por defecto: haga clic en «Mostrar» en su cabecera.
- Editor sin esquema impuesto: cada clave del YAML se puede modificar y los campos desconocidos se conservan.
- Listas: «Añadir un elemento», × para quitar un elemento.
- «Nombre de un nuevo campo raíz» y después «Añadir» crea una clave de primer nivel.

Resérvelo a las correcciones que los demás bloques no permiten.

### Mapas del dosier final

Lista de los mapas adjuntos al PDF, en el orden del dosier: los declarados en el YAML, con el mapa de conjunto al principio y el perfil vertical al final.
Cada mapa muestra su estado: «listo para el PDF» (dimensiones en píxeles) o «imagen no cargada».
Para cargar las imágenes, use el ZIP del estudio en el bloque Misión. Una misión abierta desde el registro lee directamente los mapas guardados en su carpeta.

### Documentos

| Grupo | Botones |
|---|---|
| «Esta misión» (u «Organización del ejercicio») | «Briefing de la tripulación (PDF)» o «Dossier de la organización (PDF)», «Dossier de la organización (PDF)» desde una misión de tripulación, «Fichas de los blancos jugados (un PDF cada una)» |
| «Toda la operación» (lote de varias misiones) | «Todos los documentos del ejercicio (un PDF por destinatario)», «Exportar todos los PDF», «Dossier de operación (un PDF)» |
| «Datos» | «Exportar YAML», «Exportar Markdown» |

El briefing de la tripulación contiene sus sobres sellados y los mapas; la línea de estado lista los mapas no adjuntos. Cargue los mapas antes de exportar.

## Estudio cartográfico
<!-- page: apps/cpco/map_parser.html -->

El estudio produce los mapas del dosier de misión a partir de los datos del SIA (ciclo AIRAC): ruta, corte vertical, mapas en PNG o SVG, ZIP y mapa de conjunto.
Acceso: pestaña «Estudio cartográfico» del generador, ☰ › «Estudio cartográfico (SIA)», o «Abrir en el estudio» en el registro.
Trabaja sobre la misión compartida con el generador. Detalles técnicos: [misiones SIA](../SIA_MISSIONS.md).

### Misión

- Línea de estado de la misión cargada y botón «Guardar en la carpeta»: escribe la misión y los ajustes del estudio (perfil y encuadre de cada mapa, trazados, pistas) en `mission<ID>.yaml`. El resultado aparece junto al botón y en una notificación.
- Línea «Base SIA»: ciclo AIRAC, número de espacios y de celdas MORA, enlace a Ajustes › Mantenimiento › Datos aeronáuticos.
- «Abrir otra misión: archivo Markdown / YAML o texto pegado» (plegado cuando hay una misión cargada): elija un archivo, o «o pegar su contenido…» y después «Leer la misión».

La misión abierta aquí pasa a ser la misión compartida con el generador. En una misión de ejercicio, los mapas de ejercicio que faltan se añaden automáticamente: guarde la misión para conservarlos.

### Ruta

Plan de vuelo, mapa de control y corte vertical están vinculados: al pasar el ratón por un punto en uno de ellos, se ilumina en los otros dos.
- Campo de ruta: casilla 15 del plan de vuelo OACI o lista separada por comas; vacío = ruta de la misión. «Sintaxis y uso» detalla los formatos.
- «Nivel»: nivel de crucero (FL65 o 6500).
- Lista «Aerovías» / «RTBA (baja altura)» y después «Buscar»: busca una ruta entre los puntos y sustituye el texto.
- «SimBrief»: retoma el último OFP (identificador SimBrief: Ajustes › Mi perfil › Identidad y redes); «↺ Ruta probable»: retoma la ruta probable, regreso a la base incluido.
- «Trazar» (corte vertical), «Combustible» (abre el planificador con esta ruta), «Copiar OACI» (plan de vuelo estricto).
- «Puntos de la misión»: haga clic en un punto para añadirlo al recorrido.

Mapa de control: listas «Mapa» y «Perfil», casilla «ZIP», «Actualizar», «Mantener este encuadre» (el mapa generado tomará el encuadre mostrado), «Recentrar», «Encuadre automático», «⧉ Ventana» (ventana aparte sincronizada), «⤢ Ampliar» (Esc para volver). En el mapa: arrastre un punto, haga clic en la ruta para insertar uno, clic derecho para eliminarlo.
«Ajustes del perfil: corte, aeronave, variómetro, salidas»: suelo y techo del corte, aeronave, ascenso y descenso, imagen `profil_vertical.png` en las salidas, trazado por defecto del recorrido.

### Mapas que producir

«Mapas de la misión»: una línea por mapa.
- Clic en el nombre: muestra el mapa en el mapa de control (✎ = encuadre modificado).
- Perfil de visualización, o «Desactivado» (mapa ni generado, ni previsualizado, ni en el mapa de conjunto).
- Trazado: «Sin trazado», «Briefing: recorrido», «Organización: ruta probable», «Recorrido + ruta probable».
- Destinatario del ejercicio (si el ejercicio tiene pistas): sin pistas, organización, un blanco, o una tripulación después de tal mensaje o sobre.
- Casilla «ZIP» (desmarcada: mapa no generado; elección no guardada en la misión) y × para eliminar.

Para añadir: nombre, tipo («general», «objetivo», «detalle», «zona») y después «+ Mapa» (extensión = vista mostrada); «+ Mapas de ejercicio» añade los mapas de la organización, de los blancos jugados o de la tripulación.
«Ajustes del perfil …» (plegado): «Nombre del perfil», «Mapa de fondo», «Guardar», «Nuevo», «Duplicar», «Eliminar» y después cuatro pestañas: «Mapa de fondo», «Espacios», «Símbolos OACI», «Elementos». El perfil modificado es siempre el del mapa elegido; los perfiles son comunes a todas las misiones y se guardan en este navegador.

### Vistas previas y generación

- «Mostrar todos los mapas»: vistas previas de todos los mapas; no crean ningún archivo.
- «Generar los mapas y el ZIP» (también en el pie de página): produce cada mapa con la casilla «ZIP» marcada, el mapa de conjunto y, si la opción está marcada, el perfil vertical, y después descarga el ZIP.
- Los PNG se guardan en `cartes/` de la carpeta de la misión (visibles en el registro). Si no, use «Archivar los mapas en la carpeta» en el pie de página.
- Un mapa que falla no detiene los demás: el ZIP contiene `rapport_generation.txt` y «Reintentar solo este» vuelve a lanzar ese mapa. «fondo parcial» señala un mapa de fondo lento.
- Lote de varias misiones: «Generar las n misiones» produce un único ZIP, con una carpeta por misión y el mapa de la operación.

Tipo de salida (PNG, SVG editable) y anchura de los PNG: menú ☰ › «Salidas de mapas». El mapa de conjunto siempre se incluye; aparece al pie del bloque.

### Base de datos SIA

Bloque oculto por defecto: haga clic en «Mostrar» en su cabecera.
- Carpeta `data/sia`, recordada como las demás carpetas de la suite.
- «Reconstruir la base aeronáutica» después de cada actualización AIRAC; «Cancelar» interrumpe sin cambiar la base guardada.
- «Vaciar la caché» borra la base guardada en este navegador (hay que releerla después).
- La línea de estado indica la base guardada (carpeta, ciclo AIRAC, fecha); «Archivos analizados» lista los XML leídos.

Si la carpeta contiene varios ciclos, solo se lee el más reciente; los demás se señalan para archivarlos. Es el mismo bloque que Ajustes › Mantenimiento › Datos aeronáuticos («Reconstruir la base aeronáutica»), que lee las zonas activas y sus fuentes marcadas.

## Registro de misiones
<!-- page: apps/cpco/mission_registry.html -->

El registro recoge todas las misiones generadas o encargadas, con su seguimiento por el Centro: estado, fecha de vuelo, notas, informes.
Sirve para elegir una misión, abrirla en el generador o en el estudio, asignarla a pilotos, crear su informe y encargar nuevas misiones.
Acceso: barra lateral «Registro» (sección «Centro») o ☰ › «Registro de misiones (SIA)».

### Misiones del registro

En la cabecera: número de misiones, reparto por estado y fecha de actualización.

| Botón | Efecto |
|---|---|
| «Carpeta de misiones: …» | Elige la carpeta `data/missions` y después la relee |
| «Releer la carpeta» | Relee todas las misiones de la carpeta |
| «Añadir archivos…» | Añade `mission<ID>.yaml` / `summary<ID>.md` (cualquier navegador) |
| «Escribir mission_registry.yaml» | Escribe el registro en la carpeta de misiones |
| «Limpiar el registro (n)» | Quita las misiones con «archivo ausente» tras releer |

La carpeta se relee automáticamente al abrir la página si ya está autorizada.
Al limpiar, el estado, las notas y la fecha de vuelo pasan a la misión que sustituye a una misión renumerada.

### Elegir una misión

Filtros: «Tipo», «Subtipo», «Encuentro», «Equipos» (mín. – máx.), «Tipo de equipo / aeronave», «Reabastecimiento», «Teatro», «Estado», «Buscar». Se recuerdan.
- «Sortear (n)» elige una misión entre las que pasan los filtros.
- «Borrar filtros», «CSV» (exportación de la selección).
- Tabla ordenada por columna: Misión, Tipo, Título, Equipos, RDV, AAR, Teatro, Estado, «Duración est.», Informes (número de vuelos), «Generada». La barra bajo la tabla ajusta su altura (doble clic: altura por defecto).
- ✕ quita una misión del registro sin eliminar sus archivos.

Haga clic en una línea para abrir la ficha de la misión, descrita más abajo. El enlace `?mission=M-016` abre directamente la ficha.

### Ficha de la misión

La ficha muestra el estado, el itinerario, los equipos y los indicativos, y después:
- para una operación: sus miembros (haga clic para mostrarlos); «Abrir» carga toda la operación en el generador o en el estudio;
- «Archivos de la misión»: YAML, «Markdown (legible)», «PDF (generador)», «Modificar (generador)», «Mapas (estudio)», miniaturas de los mapas, versiones anteriores y textos recibidos;
- estado de los mapas: «completa», «parcial» o «sin mapas»;
- «Duración estimada» con la comparación con los informes.

Botones: «Abrir en el generador», «Abrir en el estudio», «Asignar…» (salvo organización …Z; véase [asignación de misiones](../technique/AFFECTATION_MISSIONS.md)), «Crear informe» o «Nuevo informe (vuelo n)», y «Volver a copiar el prompt» para una misión encargada.

### Seguimiento del Centro: estado, fecha de vuelo, notas

El recuadro inferior de la ficha tiene tres campos: «Estado», «Volada el», «Notas».

| Estado | Cuándo |
|---|---|
| encargada | Encargo hecho a ChatGPT |
| generada | Archivos recibidos |
| planificada | Misión abierta en el generador o en el estudio desde el registro |
| volada | Fecha de vuelo introducida, o informe creado desde la ficha |
| informe hecho | Un informe del registro de informes cita la misión (automático) |
| abandonada | Elección manual |

El seguimiento se escribe en `suivi.yaml`, en la carpeta de la misión; se comparte con los demás puestos. Si dos puestos modifican el mismo campo a la vez, se conserva su entrada y una alerta lo indica.

### Vínculo con los informes

- La ficha lista «Informes de la misión (n)», del más reciente al más antiguo; cada enlace abre su informe.
- «Crear informe» abre un informe rellenado de la familia correspondiente. Para una misión ya volada, «Nuevo informe (vuelo n)» toma el número de vuelo siguiente (misiones recurrentes).
- En el informe, bajo el campo de la misión, el enlace «ver la misión en el registro ↗» vuelve a la ficha, con la duración estimada y la diferencia del vuelo.
- En cuanto un informe cita la misión, el estado pasa a «informe hecho», salvo si la misión está abandonada.

### Encargar una misión

Formulario común con el generador.
1. Ajuste «Tipo», «Subtipo», «Teatro» y «Segundo teatro» («País» para el extranjero), «Serie» (vacío = la siguiente).
2. Compruebe «Identificador» (calculado, de solo lectura).
3. Ajuste «Equipos en vuelo», «Encuentro», «Equipos en tierra», «Duración» (XS a XL), «Traducciones», «Reabastecimiento en vuelo».
4. En «Aeronave de cada equipo», introduzca la aeronave de los equipos A, B… (vacío = automático).
5. Haga clic en «Encargar: copiar el prompt y abrir ChatGPT», pegue en ChatGPT (Ctrl+V) y envíe.

La misión aparece en el registro con el estado «encargada». Guarde después los archivos en la carpeta de misiones y haga clic en «Releer la carpeta»: el encargo se asocia con la misión generada (misma serie). Los ajustes se recuerdan.

## Planificación ODV
<!-- page: apps/cpco/odv_planning.html -->

La página Planificación ODV reúne las disponibilidades de la semana, las franjas comunes, las misiones probables y las asignaciones. El Centro (CPCO) la utiliza para planificar las misiones y confiarlas a los pilotos libres.
Para abrirla: barra lateral › sección «Centro» › «ODV». La página forma parte del Centro: mientras el Centro esté bloqueado, un aviso remite a Ajustes › Centro (véase el capítulo siguiente). En modo production, además hay que estar conectado con el rol `admin_centre`.
El libro Excel de la escuadrilla es opcional: sin él, la semana se construye a partir de las disponibilidades declaradas por los pilotos en Mis misiones y de las asignaciones ya guardadas.
Cada bloque se puede mover (asa ↕) u ocultar («Ocultar» / «Mostrar»); la disposición se recuerda para la página.

### Libro ODV

Este bloque carga el libro semanal de la escuadrilla (`.xlsx`). Está **oculto por defecto**: haga clic en «Mostrar» en su cabecera para que aparezca.
- Elija el archivo o suéltelo sobre el campo de archivo. Se lee en el navegador; no se envía nada por la red.
- Al llegar a la página, la suite vuelve a abrir por sí sola el libro `.xlsx` más reciente de la «Carpeta del libro ODV», si está autorizada (Ajustes › Instalación › Fuentes y carpetas). Si no, vuelve a abrir la copia del último libro elegido, guardada en este navegador.
- Elegido a mano, el libro muestra directamente su propia semana.
- Una vez leído el archivo, aparece un resumen: «Archivo», «Semana», «Oficial de guardia», «Tema de la semana», «Pilotos», «Hoja FLOTTE», «Cronología», «Lectura». El «Informe de lectura (n)» lista los avisos (⚠) y las observaciones. Aparece desplegado si contiene al menos un aviso.
- Las anomalías (código fuera de la leyenda, trigrama duplicado, fecha de la cronología desfasada…) se señalan mediante notificaciones flotantes, sin bloquear nunca la lectura.
- Si un piloto del libro aún no tiene preferencias de tipos de misión, la suite las crea a partir de sus códigos (C → caza, T → transporte…) y las escribe en su ficha de usuario.
- «Borrar los datos» vacía la página. El botón sigue en gris mientras no haya ningún libro cargado.
- El enlace «Ajustes › Centro › Planificación ODV» lleva a los ajustes de las franjas y de la lectura del libro.
- Datos personales: no publique las exportaciones. Formato del libro y reglas de lectura: [Planificación ODV](../ODV_PLANNING.md).

### Cuadrícula de disponibilidad

La cuadrícula cruza a los pilotos con los días de la semana y las tres franjas de cada día (M = mañana, A = tarde, S = noche).
- **Elección de la semana**: «◀ Semana anterior», «Semana siguiente ▶», «Esta semana», y «Semana del libro» cuando hay cargado un libro de otra semana. La fuente mostrada es «libro …» o bien «declaraciones de los pilotos y asignaciones (sin libro para esta semana)».
- **Filtros**, recordados en este navegador: «Ocultar las cuadrículas vacías», «Color del trigrama» (color de la forma en el libro), «Función (hoja FLOTTE)» o «Función (aeronaves declaradas)» sin libro, «Simulador».
- **Leyenda**: códigos del libro con su número de casillas, y después el bloque «Declaraciones de los pilotos», idéntico al de Mis misiones.
- **Lectura de una casilla**: primero viene el código del libro y después la declaración del piloto. Un recuadro rojo señala a un piloto disponible y no asignado. Un número de misión señala a un piloto asignado.
- **Información emergente**: el comentario de la casilla aparece al pasar el ratón; las funciones, los simuladores y la línea del libro aparecen al pasar el ratón por el trigrama.
- La columna «Disp.» cuenta las franjas disponibles del piloto, con el número de franjas de control en pequeño (+n).
- **Clic en una declaración**: abre la ventana «Asignar los pilotos libres» de la franja, con este piloto resaltado (véase «Franjas comunes»).

#### Misiones asignadas esta semana

Bajo la cuadrícula, la tabla «Misiones asignadas esta semana (n)» lista las asignaciones de la semana mostrada.

| Columna | Contenido |
|---|---|
| Despegue | fecha y hora Z |
| Franja | tres casillas M / A / S, con la de la franja resaltada |
| Misión, Piloto, Indicativo, Aeronave, Aeródromo | misión (número y título), piloto («por asignar» si no hay nadie), indicativo, tipo y matrícula, aeródromo de salida |
| Función | «misión», «misión (traslado desde …Z)» o «traslado para …» |

Haga clic en una línea para volver a abrir la asignación completa y modificarla. Para ello el Centro debe estar activado y la misión debe figurar en el registro de este navegador. Si no, se abre la ventana de la franja o aparece un aviso. Sin asignaciones, aparece el mensaje «Ninguna misión asignada esta semana.».

#### Planificación hora por hora

Esta planificación detalla un día de la semana.
- Las pestañas de la cabecera solo muestran los días que tienen misiones, con su número entre paréntesis. Por defecto, la planificación se abre en el día de hoy o, si no, en el próximo día con misiones.
- Cada línea corresponde a un piloto; una línea «por asignar» agrupa los puestos todavía sin piloto.
- Cada misión forma un bloque de color que lleva el indicativo. Un traslado se marca con «⇢».
- Al fondo se dibujan las tres franjas; una línea marca la hora actual.
- Haga clic en un bloque (o pulse Intro) para modificar la asignación.
- Más abajo, «Registro de asignaciones (n)» se despliega y muestra las 30 últimas operaciones.

### Sesiones ATC de las redes

Este bloque reúne los entrenamientos, exámenes, eventos y reservas de VATSIM / IVAO de la semana mostrada. Se guardan en el conjunto de datos compartido (`data/atc/<année>-W<semaine>.json`).
- **Introducir una sesión**: indique el día, el inicio y el fin (horas UTC, en pasos de 15 min), la posición (p. ej. `LFBO_APP`, `LFMN_TWR`), la red (VATSIM o IVAO), el tipo (Entrenamiento, Examen, Evento, Reserva) y un comentario opcional. Después haga clic en «Añadir».
- Las dos horas deben caer el mismo día: el fin debe ser posterior al inicio.
- «Recuperar VATSIM (Francia metropolitana)» importa las reservas VATSIM de la semana. Las sesiones ya recuperadas se sustituyen (anulaciones incluidas); las introducidas a mano se conservan.
- IVAO se introduce a mano: su API de reservas requiere autenticación.
- El botón «×» de una línea quita la sesión. La columna «Fuente» indica «recuperada» o «introducida».
- **Efecto en la planificación**: una sesión se cuenta en su franja (★). Un entrenamiento o un examen deja la CTR del aeródromo no disponible para las misiones de esa franja; las TMA que contienen el aeródromo deben evitarse en lo posible.

### Franjas comunes

Esta tabla cubre los 7 días × 3 franjas. Cada casilla da el número de **pilotos libres**, es decir, disponibles y todavía no asignados.
- Marcas de la casilla: «+n ctrl» (controladores), «✎» (misión ya asignada), «★» (evento o sesión ATC). La información emergente da además los efectivos antes de las asignaciones.
- Filtros: «Al menos N piloto(s)», de 1 a 20, y «Simulador común» («indiferente» o un simulador). Se recuerdan con los ajustes ODV. Una casilla por debajo del umbral aparece atenuada.
- Pilotos que se tienen en cuenta: códigos O, SC, C, T, N, S; controladores: AT, AM. Una casilla vacía no se cuenta.
- **Clic en una casilla**: abre la ventana «… — asignar los pilotos libres». Permite modificar las misiones ya asignadas en la franja o planificar otras.

#### Ventana «Asignar los pilotos libres»

Condiciones de apertura: Centro activado y registro de misiones presente en este navegador (si no, abra el registro del Centro y relea la carpeta de misiones).
1. **El día en tres bloques** (Mañana, Tarde, Noche) ocupa la parte superior de la ventana. Cada bloque indica sus horas, el número de pilotos libres y de misiones, y «en curso» para la franja actual. La franja de la ventana aparece resaltada. Al hacer clic en otro bloque se abre esa franja; si quedan elecciones sin guardar, se pide confirmación. La ventana permanece abierta y pasa a esa franja.
2. Los pilotos libres aparecen con los tipos de aeronave que han declarado (en negrita: dominados). Elija una «Familia» («todas»; «(propuesta)» señala la familia propuesta para la franja). La línea «A evitar:» recuerda las CTR y TMA cerradas por una sesión ATC.
3. En la matriz, marque una misión (columna «Planificar»). Elija después la «Aeronave»: la lista va de la más cercana a la más lejana de la salida e indica «en el lugar» o la duración del traslado. Elija por último el «Piloto»: primero aparecen los pilotos «Libres hasta el final, con la aeronave».
4. Si la aeronave tiene su base en otro lugar, aparece una línea «Traslado». Elija quién la traslada («por»): un piloto libre, el propio piloto (la misión se retrasa entonces en la misma medida) o «por asignar (misión de traslado)».
5. Si es necesario, ajuste la hora de «despegue» (o la «hora H» de una operación con varias misiones). «+ punto» añade un puesto a una patrulla, con el indicativo siguiente. «✎ detalle» abre el diálogo de asignación completo; su resultado vuelve a la matriz.
6. Compruebe la columna «Estado»: piloto duplicado, aeronave duplicada o ya asignada, piloto no libre en todo el intervalo.
7. Haga clic en «Guardar (n)». «Deshacer cambios» vuelve al estado de apertura; «Cerrar» pide confirmación si quedan elecciones pendientes.

Bajo la matriz:
- «Traslados por asignar (n)» permite confiar un traslado que ha quedado abierto: elija el piloto que lo realiza y después «Confiar».
- «Pendientes (n)» lista las elecciones todavía no guardadas.
- «Guardadas en esta franja» ofrece «Modificar…» para cada misión.

Límites:
- La ventana se cierra sola cuando todos los pilotos libres están asignados.
- Las misiones ya asignadas (esta semana o antes) se ocultan.
- Un piloto solo recibe una misión por franja.
- Para guardar, la carpeta de misiones debe estar autorizada (Ajustes › Instalación › Fuentes y carpetas).
Reglas detalladas: [asignación de misiones](../technique/AFFECTATION_MISSIONS.md).

### Misiones probables

Este bloque propone, para cada franja que alcanza el umbral «Al menos N piloto(s)», las mejores familias de misiones que pueden jugar los pilotos libres.

| Columna | Contenido |
|---|---|
| Franja | día, fecha, M / A / S; rango de la propuesta en superíndice |
| Familia | SAR, FIRE, HEMS, MARITIME, AAR, ISR, SPECIAL, AIRBORNE, AIRLIFT, TRAINING |
| Asignación propuesta, + | pilotos y función desempeñada; posibles refuerzos |
| Simuladores comunes, Puntuación, Regla | simuladores compartidos; puntuación (cálculo detallado al pasar el ratón); regla de la familia |
| Planificar (misiones del registro) | «Planificar» o «Modificar»: abre la ventana de la franja, filtrada por la familia |

- Haga clic en una línea (fuera del botón) para desplegar su resumen: franja, tripulación propuesta, refuerzos, regla, puntuación, contexto (sesiones ATC, controladores, eventos), simuladores, misiones ya asignadas. El triángulo ▸ hace lo mismo; solo se despliega una fila a la vez.
- «Reglas de las familias y de la puntuación» se despliega bajo la tabla. Puntuación = número de participantes, + 2 por cada piloto con código restringido empleado en su ámbito, + 1 por cada controlador en línea para TRAINING (2 como máximo). Una familia jugada a menudo retrocede un poco (según el número de informes del registro) para variar las misiones.
- El número de misiones mostradas por franja y el orden de preferencia en caso de empate se ajustan en Ajustes › Centro › Planificación ODV.
- La tabla se ordena por columna. Las funciones sacadas de la hoja FLOTTE son orientativas: el planificador valida.

### Exportación

Este bloque guarda archivos en este ordenador. Contienen datos nominativos: no los publique. Los botones siguen en gris mientras no haya ningún libro cargado.

| Botón | Resultado |
|---|---|
| «Cuadrícula (CSV)» | `<classeur>_grille.csv`: una línea por piloto, día y franja |
| «Todos los datos (JSON)» | `<classeur>_planning.json`: ajustes, pilotos, cuadrícula, eventos, vuelos, franjas, misiones, anomalías |
| «Resumen de texto» | rellena la zona de texto: DISPO MATIN / APREM / SOIR por día |
| «Copiar» | copia este texto en el portapapeles (por ejemplo para Discord); activo una vez generado el resumen |
| «Resumen (.txt)» | `<classeur>_dispo.txt` |

Si el navegador rechaza la copia automática, el texto queda seleccionado: cópielo con Ctrl+C.

## Órdenes de vuelo
<!-- page: apps/cpco/odv_orders.html -->

La página Órdenes de vuelo construye la orden de vuelo de la semana: fichas de vuelo, control, varios y notas colocados en una cronología, con los conflictos de disponibilidad y de zonas.
Para abrirla: barra lateral › sección «Centro» › «Órdenes». Como el resto del Centro, requiere el Centro activado; en modo producción, también hay que estar conectado con el rol `admin_centre`. Si no, la página se abre en solo lectura.
Todo se guarda en el pool de datos compartido: la orden de la semana en `data/odv/<año>-W<semana>.json`, los ajustes en `data/config/odv.json`. Las disponibilidades siguen siendo las de los pilotos, y la tripulación de un vuelo de misión la de las asignaciones.
Las horas están en z (UTC). Modelo de datos: [Órdenes de vuelo](../technique/ODV_ORDRES.md).

### Semana

- «◀» y «▶» cambian de semana, «Esta semana» vuelve a la semana en curso.
- Las pestañas de los días muestran, en rojo, el número de elementos en conflicto del día.
- «Día», «Semana» y «Estadísticas» cambian de vista.
- «Guardia» designa al oficial de guardia de la semana.
- «Briefing» (o la tecla F) muestra la orden del día en pantalla completa; las flechas ← y → cambian de día.
- La línea de estado indica «Guardado», o «Guardado en este navegador» si la carpeta de datos no está autorizada.

### Orden del día

A la izquierda, la paleta: plantillas de vuelos, de control y de varios, la nota, y luego los miembros (Staff, luego Miembros) con la barra de su disponibilidad del día. A la derecha, la cronología:
- líneas de puntos: franjas de mañana, tarde y noche de la planificación ODV; línea roja: hora actual; zonas oscuras: noche aeronáutica del aeródromo configurado;
- «RTBA · LL»: franjas de actividad del RTBA (activaciones introducidas o importadas, si no las franjas de los ajustes);
- «Zonas»: zonas requeridas por cada vuelo (las de su misión, o las introducidas para un entrenamiento), en verde si están activas en la red del vuelo, en naranja si están solicitadas, en rojo si no;
- «Disponibles juntos»: franjas en las que al menos dos miembros son asignables a un vuelo;
- secciones «Vuelos», «Control», «Varios», «Notas»: los elementos se apilan solos.

Manejo:
- arrastre una plantilla a su sección: el elemento se crea a la hora de la colocación (en pasos de 5 min) y se abre su ventana;
- haga doble clic en una tarjeta de la paleta para colocarla automáticamente: en la franja de sincronización para otra tripulación de una misión con varias tripulaciones (desfase del ejercicio de la operación respecto a H, si no hora de la patrulla vinculada ya colocada; cisterna: 30 min antes del reabastecimiento, o antes de la patrulla a la que sirve), si no en la primera franja coherente del día (horas de servicio, no antes de la hora actual, tripulación asignable y libre, o suficientes miembros disponibles juntos);
- arrastre un miembro de la paleta a una ficha para añadirlo, o un trigrama de una ficha a otra para moverlo;
- arrastre una ficha para cambiar su hora, su borde derecho para cambiar su duración; un simple clic abre su ventana;
- en la paleta, «Reserva de vuelos» guarda las fichas quitadas de la cronología (arrastradas a la paleta, o «↩ Reserva» en su ventana) y «Formaciones de las misiones» propone lo que piden los vuelos de misión colocados: patrullas de las otras misiones de la formación, cisternas que las atienden, chiffons de la operación;
- «Zoom» ajusta la escala de la cronología.

En una ficha: «⚠ n» cuenta sus conflictos, «P» indica que ningún tripulante está disponible en la hora y media previa al vuelo, «↻» una recurrencia; una barra verde (hecho) o naranja (no hecho) subraya el estado; una ficha cancelada aparece tachada. Bajo la cronología, «Problemas de asignación» lista los conflictos del día: un clic muestra la ficha.

### Ventana de un elemento

- **Vuelo**: etiqueta, indicativo, misión del registro (vacío: entrenamiento), red, inicio, duración, color, zonas de un entrenamiento, eje y descarga de un vuelo cisterna, cisterna y hora del reabastecimiento, aeronaves (piloto, navegante, cancelado; ocho como máximo), tareas (una por línea, «nombre = TRI»), información, estado, motivo, informe (ME, Bâché, MNE), parcial, causas de MNE.
- Un indicativo introducido propone la misión de la asignación que lleva ese indicativo ese día.
- «Misión del registro y equipo»: una fila por equipo en vuelo de cada misión (indicativo, aeronave, función, familia, aeródromos, operación, duración estimada), ordenada por duración; «⚠» y una notificación señalan una duración estimada distinta de la solicitada (diferencia de más de 15 min o 15 %). «Entrenamiento (sin misión)» deja la ficha sin misión.
- «Reabastecimiento»: una misión cisterna (primero las de la misma operación o del mismo eje), cuya ficha se coloca ese día si aún no está, o un vuelo cisterna ya colocado; la hora del reabastecimiento se ajusta al lado.
- **PTA** (principal training audience): miembros a los que el elemento entrena en prioridad, marcados en la tabla de aeronaves (vuelo) o en la lista PTA (control, varios); aparecen rodeados en la ficha. **Configuración**: configuraciones cargadas en la aeronave (KNON = cañón, TALIOS = pod…), propuestas según los ajustes. **DLO** (desired learning objectives): objetivos de cada miembro en el elemento, una línea por miembro «TRI = objetivos»; «◎» en el trigrama, objetivos al pasar el ratón.
- **Aeronaves**: dos plazas al principio («+ Punto» añade más, ocho como máximo); para cada una, la aeronave (tipo de la misión propuesto ★, sin imponerlo, o una aeronave de la flota), el piloto y el navegante. El indicativo propuesto es el de la misión, si no los de la tabla de indicativos para ese tipo; sigue a la misión si esta lo cambia. **Reabastecimiento**: elija el eje y luego una misión cisterna de ese eje; si su ficha no está colocada, pasa a la paleta y el vuelo se engancha a ella al colocarla. La ficha muestra la misión (título, familia, aeródromo), el eje que sostiene un cisterna y, para un receptor, «⛽ cisterna eje hora».
- Vuelo de misión: la tripulación viene de las asignaciones de la misión; «Orden de misión…» abre la ventana de asignación del Centro, prerrellenada con las aeronaves de la ficha (piloto, matrícula, indicativos de la patrulla): las asignaciones guardadas son la orden de misión que los pilotos reciben en Mis misiones (distintivo «OM» en la ficha). «Encargar una misión…» abre el formulario de encargo del generador, preajustado según la ficha (equipos, tipos de aeronave, duración, reabastecimiento). El informe de la misión es la referencia: al abrir la semana, estado e informe se toman de él; sin informe pasado el plazo configurado, el vuelo pasa a MNE (causa «sin informe»).
- **Control**, **Varios**: etiqueta, posición (control), inicio, duración, color, estado, motivo, tripulación (casillas de los miembros), notas (varios).
- **Nota**: texto libre.
- «Repetir» (cada día, cada semana, cada dos semanas) y «Hasta» colocan el elemento en las semanas siguientes al abrirlas por primera vez, nunca antes de su fecha.
- «Eliminar» quita el elemento.

### Conflictos

| Conflicto | Significado |
|---|---|
| semana no declarada | el miembro no ha declarado su disponibilidad de la semana |
| no disponible durante toda la duración | ninguna franja cubre todo el elemento |
| no asignable (categoría) | una franja de una categoría que no abre este tipo de elemento se solapa con el elemento |
| ya ocupado a esa hora | el miembro está en otro elemento al mismo tiempo |
| dos veces en el elemento | el mismo miembro ocupa dos puestos |
| zona no activada, solicitada, prohibida | zona requerida sin activación «activa» de su red durante todo el vuelo, o zona P |

Un vuelo requiere una categoría disponible; un control, una categoría disponible o «Control SOG»; un elemento varios acepta también «Disponible solo en tierra». Control y vuelo fuera de SOG, DCS, no disponible y descanso nunca son asignables.

### Semana y estadísticas

- **Semana**: una fila por miembro, una casilla por día con la barra de las disponibilidades declaradas y el número de elementos en los que figura. Un clic en una casilla abre sus franjas del día: categoría, inicio, fin, y «Descanso desde», que coloca un descanso hasta medianoche. Las franjas se escriben en la declaración del piloto.
- «Cambios de disponibilidad» lista las declaraciones modificadas desde la última vez que se tuvieron en cuenta; «Tenido en cuenta» y «Tener todo en cuenta» las marcan en este navegador.
- **Estadísticas**: vuelos previstos, duración total, hechos, no hechos, cancelados, AAR, ME, Bâchés, MNE; por miembro: tiempo disponible en las horas de servicio, tiempo de vuelo, carga (naranja por encima del 70 %, rojo por encima del 100 % o sin disponibilidad).

### Activaciones de zonas

Este bloque introduce las activaciones de zonas de la semana, por red y por franja (`data/atc/activations/<año>-W<semana>.json`): día, zona, red, estado (activa, solicitada, rechazada), inicio, fin, observación. «Importar de IVAO» recoge los horarios publicados por IVAO (clave de API configurada en el lanzador); las entradas a mano se conservan. Un cambio recalcula al instante las zonas de los vuelos.

## Ajustes › Centro
<!-- page: apps/settings/centre.html -->

Esta página reúne los ajustes habituales del Centro: acceso, usuarios, categorías de disponibilidad, planificación ODV y envío de los informes. Está dirigida a los administradores del Centro.
Para abrirla: barra lateral › «Ajustes» y después la pestaña «Centro». Los apartados aparecen en el menú lateral, grupo «Centro (CPCO)».
Mientras el Centro esté bloqueado, solo es visible el apartado de acceso. En modo production, la página pide además una conexión `admin_centre`.

### Acceso al Centro y ajustes

Este apartado activa el Centro en este navegador: generador de misiones, estudio cartográfico, registro y planificación ODV.
1. Introduzca la «Contraseña del Centro» (sin distinguir mayúsculas).
2. Haga clic en «Activar el Centro» o pulse Intro. El mensaje «Centro activado en este navegador» confirma la activación.

Una vez activado el Centro, el apartado muestra «Cálculo de las rutas de tránsito»:

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
| Fechas de la semana | «Semana ISO (n.º de semana del archivo)»; si no, «Fecha introducida en la cronología» |
| Casilla vacía | «Sin rellenar» (nunca cuenta como disponible); si no, «No disponible» |
| Tipos FLOTTE tenidos en cuenta para las funciones | «Todos salvo los rojos (no dominados)»; «Solo verdes»; «Todos» |
| Misiones mostradas por franja | 3 (de 1 a 10) |
| Orden de preferencia en caso de empate | AAR, AIRBORNE, ISR, SPECIAL, SAR, MARITIME, FIRE, AIRLIFT, HEMS, TRAINING (familias desconocidas ignoradas, con un aviso) |
| Código restringido (SC, C, T, N): solo funciones de su ámbito | marcado |
| Ignorar una línea de grupo coloreada los 7 días en una franja (decoración) | marcado |

Cada cambio se guarda de inmediato. «Ajustes por defecto» restablece todos los valores anteriores.

### Órdenes de vuelo

Esta sección ajusta la página Órdenes de vuelo (`data/config/odv.json`, sincronizado).

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

Esta página reúne los ajustes que se hacen una sola vez: primer arranque, carpetas locales, fuentes externas y aerolínea virtual.
Para abrirla: barra lateral › «Ajustes» y después la pestaña «Instalación».
El menú lateral tiene dos grupos. El grupo «Instalación» contiene «Primer arranque»; el grupo «Carpetas y fuentes» contiene «Fuentes y carpetas».
Estos apartados se asignan a la página mediante `config/repository_tree` (clave `settings.sections`: `setup` y `sources` → installation). Todos los demás apartados de mantenimiento se abren en la página Mantenimiento.

### Primer arranque

Este apartado indica si el primer arranque se ha completado en este navegador, y en qué fecha.
- «Abrir el primer arranque» vuelve a abrir el asistente (`premier_lancement.html?force`). Se desarrolla en cuatro pasos:
  1. Datos: «Obtener los datos» (clon del repositorio de datos) o «Archivo de datos…»; opcionalmente, «Diario (.html)…».
  2. Perfil: «Guardar el perfil».
  3. Carpetas: «Elegir la carpeta de la aplicación» y después el libro ODV («Carpeta OneDrive…» u «o el archivo Excel…»).
  4. «Terminar y actualizar los datos SIA».
- «Fuentes y carpetas, aerolínea virtual» abre el apartado siguiente.
- «Canal de actualización» abre Mantenimiento › Actualizaciones.
- Para empezar desde cero: «Limpiar y empezar de nuevo…», al pie del primer arranque. Esto borra los ajustes de este navegador, no los archivos.
Véase [Instalación](../INSTALL.md), § 1.

### Fuentes y carpetas

Este apartado es el único lugar donde se ajustan las carpetas locales y las direcciones de las fuentes externas.
- **Primer arranque** (llegada desde el lanzador): un recuadro pide elegir la primera línea, «Carpeta del repositorio». Las demás carpetas se deducen de ella.
- **Carpetas locales**: cada línea tiene su botón de elección y un estado («no elegida», «autorizada», «a reautorizar»). Un control señala una carpeta que no parece la correcta (falta el archivo de referencia). El navegador recuerda la autorización, pero puede pedir que se confirme tras un reinicio.
- **Aviso de carpeta**: si la suite no puede comprobar que la carpeta de datos autorizada es la de la suite servida, un aviso lo indica una vez (la lectura y la escritura se hacen entonces en esa carpeta); si un guardado se queda en el navegador por no poder escribirse, el aviso indica la causa real.

| Carpeta | Contenido esperado |
|---|---|
| Carpeta del repositorio | raíz de la aplicación (contiene `lancer.cmd`, `config/repository_tree`) |
| Carpeta de datos | `data/` (contiene `data_tree.js`) |
| Carpeta del registro, Carpeta de misiones, Carpeta SIA XML | `data/cr`, `data/missions`, `data/sia` (deducidas de la carpeta de datos) |
| Carpeta del libro ODV | carpeta sincronizada (OneDrive…) donde la escuadrilla deja el `.xlsx` |
| Carpeta X-Plane (aterrizajes), Carpeta de rendimiento, Carpeta de copia local | registros CSV, perfiles `.lnmperf` / `.json`, `defa_local_store.yaml` |

- **Fuentes externas**: la dirección por defecto aparece en gris. Un valor introducido solo vale para este navegador; «↺» vuelve al valor por defecto y «Abrir ↗» abre la dirección.
- **Claves de API (servicios externos)**: claves de la suite, comunes a todos sus usuarios (IVAO: clave de API para las activaciones de zonas de las órdenes de vuelo). «Guardar» las confía al lanzador (`secrets/` en la raíz de la aplicación, excluido de git, fuera de los datos y de las copias); la página solo ve su estado y los 4 últimos caracteres; «Borrar» la retira.
- **Aerolínea virtual**: «Nombre», «Nombre completo», «Sigla», «Centro (sigla)», «Centro (nombre completo)» y las páginas del sitio («Página de inicio», «Registro de vuelos», «Flota», «Ficha de un avión»). Un campo vacío mantiene el valor por defecto. «Volver a SO Group Virtual» borra todos estos ajustes.
- **Primer arranque**: «Reabrir el primer inicio»; «Limpiar y empezar de nuevo…» borra las carpetas recordadas, la copia del libro ODV, los identificadores del sitio de la aerolínea y el perfil. Los archivos del disco no se tocan.

## Ajustes › Mantenimiento
<!-- page: apps/settings/maintenance.html -->

Esta página sirve para el mantenimiento de la suite: actualizaciones, versiones, datos SIA, cachés, copias de seguridad y bases de referencia.
Para abrirla: barra lateral › «Ajustes» y después la pestaña «Mantenimiento». La página se abre en «Actualizaciones».
El menú lateral tiene dos partes:
- el grupo «Mantenimiento»: Actualizaciones, Versiones, Referencias y dependencias, Datos aeronáuticos, Cachés, Espacio en disco, Copia total, Registro;
- las bases de datos, agrupadas en «Archivos del repositorio», «Base», «Misiones» y «Datos del navegador».

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

**Mapa de zonas**: una zona por país (Francia agrupa la metrópoli y ultramar, cobertura del SIA). Al pasar el ratón se muestran sus fuentes en el panel derecho; un clic la fija: el panel se queda en ella para activarla («Activar la zona») y ajustar sus fuentes. Nuevo clic en la zona, Esc o «📌 Soltar» la liberan.
- Colores: solo contorno = inactiva, sin datos; gris = inactiva, con datos; naranja = activa, datos incompletos; verde = activa, todos los datos de las fuentes marcadas; azul = zona bajo el ratón.
- Cada fuente se marca o desmarca para su zona; solo las fuentes marcadas de las zonas activas entran en la base. Una fuente «enlace» (PDF o sitio de consulta) no la lee la suite.
- Según la fuente, el panel ofrece:
  - una descarga directa por el lanzador (`tools/aero_fetch.py`): openAIP (cada país), ENAIRE (España), FAA (Estados Unidos: zonas y rutas militares, clases de espacio);
  - un pedido o un registro, con el enlace y el modo de empleo: SIA Francia (pedido a 0 €, a repetir en cada ciclo), NATS (Reino Unido, archivo depositado en `data/sia/zones/gb/`);
  - un PDF, con el enlace y el modo de empleo: DIRCAM / MILAIP ENR 5.7 (ejes de reabastecimiento), AIP militar británico, NAV CANADA;
    DIRCAM: «Importar el PDF MILAIP…» lee el PDF de la sección ENR 5.7 (pdf.js, red en la primera importación), muestra el número de ejes y las anomalías encontradas, y luego «Escribir miam-enr-5-7-tracks.xml» guarda el archivo en la carpeta SIA (el anterior en `_archives/`) y actualiza la base;
  - una carpeta del ordenador: X-Plane (radioayudas, puntos, aerovías, rejilla MORA, recortados a los contornos de las zonas activas que lo marcaron);
  - un cálculo: la MORA de la zona.
- SIA Francia (zona Francia): «Recuperar el ZIP descargado» (el lanzador lo toma de Descargas), «ZIP de exportación…», «Extraer …» si ya está en la carpeta, «Archivar los ciclos antiguos» (`_archives/`); «Contenido de la carpeta SIA» lista los archivos del ciclo.
- El SIA conserva la prioridad: dentro de las FIR francesas solo cuentan sus espacios; en otros lugares, un espacio, aeródromo o radioayuda ya leído no se añade dos veces. Fuera de Francia, las zonas R, D, TRA, TSA, MOA, W, A y las rutas MTR que cruza una misión figuran en sus espacios por activar.
- Las direcciones de los sitios (SIA, DIRCAM, NATS, AIP militar británico, NAV CANADA) se ajustan en Ajustes › Instalación › Fuentes y carpetas › Fuentes externas; las carpetas SIA y X-Plane de allí son las mismas que aquí.

**Reconstruir la base aeronáutica**: lee las fuentes marcadas de todas las zonas activas (unos segundos; el navegador puede pedir autorizar la carpeta). Es el mismo bloque que en el estudio cartográfico.

**Ciclos AIRAC y antigüedad de los datos**: ciclo vigente, ciclo siguiente y ciclo de la base, luego una fila por fuente marcada de las zonas activas:
- SIA: ciclo leído en el nombre de los archivos, «antiguo» si precede al ciclo vigente;
- X-Plane: ciclo de «Custom Data»;
- archivos descargados: «antiguo» pasados 28 días (un ciclo AIRAC).

**MORA**: varias fuentes.
- La rejilla calculada (`data/sia/mora.csv`) tiene prioridad. «Recálculo simple» toma los obstáculos del nuevo ciclo (sin red); «Cálculo completo» rehace relieve y cumbres (red, un minuto aproximadamente) para los teatros y las misiones; «Calcular la MORA de la zona» (panel) lo hace sobre la extensión de una zona, conservando las demás celdas.
- Si cambian celdas: «Escribir mora.csv (antiguo archivado)», y luego hacer commit del repositorio de datos.
- En otros lugares, la rejilla MORA de X-Plane completa, si la fuente X-Plane está marcada.

**Coherencia**: «Comprobar» verifica espacios, aeronaves, flota, rendimientos y aeródromos de las misiones.
Los XML AIRAC (unos 80 MB por ciclo) quedan fuera del repositorio, como los archivos de las demás fuentes. Los valores MORA son calculados, no certificados.

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
- Excluidos a propósito de la copia: clave del servicio web, seguimiento de red en curso, base SIA analizada, autorizaciones de carpetas.

### Registro de copias y recargas

Esta tabla registra cada operación sobre los datos, con la fecha, la operación (y la página), el origen y el resultado. El detalle de las claves añadidas (+) o modificadas (~) se despliega.
Operaciones registradas:
- recarga de los datos locales (☰ › Datos locales › Restaurar);
- copia de seguridad total y restauración de una copia de seguridad total;
- extracción de la exportación SIA y archivado de los ciclos antiguos;
- recálculo MORA.
Mientras no haya tenido lugar ninguna de estas operaciones, el registro está vacío.

### Flota (aeronaves conocidas)

Esta base (`data/references/aircraft_fleet.js`) lista las aeronaves propuestas en los informes: «Operador», «Tipo OACI», «Variante», «Matrícula», «Código», «Número», «Indicativos» (separados por comas), «Base», «Operativo».
- **«Pegar la página Flota del sitio…»**:
  1. abra la página «Flota virtual» del sitio de la compañía (enlace en la ventana);
  2. pulse Ctrl+A y después Ctrl+C, y pegue en la zona (Ctrl+V); también puede usar «Leer el portapapeles» u «o página guardada…»;
  3. haga clic en «Leer».
- Una aeronave de la página sustituye a la del archivo (misma matrícula) pero conserva sus indicativos adicionales. Las aeronaves ausentes de la página se conservan.
- La línea de estado da el número de aeronaves actualizadas, añadidas y conservadas. Compruebe y después «Guardar en el repositorio».
- **Botones comunes a las bases del repositorio**: «Aplicar en este navegador» (cambios locales prioritarios), «Guardar en el repositorio» (escribe el archivo en la Carpeta del repositorio, para hacer commit), «Descargar», «Descartar cambios», «Volver al archivo del repositorio».
- Método por script, en lugar de pegar: `python AircraftDB/update_fleet.py Flotte.html` («Procedimiento»).

### Tipos de aeronave (base OACI)

Esta base (`AircraftDB/aircraft_db.js`) contiene dos tablas:
- «Tipos»: «Designador», «Modelo», «Descripción OACI», «WTC», «Ala», «Fuente»;
- «Alias (nombre común → designador)».
Los cambios también se trasladan a `aircraft_overrides.json`. Los botones son los de las bases del repositorio.
El «Procedimiento» da los comandos del script de actualización, que se ejecuta desde `AircraftDB`: `python update_aircraft_db.py --no-network`, `--add <types>`, `--refresh-icao`. La base no se publica con la suite (datos de la OACI y de EUROCONTROL): la tarjeta «Tipos de aeronave y rendimientos» de Ajustes › Mantenimiento › Referencias y dependencias la completa en este equipo, tipo por tipo, nunca toda a la vez — un código introducido («Añadir / actualizar»), los tipos desconocidos, los de la flota o los de las misiones (ODV, registro); hacen falta el lanzador y la red, y después recargar la página.
Límite: un tipo eliminado aquí puede volver en la siguiente actualización si forma parte de la lista de base del script.

### Correspondencia de indicativos

Esta base (`data/references/callsigns.js`) relaciona el indicativo completo (conservado en los informes) con su forma de plan de vuelo (casilla 7) y con el operador OACI (OPR/, casilla 18).
- Tabla «Indicativos»: «Indicativo completo», «Plan de vuelo», «Otras formas», «Organización», «OPR/», «Tipos», «Función», «Genérico», «Radiotelefonía», «Nota».
- Tabla «Organizaciones → designador OACI (OPR/)».
- No existe ningún script: esta página (o el archivo, editado a mano) es la fuente.
- Para alimentarla: las formas corregidas en los informes llegan a «Indicativos aprendidos», y las series vistas en el diario llegan mediante «Añadir» o «Completar».

### Referencia (anonimizada, en el repositorio)

Esta base (`data/references/defa_reference.js`) recoge los pilotos (trigramas) y las aeronaves de la compagnie, sin los vuelos ni las misiones. Sirve de ayuda a la introducción de datos y no es exhaustiva.
- Tabla «Aeronaves»: matrícula, tipo, variante, estado, adscripción (modificable), último AD conocido, puesta en servicio, indicativos utilizados, primer y último vuelo, vuelos, ficha de flota, nota.
- Tabla «Pilotos»: trigrama, primer y último vuelo, vuelos, tipos, nota.
- Actualización:
  1. cargue el registro de vuelos (apartado siguiente);
  2. haga clic en «Actualizar la referencia (anonimizada)»: no se elimina nada y se conservan las entradas manuales;
  3. «Guardar en el repositorio» y después haga commit.
- Alternativa por script: `tools/defa_reference.py`.

### Registro de vuelos (vuelos realizados)

Esta base es distinta del registro de misiones. Solo se guarda en este navegador: fuera del repositorio y fuera de la copia local, porque contiene trigramas.
- «Cargar / actualizar el registro…» acepta la página «Log des vols» copiada o guardada, o una exportación CSV / JSON. Los vuelos se fusionan sin duplicados.
- «Series de indicativos»: «Añadir» crea la línea en la correspondencia de indicativos; «Completar» le añade las formas y los tipos vistos.
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
- (n) suma los cambios de este puesto pendientes de enviar y los commits pendientes de recibir. El repositorio remoto se vuelve a leer cada 5 minutos mientras la página esté visible. La información emergente da la rama y la fecha de la última sincronización.
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

- Cada puesto **recibe** en cada arranque (el lanzador hace un `git pull` de `data/`) y **envía** con el botón
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
Mensaje «Hay una fusión o un rebase en curso en data/»: termine o cancele la operación git (`git -C data merge --abort`) y vuelva a empezar.
Detalles, esquemas y pruebas sin riesgo: [arquitectura de la sincronización](../technique/SYNCHRONISATION.md).

## Lanzador, datos y copias de seguridad

La suite la sirve un pequeño servidor local, incluido con ella. Los datos están en tres lugares: la carpeta `data/`, el navegador y el archivo de copia local.

### Iniciar la suite

- **Windows**: haga doble clic en `lancer.cmd`. **macOS / Linux**: `sh lancer.sh`. Ambos llaman a `tools/launch.py`, que sigue tres pasos:
  1. **Python**: se busca y, si es necesario, se instala (versión 3.8 como mínimo).
  2. **Datos**: si `data/` está presente, se actualiza (`git pull --ff-only`, sin bloquear en caso de fallo). Si no, se extrae un archivo `.zip` dejado junto al lanzador; en su defecto, se clona el repositorio de datos.
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
Para saber más: [Manual de explotación](../MANUEL_EXPLOITATION.md), § 2 y § 3; [Instalación](../INSTALL.md); [datos de la suite](../DONNEES.md).
