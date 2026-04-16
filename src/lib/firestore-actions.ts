/**
 * firestore-actions.ts
 * Todas las funciones de escritura a Firestore (CRUD).
 * Usa getFirebase() en vez de (window as any).firebase.
 * Manejo de errores consistente con console.error + mensaje al usuario.
 */

import { getFirebase } from '@/lib/firebase-service';
import type { FirebaseUserInfo } from '@/contexts/AuthContext';
import { fileToBase64 } from '@/lib/helpers';
import { DEFAULT_PHASES, ProjectFormData, TaskFormData, ExpenseFormData, SupplierFormData, CompanyFormData, ApprovalFormData, MeetingFormData, GalleryPhotoFormData, InvProductFormData, InvMovementFormData, InvTransferFormData, TimeEntryFormData, InvoiceFormData, QuotationFormData, CommentFormData, ChatMessageFormData, QuotationSection, QuotationItem, QuotationPayment } from '@/lib/types';
import { confirm } from '@/hooks/useConfirmDialog';

type ToastFn = (msg: string, type?: string) => void;

/** Helper: ejecuta acción Firebase con manejo de errores consistente */
async function fbAction<T>(action: string, fn: () => Promise<T>, showToast?: ToastFn): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[ArchiFlow] ${action} error:`, err);
    if (showToast) showToast(`Error: ${action}`, 'error');
    return null;
  }
}

/* ===== PROJECTS ===== */

export function saveProject(data: ProjectFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar proyecto', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    const projData: Record<string, any> = {
      name: data.projName,
      status: data.projStatus || 'Concepto',
      client: data.projClient || '',
      location: data.projLocation || '',
      budget: Number(data.projBudget) || 0,
      description: data.projDesc || '',
      startDate: data.projStart || '',
      endDate: data.projEnd || '',
      companyId: data.projCompany || '',
      progress: 0,
      updatedAt: ts,
      updatedBy: authUser?.uid,
    };
    if (editingId) {
      await db.collection('projects').doc(editingId).update(projData);
      showToast('Proyecto actualizado');
    } else {
      projData.createdAt = ts;
      projData.createdBy = authUser?.uid;
      projData.tenantId = tenantId;
      const ref = await db.collection('projects').add(projData);
      // Init default phases
      const batch = db.batch();
      DEFAULT_PHASES.forEach((name, i) => {
        const phaseRef = db.collection('projects').doc(ref.id).collection('workPhases').doc();
        batch.set(phaseRef, { name, description: '', status: 'Pendiente', order: i, startDate: '', endDate: '', createdAt: ts });
      });
      await batch.commit();
      showToast('✅ Proyecto creado');
    }
  }, showToast);
}

export async function deleteProject(projectId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar proyecto', description: '¿Eliminar este proyecto y todos sus datos? Esta acción no se puede deshacer.', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar proyecto', async () => {
    const db = getFirebase().firestore();
    // Delete subcollections
    const collections = ['messages', 'workPhases', 'files', 'approvals'];
    for (const col of collections) {
      const snap = await db.collection('projects').doc(projectId).collection(col).get();
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      if (snap.docs.length > 0) await batch.commit();
    }
    await db.collection('projects').doc(projectId).delete();
    showToast('Proyecto eliminado');
  }, showToast);
}

/* ===== TASKS ===== */

export function saveTask(data: TaskFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar tarea', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('tasks').doc(editingId).update({
        title: data.taskTitle,
        projectId: data.taskProject,
        assigneeId: data.taskAssignee,
        priority: data.taskPriority,
        status: data.taskStatus,
        dueDate: data.taskDue || '',
      });
      showToast('Tarea actualizada');
    } else {
      await db.collection('tasks').add({
        title: data.taskTitle,
        projectId: data.taskProject,
        assigneeId: data.taskAssignee,
        priority: data.taskPriority,
        status: data.taskStatus,
        dueDate: data.taskDue || '',
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId,
      });
      showToast('✅ Tarea creada');
    }
  }, showToast);
}

export async function toggleTask(taskId: string, currentStatus: string, showToast: ToastFn) {
  return fbAction('cambiar estado tarea', async () => {
    const nextStatus = currentStatus === 'Completado' ? 'Por hacer' : 'Completado';
    await getFirebase().firestore().collection('tasks').doc(taskId).update({ status: nextStatus });
  }, showToast);
}

export async function deleteTask(taskId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar tarea', description: '¿Eliminar esta tarea?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar tarea', async () => {
    await getFirebase().firestore().collection('tasks').doc(taskId).delete();
    showToast('Tarea eliminada');
  }, showToast);
}

/* ===== CHAT MESSAGES ===== */

export async function sendMessage(chatProjectId: string, msgData: ChatMessageFormData, authUser: FirebaseUserInfo | null, showToast: ToastFn) {
  return fbAction('enviar mensaje', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    const msg = {
      ...msgData,
      uid: authUser?.uid,
      userName: authUser?.displayName || authUser?.email || 'Usuario',
      userPhoto: authUser?.photoURL || '',
      createdAt: ts,
    };
    if (chatProjectId === '__general__') {
      await db.collection('generalMessages').add(msg);
    } else {
      await db.collection('projects').doc(chatProjectId).collection('messages').add(msg);
    }
  });
}

/* ===== EXPENSES ===== */

export function saveExpense(data: ExpenseFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar gasto', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('expenses').doc(editingId).update({
        concept: data.expConcept,
        projectId: data.expProject,
        category: data.expCategory,
        amount: Number(data.expAmount) || 0,
        date: data.expDate || '',
      });
      showToast('Gasto actualizado');
    } else {
      await db.collection('expenses').add({
        concept: data.expConcept,
        projectId: data.expProject,
        category: data.expCategory,
        amount: Number(data.expAmount) || 0,
        date: data.expDate || '',
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId,
      });
      showToast('✅ Gasto registrado');
    }
  }, showToast);
}

export async function deleteExpense(expenseId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar gasto', description: '¿Eliminar este gasto?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar gasto', async () => {
    await getFirebase().firestore().collection('expenses').doc(expenseId).delete();
    showToast('Gasto eliminado');
  }, showToast);
}

/* ===== SUPPLIERS ===== */

export function saveSupplier(data: SupplierFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar proveedor', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('suppliers').doc(editingId).update({
        name: data.supName,
        category: data.supCategory,
        phone: data.supPhone || '',
        email: data.supEmail || '',
        address: data.supAddress || '',
        website: data.supWebsite || '',
        notes: data.supNotes || '',
        rating: Number(data.supRating) || 0,
      });
      showToast('Proveedor actualizado');
    } else {
      await db.collection('suppliers').add({
        name: data.supName,
        category: data.supCategory,
        phone: data.supPhone || '',
        email: data.supEmail || '',
        address: data.supAddress || '',
        website: data.supWebsite || '',
        notes: data.supNotes || '',
        rating: Number(data.supRating) || 0,
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId,
      });
      showToast('✅ Proveedor registrado');
    }
  }, showToast);
}

export async function deleteSupplier(supplierId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar proveedor', description: '¿Eliminar este proveedor?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar proveedor', async () => {
    await getFirebase().firestore().collection('suppliers').doc(supplierId).delete();
    showToast('Proveedor eliminado');
  }, showToast);
}

/* ===== COMPANIES ===== */

export function saveCompany(data: CompanyFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar empresa', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('companies').doc(editingId).update({
        name: data.compName,
        nit: data.compNit || '',
        address: data.compAddress || '',
        phone: data.compPhone || '',
        email: data.compEmail || '',
        legalName: data.compLegal || '',
      });
      showToast('Empresa actualizada');
    } else {
      await db.collection('companies').add({
        name: data.compName,
        nit: data.compNit || '',
        address: data.compAddress || '',
        phone: data.compPhone || '',
        email: data.compEmail || '',
        legalName: data.compLegal || '',
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId,
      });
      showToast('✅ Empresa registrada');
    }
  }, showToast);
}

export async function deleteCompany(companyId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar empresa', description: '¿Eliminar esta empresa?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar empresa', async () => {
    await getFirebase().firestore().collection('companies').doc(companyId).delete();
    showToast('Empresa eliminada');
  }, showToast);
}

/* ===== PROJECT FILES ===== */

export async function uploadProjectFile(projectId: string, file: File, showToast: ToastFn, authUser: FirebaseUserInfo | null) {
  return fbAction('subir archivo', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    const base64 = await fileToBase64(file);
    await db.collection('projects').doc(projectId).collection('files').add({
      name: file.name,
      type: file.type,
      size: file.size,
      url: base64,
      uploadedBy: authUser?.displayName || authUser?.email || 'Usuario',
      createdAt: ts,
    });
    showToast('✅ Archivo subido');
  }, showToast);
}

export async function deleteProjectFile(projectId: string, fileId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar archivo', description: '¿Eliminar este archivo del proyecto?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar archivo', async () => {
    await getFirebase().firestore().collection('projects').doc(projectId).collection('files').doc(fileId).delete();
    showToast('Archivo eliminado');
  }, showToast);
}

/* ===== WORK PHASES ===== */

export async function saveWorkPhase(projectId: string, data: Record<string, any>, editingId: string | null, showToast: ToastFn) {
  return fbAction('guardar fase', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('projects').doc(projectId).collection('workPhases').doc(editingId).update({
        name: data.phaseName,
        description: data.phaseDesc || '',
        startDate: data.phaseStart || '',
        endDate: data.phaseEnd || '',
      });
      showToast('Fase actualizada');
    } else {
      await db.collection('projects').doc(projectId).collection('workPhases').add({
        name: data.phaseName,
        description: data.phaseDesc || '',
        status: 'Pendiente',
        order: data.phaseOrder ?? 0,
        startDate: data.phaseStart || '',
        endDate: data.phaseEnd || '',
        createdAt: ts,
      });
      showToast('✅ Fase creada');
    }
  }, showToast);
}

export async function updatePhaseStatus(projectId: string, phaseId: string, status: string, showToast: ToastFn) {
  return fbAction('actualizar fase', async () => {
    await getFirebase().firestore()
      .collection('projects').doc(projectId)
      .collection('workPhases').doc(phaseId)
      .update({ status });
  }, showToast);
}

/* ===== APPROVALS ===== */

export function saveApproval(projectId: string, data: ApprovalFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null) {
  return fbAction('guardar aprobación', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('projects').doc(projectId).collection('approvals').doc(editingId).update({
        title: data.apprTitle,
        description: data.apprDesc || '',
      });
      showToast('Solicitud actualizada');
    } else {
      await db.collection('projects').doc(projectId).collection('approvals').add({
        title: data.apprTitle,
        description: data.apprDesc || '',
        status: 'Pendiente',
        requestedBy: authUser?.displayName || authUser?.email || 'Usuario',
        createdAt: ts,
        createdBy: authUser?.uid,
      });
      showToast('✅ Solicitud creada');
    }
  }, showToast);
}

export async function updateApproval(projectId: string, approvalId: string, status: string, showToast: ToastFn) {
  return fbAction('actualizar aprobación', async () => {
    const fb = getFirebase();
    await fb.firestore().collection('projects').doc(projectId).collection('approvals').doc(approvalId).update({ status });
    showToast(status === 'Aprobada' ? '✅ Aprobación aceptada' : status === 'Rechazada' ? '❌ Aprobación rechazada' : 'Estado actualizado');
  }, showToast);
}

export async function deleteApproval(projectId: string, approvalId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar solicitud', description: '¿Eliminar esta aprobación?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar aprobación', async () => {
    await getFirebase().firestore().collection('projects').doc(projectId).collection('approvals').doc(approvalId).delete();
    showToast('Solicitud eliminada');
  }, showToast);
}

/* ===== MEETINGS ===== */

export function saveMeeting(data: MeetingFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar reunión', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('meetings').doc(editingId).update({
        title: data.meetTitle,
        projectId: data.meetProject,
        date: data.meetDate || '',
        time: data.meetTime || '',
        duration: data.meetDuration || '',
        location: data.meetLocation || '',
        description: data.meetDesc || '',
        attendees: data.meetAttendees || [],
      });
      showToast('Reunión actualizada');
    } else {
      await db.collection('meetings').add({
        title: data.meetTitle,
        projectId: data.meetProject,
        date: data.meetDate || '',
        time: data.meetTime || '',
        duration: data.meetDuration || '',
        location: data.meetLocation || '',
        description: data.meetDesc || '',
        attendees: data.meetAttendees || [],
        createdBy: authUser?.displayName || authUser?.email || 'Usuario',
        createdAt: ts,
        createdByUid: authUser?.uid,
        tenantId,
      });
      showToast('✅ Reunión programada');
    }
  }, showToast);
}

export async function deleteMeeting(meetingId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar reunión', description: '¿Eliminar esta reunión?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar reunión', async () => {
    await getFirebase().firestore().collection('meetings').doc(meetingId).delete();
    showToast('Reunión eliminada');
  }, showToast);
}

/* ===== GALLERY ===== */

export async function saveGalleryPhoto(data: GalleryPhotoFormData, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar foto', async () => {
    const fb = getFirebase();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    await fb.firestore().collection('galleryPhotos').add({
      projectId: data.photoProject,
      categoryName: data.photoCategory || 'Otro',
      caption: data.photoCaption || '',
      imageData: data.photoImage,
      createdAt: ts,
      createdBy: authUser?.uid,
      tenantId,
    });
    showToast('✅ Foto subida');
  }, showToast);
}

export async function deleteGalleryPhoto(photoId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar foto', description: '¿Eliminar esta foto de la galería?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar foto', async () => {
    await getFirebase().firestore().collection('galleryPhotos').doc(photoId).delete();
    showToast('Foto eliminada');
  }, showToast);
}

/* ===== INVENTORY ===== */

export function saveInvProduct(data: InvProductFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar producto', async () => {
    const fb = getFirebase();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await fb.firestore().collection('invProducts').doc(editingId).update({
        name: data.prodName,
        sku: data.prodSku || '',
        categoryId: data.prodCategory,
        unit: data.prodUnit,
        price: Number(data.prodPrice) || 0,
        stock: Number(data.prodStock) || 0,
        minStock: Number(data.prodMinStock) || 0,
        description: data.prodDesc || '',
        warehouse: data.prodWarehouse || 'Almacén Principal',
        updatedAt: ts,
      });
      showToast('Producto actualizado');
    } else {
      await fb.firestore().collection('invProducts').add({
        name: data.prodName,
        sku: data.prodSku || '',
        categoryId: data.prodCategory,
        unit: data.prodUnit,
        price: Number(data.prodPrice) || 0,
        stock: Number(data.prodStock) || 0,
        minStock: Number(data.prodMinStock) || 0,
        description: data.prodDesc || '',
        imageData: data.prodImage || '',
        warehouse: data.prodWarehouse || 'Almacén Principal',
        warehouseStock: {},
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId,
      });
      showToast('✅ Producto registrado');
    }
  }, showToast);
}

export async function deleteInvProduct(productId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar producto', description: '¿Eliminar este producto del inventario?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar producto', async () => {
    await getFirebase().firestore().collection('invProducts').doc(productId).delete();
    showToast('Producto eliminado');
  }, showToast);
}

export function saveInvCategory(data: Record<string, any>, editingId: string | null, showToast: ToastFn, tenantId: string) {
  return fbAction('guardar categoría', async () => {
    const fb = getFirebase();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await fb.firestore().collection('invCategories').doc(editingId).update({
        name: data.catName,
        color: data.catColor || '#10b981',
        description: data.catDesc || '',
      });
      showToast('Categoría actualizada');
    } else {
      await fb.firestore().collection('invCategories').add({
        name: data.catName,
        color: data.catColor || '#10b981',
        description: data.catDesc || '',
        createdAt: ts,
        tenantId,
      });
      showToast('✅ Categoría creada');
    }
  }, showToast);
}

export async function deleteInvCategory(catId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar categoría', description: '¿Eliminar esta categoría de inventario?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar categoría', async () => {
    await getFirebase().firestore().collection('invCategories').doc(catId).delete();
    showToast('Categoría eliminada');
  }, showToast);
}

export function saveInvMovement(data: InvMovementFormData, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('registrar movimiento', async () => {
    const fb = getFirebase();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    await fb.firestore().collection('invMovements').add({
      productId: data.movProduct,
      type: data.movType,
      quantity: Number(data.movQuantity) || 0,
      reason: data.movReason || '',
      reference: data.movReference || '',
      date: data.movDate || '',
      warehouse: data.movWarehouse || 'Almacén Principal',
      createdAt: ts,
      createdBy: authUser?.uid,
      tenantId,
    });
    showToast('✅ Movimiento registrado');
  }, showToast);
}

export async function deleteInvMovement(movId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar movimiento', description: '¿Eliminar este registro de movimiento?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar movimiento', async () => {
    await getFirebase().firestore().collection('invMovements').doc(movId).delete();
    showToast('Movimiento eliminado');
  }, showToast);
}

export function saveInvTransfer(data: InvTransferFormData, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('registrar transferencia', async () => {
    const fb = getFirebase();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    await fb.firestore().collection('invTransfers').add({
      productId: data.transProduct,
      productName: data.transProductName || '',
      fromWarehouse: data.transFrom,
      toWarehouse: data.transTo,
      quantity: Number(data.transQuantity) || 0,
      status: 'Pendiente',
      date: data.transDate || '',
      notes: data.transNotes || '',
      createdAt: ts,
      createdBy: authUser?.uid,
      tenantId,
    });
    showToast('✅ Transferencia creada');
  }, showToast);
}

export async function deleteInvTransfer(transId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar transferencia', description: '¿Eliminar este registro de transferencia?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar transferencia', async () => {
    await getFirebase().firestore().collection('invTransfers').doc(transId).delete();
    showToast('Transferencia eliminada');
  }, showToast);
}

export async function updateTransferStatus(transId: string, status: string, showToast: ToastFn) {
  return fbAction('actualizar transferencia', async () => {
    const fb = getFirebase();
    const updates: Record<string, unknown> = { status };
    if (status === 'Completada') updates.completedAt = fb.firestore.FieldValue.serverTimestamp();
    await fb.firestore().collection('invTransfers').doc(transId).update(updates);
    showToast(`Transferencia: ${status}`);
  }, showToast);
}

/* ===== PROJECT PROGRESS ===== */

export async function updateProjectProgress(projectId: string, progress: number) {
  return fbAction('actualizar progreso', async () => {
    await getFirebase().firestore().collection('projects').doc(projectId).update({
      progress,
      updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
    });
  });
}

/* ===== USER COMPANY ===== */

export async function updateUserCompany(userId: string, companyId: string, showToast: ToastFn) {
  return fbAction('asignar empresa', async () => {
    await getFirebase().firestore().collection('users').doc(userId).update({ companyId });
    showToast('Empresa asignada');
  }, showToast);
}

/* ===== TIME ENTRIES ===== */

export function saveTimeEntry(data: TimeEntryFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar registro de tiempo', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    const entryData: Record<string, any> = {
      userId: authUser?.uid,
      userName: authUser?.displayName || authUser?.email || 'Usuario',
      projectId: data.teProject || '',
      phaseName: data.tePhase || '',
      description: data.teDescription || '',
      startTime: data.teStartTime || '',
      endTime: data.teEndTime || '',
      duration: Number(data.teDuration) || 0,
      billable: data.teBillable !== false,
      rate: Number(data.teRate) || 0,
      date: data.teDate || '',
      updatedAt: ts,
    };
    if (editingId) {
      await db.collection('timeEntries').doc(editingId).update(entryData);
      showToast('Registro actualizado');
    } else {
      entryData.createdAt = ts;
      entryData.tenantId = tenantId;
      await db.collection('timeEntries').add(entryData);
      showToast('✅ Tiempo registrado');
    }
  }, showToast);
}

export async function deleteTimeEntry(entryId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar registro', description: '¿Eliminar este registro de tiempo?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar tiempo', async () => {
    await getFirebase().firestore().collection('timeEntries').doc(entryId).delete();
    showToast('Registro eliminado');
  }, showToast);
}

/* ===== INVOICES ===== */

export function saveInvoice(data: InvoiceFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar factura', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    const proj = data.invProject ? await db.collection('projects').doc(data.invProject).get() : null;
    const projData = proj?.exists ? proj.data() : {};
    const invoiceData: Record<string, any> = {
      projectId: data.invProject || '',
      projectName: projData.name || '',
      clientName: projData.client || '',
      number: data.invNumber || `FACT-${Date.now().toString(36).toUpperCase()}`,
      status: data.invStatus || 'Borrador',
      items: data.invItems || [],
      subtotal: Number(data.invSubtotal) || 0,
      tax: Number(data.invTax) || 19,
      total: Number(data.invTotal) || 0,
      notes: data.invNotes || '',
      issueDate: data.invIssueDate || new Date().toISOString().split('T')[0],
      dueDate: data.invDueDate || '',
      updatedAt: ts,
    };
    if (editingId) {
      await db.collection('invoices').doc(editingId).update(invoiceData);
      showToast('Factura actualizada');
    } else {
      invoiceData.createdAt = ts;
      invoiceData.createdBy = authUser?.uid;
      invoiceData.tenantId = tenantId;
      await db.collection('invoices').add(invoiceData);
      showToast('✅ Factura creada');
    }
  }, showToast);
}

export async function updateInvoiceStatus(invoiceId: string, status: string, showToast: ToastFn) {
  return fbAction('actualizar factura', async () => {
    const fb = getFirebase();
    const updates: Record<string, unknown> = { status };
    if (status === 'Pagada') updates.paidDate = fb.firestore.FieldValue.serverTimestamp();
    await fb.firestore().collection('invoices').doc(invoiceId).update(updates);
    showToast(`Factura: ${status}`);
  }, showToast);
}

export async function deleteInvoice(invoiceId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar factura', description: '¿Eliminar esta factura?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar factura', async () => {
    await getFirebase().firestore().collection('invoices').doc(invoiceId).delete();
    showToast('Factura eliminada');
  }, showToast);
}

/* ===== QUOTATIONS ===== */

export function saveQuotation(data: QuotationFormData, editingId: string | null, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar cotización', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    const proj = data.projId ? await db.collection('projects').doc(data.projId).get() : null;
    const projData = proj?.exists ? proj.data() : {};

    // Recalculate all section totals
    const sections = (data.sections || []).map((sec: QuotationSection) => {
      const items = (sec.items || []).map((item: QuotationItem) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const vat = Number(item.vat) ?? 19;
        const disc = Number(item.discount) || 0;
        const sub = qty * price;
        return {
          ...item,
          subtotal: sub,
          vatAmount: sub * vat / 100,
          discountAmount: sub * disc / 100,
          total: sub + (sub * vat / 100) - (sub * disc / 100),
        };
      });
      const secSub = items.reduce((s: number, i: QuotationItem) => s + (i.subtotal || 0), 0);
      const secVat = items.reduce((s: number, i: QuotationItem) => s + (i.vatAmount || 0), 0);
      const secDisc = items.reduce((s: number, i: QuotationItem) => s + (i.discountAmount || 0), 0);
      return { ...sec, items, subtotal: secSub, vatTotal: secVat, discountTotal: secDisc, total: secSub + secVat - secDisc };
    });

    // Recalculate payments
    const grandTotal = sections.reduce((s: number, sec: QuotationSection) => s + (sec.total || 0), 0);
    const payments = (data.payments || []).map((p: QuotationPayment) => ({
      ...p,
      amount: grandTotal * (Number(p.percentage) || 0) / 100,
    }));

    const subtotal = sections.reduce((s: number, sec: QuotationSection) => s + (sec.subtotal || 0), 0);
    const vatTotal = sections.reduce((s: number, sec: QuotationSection) => s + (sec.vatTotal || 0), 0);
    const discountTotal = sections.reduce((s: number, sec: QuotationSection) => s + (sec.discountTotal || 0), 0);

    const quoteData: Record<string, any> = {
      number: data.number || `COT-${Date.now().toString(36).toUpperCase()}`,
      projectId: data.projId || '',
      projectName: projData.name || '',
      clientName: data.clientName || projData.client || '',
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      clientAddress: data.clientAddress || '',
      status: data.status || 'Borrador',
      sections,
      payments,
      subtotal,
      vatTotal,
      discountTotal,
      grandTotal,
      validUntil: data.validUntil || '',
      notes: data.notes || '',
      internalNotes: data.internalNotes || '',
      terms: data.terms || '',
      bankName: data.bankName || '',
      bankAccount: data.bankAccount || '',
      bankAccountType: data.bankAccountType || '',
      bankHolder: data.bankHolder || '',
      updatedAt: ts,
    };

    if (editingId) {
      await db.collection('quotations').doc(editingId).update(quoteData);
      showToast('Cotización actualizada');
    } else {
      quoteData.createdAt = ts;
      quoteData.createdBy = authUser?.uid;
      quoteData.tenantId = tenantId;
      await db.collection('quotations').add(quoteData);
      showToast('✅ Cotización creada');
    }
  }, showToast);
}

export async function updateQuotationStatus(quotationId: string, status: string, showToast: ToastFn) {
  return fbAction('actualizar cotización', async () => {
    const fb = getFirebase();
    await fb.firestore().collection('quotations').doc(quotationId).update({ status, updatedAt: fb.firestore.FieldValue.serverTimestamp() });
    showToast(`Cotización: ${status}`);
  }, showToast);
}

export async function duplicateQuotation(quotationId: string, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('duplicar cotización', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const doc = await db.collection('quotations').doc(quotationId).get();
    if (!doc.exists) { showToast('Cotización no encontrada', 'error'); return; }
    const data = doc.data();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    await db.collection('quotations').add({
      ...data,
      number: `COT-${Date.now().toString(36).toUpperCase()}`,
      status: 'Borrador',
      createdAt: ts,
      createdBy: authUser?.uid,
      updatedAt: ts,
      tenantId,
    });
    showToast('✅ Cotización duplicada');
  }, showToast);
}

export async function deleteQuotation(quotationId: string, showToast: ToastFn) {
  if (!(await confirm({ title: 'Eliminar cotización', description: '¿Eliminar esta cotización? Esta acción no se puede deshacer.', confirmText: 'Eliminar', variant: 'destructive' }))) return;
  return fbAction('eliminar cotización', async () => {
    await getFirebase().firestore().collection('quotations').doc(quotationId).delete();
    showToast('Cotización eliminada');
  }, showToast);
}

/* ===== COMMENTS ===== */

export function saveComment(data: CommentFormData, showToast: ToastFn, authUser: FirebaseUserInfo | null, tenantId: string) {
  return fbAction('guardar comentario', async () => {
    const fb = getFirebase();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    await fb.firestore().collection('comments').add({
      taskId: data.taskId || '',
      projectId: data.projectId || '',
      userId: authUser?.uid,
      userName: authUser?.displayName || authUser?.email || 'Usuario',
      userPhoto: authUser?.photoURL || '',
      text: data.text || '',
      mentions: data.mentions || [],
      parentId: data.parentId || null,
      createdAt: ts,
      tenantId,
    });
  });
}

export async function deleteComment(commentId: string, showToast: ToastFn) {
  return fbAction('eliminar comentario', async () => {
    await getFirebase().firestore().collection('comments').doc(commentId).delete();
    showToast('Comentario eliminado');
  }, showToast);
}
