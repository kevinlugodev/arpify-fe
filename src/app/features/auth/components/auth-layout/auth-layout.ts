import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class AuthLayout {}
