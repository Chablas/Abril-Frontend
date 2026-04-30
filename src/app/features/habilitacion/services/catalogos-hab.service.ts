import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import {
  AreaCatDto,
  SsItemEmpresaDto,
  SsItemTrabajadorDto,
  SubareaCatDto,
} from '../dtos/catalogos.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class CatalogosHabService {
  private readonly base = `${HABILITACION_BASE}/catalogos`;
  private itemsTrabajador$?: Observable<SsItemTrabajadorDto[]>;
  private itemsEmpresa$?: Observable<SsItemEmpresaDto[]>;
  private areas$?: Observable<AreaCatDto[]>;

  constructor(private http: HttpClient) {}

  getItemsTrabajador(): Observable<SsItemTrabajadorDto[]> {
    if (!this.itemsTrabajador$) {
      this.itemsTrabajador$ = this.http
        .get<SsItemTrabajadorDto[]>(`${this.base}/items-trabajador`, {
          headers: buildHabHeaders(),
        })
        .pipe(shareReplay(1));
    }
    return this.itemsTrabajador$;
  }

  getItemsEmpresa(): Observable<SsItemEmpresaDto[]> {
    if (!this.itemsEmpresa$) {
      this.itemsEmpresa$ = this.http
        .get<SsItemEmpresaDto[]>(`${this.base}/items-empresa`, {
          headers: buildHabHeaders(),
        })
        .pipe(shareReplay(1));
    }
    return this.itemsEmpresa$;
  }

  getAreas(): Observable<AreaCatDto[]> {
    if (!this.areas$) {
      this.areas$ = this.http
        .get<AreaCatDto[]>(`${this.base}/areas`, { headers: buildHabHeaders() })
        .pipe(shareReplay(1));
    }
    return this.areas$;
  }

  getSubareas(area: string): Observable<SubareaCatDto[]> {
    return this.http.get<SubareaCatDto[]>(`${this.base}/subareas`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ area }),
    });
  }

  invalidateCache(): void {
    this.itemsTrabajador$ = undefined;
    this.itemsEmpresa$ = undefined;
    this.areas$ = undefined;
  }
}
