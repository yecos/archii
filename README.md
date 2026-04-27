<div align="center">

# Archii

**Plataforma integral de gestión de proyectos de construcción**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_+_Firestore-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on_Vercel-000000?logo=vercel)](https://vercel.com/)

Gestión de proyectos, presupuestos, cronogramas, inventarios, equipos y más —
todo en una sola plataforma con IA integrada y soporte multi-tenant.

[Deploy](https://archii-theta.vercel.app) · [Issues](https://github.com/yecos/archii/issues) · [Contributing](CONTRIBUTING.md)

</div>

---

## Características principales

### Gestión de Proyectos
- **27 pantallas** completas: dashboard, proyectos, tareas, cronograma, presupuesto, facturación, RFI, submittals, punch list, galería de fotos, inventario, chat en tiempo real y más.
- **Kanban board** interactivo con drag & drop (`@dnd-kit`).
- **Calendario** integrado con vista de eventos y plazos.
- **Seguimiento de tiempo** (time tracking) por proyecto y tarea.
- **Puntuación de salud** del proyecto calculada automáticamente (schedule, budget, quality, safety, RFIs, tasks).

### Inteligencia Artificial
- **Asistente IA** con panel de chat y acciones rápidas (sugerir tareas, analizar presupuesto, planificar cronograma).
- **RAG (Retrieval-Augmented Generation)** con contexto del proyecto.
- **Creación de tareas, gastos, proveedores y reuniones** por voz o texto natural.
- **Comandos de WhatsApp** para gestión remota desde el celular.

### Multi-Tenant
- Aislamiento completo de datos por tenant (espacio de trabajo).
- Roles: **Super Admin** (creador) y **Miembro** (invitado).
- Código de invitación para unir miembros al espacio.
- Gestión de miembros con badges visuales.

### Integraciones
- **OneDrive** (equipo compartido + personal) con carpetas automáticas por proyecto (planos, fotos, contratos, presupuestos, otros).
- **WhatsApp** (envío, notificaciones, webhook, IA conversacional).
- **Calendly, GitHub, Slack, Jira, Stripe** (conectores disponibles).
- **API REST v1** con OpenAPI spec, API keys y exportación CSV/JSON.
- **Webhooks** configurables con firma HMAC-SHA256.

### Seguridad
- Autenticación via **Firebase Auth** (email, Google, Microsoft SSO).
- **Encriptación AES-256-GCM** de tokens de Microsoft almacenados en Firestore.
- **Rate limiting** por usuario/tenant con ventana deslizante (Firestore + caché en memoria).
- **SSO** y **SCIM** para aprovisionamiento empresarial.
- **GDPR** service con políticas de retención y derecho al olvido.
- **CSP** (Content Security Policy) configurado para Firebase, Google y Microsoft.
- Auditoría de acciones sensibles (`audit-logger`).

### PWA & Offline
- **PWA completa** con manifest, service worker, e instalación nativa.
- **Caché inteligente** (IndexedDB) con cola de sincronización offline.
- **Modo claro/oscuro** con tema personalizable.

### Exportación & Reportes
- **PDF** con jsPDF + jsPDF-autotable.
- **Excel/CSV** con xlsx.
- **Reportes**: visión general, financiero, obra, tiempo, equipo.
- **Dashboard BI** con esquema exportable.

---

## Tech Stack

| Categoría | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Base de datos | Firebase Firestore |
| Autenticación | Firebase Auth + SSO |
| IA | Google Gemini (via z-ai-web-dev-sdk) |
| Estado | Zustand, React Context |
| UI | Tailwind CSS 4, Radix UI, shadcn/ui, Framer Motion, Lucide React |
| Gráficos | Recharts |
| Drag & Drop | @dnd-kit |
| PDF | jsPDF + jsPDF-autotable |
| Excel/CSV | xlsx |
| Notificaciones | Web Push API, Resend (email), WhatsApp |
| Almacenamiento | OneDrive (Graph API), Firebase Storage |
| Testing | Vitest, Testing Library |

---

## Estructura del proyecto

```
archii/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Layout raíz con metadata PWA
│   │   ├── HomeContent.tsx     # Shell de la aplicación
│   │   ├── ClientProviders.tsx # Providers de contexto
│   │   └── api/               # ~38 rutas API
│   │       ├── ai/             # IA assistant, agent, RAG
│   │       ├── collab/         # Colaboración en tiempo real
│   │       ├── onedrive/       # Archivos, carpetas, galería, búsqueda
│   │       ├── tenants/        # Multi-tenant, OneDrive compartido
│   │       ├── v1/             # API REST pública (OpenAPI, export)
│   │       ├── whatsapp/       # Mensajería y notificaciones
│   │       ├── integrations/   # Conectores terceros
│   │       └── webhooks/       # Webhooks configurables
│   ├── screens/                # 27 pantallas de la app
│   ├── components/             # Componentes UI organizados por dominio
│   │   ├── ui/               # Primitivos shadcn/ui (~30)
│   │   ├── layout/            # Sidebar, TopBar, Navegación
│   │   ├── modals/            # Modales de entidades
│   │   ├── kanban/            # Tablero Kanban
│   │   ├── archii/            # IA (chat, quick actions)
│   │   └── reports/           # Componentes de reportes
│   ├── hooks/                  # Custom hooks (auth, chat, inventory, etc.)
│   ├── lib/                    # ~50 servicios y utilidades
│   │   └── connectors/        # Calendly, GitHub, Slack, Jira, Stripe
│   ├── stores/                 # Zustand store
│   ├── contexts/               # React Context (AppContext)
│   └── types/                  # Definiciones de tipos
├── sdk/                        # SDK de Archii (TypeScript, 0 dependencias)
├── public/                     # PWA manifest, service worker, íconos
├── firebase.json               # Configuración Firebase
├── firestore.rules             # Reglas de seguridad Firestore
├── vitest.config.ts            # Configuración de tests
└── LICENSE                     # MIT
```

---

## Inicio rápido

### Prerrequisitos

- Node.js 18+ (o Bun)
- Un proyecto de Firebase con Firestore habilitado
- Variables de entorno configuradas (ver `.env.example`)

### Instalación

```bash
git clone https://github.com/yecos/archii.git
cd archii
npm install
```

### Configuración de variables de entorno

Crea un archivo `.env.local` basado en los valores necesarios:

```env
# Firebase (requerido)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (requerido para server-side)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Microsoft OneDrive (opcional)
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=

# Email (opcional - notificaciones por email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# VAPID (opcional - push notifications)
NEXT_PUBLIC_VAPID_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

### Desarrollo

```bash
npm run dev        # Servidor de desarrollo en http://localhost:3000
npm run build      # Build de producción
npm run start      # Servidor de producción
npm run lint       # Linter
npm run test       # Tests unitarios (Vitest)
npm run test:watch # Tests en modo watch
```

---

## Arquitectura

Archii sigue una arquitectura **SPA dentro de App Router**: la aplicación es una sola página (`HomeContent.tsx`) que renderiza pantallas de forma condicional según la navegación, similar a una app móvil nativa.

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App Router                 │
│                                                     │
│  layout.tsx ──► ClientProviders ──► AppContext      │
│                                       │              │
│                                  HomeContent.tsx       │
│                                       │              │
│                        ┌──────────────────┤              │
│                        │  Sidebar          │              │
│                        │  TopBar           │              │
│                        │  Screen Router    │              │
│                        │                   │              │
│                        │  ┌──────────────┐  │              │
│                        │  │  27 Screens  │  │              │
│                        │  │  90 Components│  │              │
│                        │  │  50 Services │  │              │
│                        │  └──────────────┘  │              │
│                        └──────────────────┘              │
│                                                     │
│  /api/* ──► 38 API Routes (Firebase Admin + Graph API)│
└─────────────────────────────────────────────────────┘
```

### Flujo de autenticación y tenant

```
Login (Firebase Auth) ──► Selección de tenant
     │                           │
     │                    ┌──────┴──────┐
     │                    │ 1 tenant:   │
     │                    │ auto-select │
     │                    └──────┬──────┘
     │                           │
     │               ┌───────┴───────┐
     │               │ Crear / Unir │
     │               │ con código   │
     │               └───────┬──────┘
     │                       │
     ▼                       ▼
  Super Admin              Miembro
  (full access)          (acceso limitado)
```

---

## API REST v1

Archii expone una API REST pública en `/api/v1/` con soporte para API keys:

| Endpoint | Descripción |
|---|---|
| `GET /api/v1/projects` | Listar proyectos (paginado) |
| `GET /api/v1/tasks` | Listar tareas (filtros + paginación) |
| `POST /api/v1/keys` | Crear API key |
| `DELETE /api/v1/keys/:id` | Revocar API key |
| `GET /api/v1/health` | Health check |
| `GET /api/v1/openapi` | Especificación OpenAPI 3.1 |
| `POST /api/v1/export/csv` | Exportar datos a CSV |
| `POST /api/v1/export/json` | Exportar datos a JSON |
| `GET /api/v1/bi/schema` | Schema BI para análisis |

Autenticación: header `X-API-Key` o `Authorization: Bearer <firebase-token>`.

---

## SDK

Archii incluye un SDK de TypeScript independiente en `sdk/`:

```bash
npm install archii-sdk
```

```typescript
import { ArchiiClient } from 'archii-sdk';

const client = new ArchiiClient({
  apiKey: 'af_live_...',
  tenantId: 'mi-tenant',
});

const projects = await client.projects.list({ page: 1, pageSize: 20 });
const task = await client.tasks.create({
  projectId: 'proj-123',
  title: 'Instalar ventanas',
  priority: 'High',
});
```

---

## Seguridad

Las reglas de Firestore (`firestore.rules`) implementan:
- Lectura/escritura solo para usuarios autenticados.
- Aislamiento por tenant: los usuarios solo pueden acceder a documentos de sus tenants.
- Los campos sensibles (tokens MS) se encriptan con AES-256-GCM antes de almacenar.
- Rate limiting en todos los endpoints públicos.
- Content Security Policy configurado para permitir flujos de auth de Firebase, Google y Microsoft.

---

## Contribuir

Las contribuciones son bienvenidas. Por favor lee [CONTRIBUTING.md](CONTRIBUTING.md) para los lineamientos.

---

## Licencia

[MIT](LICENSE) © 2024 Archii
