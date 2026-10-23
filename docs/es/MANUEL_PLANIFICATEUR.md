# Manual del planificador

Este manual describe las páginas del **Centro** que preparan y siguen las misiones: generador de misiones, estudio
cartográfico, registro de misiones, planificación ODV y tablero; un capítulo por página, una sección por pestaña o bloque.
En la suite, la entrada **«Ayuda»** de la barra lateral abre este manual en el capítulo de la página actual. Las
páginas de los pilotos se describen en el [manual del piloto](MANUEL_UTILISATEUR.md); el acceso al Centro, los ajustes
y los datos, en el [manual del administrador](MANUEL_ADMINISTRATEUR.md).

## Generador de misiones
<!-- page: apps/cpco/mission_editor.html -->

El generador prepara el dosier de una misión: identificación, textos del briefing, ejercicio, duración estimada, zonas que activar y, por último, los PDF que se entregan a las tripulaciones. También sirve para encargar una misión a ChatGPT y recibir su respuesta.
Acceso: barra lateral «Misiones», pestaña «Generador» (nivel Diseño, 3), o ☰ › «Generador de misiones (SIA)». La creación tiene una sola puerta, este generador: «Nueva misión», «Crear el esqueleto aquí», «Encargar a ChatGPT…». Desde el registro, «Nueva misión» lo abre con una misión nueva (formulario de encargo desplegado) y «Abrir en el generador» carga la misión elegida. Una misión en curso aún no guardada en la carpeta solo se sustituye tras confirmación.
Véase también [prompt del generador](../technique/PROMPT_GENERATEUR_MISSIONS.md).
Según el nivel de uso: la página se ofrece a partir del nivel Diseño (3). En ese nivel, muestra siete bloques: Misión, Identificación, Duración estimada, Zonas que activar, Textos de la misión, Mapas del dosier final y Documentos (más Operación y Ejercicio cuando la misión pertenece a uno). Los borradores, «Todos los datos YAML» y los parámetros del cálculo de rutas están en el nivel Experto (4).

### Tutorial: preparar una misión de principio a fin

Del formulario de encargo al brief en PDF, en nueve pasos; los pasos 10 a 12 convierten una misión sola en un ejercicio coordinado. En los niveles 1 a 3, una misión nueva se abre en «Paso a paso»: sus pasos Marco, Lugares, Relato, Objetivos y riesgos, Cronología, Mapas y documentos retoman los pasos 4 a 8 de abajo; «Mostrar todo» vuelve a la página completa. Los nombres entre comillas son los de los botones.
1. **Abrir el generador**: barra lateral «Misiones», pestaña «Generador» (nivel Diseño), o «Nueva misión» en el registro.
2. **Ajustar el encargo**: «Encargar a ChatGPT…» despliega el formulario. Elija «Tipo», «Subtipo», «Teatro», «Equipos en vuelo», «Equipos en tierra» y «Duración»; en «Más opciones», «Encuentro», «Reabastecimiento en vuelo», «Ejercicio coordinado» y, si hace falta, la aeronave de cada equipo (vacío = una aeronave de la flota).
3. **Crear la misión**, a elegir. Con ChatGPT: «Encargar: copiar el prompt y abrir ChatGPT», pegue el prompt en ChatGPT y envíelo, después cargue la respuesta (`mission<ID>.yaml` y `summary<ID>.md`) en «YAML y/o Markdown», o «o pegar su contenido…» y «Leer la misión». Sin ChatGPT: «Crear el esqueleto aquí» crea en el acto la(s) misión(es), sin relato.
4. **Completar**: «Identificación» (título), «Textos de la misión» («Resumen», «Descripción detallada», después «Añadir una sección de texto»: objetivo principal, riesgos, encuentro…). Los campos enmarcados con puntos siguen vacíos; la línea «Esqueleto: …» cuenta los puntos a colocar y los textos a escribir. Los puntos sin coordenadas (salida, blanco, puntos de viraje, encuentros, zona) se colocan en el estudio, paso 6; en el nivel Experto, el bloque «Todos los datos YAML» permite también escribir `lat` y `lon` en grados decimales. Una operación con varios equipos se recorre con ◀ ▶ en la cabecera de la página.
5. **Comprobar**: «Duración estimada» (ruta probable, ida, tiempo en zona, regreso) y «Zonas que activar» (solicitudes de activación a hacer).
6. **Producir los mapas**: «Abrir en el estudio» (o la pestaña «Estudio cartográfico»), la misión le sigue. Si quedan puntos sin coordenadas, el panel «Puntos que colocar (n)» del bloque Ruta los lista: «Pulsar el mapa» y después un clic en el mapa de control, o un aeródromo, una radiobaliza, un punto buscado por código o nombre; un punto colocado se mueve arrastrándolo, una zona toma un radio en km. En «Mapas que producir», una línea por mapa previsto: elija el perfil, encuadre en el mapa de control y «Mantener este encuadre», después «Generar los mapas y el ZIP» («Generar las n misiones» para una operación). Los PNG se guardan en `cartes/` de la carpeta de la misión.
7. **Guardar**: «Guardar en la carpeta» en el estudio (ajustes de los mapas), después en el generador; la misión queda inscrita en el registro («Guardar en la carpeta de misiones…» si la página lo pide).
8. **Entregar los documentos**: en el generador, «Mapas del dosier final» debe indicar «listo para el PDF» en cada mapa; «Documentos» › «Briefing de la tripulación (PDF)», o «Todos los documentos del ejercicio» para una operación.
9. **Después**: en el registro, «Asignar…» confía la misión a los pilotos; «Duplicar» parte de una misión existente (identificador siguiente, título «(copie)»).

**Del vuelo solo al ejercicio coordinado** (caminos 1, 4 y 6 de «Seis caminos a mano»):
10. **Misión autónoma**: cree la misión con una sola tripulación (pasos 2 y 3, o «Nueva misión»); la línea Operación del bloque Misión dice «Misión autónoma (sin operación)». Si hace falta, la sección de texto «Cronología» recibe los eventos horarios del vuelo.
11. **Añadir una tripulación**: «Añadir una tripulación…» en la línea Operación. La página dice lo que va a crear; luego la misión M-016 pasa a ser la tripulación A (M-016A) y se crea la misión M-016B con el mismo contexto (familia, teatro, salida, llegada, objetivo, zonas, encuentros), el indicativo siguiente y su propio brief. Escriba ese brief, coloque sus puntos en el estudio y luego «Guardar en la carpeta» para cada una de las dos misiones.
12. **Crear la organización**: «Crear la organización del ejercicio…» en la línea Operación crea M-016Z (hora H, participantes tomados de las misiones, brief general propuesto). Ajuste la hora H, los blancos y la cronología en el bloque Ejercicio; desde una tripulación, «Abrir la organización» vuelve a ella. «Documentos» › «Todos los documentos del ejercicio (un PDF por destinatario)» entrega los briefs, los sobres sellados y el dosier de la organización.

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
| «Deshacer los cambios» | Activo cuando la misión tiene cambios sin guardar: tras confirmación, vuelve a la última versión guardada en la carpeta (o a la versión cargada); el estudio sigue |
| «Duplicar» | Copia de la misión cargada, lista para modificar: identificador y serie siguientes libres de la misma familia (letra de equipo conservada), referencias al identificador anterior seguidas (mapas previstos, relato), título «… (copie)», `meta.duplicated_from`; operación reducida a la copia; mapas y renders a rehacer en el estudio. La copia se abre aquí; «Guardar en la carpeta» para conservarla |
| «Guardar borrador» / «Recargar borrador» (nivel Experto) | Guarda o vuelve a leer el texto de la misión en este navegador (las imágenes hay que volver a seleccionarlas) |

Bajo los botones, dos líneas siempre presentes:
- **Línea de estado**, con un punto de color: «Guardada en la carpeta (hace n min)», «Igual que la versión de la carpeta (cargada …)», «Aún no guardada en la carpeta» (esqueleto, copia, misión nueva) o «Cambios sin guardar desde las 14:32 (n campo(s))». «Guardar en la carpeta» es la validación: botón principal mientras quede algo sin guardar. El generador y el estudio comparten la misión al instante (borrador de trabajo común, guardado en este navegador): la línea es la misma en ambas páginas y su descripción emergente lo recuerda.
- **Línea Operación**: «Misión autónoma (sin operación)», o lo que la misión es en su operación: «Operación BOXING GLOVES (A-001): tripulación B de 5 · organización A-001Z · hora H 10:00» («sin organización» mientras el ejercicio no la tenga, con el botón «Crear la organización del ejercicio…»; para la misión …Z: «organización del ejercicio, n tripulación(es)»). Sus acciones — «Añadir una tripulación…», «Retirar esta tripulación…», «Crear la organización del ejercicio…», «Abrir la organización» — se describen en «Seis caminos a mano».

El panel «Importar otra misión: archivos, texto pegado, encargo a ChatGPT» está abierto cuando no hay ninguna misión cargada:
- «YAML y/o Markdown»: seleccione juntos `mission<ID>.yaml` y `summary<ID>.md`, o haga clic en «o pegar su contenido…» y después en «Leer la misión»;
- «Mapas o ZIP entregado por el generador»: elija directamente el ZIP del estudio; los PNG y el mapa de conjunto se asocian automáticamente;
- «Encargar una misión a ChatGPT»: el mismo formulario que el de las órdenes de vuelo (tipo, subtipo, teatro, serie, equipos, aeronaves…). «Encargar: copiar el prompt y abrir ChatGPT» copia el prompt, abre ChatGPT en una pestaña nueva e inscribe el encargo en el registro («encargada»). En el nivel Diseño, este plegable solo aparece cuando el botón «Encargar a ChatGPT…» lo abre; en el nivel Experto, figura también, plegado, en el panel. **«Crear el esqueleto aquí»** (solo en el generador, junto al botón de encargo) hace lo mismo sin ChatGPT: con los mismos ajustes, crea la(s) misión(es) completa(s) sin relato — una por equipo en vuelo (aeronave e indicativo elegidos, o tomados de la flota: aeronaves de las categorías del prompt adecuadas a la familia; reabastecimiento: un cisterna y después receptores; nada adecuado: aeronave a completar), aeródromo de salida y llegada en la base de la aeronave, blanco, puntos de viraje, un encuentro por equipo si «Encuentro» vale «con», zona de trabajo, reabastecimiento planificado con un eje AAR (ARIP, ARCP) si «sí», tiempos según la duración, mapas previstos con su descripción, objetivo principal, riesgos, introducción y cronología vacíos; con «Ejercicio coordinado: sí», la misión de organización …Z (hora H, participantes, eventos H, H+15 min…). Las misiones se abren en lote; la línea «Esqueleto: n punto(s) a colocar, m texto(s) a escribir — después el estudio para los mapas» cuenta lo que queda, cada campo vacío se enmarca hasta rellenarlo, y «Abrir en el estudio» pasa al estudio cartográfico para colocar los puntos y generar los mapas. El teatro por defecto es el de la base de la aeronave de la primera tripulación (LFQP: métropole); el indicativo viene de la flota, si no de la tabla de indicativos para ese tipo (RAFFUT01, RAFFUT02…), y el nombre de cada equipo lo sigue.

Una misión recibida se inscribe en el registro y se guarda en su carpeta si la carpeta de misiones está autorizada; si no, haga clic en «Archivar en la carpeta de misiones…». Enlace «Abrir el registro ↗».
El texto recibido se guarda en `recu/`; recibida de nuevo, una misión solo sustituye a la anterior si sus datos cambian: la antigua va a `versions/` y se conservan los ajustes del estudio de los mapas del mismo nombre. El pegado acepta la respuesta entera de ChatGPT (varias misiones: un lote); los archivos anexos de una serie (VALIDATION.txt, manifiesto) se descartan y se señalan. Una misión cuya operación anuncia otras misiones ya muestra ◀ ▶ (misiones ausentes «por cargar»): pegadas o abiertas después, se unen a la operación. El lote es común al generador y al estudio; cada misión conserva sus cambios al pasar de una a otra.

### Paso a paso

Una misión nueva (nunca guardada, o un esqueleto) se abre en entrada guiada en los niveles 1 a 3; en el nivel Experto, la abre el botón «Paso a paso» del bloque Misión. Un carril de seis pasos, uno abierto a la vez, «Siguiente →» abajo; «Mostrar todo» devuelve el diseño completo (y «Paso a paso» vuelve a él). Son los mismos datos que los bloques: nada se pierde al pasar de uno a otro. Un valor propuesto se coloca en el campo, enmarcado con trazos y la etiqueta «propuesto ✓» (hacer clic confirma, modificarlo también); un aviso es una línea bajo el campo, con su corrección en un clic cuando existe.

| Paso | Lo que se introduce | Propuestas | Avisos |
|---|---|---|---|
| 1 Marco | familia, subtipo, identificador (bloque Identificación), teatro, tiempo de vuelo, aeronave e indicativo, salida y llegada | teatro de la base de la aeronave, indicativo de la flota, equipo nombrado según él, salida = base | teatro ≠ salida («Poner …»), aeronave fuera de la familia, sin indicativo, salida sin coordenadas |
| 2 Lugares | objetivo, zonas (radio), puntos de viraje, encuentros (participantes); «+ Objetivo», «+ Zona de trabajo», «+ Punto de viraje», «+ Encuentro» | búsqueda de aeródromos, radiobalizas, puntos y ciudades; entrada y salida a 15 NM del objetivo en la ruta | lugar sin coordenadas («Colocar en el estudio»), zona sin radio, encuentro sin participantes |
| 3 Relato | título, resumen, descripción detallada | esbozo a partir del marco y los lugares, por reescribir | título vacío, resumen de más de 600 caracteres |
| 4 Objetivos y riesgos | objetivo principal, secundarios, riesgos en una tabla (peligro, nivel, consecuencia, medida); «Pegar una tabla de riesgos» | — | varios objetivos numerados («Repartir en secundarios»), riesgo sin medida |
| 5 Cronología | eventos a H+n (H = despegue previsto) | eventos de la ruta: llegada a cada punto, fin del trabajo, regreso, a las horas del cálculo de duración | evento tras el final de la franja estimada |
| 6 Mapas y documentos | mapas previstos, guardado, luego mapas en el estudio y documentos | mapas a partir de los lugares (general, objetivo, detalle del objetivo, cada encuentro, cada zona) | mapa centrado en un lugar sin coordenadas («Colocar en el estudio») |

«Pegar una tabla de puntos» (paso Lugares, y bloque «Todos los datos YAML»): pegue una tabla de hoja de cálculo, Markdown o texto, una línea por lugar. Se reconocen el separador (tabulador, «|», «;», «,») y el encabezado (nombre, lat, lon o latitud, longitud, coordenadas, tipo o rol, tiempo, id); sin encabezado, las columnas son nombre, lat, lon, rol. Coordenadas en decimal, en DMS (48°46'05"N 7°12'18"E) o en grados-minutos (N48 46.1 E007 12.3). Una línea sin coordenadas se busca entre los lugares conocidos (aeródromos, radiobalizas, puntos, ciudades; nombre exacto). El tipo «objetivo», «zona» o «encuentro» clasifica la línea; si no, es un punto de viraje; el orden de las líneas pasa a ser el orden de ruta. Una vista previa (nombre, coordenadas encontradas, clasificado como, por colocar) precede a «Añadir n puntos»; los lugares no encontrados llegan sin coordenadas y cuentan entre los puntos por colocar.

### Encargar una misión

En el bloque Misión, «Encargar a ChatGPT…» despliega este formulario (el mismo que el de las órdenes de vuelo); el registro ya no encarga nada.
1. Ajuste «Tipo», «Subtipo», «Teatro» («País» para el extranjero), «Equipos en vuelo», «Equipos en tierra» y «Duración» (XS a XL).
2. Si es necesario, despliegue «Más opciones»: «Segundo teatro» («País» para el extranjero), «Serie» (vacío = la siguiente), «Identificador» (calculado, de solo lectura), «Encuentro», «Traducciones», «Reabastecimiento en vuelo», «Ejercicio coordinado» (sí: misión de organización …Z; no: nunca; libre: según el escenario) y la aeronave de cada equipo en vuelo A, B… (vacío = automático). Este plegable está abierto en el nivel Experto; en los demás niveles, se abre por sí solo cuando uno de sus ajustes se aparta del valor por defecto.
3. Haga clic en «Encargar: copiar el prompt y abrir ChatGPT», pegue en ChatGPT (Ctrl+V) y envíe.

«Traducciones» («en» por defecto; «en, de, es»; vacío = solo francés): ChatGPT añade al YAML el brief traducido
(bloque `i18n`), que «Mis misiones» muestra en el idioma del piloto; un campo no traducido queda en francés.

La misión aparece en el registro con el estado «encargada». Pegue después la respuesta de ChatGPT en el panel «Respuesta de ChatGPT» de su ficha en el registro (o cárguela aquí), o guarde los archivos en la carpeta de misiones y haga clic en «Releer la carpeta»: el encargo se asocia con la misión generada (misma serie). Los ajustes se recuerdan.

### Operación

Bloque que aparece cuando la operación tiene varias misiones o una organización (una misión sola la describe la línea Operación del bloque Misión). Su primera línea usa las mismas palabras: «Operación BOXING GLOVES (A-001): 5 tripulación(es) · organización A-001Z · hora H 10:00».
- Cada misión de la operación es un botón: identificador, indicativo u «Organización», hora de despegue. Haga clic para mostrarla. «no cargada» o «por crear» señalan una misión que falta en el lote.
- «Crear la organización del ejercicio» crea la misión …Z (briefing general, hora H, participantes, blancos, cronología) y retoma las pistas y los injects de las misiones del formato antiguo.
- «Crear las misiones de los blancos jugados (n)»: cada blanco jugado se convierte en una misión de la operación (base de la primera tripulación, ruta de la pista, despegue calculado). Compruebe después aeronave, base y horario, abra cada una en el estudio y, por último, «Guardar en la carpeta».

### Seis caminos a mano

Todo se crea a mano; cada caso tiene su camino, y sus acciones están en la línea Operación del bloque Misión. Una *misión* es una aeronave y su tripulación; una *operación* reúne las misiones de una misma raíz de identificador (letras A, B…); la *organización* (letra Z) lleva el ejercicio: hora H, participantes, blancos, cronología.

| Caso | Camino | Línea Operación |
|---|---|---|
| 1 — Misión autónoma, una aeronave | «Nueva misión», o «Crear el esqueleto aquí» con una tripulación y «Ejercicio coordinado» no, o ChatGPT | «Misión autónoma (sin operación)» · «Añadir una tripulación…» |
| 2 — Misión autónoma, varias aeronaves (una misión y un brief cada una) | Esqueleto con n tripulaciones, ejercicio no; o el caso 1 y luego «Añadir una tripulación…» (n − 1 veces) | «Operación X-016: tripulación A de 2 · sin organización» · «Añadir una tripulación…», «Retirar esta tripulación…», «Crear la organización del ejercicio…» |
| 3 — Misión autónoma, una aeronave, eventos horarios y puntos de viraje | El caso 1 y luego la sección de texto «Cronología»: eventos a H+n (H = despegue previsto) en un punto de viraje, un encuentro o una zona de la misión, o en texto libre; los puntos de viraje conservan su tiempo sobre la zona | Como el caso 1 |
| 4 — Misión autónoma que pasa a coordinada, varias aeronaves | «Añadir una tripulación…»: la misión pasa a ser la tripulación A (M-016 → M-016A), la misión B toma el contexto común y tiene su propio brief; repetir para C… | «Operación M-016: tripulación A de 2 · sin organización» |
| 5 — Ejercicio coordinado desde el principio | Esqueleto con n tripulaciones y «Ejercicio coordinado» sí (misiones A… y Z), o ChatGPT | «Operación X-016: tripulación A de 3 · organización X-016Z · hora H 10:00» · «Abrir la organización» |
| 6 — Misiones coordinadas que pasan a ser una operación con organización | «Crear la organización del ejercicio…»: misión Z con hora H, participantes tomados de las misiones, blancos y cronología vacíos, brief general propuesto | Como el caso 5 |

Cada acción dice primero lo que va a crear o retirar, identificadores incluidos. «Retirar esta tripulación…» retira la misión del lote y de las listas de la operación; si solo queda una tripulación sin organización, vuelve a ser una misión autónoma (M-016A → M-016). Una misión ya guardada se elimina desde el registro («Eliminar…»). El estudio sigue el lote. Tras un cambio de operación, guarde cada misión modificada.

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

Una línea señala un teatro que no corresponde al aeródromo de salida (código OACI: LF… métropole, LFK… Corse, TFF… Antilles, SO… Guyane, FME… Réunion, FMCZ Mayotte, NW… Nouvelle-Calédonie, NT… Polynésie): «Teatro Polynésie, salida en métropole (LFQP).»; el botón «Poner métropole» corrige el teatro.

### Duración estimada

Estimación del vuelo a partir de la ruta probable y de la aeronave; se recalcula con cada cambio. Oculto en una misión de organización.
- «Tránsito»: «automático (según aeronave y nivel)», «aerovías (IFR)», «RTBA (baja altura)» o «directo». La elección se escribe en la misión.
- «Parámetros del cálculo de rutas (comunes a todas las misiones)» (nivel Experto): los mismos campos que en Ajustes › Centro, con «Valores por defecto».
- Visualización: «Vuelo estimado», «Bloque», ida / sobre la zona / vuelta, distancia; opciones de regreso y briefings sucesivos si procede.
- Los **tiempos comprobados** (informes de misiones con la misma salida y los mismos puntos) sustituyen al cálculo cuando existen.
- Una tabla compara la estimación con los informes ya hechos de la misión (vuelo real, diferencia).
- Casilla «Mostrar la ruta probable»: croquis y tabla de los tramos.

Reglas del cálculo:
- Ruta probable: salida, puntos en el orden de la misión (si no, el recorrido del estudio; en su defecto, los puntos de viraje en orden y cada punto de trabajo — objetivo, encuentro, zona — donde menos alarga la ruta) y después el destino o, si no, el aeródromo de salida.
- Velocidad y variómetro: los de la misión, si no el perfil del planificador de combustible del mismo tipo, si no la ficha EUROCONTROL, si no un valor típico (helicóptero, turbohélice, reactor); un tramo demasiado corto para alcanzar el nivel se vuela más bajo.
- Tiempo sobre la zona: el de los puntos, si no un valor típico según la familia y la función (toma, izado, búsqueda, hipódromo…). Bloque = vuelo + 15 min (5 min para un helicóptero).
- Tránsito automático: avión en IFR (crucero a partir de 6500 ft) por las aerovías abiertas a su nivel, entrada y salida directas a 60 NM como máximo, directo si el rodeo supera el 40 %; avión a baja altura (combate, transporte táctico: hasta 1500 ft) por las zonas de la RTBA conectadas (150 NM, 80 %); helicóptero y VFR en directo. Solo se enrutan los tránsitos de más de 40 NM. Son los valores por defecto de los «Parámetros del cálculo de rutas». El bloque dice por qué un tránsito sigue siendo directo (fuera de la cobertura de los datos, tramo corto, sin camino, rodeo excesivo).

Límite: sin base SIA en el navegador, las rutas siguen siendo directas; un aviso invita a releer la carpeta SIA.

### Zonas que activar

Lista de las zonas R, D, TRA y de la RTBA atravesadas por la ruta probable y las zonas de trabajo, con gestor, límites, modo de activación y punto de intersección. Las zonas P se señalan «a evitar».
- Misión de organización: zonas de todas las misiones de las tripulaciones (solicitudes hechas por la organización).
- Misión de un ejercicio coordinado: lista solo a título informativo.
- Misión aislada: solicitudes que debe hacer la tripulación; la lista se incluye en el briefing PDF.

Límite: cálculo indicativo, que no sustituye ni los mapas AZBA ni los NOTAM. Sin base SIA, el bloque indica dónde leerla (Ajustes › Mantenimiento › Datos aeronáuticos, o línea «Base SIA» del bloque Misión del estudio).

### Ejercicio

Bloque que aparece en una misión de ejercicio.

Una operación pasa a ser un ejercicio cuando no todos lo saben todo al despegar (pistas por descubrir, mensajes en vuelo, sobres, situación que cambia). La organización lo ve todo; cada tripulación solo recibe los eventos que se le dirigen (o a todos) y solo conoce las pistas que estos revelan; un blanco jugado recibe su ruta, su hora de salida, sus consignas y su mapa. Horas respecto a H (H, T o M: el mismo instante; «H+1h30mn», «H-20mn»; sin unidad, minutos); un evento disparado por un punto cae en el despegue del participante + tiempo estimado hasta el punto + plazo. Un blanco jugado tiene su propia misión en la operación (función blanco): registro, asignación y Mis misiones como una tripulación.

En la misión de organización (…Z), editor completo:
- «Hora H y participantes»: «Hora H (etiqueta u hora real)» y después una línea por participante («Indicativo», «Misión», «Despegue (H-20mn, H+1h)», «Función»); «+ Participante», «Tomar las misiones de la operación».
- «Blancos de ejercicio»: pistas que reconocer, interceptar o escoltar (nombre, «Jugado», indicativo, salida, naturaleza, puntos, nivel, velocidad, lo que las tripulaciones deben establecer, consignas); «+ Blanco», «Importar una tabla Markdown de pistas».
- «Cronología»: un evento por tarjeta («Disparador»: hora o paso por un punto; «Forma»: mensaje de radio o sobre sellado; «Emisor», «Título», «Destinatarios», «Pistas reveladas», texto); «+ Mensaje de radio», «+ Sobre sellado», «Quitar este evento».
- «Lo que recibe cada uno»: resumen por destinatario.

En una misión de tripulación, el bloque se titula «Ejercicio: lo que recibe esta tripulación» y es de solo lectura. La línea «Mapas de ejercicio» indica los mapas cargados o por generar en el estudio.

### Textos de la misión

«Resumen», «Descripción detallada» y después las secciones: «Añadir una sección de texto» propone los tipos que el brief y el informe saben colocar (Introducción, Objetivo principal, Objetivos secundarios, Equipos implicados, Puntos de viraje, Encuentros, Reabastecimiento en vuelo, Riesgos a tener en cuenta, Carga / personal, Coordinación, Cronología, Cartografía prevista, Notas), cada uno con una línea que dice dónde aparece y qué se escribe en él, y después «Texto libre». Cada sección lleva su tipo, elegido en una lista y modificable después (el contenido le sigue); un tipo solo sirve una vez (ya usado: en gris), salvo «Texto libre», que tiene un título a escribir, se añade tantas veces como se quiera y va al final del brief. Objetivos, riesgos y notas se escriben en el YAML bajo su clave (`objectives.primary`, `objectives.secondary`, `risks`, `notes`; un valor por línea en las listas); las demás completan en el brief la sección del mismo nombre. El brief guardado (`summary<ID>.md`) es una representación del YAML: releído con el YAML, solo devuelve estas secciones (marcadas en el archivo con un comentario invisible), nunca las secciones que toma del YAML; un archivo `.md` solo sigue siendo una fuente completa, a partir de la cual se construye el YAML. Cada sección tiene «Contenido» y «Eliminar».
Si el archivo recibido no tiene ni resumen ni descripción, se proponen a partir de los datos: reléalos.
En una misión de organización, el bloque pasa a ser «Briefing general»: situación, objetivos comunes, franjas, criterios de fin, entregado a todos.

La sección «Cronología» («Añadir una sección de texto») lleva también los eventos horarios de la misión, encima de su texto libre: hora (H+30mn; H = despegue previsto), lugar de la misión (salida, punto de viraje, encuentro, zona, objetivo, llegada) o texto libre, lo que ocurre; «+ Evento» añade una línea. El brief los imprime al principio de la sección Cronología, por orden horario. Misión de organización: la cronología del ejercicio se ajusta en el bloque Ejercicio.

Riesgos: uno por línea, columnas separadas por un tabulador (tabla pegada), «—», «|» o «;»; una columna de nivel (Crítico, Alto, Moderado, Bajo, en cuatro idiomas, asterisco conservado) se reconoce esté donde esté; dos columnas restantes dan el peligro y la medida, tres el peligro, la consecuencia y la medida. El nivel se imprime en el brief y el PDF. Una línea sin separador («Prioridad absoluta: …») no es un riesgo: al salir de la sección, pasa a Notas. Objetivo principal: una frase; una lista numerada se reparte (el primer elemento queda, los demás pasan al principio de los Objetivos secundarios); se quitan números y viñetas. Una misión abierta que no sigue estas reglas se ordena al abrirla (la línea de estado lo dice, «Guardar en la carpeta» lo escribe).

### Todos los datos YAML

Bloque del nivel Experto, oculto por defecto: haga clic en «Mostrar» en su cabecera.
- Editor sin esquema impuesto: cada clave del YAML se puede modificar y los campos desconocidos se conservan. El tipo de una aeronave propone la base de tipos (lista desplegable con búsqueda).
- Listas: «Añadir un elemento», × para quitar un elemento.
- «Nombre de un nuevo campo raíz» y después «Añadir» crea una clave de primer nivel.

Resérvelo a las correcciones que los demás bloques no permiten.

El nombre de un lugar (salida, llegada, objetivo, punto de viraje, encuentro, zona) se busca al escribir: aeródromos, radiobalizas, puntos, VRP y luego ciudades; un lugar elegido fija sus coordenadas. Salida y llegada son por defecto la base de la aeronave (descripción emergente). El indicativo de una aeronave propone los de la flota para su tipo; el nombre del equipo (y los participantes de los encuentros) sigue al indicativo.

«Pegar una tabla de puntos» (paso Lugares, y bloque «Todos los datos YAML»): pegue una tabla de hoja de cálculo, Markdown o texto, una línea por lugar. Se reconocen el separador (tabulador, «|», «;», «,») y el encabezado (nombre, lat, lon o latitud, longitud, coordenadas, tipo o rol, tiempo, id); sin encabezado, las columnas son nombre, lat, lon, rol. Coordenadas en decimal, en DMS (48°46'05"N 7°12'18"E) o en grados-minutos (N48 46.1 E007 12.3). Una línea sin coordenadas se busca entre los lugares conocidos (aeródromos, radiobalizas, puntos, ciudades; nombre exacto). El tipo «objetivo», «zona» o «encuentro» clasifica la línea; si no, es un punto de viraje; el orden de las líneas pasa a ser el orden de ruta. Una vista previa (nombre, coordenadas encontradas, clasificado como, por colocar) precede a «Añadir n puntos»; los lugares no encontrados llegan sin coordenadas y cuentan entre los puntos por colocar.

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

«Dossier de operación (un PDF)»: portada (operación, misiones y equipos, encuentros comunes, mapa de la operación si el ZIP del estudio está cargado) y después el brief de cada misión a continuación.
El briefing de la tripulación contiene sus sobres sellados y los mapas; la línea de estado lista los mapas no adjuntos. Cargue los mapas antes de exportar.
Cada sobre sellado ocupa una página tras los mapas, seguida de su mapa de ejercicio; el mapa de un mensaje de radio tiene su propia página «a entregar al recibir el mensaje».

## Estudio cartográfico
<!-- page: apps/cpco/map_parser.html -->

El estudio produce los mapas del dosier de misión a partir de los datos del SIA (ciclo AIRAC): ruta, corte vertical, mapas en PNG o SVG, ZIP y mapa de conjunto.
Acceso: barra lateral «Misiones», pestaña «Estudio cartográfico» (nivel Experto, 4), ☰ › «Estudio cartográfico (SIA)», o «Abrir en el estudio» en el registro.
Trabaja sobre la misión compartida con el generador. Detalles técnicos: [misiones y mapas](../technique/FRAMEWORK.md).

### Misión

- Línea de estado de la misión cargada y botón «Guardar en la carpeta»: escribe la misión y los ajustes del estudio (perfil y encuadre de cada mapa, trazados, pistas) en `mission<ID>.yaml`. El resultado aparece junto al botón y en una notificación. Debajo, la misma línea de estado que en el generador, con «Deshacer los cambios».
- Línea «Base SIA»: ciclo AIRAC, número de espacios y de celdas MORA, enlace a Ajustes › Mantenimiento › Datos aeronáuticos. El estudio ya no tiene bloque «Base de datos SIA»: su panel (carpeta, relectura, indicador, informe) solo aparece bajo esta línea cuando hace falta — «Construir la base ahora», base ausente o por reconstruir. La base se gestiona en Ajustes › Mantenimiento › Datos aeronáuticos («Reconstruir la base aeronáutica»).
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

Mapa de control: listas «Mapa» y «Perfil», casilla «ZIP», «Actualizar», «Mantener este encuadre» (el mapa generado tomará el encuadre mostrado), «Recentrar», «Encuadre automático», «⧉ Ventana» (el mismo mapa interactivo en una ventana aparte, sin el resto del estudio: desplazar, ampliar con la rueda o un pellizco, arrastrar los puntos como aquí; barra «◀ lista ▶», «Recentrar», «Actualizar», «Abrir en el estudio», «Cerrar»; teclas ← → + − 0 Esc; sigue los ajustes del estudio), «⤢ Ampliar» (Esc para volver). En el mapa: arrastre un punto, haga clic en la ruta para insertar uno, clic derecho para eliminarlo.
«Ajustes del perfil: corte, aeronave, variómetro, salidas»: suelo y techo del corte, aeronave, ascenso y descenso, imagen `profil_vertical.png` en las salidas, trazado por defecto del recorrido.
«Trazar» dibuja el corte bajo el mapa (clic: ampliar): relieve a lo largo de la ruta (± 1 km), obstáculos a menos de 1 NM y espacios atravesados según el perfil de `profil_vertical.png` (suelos ASFC que siguen el relieve), puntos con distancias acumuladas, trayectoria prevista en violeta con TOC y TOD. El ascenso sigue la aeronave elegida (perfiles del planificador de combustible), si no los regímenes introducidos; sin nivel ni altitud (VFR), no hay trayectoria. Techo 0 = automático (relieve, obstáculos, altitudes previstas y suelos de los espacios atravesados, hasta el FL 195).
Ruta, nivel, suelo, techo y salida se escriben en la misión (`vertical_profile`): el generador los ve. `profil_vertical.png` es un mapa de la lista; va en el ZIP y al final del brief PDF.

### Puntos que colocar

Una misión sin coordenadas (esqueleto del generador) muestra en el bloque Ruta el panel «Puntos que colocar (n)»: salida, blanco, puntos de viraje, encuentros, centros de zonas y aeródromos sin posición, en el orden de la ruta.
- «Pulsar el mapa»: la línea queda elegida, el cursor pasa a cruz; un clic en el mapa de control coloca el punto (Esc cancela).
- Campo de búsqueda: aeródromo, radiobaliza, punto designado, punto VFR o eje AAR («LFLY», «OLIVIA ARIP») de la base SIA, por código o nombre, o coordenadas «45.72, 4.94».
- Un punto colocado se mueve arrastrándolo en el mapa; una zona toma un radio en km. Salida y llegada idénticas se colocan juntas.
- Las coordenadas van a la misión compartida: el generador ve bajar su cuenta de «puntos que colocar». Todo colocado: «Generar los mapas y el ZIP».

La búsqueda propone también ciudades (nombres GeoNames, después de aeródromos, radiobalizas y puntos): «Guipry», «Pont-Réan»…; 40 sugerencias como máximo, al escribir.

### Mapas que producir

«Mapas de la misión»: una línea por mapa.
- Clic en el nombre: muestra el mapa en el mapa de control (✎ = encuadre modificado).
- Perfil de visualización, o «Desactivado» (mapa ni generado, ni previsualizado, ni en el mapa de conjunto).
- Trazado: «Sin trazado», «Briefing: recorrido», «Organización: ruta probable», «Recorrido + ruta probable».
- Destinatario del ejercicio (si el ejercicio tiene pistas): sin pistas, organización, un blanco, o una tripulación después de tal mensaje o sobre.
- Casilla «ZIP» (desmarcada: mapa no generado; elección no guardada en la misión) y × para eliminar.

Para añadir: nombre, tipo («general», «objetivo», «detalle», «zona») y después «+ Mapa» (extensión = vista mostrada); «+ Mapas de ejercicio» añade los mapas de la organización, de los blancos jugados o de la tripulación.
«Ajustes del perfil …» (plegado): «Nombre del perfil», «Mapa de fondo», «Guardar», «Nuevo», «Duplicar», «Eliminar» y después cuatro pestañas: «Mapa de fondo», «Espacios», «Símbolos OACI», «Elementos». El perfil modificado es siempre el del mapa elegido; los perfiles son comunes a todas las misiones y se guardan en este navegador. Las listas de sugerencias de los campos de entrada (zonas, aeródromos, balizas: hasta 13 000 entradas de la base SIA) solo se rellenan cuando hace clic en el campo correspondiente, no al abrir la página.

**Perfil propuesto** a un mapa que no lo tiene: «VFR detallado» para los mapas de objetivo, detalle y encuentro, «VFR simplificado» para la aproximación, «IFR simplificado» para el mapa principal y las vistas de conjunto (general, zona…). `profil_vertical.png` toma «Perfil vertical», creado de oficio (todas las familias de espacios, ningún otro elemento); su extensión sigue el recorrido.

**Extensión** de un mapa: el encuadre guardado («Mantener este encuadre»), si no el centro y el radio o la anchura × altura que da la misión (polígono de la zona para un mapa de zona), si no el encuadre automático, en el formato de las salidas (16/10): vista general, todos los puntos y zonas con un 12 % de margen; mapa de zona, la zona con un 20 %; detalle, 8 × 5 km; objetivo, 100 × 62 km; otro mapa, 220 × 140 km.

Pestañas de los ajustes del perfil:
- «Mapa de fondo»: OSM estándar, OpenTopoMap (relieve y curvas), OSM Shortbread, OpenFreeMap Liberty / Bright / Positron, VersaTiles Colorful / Graybeard / Shadow / Eclipse; capas OSM (suelo, hidrografía, carreteras / ferrocarril, edificios, fronteras, relieve sombreado, curvas de nivel, cimas). «Ciudades y aglomeraciones»: ciudades con símbolos OACI por encima de un umbral de población (≥ 100 000 hab. mancha naranja, ≥ 20 000 amarilla con borde naranja, localidad punto amarillo), nombres por encima del suyo (las más pobladas primero), superficies edificadas (ninguna, contorno, relleno, ambos) alrededor de las ciudades bastante pobladas; los archivos del SIA no dan ningún contorno de aglomeración.
- «Espacios»: familias R / D / P, controlados (CTR, TMA, CTA, SIV), otros (TRA, RMZ, TMZ, PJE); «Simbología de cartas OACI» (clases A rojo, B / C / D azul, E azul claro; R / D rayadas, P cuadriculadas, RTBA; cruz roja para una zona demasiado pequeña; cartuchos nombre / techo / suelo); franja mostrada (suelo, techo en ft); opacidad, nombres, «Nombres abreviados» (también en el corte), altitudes. «Selección de espacios»: lista blanca (solo estas zonas; vacía = todas las zonas de las familias marcadas) o lista negra (todas salvo estas); se ignoran espacios, guiones y acentos («LF-R 45 A» = «R 45 A»); «R 166» propone el grupo de sus subzonas, un fragmento retiene todas las zonas que lo contienen; «Pegar una lista…», «Eliminar todo»; «Alias» comunes a todos los perfiles («@RTBA» propuesto a partir de la base SIA, modificable). La lista dice qué zonas trazar, no su activación.
- «Símbolos OACI»: aeródromos (longitud y revestimiento de pista, helipuerto; abiertos a la CAP en azul, restringidos en claro, de Estado en rojo; filtros por categoría y «Control»), radionavegación (VOR, TACAN, DME, NDB, ILS; rosa de los VOR en vista detallada), aerovías inferiores y superiores, tracks NAT del día, puntos de notificación VFR y puntos RNAV, sobrevuelo prohibido (⊗ rojo), parques y reservas (verde), obstáculos (≥ 300, 500 o 1000 ft AGL). Aeródromos y balizas tienen su lista blanca o negra («LFOJ», «LFR*», nombre). Dos balizas que se solapan: queda la más importante (TACAN, luego VOR, DME, NDB, ILS).
- «Elementos»: puntos de viraje (tamaño, colores), meridianos y paralelos, cuadrícula MORA (valores, opacidad, separación mínima), nombres de las ciudades, circuito de reabastecimiento, «Zonas de misión y de búsqueda» (búsqueda en magenta, misión en violeta, exclusión en rojo, nombre al norte).
- Al final de los ajustes, para el mapa de la aplicación (V3): «Umbrales de zoom de la aplicación (V3): de … a …» (26 elementos: familias de espacios, nombres, aerovías, radioayudas, puntos de notificación, obstáculos, MORA, ciudades, retícula, AAR, NAT, viento, curvas de nivel; zoom MapLibre del mapa de la aplicación, 24: sin límite, vacío: siempre visible; los mapas de misión no lo usan) y «Perfiles de la aplicación (V3)»: un perfil por modo del mapa de la aplicación (Auto, IFR bajo, IFR alto, VFR, Topo, CAM), compartido por la aerolínea en `airline/map_profiles.json` del repositorio de datos. «Llevar al estudio» lo convierte en un perfil «Aplicación — modo» que se ajusta aquí, «Guardar para la aplicación» escribe el perfil mostrado para ese modo tras confirmación (el archivo se vuelve a leer justo antes; se conservan los demás modos y los ajustes propios de la aplicación); «Sincronizar» lo comparte. Ausente de Mapas de vuelo.

Circuito de reabastecimiento: «Automático» retiene el eje ENR 5.7 del que algunos puntos (ARIP, ARCP, S1, S2) están a menos de 2 km de un punto de la misión, o cuyo nombre figura en la misión (se muestra la razón); otros ejes se marcan en la lista; si no hay nada marcado, ningún circuito. Rama de regreso desplazada 14 NM hacia el lado publicado; lado no publicado: punteado.

Los nombres no se solapan: primero los puntos de la misión y las ciudades, después los símbolos OACI, los nombres de las zonas (en el centro de la zona, si no a lo largo del contorno, si no no se escriben), la cuadrícula y los valores MORA.

«+ Mapas de ejercicio» nombra los mapas `organisation_<Z>.png`, `chiffon_<piste>_<Z>.png` (retomado en la ficha del blanco) y `exercice_<événement>_<mission>.png`.

### Vistas previas y generación

- «Mostrar todos los mapas»: vistas previas de todos los mapas; no crean ningún archivo.
- «Generar los mapas y el ZIP» (también en el pie de página): produce cada mapa con la casilla «ZIP» marcada, el mapa de conjunto y, si la opción está marcada, el perfil vertical, y después descarga el ZIP.
- Los PNG se guardan en `cartes/` de la carpeta de la misión (visibles en el registro). Si no, use «Archivar los mapas en la carpeta» en el pie de página.
- Un mapa que falla no detiene los demás: el ZIP contiene `rapport_generation.txt` y «Reintentar solo este» vuelve a lanzar ese mapa. «fondo parcial» señala un mapa de fondo lento.
- Mapa de fondo con error: el mapa de control explica la causa, pasa a OSM estándar y propone «Copiar el informe de error» (detalle técnico a transmitir).
- Lote de varias misiones: «Generar las n misiones» produce un único ZIP, con una carpeta por misión y el mapa de la operación.
- Lote: «Mostrar todos los mapas (n misiones)» agrupa las vistas previas por misión, encabezadas por el mapa de la operación (`carte_operation.png`: puntos de todas las misiones, encuentros comunes una sola vez, trayecto de cada equipo en su color, leyenda); está en la raíz del ZIP.
- Mantenga la pestaña visible durante la generación: el navegador ralentiza las pestañas en segundo plano y un mapa puede fallar («Tiempo agotado durante la carga del mapa de fondo»); «Reintentar solo este» lo vuelve a lanzar.
- «Detener» (barra de progreso, tanto en las vistas previas como en la generación): el mapa en curso se termina y los siguientes no se hacen. Una generación detenida no descarga ningún ZIP y no guarda nada en la carpeta de la misión; un lote detenido indica cuántas misiones están terminadas (sus mapas ya están guardados en su carpeta); las vistas previas ya mostradas se quedan.

Tipo de salida (PNG, SVG editable) y anchura de los PNG: menú ☰ › «Salidas de mapas». El mapa de conjunto siempre se incluye; aparece al pie del bloque.

## Registro de misiones
<!-- page: apps/cpco/mission_registry.html -->

El registro recoge todas las misiones generadas o encargadas, con su seguimiento por el Centro: estado, fecha de vuelo, notas, informes.
Sirve para elegir una misión, abrirla en el generador o en el estudio, asignarla a pilotos, crear su informe e importar la respuesta de una misión encargada.
Acceso: barra lateral «Misiones», que se abre en el registro (pestaña «Registro»), o ☰ › «Registro de misiones (SIA)». Arriba, «Nueva misión» abre el generador con una misión nueva: la creación se hace allí. El registro consulta, guarda, duplica, elimina e importa lo que llega (archivos, respuesta de ChatGPT de una misión encargada).
Según el nivel de uso: la página se ofrece a partir del nivel Diseño (3), con lo esencial: «Añadir archivos…» y «Releer la carpeta», cuatro filtros y «Más filtros», una tabla de siete columnas, una ficha sin el estudio y el formulario de encargo simplificado. El resto está en el nivel Experto (4), como se indica a continuación.

### Misiones del registro

En la cabecera: número de misiones, reparto por estado y fecha de actualización.

| Botón | Efecto |
|---|---|
| «Carpeta de misiones: …» (nivel Experto) | Elige la carpeta `data/missions` y después la relee |
| «Releer la carpeta» | Relee todas las misiones de la carpeta; la pide si aún no está autorizada |
| «Añadir archivos…» | Añade `mission<ID>.yaml` / `summary<ID>.md` (cualquier navegador) |
| «Escribir mission_registry.yaml» (nivel Experto) | Escribe el registro en la carpeta de misiones |
| «Limpiar el registro (n)» (nivel Experto) | Quita las misiones con «archivo ausente» tras releer |

La carpeta se relee automáticamente al abrir la página si ya está autorizada. La lectura muestra una barra de progreso con «Detener»: el registro queda sin cambios.
Al limpiar, el estado, las notas y la fecha de vuelo pasan a la misión que sustituye a una misión renumerada.

### Elegir una misión

Filtros: «Tipo», «Estado», «Teatro», «Buscar»; los demás («Subtipo», «Encuentro», «Equipos» (mín. – máx.), «Tipo de equipo / aeronave», «Reabastecimiento») están en «Más filtros», abierto en el nivel Experto o cuando uno de ellos está activo. Se recuerdan.
- «Sortear (n)» elige una misión entre las que pasan los filtros.
- «Borrar filtros», «CSV» (exportación de la selección).
- Tabla ordenada por columna: Misión, Tipo, Título, Equipos, RDV, AAR, Teatro, Estado, «Duración est.», Informes (número de vuelos), «Generada». La barra bajo la tabla ajusta su altura (doble clic: altura por defecto). Las columnas Equipos, RDV, AAR y Teatro solo se muestran en el nivel Experto.
- ✕ quita una misión del registro sin eliminar sus archivos.

Haga clic en una línea para abrir la ficha de la misión, descrita más abajo. El enlace `?mission=M-016` abre directamente la ficha.

### Ficha de la misión

La ficha muestra el estado, el itinerario, los equipos y los indicativos, y después:
- para una operación: sus miembros (haga clic para mostrarlos); «Abrir» carga toda la operación en el generador o en el estudio;
- «Archivos de la misión»: YAML, «Markdown (legible)», «PDF (generador)», «Modificar (generador)», «Mapas (estudio)» (nivel Experto), miniaturas de los mapas, versiones anteriores y textos recibidos;
- estado de los mapas: «completa», «parcial» o «sin mapas»;
- «Duración estimada» con la comparación con los informes.

Botones: «Abrir en el generador», «Duplicar» (copia de la misión, identificador siguiente, abierta en el generador; véase el generador), «Abrir en el estudio», «Asignar…» (salvo organización …Z; véase [asignación de misiones](../technique/AFFECTATION_MISSIONS.md)), «Crear informe» o «Nuevo informe (vuelo n)», y «Volver a copiar el prompt de este encargo» para una misión encargada. «Abrir en el estudio» y «Volver a copiar el prompt de este encargo» están en el nivel Experto.

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

## Planificación ODV
<!-- page: apps/cpco/odv_planning.html -->

La página Planificación ODV reúne las disponibilidades de la semana, las franjas comunes, las misiones probables y las asignaciones. El Centro (CPCO) la utiliza para planificar las misiones y confiarlas a los pilotos libres.
Para abrirla: enlace «Página ODV completa: libro, cuadrícula, exportación…» del bloque «Misiones probables» del Tablero (nivel Experto), o el menú ☰ (páginas del Centro); la página no tiene pestaña y corresponde al nivel de uso Planificación (2). La página forma parte del Centro: mientras el Centro esté bloqueado, un aviso remite a Ajustes › Centro (véase el capítulo siguiente). En modo production, además hay que estar conectado con el rol `admin_centre`.
El libro Excel de la escuadrilla es opcional: sin él, la semana se construye a partir de las disponibilidades declaradas por los pilotos en Mis misiones y de las asignaciones ya guardadas.
Cada bloque se puede mover (asa ↕) u ocultar («Ocultar» / «Mostrar»); la disposición se recuerda para la página.
Los bloques «Franjas comunes» y «Misiones probables» figuran también en el Tablero, en el nivel Experto, ajustados a la semana que muestra (véase el capítulo siguiente).

### Libro ODV

Este bloque carga el libro semanal de la escuadrilla (`.xlsx`). Está **oculto por defecto**: haga clic en «Mostrar» en su cabecera para que aparezca.
- Elija el archivo o suéltelo sobre el campo de archivo. Se lee en el navegador; no se envía nada por la red.
- Al llegar a la página, la suite vuelve a abrir por sí sola el libro `.xlsx` más reciente de la «Carpeta del libro ODV», si está autorizada (Ajustes › Instalación › Fuentes y carpetas). Si no, vuelve a abrir la copia del último libro elegido, guardada en este navegador.
- Elegido a mano, el libro muestra directamente su propia semana.
- Una vez leído el archivo, aparece un resumen: «Archivo», «Semana», «Oficial de guardia», «Tema de la semana», «Pilotos», «Hoja FLOTTE», «Cronología», «Lectura». El «Informe de lectura (n)» lista los avisos (⚠) y las observaciones. Aparece desplegado si contiene al menos un aviso.
- Las anomalías (código fuera de la leyenda, trigrama duplicado, fecha de la cronología desfasada…) se señalan mediante notificaciones flotantes, sin bloquear nunca la lectura.
- Conserve el libro en formato Excel: guardado de nuevo con LibreOffice o Google Sheets, puede perder sus cuadros de texto, y con ellos sus trigramas (se señala).
- Si un piloto del libro aún no tiene preferencias de tipos de misión, la suite las crea a partir de sus códigos (C → caza, T → transporte…) y las escribe en su ficha de usuario.
- «Borrar los datos» vacía la página. El botón sigue en gris mientras no haya ningún libro cargado.
- El enlace «Ajustes › Centro › Planificación ODV» lleva a los ajustes de las franjas y de la lectura del libro.
- Datos personales: no publique las exportaciones. Formato del libro y reglas de lectura: [reglas de lectura del libro](../technique/ODV_ORDRES.md).

### Cuadrícula de disponibilidad

La cuadrícula cruza a los pilotos con los días de la semana y las tres franjas de cada día (M = mañana, A = tarde, S = noche).
- **Elección de la semana**: «◀ Semana anterior», «Semana siguiente ▶», «Esta semana», y «Semana del libro» cuando hay cargado un libro de otra semana. La fuente mostrada es «libro …» o bien «declaraciones de los pilotos y asignaciones (sin libro para esta semana)».
- **Filtros**, recordados en este navegador: «Ocultar las cuadrículas vacías», «Color del trigrama» (color de la forma en el libro, sin efecto en las reglas), «Función (hoja FLOTTE)» o «Función (aeronaves declaradas)» sin libro, «Simulador».
- **Leyenda**: códigos del libro con su número de casillas, y después el bloque «Declaraciones de los pilotos», idéntico al de Mis misiones.
- **Lectura de una casilla**: primero viene el código del libro y después la declaración del piloto. Un recuadro rojo señala a un piloto disponible y no asignado. Un número de misión señala a un piloto asignado.
- **Información emergente**: el comentario de la casilla aparece al pasar el ratón, sin el nombre de su autor; las funciones, los simuladores y la línea del libro aparecen al pasar el ratón por el trigrama.
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
- «Recuperar VATSIM (país preferido)» importa las reservas VATSIM de la semana. Las sesiones ya recuperadas se sustituyen (anulaciones incluidas); las introducidas a mano se conservan. Solo se importan las posiciones del país preferido (Ajustes › Centro › Planificación ODV; Francia metropolitana por defecto); el botón lleva su nombre.
- «Recuperar IVAO (país preferido)» importa igualmente los entrenamientos, exámenes y reservas IVAO de la semana, con la clave de API IVAO de la instalación (Ajustes › Instalación). Estos dos botones son la importación común con el Tablero: un solo archivo, las mismas sesiones en ambas páginas.
- El botón «×» de una línea quita la sesión. La columna «Fuente» indica «recuperada» o «introducida». La tabla muestra primero los entrenamientos, exámenes y eventos (examen y entrenamiento marcados en el margen); las simples reservas de posición, numerosas una vez importadas, se pliegan bajo «n reserva(s) de posición».
- **Efecto en la planificación**: una sesión se cuenta en su franja (★). Un entrenamiento o un examen deja la CTR del aeródromo no disponible para las misiones de esa franja; las TMA que contienen el aeródromo deben evitarse en lo posible.
- Un «TRAINING» o un «EXAMEN» seguido de una posición («EXAMEN LFMN_TWR»), escrito en un carril DIVERS de la cronología del libro o en el comentario de un controlador, cuenta igual.

### Activaciones de zonas por red

Este bloque es el del Tablero (ver «Zonas»): activaciones RTBA, R, D, TRA… de la semana mostrada, VATSIM e IVAO lado a lado, mismos datos. Edición restringida como en el Tablero (Centro activado; en producción, administrador).

### Franjas comunes

Esta tabla cubre los 7 días × 3 franjas. Cada casilla da el número de **pilotos libres**, es decir, disponibles y todavía no asignados.
- Marcas de la casilla: «+n ctrl» (controladores), «✎» (misión ya asignada), «★» (evento o sesión ATC). La información emergente da además los efectivos antes de las asignaciones.
- Filtros: «Al menos N piloto(s)», de 1 a 20 (2 por defecto), y «Simulador común» («indiferente» o un simulador). Se recuerdan con los ajustes ODV. Una casilla por debajo del umbral aparece atenuada.
- Pilotos que se tienen en cuenta: códigos O, SC, C, T, N, S; controladores: AT, AM. Una casilla vacía no se cuenta.
- **Clic en una casilla**: abre la ventana «… — asignar los pilotos libres». Permite modificar las misiones ya asignadas en la franja o planificar otras.

#### Ventana «Asignar los pilotos libres»

Condiciones de apertura: Centro activado y registro de misiones presente en este navegador (si no, abra el registro del Centro y relea la carpeta de misiones).
1. **El día en tres bloques** (Mañana, Tarde, Noche) ocupa la parte superior de la ventana. Cada bloque indica sus horas, el número de pilotos libres y de misiones, y «en curso» para la franja actual. La franja de la ventana aparece resaltada. Al hacer clic en otro bloque se abre esa franja; si quedan elecciones sin guardar, se pide confirmación. La ventana permanece abierta y pasa a esa franja.
2. Los pilotos libres aparecen con los tipos de aeronave que han declarado (en negrita: dominados). Elija una «Familia» («todas»; «(propuesta)» señala la familia propuesta para la franja). La línea «A evitar:» recuerda las CTR y TMA cerradas por una sesión ATC.
3. En la matriz, marque una misión (columna «Planificar»). Elija después la «Aeronave» (lista desplegable con búsqueda, como en la ventana de asignación): la lista va de la más cercana a la más lejana de la salida e indica «en el lugar» o la duración del traslado. Elija por último el «Piloto»: primero aparecen los pilotos «Libres hasta el final, con la aeronave».
4. Si la aeronave tiene su base en otro lugar, aparece una línea «Traslado». Elija quién la traslada («por»): un piloto libre, el propio piloto (la misión se retrasa entonces en la misma medida) o «por asignar (misión de traslado)».
5. Si es necesario, ajuste la hora de «despegue» (o la «hora H» de una operación con varias misiones). «+ punto» añade un puesto a una patrulla, con el indicativo siguiente. «✎ detalle» abre el diálogo de asignación completo; su resultado vuelve a la matriz.
6. Compruebe la columna «Estado»: piloto duplicado, aeronave duplicada o ya asignada, piloto no libre en todo el intervalo.
   Bajo cada misión, una etiqueta roja señala una ruta que atraviesa una CTR que evitar, una naranja una TMA (base SIA del navegador).
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
- Una familia solo se propone a los pilotos cuya disponibilidad abre ese tema: temas declarados en Mis misiones, si no los de la categoría del código del libro (Ajustes › Centro › Categorías de disponibilidad), según las preferencias del piloto. Las funciones desempeñadas vienen de las aeronaves (hoja FLOTTE, o aeronaves declaradas sin libro).
- «Reglas de las familias y de la puntuación» se despliega bajo la tabla. Puntuación = número de participantes, + 2 por cada piloto empleado en los temas restringidos de su disponibilidad, + 1 por cada controlador en línea para TRAINING (2 como máximo). Una familia jugada a menudo retrocede un poco (según el número de informes del registro) para variar las misiones.
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

## Tablero
<!-- page: apps/cpco/odv_orders.html -->

La página Tablero construye la orden de vuelo de la semana: fichas de vuelo, control, varios y notas colocados en una cronología, con los conflictos de disponibilidad y de zonas.
Para abrirla: barra lateral › «Planificación» (pestaña «Tablero»). A diferencia del resto del Centro, se consulta sin él: en el nivel de uso 1, o sin el Centro activado (o, en modo producción, sin estar conectado con el rol `admin_centre`), se abre en solo lectura: solo el bloque «Orden del día», con la cronología del día y sus líneas de vuelos, control, varios y notas — sin paleta, zonas, ATC, disponibilidad común, problemas, registro, sin arrastrar y soltar ni orden de misión; un aviso flotante dice por qué, con el enlace al ajuste que lo resuelve: Centro bloqueado en este navegador (Ajustes › Centro), nivel Tripulación (Mi perfil › Nivel de uso), cuenta sin el rol `admin_centre`, o modo producción sin conexión de administrador (en modo GitHub, el bloqueo del Centro y el nivel son ajustes de este navegador, y el aviso lo recuerda). Modificarla requiere el Centro activado y, en modo producción o en cuanto un usuario está conectado, el rol `admin_centre` (una cuenta `utilisateur` sigue en solo lectura incluso con el Centro abierto; igual en la planificación ODV: sesiones ATC, activaciones, asignaciones).

La página tiene seis bloques, sin elección de vista. Lo que muestra cada uno depende del nivel de uso (Mi perfil › «Nivel de uso»):

| Bloque | Contenido | Nivel |
|---|---|---|
| «Orden del día» | barra de la semana y, después, la cronología del día (único bloque en solo lectura) | 1 |
| «Tripulación de la semana» | disponibilidades de los miembros día a día, DLO y plazos, cambios de disponibilidad | 2 |
| «Zonas» | activaciones de zonas por red y, después, solicitudes de reserva | 2 |
| «Franjas comunes» | franjas en las que varios pilotos están disponibles; un clic abre la ventana de la franja | 4 (Experto) |
| «Misiones probables» | familias de misiones compatibles por franja, enlace a la página ODV | 4 (Experto) |
| «Estadísticas» | vuelos de la semana y carga de los miembros | 2 |

- **Ocultar los pilotos no disponibles** (casilla de la paleta y del bloque «Tripulación de la semana», tomada de la página ODV): solo quedan los miembros que una franja declarada ese día hace asignables a un vuelo (misma regla que los conflictos: suelo, recuperación, control fuera de SOG o solo control no cuentan) (la semana: al menos un día); guardada en este navegador.
Todo se guarda en el pool de datos compartido: la orden de la semana en `data/odv/<año>-W<semana>.json`, los ajustes en `data/config/odv.json`. Las disponibilidades siguen siendo las de los pilotos, y la tripulación de un vuelo de misión la de las asignaciones.
Las horas están en z (UTC). Modelo de datos: [Tablero](../technique/ODV_ORDRES.md).

### Orden del día: barra de la semana

- «◀» y «▶» cambian de semana, «Esta semana» vuelve a la semana en curso.
- Las pestañas de los días muestran, en rojo, el número de elementos en conflicto del día.
- «Guardia» designa al oficial de guardia de la semana.
- «↶ Deshacer» (o Ctrl+Z): revierte los diez últimos cambios de la orden de vuelo (ficha movida, elemento colocado o modificado…), reemisiones y guardado incluidos; se vacía al cambiar de semana.
- «Briefing» (o la tecla F) muestra la orden del día en pantalla completa; las flechas ← y → cambian de día.
- La línea de estado indica «Guardado», o «Guardado en este navegador» si la carpeta de datos no está autorizada.

### Orden del día

A la izquierda, la paleta: plantillas de vuelos, de control y de varios, la nota, y luego los miembros (Staff, luego Miembros) con la barra de su disponibilidad del día. A la derecha, la cronología:
- líneas de puntos: franjas de mañana, tarde y noche de la planificación ODV; línea roja: hora actual; zonas oscuras: noche aeronáutica del aeródromo configurado;
- «RTBA · LL»: franjas de actividad del RTBA (activaciones introducidas o importadas, si no las franjas de los ajustes);
- «Zonas»: zonas requeridas por cada vuelo (las de su misión, o las introducidas para un entrenamiento), en verde si están activas en la red del vuelo, en naranja si están solicitadas, en rojo si no;
- «ATC»: sesiones ATC del día dentro del perímetro (país ajustado en Ajustes › Centro › Planificación ODV, al pasar sobre la etiqueta): entrenamientos y exámenes en violeta, eventos en azul, reservas atenuadas; una sesión se recuadra en rojo cuando molesta a un vuelo de misión (su aeródromo de salida o de llegada durante el vuelo);
- «Disponibles juntos»: franjas en las que al menos dos miembros son asignables a un vuelo (un solo miembro disponible ese día: sus franjas); debajo, una fila fina por miembro (su trigrama) muestra sus franjas del día, del color de su categoría, rayadas cuando no lo hacen asignable a un vuelo: se ve quién empieza antes, termina después o cubre «juntos». A partir de ocho miembros, el botón «▾ n» de la etiqueta pliega o abre estas filas (abiertas por defecto);
- secciones «Vuelos», «Control», «Varios», «Notas»: los elementos se apilan solos.

Manejo:
- arrastre una plantilla a su sección: el elemento se crea a la hora de la colocación (en pasos de 5 min) y se abre su ventana;
- haga doble clic en una tarjeta de la paleta para colocarla automáticamente: en la franja de sincronización para otra tripulación de una misión con varias tripulaciones (desfase del ejercicio de la operación respecto a H, si no hora de la patrulla vinculada ya colocada; cisterna: 30 min antes del reabastecimiento, o antes de la patrulla a la que sirve), si no en la primera franja coherente del día (horas de servicio, no antes de la hora actual, tripulación asignable y libre, o suficientes miembros disponibles juntos);
- arrastre un miembro de la paleta a una ficha para añadirlo, o un trigrama de una ficha a otra para moverlo;
- arrastre una ficha para cambiar su hora, su borde derecho para cambiar su duración; un simple clic abre su ventana;
- en la paleta, «Reserva de vuelos» guarda las fichas quitadas de la cronología (arrastradas a la paleta, o «↩ Reserva» en su ventana) y «Formaciones de las misiones» propone lo que piden los vuelos de misión colocados: patrullas de las otras misiones de la formación, cisternas que las atienden, chiffons de la operación;
- «Zoom» ajusta la escala de la cronología.

En una ficha: «⚠ n» cuenta sus conflictos, «P» indica que ningún tripulante está disponible en la hora y media previa al vuelo, «↻» una recurrencia; una barra verde (hecho) o naranja (no hecho) subraya el estado; una ficha cancelada aparece tachada. Un vuelo de misión asignado (orden de misión emitida, distintivo «OM») pasa a negro, o a blanco de noche y en los diseños oscuros, en lugar del color de su indicativo, en la cronología y en la lista del teléfono. Bajo la cronología, «Problemas de asignación» lista los conflictos del día: un clic muestra la ficha.

**En el teléfono**: las tiras del día se muestran en lista, por hora de inicio: hora de inicio y de fin (z), indicativo o etiqueta, aeronaves, tripulación, misión y estado. Un toque abre la tira (ventana del elemento, en solo lectura si la página lo está). El botón «Cronología» muestra la cronología del día; «Lista» vuelve. El aviso «base aeronáutica ausente» solo aparece a partir del nivel Planificación (2).

### Ventana de un elemento

- **Vuelo**: etiqueta, indicativo, misión del registro (vacío: entrenamiento), red, inicio, duración, color, zonas de un entrenamiento, eje y descarga de un vuelo cisterna, cisterna y hora del reabastecimiento, aeronaves (piloto, navegante, cancelado; ocho como máximo), tareas (una por línea, «nombre = TRI»), información, estado, motivo, informe (ME, Bâché, MNE), parcial, causas de MNE.
- Un indicativo introducido propone la misión de la asignación que lleva ese indicativo ese día.
- «Misión del registro y equipo»: una fila por equipo en vuelo de cada misión (indicativo, aeronave, función, familia, aeródromos, operación, duración estimada), ordenada por duración; «⚠» y una notificación señalan una duración estimada distinta de la solicitada (diferencia de más de 15 min o 15 %). «Entrenamiento (sin misión)» deja la ficha sin misión.
- «Reabastecimiento»: una misión cisterna (primero las de la misma operación o del mismo eje), cuya ficha se coloca ese día si aún no está, o un vuelo cisterna ya colocado; la hora del reabastecimiento se ajusta al lado.
- **PTA** (principal training audience): miembros a los que el elemento entrena en prioridad, marcados en la tabla de aeronaves (vuelo) o en la lista PTA (control, varios); aparecen rodeados en la ficha. **Configuración**: configuraciones cargadas en la aeronave (KNON = cañón, TALIOS = pod…), propuestas según los ajustes. **DLO** (desired learning objectives): objetivos de cada miembro en el elemento, una línea por miembro «TRI = objetivos»; «◎» en el trigrama, objetivos al pasar el ratón.
- **Aeronaves**: dos plazas al principio («+ Punto» añade más, ocho como máximo); para cada una, la aeronave (tipo de la misión propuesto ★, sin imponerlo, o una aeronave de la flota), el piloto y el navegante. El indicativo propuesto es el de la misión, si no los de la tabla de indicativos para ese tipo; sigue a la misión si esta lo cambia. **Reabastecimiento**: elija el eje y luego una misión cisterna de ese eje; si su ficha no está colocada, pasa a la paleta y el vuelo se engancha a ella al colocarla. La ficha muestra la misión (título, familia, aeródromo), el eje que sostiene un cisterna y, para un receptor, «⛽ cisterna eje hora».
- **Puestos y aeronaves** (como en la planificación ODV): para un vuelo de misión, una fila por puesto de la misión (indicativo, tipo); el siguiente punto toma el indicativo siguiente. La lista de aeronaves (lista desplegable con búsqueda) propone las compatibles, en el sitio primero y luego de la más cercana a la más lejana («traslado x h xx»); las ya ocupadas durante el vuelo aparecen en gris. Una aeronave basada en otro aeródromo que la salida hace aparecer una ficha de traslado «⇢» (aeronave, aeródromos, «por asignar»), que llega 30 min antes del despegue y sigue al vuelo: arrastre a ella al piloto del traslado. **Guardia**: preaviso y fin, trasladados a la orden de misión. La línea bajo un trigrama indica su cualificación en el tipo (verde: dominado; naranja: poseído o conocido; rojo: no); es solo una señal.
- **Elegir una misión**: la lista se limita al indicativo o la etiqueta introducidos («SAMU» → misiones SAMU); elegida la misión, se abre la ventana de elección del ODV y sus filas (puestos, aeronaves, pilotos, indicativo, piloto del traslado) rellenan la ficha; se proponen primero los pilotos disponibles y cualificados en el tipo. La ficha toma la hora de despegue de la asignación (aviso si difieren); «Orden de misión de la operación (n)…» encadena las órdenes de misión de las fichas de la operación colocadas ese día; una ficha recuperada de la reserva o de las formaciones se coloca en su franja de sincronización. **Reabastecimiento**: el eje elegido limita la lista a sus cisternas; «Sin misión específica» pone en la reserva un cisterna genérico en el eje. Un traslado movido a mano conserva su lugar (sigue al vuelo con la misma diferencia si el vuelo se mueve), alargado o acortado a mano conserva su duración mientras el trayecto no cambie; solo se retira si el vuelo ya no lo necesita (vuelo eliminado, aeronave cambiada o ya en el aeródromo de salida) — misión ausente un momento del registro o aeródromo sin coordenadas: la ficha queda tal cual, piloto de traslado incluido; si llega menos de 30 min antes del despegue, se señala. Una disponibilidad cuya categoría no abre la familia de la misión, y un examen o entrenamiento ATC en el aeródromo de salida o de llegada durante el vuelo, se señalan. Bajo la cronología, «Registro de asignaciones» muestra las 30 últimas operaciones.
- **Asignaciones y órdenes de misión**: una misión asignada en otro lugar (planificación ODV, Registro) aparece automáticamente como ficha en la cronología, a su despegue, con sus aeronaves, pilotos, guardia y traslado. A la inversa, un vuelo de misión con tripulación pero sin asignación se señala «orden de misión no emitida» (el piloto no ve nada en Mis misiones), y una tripulación distinta de las asignaciones «orden de misión que reemitir». Desplazar la ficha de un vuelo que tiene su orden de misión (día, hora, duración) la reemite automáticamente, sin ventana: mismos pilotos, aeronaves, indicativos y pilotos de traslado a la nueva hora; un sobre ya abierto vuelve a sellarse para que el piloto vea el cambio. En caso de conflicto de asignación (piloto, piloto de traslado o aeronave ocupados en otro lugar) o si la carpeta de misiones no está autorizada, la orden no se reemite: la ficha lo señala («orden de misión no reemitida», con el motivo) y conserva su nueva hora; «Orden de misión…» sigue siendo el modo de cambiar pilotos o aeronaves.
- **Orden de traslado**: «Orden de traslado…» en una ficha de traslado abre la orden de misión del vuelo servido, traslado incluido (hora y duración de la ficha, aunque se haya movido a mano); un piloto de traslado distinto del piloto de la misión, o un traslado por asignar, recibe su orden de traslado en Mis misiones; hecho por el piloto de la misión, el traslado es una línea de su orden de misión.
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

### Tripulación de la semana

Bloque del nivel 2: una fila por miembro, una casilla por día con la barra de las disponibilidades declaradas y el número de elementos en los que figura. Un clic en una casilla abre sus franjas del día: categoría, inicio, fin, y «Descanso desde», que coloca un descanso hasta medianoche. Las franjas se escriben en la declaración del piloto.
- **DLO y plazos** (tabla plegada o desplegada con su triángulo, estado guardado en este navegador): objetivos permanentes de cada miembro («＋» para añadir, clic para modificar), con un plazo opcional (rojo a 3 días hábiles o menos, amarillo a 10 o menos); un DLO se cierra automáticamente con un vuelo hecho que lo contiene (DLO del elemento, etiqueta, misión) con el miembro en la tripulación. La paleta muestra «◎n» DLO abiertos por miembro, y la ventana de un elemento recuerda los de la tripulación.
- «Cambios de disponibilidad» lista las declaraciones modificadas desde la última vez que se tuvieron en cuenta; «Tenido en cuenta» y «Tener todo en cuenta» las marcan en este navegador.

### Zonas

Bloque del nivel 2, en dos partes: activaciones de zonas por red y, después, solicitudes de reserva.

**Activaciones de zonas por red**: la primera parte introduce las activaciones de zonas de la semana (`data/atc/activations/<año>-W<semana>.json`), en dos columnas lado a lado, VATSIM e IVAO: día, zona, estado (activa, solicitada, rechazada), inicio, fin, observación, red. Una activación «ambas redes» aparece en las dos columnas; cambiar su red la desplaza. VATSIM no publica activaciones: su columna se introduce a mano. En la columna IVAO, «Importar de IVAO» recoge los horarios publicados por IVAO (clave de API de la instalación), plegados bajo la lista, así como los entrenamientos, exámenes y reservas IVAO de la semana (sesiones ATC); las entradas a mano se conservan. Las sesiones IVAO también se importan solas al abrir una semana, como máximo una vez por hora, si la página puede escribir. Un cambio recalcula al instante las zonas de los vuelos. La planificación ODV muestra el mismo bloque, con los mismos datos.

**Solicitudes de reserva**: la segunda parte lista las zonas que atraviesan los vuelos de misión de la semana (ruta prevista y zonas de trabajo de la misión, zonas introducidas para un entrenamiento) sin activación «activa» de su red: día, zona, red, franja, vuelos, estado. «Inscribir como solicitada» (o «Inscribir todo como solicitado») las añade a las activaciones comunes; la solicitud se hace en el sitio de la red («Copiar la lista», enlace a las solicitudes de activación IVAO). Una zona P se señala «evitar». Al abrir una semana, la página importa automáticamente las sesiones ATC IVAO (entrenamientos, exámenes, reservas), como mucho una vez por hora, con la importación común con la planificación ODV. «Retirar la solicitud»: una zona inscrita como solicitada por error vuelve a «ausente».

### Franjas comunes

Bloque del nivel Experto, tomado de la página ODV y ajustado a la semana mostrada por el Tablero: los 7 días × 3 franjas, con el número de pilotos libres por casilla y los filtros «Al menos N piloto(s)» y «Simulador común». Un clic en una casilla abre la ventana de la franja (matriz misiones × puestos). Detalle: capítulo Planificación ODV, «Franjas comunes» y «Ventana “Asignar los pilotos libres”».

### Misiones probables

Bloque del nivel Experto, ajustado también a la semana del Tablero: familias de misiones compatibles por franja, con la tabla y las reglas de la página ODV (véase Planificación ODV, «Misiones probables»). Abajo, el enlace «Página ODV completa: libro, cuadrícula, exportación…» abre la página ODV, que no tiene pestaña.

### Estadísticas

Bloque del nivel 2: vuelos previstos, duración total, hechos, no hechos, cancelados, AAR, ME, Bâchés, MNE; por miembro: tiempo disponible en las horas de servicio, tiempo de vuelo, carga (naranja por encima del 70 %, rojo por encima del 100 % o sin disponibilidad).
