import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../design/theme';
import { useHousehold } from '../../firebase/providers/HouseholdProvider';
import Button from '../Button';
import { 
  Appointment, 
  AppointmentType, 
  AppointmentNotification,
  createAppointmentFromTemplate,
  getNorwegianCulturalTimingWarnings,
  getCurrentNorwegianSeason,
  getSeasonalAppointmentRecommendations,
  NORWEGIAN_APPOINTMENT_TEMPLATES
} from '../../models/Appointment';
import { Child } from '../../services/children';
import { createAppointment as createAppointmentFn } from '../../services/functions';
import { updateAppointment, deleteAppointment } from '../../services/appointments';

interface AppointmentCreationModalProps {
  visible: boolean;
  onClose: () => void;
  child?: Child;
  householdId: string;
  onSave: (appointment: Appointment) => void;
  initialType?: AppointmentType;
  editingAppointment?: Appointment | null;
}

export default function AppointmentCreationModal({
  visible,
  onClose,
  child,
  householdId,
  onSave,
  initialType = 'family',
  editingAppointment
}: AppointmentCreationModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { household } = useHousehold();

  // Form state
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState<Date | undefined>();
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([
    { id: '1', type: 'days', amount: 1, title: '', message: '', sent: false },
    { id: '2', type: 'hours', amount: 2, title: '', message: '', sent: false }
  ]);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentStep, setCurrentStep] = useState<'type' | 'details' | 'notifications' | 'review'>('type');
  const [loading, setLoading] = useState(false);

  // Initialize form when editing an existing appointment
  useEffect(() => {
    if (editingAppointment) {
      setAppointmentType(editingAppointment.type);
      setTitle(editingAppointment.title);
      setDescription(editingAppointment.description || '');
      setStartTime(editingAppointment.startTime);
      setEndTime(editingAppointment.endTime);
      setAllDay(editingAppointment.allDay || false);
      setLocation(editingAppointment.location?.name || '');
      setNotifications(editingAppointment.notifications || []);
      setCurrentStep('details'); // Skip type selection when editing
    } else {
      // Reset form for new appointment
      setAppointmentType(initialType);
      setTitle('');
      setDescription('');
      setStartTime(new Date());
      setEndTime(undefined);
      setAllDay(false);
      setLocation('');
      setNotifications([
        { id: '1', type: 'days', amount: 1, title: '', message: '', sent: false },
        { id: '2', type: 'hours', amount: 2, title: '', message: '', sent: false }
      ]);
      setCurrentStep('type');
    }
  }, [editingAppointment, initialType]);

  // Norwegian cultural intelligence
  const season = getCurrentNorwegianSeason();
  const template = NORWEGIAN_APPOINTMENT_TEMPLATES[appointmentType];
  const culturalWarnings = useMemo(() => {
    if (!title || !startTime) return [];
    
    return getNorwegianCulturalTimingWarnings({
      id: '',
      title,
      startTime,
      endTime,
      type: appointmentType,
      householdId,
      createdBy: '',
      createdAt: new Date(),
      allDay,
      timezone: 'Europe/Oslo',
      status: 'active',
      participants: []
    });
  }, [title, startTime, endTime, appointmentType, allDay, householdId]);

  const seasonalRecommendations = useMemo(() => {
    return getSeasonalAppointmentRecommendations(season, appointmentType);
  }, [season, appointmentType]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setCurrentStep('type');
      setTitle('');
      setDescription('');
      setStartTime(new Date());
      setEndTime(undefined);
      setAllDay(false);
      setLocation('');
      setAppointmentType(initialType);
      setNotifications([
        { id: '1', type: 'days', amount: 1, title: '', message: '', sent: false },
        { id: '2', type: 'hours', amount: 2, title: '', message: '', sent: false }
      ]);
    }
  }, [visible, initialType]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(
        t('appointments.error') || 'Feil',
        t('appointments.titleRequired') || 'Tittel er påkrevd'
      );
      return;
    }

    setLoading(true);
    
    try {
      const appointmentData = createAppointmentFromTemplate(appointmentType, {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime,
        endTime: allDay ? undefined : endTime,
        allDay,
        householdId,
        childId: child?.id,
        location: location.trim() ? {
          name: location.trim()
        } : undefined,
        notifications: notifications.filter(n => n.amount > 0).map(n => ({
          ...n,
          title: n.title || `${title} - ${n.amount} ${t(`appointments.notifications.${n.type}Before`)}`,
          message: n.message || generateNotificationMessage(n, title)
        })),
        norwegianContext: {
          season,
          seasonalRecommendations,
          timingWarnings: culturalWarnings,
          weatherDependent: template.template.norwegianContext?.weatherDependent || false,
          familyImpactLevel: template.template.norwegianContext?.familyImpactLevel || 'medium',
          includesSiblings: child ? false : true,
          requiresParentCoordination: template.template.norwegianContext?.requiresParentCoordination || false
        }
      });

      if (editingAppointment) {
        // Update existing appointment
        const updatedAppointment = { 
          ...editingAppointment, 
          ...appointmentData,
          id: editingAppointment.id 
        } as Appointment;
        
        await updateAppointment(editingAppointment.id, householdId, appointmentData);
        onSave(updatedAppointment);
        onClose();
      } else {
        // Create new appointment via Firebase Function
        const result = await createAppointmentFn(appointmentData);
        
        if (result.success) {
          onSave({ ...appointmentData, id: result.appointmentId } as Appointment);
          onClose();
        } else {
          throw new Error('Failed to create appointment');
        }
      }

    } catch (error) {
      console.error('Error saving appointment:', error);
      Alert.alert(
        t('appointments.error') || 'Feil',
        editingAppointment ? 
          (t('appointments.updateError') || 'Kunne ikke oppdatere avtale. Prøv igjen.') :
          (t('appointments.createError') || 'Kunne ikke opprette avtale. Prøv igjen.')
      );
    } finally {
      setLoading(false);
    }
  };

  const generateNotificationMessage = (notification: AppointmentNotification, appointmentTitle: string): string => {
    const { type, amount } = notification;
    
    if (type === 'days') {
      if (amount === 1) {
        return `${appointmentTitle} i morgen`;
      }
      return `${appointmentTitle} om ${amount} dager`;
    } else if (type === 'hours') {
      if (amount === 1) {
        return `${appointmentTitle} om 1 time`;
      }
      return `${appointmentTitle} om ${amount} timer`;
    } else {
      return `${appointmentTitle} om ${amount} minutter`;
    }
  };

  const renderStepIndicator = () => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      paddingHorizontal: 20
    }}>
      {['type', 'details', 'notifications', 'review'].map((step, index) => (
        <React.Fragment key={step}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: currentStep === step ? theme.colors.primary : 
                             ['type', 'details', 'notifications', 'review'].indexOf(currentStep) > index ? theme.colors.success : theme.colors.border,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{
              color: currentStep === step ? theme.colors.onPrimary : 
                     ['type', 'details', 'notifications', 'review'].indexOf(currentStep) > index ? theme.colors.onSuccess : theme.colors.muted,
              fontSize: 14,
              fontWeight: '600'
            }}>
              {index + 1}
            </Text>
          </View>
          {index < 3 && (
            <View style={{
              width: 40,
              height: 2,
              backgroundColor: ['type', 'details', 'notifications', 'review'].indexOf(currentStep) > index ? theme.colors.success : theme.colors.border,
              marginHorizontal: 8
            }} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderTypeSelection = () => (
    <View style={{ padding: 20 }}>
      <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginBottom: 16 }}>
        {t('appointments.selectType') || 'Velg avtale type'}
      </Text>
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {Object.entries(NORWEGIAN_APPOINTMENT_TEMPLATES).map(([type, template]) => (
          <TouchableOpacity
            key={type}
            style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: appointmentType === type ? theme.colors.primary + '20' : theme.colors.card,
              borderRadius: 12,
              padding: 16,
              borderWidth: 2,
              borderColor: appointmentType === type ? theme.colors.primary : theme.colors.border,
              alignItems: 'center'
            }}
            onPress={() => setAppointmentType(type as AppointmentType)}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>{template.icon}</Text>
            <Text style={{
              ...theme.typography.body,
              color: theme.colors.text,
              textAlign: 'center',
              fontWeight: appointmentType === type ? '600' : 'normal'
            }}>
              {template.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {seasonalRecommendations.length > 0 && (
        <View style={{
          backgroundColor: theme.colors.accentSeafoam + '15',
          borderRadius: 12,
          padding: 16,
          marginTop: 20,
          borderWidth: 1,
          borderColor: theme.colors.accentSeafoam + '40'
        }}>
          <Text style={{
            ...theme.typography.h3,
            color: theme.colors.accentSeafoam,
            marginBottom: 8
          }}>
            🍂 {season === 'autumn' ? 'Høst' : season === 'winter' ? 'Vinter' : season === 'spring' ? 'Vår' : 'Sommer'} anbefalinger
          </Text>
          {seasonalRecommendations.map((rec, index) => (
            <Text key={index} style={{
              ...theme.typography.body,
              color: theme.colors.text,
              marginBottom: 4
            }}>
              • {rec}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderDetailsStep = () => (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginBottom: 16 }}>
        {t('appointments.details') || 'Avtale detaljer'}
      </Text>

      {/* Title */}
      <Text style={{ ...theme.typography.label, color: theme.colors.text, marginBottom: 8 }}>
        {t('appointments.title') || 'Tittel'} *
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: theme.colors.text,
          backgroundColor: theme.colors.surface,
          marginBottom: 16
        }}
        value={title}
        onChangeText={setTitle}
        placeholder={template.template.title || 'Skriv inn tittel...'}
        placeholderTextColor={theme.colors.muted}
      />

      {/* Description */}
      <Text style={{ ...theme.typography.label, color: theme.colors.text, marginBottom: 8 }}>
        {t('appointments.description') || 'Beskrivelse'}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: theme.colors.text,
          backgroundColor: theme.colors.surface,
          height: 80,
          textAlignVertical: 'top',
          marginBottom: 16
        }}
        value={description}
        onChangeText={setDescription}
        placeholder={template.description}
        placeholderTextColor={theme.colors.muted}
        multiline
      />

      {/* Date and Time */}
      <Text style={{ ...theme.typography.label, color: theme.colors.text, marginBottom: 8 }}>
        {t('appointments.dateTime') || 'Dato og tid'}
      </Text>
      
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          padding: 12,
          backgroundColor: theme.colors.surface,
          marginBottom: 16
        }}
        onPress={() => setShowDatePicker(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
        <Text style={{ marginLeft: 12, fontSize: 16, color: theme.colors.text }}>
          {startTime.toLocaleDateString('no-NO', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </Text>
      </TouchableOpacity>

      {/* All Day Toggle */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <Text style={{ ...theme.typography.body, color: theme.colors.text }}>
          {t('appointments.allDay') || 'Hele dagen'}
        </Text>
        <Switch
          value={allDay}
          onValueChange={setAllDay}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>

      {!allDay && (
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            padding: 12,
            backgroundColor: theme.colors.surface,
            marginBottom: 16
          }}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
          <Text style={{ marginLeft: 12, fontSize: 16, color: theme.colors.text }}>
            {startTime.toLocaleTimeString('no-NO', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </TouchableOpacity>
      )}

      {/* Location */}
      <Text style={{ ...theme.typography.label, color: theme.colors.text, marginBottom: 8 }}>
        {t('appointments.location') || 'Sted'}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: theme.colors.text,
          backgroundColor: theme.colors.surface,
          marginBottom: 16
        }}
        value={location}
        onChangeText={setLocation}
        placeholder={t('appointments.locationPlaceholder') || 'Hvor skal avtalen være?'}
        placeholderTextColor={theme.colors.muted}
      />

      {/* Cultural Warnings */}
      {culturalWarnings.length > 0 && (
        <View style={{
          backgroundColor: theme.colors.warning + '15',
          borderRadius: 12,
          padding: 16,
          marginTop: 8,
          borderWidth: 1,
          borderColor: theme.colors.warning + '40'
        }}>
          <Text style={{
            ...theme.typography.h3,
            color: theme.colors.warning,
            marginBottom: 8
          }}>
            🇳🇴 {t('appointments.cultural.warnings') || 'Norsk kultur tips'}
          </Text>
          {culturalWarnings.map((warning, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <Text style={{
                ...theme.typography.body,
                color: theme.colors.text,
                marginBottom: 2
              }}>
                ⚠️ {warning.message}
              </Text>
              {warning.suggestion && (
                <Text style={{
                  ...theme.typography.caption,
                  color: theme.colors.muted,
                  fontStyle: 'italic'
                }}>
                  💡 {warning.suggestion}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderNotificationStep = () => (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginBottom: 16 }}>
        {t('appointments.notifications.setup') || 'Varslingsinnstillinger'}
      </Text>
      
      <Text style={{ ...theme.typography.body, color: theme.colors.muted, marginBottom: 20 }}>
        {t('appointments.notifications.description') || 'Få påminnelse før avtalen starter'}
      </Text>

      {notifications.map((notification, index) => (
        <View
          key={notification.id}
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.colors.border
          }}
        >
          <Text style={{
            ...theme.typography.h3,
            color: theme.colors.text,
            marginBottom: 12
          }}>
            {t('appointments.notifications.reminder') || 'Påminnelse'} {index + 1}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 8,
                padding: 8,
                fontSize: 16,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                width: 60,
                textAlign: 'center'
              }}
              value={notification.amount.toString()}
              onChangeText={(text) => {
                const amount = parseInt(text) || 0;
                const updated = [...notifications];
                updated[index] = { ...notification, amount };
                setNotifications(updated);
              }}
              keyboardType="numeric"
            />
            
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 8,
                padding: 8,
                backgroundColor: theme.colors.surface,
                marginLeft: 8,
                minWidth: 80
              }}
              onPress={() => {
                const types = ['days', 'hours', 'minutes'] as const;
                const currentIndex = types.indexOf(notification.type);
                const nextType = types[(currentIndex + 1) % types.length];
                const updated = [...notifications];
                updated[index] = { ...notification, type: nextType };
                setNotifications(updated);
              }}
            >
              <Text style={{ fontSize: 16, color: theme.colors.text }}>
                {notification.type === 'days' ? 'dager' : 
                 notification.type === 'hours' ? 'timer' : 'minutter'}
              </Text>
            </TouchableOpacity>
            
            <Text style={{ marginLeft: 8, fontSize: 16, color: theme.colors.text }}>
              {t('appointments.notifications.before') || 'før'}
            </Text>
          </View>

          <Text style={{
            ...theme.typography.caption,
            color: theme.colors.muted,
            fontStyle: 'italic'
          }}>
            "{generateNotificationMessage(notification, title || 'Avtale')}"
          </Text>
        </View>
      ))}

      {template.norwegianGuidance.parentingTips.length > 0 && (
        <View style={{
          backgroundColor: theme.colors.accentSeafoam + '15',
          borderRadius: 12,
          padding: 16,
          marginTop: 8,
          borderWidth: 1,
          borderColor: theme.colors.accentSeafoam + '40'
        }}>
          <Text style={{
            ...theme.typography.h3,
            color: theme.colors.accentSeafoam,
            marginBottom: 8
          }}>
            💡 {t('appointments.cultural.tips') || 'Norske anbefalinger'}
          </Text>
          {template.norwegianGuidance.parentingTips.map((tip, index) => (
            <Text key={index} style={{
              ...theme.typography.body,
              color: theme.colors.text,
              marginBottom: 4
            }}>
              • {tip}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderReviewStep = () => (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginBottom: 16 }}>
        {t('appointments.review') || 'Gjennomgang'}
      </Text>

      <View style={{
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 32, marginRight: 12 }}>{template.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ ...theme.typography.h2, color: theme.colors.text }}>
              {title}
            </Text>
            <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
              {template.name}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
          <Text style={{ marginLeft: 8, ...theme.typography.body, color: theme.colors.text }}>
            {startTime.toLocaleDateString('no-NO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>

        {!allDay && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, ...theme.typography.body, color: theme.colors.text }}>
              {startTime.toLocaleTimeString('no-NO', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        )}

        {child && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="person-outline" size={16} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, ...theme.typography.body, color: theme.colors.text }}>
              {child.displayName}
            </Text>
          </View>
        )}

        {location && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, ...theme.typography.body, color: theme.colors.text }}>
              {location}
            </Text>
          </View>
        )}

        {description && (
          <Text style={{
            ...theme.typography.body,
            color: theme.colors.muted,
            marginTop: 8,
            fontStyle: 'italic'
          }}>
            "{description}"
          </Text>
        )}
      </View>

      {notifications.filter(n => n.amount > 0).length > 0 && (
        <View style={{
          backgroundColor: theme.colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16
        }}>
          <Text style={{ ...theme.typography.h3, color: theme.colors.text, marginBottom: 8 }}>
            📱 {t('appointments.notifications.summary') || 'Varsler'}
          </Text>
          {notifications.filter(n => n.amount > 0).map((notification, index) => (
            <Text key={index} style={{
              ...theme.typography.body,
              color: theme.colors.text,
              marginBottom: 4
            }}>
              • {generateNotificationMessage(notification, title)}
            </Text>
          ))}
        </View>
      )}

      {culturalWarnings.length > 0 && (
        <View style={{
          backgroundColor: theme.colors.warning + '15',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.colors.warning + '40'
        }}>
          <Text style={{
            ...theme.typography.h3,
            color: theme.colors.warning,
            marginBottom: 8
          }}>
            🇳🇴 {t('appointments.cultural.considerations') || 'Kulturelle hensyn'}
          </Text>
          {culturalWarnings.map((warning, index) => (
            <Text key={index} style={{
              ...theme.typography.caption,
              color: theme.colors.text,
              marginBottom: 4
            }}>
              • {warning.message}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'type':
        return renderTypeSelection();
      case 'details':
        return renderDetailsStep();
      case 'notifications':
        return renderNotificationStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'type':
        return true;
      case 'details':
        return title.trim().length > 0;
      case 'notifications':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const getNextStep = (current: typeof currentStep) => {
    const steps = ['type', 'details', 'notifications', 'review'] as const;
    const currentIndex = steps.indexOf(current);
    return steps[currentIndex + 1];
  };

  const getPreviousStep = (current: typeof currentStep) => {
    const steps = ['type', 'details', 'notifications', 'review'] as const;
    const currentIndex = steps.indexOf(current);
    return steps[currentIndex - 1];
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border
        }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={{ ...theme.typography.h1, color: theme.colors.text }}>
            {editingAppointment ? 
              (t('appointments.edit') || 'Rediger avtale') : 
              (t('appointments.new') || 'Ny avtale')
            }
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <View style={{ flex: 1 }}>
          {renderStep()}
        </View>

        {/* Navigation Buttons */}
        <View style={{
          flexDirection: 'row',
          padding: 20,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          gap: 12
        }}>
          {currentStep !== 'type' && (
            <Button
              title={t('common.back') || 'Tilbake'}
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => setCurrentStep(getPreviousStep(currentStep))}
            />
          )}

          {currentStep !== 'review' ? (
            <Button
              title={t('common.next') || 'Neste'}
              style={{ flex: 1 }}
              disabled={!canProceedToNext()}
              onPress={() => setCurrentStep(getNextStep(currentStep))}
            />
          ) : (
            <Button
              title={t('appointments.create') || 'Opprett avtale'}
              style={{ flex: 1 }}
              loading={loading}
              disabled={!canProceedToNext() || loading}
              onPress={handleSave}
            />
          )}
        </View>

        {/* Date/Time Pickers - positioned at modal root level */}
        {showDatePicker && (
          <DateTimePicker
            value={startTime}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const newStartTime = new Date(selectedDate);
                newStartTime.setHours(startTime.getHours());
                newStartTime.setMinutes(startTime.getMinutes());
                setStartTime(newStartTime);
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) {
                const newStartTime = new Date(startTime);
                newStartTime.setHours(selectedTime.getHours());
                newStartTime.setMinutes(selectedTime.getMinutes());
                setStartTime(newStartTime);
              }
            }}
          />
        )}
      </View>
    </Modal>
  );
}