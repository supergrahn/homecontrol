export type TaskType = "chore" | "event" | "deadline" | "checklist";
export type TaskStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "done"
  | "verified";

export interface Task {
  id: string;
  householdId: string;
  title: string;
  type: TaskType;
  description?: string;
  context?: string[];
  visibility?: "adults" | "all";
  status: TaskStatus;
  priority?: number;
  assigneeIds?: string[];
  acceptedBy?: string[];
  childIds?: string[];
  startAt?: Date | null;
  dueAt?: Date | null;
  rrule?: string | null;
  prepWindowHours?: number | null;
  nextOccurrenceAt?: Date | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}
