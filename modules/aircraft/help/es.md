# Aeronaves

La flota de la compañía, tal como la leen las demás pantallas: el informe (matrícula → tipo, indicativos), el mapa, el CPCO. Las fichas de rendimiento y el registro de tipos llegarán en la misma pantalla.

## Cómo usarlo

<a id="aircraft-fleet"></a>**La flota.** Una fila por aeronave: matrícula, tipo, indicativos, base, «fuera de servicio» cuando lo está. La búsqueda filtra por matrícula, tipo, un indicativo o la base; se muestran siete filas, «N más» despliega el resto. «Añadir» abre una aeronave vacía.

<a id="aircraft-edit"></a>**Modificar una aeronave.** Un toque en una fila la abre: identidad (matrícula, tipo, variante, operador) y operación (indicativos separados por comas, base, número táctico, en servicio). Bajo los campos, una línea dice lo que va a cambiar («2 campos cambiados: base, indicativos»); «Guardar» lo escribe. Un tipo que la base no conoce se guarda tal cual, y la pantalla lo dice. La matrícula es la clave: dos aeronaves no pueden compartirla. La ubicación que da el sitio queda como está. «Retirar» pregunta, y luego la aeronave sale de la flota; su ficha de rendimiento, si la tiene, se conserva.

## Bueno saber

- El módulo Sitio también actualiza la flota a partir de la página «Flota» del sitio pegada: los dos escriben el mismo archivo, cada guardado relee el archivo justo antes y cambia una sola aeronave.
- Nada sale antes de la próxima sincronización.

<!-- fr: 90fe2925dc92 -->
