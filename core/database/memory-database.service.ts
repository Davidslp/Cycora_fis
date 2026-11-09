import { ISODateString, UUID } from '../types/common.types';
import {
  ICycleRepository,
  IDailyLogRepository,
  INotificationRepository,
  IProfileRepository
} from './database.interface';
import { UserProfile } from '../../modules/profile/models/profile.model';
import { MenstrualCycle } from '../../modules/calendar/models/calendar.model';
import { DailyLogRecord } from '../../modules/tracking/models/tracking.model';
import { NotificationAlert, NotificationStatus } from '../../modules/notifications/models/notification.model';

/**
 * Repositorios en Memoria de Alto Rendimiento:
 * - Índices secundarios por userId y date para búsquedas en O(1)
 * - Evita recorridos O(N) de colecciones completas
 */

export class InMemoryProfileRepository implements IProfileRepository<UserProfile> {
  private profilesByUserId = new Map<UUID, UserProfile>();
  private profilesById = new Map<UUID, UserProfile>();

  async findById(userIdOrId: UUID): Promise<UserProfile | null> {
    return this.profilesByUserId.get(userIdOrId) || this.profilesById.get(userIdOrId) || null;
  }

  async save(profile: UserProfile): Promise<UserProfile> {
    const copy = { ...profile };
    this.profilesByUserId.set(profile.userId, copy);
    this.profilesById.set(profile.id, copy);
    return copy;
  }

  async update(id: UUID, partial: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Perfil con id ${id} no encontrado.`);
    }

    const updated = { ...existing, ...partial, updatedAt: new Date() };
    this.profilesByUserId.set(updated.userId, updated);
    this.profilesById.set(updated.id, updated);
    return updated;
  }
}

export class InMemoryCycleRepository implements ICycleRepository<MenstrualCycle> {
  private cyclesById = new Map<UUID, MenstrualCycle>();
  // Índice secundario por userId: Map<userId, MenstrualCycle[]>
  private cyclesByUserId = new Map<UUID, MenstrualCycle[]>();

  async findById(id: UUID): Promise<MenstrualCycle | null> {
    return this.cyclesById.get(id) || null;
  }

  async findLatestByUserId(userId: UUID): Promise<MenstrualCycle | null> {
    const userCycles = this.cyclesByUserId.get(userId);
    return userCycles && userCycles.length > 0 ? userCycles[userCycles.length - 1] : null;
  }

  async findAllByUserId(userId: UUID): Promise<MenstrualCycle[]> {
    const list = this.cyclesByUserId.get(userId) || [];
    // Retorna ordenado descendente (más reciente primero)
    return [...list].sort((a, b) => (b.startDate > a.startDate ? 1 : -1));
  }

  async save(cycle: MenstrualCycle): Promise<MenstrualCycle> {
    const copy = { ...cycle };
    this.cyclesById.set(copy.id, copy);

    let userCycles = this.cyclesByUserId.get(copy.userId);
    if (!userCycles) {
      userCycles = [];
      this.cyclesByUserId.set(copy.userId, userCycles);
    }
    userCycles.push(copy);
    return copy;
  }

  async update(id: UUID, partial: Partial<MenstrualCycle>): Promise<MenstrualCycle> {
    const existing = this.cyclesById.get(id);
    if (!existing) {
      throw new Error(`Ciclo ${id} no encontrado.`);
    }
    const updated = { ...existing, ...partial, updatedAt: new Date() };
    this.cyclesById.set(id, updated);

    // Actualizar también en el índice secundario
    const userCycles = this.cyclesByUserId.get(existing.userId);
    if (userCycles) {
      const idx = userCycles.findIndex(c => c.id === id);
      if (idx !== -1) userCycles[idx] = updated;
    }
    return updated;
  }
}

export class InMemoryDailyLogRepository implements IDailyLogRepository<DailyLogRecord> {
  // Clave compuesta O(1): "userId:date" -> DailyLogRecord
  private logsByKey = new Map<string, DailyLogRecord>();
  // Índice por userId: Map<userId, Map<date, DailyLogRecord>>
  private userLogs = new Map<UUID, Map<ISODateString, DailyLogRecord>>();

  private makeKey(userId: UUID, date: ISODateString): string {
    return `${userId}:${date}`;
  }

  async findById(id: UUID): Promise<DailyLogRecord | null> {
    for (const log of this.logsByKey.values()) {
      if (log.id === id) return { ...log };
    }
    return null;
  }

  async findByUserAndDate(userId: UUID, date: ISODateString): Promise<DailyLogRecord | null> {
    const log = this.logsByKey.get(this.makeKey(userId, date));
    return log ? { ...log } : null;
  }

  async findAllByUser(userId: UUID, fromDate?: ISODateString, toDate?: ISODateString): Promise<DailyLogRecord[]> {
    const userMap = this.userLogs.get(userId);
    if (!userMap || userMap.size === 0) return [];

    const results: DailyLogRecord[] = [];
    for (const log of userMap.values()) {
      if (fromDate && log.date < fromDate) continue;
      if (toDate && log.date > toDate) continue;
      results.push({ ...log });
    }

    return results.sort((a, b) => (b.date > a.date ? 1 : -1));
  }

  async save(log: DailyLogRecord): Promise<DailyLogRecord> {
    const copy = { ...log };
    const key = this.makeKey(log.userId, log.date);
    this.logsByKey.set(key, copy);

    let userMap = this.userLogs.get(log.userId);
    if (!userMap) {
      userMap = new Map();
      this.userLogs.set(log.userId, userMap);
    }
    userMap.set(log.date, copy);

    return copy;
  }
}

export class InMemoryNotificationRepository implements INotificationRepository<NotificationAlert> {
  private notificationsById = new Map<UUID, NotificationAlert>();
  private notificationsByUserId = new Map<UUID, NotificationAlert[]>();

  async findById(id: UUID): Promise<NotificationAlert | null> {
    return this.notificationsById.get(id) || null;
  }

  async findAllPendingByUserId(userId: UUID): Promise<NotificationAlert[]> {
    const list = this.notificationsByUserId.get(userId) || [];
    return list.filter(n => n.status === 'pendiente' || n.status === 'emitida');
  }

  async findAllByUserId(userId: UUID): Promise<NotificationAlert[]> {
    const list = this.notificationsByUserId.get(userId) || [];
    return [...list].sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());
  }

  async save(notification: NotificationAlert): Promise<NotificationAlert> {
    const copy = { ...notification };
    this.notificationsById.set(copy.id, copy);

    let userList = this.notificationsByUserId.get(copy.userId);
    if (!userList) {
      userList = [];
      this.notificationsByUserId.set(copy.userId, userList);
    }
    userList.push(copy);
    return copy;
  }

  async updateStatus(id: UUID, status: NotificationStatus): Promise<NotificationAlert> {
    const existing = this.notificationsById.get(id);
    if (!existing) {
      throw new Error(`Notificación ${id} no encontrada.`);
    }

    const updated: NotificationAlert = {
      ...existing,
      status,
      respondedAt: status === 'vista' || status === 'omitida' ? new Date() : existing.respondedAt,
      updatedAt: new Date()
    };

    this.notificationsById.set(id, updated);

    const userList = this.notificationsByUserId.get(existing.userId);
    if (userList) {
      const idx = userList.findIndex(n => n.id === id);
      if (idx !== -1) userList[idx] = updated;
    }
    return updated;
  }
}
