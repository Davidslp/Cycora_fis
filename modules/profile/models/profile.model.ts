import { BaseEntity, ISODateString, ISOTimeString, UUID } from '../../../core/types/common.types';

export enum ContraceptiveCategory {
  HORMONAL_LONG_ACTING = 'HORMONAL_LARGA_DURACION',
  DAILY = 'DIARIOS',
  BARRIER_NONE = 'BARRERA_NINGUNO'
}

export enum ContraceptiveMethodType {
  // Larga duración hormonales
  SUBDERMIC_IMPLANT = 'IMPLANTE',
  HORMONAL_IUD = 'DIU_HORMONAL',
  INJECTION = 'INYECCION',
  PATCH = 'PARCHE',
  VAGINAL_RING = 'ANILLO',

  // Diarios
  PILLS = 'PASTILLAS',

  // Barrera o Ninguno
  CONDOM = 'PRESERVATIVO',
  COPPER_IUD = 'DIU_COBRE',
  NATURAL_PLANNING = 'BUSQUEDA_EMBARAZO_NINGUNO'
}

export interface ContraceptiveMethodConfig {
  type: ContraceptiveMethodType;
  category: ContraceptiveCategory;
  name: string;
  // Campos dinámicos según el diagrama UML (Diagrama 1)
  applicationDate?: ISODateString; // Requerido para Implante, DIU, Inyección
  expirationDate?: ISODateString;  // Para avisos de cambio/vencimiento
  dailyIntakeTime?: ISOTimeString; // Requerido para Pastillas diarias (ej: "21:00")
  reminderActive: boolean;
}

export interface UserProfile extends BaseEntity {
  userId: UUID;
  name: string;
  birthDate?: ISODateString;
  averageCycleLength: number;     // Duración promedio ciclo (por ej. 28 días)
  averagePeriodDuration: number;  // Duración promedio sangrado (por ej. 5 días)
  activeMethod: ContraceptiveMethodConfig;
  cycleHistoryIds: UUID[];
}

export interface ProfileCreationDTO {
  userId?: UUID;
  name: string;
  birthDate?: ISODateString;
  averageCycleLength?: number;
  averagePeriodDuration?: number;
  method: ContraceptiveMethodConfig;
}
