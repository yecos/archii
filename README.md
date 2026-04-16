# ArchiFlow

**Plataforma integral de gestion de proyectos para firmas de arquitectura, diseno de interiores y construccion.**

ArchiFlow centraliza la planificacion, ejecucion y seguimiento de proyectos en una unica aplicacion, con herramientas de colaboracion en tiempo real, inteligencia artificial integrada, y gestion financiera completa.

**Version:** v2.0.0
**Demo en vivo:** [https://archii-theta.vercel.app](https://archii-theta.vercel.app)

---

<!-- Placeholder para captura de pantalla principal -->
<!-- Reemplazar con: ![ArchiFlow Dashboard](docs/screenshots/dashboard.png) -->
> _Captura de pantalla del dashboard principal -- documentation pendiente._

---

## Tabla de Contenido

- [Stack Tecnologico](#stack-tecnologico)
- [Funcionalidades Principales](#funcionalidades-principales)
- [Requisitos Previos](#requisitos-previos)
- [Instalacion](#instalacion)
- [Variables de Entorno](#variables-de-entorno)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Despliegue](#despliegue)
- [Pruebas](#pruebas)
- [Colaboracion](#colaboracion)
- [Licencia](#licencia)

---

## Stack Tecnologico

| Categoria | Tecnologia | Version |
|---|---|---|
| **Lenguaje** | TypeScript | 5.x |
| **Framework** | Next.js (App Router) | 16.x |
| **UI Frontend** | React | 19.x |
| **Estilos** | Tailwind CSS | 4.x |
| **Componentes** | Radix UI + shadcn/ui | -- |
| **Iconos** | Lucide React | 0.525+ |
| **Estado Global** | React Contexts + Zustand | 5.x |
| **Base de Datos** | Google Cloud Firestore (Client + Admin SDK) | -- |
| **Autenticacion** | Firebase Auth (email, Google, Microsoft OAuth) | -- |
| **Almacenamiento** | Firebase Storage + Microsoft OneDrive | -- |
| **IA** | Vercel AI SDK (multi-proveedor: ZAI, Groq, Mistral, OpenAI) | 6.x |
| **WhatsApp** | Meta Cloud API (chatbot con IA) | -- |
| **Graficos** | Recharts | 2.x |
| **Generacion PDF** | jsPDF + jsPDF-AutoTable | 4.x |
| **Exportacion Excel** | SheetJS (xlsx) | 0.18.x |
| **Validacion** | Zod | 4.x |
| **PWA** | Service Worker + Web App Manifest | -- |
| **Testing** | Vitest + Testing Library + MSW | 4.1.x |
| **Linter** | ESLint | 9.x |
| **Runtime** | Bun (desarrollo), npm (build Vercel) | -- |
| **Despliegue** | Vercel | -- |

---

## Funcionalidades Principales

### Gestion de Proyectos

- **Dashboard** con widgets personalizables, graficos en tiempo real y KPIs por proyecto.
- **Proyectos** con seguimiento completo del ciclo de vida (concepto, anteproyecto, proyecto, ejecucion, entrega).
- **Tareas** con prioridades, subtareas, dependencias, asignacion multiple y vista Kanban.
- **Diagrama de Gantt** con dependencias, barras de progreso y vista de linea de tiempo.
- **Time Tracking** con cronometro integrado, entradas manuales, tarifas facturables y reportes.
- **Templates** de proyecto reutilizables con fases y tareas predefinidas.

### Finanzas y Comercial

- **Presupuestos** con desglose por categorias, alertas de desviacion y seguimiento de gastos.
- **Cotizaciones** multinivel con secciones, IVA, descuentos, condiciones de pago y banco.
- **Facturacion** con estados (borrador, enviada, pagada, vencida), generacion PDF y exportacion.
- **Ordenes de Compra** con seguimiento de entregas y vinculacion a proveedores.
- **Dashboard de Rentabilidad** con analisis de margen por proyecto.

### Obra y Campo

- **Seguimiento de Obra** con fases, bitacora diaria, clima automatico y registro fotografico.
- **Minutas de Obra** con participantes, actividades, compromisos y evidencia fotografica.
- **Bitacora Fotografica** con fotos antes/despues, progreso por espacio y fase.
- **Inspecciones** con checklists calificables, scoring y observaciones.
- **Control de Cambios** con impacto en presupuesto y cronograma, flujo de aprobacion.
- **Geolocalizacion GPS** para registro de ubicaciones en campo.
- **Time-Lapse Automatico** de la evolucion del proyecto.

### Comunicacion y Colaboracion

- **Chat en tiempo real** con compartir archivos, notas de voz, reacciones y respuestas encadenadas.
- **Indicador de presencia** para ver quien esta conectado.
- **WhatsApp AI Chatbot** integrado con Meta Cloud API para comunicacion con clientes.
- **Portal del Cliente** con vista restringida de proyectos, facturas, galeria y actividad.
- **Calendario** con eventos recurrentes (diario, semanal, quincenal, mensual, anual).

### Inteligencia Artificial

- **Asistente IA** conversacional integrado en la plataforma.
- **Agente IA** con herramientas (function calling) para operaciones automaticas.
- **Sugerencias IA** contextuales por pantalla.
- **IA Predictiva** para estimacion de tiempos, costos y deteccion de riesgos.

### Inventario y Operaciones

- **Inventario** con productos, categorias, multiples bodegas, stock minimo y alertas.
- **Movimientos** de entrada/salida con trazabilidad completa.
- **Transferencias** entre bodegas con estados (pendiente, en transito, completada).
- **Proveedores** con calificacion, categorizacion y datos de contacto.

### Herramientas

- **Galeria de Fotos** con anotaciones, categorias y lightbox.
- **Gestion de Archivos** con vista grid/lista, integracion OneDrive y busqueda.
- **Generador de Reportes** (ejecutivos, tecnicos, financieros) en PDF.
- **Generador de Formularios** personalizable.
- **Escaner QR** para vinculado rapido de elementos en campo.
- **Firmas Electronicas** para aprobaciones y documentos.
- **API y Webhooks** para integracion con sistemas externos.
- **Paleta de Comandos** (Command Palette) con atajos de teclado.
- **Automatizaciones** con motor de reglas configurable.

### Plataforma y Sistema

- **Multitenant** con deteccion basada en dominio, planes (free, pro, enterprise) y limites configurables.
- **RBAC con 7 roles**: Admin, Director, Arquitecto, Interventor, Contratista, Cliente, Miembro.
- **Auditoria** con registro de todas las acciones del sistema.
- **Respaldo y Restauracion** de datos con exportacion/importacion.
- **Temas**: claro, oscuro y personalizado con colores por inquilino.
- **Soporte Offline** con cola de sincronizacion y banner de estado.
- **PWA instalable** con service worker.
- **Internacionalizacion** (i18n): espanol, ingles y portugues.

---

## Requisitos Previos

- [Bun](https://bun.sh/) 1.3+ (runtime principal para desarrollo)
- [Node.js](https://nodejs.org/) 20+ (alternativo; requerido para build en Vercel)
- [npm](https://www.npmjs.com/) 10+ (requerido para build en Vercel)
- Cuenta de [Firebase](https://firebase.google.com/) con proyecto configurado:
  - Firestore (modo nativo o de prueba)
  - Authentication (email/password, Google, Microsoft habilitados)
  - Storage
- Cuenta de [Vercel](https://vercel.com/) para despliegue
- (Opcional) Cuenta de [Meta Developer](https://developers.facebook.com/) para WhatsApp Cloud API
- (Opcional) Aplicacion registrada en [Azure AD](https://azure.microsoft.com/) para OneDrive

---

## Instalacion

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-organizacion/archii.git
cd archii

# 2. Instalar dependencias con Bun
bun install

# 3. Copiar y configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales correspondientes

# 4. Ejecutar en modo desarrollo
bun run dev

# 5. Abrir en el navegador
# http://localhost:3000
```

**Scripts disponibles:**

| Comando | Descripcion |
|---|---|
| `bun run dev` | Servidor de desarrollo en puerto 3000 |
| `bun run build` | Build de produccion |
| `bun run start` | Servidor de produccion |
| `bun run lint` | Analisis estatico con ESLint |
| `bun run test` | Ejecutar pruebas en modo watch |
| `bun run test:run` | Ejecutar pruebas una vez |
| `bun run test:coverage` | Ejecutar pruebas con cobertura |
| `bun run test:diagnostic` | Reporte diagnostico JSON + HTML |

---

## Variables de Entorno

Crear un archivo `.env.local` en la raiz del proyecto con las siguientes variables:

```env
# ── Firebase ──────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (Server-side)
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_PROJECT_ID=

# ── Autenticacion ─────────────────────────────────
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=

# ── Almacenamiento ────────────────────────────────
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=

# ── Microsoft OneDrive ────────────────────────────
MS_GRAPH_CLIENT_ID=
MS_GRAPH_CLIENT_SECRET=
MS_GRAPH_TENANT_ID=

# ── Inteligencia Artificial ───────────────────────
GROQ_API_KEY=
MISTRAL_API_KEY=
OPENAI_API_KEY=
OPENAI_BASE_URL=
ZAI_API_KEY=

# ── WhatsApp Cloud API ────────────────────────────
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_WEBHOOK_SECRET=

# ── Aplicacion ────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_TENANT_ID=
```

> **Nota:** Las variables marcadas con `NEXT_PUBLIC_` se exponen al navegador. Nunca incluir claves privadas en variables publicas.

---

## Estructura del Proyecto

```
archii/
├── public/                     # Archivos estaticos
│   ├── manifest.json           # Configuracion PWA
│   ├── sw.js                   # Service Worker
│   ├── logo.svg                # Logo de la aplicacion
│   ├── favicon.ico
│   └── icon-*.png              # Iconos PWA (multiples tamanos)
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Layout raiz
│   │   ├── page.tsx            # Pagina principal
│   │   ├── loading.tsx         # Estado de carga global
│   │   ├── error.tsx           # Manejo de errores global
│   │   ├── not-found.tsx       # Pagina 404
│   │   ├── globals.css         # Estilos globales + Tailwind
│   │   └── api/                # API Routes
│   │       ├── ai-assistant/   # Endpoint de asistente IA
│   │       ├── ai-agent/       # Endpoint de agente IA
│   │       ├── ai-suggestions/ # Endpoint de sugerencias IA
│   │       ├── ai-predictions/ # Endpoint de IA predictiva
│   │       ├── ai-debug/       # Diagnostico IA
│   │       ├── ai-chat-history/# Historial de chat IA
│   │       ├── backup/restore/ # Restauracion de respaldo
│   │       ├── external/       # API externa con autenticacion
│   │       ├── onedrive/       # Integracion OneDrive
│   │       └── whatsapp/       # Webhooks y notificaciones WA
│   │
│   ├── components/
│   │   ├── archiflow/          # Componentes principales ArchiFlow
│   │   │   ├── AIChatPanel.tsx
│   │   │   ├── AIAgentPanel.tsx
│   │   │   ├── AISuggestionsPanel.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   └── AIFloatingWrapper.tsx
│   │   ├── common/             # Componentes reutilizables
│   │   ├── features/           # Componentes de funcionalidades
│   │   │   ├── calendar/
│   │   │   ├── chat/
│   │   │   ├── files/
│   │   │   ├── inventory/
│   │   │   ├── portal/
│   │   │   └── project/
│   │   ├── layout/             # Layout de la aplicacion
│   │   ├── modals/             # Modales y dialogos
│   │   ├── ui/                 # Componentes base (shadcn/ui)
│   │   └── dashboard/          # Widgets del dashboard
│   │
│   ├── contexts/               # React Contexts (estado global)
│   │   ├── AppContext.tsx
│   │   ├── AuthContext.tsx
│   │   ├── FirestoreContext.tsx
│   │   ├── ChatContext.tsx
│   │   ├── TenantContext.tsx
│   │   └── ...                 # (18 contextos en total)
│   │
│   ├── hooks/                  # Custom React Hooks
│   │   ├── useDomain.ts
│   │   ├── useNetworkStatus.ts
│   │   ├── useTenantId.ts
│   │   └── ...
│   │
│   ├── lib/                    # Logica de negocio y utilidades
│   │   ├── firebase-*.ts       # Servicios Firebase
│   │   ├── ai-router.ts        # Router multi-proveedor IA
│   │   ├── ai-tools.ts         # Herramientas IA (function calling)
│   │   ├── whatsapp-*.ts       # Servicios WhatsApp
│   │   ├── tenant-service.ts   # Servicio multitenant
│   │   ├── export-*.ts         # Exportadores (PDF, CSV, Excel)
│   │   ├── backup-service.ts   # Respaldo/restauracion
│   │   ├── audit-trail.ts      # Registro de auditoria
│   │   ├── i18n.ts             # Internacionalizacion
│   │   ├── types.ts            # Interfaces y constantes
│   │   └── ...
│   │
│   ├── screens/                # Pantallas de la aplicacion (38)
│   │   ├── DashboardScreen.tsx
│   │   ├── ProjectsScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   └── ...
│   │
│   ├── stores/                 # Zustand stores
│   │   └── ui-store.ts
│   │
│   └── test/                   # Suite de pruebas
│       ├── setup.ts            # Configuracion global de tests
│       ├── unit/               # Pruebas unitarias
│       ├── integration/        # Pruebas de integracion
│       ├── components/         # Pruebas de componentes
│       ├── hooks/              # Pruebas de hooks
│       └── screens/            # Pruebas de regresion
│
├── .env.example                # Plantilla de variables de entorno
├── bun.lock                    # Lockfile de Bun
├── components.json             # Configuracion shadcn/ui
├── eslint.config.mjs           # Configuracion ESLint
├── next.config.ts              # Configuracion Next.js
├── package.json                # Manifiesto del proyecto
├── postcss.config.mjs          # Configuracion PostCSS
├── tailwind.config.ts          # Configuracion Tailwind CSS
├── tsconfig.json               # Configuracion TypeScript
├── vercel.json                 # Configuracion Vercel
└── vitest.config.ts            # Configuracion Vitest
```

---

## Despliegue

### Vercel (Recomendado)

ArchiFlow esta configurado para despliegue directo en Vercel:

1. Conectar el repositorio a un proyecto en [Vercel](https://vercel.com).
2. Configurar las variables de entorno en el panel de Vercel (seccion *Settings > Environment Variables*).
3. Vercel detectara automaticamente Next.js y ejecutara `npm install && npm run build`.
4. El despliegue se realiza automaticamente en cada push a la rama principal.

**Consideraciones:**

- El build en Vercel utiliza **npm** (no Bun). Todas las dependencias deben ser compatibles con npm.
- Firestore Admin SDK requiere las credenciales `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` como variables de entorno de servidor.
- La deteccion de tenant por dominio requiere configurar dominios personalizados por inquilino en Vercel.
- Para WhatsApp Webhook, configurar la URL del endpoint en Meta Developer Console.

### Variables de entorno en Vercel

Asegurar de marcar las variables sensibles (claves API, secretos) como **Sensitive** en la configuracion de Vercel. Las variables sin prefijo `NEXT_PUBLIC_` solo estaran disponibles en el servidor.

---

## Pruebas

La suite de pruebas utiliza **Vitest** con **Testing Library** y **MSW** (Mock Service Worker) para simular APIs externas.

```bash
# Ejecutar todas las pruebas en modo watch
bun run test

# Ejecutar una sola vez (CI)
bun run test:run

# Generar reporte de cobertura
bun run test:coverage

# Reporte diagnostico (JSON + HTML)
bun run test:diagnostic
```

**Cobertura actual:** 530 pruebas distribuidas en 27 archivos de prueba, cubriendo:

- Pruebas unitarias de utilidades, helpers, validadores y servicios.
- Pruebas de integracion de acciones Firestore y router de IA.
- Pruebas de componentes React (modales, formularios, widgets).
- Pruebas de hooks personalizados (auth store, UI store, network status).
- Pruebas de regresion de pantallas principales.
- Mocks de Firebase, APIs de IA y endpoints externos via MSW.

---

## Colaboracion

Se agradece las contribuciones a ArchiFlow. Para participar:

1. **Bifurcar** (fork) el repositorio.
2. Crear una rama de caracteristica: `git checkout -b feature/nombre-caracteristica`.
3. Realizar los cambios y escribir pruebas para las nuevas funcionalidades.
4. Asegurar que todas las pruebas pasen: `bun run test:run`.
5. Ejecutar el linter: `bun run lint`.
6. Confirmar con mensajes descriptivos: `git commit -m "feat: descripcion de la caracteristica"`.
7. Enviar un pull request a la rama principal con una descripcion clara de los cambios.

**Convencion de commits (sugerida):**

| Prefijo | Uso |
|---|---|
| `feat:` | Nuevas funcionalidades |
| `fix:` | Correccion de errores |
| `docs:` | Cambios en documentacion |
| `refactor:` | Refactorizacion de codigo |
| `test:` | Nuevas pruebas o correcciones de pruebas |
| `chore:` | Tareas de mantenimiento |

---

## Licencia

Este proyecto esta bajo la **Licencia MIT**.

Copyright (c) 2025 ArchiFlow

Se otorga permiso, de forma gratuita, a cualquier persona que obtenga una copia de este software y archivos de documentacion asociados (el "Software"), para utilizar el Software sin restriccion, incluyendo sin limitacion los derechos de uso, copia, modificacion, fusion, publicacion, distribucion, sublicencia y/o venta de copias del Software, y para permitir a las personas a las que se les proporcione el Software hacer lo mismo, sujeto a las siguientes condiciones:

El aviso de copyright anterior y este aviso de permiso se incluiran en todas las copias o partes sustanciales del Software.

EL SOFTWARE SE PROPORCIONA "TAL CUAL", SIN GARANTIA DE NINGUN TIPO, EXPRESA O IMPLICITA, INCLUYENDO PERO NO LIMITADO A GARANTIAS DE COMERCIALIZACION, IDONEIDAD PARA UN PROPOSITO PARTICULAR Y NO INFRACCION. EN NINGUN CASO LOS AUTORES O TITULARES DEL COPYRIGHT SERAN RESPONSABLES DE CUALQUIER RECLAMO, DANOS U OTRAS RESPONSABILIDADES, YA SEA EN UNA ACCION CONTRACTUAL, AGRAVIO O DE OTRO MODO, DERIVADAS DE, FUERA DE O EN CONEXION CON EL SOFTWARE O EL USO U OTROS TRATOS EN EL SOFTWARE.

---

<p align="center">
  Construido con Next.js, React, Tailwind CSS y Firebase.<br>
  <strong>ArchiFlow</strong> &mdash; Gestion inteligente para la construccion.
</p>
