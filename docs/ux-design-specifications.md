# UX Design Specifications - Appointments & Device Linking

## Design Philosophy

This system builds on the existing Norwegian cultural integration while adding modern appointment management and secure device linking. The design maintains cultural authenticity, security transparency, and family-focused functionality.

## Visual Design System

### 1. Norwegian Cultural Design Tokens

**Seasonal Color Palette:**
```typescript
export const norwegianCultural = {
  seasonal: {
    winter: "#4A5568", // Warm grey for winter coziness
    spring: "#38A169", // Fresh green for new growth
    summer: "#ED8936", // Warm coral for midnight sun
    autumn: "#D69E2E"  // Golden yellow for harvest season
  },
  
  appointments: {
    school: "#3182CE",     // Trust blue for educational
    health: "#38A169",     // Health green for medical
    family: "#D53F8C",     // Warm pink for family bonding
    activities: "#DD6B20", // Energy orange for sports/activities
    cultural: "#805AD5"    // Norwegian purple for traditions
  },
  
  security: {
    secure: "#48BB78",     // Secure green - safe connection
    warning: "#ED8936",    // Alert orange - attention needed
    error: "#E53E3E",      // Error red - problems require action
    processing: "#4299E1"  // Processing blue - action in progress
  }
};
```

**Typography Scale:**
- **Headers**: Existing theme.typography.h2 for appointment titles
- **Body Text**: 14px for appointment descriptions, cultural context
- **Metadata**: 12px for timestamps, notification timing
- **Security Text**: 13px with medium weight for trust indicators

### 2. Icon System

**Appointment Type Icons:**
- School: `school-outline` 
- Health: `medical-outline`
- Family: `heart-outline`
- Activities: `football-outline`
- Cultural: `flag-outline`
- Personal: `person-outline`

**Device Linking Icons:**
- Smartphone: `phone-portrait-outline`
- Smartwatch: `watch-outline`  
- Connected: `checkmark-circle` (success color)
- Disconnected: `alert-circle` (warning color)
- Linking: `qr-code-outline`

**Notification Icons:**
- Days before: `calendar-outline`
- Hours before: `time-outline`
- Sent: `checkmark-circle-outline`
- Pending: `time-outline`

## User Experience Flows

### 1. Appointment Creation Flow

**Entry Points:**
- **Primary**: Floating Action Button (FAB) in individual kid tabs
- **Secondary**: "Add Appointment" in quick actions (Family Overview)
- **Contextual**: From existing schedule conflicts or suggestions

**Flow Sequence:**

1. **Appointment Type Selection**
   ```
   ┌─────────────────────────────────────┐
   │ Opprett ny avtale                   │
   │                                     │
   │ [🏫] Skole        [🏥] Helse        │
   │ [❤️] Familie      [⚽] Aktiviteter   │
   │ [🇳🇴] Kulturell   [👤] Personlig   │
   │                                     │
   │ Eller velg fra forslag:             │
   │ • 17. mai forberedelse             │
   │ • Hyttetur planlegging             │
   │ • Foreldremøte                     │
   └─────────────────────────────────────┘
   ```

2. **Smart Form with Cultural Intelligence**
   ```
   ┌─────────────────────────────────────┐
   │ Avtale detaljer                     │
   │                                     │
   │ Tittel: [Foreldremøte              ]│
   │ Beskrivelse: [Høst møte om...      ]│
   │                                     │
   │ 📅 Dato og tid                      │
   │ [15. oktober 2024] [19:00]         │
   │                                     │
   │ ⚠️ Norsk kultur tips:               │
   │ Dette er vanlig middag tid.        │
   │ Foreslår 18:00 eller 20:00?       │
   │                                     │
   │ 🌦️ Værfølsom aktivitet? [Nei ▼]   │
   └─────────────────────────────────────┘
   ```

3. **Norwegian Cultural Context Integration**
   ```
   ┌─────────────────────────────────────┐
   │ Norsk kontekst                      │
   │                                     │
   │ Sesong: Høst 🍂                     │
   │ Værtype: Innendørs møte             │
   │ Familieeffekt: [Middels ▼]          │
   │                                     │
   │ Forslag basert på høst:             │
   │ • Planlegg vinter aktiviteter      │
   │ • Diskuter juleforberedelser       │
   │ • Koordiner høstferie              │
   │                                     │
   │ [✓] Inkluder sesong forslag         │
   └─────────────────────────────────────┘
   ```

4. **Smart Notification Setup**
   ```
   ┌─────────────────────────────────────┐
   │ Varsling innstillinger              │
   │                                     │
   │ Første varsel:                      │
   │ [2 ▼] [dager ▼] før avtalen        │
   │ Melding: "Foreldremøte på torsdag"  │
   │                                     │
   │ Andre varsel:                       │
   │ [2 ▼] [timer ▼] før avtalen        │
   │ Melding: "Foreldremøte om 2 timer"  │
   │                                     │
   │ 🇳🇴 Norsk anbefaling:               │
   │ For skole møter er 1 dag + 2 timer │
   │ vanlig i Norge                      │
   │                                     │
   │ [Forhåndsvis varsler]               │
   └─────────────────────────────────────┘
   ```

5. **Preview and Confirmation**
   ```
   ┌─────────────────────────────────────┐
   │ Bekreft avtale                      │
   │                                     │
   │ 🏫 Foreldremøte                     │
   │ 📅 15. oktober 2024, 18:00          │
   │ 👥 For: Emma                        │
   │ 🍂 Høst aktivitet                   │
   │                                     │
   │ Varsler:                            │
   │ 📅 13. okt (2 dager før)            │
   │ ⏰ 15. okt 16:00 (2 timer før)      │
   │                                     │
   │ [🔙 Tilbake] [✅ Opprett avtale]    │
   └─────────────────────────────────────┘
   ```

### 2. Device Linking Security Flow

**Security-First Approach:**

1. **Link Initiation (Parent Device)**
   ```
   ┌─────────────────────────────────────┐
   │ Koble Emmas enhet                   │
   │                                     │
   │ 🔒 Sikker enhetslinking             │
   │                                     │
   │ Vi beskytter ditt barns privatliv   │
   │ og sikkerhet med:                   │
   │                                     │
   │ ✓ Kryptert kommunikasjon           │
   │ ✓ Tidsavgrenset tilkobling         │
   │ ✓ Din godkjenning kreves           │
   │ ✓ Full kontroll over tilgang       │
   │                                     │
   │ [Start sikker tilkobling]           │
   └─────────────────────────────────────┘
   ```

2. **QR Code Generation with Security Context**
   ```
   ┌─────────────────────────────────────┐
   │ Sikker tilkobling - Trinn 1         │
   │                                     │
   │ ┌─────────────────┐                 │
   │ │ █▀▀█  █▀█  ▀▀█  │ QR-kode aktiv   │
   │ │ █  █  █▀█  █▀█  │ Utløper om:     │
   │ │ ▀▀▀█  █▄█  █▄█  │ ⏰ 04:32       │
   │ └─────────────────┘                 │
   │                                     │
   │ La Emma skanne denne koden på       │
   │ hennes enhet                        │
   │                                     │
   │ 🛡️ Denne koden:                     │
   │ • Utløper om 5 minutter            │
   │ • Kan bare brukes én gang          │
   │ • Er kryptert for sikkerhet        │
   │                                     │
   │ [Generer ny kode] [Avbryt]          │
   └─────────────────────────────────────┘
   ```

3. **Child Device Scanning Interface**
   ```
   ┌─────────────────────────────────────┐
   │ Koble til foreldrenes enhet         │
   │                                     │
   │ [📷 Kamera aktivert for QR skanning] │
   │                                     │
   │ Skann QR-koden som dine foreldre    │
   │ viser på deres enhet                │
   │                                     │
   │ 🔍 Hold telefonen over koden        │
   │                                     │
   │ ──────────┬──────────                │
   │ Sikkerhet │ Denne tilkoblingen      │
   │ info:     │ lar foreldrene dine:    │
   │           │ • Sende meldinger       │
   │           │ • Legge til oppgaver    │
   │           │ • Gi belønninger        │
   │           │ • Se din timeplan       │
   └─────────────────────────────────────┘
   ```

4. **Verification Step (Back to Parent)**
   ```
   ┌─────────────────────────────────────┐
   │ Bekreft tilkobling - Trinn 2        │
   │                                     │
   │ ✅ Emma har skannet QR-koden        │
   │                                     │
   │ For å fullføre sikker tilkobling,   │
   │ skriv inn koden som ble sendt til:  │
   │                                     │
   │ 📱 SMS: +47 *** ** 45               │
   │ ✉️ E-post: parent@email.com        │
   │                                     │
   │ Bekreftelseskode:                   │
   │ [____] [____] [____]                │
   │                                     │
   │ Mottok ikke kode?                   │
   │ [Send på nytt] (kan sendes om 1:23)│
   │                                     │
   │ [🔙 Tilbake] [✅ Bekreft]           │
   └─────────────────────────────────────┘
   ```

5. **Successful Connection with Permissions**
   ```
   ┌─────────────────────────────────────┐
   │ 🎉 Enhet tilkoblet!                 │
   │                                     │
   │ Emmas iPhone er nå trygt tilkoblet  │
   │                                     │
   │ Du kan nå:                          │
   │ ✓ Sende meldinger                  │
   │ ✓ Legge til oppgaver                │
   │ ✓ Tildele belønninger              │
   │ ✓ Se hennes timeplan                │
   │                                     │
   │ Administrer tilkoblingen:           │
   │ [📱 Send melding]                   │
   │ [⚙️ Innstillinger]                  │
   │ [🚫 Koble fra]                      │
   │                                     │
   │ [✅ Ferdig]                         │
   └─────────────────────────────────────┘
   ```

## Kids Screen Integration

### 1. Individual Kid Tab Enhancements

**Profile Header Addition:**
```
┌─────────────────────────────────────────────┐
│ [👧] Emma                    [👁] [✏️] [📱] │
│ Bergenskolen                 View Edit Link │
│ Age 8 • 📱 Connected                        │
└─────────────────────────────────────────────┘
```

**Today's Appointments Card:**
```
┌─────────────────────────────────────────────┐
│ 📅 Dagens avtaler                           │
│                                             │
│ 🏫 09:00  Skoledag starter                  │
│ 🏥 14:30  Tannlege (2 timer varsel sendt)   │
│ ⚽ 16:00  Fotballtrening                    │
│                                             │
│ [+ Ny avtale] [📋 Se alle]                  │
└─────────────────────────────────────────────┘
```

**Device Connection Status Card:**
```
┌─────────────────────────────────────────────┐
│ 📱 Tilkoblet enhet                          │
│                                             │
│ ✅ iPhone - Sist sett: 2 min siden          │
│ 🔋 Batteri: 78%                            │
│ 📶 Signal: Sterk                            │
│                                             │
│ [💬 Send melding] [⚙️ Administrer]          │
└─────────────────────────────────────────────┘
```

### 2. Family Overview (Oversikt) Integration

**Family Appointments Today:**
```
┌─────────────────────────────────────────────┐
│ 📅 Familiens avtaler i dag                  │
│                                             │
│ [👧] Emma                                   │
│ • 14:30 Tannlege (⏰ 2t varsel sendt)        │
│                                             │
│ [👦] Lars                                   │
│ • 18:00 Foreldremøte (⏰ varsler aktive)     │
│                                             │
│ [👨👩] Foreldre                              │
│ • 19:30 Kabluffe med naboer                │
│                                             │
│ Koordinering påkrevd: 🟡 Middels           │
└─────────────────────────────────────────────┘
```

**Cultural Context Card:**
```
┌─────────────────────────────────────────────┐
│ 🇳🇴 Norsk sesong kontekst - Høst 🍂         │
│                                             │
│ Kommende tradisjoner:                       │
│ • Lucia (13. desember) - 45 dager igjen     │
│ • Juleforberedelser starter snart          │
│                                             │
│ Sesong aktiviteter:                         │
│ • Tid for høstmys og innendørs prosjekter  │
│ • Planlegg vinter aktiviteter              │
│ • Bærplukking siste mulighet               │
│                                             │
│ [📅 Legg til kulturell avtale]              │
└─────────────────────────────────────────────┘
```

## Appointment Management Interface

### 1. Calendar View (Norwegian Style)

**Week View with Cultural Context:**
```
┌─────────────────────────────────────────────┐
│ 📅 Uke 42, 2024 - Høst sesong 🍂           │
│                                             │
│     Man  Tir  Ons  Tor  Fre  Lør  Søn     │
│      14   15   16   17   18   19   20      │
│                                             │
│ Man  [🏫] [⚽]                              │
│      09:00 14:30                           │
│                                             │
│ Tir  [🏥] [👥]                              │
│      14:30 18:00                           │
│                                             │
│ Tor  [🇳🇴] Lucia forberedelse              │
│      10:00 (Familie aktivitet)             │
│                                             │
│ Kulturell sammenheng:                      │
│ • Høstferie snart (uke 44)                 │
│ • Juletid planlegging begynner             │
│ • Mørke kveld - tidligere avtaler anbefalt │
└─────────────────────────────────────────────┘
```

### 2. Notification Preview Interface

**Before Sending:**
```
┌─────────────────────────────────────────────┐
│ 🔔 Forhåndsvis varsler                      │
│                                             │
│ Avtale: Foreldremøte                        │
│ Dato: 15. oktober, 18:00                    │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Varsel 1 (13. oktober, 18:00)          │ │
│ │                                         │ │
│ │ 📱 Foreldremøte på torsdag              │ │
│ │    15. oktober kl 18:00 på Emma skole  │ │
│ │    Bergenskolen                         │ │
│ │                                         │ │
│ │    Norsk tips: Kommer i vanlig         │ │
│ │    middag tid - planlegg middag        │ │
│ │    tidlig eller sent                   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Varsel 2 (15. oktober, 16:00)          │ │
│ │                                         │ │
│ │ ⏰ Foreldremøte om 2 timer              │ │
│ │    Tid til å gjøre seg klar og planlegge│ │
│ │    transport til Bergenskolen           │ │
│ │                                         │ │
│ │    Værmelding: 8°C, lett regn          │ │
│ │    Husk paraply! ☂️                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [📝 Rediger] [✅ Godkjenn varsler]          │
└─────────────────────────────────────────────┘
```

## Error States and Edge Cases

### 1. Connection Failures

**Device Linking Failed:**
```
┌─────────────────────────────────────────────┐
│ ❌ Tilkobling mislyktes                      │
│                                             │
│ Vi kunne ikke koble til Emmas enhet         │
│                                             │
│ Mulige årsaker:                             │
│ • QR-koden utløp (maks 5 min)              │
│ • Nettverksproblemer                        │
│ • Enhetens kompatibilitet                  │
│                                             │
│ Prøv igjen:                                 │
│ [🔄 Generer ny QR-kode]                     │
│ [📱 Send SMS invitasjon i stedet]          │
│ [❓ Få hjelp]                               │
│                                             │
│ Teknisk info (for support):                │
│ Error: DEVICE_TIMEOUT_5MIN                  │
└─────────────────────────────────────────────┘
```

### 2. Notification Failures

**Notification Not Delivered:**
```
┌─────────────────────────────────────────────┐
│ ⚠️ Varsel ikke levert                       │
│                                             │
│ Varselet om "Foreldremøte" ble ikke        │
│ levert til Emma                             │
│                                             │
│ Avtalen er fortsatt aktiv:                  │
│ 📅 15. oktober, 18:00                       │
│ 🏫 Bergenskolen                             │
│                                             │
│ Handlinger:                                 │
│ [📱 Send manuell melding til Emma]          │
│ [🔄 Prøv å sende varsel på nytt]            │
│ [⏰ Planlegg nytt varsel]                   │
│ [📞 Ring Emma direkte]                      │
│                                             │
│ Varsler som fungerer:                      │
│ ✅ Ditt varsel (foreldretelefon)            │
└─────────────────────────────────────────────┘
```

### 3. Cultural Context Warnings

**Conflicting Cultural Timing:**
```
┌─────────────────────────────────────────────┐
│ 🇳🇴 Norsk kultur merknad                    │
│                                             │
│ Avtalen du planlegger overlapper med       │
│ viktige norske tradisjoner:                 │
│                                             │
│ 🍽️ Middag tid (17:00-19:00)                │
│     Familier spiser vanligvis sammen       │
│                                             │
│ Forslag:                                    │
│ • 📅 Flytt til 19:30 (etter middag)        │
│ • 📅 Flytt til 16:30 (før middag)          │
│ • ✅ Behold 18:00 men noter middag konflikt│
│                                             │
│ Andre familier vil sannsynligvis også      │
│ ha denne konflikten                         │
│                                             │
│ [Endre tid] [Fortsett likevel]              │
└─────────────────────────────────────────────┘
```

## Accessibility Considerations

### 1. Screen Reader Support

**Semantic Labels:**
- All appointment cards: "Appointment, [type], [title], [time], [status]"
- Device status: "Device connection status, [child name], [status], last seen [time]"
- Cultural context: "Norwegian cultural context, [season], [tradition info]"

### 2. Motor Accessibility

**Touch Targets:**
- Minimum 44px for all interactive elements
- Clear visual feedback for all button presses
- Swipe gestures optional, with button alternatives

### 3. Visual Accessibility

**High Contrast Mode:**
- All Norwegian cultural colors have high contrast variants
- Security status indicators use both color and icons
- Cultural context cards maintain readability at all zoom levels

## Implementation Checklist

### Phase 1: Appointments Foundation
- [ ] Implement appointment data model in Firestore
- [ ] Create appointment creation modal with cultural intelligence
- [ ] Add notification scheduling system
- [ ] Integrate Norwegian cultural context suggestions
- [ ] Build appointment display cards for kids screen

### Phase 2: Device Linking Security
- [ ] Implement QR code generation and verification system
- [ ] Create secure device linking flow with SMS/email verification
- [ ] Add device status indicators to child profiles
- [ ] Build device management interface for parents
- [ ] Implement communication channels (messages, tasks, rewards)

### Phase 3: Advanced Features
- [ ] Add family calendar coordination
- [ ] Implement cultural event automation
- [ ] Build advanced notification intelligence
- [ ] Add weather integration for outdoor appointments
- [ ] Create family coordination dashboard

This comprehensive UX design specification provides everything needed to implement a culturally-authentic, security-conscious appointments and device linking system that enhances Norwegian family coordination while maintaining the app's core values.