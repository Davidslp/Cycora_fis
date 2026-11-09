import { CircularCycleViewModel, CircularWheelSlice, PhaseInfo } from '../models/calendar.model';

export class CircularCycleViewComponent {
  /**
   * Renderiza el estado estructurado para alimentar el widget circular (SVG, Canvas o React Native Svg)
   */
  public renderCircularWheel(viewModel: CircularCycleViewModel): {
    header: string;
    centerLabel: string;
    subLabel: string;
    arcSlices: CircularWheelSlice[];
    activePhase: PhaseInfo;
  } {
    return {
      header: `Día ${viewModel.currentCycleDay} de ${viewModel.totalDays}`,
      centerLabel: `${viewModel.countdownDays} días`,
      subLabel: `para el próximo sangrado (${viewModel.nextPeriodDate})`,
      arcSlices: viewModel.slices,
      activePhase: viewModel.currentPhase
    };
  }
}
