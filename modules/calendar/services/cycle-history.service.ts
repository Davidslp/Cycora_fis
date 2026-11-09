import { ICycleRepository } from '../../../core/database/database.interface';
import { AppConfig } from '../../../core/config/app.config';
import { ISODateString, UUID } from '../../../core/types/common.types';
import { MenstrualCycle } from '../models/calendar.model';

export class CycleHistoryService {
  constructor(private cycleRepository: ICycleRepository<MenstrualCycle>) {}

  /**
   * Obtiene todos los ciclos históricos de una usuaria ordenados por fecha
   */
  public async getCycles(userId: UUID): Promise<MenstrualCycle[]> {
    const list = await this.cycleRepository.findAllByUserId(userId);
    return list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  /**
   * Obtiene el ciclo actualmente activo (el más reciente)
   */
  public async getActiveCycle(userId: UUID): Promise<MenstrualCycle | null> {
    const latest = await this.cycleRepository.findLatestByUserId(userId);
    return latest && latest.status === 'activo' ? latest : null;
  }

  /**
   * Recalcula el promedio de duración del periodo y longitud del ciclo
   * basado en los últimos ciclos finalizados (Diagrama 2: Cerrar duración y recalcular promedio).
   */
  public async recalculateAverages(userId: UUID): Promise<{ averageCycleLength: number; averagePeriodDuration: number }> {
    const cycles = await this.getCycles(userId);
    const completedCycles = cycles.filter((c) => c.status === 'completado' || !!c.periodDurationDays);

    if (completedCycles.length === 0) {
      return {
        averageCycleLength: AppConfig.biologicalDefaults.averageCycleLengthDays,
        averagePeriodDuration: AppConfig.biologicalDefaults.averagePeriodDurationDays
      };
    }

    // Promedio de duración del sangrado
    const periodsWithDuration = completedCycles.filter((c) => c.periodDurationDays && c.periodDurationDays > 0);
    const avgPeriod = periodsWithDuration.length > 0
      ? Math.round(
          periodsWithDuration.reduce((acc, c) => acc + (c.periodDurationDays || 0), 0) / periodsWithDuration.length
        )
      : AppConfig.biologicalDefaults.averagePeriodDurationDays;

    // Promedio de longitud del ciclo
    const cyclesWithLength = completedCycles.filter((c) => c.cycleLengthDays && c.cycleLengthDays > 0);
    const avgCycle = cyclesWithLength.length > 0
      ? Math.round(
          cyclesWithLength.reduce((acc, c) => acc + (c.cycleLengthDays || 0), 0) / cyclesWithLength.length
        )
      : AppConfig.biologicalDefaults.averageCycleLengthDays;

    return {
      averageCycleLength: avgCycle,
      averagePeriodDuration: avgPeriod
    };
  }
}
