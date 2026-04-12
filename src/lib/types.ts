/* ===== ARCHIFLOW TYPES ===== */

export interface User { uid: string; displayName: string; email: string; photoURL?: string }
export interface TeamUser { id: string; data: { name: string; email: string; role?: string; photoURL?: string } }
export interface Project { id: string; data: { name: string; status: string; client: string; location: string; budget: number; description: string; startDate: string; endDate: string; progress: number; createdAt: any; updatedAt?: any; createdBy?: string } }
export interface Task { id: string; data: { title: string; projectId: string; assigneeId: string; priority: string; status: string; dueDate: string; description?: string; startDate?: string; createdAt: any; createdBy?: string; fromActa?: string } }
export interface Expense { id: string; data: { concept: string; projectId: string; category: string; amount: number; date: string; createdAt: any } }
export interface Supplier { id: string; data: { name: string; category: string; phone: string; email: string; address: string; website: string; notes: string; rating: number; createdAt: any } }
export interface Approval { id: string; data: { title: string; description: string; status: string; createdAt: any } }
export interface PhaseEntry { id: string; text: string; confirmed: boolean; createdAt: any; createdBy: string }
export interface WorkPhase { id: string; data: { name: string; description: string; status: string; order: number; startDate: string; endDate: string; group: string; active: boolean; entries: PhaseEntry[]; createdAt: any } }
export interface ProjectFile { id: string; name: string; type: string; size: number; url?: string; data?: string; createdAt: any }
export interface OneDriveFile { id: string; name: string; size: number; mimeType: string; webUrl: string; createdDateTime: string; '@microsoft.graph.downloadUrl'?: string }
export interface GalleryPhoto { id: string; data: { projectId: string; categoryName: string; caption: string; imageData: string; createdAt: any; createdBy: string } }
export interface InvProduct { id: string; data: { name: string; sku: string; categoryId: string; unit: string; price: number; stock: number; minStock: number; description: string; imageData: string; warehouse: string; warehouseStock: Record<string, number>; createdAt: any; createdBy: string; updatedAt?: any } }
export interface InvCategory { id: string; data: { name: string; color: string; description: string; createdAt: any } }
export interface InvMovement { id: string; data: { productId: string; type: 'Entrada' | 'Salida'; quantity: number; reason: string; reference: string; date: string; warehouse: string; createdAt: any; createdBy: string } }
export interface InvTransfer { id: string; data: { productId: string; productName: string; fromWarehouse: string; toWarehouse: string; quantity: number; status: string; date: string; notes: string; createdAt: any; createdBy: string; completedAt?: any } }

// Work Log (Bitacora)
export interface WorkLogEntry {
  id: string;
  data: {
    date: string;
    weather: string;
    temperature: string;
    activities: string[];
    observations: string;
    photos: string[];
    plannedProgress: number;
    actualProgress: number;
    personnelCount: number;
    personnel: { name: string; role: string; hours: number }[];
    equipment: { name: string; hours: number }[];
    createdBy: string;
    creatorName: string;
    signatures: { uid: string; name: string; role: string; signedAt: any }[];
    createdAt: any;
  };
}

// Actas de Reunion
export interface Acta {
  id: string;
  data: {
    projectId: string;
    title: string;
    number: string;
    date: string;
    time: string;
    location: string;
    meetingType: string;
    status: string;
    participants: { name: string; role: string }[];
    topics: { title: string; discussion: string; decision: string }[];
    agreements: string[];
    compromises: { description: string; responsible: string; dueDate: string; priority: string; taskId?: string; completed: boolean }[];
    nextMeetingDate: string;
    notes: string;
    tasksGenerated: boolean;
    createdBy: string;
    createdAt: any;
  };
}

// ===== UI & STATE TYPES =====

export interface NotifEntry {
  id: string;
  title: string;
  body: string;
  icon: string;
  type: string;
  read: boolean;
  timestamp: Date;
  screen: string | null;
  itemId: string | null;
}

export interface Toast {
  msg: string;
  type: string;
}

export interface ChatMessage {
  id: string;
  uid: string;
  userName: string;
  userPhoto?: string;
  text?: string;
  type: string;
  imageData?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  audioUrl?: string;
  audioDuration?: number;
  createdAt: any;
  reactions?: Record<string, string[]>;
  replyTo?: { id: string; userName: string; text: string };
  projectId: string;
}
