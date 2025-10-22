import PageContainer from '@/components/layout/page-container'
import { Heading } from '@/components/ui/heading'
import { KanbanBoard } from './kanban-board'
import NewTaskDialog from './new-task-dialog'

/**
 * Render the Kanban view page containing a header with controls and the Kanban board.
 *
 * @returns A JSX element that displays a heading with description, a NewTaskDialog control, and the KanbanBoard within the app's PageContainer.
 */
export default function KanbanViewPage() {
  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <Heading title={`Kanban`} description="Manage tasks by dnd" />
          <NewTaskDialog />
        </div>
        <KanbanBoard />
      </div>
    </PageContainer>
  )
}
