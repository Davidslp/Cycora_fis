import { AppConfig } from '../../../core/config/app.config';
import { ISODateString } from '../../../core/types/common.types';
import { ContraceptiveMethodConfig } from '../../profile/models/profile.model';
import { ContraceptiveAlgorithmAdapterService, MethodCycleBehavior } from '../../profile/services/algorithm-adapter.service';
import {
  CyclePhaseType,
  PhaseInfo,
  CyclePrediction
} from '../models/calendar.model';

const MS_PER_DAY = 86400000; // 1000 * 60 * 60 * 24

/**
 * Servicio Optimizado de Cálculo del Ciclo Menstrual:
 * - Realiza aritmética de fechas en milisegundos O(1)
 * - Evita re-instanciación de definiciones de fase en bucles de días
 * - Memoiza definiciones estáticas de fases
 */
export class CycleCalculatorService {
  private static phasesCache = new Map<string, PhaseInfo[]>();

  constructor(
    private adapterService: ContraceptiveAlgorithmAdapterService = new ContraceptiveAlgorithmAdapterService()
  ) {}

  public getPhasesDefinition(
    cycleLength = AppConfig.biologicalDefaults.averageCycleLengthDays,
    periodDuration = AppConfig.biologicalDefaults.averagePeriodDurationDays,
    behavior?: MethodCycleBehavior
  ): PhaseInfo[] {
    const isSuppressed = behavior ? behavior.isOvulationSuppressed : false;
    const cacheKey = `${cycleLength}:${periodDuration}:${isSuppressed}`;
    const cached = CycleCalculatorService.phasesCache.get(cacheKey);
    if (cached) return cached;

    const estimatedOvulationDay = Math.max(periodDuration + 2, cycleLength - AppConfig.biologicalDefaults.lutealPhaseLengthDays);
    const fertileStart = Math.max(periodDuration + 1, estimatedOvulationDay - AppConfig.biologicalDefaults.ovulationWindowBeforeDays);
    const fertileEnd = Math.min(cycleLength - 1, estimatedOvulationDay + AppConfig.biologicalDefaults.ovulationWindowAfterDays);

    const phases: PhaseInfo[] = [
      {
        type: CyclePhaseType.MENSTRUAL,
        name: isSuppressed && behavior?.hasWithdrawalBleed ? 'Sangrado por Privación' : 'Fase Menstrual',
        startCycleDay: 1,
        endCycleDay: periodDuration,
        hormones: 'Estrógeno y progesterona bajos',
        description: 'Desprendimiento del endometrio en forma de sangrado.',
        isFertile: false,
        colorCode: '#FF4D6D'
      },
      {
        type: CyclePhaseType.FOLLICULAR_PROLIFERATIVE,
        name: 'Fase Folicular / Proliferativa',
        startCycleDay: periodDuration + 1,
        endCycleDay: isSuppressed ? cycleLength : fertileStart - 1,
        hormones: isSuppressed ? 'Hormonas reguladas exógenamente' : 'Incremento progresivo de FSH y Estrógeno',
        description: isSuppressed
          ? 'Fase de reposo folicular bajo control anticonceptivo.'
          : 'Maduración de folículos y engrosamiento del endometrio. Suele acompañarse de energía y claridad mental.',
        isFertile: false,
        colorCode: '#00B4D8'
      },
      {
        type: CyclePhaseType.OVULATORY,
        name: isSuppressed ? 'Ovulación Suprimida' : 'Fase Ovulatoria',
        startCycleDay: isSuppressed ? 0 : fertileStart,
        endCycleDay: isSuppressed ? 0 : fertileEnd,
        hormones: isSuppressed ? 'Pico de LH inhibido' : 'Pico de Hormona Luteinizante (LH)',
        description: isSuppressed
          ? 'La ovulación se encuentra biológicamente bloqueada por la medicación anticonceptiva.'
          : 'Liberación del óvulo maduro hacia la trompa de Falopio. Período más fértil del ciclo.',
        isFertile: !isSuppressed,
        colorCode: '#FFB703'
      },
      {
        type: CyclePhaseType.LUTEAL_SECRETORY,
        name: isSuppressed ? 'Fase Activa Anticonceptiva' : 'Fase Lútea / Secretora',
        startCycleDay: isSuppressed ? periodDuration + 1 : fertileEnd + 1,
        endCycleDay: cycleLength,
        hormones: isSuppressed ? 'Progestina continua' : 'Dominancia de Progesterona',
        description: isSuppressed
          ? 'Mantenimiento del endometrio delgado sin ovulación.'
          : 'El cuerpo lúteo produce progesterona. Si no hay fecundación, las hormonas descienden para reiniciar el ciclo.',
        isFertile: false,
        colorCode: '#8338EC'
      }
    ];

    CycleCalculatorService.phasesCache.set(cacheKey, phases);
    return phases;
  }

  /**
   * Determinación ultrarrápida de fase en O(1) mediante umbrales numéricos
   */
  public determinePhaseForCycleDay(
    dayNumber: number,
    cycleLength = AppConfig.biologicalDefaults.averageCycleLengthDays,
    periodDuration = AppConfig.biologicalDefaults.averagePeriodDurationDays,
    method?: ContraceptiveMethodConfig
  ): PhaseInfo {
    const behavior = method ? this.adapterService.adaptBehavior(method) : undefined;
    const phases = this.getPhasesDefinition(cycleLength, periodDuration, behavior);

    if (dayNumber <= periodDuration) {
      return phases[0]; // MENSTRUAL
    }

    if (behavior?.isOvulationSuppressed) {
      return phases[3]; // LUTEAL_SECRETORY (Activa Anticonceptiva)
    }

    const estimatedOvulationDay = cycleLength - AppConfig.biologicalDefaults.lutealPhaseLengthDays;
    const fertileStart = estimatedOvulationDay - AppConfig.biologicalDefaults.ovulationWindowBeforeDays;
    const fertileEnd = estimatedOvulationDay + AppConfig.biologicalDefaults.ovulationWindowAfterDays;

    if (dayNumber >= fertileStart && dayNumber <= fertileEnd) {
      return phases[2]; // OVULATORY
    } else if (dayNumber < fertileStart) {
      return phases[1]; // FOLLICULAR_PROLIFERATIVE
    } else {
      return phases[3]; // LUTEAL_SECRETORY
    }
  }

  public calculateCyclePrediction(
    currentPeriodStartDate: ISODateString,
    averageCycleLength: number,
    averagePeriodDuration: number,
    method?: ContraceptiveMethodConfig
  ): CyclePrediction {
    const behavior = method
      ? this.adapterService.adaptBehavior(method)
      : this.adapterService.adaptBehavior({
          category: 'BARRERA_NINGUNO' as any,
          type: 'PRESERVATIVO' as any,
          name: 'Natural',
          reminderActive: false
        });

    const startMs = new Date(currentPeriodStartDate + 'T00:00:00').getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const cycleDaysToAdd = behavior.expectedBleedIntervalDays > 0 ? behavior.expectedBleedIntervalDays : averageCycleLength;
    const nextPeriodMs = startMs + (cycleDaysToAdd * MS_PER_DAY);
    const countdownDays = Math.max(0, Math.ceil((nextPeriodMs - todayMs) / MS_PER_DAY));

    const nextPeriodStr = this.formatDateMs(nextPeriodMs);

    let nextOvulationDate: ISODateString | undefined;
    let fertileWindow: { startDate: ISODateString; endDate: ISODateString } | undefined;

    if (!behavior.isOvulationSuppressed) {
      const ovulationOffsetDays = cycleDaysToAdd - AppConfig.biologicalDefaults.lutealPhaseLengthDays;
      const ovulationMs = startMs + (ovulationOffsetDays * MS_PER_DAY);
      nextOvulationDate = this.formatDateMs(ovulationMs);

      const fStartMs = ovulationMs - (AppConfig.biologicalDefaults.ovulationWindowBeforeDays * MS_PER_DAY);
      const fEndMs = ovulationMs + (AppConfig.biologicalDefaults.ovulationWindowAfterDays * MS_PER_DAY);

      fertileWindow = {
        startDate: this.formatDateMs(fStartMs),
        endDate: this.formatDateMs(fEndMs)
      };
    }

    return {
      nextPeriodStartDate: nextPeriodStr,
      countdownDays,
      estimatedCycleLength: cycleDaysToAdd,
      estimatedPeriodDuration: averagePeriodDuration,
      nextOvulationDate,
      fertileWindow,
      ovulationSuppressed: behavior.isOvulationSuppressed,
      methodRecommendationNote: behavior.recommendationDescription
    };
  }

  private formatDateMs(ms: number): ISODateString {
    return new Date(ms).toISOString().split('T')[0];
  }
}
