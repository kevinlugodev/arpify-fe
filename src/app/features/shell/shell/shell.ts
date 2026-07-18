import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import Sidebar from '../sidebar/sidebar';
import Topbar from '../topbar/topbar';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, Topbar, Sidebar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class Shell {}
