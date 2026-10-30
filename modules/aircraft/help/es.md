# Aeronaves

La flota de la compañía, tal como la leen las demás pantallas: el informe (matrícula → tipo, indicativos), el mapa, el CPCO. Las fichas de rendimiento están en la misma pantalla (pestaña «Fichas»); el registro de tipos llegará.

## Cómo usarlo

<a id="aircraft-fleet"></a>**La flota.** Una fila por aeronave: matrícula, tipo, indicativos, base, «fuera de servicio» cuando lo está. La búsqueda filtra por matrícula, tipo, un indicativo o la base; se muestran siete filas, «N más» despliega el resto. «Añadir» abre una aeronave vacía.

<a id="aircraft-edit"></a>**Modificar una aeronave.** Un toque en una fila la abre: identidad (matrícula, tipo, variante, operador) y operación (indicativos separados por comas, base, número táctico, en servicio). Bajo los campos, una línea dice lo que va a cambiar («2 campos cambiados: base, indicativos»); «Guardar» lo escribe. Un tipo que la base no conoce se guarda tal cual, y la pantalla lo dice. La matrícula es la clave: dos aeronaves no pueden compartirla. La ubicación que da el sitio queda como está. «Retirar» pregunta, y luego la aeronave sale de la flota; su ficha de rendimiento, si la tiene, se conserva.

<a id="aircraft-sheets"></a>**Las fichas.** La pestaña «Fichas» lista las fichas de rendimiento por familia (helicópteros, turbohélices, reactores, pistón, otros); la búsqueda filtra por nombre, tipo o matrícula. Cada fila dice de dónde viene la ficha, qué le falta y su fecha; un tipo de la flota sin ficha se propone «por completar». «Importar un archivo» lee un CSV, un JSON, un .lnmperf o un OFP de SimBrief; «Pegar un texto» lee un texto pegado, incluida una respuesta de ChatGPT; «Nueva ficha» pide el código del tipo. No se escribe nada de inmediato: una importación muestra primero, campo por campo, lo que cambiaría; desmarque lo que conserva y luego «Aplicar la selección». La pestaña elegida se guarda en el dispositivo, y el enlace `#aircraft?sheet=<id>` abre directamente el editor de una ficha.

<a id="aircraft-sheet-edit"></a>**Modificar una ficha.** «Editar» abre el editor: los campos por grupo (identidad, combustible, pista y alternativo, ascenso, crucero, descenso, régimen), la tabla régimen / consumo en pantalla grande, y el complemento EUROCONTROL, «completar desde otra ficha» o la petición a ChatGPT para rellenar los campos vacíos. Bajo cada campo rellenado, una línea gris indica su origen y su fecha («lnmperf · 28/10», «editado · 30/10»); al pasar el cursor se ven los valores descartados. «Guardar» abre la vista previa de los cambios, que solo se escriben tras «Aplicar la selección»; así cada campo cambiado conserva su fuente y se guarda el valor anterior. «Exportar .lnmperf» y «Exportar JSON» descargan la ficha; «Eliminar» pregunta antes de retirar la ficha de la base compartida.

## Bueno saber

- El módulo Sitio también actualiza la flota a partir de la página «Flota» del sitio pegada: los dos escriben el mismo archivo, cada guardado relee el archivo justo antes y cambia una sola aeronave.
- Nada sale antes de la próxima sincronización.

<!-- fr: 6c68e01d8018 -->
