'use client';

import { useCallback, useMemo } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { crmRepository } from '@/lib/crmRepository';
import type { ActivityEvent, Deal, DealStatus } from '@/types/crm';

export function groupDealsByStatus(deals: Deal[], statuses: DealStatus[]): Record<DealStatus, Deal[]> { return statuses.reduce((acc, status) => ({ ...acc, [status]: deals.filter((deal) => deal.status === status) }), {} as Record<DealStatus, Deal[]>); }
export function flattenColumns(columns: Record<DealStatus, Deal[]>, statuses: DealStatus[]): Deal[] { return statuses.flatMap((status) => columns[status] ?? []); }
export function reorderColumn(items: Deal[], startIndex: number, endIndex: number): Deal[] { const next = Array.from(items); const [removed] = next.splice(startIndex, 1); next.splice(endIndex, 0, removed); return next; }

export function useDealBoard(deals: Deal[], setDeals: React.Dispatch<React.SetStateAction<Deal[]>>, setActivityEvents: React.Dispatch<React.SetStateAction<ActivityEvent[]>>, enabledStatuses: DealStatus[], statusTitles: Record<DealStatus, string>, hasSearchQuery: boolean) {
  const columns = useMemo(() => groupDealsByStatus(deals, enabledStatuses), [deals, enabledStatuses]);
  const handleKanbanDragEnd = useCallback((event: DragEndEvent) => {
    if (hasSearchQuery) return;
    const sourceStatus = event.active.data.current?.status as DealStatus | undefined;
    const sourceIndex = event.active.data.current?.index as number | undefined;
    const destinationStatus = event.over?.data.current?.status as DealStatus | undefined;
    const overIndex = event.over?.data.current?.index as number | undefined;
    const overType = event.over?.data.current?.type as string | undefined;
    if (!sourceStatus || sourceIndex === undefined || !destinationStatus) return;
    const destinationIndex = overType === 'column' ? columns[destinationStatus].length : overIndex ?? columns[destinationStatus].length;
    if (!enabledStatuses.includes(sourceStatus) || !enabledStatuses.includes(destinationStatus)) return;
    if (sourceStatus === destinationStatus && sourceIndex === destinationIndex) return;
    setDeals((currentDeals) => {
      const currentColumns = groupDealsByStatus(currentDeals, enabledStatuses);
      if (sourceStatus === destinationStatus) {
        const reorderedDeals = flattenColumns({ ...currentColumns, [sourceStatus]: reorderColumn(currentColumns[sourceStatus], sourceIndex, destinationIndex) }, enabledStatuses);
        void crmRepository.replaceDeals(reorderedDeals);
        return reorderedDeals;
      }
      const sourceItems = Array.from(currentColumns[sourceStatus]);
      const destinationItems = Array.from(currentColumns[destinationStatus]);
      const [movedDeal] = sourceItems.splice(sourceIndex, 1);
      if (!movedDeal) return currentDeals;
      destinationItems.splice(destinationIndex, 0, { ...movedDeal, status: destinationStatus });
      const eventItem: ActivityEvent = { id: `activity-status-${movedDeal.id}-${Date.now()}`, dealId: movedDeal.id, timestamp: new Date().toISOString(), type: 'statusChanged', message: `Статус изменён: «${statusTitles[sourceStatus] ?? sourceStatus}» → «${statusTitles[destinationStatus] ?? destinationStatus}».` };
      void crmRepository.addActivityEvent(eventItem); void crmRepository.updateDealStatus(movedDeal.id, destinationStatus); setActivityEvents((current) => [eventItem, ...current]);
      const movedDeals = flattenColumns({ ...currentColumns, [sourceStatus]: sourceItems, [destinationStatus]: destinationItems }, enabledStatuses);
      void crmRepository.replaceDeals(movedDeals);
      return movedDeals;
    });
  }, [columns, enabledStatuses, hasSearchQuery, setActivityEvents, setDeals, statusTitles]);
  return { columns, handleKanbanDragEnd };
}
