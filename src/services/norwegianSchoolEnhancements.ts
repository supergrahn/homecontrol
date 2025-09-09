// Enhanced Norwegian School Features Service
// Teacher communication, curriculum-aligned tasks, and document management for Norwegian families
import { Child, NorwegianSchoolType } from "./children";
import { norwegianSchoolAPI } from "./schoolSummary";
import { norwegianCulture } from "./norwegianCulture";
import { addTask } from "./tasks";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NorwegianTeacherContact = {
  id: string;
  name: string;
  role: "klasselærer" | "faglærer" | "spesialpedagog" | "rektor" | "inspektør" | "sfo_leder";
  subjects?: string[];
  email?: string;
  phone?: string;
  officeHours: {
    day: string;
    start: string;
    end: string;
  }[];
  preferredContactMethod: "email" | "phone" | "app" | "meetingrequest";
  responseTime: string; // "24 timer", "samme dag", etc.
  norwegianContext: {
    contactEtiquette: string;
    bestTimeToContact: string;
    culturalNotes: string[];
  };
};

export type NorwegianCurriculumAlignment = {
  gradeLevel: number; // 1-10
  subject: string;
  competenceGoals: {
    id: string;
    description: string;
    ageAppropriate: string; // Child-friendly explanation
    parentGuidance: string; // How parents can support
    suggestedActivities: string[];
    assessmentCriteria: string[];
  }[];
  learningProgression: {
    current: string;
    next: string;
    timeframe: string;
  };
  norwegianEducationalValues: string[];
};

export type NorwegianSchoolDocument = {
  id: string;
  title: string;
  type: "report_card" | "homework" | "permission_slip" | "newsletter" | "meeting_invite" | "health_form" | "activity_info";
  childId: string;
  schoolId: string;
  uploadedAt: Date;
  dueDate?: Date;
  requiresParentAction: boolean;
  actionRequired?: {
    type: "signature" | "payment" | "response" | "attendance_confirmation";
    deadline: Date;
    instructions: string;
  };
  content?: string; // OCR extracted text
  norwegianContext?: {
    documentImportance: "høy" | "medium" | "lav";
    culturalSignificance?: string;
    typicalResponseTime?: string;
  };
  tags: string[];
  isPrivacyProtected: boolean;
};

export type ParentTeacherMeeting = {
  id: string;
  childId: string;
  teacherId: string;
  scheduledDate: Date;
  duration: number; // minutes
  meetingType: "utviklingssamtale" | "bekymringssamtale" | "oppfølgingsmøte" | "informasjonsmøte";
  topics: string[];
  parentPreparation: {
    questions: string[];
    observations: string[];
    concerns: string[];
  };
  teacherNotes?: string;
  followUpActions: {
    description: string;
    responsible: "parent" | "teacher" | "both";
    deadline?: Date;
  }[];
  norwegianMeetingContext: {
    meetingCulture: string;
    expectedDuration: string;
    dressCode: string;
    bringItems: string[];
  };
};

// Norwegian curriculum competence goals by subject and grade
const NORWEGIAN_CURRICULUM_GOALS: Record<string, Record<number, NorwegianCurriculumAlignment['competenceGoals']>> = {
  "norsk": {
    1: [
      {
        id: "norsk_1_lesing",
        description: "Lese enkle tekster med flyt",
        ageAppropriate: "Lese ord og enkle setninger",
        parentGuidance: "Les sammen hver dag, pek på ord mens du leser",
        suggestedActivities: ["Daglig lesestund", "Lese høyt sammen", "Ordspill"],
        assessmentCriteria: ["Gjenkjenner bokstaver", "Leser enkle ord", "Forstår det som leses"]
      },
      {
        id: "norsk_1_skriving", 
        description: "Skrive enkle ord og setninger",
        ageAppropriate: "Skrive sitt eget navn og enkle ord",
        parentGuidance: "Oppmuntre til å skrive lister, kort og meldinger",
        suggestedActivities: ["Skrive handlelister", "Sende kort til besteforeldre", "Dagbok"],
        assessmentCriteria: ["Former bokstaver", "Skriver enkle ord", "Bruker stor forbokstav"]
      }
    ],
    3: [
      {
        id: "norsk_3_lesing",
        description: "Lese ulike tekster med forståelse",
        ageAppropriate: "Forstå det som leses og svare på spørsmål",
        parentGuidance: "Still spørsmål om det dere leser sammen",
        suggestedActivities: ["Bibliotekbesøk", "Bokdiskusjoner", "Leselogg"],
        assessmentCriteria: ["Leser flytende", "Forstår hovedinnhold", "Kan svare på spørsmål"]
      }
    ],
    5: [
      {
        id: "norsk_5_skriving",
        description: "Skrive sammenhengende tekster",
        ageAppropriate: "Skrive historier og rapporter",
        parentGuidance: "Hjelp med å planlegge tekster og rette språk",
        suggestedActivities: ["Skrive dagbok", "Lage familieavis", "Bokrapporter"],
        assessmentCriteria: ["Skriver strukturerte tekster", "Bruker riktig grammatikk", "Varierer ordvalg"]
      }
    ]
  },
  
  "matematikk": {
    1: [
      {
        id: "mat_1_tall",
        description: "Kjenne igjen og bruke tall til 20",
        ageAppropriate: "Telle og regne med tall",
        parentGuidance: "Teller sammen i hverdagen - trapper, leker, mat",
        suggestedActivities: ["Telling i naturen", "Enkle regnespill", "Bruke tallene i hverdagen"],
        assessmentCriteria: ["Teller til 20", "Gjenkjenner tall", "Enkle pluss og minus"]
      }
    ],
    3: [
      {
        id: "mat_3_regning",
        description: "Utføre de fire regneartene med tosifrede tall",
        ageAppropriate: "Regne pluss, minus, gange og dele",
        parentGuidance: "Bruk praktiske eksempler fra hverdagen",
        suggestedActivities: ["Matteleker", "Hjelpe med handleliste", "Fordele godteri"],
        assessmentCriteria: ["Sikker på gangetabellen", "Regner riktig", "Forklarer fremgangsmåte"]
      }
    ],
    5: [
      {
        id: "mat_5_problemløsing",
        description: "Løse sammensatte matematiske problemer",
        ageAppropriate: "Finne ut av matematikkoppgaver ved å tenke logisk",
        parentGuidance: "La barnet forklare hvordan det tenker",
        suggestedActivities: ["Matteoppgaver fra hverdagen", "Logikkspill", "Måling og veiing"],
        assessmentCriteria: ["Forstår oppgaven", "Velger riktig metode", "Forklarer løsningen"]
      }
    ]
  }
};

// Norwegian teacher contact etiquette and cultural norms
const NORWEGIAN_TEACHER_CONTACT_CULTURE = {
  generalEtiquette: [
    "Vær høflig og respektfull i all kommunikasjon",
    "Bruk formell tiltale (De/dere) til å begynne med",
    "Gi beskjed i god tid ved fravær eller problemer",
    "Følg opp avtaler og møter punktlig"
  ],
  emailEtiquette: [
    "Bruk tydelig emne som beskriver saken",
    "Start med høflig hilsen",
    "Vær kortfattet og konkret",
    "Avslutt med vennlig hilsen"
  ],
  meetingCulture: [
    "Møt opp punktlig - nordmenn er opptatt av tid",
    "Forbered deg med spørsmål og notater",
    "Lytt aktivt og still spørsmål",
    "Ta notater under møtet"
  ],
  responseExpectations: [
    "Lærere svarer vanligvis innen 24-48 timer",
    "Ikke forvent svar på kveld eller helger",
    "Ring bare ved akutte situasjoner",
    "Bruk skolens kommunikasjonskanaler"
  ]
};

export class NorwegianSchoolEnhancementService {
  private contactsKey = "norwegian_teacher_contacts";
  private documentsKey = "norwegian_school_documents";
  private meetingsKey = "norwegian_parent_teacher_meetings";
  private curriculumKey = "norwegian_curriculum_progress";

  // Get teacher contacts for a child's school
  async getChildTeacherContacts(child: Child): Promise<NorwegianTeacherContact[]> {
    if (!child.school) return [];

    try {
      const cached = await this.getCachedTeacherContacts(child.school.id);
      if (cached.length > 0) return cached;

      // Fetch from School Crawler Platform
      const teacherData = await norwegianSchoolAPI.getSchoolContacts(child.school.crawlerGradeId || "");
      
      const contacts = teacherData.map(teacher => this.transformTeacherData(teacher));
      await this.cacheTeacherContacts(child.school!.id, contacts);
      
      return contacts;
    } catch (error) {
      console.error("Failed to get teacher contacts:", error);
      return this.generateDefaultTeacherContacts(child);
    }
  }

  // Get curriculum-aligned task suggestions
  async getCurriculumTasks(child: Child): Promise<{
    tasks: { title: string; description: string; subject: string; difficulty: "easy" | "medium" | "hard" }[];
    parentGuidance: string[];
    culturalNotes: string[];
  }> {
    if (!child.currentGrade) {
      return { tasks: [], parentGuidance: [], culturalNotes: [] };
    }

    try {
      const tasks: { title: string; description: string; subject: string; difficulty: "easy" | "medium" | "hard" }[] = [];
      const parentGuidance: string[] = [];
      const culturalNotes: string[] = [];

      // Get curriculum goals for child's grade
      for (const [subject, gradeGoals] of Object.entries(NORWEGIAN_CURRICULUM_GOALS)) {
        const goals = gradeGoals[child.currentGrade];
        if (!goals) continue;

        for (const goal of goals) {
          // Generate tasks from competence goals
          tasks.push(...goal.suggestedActivities.map(activity => ({
            title: activity,
            description: `${goal.ageAppropriate} - ${goal.description}`,
            subject: subject,
            difficulty: this.assessTaskDifficulty(activity, child.currentGrade!)
          })));

          // Add parent guidance
          parentGuidance.push(goal.parentGuidance);
        }
      }

      // Add Norwegian educational cultural notes
      culturalNotes.push(
        "Norsk utdanning fokuserer på helhetlig utvikling",
        "Lek og læring går hånd i hånd i norsk skole",
        "Samarbeid mellom hjem og skole er viktig",
        "Barnet skal trives og føle mestring"
      );

      return {
        tasks: tasks.slice(0, 10), // Limit to top 10
        parentGuidance: parentGuidance.slice(0, 5),
        culturalNotes
      };

    } catch (error) {
      console.error("Failed to get curriculum tasks:", error);
      return { tasks: [], parentGuidance: [], culturalNotes: [] };
    }
  }

  // Schedule parent-teacher meeting
  async scheduleParentTeacherMeeting(
    childId: string,
    teacherId: string,
    preferredDate: Date,
    meetingType: ParentTeacherMeeting['meetingType'],
    topics: string[]
  ): Promise<ParentTeacherMeeting> {
    const meeting: ParentTeacherMeeting = {
      id: `meeting_${childId}_${teacherId}_${Date.now()}`,
      childId,
      teacherId,
      scheduledDate: preferredDate,
      duration: 30, // Standard 30 minutes
      meetingType,
      topics,
      parentPreparation: {
        questions: this.generateMeetingQuestions(meetingType),
        observations: [],
        concerns: []
      },
      followUpActions: [],
      norwegianMeetingContext: {
        meetingCulture: "Norske lærere setter pris på forberedte foreldre",
        expectedDuration: "20-30 minutter",
        dressCode: "Vanlig og ryddig",
        bringItems: ["Notater", "Spørsmål", "Eksempler på barnets arbeid"]
      }
    };

    await this.saveMeeting(meeting);
    return meeting;
  }

  // Get school documents for a child
  async getChildSchoolDocuments(
    childId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<NorwegianSchoolDocument[]> {
    try {
      const documents = await this.getCachedDocuments(childId);
      
      if (dateRange) {
        return documents.filter(doc => {
          return doc.uploadedAt >= dateRange.start && doc.uploadedAt <= dateRange.end;
        });
      }
      
      return documents;
    } catch (error) {
      console.error("Failed to get school documents:", error);
      return [];
    }
  }

  // Process new school document
  async processSchoolDocument(
    childId: string,
    documentData: {
      title: string;
      type: NorwegianSchoolDocument['type'];
      content?: string;
      dueDate?: Date;
      requiresAction?: boolean;
    }
  ): Promise<NorwegianSchoolDocument> {
    const document: NorwegianSchoolDocument = {
      id: `doc_${childId}_${Date.now()}`,
      title: documentData.title,
      type: documentData.type,
      childId,
      schoolId: "", // Would be filled from child data
      uploadedAt: new Date(),
      dueDate: documentData.dueDate,
      requiresParentAction: documentData.requiresAction || false,
      content: documentData.content,
      norwegianContext: {
        documentImportance: this.assessDocumentImportance(documentData.type),
        culturalSignificance: this.getDocumentCulturalContext(documentData.type),
        typicalResponseTime: this.getTypicalResponseTime(documentData.type)
      },
      tags: this.generateDocumentTags(documentData.type, documentData.title),
      isPrivacyProtected: this.isPrivacySensitive(documentData.type)
    };

    // Create follow-up task if action is required
    if (document.requiresParentAction && document.actionRequired) {
      await this.createDocumentActionTask(document);
    }

    await this.saveDocument(document);
    return document;
  }

  // Generate meeting preparation suggestions
  generateMeetingPreparation(
    child: Child,
    meetingType: ParentTeacherMeeting['meetingType']
  ): {
    suggestedQuestions: string[];
    observationsToShare: string[];
    norwegianMeetingTips: string[];
  } {
    const base = {
      suggestedQuestions: this.generateMeetingQuestions(meetingType),
      observationsToShare: [
        "Hvordan barnet har det hjemme",
        "Arbeidsrutiner og konsentrasjon",
        "Sosiale relasjoner og vennskap",
        "Interesser og hobbyer",
        "Bekymringer eller utfordringer"
      ],
      norwegianMeetingTips: NORWEGIAN_TEACHER_CONTACT_CULTURE.meetingCulture
    };

    // Add grade-specific suggestions
    if (child.currentGrade && child.currentGrade <= 3) {
      base.suggestedQuestions.push(
        "Hvordan trives barnet på skolen?",
        "Er det noen fagområder som trenger ekstra oppmerksomhet?",
        "Hvordan kan vi støtte læringen hjemme?"
      );
    } else if (child.currentGrade && child.currentGrade >= 8) {
      base.suggestedQuestions.push(
        "Hvordan forbereder vi oss til ungdomsskolen?",
        "Hvilke utfordringer ser du fremover?",
        "Hvordan kan vi motivere for videre læring?"
      );
    }

    return base;
  }

  // Private helper methods
  private transformTeacherData(teacherData: any): NorwegianTeacherContact {
    return {
      id: teacherData.id || `teacher_${Date.now()}`,
      name: teacherData.name || "Ukjent lærer",
      role: teacherData.role || "faglærer",
      subjects: teacherData.subjects || [],
      email: teacherData.email,
      phone: teacherData.phone,
      officeHours: teacherData.office_hours || [
        { day: "tirsdag", start: "14:00", end: "15:00" },
        { day: "torsdag", start: "14:00", end: "15:00" }
      ],
      preferredContactMethod: "email",
      responseTime: "24-48 timer",
      norwegianContext: {
        contactEtiquette: "Bruk høflig og formell tone i første kontakt",
        bestTimeToContact: "Mellom 08:00 og 16:00 på hverdager",
        culturalNotes: NORWEGIAN_TEACHER_CONTACT_CULTURE.generalEtiquette
      }
    };
  }

  private generateDefaultTeacherContacts(child: Child): NorwegianTeacherContact[] {
    if (!child.currentGrade) return [];

    const contacts: NorwegianTeacherContact[] = [];

    // Klasselærer (class teacher)
    contacts.push({
      id: `teacher_class_${child.id}`,
      name: "Klasselærer",
      role: "klasselærer",
      subjects: child.currentGrade <= 7 ? ["norsk", "matematikk", "samfunnsfag"] : [],
      officeHours: [
        { day: "tirsdag", start: "14:00", end: "15:00" },
        { day: "torsdag", start: "14:00", end: "15:00" }
      ],
      preferredContactMethod: "email",
      responseTime: "24-48 timer",
      norwegianContext: {
        contactEtiquette: "Klasselærer er hovedkontakt for de fleste saker",
        bestTimeToContact: "Mellom 08:00 og 16:00 på hverdager",
        culturalNotes: NORWEGIAN_TEACHER_CONTACT_CULTURE.generalEtiquette
      }
    });

    // SFO leder if enrolled
    if (child.enrolledInSFO) {
      contacts.push({
        id: `sfo_leader_${child.id}`,
        name: "SFO-leder",
        role: "sfo_leder",
        officeHours: [
          { day: "mandag", start: "08:00", end: "09:00" },
          { day: "onsdag", start: "15:00", end: "16:00" }
        ],
        preferredContactMethod: "phone",
        responseTime: "samme dag",
        norwegianContext: {
          contactEtiquette: "SFO-leder håndterer ettermiddagsaktiviteter",
          bestTimeToContact: "Morgen eller sen ettermiddag",
          culturalNotes: ["SFO er viktig del av norsk skoledag", "Fokus på trygg omsorg"]
        }
      });
    }

    return contacts;
  }

  private generateMeetingQuestions(meetingType: ParentTeacherMeeting['meetingType']): string[] {
    const commonQuestions = [
      "Hvordan trives barnet faglig og sosialt?",
      "Er det områder hvor barnet utmerker seg?", 
      "Hvilke utfordringer ser du for barnet?",
      "Hvordan kan vi best støtte barnet hjemme?"
    ];

    const typeSpecific: Record<string, string[]> = {
      "utviklingssamtale": [
        "Hvordan utvikler barnet seg i forhold til målene?",
        "Hvilke fremskritt har du sett siden sist?",
        "Hva bør vi fokusere på fremover?"
      ],
      "bekymringssamtale": [
        "Hva er dine konkrete bekymringer?",
        "Hvordan kan vi jobbe sammen om løsninger?",
        "Trenger barnet ekstra støtte eller tiltak?"
      ],
      "oppfølgingsmøte": [
        "Hvordan har tiltakene vi ble enige om fungert?",
        "Ser du forbedringer siden sist møte?",
        "Trenger vi å justere planene våre?"
      ],
      "informasjonsmøte": [
        "Hva er viktig å vite om det kommende?",
        "Hvordan kan vi forberede barnet best mulig?",
        "Er det noe vi som foreldre må gjøre?"
      ]
    };

    return [...commonQuestions, ...(typeSpecific[meetingType] || [])];
  }

  private assessTaskDifficulty(activity: string, grade: number): "easy" | "medium" | "hard" {
    // Simple heuristic based on activity type and grade
    if (activity.includes("leke") || activity.includes("tegne") || grade <= 2) return "easy";
    if (activity.includes("rapport") || activity.includes("analyse") || grade >= 7) return "hard";
    return "medium";
  }

  private assessDocumentImportance(type: NorwegianSchoolDocument['type']): "høy" | "medium" | "lav" {
    const importance: Record<string, "høy" | "medium" | "lav"> = {
      "report_card": "høy",
      "permission_slip": "høy",
      "health_form": "høy",
      "meeting_invite": "høy",
      "homework": "medium",
      "newsletter": "lav",
      "activity_info": "medium"
    };
    
    return importance[type] || "medium";
  }

  private getDocumentCulturalContext(type: NorwegianSchoolDocument['type']): string {
    const contexts: Record<string, string> = {
      "report_card": "Karakterer er viktige, men ikke det eneste som teller i Norge",
      "permission_slip": "Norske skoler krever alltid tillatelse for aktiviteter utenfor skolen",
      "health_form": "Helseinformasjon er viktig for trygg skolegang",
      "meeting_invite": "Foreldremøter er obligatorisk del av norsk skole",
      "homework": "Lekser er viktig del av læringen hjemme",
      "newsletter": "Hold deg oppdatert på skolens aktiviteter",
      "activity_info": "Mange aktiviteter er gratis eller subsidiert i Norge"
    };
    
    return contexts[type] || "Viktig skoleinformasjon";
  }

  private getTypicalResponseTime(type: NorwegianSchoolDocument['type']): string {
    const times: Record<string, string> = {
      "report_card": "Les grundig - ingen respons nødvendig",
      "permission_slip": "Svar innen fristen, vanligvis 3-5 dager",
      "health_form": "Viktig - returner så snart som mulig",
      "meeting_invite": "Bekreft deltakelse innen angitt frist",
      "homework": "Følg lærerens instruksjoner",
      "newsletter": "Kun informasjon - ingen respons nødvendig",
      "activity_info": "Meld deg på innen fristen hvis interessert"
    };
    
    return times[type] || "Følg eventuelle instruksjoner";
  }

  private generateDocumentTags(type: NorwegianSchoolDocument['type'], title: string): string[] {
    const tags = [type];
    
    // Add subject-based tags
    const subjects = ["norsk", "matematikk", "engelsk", "naturfag", "samfunnsfag"];
    for (const subject of subjects) {
      if (title.toLowerCase().includes(subject)) {
        tags.push(subject);
      }
    }
    
    // Add activity tags
    if (title.toLowerCase().includes("tur") || title.toLowerCase().includes("ekskursjon")) {
      tags.push("utflukt");
    }
    
    if (title.toLowerCase().includes("prøve") || title.toLowerCase().includes("test")) {
      tags.push("vurdering");
    }
    
    return tags;
  }

  private isPrivacySensitive(type: NorwegianSchoolDocument['type']): boolean {
    const sensitiveTypes = ["report_card", "health_form", "meeting_invite"];
    return sensitiveTypes.includes(type);
  }

  private async createDocumentActionTask(document: NorwegianSchoolDocument): Promise<void> {
    if (!document.actionRequired) return;

    const taskTitle = `Behandle skoledokument: ${document.title}`;
    const taskDescription = `${document.actionRequired.instructions}\nFrist: ${document.actionRequired.deadline.toLocaleDateString('nb-NO')}`;

    console.log(`Creating action task for document: ${taskTitle}`);
    // This would create an actual task in the system
  }

  // Storage methods
  private async getCachedTeacherContacts(schoolId: string): Promise<NorwegianTeacherContact[]> {
    try {
      const cached = await AsyncStorage.getItem(`${this.contactsKey}_${schoolId}`);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  private async cacheTeacherContacts(schoolId: string, contacts: NorwegianTeacherContact[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.contactsKey}_${schoolId}`, JSON.stringify(contacts));
    } catch (error) {
      console.error("Failed to cache teacher contacts:", error);
    }
  }

  private async getCachedDocuments(childId: string): Promise<NorwegianSchoolDocument[]> {
    try {
      const cached = await AsyncStorage.getItem(`${this.documentsKey}_${childId}`);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  private async saveDocument(document: NorwegianSchoolDocument): Promise<void> {
    try {
      const existing = await this.getCachedDocuments(document.childId);
      const updated = [...existing, document];
      await AsyncStorage.setItem(`${this.documentsKey}_${document.childId}`, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save document:", error);
    }
  }

  private async saveMeeting(meeting: ParentTeacherMeeting): Promise<void> {
    try {
      const key = `${this.meetingsKey}_${meeting.childId}`;
      const existing = await AsyncStorage.getItem(key);
      const meetings: ParentTeacherMeeting[] = existing ? JSON.parse(existing) : [];
      meetings.push(meeting);
      await AsyncStorage.setItem(key, JSON.stringify(meetings));
    } catch (error) {
      console.error("Failed to save meeting:", error);
    }
  }
}

// Export singleton instance
export const norwegianSchoolEnhancements = new NorwegianSchoolEnhancementService();

// Utility functions
export function formatTeacherRole(role: NorwegianTeacherContact['role']): string {
  const roles = {
    "klasselærer": "Klasselærer",
    "faglærer": "Faglærer", 
    "spesialpedagog": "Spesialpedagog",
    "rektor": "Rektor",
    "inspektør": "Inspektør",
    "sfo_leder": "SFO-leder"
  };
  
  return roles[role] || role;
}

export function formatMeetingType(type: ParentTeacherMeeting['meetingType']): string {
  const types = {
    "utviklingssamtale": "Utviklingssamtale",
    "bekymringssamtale": "Bekymringssamtale", 
    "oppfølgingsmøte": "Oppfølgingsmøte",
    "informasjonsmøte": "Informasjonsmøte"
  };
  
  return types[type] || type;
}

export function getDocumentIcon(type: NorwegianSchoolDocument['type']): string {
  const icons = {
    "report_card": "📋",
    "homework": "📝",
    "permission_slip": "✅",
    "newsletter": "📰",
    "meeting_invite": "📅",
    "health_form": "🏥",
    "activity_info": "🎯"
  };
  
  return icons[type] || "📄";
}