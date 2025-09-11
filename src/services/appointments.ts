import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';
import { Appointment } from '../models/Appointment';
import { createAppointment as createAppointmentFn } from './functions';

/**
 * Create a new appointment using Firebase Function
 */
export async function createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<{
  success: boolean;
  appointmentId?: string;
  norwegianContext?: any;
  culturalWarnings?: any[];
}> {
  const result = await createAppointmentFn(appointmentData);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create appointment');
  }
  
  return {
    success: result.success,
    appointmentId: result.appointmentId,
    norwegianContext: undefined, // This will be returned by the Firebase function
    culturalWarnings: undefined  // This will be returned by the Firebase function
  };
}

/**
 * Update an existing appointment
 */
export async function updateAppointment(
  appointmentId: string, 
  householdId: string, 
  updates: Partial<Appointment>
): Promise<{ success: boolean; norwegianContext?: any }> {
  try {
    const functions = getFunctions(firebaseApp);
    const updateAppointmentFn = httpsCallable(functions, 'updateAppointment');
    const result = await updateAppointmentFn({
      appointmentId,
      householdId,
      updates
    });
    return result.data;
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(appointmentId: string, householdId: string): Promise<{ success: boolean }> {
  try {
    const functions = getFunctions(firebaseApp);
    const deleteAppointmentFn = httpsCallable(functions, 'deleteAppointment');
    const result = await deleteAppointmentFn({
      appointmentId,
      householdId
    });
    return result.data;
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
}

/**
 * Get cultural appointment suggestions
 */
export async function getCulturalAppointmentSuggestions(
  householdId: string,
  childAge?: number,
  preferences?: any
): Promise<{
  suggestions: any[];
  norwegianContext: any;
  season: string;
  generatedAt: Date;
}> {
  try {
    const functions = getFunctions(firebaseApp);
    const getSuggestionsFn = httpsCallable(functions, 'getCulturalAppointmentSuggestions');
    const result = await getSuggestionsFn({
      householdId,
      childAge,
      preferences
    });
    return result.data;
  } catch (error) {
    console.error('Error getting cultural suggestions:', error);
    throw error;
  }
}

/**
 * Get appointments for a household
 */
export async function getAppointments(
  householdId: string,
  options?: {
    childId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    status?: string[];
  }
): Promise<Appointment[]> {
  try {
    const appointmentsRef = collection(db, 'households', householdId, 'appointments');
    let q = query(appointmentsRef, orderBy('startTime', 'asc'));

    // Filter by child if specified
    if (options?.childId) {
      q = query(q, where('childId', '==', options.childId));
    }

    // Filter by date range
    if (options?.startDate) {
      q = query(q, where('startTime', '>=', Timestamp.fromDate(options.startDate)));
    }
    if (options?.endDate) {
      q = query(q, where('startTime', '<=', Timestamp.fromDate(options.endDate)));
    }

    // Filter by status
    if (options?.status && options.status.length > 0) {
      q = query(q, where('status', 'in', options.status));
    }

    // Apply limit
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || undefined,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || undefined,
    } as Appointment));
  } catch (error) {
    console.error('Error getting appointments:', error);
    throw error;
  }
}

/**
 * Get a single appointment by ID
 */
export async function getAppointment(householdId: string, appointmentId: string): Promise<Appointment | null> {
  try {
    const appointmentRef = doc(db, 'households', householdId, 'appointments', appointmentId);
    const docSnap = await getDoc(appointmentRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || undefined,
      } as Appointment;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting appointment:', error);
    throw error;
  }
}

/**
 * Get today's appointments for a household
 */
export async function getTodaysAppointments(householdId: string, childId?: string): Promise<Appointment[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getAppointments(householdId, {
    childId,
    startDate: today,
    endDate: tomorrow,
    status: ['active']
  });
}

/**
 * Get upcoming appointments (next 7 days)
 */
export async function getUpcomingAppointments(householdId: string, childId?: string): Promise<Appointment[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return getAppointments(householdId, {
    childId,
    startDate: today,
    endDate: nextWeek,
    status: ['active'],
    limit: 20
  });
}

/**
 * Subscribe to real-time appointment updates
 */
export function subscribeToAppointments(
  householdId: string,
  callback: (appointments: Appointment[]) => void,
  options?: {
    childId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): () => void {
  try {
    const appointmentsRef = collection(db, 'households', householdId, 'appointments');
    let q = query(appointmentsRef, orderBy('startTime', 'asc'));

    // Filter by child if specified
    if (options?.childId) {
      q = query(q, where('childId', '==', options.childId));
    }

    // Filter by date range
    if (options?.startDate) {
      q = query(q, where('startTime', '>=', Timestamp.fromDate(options.startDate)));
    }
    if (options?.endDate) {
      q = query(q, where('startTime', '<=', Timestamp.fromDate(options.endDate)));
    }

    // Only show active appointments by default
    q = query(q, where('status', '==', 'active'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const appointments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || undefined,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || undefined,
      } as Appointment));
      
      callback(appointments);
    }, (error) => {
      console.error('Error subscribing to appointments:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up appointment subscription:', error);
    return () => {};
  }
}

/**
 * Subscribe to today's appointments for a child
 */
export function subscribeToTodaysAppointments(
  householdId: string,
  callback: (appointments: Appointment[]) => void,
  childId?: string
): () => void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return subscribeToAppointments(
    householdId,
    callback,
    {
      childId,
      startDate: today,
      endDate: tomorrow
    }
  );
}

/**
 * Check if there are any scheduling conflicts for a new appointment
 */
export async function checkSchedulingConflicts(
  householdId: string,
  newAppointment: {
    startTime: Date;
    endTime?: Date;
    childId?: string;
  }
): Promise<{
  hasConflicts: boolean;
  conflicts: Appointment[];
}> {
  try {
    // Get appointments for the same day
    const startOfDay = new Date(newAppointment.startTime);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(newAppointment.startTime);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await getAppointments(householdId, {
      startDate: startOfDay,
      endDate: endOfDay,
      status: ['active']
    });

    const conflicts = existingAppointments.filter(existing => {
      // Check if appointments overlap
      const newStart = newAppointment.startTime.getTime();
      const newEnd = newAppointment.endTime?.getTime() || (newStart + 60 * 60 * 1000); // Default 1 hour
      const existingStart = existing.startTime.getTime();
      const existingEnd = existing.endTime?.getTime() || (existingStart + 60 * 60 * 1000);

      // If specific child, only check conflicts for same child or family-wide appointments
      if (newAppointment.childId && existing.childId && existing.childId !== newAppointment.childId) {
        return false;
      }

      // Check for time overlap
      return (newStart < existingEnd) && (newEnd > existingStart);
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error checking scheduling conflicts:', error);
    return {
      hasConflicts: false,
      conflicts: []
    };
  }
}

/**
 * Format appointment time for display
 */
export function formatAppointmentTime(appointment: Appointment): string {
  if (appointment.allDay) {
    return 'Hele dagen';
  }

  const timeStr = appointment.startTime.toLocaleTimeString('no-NO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: appointment.timezone || 'Europe/Oslo'
  });

  if (appointment.endTime) {
    const endTimeStr = appointment.endTime.toLocaleTimeString('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: appointment.timezone || 'Europe/Oslo'
    });
    return `${timeStr} - ${endTimeStr}`;
  }

  return timeStr;
}

/**
 * Format appointment date for display
 */
export function formatAppointmentDate(appointment: Appointment, includeTime = true): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: appointment.timezone || 'Europe/Oslo'
  };

  const dateStr = appointment.startTime.toLocaleDateString('no-NO', options);
  
  if (!includeTime) {
    return dateStr;
  }
  
  return `${dateStr}, ${formatAppointmentTime(appointment)}`;
}

/**
 * Check if appointment is today
 */
export function isAppointmentToday(appointment: Appointment): boolean {
  const today = new Date();
  const appointmentDate = appointment.startTime;
  
  return today.toDateString() === appointmentDate.toDateString();
}

/**
 * Check if appointment is tomorrow
 */
export function isAppointmentTomorrow(appointment: Appointment): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const appointmentDate = appointment.startTime;
  
  return tomorrow.toDateString() === appointmentDate.toDateString();
}

/**
 * Get time until appointment in a human-readable format
 */
export function getTimeUntilAppointment(appointment: Appointment): string | null {
  const now = new Date();
  const appointmentTime = appointment.startTime;
  const diffMs = appointmentTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return null; // Past appointment
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${diffDays} dag${diffDays > 1 ? 'er' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} time${diffHours > 1 ? 'r' : ''}`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minutt${diffMinutes > 1 ? 'er' : ''}`;
  } else {
    return 'Nå';
  }
}