import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly icon = input<string>();
  readonly actionLabel = input<string>();
  readonly actionAppearance = input<'accent' | 'neutral' | 'outline' | 'subtle' | 'transparent'>('accent');
  readonly actionClick = output<void>();

  protected onActionClick(): void {
    this.actionClick.emit();
  }
}
