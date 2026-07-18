import { Component, ViewEncapsulation } from '@angular/core';
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
  selector: 'app-toaster',
  standalone: true,
  imports: [NgxSonnerToaster],
  templateUrl: './toaster.html',
  styleUrl: './toaster.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class Toaster {}
