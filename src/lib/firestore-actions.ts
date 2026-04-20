/**
 * firestore-actions.ts
 * Todas las funciones de escritura a Firestore (CRUD).
 * Usa getFirebase() en vez de (window as any).firebase.
 * Manejo de errores consistente con console.error + mensaje al usuario.
 */

import { getFirebase } from '@/lib/firebase-service';
import { fileToBase64 } from '@/lib/helpers';
import { DEFAULT_PHASES } from '@/lib/types';

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

export function saveProject(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
      projData.tenantId = tenantId || '';
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

export async function deleteProject(projectId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este proyecto y todos sus datos?')) return;
  return fbAction('eliminar proyecto', async () => {
    const db = getFirebase().firestore();
    // Delete subcollections
    const collections = ['messages', 'workPhases', 'files', 'approvals'];
    for (const col of collections) {
      const snap = await db.collection('projects').doc(projectId).collection(col).get();
      const batch = db.batch();
      snap.docs.forEach((doc: any) => batch.delete(doc.ref));
      if (snap.docs.length > 0) await batch.commit();
    }
    await db.collection('projects').doc(projectId).delete();
    showToast('Proyecto eliminado');
  }, showToast);
}

/* ===== TASKS ===== */

export function saveTask(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Tarea creada');
    }
  }, showToast);
}

export async function toggleTask(taskId: string, currentStatus: string, showToast: ToastFn, tenantId: string | null) {
  return fbAction('cambiar estado tarea', async () => {
    const nextStatus = currentStatus === 'Completado' ? 'Por hacer' : 'Completado';
    await getFirebase().firestore().collection('tasks').doc(taskId).update({ status: nextStatus });
  }, showToast);
}

export async function deleteTask(taskId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  return fbAction('eliminar tarea', async () => {
    await getFirebase().firestore().collection('tasks').doc(taskId).delete();
    showToast('Tarea eliminada');
  }, showToast);
}

/* ===== CHAT MESSAGES ===== */

export async function sendMessage(chatProjectId: string, msgData: Record<string, any>, authUser: any, showToast: ToastFn, tenantId: string | null) {
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
      tenantId: tenantId || '',
    };
    if (chatProjectId === '__general__') {
      await db.collection('generalMessages').add(msg);
    } else {
      await db.collection('projects').doc(chatProjectId).collection('messages').add(msg);
    }
  });
}

/* ===== EXPENSES ===== */

export function saveExpense(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Gasto registrado');
    }
  }, showToast);
}

export async function deleteExpense(expenseId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este gasto?')) return;
  return fbAction('eliminar gasto', async () => {
    await getFirebase().firestore().collection('expenses').doc(expenseId).delete();
    showToast('Gasto eliminado');
  }, showToast);
}

/* ===== SUPPLIERS ===== */

export function saveSupplier(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Proveedor registrado');
    }
  }, showToast);
}

export async function deleteSupplier(supplierId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  return fbAction('eliminar proveedor', async () => {
    await getFirebase().firestore().collection('suppliers').doc(supplierId).delete();
    showToast('Proveedor eliminado');
  }, showToast);
}

/* ===== COMPANIES ===== */

export function saveCompany(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Empresa registrada');
    }
  }, showToast);
}

export async function deleteCompany(companyId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar esta empresa?')) return;
  return fbAction('eliminar empresa', async () => {
    await getFirebase().firestore().collection('companies').doc(companyId).delete();
    showToast('Empresa eliminada');
  }, showToast);
}

/* ===== PROJECT FILES ===== */

export async function uploadProjectFile(projectId: string, file: File, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
      tenantId: tenantId || '',
    });
    showToast('✅ Archivo subido');
  }, showToast);
}

export async function deleteProjectFile(projectId: string, fileId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este archivo?')) return;
  return fbAction('eliminar archivo', async () => {
    await getFirebase().firestore().collection('projects').doc(projectId).collection('files').doc(fileId).delete();
    showToast('Archivo eliminado');
  }, showToast);
}

/* ===== WORK PHASES ===== */

export async function saveWorkPhase(projectId: string, data: Record<string, any>, editingId: string | null, showToast: ToastFn, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Fase creada');
    }
  }, showToast);
}

export async function updatePhaseStatus(projectId: string, phaseId: string, status: string, showToast: ToastFn, tenantId: string | null) {
  return fbAction('actualizar fase', async () => {
    await getFirebase().firestore()
      .collection('projects').doc(projectId)
      .collection('workPhases').doc(phaseId)
      .update({ status });
  }, showToast);
}

/* ===== APPROVALS ===== */

export function saveApproval(projectId: string, data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Solicitud creada');
    }
  }, showToast);
}

export async function updateApproval(projectId: string, approvalId: string, status: string, showToast: ToastFn, tenantId: string | null) {
  return fbAction('actualizar aprobación', async () => {
    const fb = getFirebase();
    await fb.firestore().collection('projects').doc(projectId).collection('approvals').doc(approvalId).update({ status });
    showToast(status === 'Aprobada' ? '✅ Aprobación aceptada' : status === 'Rechazada' ? '❌ Aprobación rechazada' : 'Estado actualizado');
  }, showToast);
}

export async function deleteApproval(projectId: string, approvalId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar esta solicitud?')) return;
  return fbAction('eliminar aprobación', async () => {
    await getFirebase().firestore().collection('projects').doc(projectId).collection('approvals').doc(approvalId).delete();
    showToast('Solicitud eliminada');
  }, showToast);
}

/* ===== MEETINGS ===== */

export function saveMeeting(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Reunión programada');
    }
  }, showToast);
}

export async function deleteMeeting(meetingId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar esta reunión?')) return;
  return fbAction('eliminar reunión', async () => {
    await getFirebase().firestore().collection('meetings').doc(meetingId).delete();
    showToast('Reunión eliminada');
  }, showToast);
}

/* ===== GALLERY ===== */

export async function saveGalleryPhoto(data: Record<string, any>, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
      tenantId: tenantId || '',
    });
    showToast('✅ Foto subida');
  }, showToast);
}

export async function deleteGalleryPhoto(photoId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar esta foto?')) return;
  return fbAction('eliminar foto', async () => {
    await getFirebase().firestore().collection('galleryPhotos').doc(photoId).delete();
    showToast('Foto eliminada');
  }, showToast);
}

/* ===== INVENTORY ===== */

export function saveInvProduct(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Producto registrado');
    }
  }, showToast);
}

export async function deleteInvProduct(productId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este producto?')) return;
  return fbAction('eliminar producto', async () => {
    await getFirebase().firestore().collection('invProducts').doc(productId).delete();
    showToast('Producto eliminado');
  }, showToast);
}

export function saveInvCategory(data: Record<string, any>, editingId: string | null, showToast: ToastFn, tenantId: string | null) {
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
        tenantId: tenantId || '',
      });
      showToast('✅ Categoría creada');
    }
  }, showToast);
}

export async function deleteInvCategory(catId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  return fbAction('eliminar categoría', async () => {
    await getFirebase().firestore().collection('invCategories').doc(catId).delete();
    showToast('Categoría eliminada');
  }, showToast);
}

export function saveInvMovement(data: Record<string, any>, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
      tenantId: tenantId || '',
    });
    showToast('✅ Movimiento registrado');
  }, showToast);
}

export async function deleteInvMovement(movId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  return fbAction('eliminar movimiento', async () => {
    await getFirebase().firestore().collection('invMovements').doc(movId).delete();
    showToast('Movimiento eliminado');
  }, showToast);
}

export function saveInvTransfer(data: Record<string, any>, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
      tenantId: tenantId || '',
    });
    showToast('✅ Transferencia creada');
  }, showToast);
}

export async function deleteInvTransfer(transId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar esta transferencia?')) return;
  return fbAction('eliminar transferencia', async () => {
    await getFirebase().firestore().collection('invTransfers').doc(transId).delete();
    showToast('Transferencia eliminada');
  }, showToast);
}

export async function updateTransferStatus(transId: string, status: string, showToast: ToastFn, tenantId: string | null) {
  return fbAction('actualizar transferencia', async () => {
    const fb = getFirebase();
    const updates: any = { status };
    if (status === 'Completada') updates.completedAt = fb.firestore.FieldValue.serverTimestamp();
    await fb.firestore().collection('invTransfers').doc(transId).update(updates);
    showToast(`Transferencia: ${status}`);
  }, showToast);
}

/* ===== PROJECT PROGRESS ===== */

export async function updateProjectProgress(projectId: string, progress: number, tenantId: string | null) {
  return fbAction('actualizar progreso', async () => {
    await getFirebase().firestore().collection('projects').doc(projectId).update({
      progress,
      updatedAt: getFirebase().firestore.FieldValue.serverTimestamp(),
    });
  });
}

/* ===== USER COMPANY ===== */

export async function updateUserCompany(userId: string, companyId: string, showToast: ToastFn, tenantId: string | null) {
  return fbAction('asignar empresa', async () => {
    await getFirebase().firestore().collection('users').doc(userId).update({ companyId });
    showToast('Empresa asignada');
  }, showToast);
}

/* ===== TIME ENTRIES ===== */

export function saveTimeEntry(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
      entryData.tenantId = tenantId || '';
      await db.collection('timeEntries').add(entryData);
      showToast('✅ Tiempo registrado');
    }
  }, showToast);
}

export async function deleteTimeEntry(entryId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este registro de tiempo?')) return;
  return fbAction('eliminar tiempo', async () => {
    await getFirebase().firestore().collection('timeEntries').doc(entryId).delete();
    showToast('Registro eliminado');
  }, showToast);
}

/* ===== INVOICES ===== */

export function saveInvoice(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
      invoiceData.tenantId = tenantId || '';
      await db.collection('invoices').add(invoiceData);
      showToast('✅ Factura creada');
    }
  }, showToast);
}

export async function updateInvoiceStatus(invoiceId: string, status: string, showToast: ToastFn, tenantId: string | null) {
  return fbAction('actualizar factura', async () => {
    const fb = getFirebase();
    const updates: any = { status };
    if (status === 'Pagada') updates.paidDate = fb.firestore.FieldValue.serverTimestamp();
    await fb.firestore().collection('invoices').doc(invoiceId).update(updates);
    showToast(`Factura: ${status}`);
  }, showToast);
}

export async function deleteInvoice(invoiceId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar esta factura?')) return;
  return fbAction('eliminar factura', async () => {
    await getFirebase().firestore().collection('invoices').doc(invoiceId).delete();
    showToast('Factura eliminada');
  }, showToast);
}

/* ===== COMMENTS ===== */

export function saveComment(data: Record<string, any>, showToast: ToastFn, authUser: any, tenantId: string | null) {
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
      tenantId: tenantId || '',
    });
  });
}

export async function deleteComment(commentId: string, showToast: ToastFn, tenantId: string | null) {
  return fbAction('eliminar comentario', async () => {
    await getFirebase().firestore().collection('comments').doc(commentId).delete();
    showToast('Comentario eliminado');
  }, showToast);
}

/* ===== RFIs (Request for Information) ===== */

export function saveRFI(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
  return fbAction('guardar RFI', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('rfis').doc(editingId).update({
        subject: data.rfiSubject,
        question: data.rfiQuestion,
        assignedTo: data.rfiAssignedTo || '',
        priority: data.rfiPriority || 'Media',
        dueDate: data.rfiDueDate || '',
        status: data.rfiStatus || 'Abierto',
        response: data.rfiResponse || '',
        updatedAt: ts,
      });
      showToast('RFI actualizado');
    } else {
      const countSnap = await db.collection('rfis').where('tenantId', '==', tenantId || '').get();
      const num = `RFI-${String(countSnap.size + 1).padStart(3, '0')}`;
      await db.collection('rfis').add({
        number: num,
        projectId: data.rfiProject || '',
        subject: data.rfiSubject,
        question: data.rfiQuestion,
        response: '',
        status: 'Abierto',
        priority: data.rfiPriority || 'Media',
        assignedTo: data.rfiAssignedTo || '',
        dueDate: data.rfiDueDate || '',
        photos: [],
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId: tenantId || '',
        updatedAt: ts,
        respondedBy: '',
        respondedAt: null,
      });
      showToast('✅ RFI creado');
    }
  }, showToast);
}

export async function deleteRFI(rfiId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este RFI?')) return;
  return fbAction('eliminar RFI', async () => {
    await getFirebase().firestore().collection('rfis').doc(rfiId).delete();
    showToast('RFI eliminado');
  }, showToast);
}

export async function updateRFIStatus(rfiId: string, status: string, response: string, showToast: ToastFn, authUser: any, tenantId: string | null) {
  return fbAction('actualizar RFI', async () => {
    const fb = getFirebase();
    const updates: Record<string, any> = { status, updatedAt: fb.firestore.FieldValue.serverTimestamp() };
    if (response !== undefined) updates.response = response;
    if (status === 'Respondido') {
      updates.respondedBy = authUser?.uid;
      updates.respondedAt = fb.firestore.FieldValue.serverTimestamp();
    }
    await fb.firestore().collection('rfis').doc(rfiId).update(updates);
    showToast(status === 'Cerrado' ? 'RFI cerrado' : status === 'Respondido' ? '✅ RFI respondido' : `RFI: ${status}`);
  }, showToast);
}

/* ===== SUBMITTALS ===== */

export function saveSubmittal(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
  return fbAction('guardar submittal', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('submittals').doc(editingId).update({
        title: data.subTitle,
        description: data.subDescription || '',
        specification: data.subSpecification || '',
        status: data.subStatus || 'Borrador',
        reviewer: data.subReviewer || '',
        dueDate: data.subDueDate || '',
        reviewNotes: data.subReviewNotes || '',
        updatedAt: ts,
      });
      showToast('Submittal actualizado');
    } else {
      const countSnap = await db.collection('submittals').where('tenantId', '==', tenantId || '').get();
      const num = `SUB-${String(countSnap.size + 1).padStart(3, '0')}`;
      await db.collection('submittals').add({
        number: num,
        projectId: data.subProject || '',
        title: data.subTitle,
        description: data.subDescription || '',
        specification: data.subSpecification || '',
        status: 'Borrador',
        submittedBy: authUser?.displayName || authUser?.email || 'Usuario',
        reviewer: data.subReviewer || '',
        dueDate: data.subDueDate || '',
        reviewNotes: '',
        reviewedAt: null,
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId: tenantId || '',
        updatedAt: ts,
      });
      showToast('✅ Submittal creado');
    }
  }, showToast);
}

export async function deleteSubmittal(subId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este submittal?')) return;
  return fbAction('eliminar submittal', async () => {
    await getFirebase().firestore().collection('submittals').doc(subId).delete();
    showToast('Submittal eliminado');
  }, showToast);
}

export async function updateSubmittalStatus(subId: string, status: string, reviewNotes: string, showToast: ToastFn, authUser: any, tenantId: string | null) {
  return fbAction('actualizar submittal', async () => {
    const fb = getFirebase();
    const updates: Record<string, any> = { status, updatedAt: fb.firestore.FieldValue.serverTimestamp() };
    if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;
    if (status === 'Aprobado' || status === 'Rechazado' || status === 'Devuelto') {
      updates.reviewedBy = authUser?.uid;
      updates.reviewedAt = fb.firestore.FieldValue.serverTimestamp();
    }
    await fb.firestore().collection('submittals').doc(subId).update(updates);
    const msgs: Record<string, string> = { 'Aprobado': '✅ Submittal aprobado', 'Rechazado': '❌ Submittal rechazado', 'Devuelto': '↩️ Submittal devuelto' };
    showToast(msgs[status] || `Submittal: ${status}`);
  }, showToast);
}

/* ===== PUNCH LIST ===== */

export function savePunchItem(data: Record<string, any>, editingId: string | null, showToast: ToastFn, authUser: any, tenantId: string | null) {
  return fbAction('guardar item punch list', async () => {
    const fb = getFirebase();
    const db = fb.firestore();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    if (editingId) {
      await db.collection('punchItems').doc(editingId).update({
        title: data.punchTitle,
        description: data.punchDescription || '',
        location: data.punchLocation || 'Otro',
        status: data.punchStatus || 'Pendiente',
        priority: data.punchPriority || 'Media',
        assignedTo: data.punchAssignedTo || '',
        dueDate: data.punchDueDate || '',
        updatedAt: ts,
      });
      showToast('Item actualizado');
    } else {
      await db.collection('punchItems').add({
        projectId: data.punchProject || '',
        title: data.punchTitle,
        description: data.punchDescription || '',
        location: data.punchLocation || 'Otro',
        status: 'Pendiente',
        priority: data.punchPriority || 'Media',
        assignedTo: data.punchAssignedTo || '',
        dueDate: data.punchDueDate || '',
        photos: [],
        completedAt: null,
        completedBy: '',
        createdAt: ts,
        createdBy: authUser?.uid,
        tenantId: tenantId || '',
        updatedAt: ts,
      });
      showToast('✅ Item agregado');
    }
  }, showToast);
}

export async function deletePunchItem(punchId: string, showToast: ToastFn, tenantId: string | null) {
  if (!confirm('¿Eliminar este item?')) return;
  return fbAction('eliminar item punch list', async () => {
    await getFirebase().firestore().collection('punchItems').doc(punchId).delete();
    showToast('Item eliminado');
  }, showToast);
}

export async function updatePunchItemStatus(punchId: string, status: string, showToast: ToastFn, authUser: any, tenantId: string | null) {
  return fbAction('actualizar punch item', async () => {
    const fb = getFirebase();
    const updates: Record<string, any> = { status, updatedAt: fb.firestore.FieldValue.serverTimestamp() };
    if (status === 'Completado') {
      updates.completedAt = fb.firestore.FieldValue.serverTimestamp();
      updates.completedBy = authUser?.uid;
    }
    await fb.firestore().collection('punchItems').doc(punchId).update(updates);
    showToast(status === 'Completado' ? '✅ Item completado' : `Item: ${status}`);
  }, showToast);
}
