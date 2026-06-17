import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HabUiService {
  private _section = new BehaviorSubject<'resumen' | 'usuarios'>('resumen');
  section$ = this._section.asObservable();

  setSection(s: 'resumen' | 'usuarios'): void {
    this._section.next(s);
  }

  get current(): 'resumen' | 'usuarios' {
    return this._section.value;
  }
}
