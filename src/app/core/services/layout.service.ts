import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly openMobileMenu$ = new Subject<void>();

  openMobileMenu(): void {
    this.openMobileMenu$.next();
  }
}
