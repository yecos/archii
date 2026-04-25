// ============================================================================
// ArchiFlow SDK - Public Entry Point
// ============================================================================

export { SDK_VERSION } from './types';

export { ArchiFlowClient } from './client';

export { WebhookHandler } from './webhooks';
export {
  archiflowWebhookMiddleware,
  handleArchiflowWebhook,
} from './webhooks';
export type {
  WebhookEventMap,
  WebhookEventHandler,
  WebhookEventHandlers,
  WebhookMiddlewareRequest,
  WebhookMiddlewareResponse,
} from './webhooks';

export {
  ArchiflowError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ServerError,
  NetworkError,
  isArchiflowError,
} from './errors';
export type { ValidationErrorDetail } from './errors';

export {
  delay,
  retryWithBackoff,
  formatDate,
  parseDate,
  buildQueryString,
  deepMerge,
  sanitizeOutput,
  isRetryableStatus,
} from './utils';

// ---- All Types ----

export type {
  // Configuration
  ArchiFlowConfig,
  ListParams,
  TaskFilters,
  PaginatedResponse,
  AuthStatus,

  // Interceptors
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,

  // Entities
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  Expense,
  CreateExpenseDTO,
  UpdateExpenseDTO,
  RFI,
  CreateRFIDTO,
  UpdateRFIDTO,
  Submittal,
  CreateSubmittalDTO,
  PunchItem,
  Invoice,
  InvoiceLineItem,
  Supplier,

  // Health Score
  HealthScore,
  HealthScoreHistory,

  // Webhooks
  Webhook,
  WebhookTestResult,
  WebhookPayload,

  // API Keys
  APIKey,
  APIKeyCreated,

  // BI / Export
  ExportOptions,
  BISchema,
  BICollection,
  BICollectionField,
  BIRelationship,

  // Audit
  AuditLogEntry,

  // Integrations
  Integration,
  IntegrationProvider,
} from './types';

// ---- All Enums ----

export {
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  ExpenseStatus,
  ExpenseCategory,
  RFIStatus,
  RFIPriority,
  SubmittalStatus,
  InvoiceStatus,
  PunchItemPriority,
  PunchItemStatus,
  WebhookEvent,
  IntegrationProvider,
} from './types';
