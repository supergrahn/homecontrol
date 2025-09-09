import { z } from "zod";

// Base schemas
export const TimestampSchema = z.union([
  z.date(),
  z.string().datetime(),
  z.object({
    seconds: z.number(),
    nanoseconds: z.number(),
  }),
]).transform((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'string') return new Date(val);
  // Firestore Timestamp object
  return new Date(val.seconds * 1000 + val.nanoseconds / 1000000);
});

export const OptionalTimestampSchema = z.optional(TimestampSchema);

// User schema
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  createdAt: OptionalTimestampSchema,
  lastActive: OptionalTimestampSchema,
});

// Child schema for Norwegian school integration
export const ChildSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  grade: z.string().optional(),
  schoolId: z.string().optional(),
  schoolUrl: z.string().url().optional(),
  birthYear: z.number().int().min(2000).max(new Date().getFullYear()).optional(),
  createdAt: OptionalTimestampSchema,
  updatedAt: OptionalTimestampSchema,
});

// Task schema with Norwegian-specific enhancements
export const TaskStatusSchema = z.enum([
  "open", "in_progress", "done", "verified", "blocked", "cancelled"
]);

export const TaskTypeSchema = z.enum([
  "task", "chore", "checklist", "homework", "dugnad", "friluftsliv"
]);

export const TaskPrioritySchema = z.union([
  z.literal(1), // Low
  z.literal(2), // Medium  
  z.literal(3), // High
]);

export const TaskRecurrenceSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).default(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  endDate: OptionalTimestampSchema,
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: TaskStatusSchema.default("open"),
  type: TaskTypeSchema.default("task"),
  priority: TaskPrioritySchema.optional(),
  context: z.array(z.string()).default([]),
  
  // Scheduling
  dueAt: OptionalTimestampSchema,
  startAt: OptionalTimestampSchema,
  nextOccurrenceAt: OptionalTimestampSchema,
  prepWindowHours: z.number().min(0).max(168).optional(), // Max 1 week
  
  // Assignment and tracking
  assignedTo: z.array(z.string()).default([]),
  acceptedBy: z.array(z.string()).default([]),
  completedBy: z.string().optional(),
  completedAt: OptionalTimestampSchema,
  verifiedBy: z.string().optional(),
  verifiedAt: OptionalTimestampSchema,
  
  // Dependencies and blocking
  dependsOn: z.array(z.string()).default([]),
  
  // Recurrence
  recurrence: TaskRecurrenceSchema.optional(),
  
  // Auto-shifting (Norwegian school integration)
  lastAutoShiftedAt: OptionalTimestampSchema,
  lastAutoShiftReason: z.enum(["blocked", "unblocked_past", "school_conflict"]).optional(),
  
  // Norwegian-specific
  schoolRelated: z.boolean().default(false),
  dugnadType: z.enum(["cleaning", "maintenance", "event", "fundraising"]).optional(),
  
  // Metadata
  createdAt: OptionalTimestampSchema,
  updatedAt: OptionalTimestampSchema,
  createdBy: z.string().min(1),
  householdId: z.string().min(1),
});

// Household schema
export const HouseholdMemberRoleSchema = z.enum(["admin", "member", "child"]);

export const HouseholdMemberSchema = z.object({
  userId: z.string().min(1),
  role: HouseholdMemberRoleSchema,
  displayName: z.string().min(1),
  joinedAt: TimestampSchema,
  permissions: z.array(z.string()).default([]),
});

export const HouseholdSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  
  // Members
  members: z.array(HouseholdMemberSchema).min(1),
  children: z.array(ChildSchema).default([]),
  
  // Norwegian-specific settings
  locale: z.string().default("no"),
  timezone: z.string().default("Europe/Oslo"),
  currency: z.string().default("NOK"),
  
  // School integration settings
  schoolIntegrationEnabled: z.boolean().default(true),
  quietHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }).default({ start: "20:00", end: "07:00" }),
  
  // Metadata
  createdAt: OptionalTimestampSchema,
  updatedAt: OptionalTimestampSchema,
  createdBy: z.string().min(1),
});

// School data schemas (from School Crawler Platform)
export const SchoolEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location: z.string().optional(),
  teacher: z.string().optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  type: z.enum(["lesson", "break", "lunch", "assembly", "other"]),
  description: z.string().optional(),
});

export const BellPeriodSchema = z.object({
  period: z.number().int().min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().optional(),
});

export const SchoolSummarySchema = z.object({
  status: z.enum(["ok", "error"]),
  events: z.array(SchoolEventSchema),
  bell_schedule: z.array(BellPeriodSchema),
  metadata: z.object({
    school_name: z.string().optional(),
    date: z.string(),
    timezone: z.string(),
  }),
  last_updated: z.string().datetime().optional(),
  cache_status: z.enum(["fresh", "stale"]).optional(),
});

// Notification schemas for Norwegian push notifications
export const NotificationDataSchema = z.object({
  type: z.enum(["task.reminder", "task.assigned", "digest.daily", "school.update"]),
  taskId: z.string().optional(),
  householdId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.string(), z.any()).optional(),
  scheduledAt: OptionalTimestampSchema,
});

// Export type helpers
export type User = z.infer<typeof UserSchema>;
export type Child = z.infer<typeof ChildSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type Household = z.infer<typeof HouseholdSchema>;
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
export type HouseholdMemberRole = z.infer<typeof HouseholdMemberRoleSchema>;
export type SchoolEvent = z.infer<typeof SchoolEventSchema>;
export type BellPeriod = z.infer<typeof BellPeriodSchema>;
export type SchoolSummary = z.infer<typeof SchoolSummarySchema>;
export type NotificationData = z.infer<typeof NotificationDataSchema>;

// Validation helpers
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const contextMsg = context ? ` in ${context}` : '';
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Validation failed${contextMsg}: ${issues}`);
    }
    throw error;
  }
}

export function validateSafely<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const issues = result.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      return { success: false, error: issues };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}