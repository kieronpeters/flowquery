import type { TaskDto } from '../../shared/api-types'
import type { ProfileRow, TaskRow } from '../domain/types'

/**
 * Board and list responses truncate descriptions to protect the CPU budget
 * (DEC-025). A single-task request returns the full text, so `truncate` is
 * explicit at each call site rather than hidden in the mapper.
 */
export const DESCRIPTION_PREVIEW_LENGTH = 500

export function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

export function toTaskDto(
  task: TaskRow,
  profile: ProfileRow | undefined,
  options: { truncate: boolean },
): TaskDto {
  const truncated = options.truncate && task.description.length > DESCRIPTION_PREVIEW_LENGTH

  return {
    id: task.id,
    title: task.title,
    description: truncated
      ? task.description.slice(0, DESCRIPTION_PREVIEW_LENGTH)
      : task.description,
    descriptionTruncated: truncated,
    status: task.status,
    position: task.position,
    priority: task.priority,
    assignee: profile
      ? {
          id: profile.id,
          displayName: profile.display_name,
          roleTitle: profile.role_title,
        }
      : null,
    dueDate: task.due_date,
    version: task.version,
    createdAt: toIso(task.created_at),
    updatedAt: toIso(task.updated_at),
  }
}
