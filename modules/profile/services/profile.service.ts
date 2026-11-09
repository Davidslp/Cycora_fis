import { EventBus } from '../../../core/events/event-bus';
import { AppEventType } from '../../../core/events/app-events';
import { IProfileRepository } from '../../../core/database/database.interface';
import { AppConfig } from '../../../core/config/app.config';
import { Result, ok, fail, UUID } from '../../../core/types/common.types';
import {
  UserProfile,
  ProfileCreationDTO,
  ContraceptiveMethodConfig
} from '../models/profile.model';
import { ContraceptiveAlgorithmAdapterService } from './algorithm-adapter.service';

export class ProfileService {
  constructor(
    private profileRepository: IProfileRepository<UserProfile>,
    private adapterService: ContraceptiveAlgorithmAdapterService = new ContraceptiveAlgorithmAdapterService(),
    private eventBus: EventBus = EventBus.getInstance()
  ) {}

  /**
   * Configura el perfil inicial de la usuaria validando el método anticonceptivo seleccionado.
   * (Diagrama 1: Configurar perfil inicial y método anticonceptivo).
   */
  public async setupInitialProfile(dto: ProfileCreationDTO): Promise<Result<UserProfile>> {
    const validation = this.adapterService.validateMethodRequirements(dto.method);
    if (!validation.valid) {
      return fail(new Error(validation.error || 'Configuración de método anticonceptivo inválida.'));
    }

    const now = new Date();
    const userId = dto.userId || `user-${Date.now()}`;
    const newProfile: UserProfile = {
      id: `profile-${Date.now()}`,
      userId,
      name: dto.name,
      birthDate: dto.birthDate,
      averageCycleLength: dto.averageCycleLength ?? AppConfig.biologicalDefaults.averageCycleLengthDays,
      averagePeriodDuration: dto.averagePeriodDuration ?? AppConfig.biologicalDefaults.averagePeriodDurationDays,
      activeMethod: dto.method,
      cycleHistoryIds: [],
      createdAt: now,
      updatedAt: now
    };

    const saved = await this.profileRepository.save(newProfile);

    // Notificar a los otros módulos (Calendario, Notificaciones) para adaptar el algoritmo
    await this.eventBus.publish(AppEventType.PROFILE_CREATED, {
      userId: saved.userId,
      method: saved.activeMethod,
      averageCycleLength: saved.averageCycleLength
    });

    return ok(saved);
  }

  /**
   * Actualiza el método anticonceptivo y dispara la adaptación del calendario.
   */
  public async updateContraceptiveMethod(
    userId: UUID,
    newMethod: ContraceptiveMethodConfig
  ): Promise<Result<UserProfile>> {
    const validation = this.adapterService.validateMethodRequirements(newMethod);
    if (!validation.valid) {
      return fail(new Error(validation.error || 'Configuración de método anticonceptivo inválida.'));
    }

    const profile = await this.profileRepository.findById(userId);
    if (!profile) {
      return fail(new Error(`Perfil con usuario ${userId} no encontrado.`));
    }

    const updated = await this.profileRepository.update(profile.id, {
      activeMethod: newMethod,
      updatedAt: new Date()
    });

    // Publicar evento para recalcular calendario y re-programar recordatorios
    await this.eventBus.publish(AppEventType.CONTRACEPTIVE_METHOD_CHANGED, {
      userId,
      previousMethod: profile.activeMethod,
      newMethod: updated.activeMethod
    });

    return ok(updated);
  }

  public async getProfile(userId: UUID): Promise<UserProfile | null> {
    return this.profileRepository.findById(userId);
  }

  public getAdapterService(): ContraceptiveAlgorithmAdapterService {
    return this.adapterService;
  }
}
