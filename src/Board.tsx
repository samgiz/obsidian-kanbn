/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import { useEffect, useState } from 'react'
import TaskItem from './TaskItem'
import formatDate from 'dateformat'
import { Kanbn } from '@basementuniverse/kanbn/src/main'
import { paramCase } from '@basementuniverse/kanbn/src/utility'
import { Delete, Rocket, BarChart2, Play, Check, Plus, Filter, ArrowDownNarrowWide } from 'lucide-react';

const zip = (a: any[], b: any[]): Array<[any, any]> => a.map((v: any, i: number): [any, any] => [v, b[i]])

// Called when a task item has finished being dragged
const onDragEnd = (result: any, columns: any, setColumns: any): void => {
  // No destination means the item was dragged to an invalid location
  if (result.destination === undefined || result.destination === null) {
    return
  }

  // Get the source and destination columns
  const { source, destination } = result

  // The item that was moved
  let removed: KanbnTask

  // The task was dragged from one column to another
  if (source.droppableId !== destination.droppableId) {
    const sourceItems = columns[source.droppableId]
    const destItems = columns[destination.droppableId];
    [removed] = sourceItems.splice(source.index, 1)
    destItems.splice(destination.index, 0, removed)
    setColumns({
      ...columns,
      [source.droppableId]: sourceItems,
      [destination.droppableId]: destItems
    })

  // The task was dragged into the same column
  } else {
    // If the task was dragged to the same position that it currently occupies, don't move it (this will
    // prevent unnecessarily setting the task's updated date)
    if (source.index === destination.index) {
      return
    }
    const copiedItems = columns[source.droppableId];
    [removed] = copiedItems.splice(source.index, 1)
    copiedItems.splice(destination.index, 0, removed)
    setColumns({
      ...columns,
      [source.droppableId]: copiedItems
    })
  }

  // Post a message back to the extension so we can move the task in the index
  window.parent.postMessage({
    command: 'kanbn.move',
    task: removed.id,
    columnName: destination.droppableId,
    position: destination.index
  })
}

// Check if a task's due date is in the past
const checkOverdue = (task: KanbnTask): boolean => {
  if (task.metadata.due !== undefined) {
    return Date.parse(task.metadata.due) < (new Date()).getTime()
  }
  return false
}

// A list of property names that can be filtered
const filterProperties = [
  'description',
  'assigned',
  'tag',
  'relation',
  'subtask',
  'comment'
]

// Filter tasks according to the filter string
const filterTask = (
  task: KanbnTask,
  taskFilter: string,
  customFields: Array<{ name: string, type: 'boolean' | 'date' | 'number' | 'string' }>
): boolean => {
  let result = true
  const customFieldMap = Object.fromEntries(customFields.map(customField => [
    customField.name.toLowerCase(),
    customField
  ]))
  const customFieldNames = Object.keys(customFieldMap)
  taskFilter.split(' ').forEach(f => {
    const parts = f.split(':').map(p => p.toLowerCase())

    // This filter section doesn't contain a property name
    if (parts.length === 1) {
      // Filter for overdue tasks
      if (parts[0] === 'overdue') {
        if (!checkOverdue(task)) {
          result = false
        }
        return
      }

      // Filter boolean custom fields
      if (customFieldNames.includes(parts[0]) && customFieldMap[parts[0]].type === 'boolean') {
        if (
          !(customFieldMap[parts[0]].name in task.metadata) ||
          !(task.metadata[customFieldMap[parts[0]].name] === null || task.metadata[customFieldMap[parts[0]].name] === undefined)
        ) {
          result = false
        }
        return
      }

      // Filter task id or name
      console.log('task', task)
      if (
        !task.id.toLowerCase().includes(parts[0]) &&
        !task.name.toLowerCase().includes(parts[0])
      ) {
        result = false
      }
      return
    }

    // If this filter section contains a property name and value, check the value against the property
    if (
      parts.length === 2 && (
        filterProperties.includes(parts[0]) ||
        customFieldNames.includes(parts[0])
      )
    ) {
      // Fetch the value to filter by
      let propertyValue = ''
      switch (parts[0]) {
        case 'description':
          propertyValue = [
            task.description,
            ...task.subTasks.map(subTask => subTask.text)
          ].join(' ')
          break
        case 'assigned':
          propertyValue = task.metadata.assigned ?? ''
          break
        case 'tag':
          propertyValue = (task.metadata.tags ?? []).join(' ')
          break
        case 'relation':
          propertyValue = task.relations.map(relation => `${relation.type} ${relation.task}`).join(' ')
          break
        case 'subtask':
          propertyValue = task.subTasks.map(subTask => `${subTask.text}`).join(' ')
          break
        case 'comment':
          propertyValue = task.comments.map(comment => `${comment.author} ${comment.text}`).join(' ')
          break
        default:
          if (
            customFieldNames.includes(parts[0]) &&
            customFieldMap[parts[0]].type !== 'boolean' &&
            customFieldMap[parts[0]].name in task.metadata
          ) {
            propertyValue = `${task.metadata[customFieldMap[parts[0]].name]}`
          }
          break
      }

      // Check the search term against the value
      if (!propertyValue.toLowerCase().includes(parts[1])) {
        result = false
      }
    }
  })
  return result
}

// For now we don't really need to make use of these to get the basic kanbn board working
// const handleError = (error: string): void => {
//   console.error(error)
// }

const processMessage = async (kanbn: Kanbn) => {
  const newState: any = {}
  const index = await kanbn.getIndex()
  const tasks = Object.fromEntries((await kanbn.loadAllTrackedTasks(index)).map((task) =>
    kanbn.hydrateTask(index, task)
  ).map(task => [task.id, task]))
  newState.name = index.name
  newState.description = index.description
  const columns = Object.fromEntries(
    zip(
      Object.keys(index.columns),
      Object.values(index.columns).map(column => (column as string[]).map(taskId => tasks[taskId]))
      )
  )
  console.log("obladi oblada", tasks)
  console.log("huhsdafu", index.columns)
  console.log("Object.keys(index.columns)", Object.keys(index.columns))
  console.log("Object.values(index.columns)", Object.values(index.columns))
  newState.columns = columns
  console.log('columns', columns)
  newState.hiddenColumns = index.options.hiddenColumns ?? []
  newState.startedColumns = index.options.startedColumns ?? []
  newState.completedColumns = index.options.completedColumns ?? []
  newState.columnSorting = index.options.columnSorting ?? []
  newState.customFields = index.options.customFields ?? []

  // Get current sprint
  let sprint = null
  if ('sprints' in index.options && index.options.sprints.length > 0) {
    sprint = index.options.sprints[index.options.sprints.length - 1]
  }
  newState.currentSprint = sprint
  newState.dateFormat = kanbn.getDateFormat(index)
  // newState.taskFilter = oldState.taskFilter
  newState.taskFilter = ''
  console.log(newState)
  // vscode.setState(newState)
  return newState
}

// const getKanbnState = async (kanbn: Kanbn): Promise<any> => {
//   // TODO: copy over the update method
//   let index: any
//   try {
//     index = await kanbn.getIndex()
//   } catch (error) {
//     if (error instanceof Error) {
//       console.error(error.message)
//     } else {
//       throw error
//     }
//     return
//   }
//   let tasks: any[]
//   try {
//     tasks = (await kanbn.loadAllTrackedTasks(index)).map((task) =>
//       kanbn.hydrateTask(index, task)
//     )
//   } catch (error) {
//     if (error instanceof Error) {
//       void console.error(error.message)
//     } else {
//       throw error
//     }
//     return
//   }
//   return {
//     index,
//     tasks,
//     hiddenColumns: index.options.hiddenColumns ?? [],
//     startedColumns: index.options.startedColumns ?? [],
//     completedColumns: index.options.completedColumns ?? [],
//     columnSorting: index.options.columnSorting ?? {},
//     customFields: index.options.customFields ?? [],
//     dateFormat: kanbn.getDateFormat(index),
//   }
// }
// const openTask = (kanbn: Kanbn, taskId: string, columnName: string): void => {
//   // TODO: copy over the showTaskPanel method
//   // I need to callback to the extension most likely as only it will know whether to open a new panel or not. So probably a TODO: to add a callback
// }
// const moveTask = (kanbn: Kanbn, task: KanbnTask, columnName: string, position: number): void => {
//   // TODO: copy over the moveTask method
// }
// const addTask = (kanbn: Kanbn, columnName: string): void => {
//   // TODO: copy over the showTaskPanel method (with null passed for taskId)
// }
// const sortColumn = (kanbn: Kanbn, columnName: string, sortSettings: any, saveSort: boolean): void => {
//   // TODO: this is low priority. Ends up with a call to kanbn.sort
// }
// const openBurndown = (kanbn: Kanbn): void => {
//   // TODO
// }
// const createSprint = (kanbn: Kanbn, sprintName: string, sprintDescription: string, sprintStart: Date): void => {
//   // TODO
// }

const Board = ({kanbn}: any): JSX.Element => {
  console.log('kanbn', kanbn)
  // Let's set the initial state here to one retrieved form kanbn
  const [state, setState] = useState<any>(undefined)

  

  useEffect(() => {
    (async () => {
      const newState = await processMessage(kanbn);
      // if (/* newState is different from currentState */) {
        setState(newState);
      // }
    })();
  }, []); // Still depends on what triggers this effect

  const setColumns = (columns: any): void => {
    const newState = { ...state }
    newState.columns = columns
    setState(newState)
  }
  const setTaskFilter = (taskFilter: any): void => {
    const newState = { ...state }
    newState.taskFilter = taskFilter
    setState(newState)
  }

  // Called when the clear filter button is clicked
  const clearFilters = (e: React.UIEvent<HTMLElement>): void => {
    (document.querySelector('.kanbn-filter-input') as HTMLInputElement).value = ''
    filterTasks(e)
  }

  // Called when the filter form is submitted
  const filterTasks = (e: React.UIEvent<HTMLElement>): void => {
    e.preventDefault()
    setTaskFilter((document.querySelector('.kanbn-filter-input') as HTMLInputElement).value)
  }

  const taskFilter = state && state.taskFilter

  // Indicate that the board is ready to receive messages and should be updated
  console.log(state)
  return (state &&
    <>
      <div className="kanbn-header">
        <h1 className="kanbn-header-name">
          <p>{state.name}</p>
          <div className="kanbn-filter">
            <form>
              <input
                className="kanbn-filter-input"
                placeholder="Filter tasks"
              />
              <button
                type="submit"
                className="kanbn-header-button kanbn-header-button-filter"
                onClick={filterTasks}
                title="Filter tasks"
              >
                <Filter className="codicon" />
              </button>
              {
                taskFilter !== '' &&
                <button
                  type="button"
                  className="kanbn-header-button kanbn-header-button-clear-filter"
                  onClick={clearFilters}
                  title="Clear task filters"
                >
                  <Delete className="codicon" />
                </button>
              }
              {
                <button
                  type="button"
                  className="kanbn-header-button kanbn-header-button-sprint"
                  onClick={() => {
                    window.parent.postMessage({
                      command: 'kanbn.sprint'
                    })
                  }}
                  title={[
                    'Start a new sprint',
                    (state.currentSprint != null)
                      ? `Current sprint:\n  ${state.currentSprint.name}\n  Started ${formatDate(state.currentSprint.start, state.dateFormat)}`
                      : ''
                  ].join('\n')}
                >
                  <Rocket className="codicon" />
                  {(state.currentSprint != null) ? state.currentSprint.name : 'No sprint'}
                </button>
              }
              {
                <button
                  type="button"
                  className="kanbn-header-button kanbn-header-button-burndown"
                  onClick={() => {
                    window.parent.postMessage({
                      command: 'kanbn.burndown'
                    })
                  }}
                  title="Open burndown chart"
                >
                  <BarChart2 className="codicon" />
                </button>
              }
            </form>
          </div>
        </h1>
        <p className="kanbn-header-description">
          {state.description}
        </p>
      </div>
      <div className="kanbn-board">
        <DragDropContext
          onDragEnd={(result: any) => onDragEnd(result, state.columns, setColumns)}
        >
          {Object.entries(state.columns).map(([columnName, column]) => {
            if (state.hiddenColumns.includes(columnName) as boolean) {
              return false
            }
            return (
              <div
                className={[
                  'kanbn-column',
                  `kanbn-column-${paramCase(columnName)}`
                ].join(' ')}
                key={columnName}
              >
                <h2 className="kanbn-column-name">
                  {
                    state.startedColumns.includes(columnName) as boolean &&
                    <Play className="codicon" />
                  }
                  {
                    state.completedColumns.includes(columnName) as boolean &&
                    <Check className="codicon" />
                  }
                  {columnName}
                  <span className="kanbn-column-count">{(column as any).length}</span>
                  <button
                    type="button"
                    className="kanbn-column-button kanbn-create-task-button"
                    title={`Create task in ${columnName}`}
                    onClick={() => {
                      window.parent.postMessage({
                        command: 'kanbn.addTask',
                        columnName
                      })
                    }}
                  >
                    <Plus className="codicon" strokeWidth={2} />
                  </button>
                  {((columnIsSorted, columnSortSettings) => (
                    <button
                      type="button"
                      className={[
                        'kanbn-column-button',
                        'kanbn-sort-column-button',
                        columnIsSorted ? 'kanbn-column-sorted' : null
                      ].filter(i => i).join(' ')}
                      title={`Sort ${columnName}${columnIsSorted
                        ? `\nCurrently sorted by:\n${columnSortSettings.map(
                          (sorter: any) => `${sorter.field} (${sorter.order})`
                        ).join('\n')}`
                        : ''
                      }`}
                      onClick={() => {
                        window.parent.postMessage({
                          command: 'kanbn.sortColumn',
                          columnName
                        })
                      }}
                    >
                      <ArrowDownNarrowWide className="codicon" strokeWidth={2} />
                    </button>
                  ))(columnName in state.columnSorting, state.columnSorting[columnName] ?? [])}
                </h2>
                <div className="kanbn-column-task-list-container">
                  <Droppable droppableId={columnName} key={columnName}>
                    {(provided, snapshot) => {
                      const isDraggingOver: boolean = snapshot.isDraggingOver
                      return (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={[
                            'kanbn-column-task-list',
                            isDraggingOver ? 'drag-over' : null
                          ].filter(i => i).join(' ')}
                        >
                          {(column as any)
                            .filter(task => filterTask(task, taskFilter, state.customFields))
                            .map((task, position) => <TaskItem
                              key={task.id}
                              task={task}
                              columnName={columnName}
                              customFields={state.customFields}
                              position={position}
                              dateFormat={state.dateFormat}
                            />)}
                          {provided.placeholder}
                        </div>
                      )
                    }}
                  </Droppable>
                </div>
              </div>
            )
          })}
        </DragDropContext>
      </div>
    </> || <div>Loading...</div>
  )
}

export default Board
