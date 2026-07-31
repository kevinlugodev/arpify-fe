import { Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class StatCard {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string>('bi-graph-up');
  readonly trend = input<string>();
  readonly loading = input<boolean>(false);
}
