# Informe de hallazgos y experiencia de usuario — sesión 9

**Estudiante:** Pacho  
**Proyecto:** PharmaSoft  
**Rama:** `feature/pruebas-reporte-ventas-pacho`  
**Estado del documento:** matriz completa e informe final con capturas integradas en DOCX y PDF.

## C1. Resumen de la ejecución

La actividad incluye 21 casos: 17 de la guía y cuatro propios, distribuidos entre Buscadores, Cálculos, Validaciones y Consistencia. Se han podido reutilizar nueve resultados de la práctica de la sesión 9 porque sus capturas coinciden con los datos y el comportamiento de los casos de esta matriz. B-01 se ejecutó de nuevo y confirmó que el cliente inactivo no aparece mientras un apellido activo sin tilde sí encuentra al cliente. B-02 confirmó que el buscador muestra precio y stock al buscar por nombre y categoría, y que Enter agrega el primer producto sin abrir el resumen. C-01 confirmó que 12.50 × 3 = S/ 37.50 se muestra como subtotal y total estimado. C-02 confirmó que el producto de prueba a S/ 18.90 con cantidad 3 muestra S/ 56.70 en el subtotal y el total estimado. C-04 confirmó que el total estimado de S/ 83.00 coincide con el comprobante de la venta N.º 000025 tras un POST 201. V-02 detectó que la API aceptó una cantidad decimal enviada directamente por Postman, la convirtió a 2 y creó la venta 41. V-03 verificó el bloqueo por stock en la SPA y el HTTP 409 de la API; el stock del producto permaneció en 2. V-05 detectó que un POST con dos líneas del mismo producto creó la venta 42 y descontó dos unidades. F-02 mostró un solo POST 201 y el comprobante 43 después de intentar confirmar dos veces. M-01 confirmó que la primera de dos pestañas creó la venta 44 y agotó el stock; la segunda obtuvo 409 y conservó el formulario. M-02 confirmó que la API rechazó con 409 una venta para el cliente inactivo 10. I-01 verificó tres impresiones PDF limpias: venta registrada, venta anulada y consulta filtrada. La matriz contiene el detalle de datos, cálculo manual, resultado observado, estado y evidencia de cada caso.

| Grupo | Casos | Pasa | Falla confirmada | Pendiente |
|---|---:|---:|---:|---:|
| Buscadores | 3 | 3 | 0 | 0 |
| Cálculos | 5 | 5 | 0 | 0 |
| Validaciones | 6 | 4 | 2 | 0 |
| Confirmación | 2 | 2 | 0 | 0 |
| Mensajes | 2 | 2 | 0 | 0 |
| Impresión | 1 | 1 | 0 | 0 |
| Consistencia | 2 | 2 | 0 | 0 |
| **Total** | **21** | **19** | **2** | **0** |

Las pruebas reutilizadas verifican, entre otros puntos, el cálculo de tres líneas y el nuevo total tras quitar la central (S/ 102.00 → S/ 83.00), el aumento de cantidad sin duplicar una línea, la confirmación sin POST al pulsar Volver y la disminución de stock de 14 a 10 después de vender cuatro unidades. M-01 comprobó el rechazo por stock después de una venta simultánea; la segunda pestaña conservó los datos para corregirlos, aunque siguió mostrando el stock anterior. El reporte de ventas por categoría se comprobó en la SPA: sin filtro mostró ocho categorías, 40 unidades y S/ 575.50; con el rango 2026-10-11 mostró seis categorías, 25 unidades y S/ 465.50. Un rango con fecha inicial posterior a la final mostró el aviso correspondiente y un día sin ventas mostró el estado vacío. El botón Limpiar recuperó el reporte completo. Falta guardar capturas de estas vistas y contrastar la respuesta en Postman si se desea adjuntar evidencia adicional del reporte.

## C2. Fichas de hallazgos

V-02 y V-05 produjeron fallos confirmados con capturas de las peticiones y respuestas. Los demás casos pasaron. La matriz no contiene casos pendientes.

### V-02 — La API acepta una cantidad decimal y registra otra cantidad

- **Severidad:** alta; una petición directa puede registrar unidades, descontar stock y cobrar un importe distintos de los solicitados.
- **Esperado:** tanto `cantidad: 0` como `cantidad: 2.5` deben recibir HTTP 400; no debe crearse una venta.
- **Observado:** la SPA rechazó ambos valores sin POST. La API rechazó `0` con HTTP 400 y el mensaje «La cantidad debe ser mayor que cero». En cambio, el POST de `2.5` respondió HTTP 201 y creó la venta 41 para el producto 8, Crema Hidratante Corporal, con `cantidad: 2` y `total: 44` (S/ 22.00 × 2). La respuesta acredita la creación de la venta; el descuento exacto de stock se debe contrastar con una consulta del producto.
- **Evidencia:** `evidencias-s9-autonoma/V-02_spa_cero.png`, `V-02_spa_decimal.png`, `V-02_postman_cero.png` y `V-02_postman_decimal.png`.
- **Causa probable:** `DetalleVentaRequestDTO.cantidad` es `Integer` y su restricción `@Min(1)` valida el valor después de la deserialización. La respuesta con cantidad 2 sugiere que el deserializador convirtió el decimal antes de aplicar Bean Validation; esta configuración debe comprobarse en la aplicación.
- **Corrección propuesta:** exigir un entero JSON en la deserialización de `DetalleVentaRequestDTO.cantidad` (por ejemplo, desactivar `ACCEPT_FLOAT_AS_INT`) y responder 400 ante `2.5`, sin llegar a `VentaServiceImpl.registrar`.
- **Nueva prueba tras corregir:** repetir el POST de `2.5` y verificar HTTP 400, ausencia de una venta nueva y stock intacto; repetir `0` y `2` para confirmar que siguen devolviendo 400 y 201, respectivamente.

### V-05 — La API acepta el mismo producto en dos líneas

- **Severidad:** media; la venta y el total son aritméticamente consistentes, pero el comprobante contiene líneas duplicadas y el comportamiento difiere de la SPA.
- **Esperado:** según la regla propuesta para esta matriz, un POST con el mismo `productoId` en dos líneas debe responder HTTP 409 y no modificar el stock.
- **Observado:** el POST con cliente 3 y dos líneas del producto 60, KR Piña 500ml, de una unidad cada una respondió HTTP 201. La venta 42 contiene dos detalles separados a S/ 1.50 y total S/ 3.00. El stock del producto pasó de 3 a 1.
- **Evidencia:** `evidencias-s9-autonoma/V-05_stock_antes.png`, `V-05_postman.png` y `V-05_stock_despues.png`.
- **Causa probable:** `VentaServiceImpl.registrar` recorre `request.getDetalles()` y descuenta stock por cada elemento, sin comprobar que los `productoId` sean únicos. La SPA sí acumula cantidades en `VentaForm.agregarProducto`.
- **Corrección propuesta:** aplicar la misma regla en la API: rechazar los IDs repetidos con 409 antes de descontar stock, o consolidar cantidades antes de validar el stock y crear el comprobante. La decisión debe ser única para SPA y API.
- **Nueva prueba tras corregir:** repetir el POST duplicado y comprobar 409 sin venta nueva ni cambio de stock; comprobar que una sola línea con cantidad 2 siga registrándose correctamente.

## C3. Análisis

**1. ¿Por qué el total de la SPA es estimado?** `VentaForm` calcula subtotales y total con `computed` y `redondear` para ayudar al cajero a revisar la operación antes de confirmarla. El `VentaRequest` envía solo `clienteId`, `productoId` y `cantidad`; en `VentaServiceImpl.registrar` el backend vuelve a consultar el precio vigente, multiplica cada precio por la cantidad y suma el total dentro de la transacción. El servidor también decide si hay stock suficiente. Si aceptara un total enviado por el navegador, cualquier persona podría modificarlo en DevTools o enviar un valor falso desde Postman, y los importes guardados dejarían de corresponder a los precios y cantidades reales.

**2. ¿Debería la API aceptar el mismo producto en dos líneas?** Propongo una regla única: una venta debe tener como máximo una línea por producto. La SPA ya la aplica en `VentaForm.agregarProducto`, donde incrementa la cantidad de la línea existente. V-05 confirmó que la API acepta dos líneas iguales, descuenta ambas unidades y devuelve dos detalles en la venta 42. Aunque el total de S/ 3.00 es correcto, el comprobante muestra el producto repetido y contradice el comportamiento de la SPA. Rechazar con 409 es sencillo de explicar; otra opción válida es consolidar cantidades antes de la comprobación y del descuento.

**3. ¿Qué mejorar después del 409 de M-01?** La segunda pestaña conservó el cliente y la línea preparada, y mostró un toast con el error. Sin embargo, siguió mostrando la cantidad 2 y un total estimado de S/ 70.00 cuando el stock real ya era 0. Después del aviso, la SPA debería volver a consultar el producto afectado, mostrar el stock actualizado junto a su línea, enfocar la cantidad y ofrecer una acción clara para ajustarla o quitar el producto. `VentaForm.confirmar` ya cierra el resumen y muestra el mensaje del backend; la mejora corresponde a ese manejo de error y a la actualización del catálogo local. Así el usuario puede corregir sin reconstruir toda la venta.

**4. ¿Por qué el reporte no necesita paginación y la consulta de ventas sí?** `GET /reportes/ventas-por-categoria` agrupa las líneas por categoría y devuelve una fila por cada categoría que tuvo ventas registradas en el periodo. El número de categorías suele ser mucho menor que el número de ventas individuales, de modo que una lista completa permite comparar barras y calcular totales sobre el mismo conjunto. `GET /ventas/buscar`, en cambio, devuelve registros transaccionales que crecen con cada venta; su paginación limita transferencia, tiempo de carga y longitud de la tabla. La decisión debe revisarse si el catálogo de categorías crece mucho, pero para la botica de esta práctica la agregación sin paginación es razonable.

## Verificación previa a la entrega

1. Mantener los 21 resultados de la matriz: 19 Pasa, 2 Falla y 0 Pendiente.
2. Conservar las dos fichas C2 de los fallos V-02 y V-05, junto con sus capturas.
3. Ya están las tres capturas de vista previa y los tres PDF limpios de I-01, con nombres correspondientes a la matriz.
4. El reporte se verificó en vivo con datos, filtro válido, rango inválido, estado vacío y botón Limpiar. Guardar capturas y comparar con Postman si se requiere evidencia adicional del reporte.
5. El informe final de 37 páginas incorpora las 21 pruebas y 49 evidencias visuales; está en `docs/Pacho_LP2_S9_Autonoma.docx`, `docs/Pacho_LP2_S9_Autonoma.pdf` y `docs/informe-s9.pdf`.
