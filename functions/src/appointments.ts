import * as functions from "firebase-functions";
import { admin, db } from "./admin";

/**
 * Create a new appointment with proper authentication
 */
export const createAppointment = functions.https.onCall(async (data, context) => {
  functions.logger.info('createAppointment called', {
    hasAuth: !!context.auth,
    authUid: context.auth?.uid,
    dataKeys: Object.keys(data || {})
  });

  // Authentication check
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  try {
    const { householdId, title, type, startTime, endTime, description, allDay, childId } = data;
    const uid = context.auth.uid;

    // Validate required fields
    if (!householdId || !title) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: householdId and title');
    }

    // Verify user has access to this household
    const householdRef = db.collection('households').doc(householdId);
    const householdDoc = await householdRef.get();
    
    functions.logger.info('Household check', {
      householdId,
      exists: householdDoc.exists,
      uid
    });
    
    if (!householdDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Household not found');
    }

    const householdData = householdDoc.data();
    functions.logger.info('Household membership check', {
      uid,
      members: householdData?.members,
      admins: householdData?.admins,
      adults: householdData?.adults,
      hasMembers: !!householdData?.members,
      isIncluded: householdData?.members?.includes(uid)
    });
    
    // Check if user is the creator (has full access) or in any membership array
    const isCreator = householdData?.createdBy === uid;
    const isAdmin = householdData?.admins?.includes(uid);
    const isAdult = householdData?.adults?.includes(uid);
    const isMember = householdData?.members?.includes(uid);
    
    if (!isCreator && !isAdmin && !isAdult && !isMember) {
      functions.logger.error('Access denied - user not authorized', {
        uid,
        createdBy: householdData?.createdBy,
        isCreator,
        admins: householdData?.admins,
        adults: householdData?.adults,
        members: householdData?.members
      });
      throw new functions.https.HttpsError('permission-denied', `You do not have access to this household. UID: ${uid}`);
    }
    
    functions.logger.info('Access granted', { uid, isCreator, isAdmin, isAdult, isMember });

    // Create appointment document
    const appointmentData = {
      householdId,
      title,
      description: description || '',
      type: type || 'family',
      status: 'active',
      startTime: startTime ? admin.firestore.Timestamp.fromDate(new Date(startTime)) : admin.firestore.Timestamp.now(),
      endTime: endTime ? admin.firestore.Timestamp.fromDate(new Date(endTime)) : null,
      allDay: allDay || false,
      timezone: "Europe/Oslo",
      childId: childId || null,
      participants: [uid],
      organizerId: uid,
      createdBy: uid,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      notifications: []
    };

    // Add to Firestore
    const docRef = await householdRef.collection('appointments').add(appointmentData);

    functions.logger.info(`Appointment created: ${docRef.id} for household ${householdId}`);

    return {
      success: true,
      appointmentId: docRef.id
    };

  } catch (error) {
    functions.logger.error('Error creating appointment:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to create appointment');
  }
});

/**
 * Update an existing appointment
 */
export const updateAppointment = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  try {
    const { householdId, appointmentId, updates } = data;
    const uid = context.auth.uid;

    if (!householdId || !appointmentId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Verify household access
    const householdRef = db.collection('households').doc(householdId);
    const householdDoc = await householdRef.get();
    
    if (!householdDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Household not found');
    }

    const householdData = householdDoc.data();
    if (!householdData?.members?.includes(uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Update appointment
    const appointmentRef = householdRef.collection('appointments').doc(appointmentId);
    await appointmentRef.update({
      ...updates,
      updatedAt: admin.firestore.Timestamp.now()
    });

    return { success: true };

  } catch (error) {
    functions.logger.error('Error updating appointment:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to update appointment');
  }
});

/**
 * Delete an appointment
 */
export const deleteAppointment = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  try {
    const { householdId, appointmentId } = data;
    const uid = context.auth.uid;

    if (!householdId || !appointmentId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Verify household access
    const householdRef = db.collection('households').doc(householdId);
    const householdDoc = await householdRef.get();
    
    if (!householdDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Household not found');
    }

    const householdData = householdDoc.data();
    if (!householdData?.members?.includes(uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Delete appointment
    const appointmentRef = householdRef.collection('appointments').doc(appointmentId);
    await appointmentRef.delete();

    functions.logger.info(`Appointment deleted: ${appointmentId}`);

    return { success: true };

  } catch (error) {
    functions.logger.error('Error deleting appointment:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to delete appointment');
  }
});