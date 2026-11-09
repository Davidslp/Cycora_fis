import {
  CreateDailyLogDTO,
  CrampsSeverity,
  FlowCharacteristicType,
  MoodType,
  PhysicalSymptomType
} from '../models/tracking.model';

export interface DailyLogFormViewState {
  selectedDate: string;
  selectedMood: MoodType;
  selectedPhysicalSymptoms: Set<PhysicalSymptomType>;
  crampsSeverity?: CrampsSeverity;
  selectedFlow: Set<FlowCharacteristicType>;
  notes: string;
  isSubmitting: boolean;
  validationErrors: string[];
}

/**
 * Componente Lógico UI del Formulario de Registro Diario (Síntomas y Ánimo).
 * Diseñado conforme a la Arquitectura Basada en Componentes y el Diagrama 3 de Casos de Uso.
 */
export class DailyLogFormComponent {
  private state: DailyLogFormViewState;

  constructor(initialDate: string = new Date().toISOString().split('T')[0]) {
    this.state = {
      selectedDate: initialDate,
      selectedMood: 'neutral',
      selectedPhysicalSymptoms: new Set(),
      selectedFlow: new Set(),
      notes: '',
      isSubmitting: false,
      validationErrors: []
    };
  }

  public setDate(date: string): void {
    this.state.selectedDate = date;
  }

  public selectMood(mood: MoodType): void {
    this.state.selectedMood = mood;
  }

  public togglePhysicalSymptom(symptom: PhysicalSymptomType): void {
    if (this.state.selectedPhysicalSymptoms.has(symptom)) {
      this.state.selectedPhysicalSymptoms.delete(symptom);
    } else {
      this.state.selectedPhysicalSymptoms.add(symptom);
    }
  }

  public setCrampsSeverity(severity?: CrampsSeverity): void {
    this.state.crampsSeverity = severity;
  }

  public toggleFlowCharacteristic(flow: FlowCharacteristicType): void {
    if (this.state.selectedFlow.has(flow)) {
      this.state.selectedFlow.delete(flow);
    } else {
      this.state.selectedFlow.add(flow);
    }
  }

  public setNotes(notes: string): void {
    this.state.notes = notes;
  }

  public validate(): boolean {
    this.state.validationErrors = [];
    if (!this.state.selectedDate) {
      this.state.validationErrors.push('La fecha de registro es obligatoria.');
    }
    if (!this.state.selectedMood) {
      this.state.validationErrors.push('Debe seleccionar un estado de ánimo.');
    }
    return this.state.validationErrors.length === 0;
  }

  public toDTO(userId: string): CreateDailyLogDTO {
    return {
      userId,
      date: this.state.selectedDate,
      mood: this.state.selectedMood,
      crampsSeverity: this.state.crampsSeverity,
      physicalSymptoms: Array.from(this.state.selectedPhysicalSymptoms),
      flowCharacteristics: Array.from(this.state.selectedFlow),
      notes: this.state.notes
    };
  }

  public getState(): Readonly<DailyLogFormViewState> {
    return { ...this.state };
  }
}
