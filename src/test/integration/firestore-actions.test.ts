import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase-service with getFirebase (needed by firestore-actions)
// The global setup mocks getDb but firestore-actions uses getFirebase()
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn();
const mockDocUpdate = vi.fn(() => Promise.resolve());
const mockDocSet = vi.fn(() => Promise.resolve());
const mockDocGet = vi.fn(() => Promise.resolve({ exists: true, data: () => ({ name: 'Test' }) }));
const mockDocDelete = vi.fn(() => Promise.resolve());
const mockCollectionAdd = vi.fn(() => Promise.resolve({ id: 'new-doc-id' }));
const mockSubDocUpdate = vi.fn(() => Promise.resolve());
const mockSubDocDelete = vi.fn(() => Promise.resolve());
const mockSubDocSet = vi.fn(() => Promise.resolve());

vi.mock('@/lib/firebase-service', () => {
  // Create firestore mock as a callable function with static FieldValue property
  // (mirrors Firebase compat SDK where firebase.firestore is both callable and has static members)
  const mockFirestoreFn = vi.fn(() => ({
    collection: vi.fn((name: string) => ({
      add: mockCollectionAdd,
      doc: vi.fn((id?: string) => ({
        id: id || 'mock-doc-id',
        get: mockDocGet,
        set: mockDocSet,
        update: mockDocUpdate,
        delete: mockDocDelete,
        collection: vi.fn(() => ({
          add: mockCollectionAdd,
          doc: vi.fn((subId?: string) => ({
            id: subId || 'sub-doc-id',
            get: mockDocGet,
            set: mockSubDocSet,
            update: mockSubDocUpdate,
            delete: mockSubDocDelete,
          })),
          get: vi.fn(() => Promise.resolve({ docs: [] })),
        })),
      })),
      get: vi.fn(() => Promise.resolve({ docs: [] })),
    })),
    batch: vi.fn(() => ({
      set: mockBatchSet,
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
  }));
  // Static FieldValue on the firestore namespace (firebase.firestore.FieldValue)
  mockFirestoreFn.FieldValue = {
    serverTimestamp: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })),
  };

  return {
    getFirebase: () => ({
      firestore: mockFirestoreFn,
      apps: [{ name: 'default' }],
    }),
    serverTimestamp: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })),
    snapToDocs: vi.fn(() => []),
  };
});

// Mock useConfirmDialog
vi.mock('@/hooks/useConfirmDialog', () => ({
  confirm: vi.fn(() => Promise.resolve(true)),
}));

// Mock helpers
vi.mock('@/lib/helpers', () => ({
  fileToBase64: vi.fn(() => Promise.resolve('data:image/png;base64,mock')),
}));

import {
  saveProject,
  deleteProject,
  saveTask,
  toggleTask,
  deleteTask,
  sendMessage,
  saveExpense,
  deleteExpense,
  saveSupplier,
  deleteSupplier,
  saveCompany,
  deleteCompany,
  saveWorkPhase,
  updatePhaseStatus,
  saveApproval,
  updateApproval,
  deleteApproval,
  saveMeeting,
  deleteMeeting,
  saveInvProduct,
  deleteInvProduct,
  saveInvCategory,
  deleteInvCategory,
  saveInvMovement,
  deleteInvMovement,
  saveInvTransfer,
  deleteInvTransfer,
  updateTransferStatus,
  updateProjectProgress,
  saveGalleryPhoto,
  deleteGalleryPhoto,
  saveTimeEntry,
  deleteTimeEntry,
  saveInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  saveComment,
  deleteComment,
} from '@/lib/firestore-actions';

const mockToast = vi.fn();
const mockAuthUser = { uid: 'user-1', displayName: 'Test User', email: 'test@test.com', photoURL: null };

describe('Firestore Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveProject', () => {
    it('creates a new project when editingId is null', async () => {
      await saveProject(
        { projName: 'New Project', projStatus: 'Concepto' },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Proyecto creado');
    });

    it('updates a project when editingId is provided', async () => {
      await saveProject(
        { projName: 'Updated Project', projStatus: 'En ejecución' },
        'existing-id',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Proyecto actualizado');
    });
  });

  describe('deleteProject', () => {
    it('calls confirm and deletes project', async () => {
      await deleteProject('proj-1', mockToast);

      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Proyecto eliminado');
    });
  });

  describe('saveTask', () => {
    it('creates a new task when editingId is null', async () => {
      await saveTask(
        { taskTitle: 'New Task', taskProject: 'proj-1', taskPriority: 'Alta', taskStatus: 'Por hacer' },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Tarea creada');
    });

    it('updates a task when editingId is provided', async () => {
      await saveTask(
        { taskTitle: 'Updated Task', taskProject: 'proj-1', taskPriority: 'Media', taskStatus: 'En progreso', taskAssignee: 'user-2', taskDue: '2024-01-01' },
        'task-1',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Tarea actualizada');
    });
  });

  describe('toggleTask', () => {
    it('toggles from Completado to Por hacer', async () => {
      await toggleTask('task-1', 'Completado', mockToast);
      expect(mockDocUpdate).toHaveBeenCalledWith({ status: 'Por hacer' });
    });

    it('toggles from Por hacer to Completado', async () => {
      await toggleTask('task-1', 'Por hacer', mockToast);
      expect(mockDocUpdate).toHaveBeenCalledWith({ status: 'Completado' });
    });
  });

  describe('deleteTask', () => {
    it('calls confirm and deletes the task', async () => {
      await deleteTask('task-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Tarea eliminada');
    });
  });

  describe('sendMessage', () => {
    it('sends message to general chat', async () => {
      await sendMessage('__general__', { text: 'Hello!' }, mockAuthUser, mockToast);
      expect(mockCollectionAdd).toHaveBeenCalled();
    });

    it('sends message to project chat', async () => {
      await sendMessage('proj-1', { text: 'Project message' }, mockAuthUser, mockToast);
      expect(mockCollectionAdd).toHaveBeenCalled();
    });
  });

  describe('saveExpense', () => {
    it('creates a new expense when editingId is null', async () => {
      await saveExpense(
        { expConcept: 'Materials', expProject: 'proj-1', expCategory: 'Materiales', expAmount: 50000, expDate: '2024-01-01' },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Gasto registrado');
    });

    it('updates an expense when editingId is provided', async () => {
      await saveExpense(
        { expConcept: 'Updated', expProject: 'proj-1', expCategory: 'Mobiliario', expAmount: 100000, expDate: '2024-01-02' },
        'exp-1',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Gasto actualizado');
    });
  });

  describe('deleteExpense', () => {
    it('calls confirm and deletes the expense', async () => {
      await deleteExpense('exp-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Gasto eliminado');
    });
  });

  describe('saveSupplier', () => {
    it('creates a new supplier when editingId is null', async () => {
      await saveSupplier(
        { supName: 'Supplier Co', supCategory: 'Materiales' },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Proveedor registrado');
    });

    it('updates a supplier when editingId is provided', async () => {
      await saveSupplier(
        { supName: 'Updated Supplier', supCategory: 'Iluminación', supPhone: '555-1234' },
        'sup-1',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Proveedor actualizado');
    });
  });

  describe('deleteSupplier', () => {
    it('calls confirm and deletes the supplier', async () => {
      await deleteSupplier('sup-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Proveedor eliminado');
    });
  });

  describe('saveCompany', () => {
    it('creates a new company when editingId is null', async () => {
      await saveCompany(
        { compName: 'New Co', compNit: '900123456-1' },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Empresa registrada');
    });

    it('updates a company when editingId is provided', async () => {
      await saveCompany(
        { compName: 'Updated Co', compNit: '900123456-2' },
        'comp-1',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Empresa actualizada');
    });
  });

  describe('deleteCompany', () => {
    it('calls confirm and deletes the company', async () => {
      await deleteCompany('comp-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Empresa eliminada');
    });
  });

  describe('saveWorkPhase', () => {
    it('creates a new phase when editingId is null', async () => {
      await saveWorkPhase(
        'proj-1',
        { phaseName: 'Foundation', phaseDesc: 'Build foundation' },
        null,
        mockToast,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Fase creada');
    });

    it('updates a phase when editingId is provided', async () => {
      await saveWorkPhase(
        'proj-1',
        { phaseName: 'Updated Phase', phaseDesc: 'New description' },
        'phase-1',
        mockToast,
      );

      expect(mockSubDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Fase actualizada');
    });
  });

  describe('updatePhaseStatus', () => {
    it('updates the phase status', async () => {
      await updatePhaseStatus('proj-1', 'phase-1', 'En progreso', mockToast);
      expect(mockSubDocUpdate).toHaveBeenCalledWith({ status: 'En progreso' });
    });
  });

  describe('saveApproval', () => {
    it('creates a new approval when editingId is null', async () => {
      await saveApproval(
        'proj-1',
        { apprTitle: 'Budget Change', apprDesc: 'Need more budget' },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Solicitud creada');
    });
  });

  describe('updateApproval', () => {
    it('updates the approval status', async () => {
      await updateApproval('proj-1', 'appr-1', 'Aprobada', mockToast);
      expect(mockSubDocUpdate).toHaveBeenCalledWith({ status: 'Aprobada' });
      expect(mockToast).toHaveBeenCalledWith('✅ Aprobación aceptada');
    });

    it('shows rejection message', async () => {
      await updateApproval('proj-1', 'appr-1', 'Rechazada', mockToast);
      expect(mockToast).toHaveBeenCalledWith('❌ Aprobación rechazada');
    });
  });

  describe('deleteApproval', () => {
    it('calls confirm and deletes the approval', async () => {
      await deleteApproval('proj-1', 'appr-1', mockToast);
      expect(mockSubDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Solicitud eliminada');
    });
  });

  describe('saveMeeting', () => {
    it('creates a new meeting when editingId is null', async () => {
      await saveMeeting(
        { meetTitle: 'Sprint Review', meetProject: 'proj-1', meetDate: '2024-02-01' },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Reunión programada');
    });

    it('updates a meeting when editingId is provided', async () => {
      await saveMeeting(
        { meetTitle: 'Updated Meeting', meetProject: 'proj-1', meetDate: '2024-02-02' },
        'meet-1',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Reunión actualizada');
    });
  });

  describe('deleteMeeting', () => {
    it('calls confirm and deletes the meeting', async () => {
      await deleteMeeting('meet-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Reunión eliminada');
    });
  });

  describe('Inventory: Products', () => {
    it('creates a new product when editingId is null', async () => {
      await saveInvProduct(
        { prodName: 'Cement', prodSku: 'CEM-001', prodCategory: 'cat-1', prodUnit: 'Saco', prodPrice: 25000, prodStock: 100 },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Producto registrado');
    });

    it('updates a product when editingId is provided', async () => {
      await saveInvProduct(
        { prodName: 'Updated Cement', prodSku: 'CEM-002', prodCategory: 'cat-1', prodUnit: 'Saco', prodPrice: 28000, prodStock: 50 },
        'prod-1',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Producto actualizado');
    });

    it('deletes a product', async () => {
      await deleteInvProduct('prod-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Producto eliminado');
    });
  });

  describe('Inventory: Categories', () => {
    it('creates a new category when editingId is null', async () => {
      await saveInvCategory(
        { catName: 'Materials', catColor: '#10b981' },
        null,
        mockToast,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Categoría creada');
    });

    it('updates a category when editingId is provided', async () => {
      await saveInvCategory(
        { catName: 'Updated Cat', catColor: '#3b82f6' },
        'cat-1',
        mockToast,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Categoría actualizada');
    });

    it('deletes a category', async () => {
      await deleteInvCategory('cat-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Categoría eliminada');
    });
  });

  describe('Inventory: Movements', () => {
    it('creates a new movement', async () => {
      await saveInvMovement(
        { movProduct: 'prod-1', movType: 'Entrada', movQuantity: 50, movReason: 'Restock' },
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Movimiento registrado');
    });

    it('deletes a movement', async () => {
      await deleteInvMovement('mov-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Movimiento eliminado');
    });
  });

  describe('Inventory: Transfers', () => {
    it('creates a new transfer', async () => {
      await saveInvTransfer(
        { transProduct: 'prod-1', transProductName: 'Cement', transFrom: 'Almacén Principal', transTo: 'Obra en Curso', transQuantity: 20 },
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Transferencia creada');
    });

    it('deletes a transfer', async () => {
      await deleteInvTransfer('trans-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Transferencia eliminada');
    });

    it('updates transfer status', async () => {
      await updateTransferStatus('trans-1', 'Completada', mockToast);
      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Transferencia: Completada');
    });
  });

  describe('updateProjectProgress', () => {
    it('updates project progress', async () => {
      await updateProjectProgress('proj-1', 75);
      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ progress: 75 }),
      );
    });
  });

  describe('Gallery', () => {
    it('saves a gallery photo', async () => {
      await saveGalleryPhoto(
        { photoProject: 'proj-1', photoCategory: 'Obra', photoCaption: 'Progress photo', photoImage: 'data:image/png;base64,abc' },
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Foto subida');
    });

    it('deletes a gallery photo', async () => {
      await deleteGalleryPhoto('photo-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Foto eliminada');
    });
  });

  describe('Time Entries', () => {
    it('creates a new time entry when editingId is null', async () => {
      await saveTimeEntry(
        { teProject: 'proj-1', tePhase: 'Foundation', teDescription: 'Work done', teStartTime: '08:00', teEndTime: '12:00', teDuration: 240, teDate: '2024-01-15' },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Tiempo registrado');
    });

    it('updates a time entry when editingId is provided', async () => {
      await saveTimeEntry(
        { teProject: 'proj-1', tePhase: 'Foundation', teDescription: 'Updated work', teStartTime: '09:00', teEndTime: '13:00', teDuration: 240, teDate: '2024-01-16' },
        'te-1',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Registro actualizado');
    });

    it('deletes a time entry', async () => {
      await deleteTimeEntry('te-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Registro eliminado');
    });
  });

  describe('Invoices', () => {
    it('creates a new invoice when editingId is null', async () => {
      await saveInvoice(
        { invProject: 'proj-1', invItems: [], invSubtotal: 1000000, invTax: 19, invTotal: 1190000 },
        null,
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('✅ Factura creada');
    });

    it('updates an invoice when editingId is provided', async () => {
      await saveInvoice(
        { invProject: 'proj-1', invItems: [], invSubtotal: 2000000, invTax: 19, invTotal: 2380000 },
        'inv-1',
        mockToast,
        mockAuthUser,
      );

      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Factura actualizada');
    });

    it('updates invoice status', async () => {
      await updateInvoiceStatus('inv-1', 'Pagada', mockToast);
      expect(mockDocUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Factura: Pagada');
    });

    it('deletes an invoice', async () => {
      await deleteInvoice('inv-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Factura eliminada');
    });
  });

  describe('Comments', () => {
    it('saves a comment', async () => {
      await saveComment(
        { taskId: 'task-1', projectId: 'proj-1', text: 'Great work!', mentions: [] },
        mockToast,
        mockAuthUser,
      );

      expect(mockCollectionAdd).toHaveBeenCalled();
    });

    it('deletes a comment', async () => {
      await deleteComment('comment-1', mockToast);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Comentario eliminado');
    });
  });
});
