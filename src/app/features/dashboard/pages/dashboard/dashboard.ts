import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import StatCard from '../../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeader, StatCard, InfoTip],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class Dashboard {}
