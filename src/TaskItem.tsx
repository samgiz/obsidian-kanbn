import { Draggable } from '@hello-pangea/dnd'
import formatDate from 'dateformat'
import { paramCase } from '@basementuniverse/kanbn/src/utility'
import { CheckCircle, Circle, Code, User, Clock, Play, Watch, Check, MessageSquare, List, Link} from 'lucide-react'
// import vscode from './vscode'

const TaskItem = ({ task, columnName, customFields, position, dateFormat }: {
  task: KanbnTask
  columnName: string
  customFields: Array<{ name: string, type: 'boolean' | 'date' | 'number' | 'string' }>
  position: number
  dateFormat: string
}): JSX.Element => {
  const createdDate = 'created' in task.metadata ? formatDate(task.metadata.created, dateFormat) : null
  const updatedDate = 'updated' in task.metadata ? formatDate(task.metadata.updated, dateFormat) : null
  const startedDate = 'started' in task.metadata ? formatDate(task.metadata.started, dateFormat) : null
  const dueDate = 'due' in task.metadata ? formatDate(task.metadata.due, dateFormat) : null
  const completedDate = 'completed' in task.metadata ? formatDate(task.metadata.completed, dateFormat) : null

  // Check if a task's due date is in the past
  const checkOverdue = (task: KanbnTask): boolean => {
    if ('due' in task.metadata && task.metadata.due !== undefined) {
      return Date.parse(task.metadata.due) < (new Date()).getTime()
    }
    return false
  }

  return (
    <Draggable
      key={task.id}
      draggableId={task.id}
      index={position}
    >
      {(provided, snapshot) => {
        const isDragging: boolean = snapshot.isDragging
        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={[
              'kanbn-task',
              `kanbn-task-column-${paramCase(columnName)}`,
              checkOverdue(task) ? 'kanbn-task-overdue' : null,
              completedDate ?? 'kanbn-task-completed',
              isDragging ? 'drag' : null
            ].filter(i => i).join(' ')}
            style={{
              userSelect: 'none',
              ...provided.draggableProps.style
            }}
          >
            <div className="kanbn-task-data kanbn-task-data-name">
              <button
                type="button"
                onClick={() => {
                  // TODO: implement this
                  // vscode.postMessage({
                  //   command: 'kanbn.task',
                  //   taskId: task.id,
                  //   columnName: task.column
                  // })
                }}
                title={task.id}
              >
                {task.name}
              </button>
            </div>
            {
              task.metadata.tags !== undefined &&
              task.metadata.tags.length > 0 &&
              <div className="kanbn-task-data kanbn-task-data-tags">
                {task.metadata.tags.map(tag => {
                  return (
                    <span key={tag} className={[
                      'kanbn-task-tag',
                      // TODO: remove the explicit String cast once typescript bindings for kanbn are updated
                      `kanbn-task-tag-${String(paramCase(tag))}`
                    ].join(' ')}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            }
            {
              customFields.map(customField => {
                if (customField.name in task.metadata) {
                  return (
                    <div key={customField.name} className={[
                      'kanbn-task-data kanbn-task-data-custom-field',
                      // TODO: remove the explicit String cast once typescript bindings for kanbn are updated
                      `kanbn-task-data-${String(paramCase(customField.name))}`
                    ].join(' ')}>
                      {
                        customField.type === 'boolean'
                          ? (
                            <>
                            {task.metadata[customField.name] !== undefined ? 
                              <CheckCircle className="codicon" /> : 
                              <Circle className="codicon" />
                            }
                              {customField.name}
                            </>
                            )
                          : (
                            <>
                              <Code className="codicon" />
                              <span title={customField.name}>
                                {customField.type === 'date'
                                  ? formatDate(task.metadata[customField.name], dateFormat)
                                  : task.metadata[customField.name]}
                              </span>
                            </>
                            )
                      }
                    </div>
                  )
                }
                return (<></>)
              })
            }
            {
              'assigned' in task.metadata &&
              (task.metadata.assigned != null) &&
              <div className="kanbn-task-data kanbn-task-data-assigned">
                <User className="codicon" />{task.metadata.assigned}
              </div>
            }
            {
              (createdDate != null) &&
              <div className="kanbn-task-data kanbn-task-data-created" title={`Created ${createdDate}`}>
                <Clock className="codicon" /> {createdDate}
              </div>
            }
            {
              (updatedDate != null) &&
              <div className="kanbn-task-data kanbn-task-data-updated" title={`Updated ${updatedDate}`}>
                <Clock className="codicon" /> {updatedDate}
              </div>
            }
            {
              (startedDate != null) &&
              <div className="kanbn-task-data kanbn-task-data-started" title={`Started ${startedDate}`}>
                <Play className="codicon" /> {startedDate}
              </div>
            }
            {
              (dueDate != null) &&
              <div className="kanbn-task-data kanbn-task-data-due" title={`Due ${dueDate}`}>
                <Watch className="codicon" /> {dueDate}
              </div>
            }
            {
              (completedDate != null) &&
              <div className="kanbn-task-data kanbn-task-data-completed" title={`Completed ${completedDate}`}>
                <Check className="codicon" /> {completedDate}
              </div>
            }
            {
              task.comments.length > 0 &&
              <div className="kanbn-task-data kanbn-task-data-comments">
                <MessageSquare className="codicon" /> {task.comments.length}
              </div>
            }
            {
              task.subTasks.length > 0 &&
              <div className="kanbn-task-data kanbn-task-data-sub-tasks">
                <List className="codicon" />
                {task.subTasks.filter(subTask => subTask.completed).length} / {task.subTasks.length}
              </div>
            }
            {
              task.workload !== undefined &&
              <div className="kanbn-task-data kanbn-task-data-workload">
                <Play className="codicon" /> {task.workload}
              </div>
            }
            {
              task.relations.length > 0 &&
              task.relations.map(relation => (
                <div key={relation.task} className={[
                  'kanbn-task-data kanbn-task-data-relation',
                  relation.type !== '' ? `kanbn-task-data-relation-${relation.type}` : null
                ].join(' ')}>
                  <Link className="codicon" />
                  <span className="kanbn-task-data-label">
                    {relation.type}
                  </span> {relation.task}
                </div>
              ))
            }
            {
              task.workload !== undefined &&
              task.progress !== undefined &&
              <div className="kanbn-task-progress" style={{
                width: `${Math.min(1, Math.max(0, task.progress)) * 100}%`
              }}></div>
            }
          </div>
        )
      }}
    </Draggable>
  )
}

export default TaskItem
