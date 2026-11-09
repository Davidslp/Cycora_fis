import { EventBus } from '../../../core/events/event-bus';
import { AppEventType, PeriodEndedPayload, PeriodStartedPayload } from '../../../core/events/app-events';
import { ICycleRepository, IDailyLogRepository, IProfileRepository } from '../../../core/database/database.interface';
import { Result, ok, fail, UUID, ISODateString } from '../../../core/types/common.types';
import { UserProfile } from '../../profile/models/profile.model';
import { DailyLogRecord } from '../../tracking/models/tracking.model';
import {
  MenstrualCycle,
  CyclePrediction,
  CalendarDayViewModel,
  CyclePhaseType,
  CircularCycleViewModel
} from '../models/calendar.model';
import { CycleCalculatorService } from '../services/cycle-calculator.service';
import { CycleHistoryService } from '../services/cycle-history.service';

export interface RegisterPeriodInput {
  userId: UUID;
  startDate: ISODateString;
  endDate?: ISODateString;
  isDailyFlowUpdate?: boolean; // Marcar flujo continuo vs marcar fin definitivo
}

/**
 * Controlador de Ciclo y Calendario.
 * Orquesta la lógica descrita en los diagramas de secuencia 2 y 4 (Páginas 8, 11, 13, 16).
 */
export class CycleController {
  private historyService: CycleHistoryService;

  constructor(
    private cycleRepository: ICycleRepository<MenstrualCycle>,
    private profileRepository: IProfileRepository<UserProfile>,
    private dailyLogRepository: IDailyLogRepository<DailyLogRecord>,
    private calculatorService: CycleCalculatorService = new CycleCalculatorService(),
    private eventBus: EventBus = EventBus.getInstance()
  ) {
    this.historyService = new CycleHistoryService(this.cycleRepository);
  }

  /**
   * Procesa el registro de inicio o fin de menstruación
   * Diagrama de Secuencia 2 (Pág 8, 13):
   * 4. Procesar evento de menstruación:
   *   4.1 Marcar inicio de periodo [Ajuste retroactivo]
   *   4.2 Validar Ciclo y marcar dia 1
   *   4.3 Marcar flujo diario o fin
   * 5. Guardar cambios
   * 6. Cerrar duración y recalcular promedio
   * 7. Notificar actualización de ciclo
   */
  public async procesarEventoMenstruacion(input: RegisterPeriodInput): Promise<Result<MenstrualCycle>> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const isRetroactive = input.startDate < todayStr;

      const profile = await this.profileRepository.findById(input.userId);
      const activeCycle = await this.historyService.getActiveCycle(input.userId);

      // Si no se especifica endDate, estamos registrando el inicio del ciclo (Día 1)
      if (!input.endDate) {
        // Si ya hay un ciclo activo previo, lo cerramos calculando su longitud total
        if (activeCycle && activeCycle.startDate !== input.startDate) {
          const diffMs = new Date(input.startDate).getTime() - new Date(activeCycle.startDate).getTime();
          const lengthDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          await this.cycleRepository.update(activeCycle.id, {
            endDate: input.startDate,
            cycleLengthDays: lengthDays,
            status: 'completado',
            updatedAt: new Date()
          });
        }

        // Crear nuevo ciclo (Día 1)
        const cycles = await this.historyService.getCycles(input.userId);
        const newCycle: MenstrualCycle = {
          id: `cycle-${Date.now()}`,
          userId: input.userId,
          cycleNumber: cycles.length + 1,
          startDate: input.startDate,
          status: 'activo',
          isRetroactiveAdjustment: isRetroactive,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const savedCycle = await this.cycleRepository.save(newCycle);

        // Notificar inicio de periodo
        const payload: PeriodStartedPayload = {
          userId: input.userId,
          startDate: input.startDate,
          isRetroactive,
          cycleId: savedCycle.id,
          dayNumber: 1
        };
        await this.eventBus.publish(AppEventType.PERIOD_STARTED, payload);

        return ok(savedCycle);
      }

      // Caso: Marcar fin del sangrado menstrual
      if (!activeCycle) {
        return fail(new Error('No hay un ciclo menstrual activo para registrar el fin del periodo.'));
      }

      const startMs = new Date(activeCycle.startDate).getTime();
      const endMs = new Date(input.endDate).getTime();
      const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

      // Guardar fin de sangrado en BD
      const updatedCycle = await this.cycleRepository.update(activeCycle.id, {
        periodEndDate: input.endDate,
        periodDurationDays: durationDays,
        updatedAt: new Date()
      });

      // Recalcular promedios históricos
      const averages = await this.historyService.recalculateAverages(input.userId);
      if (profile) {
        await this.profileRepository.update(profile.id, {
          averagePeriodDuration: averages.averagePeriodDuration,
          averageCycleLength: averages.averageCycleLength,
          updatedAt: new Date()
        });
      }

      // Notificar fin de periodo y promedios recalculados
      const endPayload: PeriodEndedPayload = {
        userId: input.userId,
        cycleId: updatedCycle.id,
        startDate: updatedCycle.startDate,
        endDate: input.endDate,
        durationDays,
        newAverageDuration: averages.averagePeriodDuration
      };
      await this.eventBus.publish(AppEventType.PERIOD_ENDED, endPayload);
      await this.eventBus.publish(AppEventType.CYCLE_RECALCULATED, averages);

      return ok(updatedCycle);
    } catch (err: any) {
      return fail(err);
    }
  }

  /**
   * Obtiene los datos integrados del calendario para la vista de usuario.
   * Diagrama de Secuencia 4 (Páginas 11, 16):
   * 1. Solicitar visualización
   * 2. Obtener datos
   * 3. Consultar historial de síntomas
   * 4. Calcular siguiente periodo y conteo regresivo
   * 5. Evaluar tipo de anticonceptivo
   * 6. Enviar datos procesados
   */
  public async obtenerDatosCalendario(userId: UUID): Promise<Result<{
    activeCycle: MenstrualCycle | null;
    prediction: CyclePrediction;
    circularView: CircularCycleViewModel;
    recentDays: CalendarDayViewModel[];
  }>> {
    try {
      const profile = await this.profileRepository.findById(userId);
      const activeCycle = await this.historyService.getActiveCycle(userId);

      const cycleLength = profile?.averageCycleLength ?? 28;
      const periodDuration = profile?.averagePeriodDuration ?? 5;
      const activeMethod = profile?.activeMethod;

      const startDate = activeCycle ? activeCycle.startDate : new Date().toISOString().split('T')[0];

      // 4 & 5: Calcular predicción y evaluar método de control
      const prediction = this.calculatorService.calculateCyclePrediction(
        startDate,
        cycleLength,
        periodDuration,
        activeMethod
      );

      // Calcular día del ciclo actual
      const today = new Date();
      const start = new Date(startDate + 'T00:00:00');
      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const currentCycleDay = Math.max(1, ((diffDays - 1) % cycleLength) + 1);

      // 3: Consultar historial de síntomas de los últimos 30 días
      const dailyLogs = await this.dailyLogRepository.findAllByUser(userId);
      const logsMap = new Map<ISODateString, DailyLogRecord>();
      dailyLogs.forEach((log) => logsMap.set(log.date, log));

      // Construir vista circular de 28 días
      const phasesDef = this.calculatorService.getPhasesDefinition(cycleLength, periodDuration);
      const degreesPerDay = 360 / cycleLength;

      const slices = Array.from({ length: cycleLength }, (_, i) => {
        const day = i + 1;
        const phase = this.calculatorService.determinePhaseForCycleDay(day, cycleLength, periodDuration, activeMethod);
        return {
          cycleDay: day,
          phase: phase.type,
          phaseName: phase.name,
          color: phase.colorCode,
          isCurrentDay: day === currentCycleDay,
          isFertile: phase.isFertile,
          isBleeding: day <= periodDuration,
          degrees: {
            start: Math.round(i * degreesPerDay),
            end: Math.round((i + 1) * degreesPerDay)
          }
        };
      });

      const currentPhase = this.calculatorService.determinePhaseForCycleDay(
        currentCycleDay,
        cycleLength,
        periodDuration,
        activeMethod
      );

      const circularView: CircularCycleViewModel = {
        totalDays: cycleLength,
        currentCycleDay,
        currentPhase,
        slices,
        countdownDays: prediction.countdownDays,
        nextPeriodDate: prediction.nextPeriodStartDate
      };

      // Mapear días recientes con síntomas y fases para la vista de calendario
      const recentDays: CalendarDayViewModel[] = [];
      for (let i = -7; i <= 21; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        const log = logsMap.get(dStr);

        const cycleDayForDate = Math.max(1, Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const phaseForDate = this.calculatorService.determinePhaseForCycleDay(
          ((cycleDayForDate - 1) % cycleLength) + 1,
          cycleLength,
          periodDuration,
          activeMethod
        );

        recentDays.push({
          date: dStr,
          indicator: {
            hasPeriod: cycleDayForDate <= periodDuration && cycleDayForDate >= 1,
            isDayOne: cycleDayForDate === 1,
            phase: phaseForDate.type,
            cycleDayNumber: cycleDayForDate > 0 ? cycleDayForDate : undefined,
            hasSymptoms: !!log && (log.physicalSymptoms.length > 0 || !!log.cramps),
            moodEmoji: log ? this.getMoodEmoji(log.mood) : undefined,
            symptomsList: log ? log.physicalSymptoms : [],
            crampsSeverity: log?.cramps?.severity,
            hasHealthAlert: !!log && log.healthFlags.length > 0
          }
        });
      }

      return ok({
        activeCycle,
        prediction,
        circularView,
        recentDays
      });
    } catch (err: any) {
      return fail(err);
    }
  }

  private getMoodEmoji(mood: string): string {
    const map: Record<string, string> = {
      feliz: '😊',
      ansiosa: '😰',
      irritable: '😤',
      triste: '😢',
      energica: '⚡',
      neutral: '😐'
    };
    return map[mood.toLowerCase()] || '📝';
  }
}
