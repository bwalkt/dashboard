import { type UniqueIdentifier, useDndContext } from '@dnd-kit/core'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconGripVertical } from '@tabler/icons-react'
import { cva } from 'class-variance-authority'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { Task } from '../utils/store'
import { ColumnActions } from './column-action'
import { TaskCard } from './task-card'

export interface Column {
  id: UniqueIdentifier
  title: string
}

export type ColumnType = 'Column'

export interface ColumnDragData {
  type: ColumnType
  column: Column
}

interface BoardColumnProps {
  column: Column
  tasks: Task[]
  isOverlay?: boolean
}

/**
 * Renders a draggable kanban column that displays a scrollable list of task cards.
 *
 * @param column - The column descriptor containing `id` and `title`.
 * @param tasks - The array of tasks to render inside this column; task order is used for sorting context.
 * @param isOverlay - When `true`, forces the column into the overlay visual state used during drag-and-drop.
 * @returns A React element representing the column with drag handle, header actions, and a sortable list of TaskCard children.
 */
export function BoardColumn({ column, tasks, isOverlay }: BoardColumnProps) {
  const tasksIds = useMemo(() => {
    return tasks.map(task => task.id)
  }, [tasks])

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    } satisfies ColumnDragData,
    attributes: {
      roleDescription: `Column: ${column.title}`,
    },
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  }

  const variants = cva('h-[75vh] max-h-[75vh] w-[350px] max-w-full bg-secondary flex flex-col shrink-0 snap-center', {
    variants: {
      dragging: {
        default: 'border-2 border-transparent',
        over: 'ring-2 opacity-30',
        overlay: 'ring-2 ring-primary',
      },
    },
  })

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={variants({
        dragging: isOverlay ? 'overlay' : isDragging ? 'over' : undefined,
      })}
    >
      <CardHeader className="space-between flex flex-row items-center border-b-2 p-4 text-left font-semibold">
        <Button
          variant={'ghost'}
          {...attributes}
          {...listeners}
          className="text-primary/50 relative -ml-2 h-auto cursor-grab p-1"
        >
          <span className="sr-only">{`Move column: ${column.title}`}</span>
          <IconGripVertical />
        </Button>
        {/* <span className="mr-auto mt-0!"> {column.title}</span> */}
        {/* <Input
          defaultValue={column.title}
          className="text-base mt-0! mr-auto"
        /> */}
        <ColumnActions id={column.id} title={column.title} />
      </CardHeader>
      <CardContent className="flex grow flex-col gap-4 overflow-x-hidden p-2">
        <ScrollArea className="h-full">
          <SortableContext items={tasksIds}>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

/**
 * Provides a horizontally scrollable container that lays out board columns and adapts its snapping behavior based on drag-and-drop activity.
 *
 * @returns A scrollable wrapper element that arranges `children` in a horizontal row and disables snap behavior while a drag is active.
 */
export function BoardContainer({ children }: { children: React.ReactNode }) {
  const dndContext = useDndContext()

  const variations = cva('px-2  pb-4 md:px-0 flex lg:justify-start', {
    variants: {
      dragging: {
        default: '',
        active: 'snap-none',
      },
    },
  })

  return (
    <ScrollArea className="w-full rounded-md whitespace-nowrap">
      <div
        className={variations({
          dragging: dndContext.active ? 'active' : 'default',
        })}
      >
        <div className="flex flex-row items-start justify-center gap-4">{children}</div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
