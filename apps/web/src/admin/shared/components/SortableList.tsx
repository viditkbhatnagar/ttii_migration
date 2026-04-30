import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/**
 * Tiny drag-to-reorder wrapper around dnd-kit. Children are rendered with
 * a grip handle and the parent owns the order (controlled component).
 *
 * Save-on-drop UX (Naji 2026-04-30): the moment the user releases a row,
 * we call onReorder with the new id list — caller is responsible for
 * persisting + showing a toast. We optimistically apply the reorder
 * locally so the UI doesn't flicker; if the save fails the caller can
 * pass a fresh id list back via the `ids` prop and we'll snap to it.
 */
export interface SortableListProps {
  ids: string[];
  onReorder: (nextIds: string[]) => void;
  /** Render one row by id. The grip handle is provided automatically. */
  children: (id: string, dragHandle: ReactNode) => ReactNode;
  /** Called once after a drag completes if the order actually changed. */
  className?: string;
  itemClassName?: string;
}

export function SortableList({ ids, onReorder, children, className, itemClassName }: SortableListProps) {
  const [internalIds, setInternalIds] = useState<string[]>(ids);

  // Keep internal state in sync when the parent passes a fresh list (e.g.
  // after a server refetch following a save).
  useEffect(() => {
    setInternalIds(ids);
  }, [ids]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = internalIds.indexOf(String(active.id));
      const newIndex = internalIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(internalIds, oldIndex, newIndex);
      setInternalIds(next);
      onReorder(next);
    },
    [internalIds, onReorder],
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={internalIds} strategy={verticalListSortingStrategy}>
        <ul className={className ?? 'space-y-1'}>
          {internalIds.map((id) => (
            <SortableRow key={id} id={id} {...(itemClassName !== undefined ? { className: itemClassName } : {})}>
              {children}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (id: string, dragHandle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  );

  return (
    <li ref={setNodeRef} style={style} className={className}>
      {children(id, handle)}
    </li>
  );
}
