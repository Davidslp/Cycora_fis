import {
  ContraceptiveCategory,
  ContraceptiveMethodConfig,
  ContraceptiveMethodType
} from '../models/profile.model';

export interface MethodSelectorViewState {
  selectedCategory: ContraceptiveCategory;
  selectedType: ContraceptiveMethodType;
  showDateField: boolean;      // Requisito diagrama 1: "Mostrar Campo fecha (DIU/Implante)"
  showTimeField: boolean;      // Requisito diagrama 1: "Mostrar campo Hora (Pastillas)"
  applicationDate?: string;
  dailyIntakeTime?: string;
  isReminderEnabled: boolean;
  validationError?: string;
}

/**
 * Componente Lógico UI del Selector de Métodos Anticonceptivos.
 * Administra el estado visual reactivo y el renderizado condicional de campos dinámicos
 * según la especificación del Diagrama 1 de Cycora.
 */
export class MethodSelectorComponent {
  private state: MethodSelectorViewState;

  constructor(initialCategory = ContraceptiveCategory.BARRIER_NONE) {
    this.state = {
      selectedCategory: initialCategory,
      selectedType: ContraceptiveMethodType.CONDOM,
      showDateField: false,
      showTimeField: false,
      isReminderEnabled: true
    };
    this.updateFieldVisibility();
  }

  public selectCategory(category: ContraceptiveCategory): MethodSelectorViewState {
    this.state.selectedCategory = category;

    // Asignar tipo por defecto según categoría
    switch (category) {
      case ContraceptiveCategory.HORMONAL_LONG_ACTING:
        this.state.selectedType = ContraceptiveMethodType.SUBDERMIC_IMPLANT;
        break;
      case ContraceptiveCategory.DAILY:
        this.state.selectedType = ContraceptiveMethodType.PILLS;
        break;
      case ContraceptiveCategory.BARRIER_NONE:
      default:
        this.state.selectedType = ContraceptiveMethodType.CONDOM;
        break;
    }

    this.updateFieldVisibility();
    return this.getState();
  }

  public selectType(type: ContraceptiveMethodType): MethodSelectorViewState {
    this.state.selectedType = type;
    this.updateFieldVisibility();
    return this.getState();
  }

  public setDate(date: string): void {
    this.state.applicationDate = date;
  }

  public setTime(time: string): void {
    this.state.dailyIntakeTime = time;
  }

  public toggleReminder(enabled: boolean): void {
    this.state.isReminderEnabled = enabled;
  }

  private updateFieldVisibility(): void {
    // Si es hormonal de larga duración requiere fecha de inserción
    this.state.showDateField = this.state.selectedCategory === ContraceptiveCategory.HORMONAL_LONG_ACTING;
    // Si es diario (pastillas) requiere hora de toma
    this.state.showTimeField = this.state.selectedCategory === ContraceptiveCategory.DAILY;
  }

  public buildConfiguration(): ContraceptiveMethodConfig {
    return {
      type: this.state.selectedType,
      category: this.state.selectedCategory,
      name: this.getMethodDisplayName(this.state.selectedType),
      applicationDate: this.state.showDateField ? this.state.applicationDate : undefined,
      dailyIntakeTime: this.state.showTimeField ? this.state.dailyIntakeTime : undefined,
      reminderActive: this.state.isReminderEnabled
    };
  }

  private getMethodDisplayName(type: ContraceptiveMethodType): string {
    const names: Record<ContraceptiveMethodType, string> = {
      [ContraceptiveMethodType.SUBDERMIC_IMPLANT]: 'Implante Subdérmico',
      [ContraceptiveMethodType.HORMONAL_IUD]: 'DIU Hormonal (Mirena/Kyleena)',
      [ContraceptiveMethodType.INJECTION]: 'Inyección Anticonceptiva',
      [ContraceptiveMethodType.PATCH]: 'Parches Transdérmicos',
      [ContraceptiveMethodType.VAGINAL_RING]: 'Anillo Vaginal',
      [ContraceptiveMethodType.PILLS]: 'Pastillas Anticonceptivas Diarias',
      [ContraceptiveMethodType.CONDOM]: 'Preservativo / Barrera',
      [ContraceptiveMethodType.COPPER_IUD]: 'DIU de Cobre (No hormonal)',
      [ContraceptiveMethodType.NATURAL_PLANNING]: 'Ninguno / Búsqueda de embarazo'
    };
    return names[type] || type;
  }

  public getState(): Readonly<MethodSelectorViewState> {
    return { ...this.state };
  }
}
