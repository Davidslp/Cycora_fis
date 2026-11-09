import {
  ContraceptiveCategory,
  ContraceptiveMethodConfig,
  ContraceptiveMethodType
} from '../models/profile.model';

export interface MethodCycleBehavior {
  isOvulationSuppressed: boolean;
  hasWithdrawalBleed: boolean;
  allowsIrregularSpotting: boolean;
  fertilityWindowActive: boolean;
  expectedBleedIntervalDays: number;
  recommendationDescription: string;
}

/**
 * Servicio Optimizado de Adaptación del Algoritmo del Calendario:
 * - Implementa Memoization en O(1) basada en el tipo y categoría del método.
 * - Evita asignaciones de objetos innecesarias en cálculos recurrentes.
 */
export class ContraceptiveAlgorithmAdapterService {
  private static behaviorCache = new Map<string, MethodCycleBehavior>();

  /**
   * Adapta el comportamiento del ciclo según el método seleccionado (con caché).
   */
  public adaptBehavior(method: ContraceptiveMethodConfig): MethodCycleBehavior {
    const cacheKey = `${method.category}:${method.type}`;
    const cached = ContraceptiveAlgorithmAdapterService.behaviorCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let result: MethodCycleBehavior;
    switch (method.category) {
      case ContraceptiveCategory.HORMONAL_LONG_ACTING:
        result = this.handleHormonalLongActing(method.type);
        break;

      case ContraceptiveCategory.DAILY:
        result = this.handleDailyPills();
        break;

      case ContraceptiveCategory.BARRIER_NONE:
      default:
        result = this.handleNaturalOrBarrier(method.type);
        break;
    }

    ContraceptiveAlgorithmAdapterService.behaviorCache.set(cacheKey, Object.freeze(result));
    return result;
  }

  private handleHormonalLongActing(type: ContraceptiveMethodType): MethodCycleBehavior {
    if (type === ContraceptiveMethodType.SUBDERMIC_IMPLANT || type === ContraceptiveMethodType.HORMONAL_IUD) {
      return {
        isOvulationSuppressed: true,
        hasWithdrawalBleed: false,
        allowsIrregularSpotting: true,
        fertilityWindowActive: false,
        expectedBleedIntervalDays: 0,
        recommendationDescription:
          'Bajo implante o DIU hormonal, la ovulación suele inhibirse y el endometrio se mantiene delgado. Es normal experimentar manchados irregulares (spotting) o ausencia completa de sangrado (amenorrea).'
      };
    }

    return {
      isOvulationSuppressed: true,
      hasWithdrawalBleed: true,
      allowsIrregularSpotting: true,
      fertilityWindowActive: false,
      expectedBleedIntervalDays: 28,
      recommendationDescription:
        'El método hormonal regula el ciclo mediante sangrado por privación hormonal. Las fases ovulatorias naturales no aplican.'
    };
  }

  private handleDailyPills(): MethodCycleBehavior {
    return {
      isOvulationSuppressed: true,
      hasWithdrawalBleed: true,
      allowsIrregularSpotting: false,
      fertilityWindowActive: false,
      expectedBleedIntervalDays: 28,
      recommendationDescription:
        'Con pastillas combinadas o de régimen regular, el sangrado ocurre por privación en los días de descanso o placebo. La adherencia diaria a la misma hora es clave para la eficacia.'
    };
  }

  private handleNaturalOrBarrier(type: ContraceptiveMethodType): MethodCycleBehavior {
    const isCopperIUD = type === ContraceptiveMethodType.COPPER_IUD;
    return {
      isOvulationSuppressed: false,
      hasWithdrawalBleed: false,
      allowsIrregularSpotting: isCopperIUD,
      fertilityWindowActive: true,
      expectedBleedIntervalDays: 28,
      recommendationDescription: isCopperIUD
        ? 'El DIU de cobre no altera tus hormonas naturales; tu ciclo conserva las 4 fases biológicas completas con ventana fértil activa.'
        : 'Ciclo biológico natural completo. Monitoreo de fases proliferativa, ovulatoria con ventana fértil y lútea/secretora según fluctuación hormonal estándar.'
    };
  }

  public validateMethodRequirements(method: ContraceptiveMethodConfig): { valid: boolean; error?: string } {
    if (method.category === ContraceptiveCategory.HORMONAL_LONG_ACTING) {
      if (!method.applicationDate) {
        return {
          valid: false,
          error: 'Para métodos de larga duración (DIU/Implante/Inyección) debe registrar la fecha de colocación o inicio.'
        };
      }
    }

    if (method.category === ContraceptiveCategory.DAILY) {
      if (!method.dailyIntakeTime) {
        return {
          valid: false,
          error: 'Para anticonceptivos diarios (pastillas) es necesario definir la hora de toma diaria.'
        };
      }
    }

    return { valid: true };
  }
}
