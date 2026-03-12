import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderService } from './core/services/loader.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  loader$;
  protected readonly title = signal('Abril');
  constructor(private loaderService: LoaderService) {
    this.loader$ = this.loaderService.loader$;
  }
}
