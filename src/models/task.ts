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
  // Dependencies: this task can't start until these tasks are completed
  dependsOn?: string[];
  approvalRequired?: boolean;
  rotationPool?: string[]; // memberIds or childIds (v1: memberIds)
  rotationWeights?: Record<string, number>; // optional weights per uid
  rotationIndex?: number; // server-maintained
  // Server-set metadata for auto-rescheduling
  lastAutoShiftedAt?: Date | null;
  lastAutoShiftedFrom?: Date | null;
  lastAutoShiftedTo?: Date | null;
  lastAutoShiftReason?: "past_due" | "unblocked_past" | string | null;
  // Client-set flag to disable auto reschedule behavior
  autoRescheduleDisabled?: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}
