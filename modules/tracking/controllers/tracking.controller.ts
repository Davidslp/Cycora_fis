import { EventBus } from '../../../core/events/event-bus';
import { AppEventType, DailyLogSavedPayload } from '../../../core/events/app-events';
import { IDailyLogRepository, IProfileRepository } from '../../../core/database/database.interface';
import { Result, ok, fail, UUID, ISODateString } from '../../../core/types/common.types';
import { UserProfile } from '../../profile/models/profile.model';
import {
  CreateDailyLogDTO,
  DailyLogRecord,
  HealthIndicator
} from '../models/tracking.model';
import { HealthIndicatorsService } from '../services/health-indicators.service';

/**
 * Controlador de Registro Diario (Síntomas y Estado de Ánimo).
 * Orquesta la secuencia y comunicación descrita en los diagramas UML (Págs 9, 10, 14, 15).
 */
export class TrackingController {
  constructor(
    private dailyLogRepository: IDailyLogRepository<DailyLogRecord>,
    private profileRepository: IProfileRepository<UserProfile>,
    private healthIndicatorsService: HealthIndicatorsService = new HealthIndicatorsService(),
    private eventBus: EventBus = EventBus.getInstance()
  ) {}

  /**
   * Procesa y valida el registro diario enviado desde la interfaz de usuario.
   * Diagrama 3 / Diagramas de Secuencia 9 y 10:
   * 4: Enviar datos de registro
   * 5: Procesar y validar registro
   *   5.1: Evaluar intensidad de cólicos [leve, moderada, severa]
   *   5.2: Generar indicadores de salud
   *   5.3: Actualizar historial diario
   * 6: Guardar síntomas y estado de ánimo en BD
   * 7: Notificar actualización (muestra indicador visual en el calendario)
   * 8: Confirmación de éxito
   */
  public async procesarYValidarRegistro(dto: CreateDailyLogDTO): Promise<Result<{
    record: DailyLogRecord;
    indicators: HealthIndicator[];
  }>> {
    try {
      // 1. Obtener perfil de la usuaria para evaluar correlación con su método anticonceptivo
      const profile = await this.profileRepository.findById(dto.userId);

      // 5.1: Evaluar intensidad de cólicos
      const crampDetail = this.healthIndicatorsService.evaluarIntensidadColicos(dto.crampsSeverity);

      const physicalSymptoms = dto.physicalSymptoms || [];
      const flowCharacteristics = dto.flowCharacteristics || [];

      // 5.2: Generar indicadores de salud
      const healthIndicators = this.healthIndicatorsService.generarIndicadoresSalud({
        cramps: crampDetail,
        physicalSymptoms,
        flow: flowCharacteristics,
        method: profile?.activeMethod
      });

      const healthFlags = healthIndicators.map((i) => i.code);

      // 5.3 & 6: Actualizar historial diario y guardar en persistencia
      const existingLog = await this.dailyLogRepository.findByUserAndDate(dto.userId, dto.date);
      const now = new Date();

      const recordToSave: DailyLogRecord = {
        id: existingLog ? existingLog.id : `log-${Date.now()}`,
        userId: dto.userId,
        date: dto.date,
        mood: dto.mood,
        cramps: crampDetail,
        physicalSymptoms,
        flowCharacteristics,
        notes: dto.notes ? dto.notes.trim() : undefined,
        healthFlags,
        healthIndicators,
        createdAt: existingLog ? existingLog.createdAt : now,
        updatedAt: now
      };

      const savedRecord = await this.dailyLogRepository.save(recordToSave);

      // 7: Notificar actualización a través del EventBus (desacoplado)
      // Permite que el Calendario pinte el indicador visual y que el CycleController
      // detecte si hubo flujo regular para correlacionar con menstruación
      const payload: DailyLogSavedPayload = {
        userId: savedRecord.userId,
        logId: savedRecord.id,
        date: savedRecord.date,
        mood: savedRecord.mood,
        hasCramps: !!savedRecord.cramps,
        crampsSeverity: savedRecord.cramps?.severity,
        flowType: savedRecord.flowCharacteristics.length > 0 ? (savedRecord.flowCharacteristics[0] as any) : undefined,
        healthFlags: savedRecord.healthFlags
      };

      await this.eventBus.publish(AppEventType.DAILY_LOG_SAVED, payload);

      if (healthIndicators.some((h) => h.level === 'alerta' || h.level === 'atencion')) {
        await this.eventBus.publish(AppEventType.HEALTH_ALERT_DETECTED, {
          userId: savedRecord.userId,
          date: savedRecord.date,
          indicators: healthIndicators
        });
      }

      // 8: Confirmación de éxito
      return ok({
        record: savedRecord,
        indicators: healthIndicators
      });
    } catch (err: any) {
      return fail(err);
    }
  }

  /**
   * Obtiene el registro diario para una fecha específica
   */
  public async obtenerRegistroPorFecha(userId: UUID, date: ISODateString): Promise<DailyLogRecord | null> {
    return this.dailyLogRepository.findByUserAndDate(userId, date);
  }

  /**
   * Obtiene todos los registros en un rango de fechas para pintar el historial
   */
  public async obtenerHistorial(userId: UUID, fromDate?: ISODateString, toDate?: ISODateString): Promise<DailyLogRecord[]> {
    return this.dailyLogRepository.findAllByUser(userId, fromDate, toDate);
  }
}
