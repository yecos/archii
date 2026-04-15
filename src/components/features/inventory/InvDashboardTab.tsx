'use client';
import { BarChart3, AlertTriangle, Building2, Package, Plus, Tag, ArrowRight } from 'lucide-react';
import { fmtCOP } from '@/lib/helpers';
import { INV_WAREHOUSES } from '@/lib/types';
import type { InvProduct, InvCategory, InvMovement } from '@/lib/types';

interface InvAlert {
  type: 'low_stock' | 'out_of_stock' | 'pending_transfer';
  msg: string;
  severity: 'high' | 'medium' | 'critical';
}

interface InvDashboardTabProps {
  invProducts: InvProduct[];
  invCategories: InvCategory[];
  invMovements: InvMovement[];
  invAlerts: InvAlert[];
  invTotalValue: number;
  invTotalStock: number;
  getWarehouseStock: (product: InvProduct, warehouse: string) => number;
  getInvProductName: (productId: string) => string;
  getTotalStock: (product: InvProduct) => number;
  onNavigate?: (tab: string) => void;
}

export default function InvDashboardTab({
  invProducts, invCategories, invMovements, invAlerts, invTotalValue, invTotalStock,
  getWarehouseStock, getInvProductName, getTotalStock, onNavigate,
}: InvDashboardTabProps) {
  const isEmpty = invProducts.length === 0 && invCategories.length === 0 && invMovements.length === 0;

  /* ─── Empty State: primer uso ─── */
  if (isEmpty) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 size={18} className="text-[var(--af-accent)]" />Panel de Inventario</h3>
        <div className="skeuo-panel rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl skeuo-well flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-[var(--af-text3)]" />
          </div>
          <h4 className="text-base font-semibold mb-1">Inventario vacío</h4>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto mb-6">
            Comienza registrando tus primeras categorías y productos para activar el control de stock, movimientos y valoración.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate?.('categories')}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer bg-[var(--af-accent)] text-background border-none hover:bg-[var(--af-accent2)] transition-colors flex items-center gap-2 justify-center"
            >
              <Tag size={16} />Crear categoría
            </button>
            <button
              onClick={() => onNavigate?.('products')}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer skeuo-btn transition-colors flex items-center gap-2 justify-center"
            >
              <Plus size={16} />Registrar producto
            </button>
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <p className="text-[11px] text-[var(--muted-foreground)]">
              ArchiFlow maneja 3 almacenes automáticos: Almacén Principal, Obra en Curso y Bodega Reserva.
              Puedes registrar entradas, salidas y transferencias entre almacenes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 size={18} className="text-[var(--af-accent)]" />Panel de Inventario</h3>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="skeuo-panel rounded-xl p-4">
          <div className="text-2xl font-bold text-[var(--af-accent)]">{invProducts.length}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">Productos totales</div>
        </div>
        <div className="skeuo-panel rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{fmtCOP(invTotalValue)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">Valor total</div>
        </div>
        <div className="skeuo-panel rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-400">{invTotalStock.toLocaleString('es-CO')}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">Unidades en stock</div>
        </div>
        <div className={`rounded-xl p-4 border ${invAlerts.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--af-bg3)] border-[var(--border)]'}`}>
          <div className={`text-2xl font-bold ${invAlerts.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{invAlerts.length}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">Alertas activas</div>
        </div>
      </div>
      {/* Alerts Section */}
      {invAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-red-400 flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-400" />Alertas activas</h4>
          {invAlerts.map((alert, i) => (
            <div key={i} className={`rounded-lg px-3 py-2.5 border flex items-center gap-2 ${alert.severity === 'critical' ? 'bg-red-500/15 border-red-500/30' : alert.severity === 'high' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : alert.severity === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{alert.severity === 'critical' ? 'CRÍTICO' : alert.severity === 'high' ? 'ALTO' : 'MEDIO'}</span>
              <span className="text-sm">{alert.msg}</span>
            </div>
          ))}
        </div>
      )}
      {/* Warehouse Overview */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Building2 size={14} className="text-[var(--af-accent)]" />Stock por almacén</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {INV_WAREHOUSES.map(wh => {
            const whStock = invProducts.reduce((s, p) => s + getWarehouseStock(p, wh), 0);
            const whValue = invProducts.reduce((s, p) => s + getWarehouseStock(p, wh) * (Number(p.data.price) || 0), 0);
            const whProducts = invProducts.filter(p => getWarehouseStock(p, wh) > 0).length;
            return (
              <div key={wh} className="skeuo-panel rounded-xl p-4">
                <div className="text-sm font-semibold">{wh}</div>
                <div className="text-xl font-bold text-[var(--af-accent)] mt-1">{whStock.toLocaleString('es-CO')}</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">{whProducts} productos · {fmtCOP(whValue)}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Recent Movements */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Últimos movimientos</h4>
          {invMovements.length === 0 && onNavigate && (
            <button onClick={() => onNavigate('movements')} className="text-[11px] text-[var(--af-accent)] flex items-center gap-1 cursor-pointer bg-transparent border-none">
              Registrar movimiento <ArrowRight size={12} />
            </button>
          )}
        </div>
        {invMovements.length === 0 ? (
          <div className="skeuo-panel rounded-xl p-6 text-center">
            <div className="text-[var(--muted-foreground)] text-sm">Sin movimientos registrados</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1">Registra entradas y salidas para rastrear el flujo de materiales</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {invMovements.slice(0, 6).map(m => (
              <div key={m.id} className="flex items-center justify-between skeuo-panel rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${m.data.type === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>{m.data.type === 'Entrada' ? '↓' : '↑'}</span>
                  <div>
                    <div className="text-sm font-medium">{getInvProductName(m.data.productId)}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{m.data.warehouse || '—'}{m.data.reason ? ` · ${m.data.reason}` : ''}</div>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${m.data.type === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>{m.data.type === 'Entrada' ? '+' : '-'}{m.data.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Por categoría</h4>
          {invCategories.length === 0 && onNavigate && (
            <button onClick={() => onNavigate('categories')} className="text-[11px] text-[var(--af-accent)] flex items-center gap-1 cursor-pointer bg-transparent border-none">
              Crear categoría <ArrowRight size={12} />
            </button>
          )}
        </div>
        {invCategories.length === 0 ? (
          <div className="skeuo-panel rounded-xl p-6 text-center">
            <div className="text-[var(--muted-foreground)] text-sm">Sin categorías creadas</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1">Agrupa tus productos por tipo para mejor organización</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {invCategories.map(c => {
              const cp = invProducts.filter(p => p.data.categoryId === c.id);
              const cv = cp.reduce((s, p) => s + (Number(p.data.price) || 0) * getTotalStock(p), 0);
              return (
                <div key={c.id} className="skeuo-panel rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.data.color }} />
                    <span className="text-xs font-medium truncate">{c.data.name}</span>
                  </div>
                  <div className="text-lg font-bold">{cp.length}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">{fmtCOP(cv)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
