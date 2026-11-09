import { CalendarDayViewModel } from '../models/calendar.model';

export class LinearTimelineViewComponent {
  /**
   * Genera el resumen visual lineal de días con sus respectivos indicadores gráficos
   * (Puntos de color para periodo, síntomas, alertas e ícono de estado de ánimo).
   */
  public renderTimeline(days: CalendarDayViewModel[]): Array<{
    date: string;
    dayLabel: string;
    periodDot: boolean;
    symptomDot: boolean;
    crampsBadge?: string;
    moodEmoji?: string;
    phaseColor: string;
  }> {
    return days.map((d) => ({
      date: d.date,
      dayLabel: d.indicator.cycleDayNumber ? `Día ${d.indicator.cycleDayNumber}` : '',
      periodDot: d.indicator.hasPeriod,
      symptomDot: d.indicator.hasSymptoms,
      crampsBadge: d.indicator.crampsSeverity,
      moodEmoji: d.indicator.moodEmoji,
      phaseColor: d.indicator.hasPeriod ? '#FF4D6D' : '#A7C7E7'
    }));
  }
}
