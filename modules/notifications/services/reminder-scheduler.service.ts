import { AppConfig } from '../../../core/config/app.config';
import { INotificationRepository } from '../../../core/database/database.interface';
import { UserProfile, ContraceptiveCategory } from '../../profile/models/profile.model';
import { CyclePrediction } from '../../calendar/models/calendar.model';
import { CreateNotificationDTO, NotificationAlert } from '../models/notification.model';

/**
 * Servicio Optimizado de Programación de Recordatorios:
 * - Evita duplicación de alertas activas del mismo tipo en memoria.
 * - Programación por lotes eficiente.
 */
export class ReminderSchedulerService {
  constructor(private notificationRepository: INotificationRepository<NotificationAlert>) {}

  public async scheduleRemindersForUser(
    profile: UserProfile,
    prediction?: CyclePrediction
  ): Promise<NotificationAlert[]> {
    const scheduled: NotificationAlert[] = [];
    const now = new Date();

    // Obtener alertas pendientes para no duplicar en O(K)
    const existingPending = await this.notificationRepository.findAllPendingByUserId(profile.userId);
    const existingTypes = new Set(existingPending.map(n => n.type));

    // 1. Recordatorio para pastillas diarias
    if (
      profile.activeMethod.category === ContraceptiveCategory.DAILY &&
      profile.activeMethod.dailyIntakeTime &&
      profile.activeMethod.reminderActive &&
      !existingTypes.has('toma_anticonceptivo')
    ) {
      const [hours, minutes] = profile.activeMethod.dailyIntakeTime.split(':').map(Number);
      const scheduledPill = new Date(now);
      scheduledPill.setHours(hours, minutes, 0, 0);
      if (scheduledPill <= now) {
        scheduledPill.setDate(scheduledPill.getDate() + 1);
      }

      const pillDto: CreateNotificationDTO = {
        userId: profile.userId,
        type: 'toma_anticonceptivo',
        title: 'Hora de tu pastilla anticonceptiva',
        message: `Son las ${profile.activeMethod.dailyIntakeTime}. Es hora de tomar tu dosis regular para asegurar tu protección anticonceptiva.`,
        scheduledFor: scheduledPill
      };

      const saved = await this.createNotification(pillDto);
      scheduled.push(saved);
    }

    // 2. Recordatorio previo a menstruación (2 días antes)
    if (prediction && prediction.nextPeriodStartDate && !existingTypes.has('recordatorio_previo_menstruacion')) {
      const nextPeriod = new Date(prediction.nextPeriodStartDate + 'T09:00:00');
      const reminderDate = new Date(nextPeriod.getTime() - (AppConfig.notifications.periodReminderDaysBefore * 86400000));

      if (reminderDate > now) {
        const periodDto: CreateNotificationDTO = {
          userId: profile.userId,
          type: 'recordatorio_previo_menstruacion',
          title: 'Próxima menstruación aproximada',
          message: prediction.ovulationSuppressed
            ? `Se aproxima la fecha estimada de tu sangrado por privación (${prediction.nextPeriodStartDate}).`
            : `Tu próximo periodo menstrual está proyectado en ${AppConfig.notifications.periodReminderDaysBefore} días (${prediction.nextPeriodStartDate}).`,
          scheduledFor: reminderDate
        };
        const saved = await this.createNotification(periodDto);
        scheduled.push(saved);
      }
    }

    // 3. Vencimiento o cambio de método
    if (profile.activeMethod.expirationDate && !existingTypes.has('vencimiento_cambio_metodo')) {
      const expiration = new Date(profile.activeMethod.expirationDate + 'T09:00:00');
      if (expiration > now) {
        const methodDto: CreateNotificationDTO = {
          userId: profile.userId,
          type: 'vencimiento_cambio_metodo',
          title: `Aviso de renovación de ${profile.activeMethod.name}`,
          message: `Tu método anticonceptivo (${profile.activeMethod.name}) requiere revisión, recambio o retiro próximo (${profile.activeMethod.expirationDate}).`,
          scheduledFor: expiration
        };
        const saved = await this.createNotification(methodDto);
        scheduled.push(saved);
      }
    }

    return scheduled;
  }

  private async createNotification(dto: CreateNotificationDTO): Promise<NotificationAlert> {
    const alert: NotificationAlert = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      scheduledFor: dto.scheduledFor,
      status: 'pendiente',
      metadata: dto.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.notificationRepository.save(alert);
  }
}
