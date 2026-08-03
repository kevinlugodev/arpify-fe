import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs/esm';

export type DateFormat = 'date' | 'datetime';

/**
 * Pipe para formatear fechas ISO a formatos legibles en español.
 *
 * - `'date'` → `dd/mm/yyyy`
 * - `'datetime'` → `dd/mm/yyyy hh:mm:ss a`
 */
@Pipe({
  name: 'formatDate',
  standalone: true,
})
export class FormatDatePipe implements PipeTransform {
  transform(value: unknown, format: DateFormat = 'datetime'): string {
    if (!value) {
      return '-';
    }

    const date = dayjs(String(value));
    if (!date.isValid()) {
      return String(value);
    }

    switch (format) {
      case 'date':
        return date.format('DD/MM/YYYY');
      case 'datetime':
      default:
        return date.format('DD/MM/YYYY hh:mm:ss A');
    }
  }
}
