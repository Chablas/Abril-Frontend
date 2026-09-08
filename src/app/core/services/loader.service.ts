import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  private loaderSubject = new BehaviorSubject<boolean>(false);

  loader$ = this.loaderSubject.asObservable();

  // Diferido a un microtask (igual que LayoutService.registerPageHeader/unregisterPageHeader):
  // llamar next() de forma síncrona dentro de un ciclo de change detection en curso dispara
  // NG0100 ExpressionChangedAfterItHasBeenCheckedError en el `*ngIf="loader$ | async"` de
  // App — y como show()/hide() se llama desde decenas de páginas en medio de sus propios
  // subscribes, ese NG0100 puede repetirse en cada frame y bloquear el repintado de TODA la
  // app (no solo el loader), aunque el estado interno de los componentes ya esté correcto.
  show() {
    setTimeout(() => this.loaderSubject.next(true));
  }

  hide() {
    setTimeout(() => this.loaderSubject.next(false));
  }
}