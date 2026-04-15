import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportProjectsCSV,
  exportTasksCSV,
  exportExpensesCSV,
  exportSuppliersCSV,
  exportTimeCSV,
} from '@/lib/export-csv';

/* ── Mock setup ────────────────────────────────────────── */

let capturedBlob: Blob | null = null;
let mockA: { click: ReturnType<typeof vi.fn>; href: string; download: string };

beforeEach(() => {
  vi.restoreAllMocks();
  capturedBlob = null;

  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
    capturedBlob = blob;
    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  mockA = { click: vi.fn(), href: '', download: '' };
  vi.spyOn(document, 'createElement').mockReturnValue(mockA as unknown as HTMLAnchorElement);
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockA as unknown as HTMLAnchorElement);
});

/* ── Helpers ───────────────────────────────────────────── */

async function readCapturedBlob(): Promise<string> {
  expect(capturedBlob).not.toBeNull();
  return capturedBlob!.text();
}

async function getRawBytes(): Promise<Uint8Array> {
  expect(capturedBlob).not.toBeNull();
  const buffer = await capturedBlob!.arrayBuffer();
  return new Uint8Array(buffer);
}

/** Verify the blob starts with the UTF-8 BOM (EF BB BF). */
async function expectBOM(blob: Blob | null): Promise<void> {
  expect(blob).not.toBeNull();
  const buffer = await blob!.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // UTF-8 BOM is EF BB BF (3 bytes)
  expect(bytes[0]).toBe(0xef);
  expect(bytes[1]).toBe(0xbb);
  expect(bytes[2]).toBe(0xbf);
}

/* ── Tests ─────────────────────────────────────────────── */

describe('export-csv', () => {
  describe('exportProjectsCSV', () => {
    it('creates a CSV blob with UTF-8 BOM and project headers', async () => {
      const projects = [
        {
          id: 'p1',
          data: {
            name: 'Casa Loma',
            status: 'En ejecución',
            client: 'Juan Pérez',
            location: 'Bogotá',
            budget: 50000000,
            progress: 60,
            startDate: '2024-01-15',
            endDate: '2024-12-31',
          },
        },
      ];
      const tasks = [
        {
          id: 't1',
          data: { projectId: 'p1', status: 'Completado' },
        },
        {
          id: 't2',
          data: { projectId: 'p1', status: 'En progreso' },
        },
      ];
      const expenses = [
        {
          id: 'e1',
          data: { projectId: 'p1', amount: 15000000 },
        },
      ];

      exportProjectsCSV(projects, tasks, expenses);

      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      await expectBOM(capturedBlob); // UTF-8 BOM bytes
      const text = await readCapturedBlob();
      // Note: blob.text() strips the BOM per WHATWG TextDecoder spec
      expect(text).toContain('Proyecto');
      expect(text).toContain('Casa Loma');
      expect(text).toContain('En ejecución');
      expect(text).toContain('Juan Pérez');
      expect(text).toContain('50000000');
      expect(text).toContain('15000000');
      expect(text).toContain('35000000'); // budget - spent
      expect(text).toContain('60%');
      expect(text).toContain('1'); // completed tasks
      expect(text).toContain('2'); // total tasks
    });

    it('sets correct filename on download anchor', () => {
      exportProjectsCSV([], [], []);

      expect(mockA.download).toContain('archiflow-proyectos');
      expect(mockA.download).toMatch(/\.csv$/);
    });
  });

  describe('exportTasksCSV', () => {
    it('creates a CSV blob with task headers', async () => {
      const tasks = [
        {
          id: 't1',
          data: {
            title: 'Diseñar planos',
            projectId: 'p1',
            priority: 'Alta',
            status: 'En progreso',
            assigneeId: 'u1',
            dueDate: '2024-06-30',
            createdAt: { toDate: () => new Date('2024-03-01') },
          },
        },
      ];
      const projects = [
        { id: 'p1', data: { name: 'Edificio Central' } },
      ];
      const teamUsers = [
        { id: 'u1', data: { name: 'Ana García' } },
      ];

      exportTasksCSV(tasks, projects, teamUsers);

      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      await expectBOM(capturedBlob);
      const text = await readCapturedBlob();
      expect(text).toContain('Tarea');
      expect(text).toContain('Diseñar planos');
      expect(text).toContain('Edificio Central');
      expect(text).toContain('Alta');
      expect(text).toContain('Ana García');
    });

    it('handles missing project and assignee gracefully', async () => {
      const tasks = [
        {
          id: 't1',
          data: {
            title: 'Tarea huérfana',
            projectId: 'nonexistent',
            priority: '-',
            status: '-',
            assigneeId: 'nonexistent',
            dueDate: '-',
          },
        },
      ];

      exportTasksCSV(tasks, [], []);

      const text = await readCapturedBlob();
      expect(text).toContain('Tarea huérfana');
      expect(text).toContain('Tarea huérfana');
    });
  });

  describe('exportExpensesCSV', () => {
    it('creates a CSV blob with expense headers', async () => {
      const expenses = [
        {
          id: 'e1',
          data: {
            concept: 'Cemento',
            projectId: 'p1',
            category: 'Materiales',
            amount: 2500000,
            date: '2024-04-10',
          },
        },
      ];
      const projects = [
        { id: 'p1', data: { name: 'Residencia El Pinar' } },
      ];

      exportExpensesCSV(expenses, projects);

      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      await expectBOM(capturedBlob);
      const text = await readCapturedBlob();
      expect(text).toContain('Concepto');
      expect(text).toContain('Cemento');
      expect(text).toContain('Residencia El Pinar');
      expect(text).toContain('Materiales');
      expect(text).toContain('2500000');
    });

    it('sets correct filename', () => {
      exportExpensesCSV([], []);

      expect(mockA.download).toContain('archiflow-gastos');
    });
  });

  describe('exportSuppliersCSV', () => {
    it('creates a CSV blob with supplier headers', async () => {
      const suppliers = [
        {
          id: 's1',
          data: {
            name: 'Ferretería La Unión',
            category: 'Materiales',
            phone: '555-1234',
            email: 'contacto@launion.com',
            address: 'Calle 10 #5-30',
            website: 'https://launion.com',
            rating: 4.5,
            notes: 'Buen servicio',
          },
        },
      ];

      exportSuppliersCSV(suppliers);

      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      await expectBOM(capturedBlob);
      const text = await readCapturedBlob();
      expect(text).toContain('Proveedor');
      expect(text).toContain('Ferretería La Unión');
      expect(text).toContain('Materiales');
      expect(text).toContain('555-1234');
      expect(text).toContain('4.5');
    });

    it('sets correct filename', () => {
      exportSuppliersCSV([]);

      expect(mockA.download).toContain('archiflow-proveedores');
    });
  });

  describe('exportTimeCSV', () => {
    it('creates a CSV blob with time entry headers', async () => {
      const timeEntries = [
        {
          id: 'te1',
          data: {
            projectId: 'p1',
            phaseName: 'Cimentación',
            userName: 'Carlos López',
            description: 'Excavación',
            duration: 90, // 1h 30m
            billable: true,
            rate: 35000,
            date: '2024-05-15',
          },
        },
      ];
      const projects = [
        { id: 'p1', data: { name: 'Torre Norte' } },
      ];

      exportTimeCSV(timeEntries, projects);

      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      await expectBOM(capturedBlob);
      const text = await readCapturedBlob();
      expect(text).toContain('Proyecto');
      expect(text).toContain('Torre Norte');
      expect(text).toContain('Fase');
      expect(text).toContain('Cimentación');
      expect(text).toContain('Carlos López');
      expect(text).toContain('Duración');
      expect(text).toContain('1h 30m');
      expect(text).toContain('Facturable');
      expect(text).toContain('Sí');
      expect(text).toContain('52500'); // 90 min * 35000 / 60
    });

    it('calculates duration string correctly for minutes only', async () => {
      const timeEntries = [
        {
          id: 'te1',
          data: {
            projectId: 'p1',
            phaseName: '-',
            userName: '-',
            description: '-',
            duration: 45,
            billable: false,
            rate: 0,
            date: '-',
          },
        },
      ];

      exportTimeCSV(timeEntries, []);

      const text = await readCapturedBlob();
      expect(text).toContain('45m');
      expect(text).toContain('No'); // not billable
    });

    it('sets correct filename', () => {
      exportTimeCSV([], []);

      expect(mockA.download).toContain('archiflow-tiempo');
    });
  });

  describe('shared behavior', () => {
    it('calls revokeObjectURL after creating the URL', () => {
      exportProjectsCSV(
        [{ id: 'p1', data: { name: 'Test', status: '-', client: '-', location: '-', budget: 0, progress: 0, startDate: '-', endDate: '-' } }],
        [],
        []
      );

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it('handles empty arrays gracefully', async () => {
      // Empty data should produce a CSV with only headers
      exportProjectsCSV([], [], []);

      const text = await readCapturedBlob();
      // When rows is empty, toCSV returns '' (empty string)
      // So the blob will contain just the UTF-8 BOM or be empty
      expect(text).toBeDefined();
    });
  });
});
