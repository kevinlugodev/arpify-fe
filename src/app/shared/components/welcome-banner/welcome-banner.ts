import { Component, input, output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-welcome-banner',
  standalone: true,
  imports: [],
  templateUrl: './welcome-banner.html',
  styleUrl: './welcome-banner.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class WelcomeBanner {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly icon = input<string>('bi-stars');
  readonly actionLabel = input<string>('');
  readonly actionClicked = output<void>();
}
