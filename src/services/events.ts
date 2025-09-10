/**
 * Events Service
 * Handles Norwegian cultural events and community coordination
 */

import { db, auth } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  Event,
  EventInvitation,
  EventAttendee,
  EventType,
  RSVPStatus,
  createEventFromTemplate,
  calculateEventCapacity,
  isEventInNorwegianQuietHours,
  shouldCancelEventDueToWeather,
  isChildEligibleForEvent,
} from "../models/Event";
import { refreshNextUpWidget } from "./widgets";
import { appEvents } from "../events";
import dayjs from "dayjs";

/**
 * Create a new Norwegian cultural event
 */
export async function createEvent(
  organizerId: string,
  householdId: string,
  eventType: EventType,
  basicInfo: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: Event['location'];
    groupId?: string;
  },
  additionalSettings?: Partial<Event>
): Promise<{ id: string; event: Event }> {
  const user = auth.currentUser;
  if (!user || user.uid !== organizerId) throw new Error("Not authorized");

  const eventTemplate = createEventFromTemplate(eventType, {
    ...basicInfo,
    ...additionalSettings,
    organizerId,
    organizerName: user.displayName || "Organizer",
  });

  // Validate Norwegian quiet hours
  if (isEventInNorwegianQuietHours(basicInfo.startTime, basicInfo.endTime)) {
    console.warn("Event scheduled during Norwegian quiet hours (20:00-07:00)");
  }

  const eventData = {
    ...eventTemplate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    startTime: Timestamp.fromDate(basicInfo.startTime),
    endTime: Timestamp.fromDate(basicInfo.endTime),
  };

  const ref = collection(db, "events");
  const docRef = await addDoc(ref, eventData);

  // Add event to organizer's household tracking
  await updateDoc(doc(db, `households/${householdId}`), {
    [`eventOrganizing.${docRef.id}`]: {
      eventId: docRef.id,
      role: "organizer",
      createdAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  // If event is part of a group, notify group members
  if (basicInfo.groupId) {
    await notifyGroupOfNewEvent(basicInfo.groupId, docRef.id);
  }

  const createdEvent = { 
    id: docRef.id, 
    ...eventTemplate,
    startTime: basicInfo.startTime,
    endTime: basicInfo.endTime,
  } as Event;
  
  // Emit event for real-time updates
  appEvents.emit("event:created", { eventId: docRef.id, event: createdEvent });

  // Refresh widgets if it's a today/upcoming event
  if (dayjs(basicInfo.startTime).isSame(dayjs(), 'day') || dayjs(basicInfo.startTime).isAfter(dayjs())) {
    try {
      await refreshNextUpWidget(householdId);
    } catch (error) {
      console.warn("Failed to refresh widget:", error);
    }
  }

  return { id: docRef.id, event: createdEvent };
}

/**
 * Fetch events for a user/household
 */
export async function fetchUserEvents(
  userId: string,
  timeRange?: {
    start?: Date;
    end?: Date;
  }
): Promise<Event[]> {
  const eventsRef = collection(db, "events");
  
  let q = query(
    eventsRef,
    where("status", "!=", "cancelled"),
    orderBy("startTime", "asc")
  );

  // Add time range filters
  if (timeRange?.start) {
    q = query(q, where("startTime", ">=", Timestamp.fromDate(timeRange.start)));
  }
  if (timeRange?.end) {
    q = query(q, where("startTime", "<=", Timestamp.fromDate(timeRange.end)));
  }

  const snapshot = await getDocs(q);
  let events = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startTime: data.startTime.toDate(),
      endTime: data.endTime.toDate(),
    } as Event;
  });

  // Filter events where user is attendee or organizer
  events = events.filter(event => 
    event.organizerId === userId || 
    event.attendees.some(attendee => attendee.userId === userId)
  );

  return events;
}

/**
 * Fetch events by group
 */
export async function fetchGroupEvents(
  groupId: string,
  timeRange?: { start?: Date; end?: Date }
): Promise<Event[]> {
  const eventsRef = collection(db, "events");
  
  let q = query(
    eventsRef,
    where("groupId", "==", groupId),
    where("status", "!=", "cancelled"),
    orderBy("startTime", "asc")
  );

  if (timeRange?.start) {
    q = query(q, where("startTime", ">=", Timestamp.fromDate(timeRange.start)));
  }
  if (timeRange?.end) {
    q = query(q, where("startTime", "<=", Timestamp.fromDate(timeRange.end)));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startTime: data.startTime.toDate(),
      endTime: data.endTime.toDate(),
    } as Event;
  });
}

/**
 * Fetch public community events (for discovery)
 */
export async function fetchCommunityEvents(
  filters?: {
    eventType?: EventType;
    kommune?: string;
    schoolId?: string;
    maxDistance?: number; // km from user location
  },
  timeRange?: { start?: Date; end?: Date }
): Promise<Event[]> {
  const eventsRef = collection(db, "events");
  
  let q = query(
    eventsRef,
    where("privacy.visibility", "==", "public"),
    where("status", "in", ["published", "confirmed"]),
    orderBy("startTime", "asc")
  );

  if (timeRange?.start) {
    q = query(q, where("startTime", ">=", Timestamp.fromDate(timeRange.start)));
  }
  if (timeRange?.end) {
    q = query(q, where("startTime", "<=", Timestamp.fromDate(timeRange.end)));
  }

  if (filters?.eventType) {
    q = query(q, where("type", "==", filters.eventType));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startTime: data.startTime.toDate(),
      endTime: data.endTime.toDate(),
    } as Event;
  });
}

/**
 * RSVP to an event
 */
export async function rsvpToEvent(
  eventId: string,
  userId: string,
  householdId: string,
  rsvpStatus: RSVPStatus,
  eventDetails?: {
    attendingChildren?: { childId: string; childName: string; specialNeeds?: string }[];
    notes?: string;
    norwegianContext?: EventAttendee['norwegianContext'];
    contactInfo?: EventAttendee['contactInfo'];
  }
): Promise<{ success: boolean; message?: string; waitlisted?: boolean }> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error("Not authorized");

  const eventDoc = await getDoc(doc(db, `events/${eventId}`));
  if (!eventDoc.exists()) throw new Error("Event not found");

  const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

  // Check capacity
  const capacity = calculateEventCapacity(event);
  const existingAttendeeIndex = event.attendees.findIndex(a => a.userId === userId);
  
  let waitlisted = false;

  // Remove existing RSVP if present
  if (existingAttendeeIndex >= 0) {
    event.attendees.splice(existingAttendeeIndex, 1);
  }

  // Handle new RSVP
  if (rsvpStatus === "yes") {
    const newAttendee: EventAttendee = {
      userId,
      displayName: user.displayName || "User",
      rsvpStatus: rsvpStatus,
      rsvpAt: new Date(),
      attendingChildren: eventDetails?.attendingChildren || [],
      notes: eventDetails?.notes,
      norwegianContext: eventDetails?.norwegianContext,
      contactInfo: eventDetails?.contactInfo,
    };

    // Check if we need to waitlist
    if (capacity.availableSpots >= 0 && capacity.availableSpots === 0) {
      if (event.waitlistEnabled) {
        newAttendee.rsvpStatus = "waitlist";
        waitlisted = true;
      } else {
        return { 
          success: false, 
          message: "Event is at capacity and waitlist is not enabled" 
        };
      }
    }

    event.attendees.push(newAttendee);
  } else if (rsvpStatus === "no" || rsvpStatus === "maybe") {
    // Add non-attending RSVP for tracking
    event.attendees.push({
      userId,
      displayName: user.displayName || "User",
      rsvpStatus: rsvpStatus,
      rsvpAt: new Date(),
      attendingChildren: [],
    });
  }

  // Update event in database
  await updateDoc(doc(db, `events/${eventId}`), {
    attendees: event.attendees,
    updatedAt: serverTimestamp(),
  });

  // Track RSVP in household
  await updateDoc(doc(db, `households/${householdId}`), {
    [`eventAttendance.${eventId}`]: {
      eventId,
      rsvpStatus: waitlisted ? "waitlist" : rsvpStatus,
      rsvpAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("event:rsvp", { 
    eventId, 
    userId, 
    rsvpStatus: waitlisted ? "waitlist" : rsvpStatus,
    waitlisted 
  });

  // Check if event should be confirmed (minimum attendance reached)
  if (event.minAttendees && capacity.currentAttendees >= event.minAttendees) {
    await updateEventStatus(eventId, "confirmed");
  }

  return { 
    success: true, 
    waitlisted,
    message: waitlisted ? "Added to waitlist" : "RSVP confirmed"
  };
}

/**
 * Update event status
 */
async function updateEventStatus(eventId: string, status: Event['status']): Promise<void> {
  await updateDoc(doc(db, `events/${eventId}`), {
    status,
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("event:status:updated", { eventId, status });
}

/**
 * Cancel event (organizer only)
 */
export async function cancelEvent(
  eventId: string,
  organizerId: string,
  reason?: string
): Promise<{ success: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== organizerId) throw new Error("Not authorized");

  const eventDoc = await getDoc(doc(db, `events/${eventId}`));
  if (!eventDoc.exists()) throw new Error("Event not found");

  const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

  if (event.organizerId !== organizerId) {
    return { success: false, message: "Only organizer can cancel event" };
  }

  // Update event status
  await updateDoc(doc(db, `events/${eventId}`), {
    status: "cancelled",
    updates: arrayUnion({
      id: Date.now().toString(),
      authorId: organizerId,
      authorName: user.displayName || "Organizer",
      message: reason || "Event has been cancelled",
      timestamp: new Date(),
      isImportant: true,
    }),
    updatedAt: serverTimestamp(),
  });

  // Notify all attendees
  appEvents.emit("event:cancelled", { 
    eventId, 
    event, 
    reason: reason || "Event has been cancelled" 
  });

  return { success: true };
}

/**
 * Add update to event
 */
export async function addEventUpdate(
  eventId: string,
  userId: string,
  message: string,
  isImportant: boolean = false
): Promise<{ success: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error("Not authorized");

  const eventDoc = await getDoc(doc(db, `events/${eventId}`));
  if (!eventDoc.exists()) throw new Error("Event not found");

  const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

  // Check if user is organizer or group admin
  const canUpdate = event.organizerId === userId; 
  // TODO: Check if user is group admin if this is a group event

  if (!canUpdate) {
    return { success: false, message: "Not authorized to update this event" };
  }

  const update = {
    id: Date.now().toString(),
    authorId: userId,
    authorName: user.displayName || "User",
    message,
    timestamp: new Date(),
    isImportant,
  };

  await updateDoc(doc(db, `events/${eventId}`), {
    updates: arrayUnion(update),
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("event:updated", { eventId, update });

  return { success: true };
}

/**
 * Volunteer for event task
 */
export async function volunteerForTask(
  eventId: string,
  userId: string,
  taskIndex: number
): Promise<{ success: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error("Not authorized");

  const eventDoc = await getDoc(doc(db, `events/${eventId}`));
  if (!eventDoc.exists()) throw new Error("Event not found");

  const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

  if (!event.coordination.allowVolunteerSignup) {
    return { success: false, message: "Volunteer signup not enabled for this event" };
  }

  if (!event.coordination.volunteerTasks || taskIndex >= event.coordination.volunteerTasks.length) {
    return { success: false, message: "Task not found" };
  }

  const task = event.coordination.volunteerTasks[taskIndex];

  // Check if already volunteering
  if (task.volunteers.includes(userId)) {
    return { success: false, message: "Already volunteering for this task" };
  }

  // Check capacity
  if (task.maxVolunteers && task.volunteers.length >= task.maxVolunteers) {
    return { success: false, message: "Task has maximum volunteers" };
  }

  // Add volunteer
  task.volunteers.push(userId);

  await updateDoc(doc(db, `events/${eventId}`), {
    'coordination.volunteerTasks': event.coordination.volunteerTasks,
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("event:volunteer:added", { eventId, taskIndex, userId });

  return { success: true };
}

/**
 * Offer carpool
 */
export async function offerCarpool(
  eventId: string,
  driverId: string,
  availableSeats: number,
  pickupLocation?: string
): Promise<{ success: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== driverId) throw new Error("Not authorized");

  const eventDoc = await getDoc(doc(db, `events/${eventId}`));
  if (!eventDoc.exists()) throw new Error("Event not found");

  const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

  if (!event.coordination.carpoolingEnabled) {
    return { success: false, message: "Carpooling not enabled for this event" };
  }

  // Check if user is attending
  const attendee = event.attendees.find(a => a.userId === driverId && a.rsvpStatus === "yes");
  if (!attendee) {
    return { success: false, message: "Must be attending event to offer carpool" };
  }

  // Check if already offering
  const existingCarpool = event.coordination.carpools?.find(c => c.driverId === driverId);
  if (existingCarpool) {
    return { success: false, message: "Already offering carpool for this event" };
  }

  const newCarpool = {
    driverId,
    driverName: user.displayName || "Driver",
    availableSeats,
    pickupLocation,
    riders: [],
  };

  await updateDoc(doc(db, `events/${eventId}`), {
    'coordination.carpools': arrayUnion(newCarpool),
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("event:carpool:offered", { eventId, carpool: newCarpool });

  return { success: true };
}

/**
 * Join carpool
 */
export async function joinCarpool(
  eventId: string,
  riderId: string,
  carpoolDriverId: string
): Promise<{ success: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== riderId) throw new Error("Not authorized");

  const eventDoc = await getDoc(doc(db, `events/${eventId}`));
  if (!eventDoc.exists()) throw new Error("Event not found");

  const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

  // Check if user is attending
  const attendee = event.attendees.find(a => a.userId === riderId && a.rsvpStatus === "yes");
  if (!attendee) {
    return { success: false, message: "Must be attending event to join carpool" };
  }

  // Find carpool
  const carpoolIndex = event.coordination.carpools?.findIndex(c => c.driverId === carpoolDriverId);
  if (carpoolIndex === undefined || carpoolIndex === -1) {
    return { success: false, message: "Carpool not found" };
  }

  const carpool = event.coordination.carpools![carpoolIndex];

  // Check capacity
  if (carpool.riders.length >= carpool.availableSeats) {
    return { success: false, message: "Carpool is full" };
  }

  // Check if already joined
  if (carpool.riders.includes(riderId)) {
    return { success: false, message: "Already joined this carpool" };
  }

  // Add rider
  carpool.riders.push(riderId);
  event.coordination.carpools![carpoolIndex] = carpool;

  await updateDoc(doc(db, `events/${eventId}`), {
    'coordination.carpools': event.coordination.carpools,
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("event:carpool:joined", { eventId, carpoolDriverId, riderId });

  return { success: true };
}

/**
 * Real-time subscription to user's events
 */
export function subscribeToUserEvents(
  userId: string,
  callback: (events: Event[]) => void,
  timeRange?: { start?: Date; end?: Date }
): () => void {
  const eventsRef = collection(db, "events");
  
  let q = query(
    eventsRef,
    where("status", "!=", "cancelled"),
    orderBy("startTime", "asc")
  );

  if (timeRange?.start) {
    q = query(q, where("startTime", ">=", Timestamp.fromDate(timeRange.start)));
  }
  if (timeRange?.end) {
    q = query(q, where("startTime", "<=", Timestamp.fromDate(timeRange.end)));
  }

  return onSnapshot(q, (snapshot) => {
    let events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime.toDate(),
        endTime: data.endTime.toDate(),
      } as Event;
    });

    // Filter events where user is attendee or organizer
    events = events.filter(event => 
      event.organizerId === userId || 
      event.attendees.some(attendee => attendee.userId === userId)
    );

    callback(events);
  });
}

/**
 * Real-time subscription to specific event
 */
export function subscribeToEvent(
  eventId: string,
  callback: (event: Event | null) => void
): () => void {
  return onSnapshot(doc(db, `events/${eventId}`), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const event = {
        id: snapshot.id,
        ...data,
        startTime: data.startTime.toDate(),
        endTime: data.endTime.toDate(),
      } as Event;
      callback(event);
    } else {
      callback(null);
    }
  });
}

/**
 * Get Norwegian weather-based event recommendations
 */
export async function getWeatherBasedEventRecommendations(
  location: { latitude: number; longitude: number },
  timeRange: { start: Date; end: Date }
): Promise<{ weather: any; recommendations: EventType[] }> {
  // This would integrate with Norwegian weather API (yr.no)
  // For now, return mock data
  const mockWeather = {
    temperature: 15,
    condition: "partly_cloudy",
    precipitation: 0.2,
    wind: 8,
  };

  const recommendations: EventType[] = [];

  if (mockWeather.precipitation < 0.1) {
    recommendations.push("friluftsliv", "idrett");
  }
  
  if (mockWeather.temperature > 10) {
    recommendations.push("17_mai", "klassetur");
  }

  if (mockWeather.precipitation > 0.5) {
    recommendations.push("kultur", "foreldremøte");
  }

  return { weather: mockWeather, recommendations };
}

/**
 * Notify group members of new event
 */
async function notifyGroupOfNewEvent(groupId: string, eventId: string): Promise<void> {
  // This would send notifications to group members
  // Implementation depends on notification service
  appEvents.emit("group:event:created", { groupId, eventId });
}