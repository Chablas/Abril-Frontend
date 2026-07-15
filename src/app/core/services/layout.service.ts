import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly openMobileMenu$ = new Subject<void>();

  openMobileMenu(): void {
    this.openMobileMenu$.next();
  }

  /**
   * Cuántos app-abril-page-header hay montados en la vista actual. El layout usa
   * esto para decidir si muestra su botón hamburguesa flotante de fallback: el
   * hamburguesa "bueno" vive dentro del header, así que el flotante solo debe
   * aparecer en páginas que NO usan header (y por tanto no tendrían forma de
   * abrir el menú en móvil). Se lleva un contador (no un booleano) porque al
   * navegar entre rutas el header nuevo puede montarse antes de que el viejo se
   * destruya, y un booleano se quedaría en false por un frame.
   */
  private pageHeaderCount = 0;
  readonly hasPageHeader$ = new BehaviorSubject<boolean>(false);

  registerPageHeader(): void {
    this.pageHeaderCount++;
    this.hasPageHeader$.next(this.pageHeaderCount > 0);
  }

  unregisterPageHeader(): void {
    this.pageHeaderCount = Math.max(0, this.pageHeaderCount - 1);
    this.hasPageHeader$.next(this.pageHeaderCount > 0);
  }
}
