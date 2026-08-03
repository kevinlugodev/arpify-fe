import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, ViewEncapsulation } from '@angular/core';
import dayjs from 'dayjs/esm';
import relativeTime from 'dayjs/esm/plugin/relativeTime';
import 'dayjs/esm/locale/es';
import { StatusTag } from '../status-tag/status-tag';

dayjs.extend(relativeTime);
dayjs.locale('es');

/**
 * Muestra una fecha ISO como tiempo relativo legible (ej. "hace 5 minutos")
 * dentro de un tag de estado. Incluye el tooltip con la fecha completa.
 */
@Component({
  selector: 'app-relative-time',
  standalone: true,
  imports: [StatusTag],
  template: `
    <app-status-tag
      [status]="relative()"
      domain="generic"
      [title]="fullDate()"
    />
  `,
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class RelativeTime {
  readonly date = input.required<string | Date | null | undefined>();

  protected readonly relative = computed<string>(() => {
    const value = this.date();
    if (!value) {
      return '-';
    }
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
      return String(value);
    }
    return parsed.fromNow();
  });

  protected readonly fullDate = computed<string>(() => {
    const value = this.date();
    if (!value) {
      return '';
    }
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
      return '';
    }
    return parsed.format('DD/MM/YYYY hh:mm:ss A');
  });
}
