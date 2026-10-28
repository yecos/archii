# Integridad del inventario

Esta entrega corrige la primera fase de la revisión: aislamiento por empresa, permisos de escritura, saldos coherentes, trazabilidad y reportes completos. No ejecuta migraciones ni modifica datos existentes durante el despliegue.

## Operaciones y permisos

La interfaz, las funciones antiguas de `firestore-actions.ts` y las herramientas de IA utilizan `executeInventory` en el servidor. El endpoint `/api/inventory` verifica el token de Firebase. Cada transacción vuelve a comprobar pertenencia y rol desde documentos del servidor: creador del tenant, `superAdmins`, Director o Contratista. Un rol Admin enviado por el cliente o almacenado en un perfil no concede privilegios. El rol explícito de `tenant.memberRoles` prevalece sobre el perfil global.

Las reglas de Firestore conservan lecturas por tenant y rechazan todas las escrituras directas sobre productos, categorías, movimientos y transferencias. Los comprobantes de idempotencia se guardan bajo `tenants/{tenantId}/inventoryRequests`, sin acceso directo de clientes. El endpoint de borrado genérico ya no admite inventario.

Los cambios de stock y sus comprobantes se escriben en una sola transacción. Una salida o transferencia insuficiente se rechaza completa. Los reintentos con el mismo identificador y datos devuelven el resultado previo; reutilizar el identificador con otros datos se rechaza. El navegador conserva el identificador pendiente en la sesión de la pestaña y comparte solicitudes simultáneas. La IA recibe un identificador por solicitud y posición de herramienta; los clientes de esta API deben conservar `requestId` al reintentar una solicitud incierta. Un mensaje nuevo representa una solicitud nueva.

## Saldos y registros antiguos

- Un mapa `warehouseStock` poblado es la fuente de las cantidades por almacén. `stock` se mantiene como total para compatibilidad.
- Un mapa vacío o ausente usa el stock y almacén del formato antiguo. Si falta almacén, se usa Almacén Principal.
- Si un mapa poblado no coincide con el total antiguo, se bloquean movimientos y archivo para no borrar silenciosamente la diferencia. Se requiere conciliación física y revisión del historial antes de cualquier reparación administrativa.
- Solo se admiten cantidades finitas, no negativas, de hasta seis decimales; las operaciones requieren cantidades positivas. Se validan tipos, almacenes, unidades y referencias a categorías de la misma empresa.
- Crear un producto con saldo inicial genera comprobantes de entrada por almacén en la misma transacción.
- Editar nombre, precio y demás metadatos no cambia existencias. Los ajustes se registran como entradas o salidas con motivo. No se cambia la unidad de productos con stock.
- Productos sin existencias pueden archivarse. Las categorías se archivan después de reasignar sus productos activos. Los documentos se conservan para resolver referencias históricas.
- Anular un movimiento o transferencia nuevo crea una compensación y marca el original. No elimina registros ni permite stock negativo. Las operaciones de compensación y las ya anuladas no se vuelven a anular.
- Los comprobantes antiguos no contienen una garantía de aplicación atómica. Su anulación queda bloqueada hasta conciliación. Las transferencias antiguas pendientes o en tránsito tampoco se convierten automáticamente.

La interfaz muestra hasta cien movimientos y transferencias recientes. Reportes consulta el historial completo desde el servidor al abrirse o actualizarse, incluyendo registros sin `createdAt`. No exporta cachés parciales sin conexión. Excel y CSV calculan existencias desde la misma fuente que la pantalla; Excel incluye transferencias y las exportaciones conservan marcas de anulación. Las sumas de cantidades de unidades diferentes son orientativas; la valoración sigue siendo precio actual por existencias, no un costo histórico contable.

Las imágenes siguen almacenadas en el documento: se limita la selección a 400 KB y el texto recibido a 600.000 caracteres para evitar documentos demasiado grandes. El traslado de imágenes a Storage queda pendiente.

## Verificación reproducible

```sh
npm ci
npm run test:inventory
npm run test:inventory:integration
npx playwright install chromium
npm run test:inventory:e2e
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

La suite de integración requiere Java 21 y descarga el emulador de Firestore. Usa exclusivamente el proyecto ficticio `demo-archii` en `127.0.0.1:8085`; no requiere credenciales ni accede al Firebase de producción. La suite sin emulador omite explícitamente los casos de integración. CI ejecuta la suite completa y los recorridos del navegador en un trabajo independiente. Los recorridos usan además Auth local en `127.0.0.1:9099` y una aplicación de desarrollo en el puerto 3100. El lanzador fuerza el proyecto ficticio y excluye credenciales de producción. Para un Chromium instalado se puede definir `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Se comprueban: operaciones atómicas, salidas simultáneas, reintentos concurrentes, respuesta perdida, referencias entre tenants, roles, edición de formularios con stock antiguo, saldos iniciales, anulaciones, archivo, consistencia de la IA, reglas de lectura/escritura y reportes con más de cien registros.

## Publicación y revisión pendiente

Los recorridos de navegador verifican formularios, rechazos por saldo insuficiente, transferencias y anulaciones, recuperación de una respuesta perdida sin duplicar stock, y descarga real de Excel en escritorio y Android emulado. La emulación no sustituye una comprobación en un dispositivo Android/WebView físico. Antes de publicar, confirmar que el servidor tiene Firebase Admin configurado. Las pruebas usan datos ficticios y no escriben en el inventario real.

Se fija Radix Slot en 1.2.4 para evitar un fallo al abrir confirmaciones, se libera el estado pendiente si falla la obtención del token y se normalizan los campos opcionales del registro de errores. La conexión a emuladores y sus excepciones CSP solo se habilitan en desarrollo, con una bandera explícita y un proyecto `demo-`.

Coordinar la publicación de las reglas y la aplicación. Para evitar una ventana de escrituras antiguas, activar primero las reglas que bloquean las escrituras directas durante una breve pausa del módulo y después publicar la aplicación nueva. Los clientes antiguos deben recargarse. No se deben relajar las reglas para resolver errores de clientes antiguos. Un rollback de la aplicación antigua necesita mantener inventario deshabilitado hasta restaurar una versión compatible.

El despliegue requiere autorización y acceso operativo a Firebase y Vercel. No ejecutar migraciones de datos como parte de esta publicación. La conciliación de saldos antiguos, almacenes configurables por obra, recepción de transferencias, costos históricos, SKU únicos e imágenes en Storage quedan para entregas posteriores. Los reportes completos se cargan bajo demanda; para historiales grandes conviene añadir consultas por período y exportación paginada desde servidor.
