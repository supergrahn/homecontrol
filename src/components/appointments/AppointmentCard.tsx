import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../design/theme';
import { 
  Appointment, 
  getAppointmentTypeIcon,
  formatAppointmentType
} from '../../models/Appointment';

interface AppointmentCardProps {
  appointment: Appointment;
  compact?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showChild?: boolean; // Show child name if appointment is for specific child
}

export default function AppointmentCard({
  appointment,
  compact = false,
  onPress,
  onEdit,
  onDelete,
  showChild = false
}: AppointmentCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const formatTime = (date: Date) => {
    if (appointment.allDay) {
      return t('appointments.allDay') || 'Hele dagen';
    }
    
    return date.toLocaleTimeString('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: appointment.timezone || 'Europe/Oslo'
    });
  };

  const formatDate = (date: Date, includeTime = true) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: compact ? 'short' : 'long',
      day: 'numeric',
      month: compact ? 'short' : 'long',
      timeZone: appointment.timezone || 'Europe/Oslo'
    };

    const dateStr = date.toLocaleDateString('no-NO', options);
    
    if (!includeTime || appointment.allDay) {
      return dateStr;
    }
    
    return `${dateStr}, ${formatTime(date)}`;
  };

  const getStatusColor = () => {
    switch (appointment.status) {
      case 'active':
        return theme.colors.success;
      case 'completed':
        return theme.colors.muted;
      case 'cancelled':
        return theme.colors.error;
      case 'rescheduled':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  const getTimeUntilAppointment = () => {
    const now = new Date();
    const appointmentTime = appointment.startTime;
    const diffMs = appointmentTime.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));

    if (diffMs < 0) {
      return null; // Past appointment
    }

    if (diffDays > 1) {
      return `${diffDays} ${t('common.days') || 'dager'}`;
    } else if (diffHours > 1) {
      return `${diffHours} ${t('common.hours') || 'timer'}`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} ${t('common.minutes') || 'minutter'}`;
    } else {
      return t('appointments.now') || 'Nå';
    }
  };

  const timeUntil = getTimeUntilAppointment();
  const isPast = new Date() > appointment.startTime;
  const isToday = appointment.startTime.toDateString() === new Date().toDateString();
  const isTomorrow = appointment.startTime.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderLeftColor: getStatusColor(),
          }
        ]}
        onPress={onPress}
      >
        <View style={styles.compactIcon}>
          <Text style={{ fontSize: 16 }}>{getAppointmentTypeIcon(appointment.type)}</Text>
        </View>
        
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {appointment.title}
          </Text>
          <Text style={[styles.compactTime, { color: theme.colors.muted }]} numberOfLines={1}>
            {formatTime(appointment.startTime)}
            {appointment.location?.name && ` • ${appointment.location.name}`}
          </Text>
        </View>

        {timeUntil && !isPast && (
          <View style={[styles.timebadge, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.timeBadgeText, { color: theme.colors.primary }]}>
              {timeUntil}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.fullCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow
        }
      ]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.typeInfo}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>
            {getAppointmentTypeIcon(appointment.type)}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
              {appointment.title}
            </Text>
            <Text style={[styles.typeLabel, { color: theme.colors.muted }]}>
              {formatAppointmentType(appointment.type)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {appointment.status === 'active' && (
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          )}
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Time and Date */}
      <View style={styles.timeSection}>
        <View style={styles.timeInfo}>
          <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.timeText, { color: theme.colors.text }]}>
            {formatDate(appointment.startTime)}
          </Text>
        </View>

        {timeUntil && !isPast && (
          <View style={[styles.timeUntilBadge, { backgroundColor: theme.colors.success + '20' }]}>
            <Text style={[styles.timeUntilText, { color: theme.colors.success }]}>
              {isToday ? t('appointments.today') || 'I dag' :
               isTomorrow ? t('appointments.tomorrow') || 'I morgen' :
               `Om ${timeUntil}`}
            </Text>
          </View>
        )}
      </View>

      {/* Location */}
      {appointment.location?.name && (
        <View style={styles.locationSection}>
          <Ionicons name="location-outline" size={16} color={theme.colors.muted} />
          <Text style={[styles.locationText, { color: theme.colors.muted }]}>
            {appointment.location.name}
          </Text>
        </View>
      )}

      {/* Child info (if showing for multiple children) */}
      {showChild && appointment.childId && (
        <View style={styles.childSection}>
          <Ionicons name="person-outline" size={16} color={theme.colors.muted} />
          <Text style={[styles.childText, { color: theme.colors.muted }]}>
            {/* This would need to be populated with actual child name from context */}
            {t('appointments.childAppointment') || 'Barn avtale'}
          </Text>
        </View>
      )}

      {/* Description */}
      {appointment.description && !compact && (
        <Text style={[styles.description, { color: theme.colors.muted }]} numberOfLines={2}>
          {appointment.description}
        </Text>
      )}

      {/* Norwegian Cultural Context */}
      {appointment.norwegianContext?.timingWarnings && 
       appointment.norwegianContext.timingWarnings.length > 0 && (
        <View style={[styles.culturalWarning, { 
          backgroundColor: theme.colors.warning + '15',
          borderColor: theme.colors.warning + '30'
        }]}>
          <Ionicons name="flag-outline" size={14} color={theme.colors.warning} />
          <Text style={[styles.culturalWarningText, { color: theme.colors.text }]} numberOfLines={1}>
            {appointment.norwegianContext.timingWarnings[0].message}
          </Text>
        </View>
      )}

      {/* Notifications Status */}
      {appointment.notifications && appointment.notifications.length > 0 && (
        <View style={styles.notificationSection}>
          <Ionicons 
            name="notifications-outline" 
            size={14} 
            color={theme.colors.muted} 
          />
          <Text style={[styles.notificationText, { color: theme.colors.muted }]}>
            {appointment.notifications.filter(n => n.sent).length}/
            {appointment.notifications.length} {t('appointments.notifications.sent') || 'varsler sendt'}
          </Text>
        </View>
      )}

      {/* Past appointment indicator */}
      {isPast && appointment.status === 'active' && (
        <View style={[styles.pastIndicator, { backgroundColor: theme.colors.muted + '20' }]}>
          <Text style={[styles.pastIndicatorText, { color: theme.colors.muted }]}>
            {t('appointments.completed') || 'Fullført'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Compact card styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  compactIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  compactTime: {
    fontSize: 12,
  },
  timeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Full card styles
  fullCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionButton: {
    padding: 4,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  timeUntilBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeUntilText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    marginLeft: 8,
  },
  childSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  childText: {
    fontSize: 13,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  culturalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  culturalWarningText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  notificationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 12,
    marginLeft: 6,
  },
  pastIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pastIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
  },
});