import { Component, computed, input, ViewEncapsulation } from '@angular/core';

/**
 * Avatar con iniciales o prefijo. El color de fondo se elige de una paleta
 * corporativa rotando según un hash simple del nombre, de modo que avatares
 * adyacentes en una tabla tengan colores distintos.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <span class="app-avatar app-avatar--{{ size() }} app-avatar--color-{{ colorIndex() }}">
      {{ displayText() }}
    </span>
  `,
  styleUrl: './avatar.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly prefix = input<string>();
  readonly size = input<'sm' | 'md'>('md');

  protected readonly displayText = computed(() => {
    const prefix = this.prefix();
    if (prefix) {
      return prefix.toUpperCase().slice(0, 2);
    }

    return this.name()
      .split(/\s+/)
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  protected readonly colorIndex = computed(() => {
    const input = this.name() || 'x';
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 6;
  });
}
