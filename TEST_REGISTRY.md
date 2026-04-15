# TEST REGISTRY — ArchiFlow Sistema de Tests como Registro Diagnostico

## Resumen Ejecutivo

| Metrica | Valor |
|---------|-------|
| Total de tests | 530 |
| Archivos de test | 27 |
| Tiempo de ejecucion | ~14s |
| Coverage threshold | 20% statements / 15% branches / 20% functions / 20% lines |
| Stack | Vitest 4.1 + Testing Library 16 + jsdom 29 + MSW 2.13 + coverage-v8 |

---

## Comandos Disponibles

```bash
bun run test            # Modo watch interactivo
bun run test:run        # Ejecucion unica (CI-friendly)
bun run test:coverage   # Tests + coverage HTML en /coverage
bun run test:diagnostic # Tests + JSON + dashboard HTML en /test-reports
```

---

## Estructura de Archivos de Test

```
src/test/
  setup.ts                          # Mocks globales (Firebase, Next.js, next-themes)
  diagnostic-reporter.ts            # Reporter custom Vitest (JSON estructurado)
  generate-report.ts                # Generador HTML dashboard diagnostico
  unit/                             # Tests unitarios puros (sin dependencias externas)
    helpers.test.ts                 # 58 tests — fmtCOP, fmtDate, getInitials, etc.
    budget-alerts.test.ts           # 30 tests — alertas de presupuesto
    gantt-helpers.test.ts           # 27 tests — calculos de Gantt
    audit-trail.test.ts             # 23 tests — extraccion de cambios
    types-schemas.test.ts           # 45 tests — constantes y tipos exportados
    themes.test.ts                  # 15 tests — temas de color
    rate-limit.test.ts              # 11 tests — rate limiting
    export-csv.test.ts              # 13 tests — exportacion CSV
    utils.test.ts                   # 14 tests — cn() (clsx + tailwind-merge)
    toast-dom.test.ts               # 15 tests — sistema de toasts DOM
  hooks/                            # Tests de hooks custom
    auth-store.test.ts              # 8 tests — AuthContext state
    ui-store.test.ts                # 19 tests — Zustand store completo
    useNetworkStatus.test.ts        # 6 tests — online/offline detection
  components/                       # Tests de componentes React
    EmptyState.test.tsx             # 11 tests — 9 ilustraciones SVG + props
    CenterModal.test.tsx            # 9 tests — Dialog wrapper con Radix
    OfflineBanner.test.tsx          # 10 tests — banner red + dismiss
    AnimatedTabs.test.tsx           # 9 tests — sliding pill tabs
    BudgetProgressBar.test.tsx      # 13 tests — barra presupuesto
    SkeletonLoaders.test.tsx        # 22 tests — 10 variantes de skeleton
    TimeProgressBar.test.tsx        # 17 tests — barra temporal
    FormField.test.tsx              # 19 tests — form + input + select + footer
    ErrorBoundary.test.tsx          # 10 tests — class component error catching
    StaggerContainer.test.tsx       # 5 tests — contenedor animado
  integration/                      # Tests de integracion (multiples modulos)
    ai-router.test.ts               # 11 tests — routeo multi-proveedor
    firestore-actions.test.ts       # 52 tests — CRUD 13 entidades Firestore
  screens/                          # Tests de regresion de pantallas
    regression.test.ts              # 43 tests — 22 screens importables
```

---

## Reporte Diagnostico (test:diagnostic)

Al ejecutar `bun run test:diagnostic`, se generan 3 archivos:

1. **test-reports/vitest.json** — Output raw del JSON reporter de Vitest
2. **test-reports/diagnostic-summary.json** — Datos estructurados por modulo y categoria:
   - `moduleName`: path relativo al archivo de test
   - `category`: unit / component / hook / integration / screen
   - `totalTests`: total de tests en el modulo
   - `passed`: tests que pasaron
   - `failed`: tests que fallaron
   - `skipped`: tests omitidos
   - `durationMs`: duracion de ejecucion
   - `severity`: info / warning / error (basado en fallos y duracion)
   - `failedTests[]`: detalles de tests fallidos con stack trace

3. **test-reports/test-report.html** — Dashboard navegable con:
   - KPIs: total tests, passed, failed, pass rate
   - Tabla de modulos con filtros por categoria y severidad
   - Detalle de tests fallidos con error message
   - Tests lentos (>2s) identificados
   - Timestamps de generacion

---

## Coverage

Ejecutar `bun run test:coverage` genera:
- `coverage/index.html` — Dashboard HTML interactivo con coverage por archivo
- `coverage/coverage-final.json` — Datos JSON de coverage

Umbrales minimos configurados en `vitest.config.ts`:
- Statements: 20%
- Branches: 15%
- Functions: 20%
- Lines: 20%

Los modulos `src/lib/**` y `src/components/**` tienen coverage alto (60-100%).
Los modulos `src/screens/**` tienen coverage bajo (2-10%) porque dependen
de Firebase real y context providers. Los tests de regresion verifican
que las pantallas son importables sin errores de sintaxis.

---

## Como Leer el Registro Diagnostico

### Paso 1: Ejecutar el diagnostico
```bash
bun run test:diagnostic
```

### Paso 2: Abrir el dashboard
Abrir `test-reports/test-report.html` en el navegador.

### Paso 3: Interpretar los resultados
- **Sin tests fallidos + coverage alto**: Modulo saludable
- **Tests fallidos**: Error en el modulo — revisar el stack trace en el dashboard
- **Tests lentos (>2s)**: Posible problema de rendimiento en setup o importacion
- **Coverage bajo en lib/**: Funciones sin testear — priorizar agregar tests
- **Coverage bajo en screens/**: Normal — estas pantallas necesitan Firebase real

### Paso 4: Priorizar arreglos
1. Tests fallidos (severity: error) — maxima prioridad
2. Tests lentos (severity: warning) — rendimiento
3. Modulos sin tests — ampliar cobertura
4. Coverage decreciendo en modulo previamente alto — posible regresion

---

## Convenciones de Tests

- **Nombres descriptivos**: "renders nothing when budget <= 0" en vez de "test1"
- **Arrange-Act-Assert**: Patron AAA en todos los tests
- **Mocks minimos**: Solo mockear lo necesario (Firebase, Next.js navigation)
- **Independientes**: Cada test es auto-contenido, no depende de otros
- **Fast**: Todos los tests ejecutan en <100ms excepto regresion (import pesado)
- **Espanol**: Nombres de describe/it en ingles para stack traces claros
