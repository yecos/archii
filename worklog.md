# Worklog — Mobile Responsiveness Fixes

**Date**: Applied to `/home/z/my-project/src/app/page.tsx` and `/home/z/my-project/src/app/globals.css`

---

## Fixes Applied

### Fix #1 — Sidebar close on nav tap (lines ~1917, ~1925)
Added `if (window.innerWidth < 768) setSidebarOpen(false)` to both `Principal` and `Gestión` sidebar navigation item click handlers so the mobile sidebar closes after tapping a nav link.

### Fix #2 — Toast repositioned (`globals.css` line ~186)
Changed `.af-toast` CSS from `bottom: 90px` to `top: 16px; left: 50%; transform: translateX(-50%)` for mobile. Added `@media (min-width: 768px)` override to position it at `bottom: 16px; right: 16px` on desktop.

### Fix #3 — Notification panel z-index (line ~2043)
Changed notification dropdown panel from `z-50` to `z-[60]` so it appears above other overlays.

### Fix #4 — Project detail tabs scrollable (line ~2290)
Added `overflow-x-auto -mx-1 px-1 scrollbar-none` to project detail tab bar so it scrolls horizontally on small screens.

### Fix #5 — Main content padding safe area (line ~2189)
Changed main content bottom padding from `pb-20 md:pb-6` to `pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-6` to respect iOS safe area insets.

### Fix #6 — Task row buttons larger touch targets (lines ~2585-2586)
Changed task edit/delete button padding from `px-1.5 py-0.5` to `px-2.5 py-1.5` for 44px+ touch targets.

### Fix #7 — Chat back button bigger (line ~2650)
Changed chat back button from `w-8 h-8` to `w-11 h-11` for easier mobile tapping.

### Fix #8 — Chat padding safe area (line ~2617)
Changed chat container bottom padding from `pb-[56px] md:pb-0` to `pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0`.

### Fix #9 — Kanban scroll snap (lines ~2593, ~2597)
Added `snap-x snap-mandatory` to kanban columns container and `snap-start` to each column div for better horizontal scrolling on mobile.

### Fix #10 — Calendar mobile min cell height (line ~2956)
Already using `min-h-[70px] sm:min-h-[90px]` — confirmed adequate, no change needed.

### Fix #11 — Inventory table mobile card view (line ~3700)
Added a `md:hidden` mobile card view before the existing table, which shows product name, category, stock count, price, and total value in card format. Wrapped existing table in `hidden md:block`.

### Fix #12 — Gallery overlay visible on touch (line ~3122)
Changed `opacity-0 group-hover:opacity-100` to `opacity-100 md:opacity-0 md:group-hover:opacity-100` so gallery overlays are always visible on touch devices.

### Fix #13 — File delete buttons visible on touch (lines ~2424, ~2452)
Changed OneDrive file delete and project file delete buttons from `opacity-0 group-hover:opacity-100` to `opacity-100 md:opacity-0 md:group-hover:opacity-100` for mobile touch visibility.

### Fix #14 — Top bar avatar bigger (line ~2002)
Changed top bar avatar from `w-7 h-7` to `w-9 h-9 md:w-7 md:h-7` so it's easier to tap on mobile while staying compact on desktop.

### Fix #15 — Lightbox close button safe area (line ~5008)
Added `pt-[env(safe-area-inset-top,0px)]` to lightbox close button for iOS notch/safe area compatibility.

### Fix #16 — Lightbox navigation safe area (line ~5020)
Added `pb-[env(safe-area-inset-bottom,0px)]` to lightbox navigation container for iOS home indicator area.

### Fix #17 — Tab bar active state for _more (line ~4671)
Changed `_more` tab from always empty class to `(sidebarOpen ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]')` so the "More" button highlights when sidebar is open.

### Fix #18 — Calendar month selector (line ~2911)
Changed `min-w-[160px]` to `min-w-[120px] sm:min-w-[160px]` for better mobile fit.

### Fix #19 — Project card action buttons (lines ~2248-2249)
Changed project card edit/delete button padding from `px-1.5 py-0.5` to `px-2.5 py-1.5` for larger touch targets.

### Fix #20 — Inventory sub-tabs scrollable (line ~3149)
Added `scrollbar-none` to inventory sub-tabs container for cleaner mobile scrolling appearance.

### Fix #21 — Gantt chart hidden on mobile (line ~3814)
Added `md:hidden` message "El cronograma detallado está disponible en vista de escritorio." before the Gantt chart. Wrapped existing chart in `hidden md:block`.

### Fix #22 — Permissions table hidden on mobile (line ~4038)
Added `md:hidden` message "La tabla de permisos está disponible en vista de escritorio." before permissions table. Changed table wrapper to `hidden md:block overflow-x-auto`.

---

**Total**: 22 fixes applied across 2 files.

---
Task ID: 1
Agent: Main Agent
Task: Mobile optimization - fix chat input bar hidden on mobile and other mobile UX issues

Work Log:
- Analyzed screenshot showing chat input bar hidden below viewport on mobile
- Identified root cause: `h-screen` (100vh) on root container is taller than visible mobile viewport
- Changed root container from `h-screen` to `h-dvh` with `style={{ height: '100dvh' }}` inline fallback
- Changed loading screen from `h-screen` to `h-dvh`
- Changed notification panel `max-h-[85vh]` to `max-h-[85dvh]`
- Changed all modals from `max-h-[90vh]` to `max-h-[85dvh]` on mobile
- Changed lightbox image `max-h-[80vh]` to `max-h-[80dvh]`
- Fixed `navigateTo` to not reset `chatMobileShow` when navigating to chat screen
- Added `maxHeight: calc(100dvh - 60px)` to main content when on chat screen
- Changed chat container from `h-full` to `flex: 1` with `minHeight: 0` for proper flex behavior
- Updated bottom nav `py-1.5` to `py-2` for better touch targets
- Added safe-area bottom padding to bottom nav via inline style
- Added `currentScreen` state to Zustand ui-store for cross-component communication
- Updated AIFloatingWrapper to hide FAB buttons when on chat screen
- Added global CSS rule to force `font-size: 16px` on all inputs/selects/textareas on mobile (prevents iOS auto-zoom)
- Fixed install banner to respect safe-area-inset-top
- Enlarged install banner close button from 24px to 36px touch target
- Enlarged pending file remove button from 16px to 28px touch target

Stage Summary:
- All changes compile successfully (npx next build passes)
- Key files modified: src/app/page.tsx, src/app/globals.css, src/stores/ui-store.ts, src/components/archiflow/AIFloatingWrapper.tsx
- Main fix: Chat input bar should now be visible on mobile devices
- Secondary fixes: iOS zoom prevention, better viewport handling, improved touch targets

---
Task ID: 2
Agent: Main Agent
Task: Implement 8 corrections to ArchiFlow app

Work Log:
- Corrección 1 (Multi-Empresa): Added companies Firestore collection, companies screen with CRUD, company selector in project creation modal, companyId field in project data
- Corrección 2 (Mi Perfil position): Moved from bottom to 2nd position in sidebar nav, updated sidebar slice indices
- Corrección 3 (Role counters): Verified all 7 roles already present in counter grid (Admin, Director, Arquitecto, Interventor, Contratista, Cliente, Miembro)
- Corrección 4 (AI blocking send): Moved FAB buttons higher on desktop (bottom-20 instead of bottom-6), already hidden on chat screen
- Corrección 5 (Voice note flow): Simplified - recording shows "Detener" button (not "Cancelar"), preview bar only shows "Descartar" (removed separate "Enviar" button), main send button now handles voice notes too
- Corrección 6 (Mobile chat): Already fixed in previous session (h-dvh, flex layout, proper padding)
- Corrección 7 (Due date logic): Fixed 4 locations in calendar where `today = new Date()` (includes time) was used instead of `todayOnly = new Date(new Date().toDateString())` (midnight). Now tasks are NOT marked overdue on their due date.
- Corrección 8 (Editable permissions): Added rolePerms state with localStorage persistence, toggleRolePerm function, replaced static table with interactive toggle buttons, made table horizontally scrollable on mobile with sticky first column

Stage Summary:
- All 8 corrections implemented
- Build passes successfully
- Key files: src/app/page.tsx (main changes), src/components/archiflow/AIFloatingWrapper.tsx, src/stores/ui-store.ts
- New features: Companies module, editable permissions matrix, simplified voice notes

---
Task ID: 3
Agent: Main Agent
Task: Code quality refactoring — modularize page.tsx, clean Firebase, fix useEffects, error handling

Work Log:
- Created `src/lib/firebase-service.ts`: Typed wrapper with `getFirebase()`, `getDb()`, `getAuth()`, `FieldValue()`, replacing all `(window as any).firebase` calls
- Created `src/lib/types.ts`: Extracted 15 interfaces + 30 constants (roles, colors, navigation, categories, etc.)
- Created `src/lib/helpers.ts`: Extracted 12 pure functions (fmtCOP, fmtDate, fmtSize, getInitials, statusColor, prioColor, taskStColor, avatarColor, fmtRecTime, fileToBase64, getPlatform, uniqueId) + fmtDateTime
- Created `src/hooks/useFirestoreData.ts`: Centralized 15 Firestore onSnapshot listeners with proper error callbacks (console.error on every listener)
- Created `src/hooks/useNotifications.ts`: Complete notification engine (in-app toast, browser notifications, sound, vibration) extracted from 333 lines
- Created `src/hooks/useAuth.ts`: Auth state + login/register/Google/Microsoft/logout with proper error messages
- Created `src/hooks/useVoiceRecording.ts`: MediaRecorder API hook (start, stop, discard, play) with error handling
- Created `src/lib/firestore-actions.ts`: Centralized ALL CRUD operations (projects, tasks, expenses, suppliers, companies, files, phases, approvals, meetings, gallery, inventory) with `fbAction()` wrapper for consistent error handling
- Refactored `src/app/page.tsx`: Added imports for all new modules, replaced ALL 73 `(window as any).firebase` references with `getFirebase()`
- Fixed ALL 38 empty catch blocks: added `console.error('[ArchiFlow]', err)` to every catch
- Fixed Firestore listener error callbacks: replaced 15 empty `() => {}` with `(err) => { console.error(...) }`
- Added `console.error` to 19 generic `catch { showToast('Error', 'error') }` blocks
- Build verified: `npx next build` passes successfully

Stage Summary:
- 73 occurrences of `(window as any).firebase` → `getFirebase()` (typed, clean)
- 38 empty catch blocks → proper error logging
- 8 new modules created for future incremental migration
- page.tsx reduced from inline definitions to imports
- Build passes: no compilation errors

---
Task ID: 4
Agent: Main Agent
Task: Debug WhatsApp bot not responding to messages

Work Log:
- Analyzed webhook POST handler, whatsapp-service.ts, whatsapp-commands.ts
- Identified potential issues: expired token, silent failures in sendWhatsAppButtons, no fallback to plain text
- Created `/api/whatsapp/test` endpoint: checks env vars, validates token with Meta, verifies phone number, optionally sends test message
- Rewrote webhook POST handler: added detailed console logging at every step, extracted safeReply function with fallback (buttons → plain text)
- Removed inline Firestore operations from handleLinkingFlow, now returns result objects to safeReply which handles sending
- Added logging to GET handler for debugging verification issues

Stage Summary:
- New file: `src/app/api/whatsapp/test/route.ts` — diagnostic endpoint
- Modified: `src/app/api/whatsapp/webhook/route.ts` — improved error handling, logging, fallback
- User needs to: push code, visit `/api/whatsapp/test` to diagnose, optionally `/api/whatsapp/test?to=NUMERO` to test sending

---
Task ID: 1
Agent: Main Agent
Task: Fix ArchiFlow "This page couldn't load" runtime crash

Work Log:
- Analyzed all project files: layout.tsx, page.tsx, HomeContent.tsx, firebase-service.ts, firebase.ts, firebase-admin.ts
- Traced import chains: layout.tsx → AIFloatingWrapper → AIChatPanel/QuickActions (clean, no Firebase)
- Traced client imports: page.tsx → firebase-service.ts → getFirebase() (window.firebase compat)
- Identified Root Cause 1: firebase.ts imports modular Firebase SDK at module level, can be accidentally bundled by Turbopack
- Identified Root Cause 2: firebase-service.ts has `import type { User } from 'firebase/auth'` that Turbopack may not erase
- Created page.tsx lazy-loading wrapper with error boundary and retry mechanism
- Fixed firebase-service.ts: removed firebase/auth type import, defined all types locally
- Renamed firebase.ts to firebase.ts.DISABLED
- Generated archiflow-runtime-fix.zip with instructions

Stage Summary:
- Key fix: Remove firebase.ts (modular SDK) and fix firebase-service.ts (type import)
- page.tsx is now a minimal lazy-loading wrapper that dynamically imports HomeContent.tsx
- firebase-service.ts uses only local types, no imports from 'firebase/*' npm package
- User needs to: delete firebase.ts, replace page.tsx and firebase-service.ts, push
- Generated: /home/z/my-project/download/archiflow-runtime-fix.zip
---
Task ID: 1
Agent: Main Agent
Task: Implementar 6 features nuevas en ArchiFlow: Time Tracking, Dashboard Financiero, Kanban, Gantt, Comentarios, Reportes Exportables

Work Log:
- Updated types.ts with TimeEntry, Invoice, InvoiceItem, Comment, TimeSession interfaces
- Added NAV_ITEMS for timeTracking and invoices screens, updated SCREEN_TITLES
- Updated firestore-actions.ts with CRUD for timeEntries, invoices, comments
- Added helper functions: fmtDuration, fmtTimer, getWeekStart in helpers.ts
- Added state variables for time tracking, invoices, comments, task view mode
- Added Firestore listeners for timeEntries, invoices, comments collections
- Added time tracker (live timer) with start/stop/manual entry
- Added Time Tracking screen with 3 tabs: Tracker, Entries, Summary
- Added Invoices screen with list/create views, status management
- Added Gantt chart view in Obra tab (project detail)
- Enhanced Reports with 4 tabs: General, Financiero, Tiempo, Equipo
- Added CSV export functionality to Reports
- Added Financial dashboard with budget vs real, alerts, profitability metrics
- Added Time Entry modal for manual time registration
- Kanban board already existed in tasks screen
- Fixed duplicate getGanttDays function name conflict
- Fixed JSX parsing error in Obra tab ternary

Stage Summary:
- Build successful (Next.js 16 + Turbopack)
- ZIP created: /home/z/my-project/download/archiflow-v2-time-kanban-reports.zip (556K)
- All 6 features implemented and compiling correctly
---
