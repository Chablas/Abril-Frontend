import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  private loaderSubject = new BehaviorSubject<boolean>(false);

  loader$ = this.loaderSubject.asObservable();

  show() {
    queueMicrotask(() => this.loaderSubject.next(true));
  }

  hide() {
    queueMicrotask(() => this.loaderSubject.next(false));
  }
}