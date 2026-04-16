/**
 * templates.ts — Single source of truth for project templates
 *
 * All built-in templates live here. Custom templates are loaded from
 * Firestore `projectTemplates` collection at runtime.
 *
 * Consumers:
 *   - ProjectModal.tsx — template selector when creating a project
 *   - TemplatesScreen.tsx — gallery, preview, editor
 *   - FirestoreContext.tsx — saveProject() template execution
 */

/* ===== TYPES ===== */

export interface TemplatePhase {
  id: string;
  name: string;
  tasks: string[];
}

export interface UnifiedTemplate {
  /** Template ID — used as project templateId and Firestore doc ID for customs */
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Flat list of phase names (backward compat) */
  phases: string[];
  /** Flat list of task names (backward compat) */
  tasks: string[];
  /** Structured data: phases with their associated tasks (primary data source) */
  phasesData: TemplatePhase[];
  /** True for built-in templates (not editable/deletable) */
  isBuiltIn: boolean;
}

/* ===== BUILT-IN TEMPLATES ===== */

export const BUILT_IN_TEMPLATES: UnifiedTemplate[] = [
  {
    id: 'residencial',
    name: 'Residencial',
    icon: '🏠',
    description: 'Plantilla para proyectos de vivienda residencial con fases completas de construcción',
    phases: ['Planos', 'Cimentación', 'Estructura', 'Instalaciones', 'Acabados', 'Entrega'],
    tasks: [
      'Diseño arquitectónico', 'Diseño estructural', 'Estudio de suelos', 'Licencias y permisos',
      'Excavación', 'Zapatas', 'Vigas de cimentación', 'Losa de entrepiso',
      'Muros estructurales', 'Columnas', 'Vigas', 'Cubierta',
      'Instalación eléctrica', 'Instalación hidráulica', 'Instalación sanitaria', 'Gas',
      'Muros divisorios', 'Acabados de piso', 'Acabados de pared', 'Carpintería', 'Pintura', 'Instalaciones finales',
      'Limpieza final', 'Pruebas de instalaciones', 'Acta de entrega',
    ],
    phasesData: [
      { id: 'p1', name: 'Planos', tasks: ['Diseño arquitectónico', 'Diseño estructural', 'Estudio de suelos', 'Licencias y permisos'] },
      { id: 'p2', name: 'Cimentación', tasks: ['Excavación', 'Zapatas', 'Vigas de cimentación', 'Losa de entrepiso'] },
      { id: 'p3', name: 'Estructura', tasks: ['Muros estructurales', 'Columnas', 'Vigas', 'Cubierta'] },
      { id: 'p4', name: 'Instalaciones', tasks: ['Instalación eléctrica', 'Instalación hidráulica', 'Instalación sanitaria', 'Gas'] },
      { id: 'p5', name: 'Acabados', tasks: ['Muros divisorios', 'Acabados de piso', 'Acabados de pared', 'Carpintería', 'Pintura', 'Instalaciones finales'] },
      { id: 'p6', name: 'Entrega', tasks: ['Limpieza final', 'Pruebas de instalaciones', 'Acta de entrega'] },
    ],
    isBuiltIn: true,
  },
  {
    id: 'comercial',
    name: 'Comercial',
    icon: '🏢',
    description: 'Plantilla para proyectos de construcción comercial, oficinas y locales',
    phases: ['Diseño', 'Permisos', 'Obra Civil', 'Instalaciones', 'Acabados', 'Entrega'],
    tasks: [
      'Estudio de mercado', 'Diseño arquitectónico', 'Diseño de interiores',
      'Licencia de construcción', 'Estudios ambientales', 'Aprobación de planos',
      'Cimentación', 'Estructura', 'Cerramientos', 'Cubierta',
      'Eléctrica', 'Hidráulica', 'HVAC', 'Incendio',
      'Pisos', 'Techos falsos', 'Vidriería', 'Carpintería', 'Pintura',
      'Señalización', 'Limpieza', 'Pruebas', 'Acta de entrega',
    ],
    phasesData: [
      { id: 'c1', name: 'Diseño', tasks: ['Estudio de mercado', 'Diseño arquitectónico', 'Diseño de interiores'] },
      { id: 'c2', name: 'Permisos', tasks: ['Licencia de construcción', 'Estudios ambientales', 'Aprobación de planos'] },
      { id: 'c3', name: 'Obra Civil', tasks: ['Cimentación', 'Estructura', 'Cerramientos', 'Cubierta'] },
      { id: 'c4', name: 'Instalaciones', tasks: ['Eléctrica', 'Hidráulica', 'HVAC', 'Incendio'] },
      { id: 'c5', name: 'Acabados', tasks: ['Pisos', 'Techos falsos', 'Vidriería', 'Carpintería', 'Pintura'] },
      { id: 'c6', name: 'Entrega', tasks: ['Señalización', 'Limpieza', 'Pruebas', 'Acta de entrega'] },
    ],
    isBuiltIn: true,
  },
  {
    id: 'remodelacion',
    name: 'Remodelación',
    icon: '🔨',
    description: 'Plantilla para proyectos de remodelación y renovación de espacios existentes',
    phases: ['Diagnóstico', 'Diseño', 'Demolición', 'Reconstrucción', 'Acabados', 'Entrega'],
    tasks: [
      'Inspección inicial', 'Levantamiento', 'Diagnóstico estructural',
      'Diseño de remodelación', 'Presupuesto', 'Materiales',
      'Demolición selectiva', 'Retiro de escombros', 'Limpieza',
      'Reparaciones estructurales', 'Nuevos muros', 'Modificaciones',
      'Instalaciones', 'Acabados de piso', 'Acabados de pared', 'Carpintería', 'Pintura',
      'Limpieza final', 'Pruebas', 'Acta de entrega',
    ],
    phasesData: [
      { id: 'r1', name: 'Diagnóstico', tasks: ['Inspección inicial', 'Levantamiento', 'Diagnóstico estructural'] },
      { id: 'r2', name: 'Diseño', tasks: ['Diseño de remodelación', 'Presupuesto', 'Materiales'] },
      { id: 'r3', name: 'Demolición', tasks: ['Demolición selectiva', 'Retiro de escombros', 'Limpieza'] },
      { id: 'r4', name: 'Reconstrucción', tasks: ['Reparaciones estructurales', 'Nuevos muros', 'Modificaciones'] },
      { id: 'r5', name: 'Acabados', tasks: ['Instalaciones', 'Acabados de piso', 'Acabados de pared', 'Carpintería', 'Pintura'] },
      { id: 'r6', name: 'Entrega', tasks: ['Limpieza final', 'Pruebas', 'Acta de entrega'] },
    ],
    isBuiltIn: true,
  },
  {
    id: 'obra-nueva',
    name: 'Obra Nueva',
    icon: '🏗️',
    description: 'Plantilla completa para construcción de obra nueva desde cero',
    phases: ['Planeación', 'Diseño', 'Licencias', 'Preparación', 'Construcción', 'Instalaciones', 'Acabados', 'Entrega'],
    tasks: [
      'Estudio del terreno', 'Topografía', 'Análisis ambiental', 'Presupuesto',
      'Diseño arquitectónico', 'Diseño estructural', 'Diseño de instalaciones', 'Modelado 3D',
      'Licencia de construcción', 'Planos aprobados', 'Permisos ambientales',
      'Limpieza del terreno', 'Movimiento de tierras', 'Campamento de obra', 'Vallas',
      'Cimentación', 'Estructura', 'Muros', 'Cubierta', 'Escaleras',
      'Eléctrica', 'Hidráulica', 'Sanitaria', 'Gas', 'Telecomunicaciones',
      'Pisos', 'Paredes', 'Carpintería', 'Herrería', 'Pintura',
      'Paisajismo', 'Limpieza', 'Pruebas', 'Documentación', 'Acta de entrega',
    ],
    phasesData: [
      { id: 'n1', name: 'Planeación', tasks: ['Estudio del terreno', 'Topografía', 'Análisis ambiental', 'Presupuesto'] },
      { id: 'n2', name: 'Diseño', tasks: ['Diseño arquitectónico', 'Diseño estructural', 'Diseño de instalaciones', 'Modelado 3D'] },
      { id: 'n3', name: 'Licencias', tasks: ['Licencia de construcción', 'Planos aprobados', 'Permisos ambientales'] },
      { id: 'n4', name: 'Preparación', tasks: ['Limpieza del terreno', 'Movimiento de tierras', 'Campamento de obra', 'Vallas'] },
      { id: 'n5', name: 'Construcción', tasks: ['Cimentación', 'Estructura', 'Muros', 'Cubierta', 'Escaleras'] },
      { id: 'n6', name: 'Instalaciones', tasks: ['Eléctrica', 'Hidráulica', 'Sanitaria', 'Gas', 'Telecomunicaciones'] },
      { id: 'n7', name: 'Acabados', tasks: ['Pisos', 'Paredes', 'Carpintería', 'Herrería', 'Pintura'] },
      { id: 'n8', name: 'Entrega', tasks: ['Paisajismo', 'Limpieza', 'Pruebas', 'Documentación', 'Acta de entrega'] },
    ],
    isBuiltIn: true,
  },
  {
    id: 'interiorismo',
    name: 'Interiorismo',
    icon: '🎨',
    description: 'Diseño y ejecución de interiores',
    phases: ['Concepto', 'Diseño', 'Muebles', 'Obra', 'Decoración'],
    tasks: [
      'Brief del cliente', 'Moodboard y paleta', 'Planos de mobiliario', 'Selección de materiales',
      'Cotización', 'Fabricación de muebles', 'Instalación', 'Styling final',
    ],
    phasesData: [
      { id: 'i1', name: 'Concepto', tasks: ['Brief del cliente', 'Moodboard y paleta'] },
      { id: 'i2', name: 'Diseño', tasks: ['Planos de mobiliario', 'Selección de materiales', 'Cotización'] },
      { id: 'i3', name: 'Muebles', tasks: ['Fabricación de muebles'] },
      { id: 'i4', name: 'Obra', tasks: ['Instalación'] },
      { id: 'i5', name: 'Decoración', tasks: ['Styling final'] },
    ],
    isBuiltIn: true,
  },
  {
    id: 'consultoria',
    name: 'Consultoría',
    icon: '📋',
    description: 'Asesoría técnica o de diseño',
    phases: ['Diagnóstico', 'Propuesta', 'Seguimiento', 'Entrega'],
    tasks: [
      'Solicitud del cliente', 'Visita técnica', 'Informe de diagnóstico',
      'Propuesta de consultoría', 'Reunión de presentación', 'Seguimiento', 'Entrega de informe final',
    ],
    phasesData: [
      { id: 'co1', name: 'Diagnóstico', tasks: ['Solicitud del cliente', 'Visita técnica', 'Informe de diagnóstico'] },
      { id: 'co2', name: 'Propuesta', tasks: ['Propuesta de consultoría', 'Reunión de presentación'] },
      { id: 'co3', name: 'Seguimiento', tasks: ['Seguimiento'] },
      { id: 'co4', name: 'Entrega', tasks: ['Entrega de informe final'] },
    ],
    isBuiltIn: true,
  },
];

/* ===== BLANK TEMPLATE (for "no template") ===== */

export const BLANK_TEMPLATE: UnifiedTemplate = {
  id: '',
  name: 'Proyecto en blanco',
  icon: '📝',
  description: 'Proyecto vacío sin fases ni tareas predefinidas',
  phases: [],
  tasks: [],
  phasesData: [],
  isBuiltIn: true,
};

/* ===== HELPERS ===== */

/** "Proyecto en blanco" + all built-in templates */
export const ALL_BUILT_IN_TEMPLATES: UnifiedTemplate[] = [
  BLANK_TEMPLATE,
  ...BUILT_IN_TEMPLATES,
];

/** Find a template by ID (built-in or custom) */
export function findTemplateById(
  id: string,
  customTemplates?: UnifiedTemplate[]
): UnifiedTemplate | undefined {
  if (!id) return BLANK_TEMPLATE;
  // Search built-in first
  const builtIn = ALL_BUILT_IN_TEMPLATES.find(t => t.id === id);
  if (builtIn) return builtIn;
  // Search custom
  if (customTemplates) {
    return customTemplates.find(t => t.id === id);
  }
  return undefined;
}

/** Count total tasks in a template (from phasesData if available) */
export function countTemplateTasks(tpl: UnifiedTemplate): number {
  return tpl.phasesData?.reduce((s, p) => s + (p.tasks?.length || 0), 0) || tpl.tasks?.length || 0;
}

/** Count phases in a template */
export function countTemplatePhases(tpl: UnifiedTemplate): number {
  return tpl.phasesData?.length || tpl.phases?.length || 0;
}

/** Convert a Firestore document to UnifiedTemplate */
export function firestoreDocToTemplate(
  doc: { id: string; data: Record<string, unknown> }
): UnifiedTemplate {
  const d = doc.data;
  const phasesData = (d.phasesData as TemplatePhase[] | undefined) || [];
  const phases = (d.phases as string[] | undefined) || phasesData.map(p => p.name);
  const tasks = (d.tasks as string[] | undefined) || phasesData.flatMap(p => p.tasks || []);
  return {
    id: doc.id,
    name: (d.name as string) || 'Sin nombre',
    icon: (d.icon as string) || '📄',
    description: (d.description as string) || '',
    phases,
    tasks,
    phasesData,
    isBuiltIn: false,
  };
}

/** Merge built-in + custom templates into a single sorted list */
export function mergeTemplates(
  customTemplates: UnifiedTemplate[]
): UnifiedTemplate[] {
  return [...ALL_BUILT_IN_TEMPLATES, ...customTemplates];
}

/** Flatten phasesData into { phaseName, taskName }[] for task creation */
export function flattenTemplateTasks(tpl: UnifiedTemplate): Array<{ phase: string; task: string; order: number }> {
  if (tpl.phasesData?.length) {
    let order = 0;
    return tpl.phasesData.flatMap(phase =>
      (phase.tasks || []).map(task => ({ phase: phase.name, task, order: order++ }))
    );
  }
  // Fallback: flat tasks without phase association
  return (tpl.tasks || []).map((task, i) => ({ phase: '', task, order: i }));
}
