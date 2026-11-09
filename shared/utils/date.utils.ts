import { ISODateString } from '../../core/types/common.types';

const MS_PER_DAY = 86400000;

export class DateUtils {
  public static today(): ISODateString {
    return new Date().toISOString().split('T')[0];
  }

  public static addDays(dateStr: ISODateString, days: number): ISODateString {
    const ms = new Date(dateStr + 'T00:00:00').getTime() + (days * MS_PER_DAY);
    return new Date(ms).toISOString().split('T')[0];
  }

  public static diffInDays(fromDate: ISODateString, toDate: ISODateString): number {
    const fromMs = new Date(fromDate + 'T00:00:00').getTime();
    const toMs = new Date(toDate + 'T00:00:00').getTime();
    return Math.round((toMs - fromMs) / MS_PER_DAY);
  }

  public static isPastDate(dateStr: ISODateString): boolean {
    return dateStr < DateUtils.today();
  }
}
