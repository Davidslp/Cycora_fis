/**
 * Configuración global del motor de Cycora y parámetros biológicos por defecto.
 */
export const AppConfig = {
  appName: 'Cycora',
  version: '1.0.0',
  biologicalDefaults: {
    averageCycleLengthDays: 28,
    averagePeriodDurationDays: 5,
    lutealPhaseLengthDays: 14,
    ovulationWindowBeforeDays: 4, // Días fértiles antes de la ovulación
    ovulationWindowAfterDays: 1,  // Días fértiles después de la ovulación
    minHealthyCycleDays: 21,
    maxHealthyCycleDays: 35,
    minPeriodDurationDays: 2,
    maxPeriodDurationDays: 8,
  },
  notifications: {
    periodReminderDaysBefore: 2,
    patchChangeIntervalDays: 7,
    ringChangeIntervalDays: 21,
  }
} as const;
