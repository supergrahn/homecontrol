import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp, auth } from "../firebase";
import { Appointment } from "../models/Appointment";

export async function deleteHouseholdRecursive(householdId: string) {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, "deleteHouseholdRecursive");
  await fn({ householdId });
}

export async function testAuth(): Promise<{ success: boolean; message?: string; uid?: string; error?: string }> {
  console.log("Testing auth with testCreateAppointment function");
  
  if (!auth.currentUser) {
    return { success: false, error: "Not authenticated" };
  }
  
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, "testCreateAppointment");
  
  try {
    const result = await fn({});
    console.log("Test function result:", result);
    return result.data as { success: boolean; message?: string; uid?: string };
  } catch (error) {
    console.error("Test function error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function createAppointment(appointmentData: Omit<Appointment, "id" | "createdAt" | "updatedAt">): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
  // Check authentication before calling function
  console.log("Auth state check:", {
    currentUser: auth.currentUser ? "User exists" : "No user",
    uid: auth.currentUser?.uid,
    email: auth.currentUser?.email
  });

  if (!auth.currentUser) {
    console.error("No authenticated user found");
    return {
      success: false,
      error: "User not authenticated. Please sign in and try again."
    };
  }

  try {
    // Get fresh token to ensure it's not expired
    const token = await auth.currentUser.getIdToken(true);
    console.log("Got fresh ID token, length:", token.length);
  } catch (tokenError) {
    console.error("Failed to get ID token:", tokenError);
    return {
      success: false,
      error: "Authentication token error. Please sign in again."
    };
  }

  // Simplify data to only what the Firebase function expects
  const dataToSend = {
    householdId: appointmentData.householdId,
    title: appointmentData.title,
    type: appointmentData.type,
    startTime: appointmentData.startTime || new Date().toISOString(),
    endTime: appointmentData.endTime,
    description: appointmentData.description,
    allDay: appointmentData.allDay,
    childId: appointmentData.childId
  };

  console.log("Creating appointment for user:", auth.currentUser.uid, "with data:", {
    householdId: dataToSend.householdId,
    title: dataToSend.title,
    type: dataToSend.type,
    startTime: dataToSend.startTime,
    allKeys: Object.keys(dataToSend),
    norwegianContext: dataToSend.norwegianContext,
    fullDataToSend: dataToSend
  });
  
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, "createAppointment");
  
  try {
    // Wait a moment to ensure auth context is fully established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await fn(dataToSend);
    console.log("Function call successful:", result);
    return result.data as { success: boolean; appointmentId?: string; error?: string };
  } catch (error) {
    console.error("Error calling createAppointment function:", error);
    
    // Log more details about the error
    if (error && typeof error === 'object') {
      console.error("Error details:", {
        code: (error as any).code,
        message: (error as any).message,
        details: (error as any).details
      });
    }
    
    // As a fallback, try calling a simple health check function to test if auth works at all
    try {
      console.log("Testing if any function calls work with auth...");
      const testFn = httpsCallable(functions, "healthCheck");
      const testResult = await testFn({});
      console.log("Health check succeeded:", testResult);
    } catch (testError) {
      console.error("Health check also failed:", testError);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
