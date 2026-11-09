import { BaseEntity, UUID } from '../../../core/types/common.types';

export type NotificationType =
  | 'toma_anticonceptivo'
  | 'recordatorio_previo_menstruacion'
  | 'vencimiento_cambio_metodo'
  | 'alerta_salud';

export type NotificationStatus = 'pendiente' | 'emitida' | 'vista' | 'omitida';

export interface NotificationAlert extends BaseEntity {
  userId: UUID;
  type: NotificationType;
  title: string;
  message: string;
  scheduledFor: Date;
  status: NotificationStatus;
  respondedAt?: Date;
  metadata?: Record<string, any>;
}

export interface CreateNotificationDTO {
  userId: UUID;
  type: NotificationType;
  title: string;
  message: string;
  scheduledFor: Date;
  metadata?: Record<string, any>;
}
