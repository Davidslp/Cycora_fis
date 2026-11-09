import { EventBus } from '../../../core/events/event-bus';
import { AppEventType, NotificationInteractedPayload } from '../../../core/events/app-events';
import { INotificationRepository, IProfileRepository } from '../../../core/database/database.interface';
import { Result, ok, fail, UUID } from '../../../core/types/common.types';
import { UserProfile } from '../../profile/models/profile.model';
import { NotificationAlert, NotificationStatus } from '../models/notification.model';
import { ReminderSchedulerService } from '../services/reminder-scheduler.service';

/**
 * Controlador de Recordatorios y Alertas.
 * Implementa el flujo de los Diagramas 5, 12 y 17 de Cycora.
 */
export class NotificationController {
  private schedulerService: ReminderSchedulerService;

  constructor(
    private notificationRepository: INotificationRepository<NotificationAlert>,
    private profileRepository: IProfileRepository<UserProfile>,
    private eventBus: EventBus = EventBus.getInstance()
  ) {
    this.schedulerService = new ReminderSchedulerService(this.notificationRepository);
  }

  /**
   * 1 & 2: Procesa la activación de recordatorios para una usuaria
   */
  public async procesarActivacionRecordatorios(userId: UUID): Promise<Result<NotificationAlert[]>> {
    try {
      const profile = await this.profileRepository.findById(userId);
      if (!profile) {
        return fail(new Error(`Perfil ${userId} no encontrado.`));
      }

      const scheduled = await this.schedulerService.scheduleRemindersForUser(profile);
      return ok(scheduled);
    } catch (err: any) {
      return fail(err);
    }
  }

  /**
   * 3 & 4: Emite una alerta pendiente en el dispositivo
   */
  public async emitirAlertaEnDispositivo(notificationId: UUID): Promise<Result<NotificationAlert>> {
    try {
      const alert = await this.notificationRepository.findById(notificationId);
      if (!alert) {
        return fail(new Error(`Alerta ${notificationId} no encontrada.`));
      }

      const updated = await this.notificationRepository.updateStatus(notificationId, 'emitida');
      await this.eventBus.publish(AppEventType.NOTIFICATION_TRIGGERED, updated);

      return ok(updated);
    } catch (err: any) {
      return fail(err);
    }
  }

  /**
   * 5 & 6 & 7 & 8: Registra la respuesta del usuario ante una alerta ('vista' u 'omitida')
   */
  public async registrarRespuestaAlerta(
    notificationId: UUID,
    accion: 'vista' | 'omitida'
  ): Promise<Result<{ alert: NotificationAlert; confirmed: boolean }>> {
    try {
      const alert = await this.notificationRepository.findById(notificationId);
      if (!alert) {
        return fail(new Error(`Alerta ${notificationId} no existe.`));
      }

      // 7: Actualizar estado de recordatorio en BD
      const updated = await this.notificationRepository.updateStatus(notificationId, accion);

      // Notificar interacción
      const payload: NotificationInteractedPayload = {
        notificationId,
        userId: updated.userId,
        action: accion,
        timestamp: new Date()
      };
      await this.eventBus.publish(AppEventType.NOTIFICATION_INTERACTED, payload);

      // 8: Confirmación de respuesta procesada
      return ok({
        alert: updated,
        confirmed: true
      });
    } catch (err: any) {
      return fail(err);
    }
  }

  /**
   * Obtiene la lista de alertas pendientes de atención para la bandeja del usuario
   */
  public async obtenerBandejaAlertas(userId: UUID): Promise<NotificationAlert[]> {
    return this.notificationRepository.findAllByUserId(userId);
  }
}
