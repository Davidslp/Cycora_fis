import { ISODateString, UUID } from '../types/common.types';

export interface IProfileRepository<T> {
  findById(id: UUID): Promise<T | null>;
  save(profile: T): Promise<T>;
  update(id: UUID, partial: Partial<T>): Promise<T>;
}

export interface ICycleRepository<T> {
  findById(id: UUID): Promise<T | null>;
  findLatestByUserId(userId: UUID): Promise<T | null>;
  findAllByUserId(userId: UUID): Promise<T[]>;
  save(cycle: T): Promise<T>;
  update(id: UUID, partial: Partial<T>): Promise<T>;
}

export interface IDailyLogRepository<T> {
  findById(id: UUID): Promise<T | null>;
  findByUserAndDate(userId: UUID, date: ISODateString): Promise<T | null>;
  findAllByUser(userId: UUID, fromDate?: ISODateString, toDate?: ISODateString): Promise<T[]>;
  save(log: T): Promise<T>;
}

export interface INotificationRepository<T> {
  findById(id: UUID): Promise<T | null>;
  findAllPendingByUserId(userId: UUID): Promise<T[]>;
  findAllByUserId(userId: UUID): Promise<T[]>;
  save(notification: T): Promise<T>;
  updateStatus(id: UUID, status: 'pendiente' | 'emitida' | 'vista' | 'omitida'): Promise<T>;
}
