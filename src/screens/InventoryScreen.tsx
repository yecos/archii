'use client';
import React from 'react';
import { useUI } from '@/hooks/useDomain';
import { useInventory } from '@/hooks/useDomain';
import { SkeletonKPI, SkeletonTableRow } from '@/components/ui/SkeletonLoaders';
import InvDashboardTab from '@/components/features/inventory/InvDashboardTab';
import InvProductsTab from '@/components/features/inventory/InvProductsTab';
import InvCategoriesTab from '@/components/features/inventory/InvCategoriesTab';
import InvWarehouseTab from '@/components/features/inventory/InvWarehouseTab';
import InvMovementsTab from '@/components/features/inventory/InvMovementsTab';
import InvTransfersTab from '@/components/features/inventory/InvTransfersTab';
import InvReportsTab from '@/components/features/inventory/InvReportsTab';

export default function InventoryScreen() {
  const { openModal, setEditingId, setForms, showToast } = useUI();
  const {
    deleteInvCategory, deleteInvMovement, deleteInvProduct, deleteInvTransfer, getInvCategoryColor,
    getInvCategoryName, getInvProductName, getTotalStock, getWarehouseStock, invAlerts,
    invCategories, invFilterCat, invMovFilterType, invMovements, invPendingTransfers,
    invProducts, invSearch, invTab, invTotalStock, invTotalValue,
    invTransferFilterStatus, invTransfers, invWarehouseFilter, openEditInvCategory, openEditInvProduct,
    setInvFilterCat, setInvMovFilterType,
    setInvSearch, setInvTab, setInvTransferFilterStatus, setInvWarehouseFilter,
  } = useInventory();

  return (
<div className="animate-fadeIn">
            {/* Sub-tabs */}
            <div className="flex gap-1 skeuo-well rounded-xl p-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {[{ id: 'dashboard' as const, label: '📊 Panel' }, { id: 'products' as const, label: '📦 Productos' }, { id: 'categories' as const, label: '🏷️ Categorías' }, { id: 'warehouse' as const, label: '🏢 Almacén' }, { id: 'movements' as const, label: '📋 Movimientos' }, { id: 'transfers' as const, label: '🔄 Transferencias' }, { id: 'reports' as const, label: '📊 Reportes' }].map(tab => (
                <button key={tab.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${invTab === tab.id ? 'bg-[var(--skeuo-raised)] text-[var(--foreground)] shadow-[var(--skeuo-shadow-raised-sm)] border border-[var(--skeuo-edge-light)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setInvTab(tab.id)}>
                  {tab.label}
                  {tab.id === 'dashboard' && invAlerts.length > 0 && <span className="skeuo-badge w-4 h-4 rounded-full bg-[var(--af-red)] text-[9px] text-white flex items-center justify-center">{invAlerts.length}</span>}
                  {tab.id === 'transfers' && invPendingTransfers > 0 && <span className="skeuo-badge w-4 h-4 rounded-full bg-[var(--af-amber)] text-[9px] text-white flex items-center justify-center">{invPendingTransfers}</span>}
                </button>
              ))}
            </div>

            {/* Loading skeleton */}
            {!invProducts.length && !invCategories.length && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)}
                </div>
                <SkeletonTableRow cols={5} />
              </div>
            )}

            {invTab === 'dashboard' && <InvDashboardTab
              invProducts={invProducts}
              invCategories={invCategories}
              invMovements={invMovements}
              invAlerts={invAlerts}
              invTotalValue={invTotalValue}
              invTotalStock={invTotalStock}
              getWarehouseStock={getWarehouseStock}
              getInvProductName={getInvProductName}
              getTotalStock={getTotalStock}
            />}

            {invTab === 'products' && <InvProductsTab
              invProducts={invProducts}
              invCategories={invCategories}
              invSearch={invSearch}
              invFilterCat={invFilterCat}
              setInvSearch={setInvSearch}
              setInvFilterCat={setInvFilterCat}
              getTotalStock={getTotalStock}
              getWarehouseStock={getWarehouseStock}
              getInvCategoryColor={getInvCategoryColor}
              getInvCategoryName={getInvCategoryName}
              openEditInvProduct={openEditInvProduct}
              deleteInvProduct={deleteInvProduct}
              setEditingId={setEditingId}
              setForms={setForms}
              openModal={openModal}
            />}

            {invTab === 'categories' && <InvCategoriesTab
              invCategories={invCategories}
              invProducts={invProducts}
              openEditInvCategory={openEditInvCategory}
              deleteInvCategory={deleteInvCategory}
              setEditingId={setEditingId}
              setForms={setForms}
              openModal={openModal}
            />}

            {invTab === 'warehouse' && <InvWarehouseTab
              invProducts={invProducts}
              invWarehouseFilter={invWarehouseFilter}
              setInvWarehouseFilter={setInvWarehouseFilter}
              getWarehouseStock={getWarehouseStock}
              getInvCategoryColor={getInvCategoryColor}
              setEditingId={setEditingId}
              setForms={setForms}
              openModal={openModal}
            />}

            {invTab === 'movements' && <InvMovementsTab
              invMovements={invMovements}
              invMovFilterType={invMovFilterType}
              invWarehouseFilter={invWarehouseFilter}
              setInvMovFilterType={setInvMovFilterType}
              setInvWarehouseFilter={setInvWarehouseFilter}
              getInvProductName={getInvProductName}
              deleteInvMovement={deleteInvMovement}
              setEditingId={setEditingId}
              setForms={setForms}
              openModal={openModal}
            />}

            {invTab === 'transfers' && <InvTransfersTab
              invTransfers={invTransfers}
              invTransferFilterStatus={invTransferFilterStatus}
              setInvTransferFilterStatus={setInvTransferFilterStatus}
              getInvProductName={getInvProductName}
              deleteInvTransfer={deleteInvTransfer}
              setEditingId={setEditingId}
              setForms={setForms}
              openModal={openModal}
            />}

            {invTab === 'reports' && <InvReportsTab
              invProducts={invProducts}
              invCategories={invCategories}
              invMovements={invMovements}
              invTransfers={invTransfers}
              invTotalStock={invTotalStock}
              invTotalValue={invTotalValue}
              getTotalStock={getTotalStock}
              getWarehouseStock={getWarehouseStock}
              getInvCategoryColor={getInvCategoryColor}
              getInvCategoryName={getInvCategoryName}
              getInvProductName={getInvProductName}
              showToast={showToast}
            />}
          </div>
  );
}
