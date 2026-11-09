import { BaseEntity, ISODateString, UUID } from '../../../core/types/common.types';

export type MoodType =
  | 'feliz'
  | 'ansiosa'
  | 'irritable'
  | 'triste'
  | 'energica'
  | 'neutral';

export type CrampsSeverity = 'leve' | 'moderada' | 'severa';

export type PhysicalSymptomType =
  | 'dolor_de_cabeza'
  | 'hinchazon'
  | 'sensibilidad_de_senos';

export type FlowCharacteristicType =
  | 'manchado'                      // Spotting
  | 'flujo_regular'                 // Sangrado menstrual regular
  | 'presencia_de_coagulos'         // Coágulos
  | 'flujo_vaginal_no_menstrual';   // Moco cervical fértil, acuoso, etc.

export interface CrampDetail {
  severity: CrampsSeverity;
  score: number; // 1: leve, 2: moderada, 3: severa
}

export interface HealthIndicator {
  code: string;
  level: 'info' | 'atencion' | 'alerta';
  message: string;
  recommendation: string;
}

export interface DailyLogRecord extends BaseEntity {
  userId: UUID;
  date: ISODateString;
  mood: MoodType;
  cramps?: CrampDetail;
  physicalSymptoms: PhysicalSymptomType[];
  flowCharacteristics: FlowCharacteristicType[];
  notes?: string;
  healthFlags: string[];
  healthIndicators: HealthIndicator[];
}

export interface CreateDailyLogDTO {
  userId: UUID;
  date: ISODateString;
  mood: MoodType;
  crampsSeverity?: CrampsSeverity;
  physicalSymptoms?: PhysicalSymptomType[];
  flowCharacteristics?: FlowCharacteristicType[];
  notes?: string;
}
