"use strict";
/**
 * Norwegian Family Device Linking Models
 * Secure parent-child device connection with Norwegian cultural values
 * Emphasizes trust, transparency, and family autonomy
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES = void 0;
exports.createDefaultDevicePermissions = createDefaultDevicePermissions;
exports.isWithinNorwegianQuietHours = isWithinNorwegianQuietHours;
exports.shouldDelayMessageForQuietHours = shouldDelayMessageForQuietHours;
exports.calculateDeviceTrustLevel = calculateDeviceTrustLevel;
exports.generateSecurityFingerprint = generateSecurityFingerprint;
exports.formatDeviceType = formatDeviceType;
exports.getDeviceTypeIcon = getDeviceTypeIcon;
exports.isHighRiskSecurityEvent = isHighRiskSecurityEvent;
// Norwegian Device Linking Templates for different family contexts
exports.NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES = {
    // Young child (5-8 years) - Very supervised
    young_child: {
        name: "Ung barn (5-8 år)",
        description: "Grunnleggende tilkobling med høy foreldrekontroll",
        permissions: {
            sendMessages: false,
            receiveMessages: true,
            emergencyContact: true,
            addTasks: false,
            editTasks: false,
            markTasksComplete: true,
            viewTaskHistory: false,
            viewRewards: true,
            addRewards: false,
            redeemRewards: false,
            viewSchedule: true,
            addAppointments: false,
            editAppointments: false,
            receiveReminders: true,
            viewFamilyCalendar: false,
            participateInPolls: false,
            accessFamilyPhotos: false,
            accessCulturalContent: true,
            viewWeatherIntegration: true,
            cabinModeAccess: false,
            locationSharing: true,
            screenTimeReporting: true,
            appUsageReports: true,
            contactSync: false,
            contentFiltering: true,
            timeRestrictions: true,
            emergencyOverride: true
        },
        norwegianGuidance: [
            "Grunnleggende kommunikasjon og påminnelser",
            "Høy sikkerhet og foreldrekontroll",
            "Fokus på læring og rutiner",
            "Norske kulturelle elementer inkludert"
        ]
    },
    // School age child (9-12 years) - Moderate supervision
    school_child: {
        name: "Skolebarn (9-12 år)",
        description: "Balansert tilkobling med moderat selvstendighet",
        permissions: {
            sendMessages: true,
            receiveMessages: true,
            emergencyContact: true,
            addTasks: false,
            editTasks: false,
            markTasksComplete: true,
            viewTaskHistory: true,
            viewRewards: true,
            addRewards: false,
            redeemRewards: true,
            viewSchedule: true,
            addAppointments: false,
            editAppointments: false,
            receiveReminders: true,
            viewFamilyCalendar: true,
            participateInPolls: true,
            accessFamilyPhotos: true,
            accessCulturalContent: true,
            viewWeatherIntegration: true,
            cabinModeAccess: true,
            locationSharing: true,
            screenTimeReporting: true,
            appUsageReports: false,
            contactSync: true,
            contentFiltering: true,
            timeRestrictions: true,
            emergencyOverride: true
        },
        norwegianGuidance: [
            "Toveis kommunikasjon med familien",
            "Kan delta i familieaktiviteter og avstemninger",
            "Tilgang til norsk kultur og tradisjoner",
            "Begrenset selvstendighet med sikkerhet"
        ]
    },
    // Teenager (13-16 years) - Higher independence
    teenager: {
        name: "Tenåring (13-16 år)",
        description: "Høy selvstendighet med respekt for familieverdier",
        permissions: {
            sendMessages: true,
            receiveMessages: true,
            emergencyContact: true,
            addTasks: true,
            editTasks: true,
            markTasksComplete: true,
            viewTaskHistory: true,
            viewRewards: true,
            addRewards: false,
            redeemRewards: true,
            viewSchedule: true,
            addAppointments: true,
            editAppointments: true,
            receiveReminders: true,
            viewFamilyCalendar: true,
            participateInPolls: true,
            accessFamilyPhotos: true,
            accessCulturalContent: true,
            viewWeatherIntegration: true,
            cabinModeAccess: true,
            locationSharing: false, // Optional for older teens
            screenTimeReporting: false,
            appUsageReports: false,
            contactSync: true,
            contentFiltering: false,
            timeRestrictions: false,
            emergencyOverride: true
        },
        norwegianGuidance: [
            "Høy grad av selvstendighet og tillit",
            "Kan bidra til familieplanlegging",
            "Respekterer norske verdier om tillit og ansvar",
            "Fokus på forberedelse til voksenliv"
        ]
    }
};
// Utility functions for Norwegian device linking
function createDefaultDevicePermissions(childAge) {
    if (childAge <= 8) {
        return { ...exports.NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES.young_child.permissions };
    }
    else if (childAge <= 12) {
        return { ...exports.NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES.school_child.permissions };
    }
    else {
        return { ...exports.NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES.teenager.permissions };
    }
}
function isWithinNorwegianQuietHours(date = new Date()) {
    const hour = date.getHours();
    // Norwegian quiet hours: 20:00 - 07:00
    return hour >= 20 || hour < 7;
}
function shouldDelayMessageForQuietHours(message, respectQuietHours = true) {
    if (!respectQuietHours || !message.culturalContext?.respectsQuietHours) {
        return { shouldDelay: false };
    }
    if (message.messageType === "emergency") {
        return { shouldDelay: false }; // Emergency messages always go through
    }
    if (isWithinNorwegianQuietHours()) {
        // Schedule for 07:00 the next morning
        const nextMorning = new Date();
        nextMorning.setDate(nextMorning.getDate() + 1);
        nextMorning.setHours(7, 0, 0, 0);
        return {
            shouldDelay: true,
            scheduleFor: nextMorning
        };
    }
    return { shouldDelay: false };
}
function calculateDeviceTrustLevel(deviceLink, childAge) {
    // Norwegian approach: trust with verification
    if (childAge >= 16)
        return "full";
    if (childAge >= 10 && deviceLink.activityTracking.averageResponseTime && deviceLink.activityTracking.averageResponseTime < 30) {
        return "supervised"; // Responsive and mature
    }
    return "limited";
}
function generateSecurityFingerprint(deviceInfo) {
    // Create unique fingerprint based on device characteristics
    const data = `${deviceInfo.platform}-${deviceInfo.model}-${deviceInfo.osVersion}-${deviceInfo.deviceId}`;
    return btoa(data); // In production, use proper cryptographic hashing
}
function formatDeviceType(type) {
    const translations = {
        smartphone: "Smarttelefon",
        smartwatch: "Smartklokke",
        tablet: "Nettbrett",
        laptop: "Bærbar PC"
    };
    return translations[type] || type;
}
function getDeviceTypeIcon(type) {
    const icons = {
        smartphone: "📱",
        smartwatch: "⌚",
        tablet: "📱",
        laptop: "💻"
    };
    return icons[type] || "📱";
}
function isHighRiskSecurityEvent(event) {
    const highRiskEvents = [
        "SUSPICIOUS_ACTIVITY",
        "UNAUTHORIZED_ACCESS",
        "FAILED_LINKING"
    ];
    return highRiskEvents.includes(event.eventType) ||
        event.riskLevel === "high" ||
        event.riskLevel === "critical";
}
