import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

// Norwegian school system types
export type NorwegianSchoolLevel = 
  | "barneskole" // Grades 1-7
  | "ungdomsskole" // Grades 8-10
  | "videregående"; // VGS (Upper Secondary)

export type NorwegianSchoolType = {
  id: string;
  name: string;
  website?: string;
  kommune: string; // Norwegian municipality
  schoolLevel: NorwegianSchoolLevel;
  grades: number[]; // [1,2,3,4,5,6,7] for barneskole
  hasSFO?: boolean; // SkoleFritidsOrdning (after-school program)
  hasAKS?: boolean; // Aktivitetsskolen (activity school)
  crawlerGradeId?: string; // For School Crawler Platform integration
  lastSyncAt?: Date;
  syncEnabled: boolean;
};

export type Child = {
  id: string;
  displayName: string;
  emoji?: string;
  color?: string;
  
  // Enhanced Norwegian school integration
  school?: NorwegianSchoolType | null;
  currentGrade?: number | null; // 1-10 for Norwegian system, or null for VGS
  schoolYear?: string | null; // "2025-2026" format
  
  // Legacy fields for backward compatibility
  schoolGradeLabel?: string | null;
  schoolGradesRange?: { min?: number | null; max?: number | null } | null;
  
  // Norwegian-specific school features
  enrolledInSFO?: boolean; // After-school program enrollment
  enrolledInAKS?: boolean; // Activity school enrollment
  parentContactPreferences?: {
    norwegianOnly?: boolean; // Prefer Norwegian language
    smsNotifications?: boolean; // Allow SMS from school
    emailNotifications?: boolean;
  };
};

export async function listChildren(hid: string): Promise<Child[]> {
  const snap = await getDocs(collection(db, `households/${hid}/children`));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function addChild(
  hid: string,
  displayName: string,
  emoji?: string,
  color?: string,
  school?: any | null
): Promise<string> {
  // Pull structured grade details if AddEditChildModal provided it
  let gradeLabel: string | null = null;
  let gradeRange: { min?: number | null; max?: number | null } | null = null;
  if (school && typeof school === "object") {
    const label = (school as any).__selectedGrade;
    const range = (school as any).__grades;
    if (typeof label === "string" && label.trim()) gradeLabel = label.trim();
    if (range && (range.min != null || range.max != null)) {
      gradeRange = { min: range.min ?? null, max: range.max ?? null };
    }
    // Don't persist temp helper fields inside school blob
    delete (school as any).__selectedGrade;
    delete (school as any).__grades;
  }
  const ref = await addDoc(collection(db, `households/${hid}/children`), {
    displayName,
    emoji: emoji || null,
    color: color || null,
    school: school || null,
    schoolGradeLabel: gradeLabel,
    schoolGradesRange: gradeRange,
  });
  return ref.id;
}

export async function renameChild(
  hid: string,
  id: string,
  displayName: string,
  emoji?: string,
  color?: string
) {
  await updateDoc(doc(db, `households/${hid}/children/${id}`), {
    displayName,
    emoji: emoji || null,
    color: color || null,
  });
}

export async function deleteChild(hid: string, id: string) {
  await deleteDoc(doc(db, `households/${hid}/children/${id}`));
}

// Norwegian school system specific functions
export async function updateChildSchool(
  hid: string,
  childId: string,
  school: NorwegianSchoolType,
  currentGrade?: number,
  schoolYear?: string
): Promise<void> {
  await updateDoc(doc(db, `households/${hid}/children/${childId}`), {
    school,
    currentGrade: currentGrade ?? null,
    schoolYear: schoolYear ?? getCurrentNorwegianSchoolYear(),
  });
}

export async function updateChildNorwegianPreferences(
  hid: string,
  childId: string,
  preferences: {
    enrolledInSFO?: boolean;
    enrolledInAKS?: boolean;
    parentContactPreferences?: {
      norwegianOnly?: boolean;
      smsNotifications?: boolean;
      emailNotifications?: boolean;
    };
  }
): Promise<void> {
  await updateDoc(doc(db, `households/${hid}/children/${childId}`), preferences);
}

// Helper functions for Norwegian school system
export function getCurrentNorwegianSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Norwegian school year starts in August
  const startYear = now.getMonth() >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function getNorwegianGradeDisplay(grade: number | null): string {
  if (grade === null) return "VGS"; // Videregående skole
  if (grade >= 1 && grade <= 7) return `${grade}. trinn`;
  if (grade >= 8 && grade <= 10) return `${grade}. trinn`;
  return "Ukjent trinn";
}

export function isNorwegianSchoolHoliday(date: Date): boolean {
  // Basic Norwegian school holiday detection
  // In production, this would integrate with official Norwegian calendar API
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Major Norwegian school holidays (simplified)
  const holidays = [
    { month: 12, day: 24 }, // Christmas Eve
    { month: 12, day: 25 }, // Christmas Day
    { month: 12, day: 31 }, // New Year's Eve
    { month: 1, day: 1 },   // New Year's Day
    { month: 5, day: 1 },   // Labor Day
    { month: 5, day: 17 },  // Constitution Day
  ];
  
  return holidays.some(holiday => 
    holiday.month === month && holiday.day === day
  );
}

export function generateNorwegianSchoolGradeId(school: NorwegianSchoolType, grade: number): string {
  // Generate grade ID compatible with School Crawler Platform
  const schoolYear = getCurrentNorwegianSchoolYear();
  return `schools__${grade}-trinn__${schoolYear}`;
}
