import { ISODateString, UUID } from '../types/common.types';

export enum AppEventType {
  // Eventos de Perfil y Método
  PROFILE_CREATED = 'profile:created',
  CONTRACEPTIVE_METHOD_CHANGED = 'profile:contraceptive_method_changed',

  // Eventos de Ciclo y Menstruación
  PERIOD_STARTED = 'cycle:period_started',
  PERIOD_ENDED = 'cycle:period_ended',
  CYCLE_RECALCULATED = 'cycle:recalculated',

  // Eventos de Registro Diario de Síntomas
  DAILY_LOG_SAVED = 'tracking:daily_log_saved',
  HEALTH_ALERT_DETECTED = 'tracking:health_alert_detected',

  // Eventos de Notificaciones y Recordatorios
  NOTIFICATION_SCHEDULED = 'notification:scheduled',
  NOTIFICATION_TRIGGERED = 'notification:triggered',
  NOTIFICATION_INTERACTED = 'notification:interacted'
}

export interface PeriodStartedPayload {
  userId: UUID;
  startDate: ISODateString;
  isRetroactive: boolean;
  cycleId: UUID;
  dayNumber: number;
}

export interface PeriodEndedPayload {
  userId: UUID;
  cycleId: UUID;
  startDate: ISODateString;
  endDate: ISODateString;
  durationDays: number;
  newAverageDuration: number;
}

export interface DailyLogSavedPayload {
  userId: UUID;
  logId: UUID;
  date: ISODateString;
  mood: string;
  hasCramps: boolean;
  crampsSeverity?: 'leve' | 'moderada' | 'severa';
  flowType?: 'manchado' | 'flujo regular' | 'coagulos' | 'flujo no menstrual';
  healthFlags: string[];
}

export interface NotificationInteractedPayload {
  notificationId: UUID;
  userId: UUID;
  action: 'vista' | 'omitida';
  timestamp: Date;
}
