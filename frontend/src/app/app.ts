import { Component } from '@angular/core';
import { SectorForm } from './features/sector-form/sector-form';

@Component({
  selector: 'app-root',
  imports: [SectorForm],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
