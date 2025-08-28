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
  pausedUntil?: Date | null;
  skipDates?: string[];
  exceptionShifts?: Record<string, number>;
  approvalRequired?: boolean;
  rotationPool?: string[]; // memberIds or childIds (v1: memberIds)
  rotationIndex?: number; // server-maintained
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}
