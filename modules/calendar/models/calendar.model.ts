import { BaseEntity, ISODateString, UUID } from '../../../core/types/common.types';

export enum CyclePhaseType {
  MENSTRUAL = 'FASE_MENSTRUAL',
  FOLLICULAR_PROLIFERATIVE = 'FASE_FOLICULAR_PROLIFERATIVA',
  OVULATORY = 'FASE_OVULATORIA',
  LUTEAL_SECRETORY = 'FASE_LUTEA_SECRETORA'
}

export interface PhaseInfo {
  type: CyclePhaseType;
  name: string;
  startCycleDay: number;
  endCycleDay: number;
  hormones: string;
  description: string;
  isFertile: boolean;
  colorCode: string;
}

export type CycleStatus = 'activo' | 'completado';

export interface MenstrualCycle extends BaseEntity {
  userId: UUID;
  cycleNumber: number;
  startDate: ISODateString;           // Día 1 del ciclo
  endDate?: ISODateString;             // Fin del ciclo (día antes del siguiente periodo)
  periodEndDate?: ISODateString;       // Fin del sangrado menstrual
  periodDurationDays?: number;         // Duración del sangrado en días
  cycleLengthDays?: number;            // Duración total del ciclo en días
  status: CycleStatus;
  isRetroactiveAdjustment: boolean;   // Si se marcó retrospectivamente
}

export interface CyclePrediction {
  nextPeriodStartDate: ISODateString;
  countdownDays: number;
  estimatedCycleLength: number;
  estimatedPeriodDuration: number;
  nextOvulationDate?: ISODateString;
  fertileWindow?: {
    startDate: ISODateString;
    endDate: ISODateString;
  };
  ovulationSuppressed: boolean;
  methodRecommendationNote: string;
}

export interface CalendarDayIndicator {
  hasPeriod: boolean;
  isDayOne: boolean;
  phase: CyclePhaseType;
  cycleDayNumber?: number;
  hasSymptoms: boolean;
  moodEmoji?: string;
  symptomsList: string[];
  crampsSeverity?: 'leve' | 'moderada' | 'severa';
  hasHealthAlert: boolean;
}

export interface CalendarDayViewModel {
  date: ISODateString;
  indicator: CalendarDayIndicator;
}

export interface CircularWheelSlice {
  cycleDay: number;
  phase: CyclePhaseType;
  phaseName: string;
  color: string;
  isCurrentDay: boolean;
  isFertile: boolean;
  isBleeding: boolean;
  degrees: { start: number; end: number };
}

export interface CircularCycleViewModel {
  totalDays: number;
  currentCycleDay: number;
  currentPhase: PhaseInfo;
  slices: CircularWheelSlice[];
  countdownDays: number;
  nextPeriodDate: ISODateString;
}
