import { Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-info-tip',
  standalone: true,
  imports: [],
  templateUrl: './info-tip.html',
  styleUrl: './info-tip.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class InfoTip {
  readonly message = input.required<string>();
}
