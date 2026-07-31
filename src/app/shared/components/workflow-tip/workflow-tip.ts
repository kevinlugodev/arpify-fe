import { Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-workflow-tip',
  standalone: true,
  imports: [],
  templateUrl: './workflow-tip.html',
  styleUrl: './workflow-tip.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class WorkflowTip {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly steps = input.required<string[]>();
  readonly icon = input<string>('bi-signpost-split');
}
