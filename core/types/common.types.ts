/**
 * Tipos base y utilitarios comunes en la plataforma Cycora.
 */

export type UUID = string;
export type ISODateString = string; // Formato YYYY-MM-DD
export type ISOTimeString = string; // Formato HH:mm

export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}
