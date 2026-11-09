import { ContraceptiveMethodConfig, ContraceptiveCategory } from '../../profile/models/profile.model';
import {
  CrampsSeverity,
  CrampDetail,
  FlowCharacteristicType,
  HealthIndicator,
  PhysicalSymptomType
} from '../models/tracking.model';

const CRAMP_SCORES: Record<CrampsSeverity, number> = {
  leve: 1,
  moderada: 2,
  severa: 3
};

/**
 * Servicio Optimizado de Indicadores Clínicos de Salud:
 * - Búsquedas O(1) con estructuras Set para síntomas y características de flujo.
 * - Sin asignaciones redundantes en flujos normales.
 */
export class HealthIndicatorsService {
  public evaluarIntensidadColicos(severity?: CrampsSeverity): CrampDetail | undefined {
    if (!severity) return undefined;
    return {
      severity,
      score: CRAMP_SCORES[severity] || 0
    };
  }

  public generarIndicadoresSalud(params: {
    cramps?: CrampDetail;
    physicalSymptoms: PhysicalSymptomType[];
    flow: FlowCharacteristicType[];
    method?: ContraceptiveMethodConfig;
  }): HealthIndicator[] {
    const indicators: HealthIndicator[] = [];

    // Conversión a Set para búsquedas O(1) en vez de includes() O(N)
    const symptomsSet = new Set(params.physicalSymptoms);
    const flowSet = new Set(params.flow);

    // 1. Dismenorrea severa
    if (params.cramps && params.cramps.severity === 'severa') {
      indicators.push({
        code: 'DISMENORREA_SEVERA',
        level: 'atencion',
        message: 'Intensidad de cólicos clasificada como severa.',
        recommendation:
          'Aplica compresas tibias en el bajo vientre, mantente hidratada y, si el dolor interfiere con tus actividades o no cede con analgésicos habituales, consulta a tu ginecólogo.'
      });
    }

    // 2. Coágulos + Dolor moderado/severo
    if (
      flowSet.has('presencia_de_coagulos') &&
      params.cramps &&
      (params.cramps.severity === 'moderada' || params.cramps.severity === 'severa')
    ) {
      indicators.push({
        code: 'FLUJO_DENSO_DOLOROSO',
        level: 'atencion',
        message: 'Presencia de coágulos acompañada de dolor moderado/severo.',
        recommendation: 'Monitorea el tamaño y la frecuencia de los coágulos. Registra si cambias de toalla o tampón con frecuencia inusual.'
      });
    }

    // 3. Interacciones con método anticonceptivo
    if (params.method) {
      if (
        params.method.category === ContraceptiveCategory.HORMONAL_LONG_ACTING &&
        flowSet.has('manchado')
      ) {
        indicators.push({
          code: 'SPOTTING_HORMONAL_ESPERADO',
          level: 'info',
          message: 'Manchado irregular detectado bajo método hormonal de larga duración.',
          recommendation:
            'El manchado leve (spotting) es un efecto secundario común y benigno durante los primeros meses de uso de implante o DIU hormonal.'
        });
      }

      if (
        params.method.category === ContraceptiveCategory.DAILY &&
        flowSet.has('manchado')
      ) {
        indicators.push({
          code: 'SPOTTING_PASTILLAS',
          level: 'info',
          message: 'Manchado intermenstrual con anticonceptivos orales.',
          recommendation:
            'Asegúrate de tomar la píldora todos los días a la misma hora indicada. Pequeños desfases horarios pueden causar manchado por fluctuación hormonal.'
        });
      }
    }

    // 4. Síntomas premenstruales correlacionados
    if (symptomsSet.has('dolor_de_cabeza') && symptomsSet.has('sensibilidad_de_senos')) {
      indicators.push({
        code: 'SINTOMATOLOGIA_PREMENSTRUAL',
        level: 'info',
        message: 'Patrón concordante con fluctuaciones de progesterona.',
        recommendation: 'Reduce la ingesta excesiva de cafeína y sodio para disminuir la retención de líquidos e hinchazón mamaria.'
      });
    }

    return indicators;
  }
}
