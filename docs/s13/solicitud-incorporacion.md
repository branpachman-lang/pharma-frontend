Título: perf(spa): diferir diseño autenticado y mostrar seguimiento de errores

Destino: develop. Origen: feature/optimizacion-produccion-pacho.

MainLayout se carga al acceder a la zona autenticada, reduciendo el Initial total de 313,59 kB a 305,78 kB. Los errores muestran el requestId recibido del backend para facilitar la atención de soporte.

Incluye guía de despliegue, puertos, variables, reversión y recomendaciones para tres locales. Se midieron cinco navegaciones por variante de precarga y se mantiene la carga bajo demanda.

Validación: 53 pruebas del frontend aprobadas y compilaciones de producción con estadísticas. Evidencias e informe en el backend. Revisar y añadir por separado el trabajo previo del frontend que aún no está confirmado.
