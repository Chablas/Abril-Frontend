import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import {
  AreaArbolNodoDto,
  AreaCatDto,
  JefeCandidatoDto,
  SsItemEmpresaDto,
  SsItemTrabajadorDto,
  SubareaCatDto,
  ObraOficinaStaffDto,
} from '../dtos/catalogos.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class CatalogosHabService {
  private readonly base = `${HABILITACION_BASE}/catalogos`;
  private itemsTrabajador$?: Observable<SsItemTrabajadorDto[]>;
  private itemsEmpresa$?: Observable<SsItemEmpresaDto[]>;
  private areas$?: Observable<AreaCatDto[]>;
  private areaArbol$?: Observable<AreaArbolNodoDto[]>;
  private categorias$?: Observable<{ id: number; nombre: string }[]>;
  private puestos$?: Observable<{ id: number; nombre: string; categoriaId: number | null }[]>;
  private obraOficinaStaff$?: Observable<ObraOficinaStaffDto[]>;
  private jefes$?: Observable<JefeCandidatoDto[]>;

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

  /**
   * Árbol de áreas para los desplegables de área del formulario de trabajadores, con la
   * equivalencia legacy y el revisor ya resueltos por nodo. Una sola petición cubre toda la
   * cascada y el campo de revisor (reemplaza a getAreas + getSubareas en ese formulario).
   */
  getAreaArbol(): Observable<AreaArbolNodoDto[]> {
    if (!this.areaArbol$) {
      this.areaArbol$ = this.http
        .get<AreaArbolNodoDto[]>(`${this.base}/areas-arbol`, { headers: buildHabHeaders() })
        .pipe(shareReplay(1), catchError(() => of([])));
    }
    return this.areaArbol$;
  }

  getCategorias(): Observable<{ id: number; nombre: string }[]> {
    if (!this.categorias$) {
      this.categorias$ = this.http
        .get<{ id: number; nombre: string }[]>(`${this.base}/categorias`, {
          headers: buildHabHeaders(),
        })
        .pipe(shareReplay(1), catchError(() => of([])));
    }
    return this.categorias$;
  }

  /**
   * Catálogo único de puestos. Reemplaza a getOcupaciones(): la ocupación dejó de
   * existir como campo aparte y su data se fusionó acá. Cada puesto trae su
   * `categoriaId` para poder filtrar el desplegable sin volver al servidor.
   */
  getPuestos(): Observable<{ id: number; nombre: string; categoriaId: number | null }[]> {
    if (!this.puestos$) {
      this.puestos$ = this.http
        .get<{ id: number; nombre: string; categoriaId: number | null }[]>(`${this.base}/puestos`, {
          headers: buildHabHeaders(),
        })
        .pipe(shareReplay(1), catchError(() => of([])));
    }
    return this.puestos$;
  }

  /**
   * Catálogo Obra / Staff / Oficina Central (workers_obra_oficina_staff). Es lo que define
   * la ubicación del trabajador; antes se deducía del último nodo del árbol de áreas.
   */
  getObraOficinaStaff(): Observable<ObraOficinaStaffDto[]> {
    if (!this.obraOficinaStaff$) {
      this.obraOficinaStaff$ = this.http
        .get<ObraOficinaStaffDto[]>(`${this.base}/obra-oficina-staff`, {
          headers: buildHabHeaders(),
        })
        .pipe(shareReplay(1), catchError(() => of([])));
    }
    return this.obraOficinaStaff$;
  }

  /**
   * Trabajadores que pueden ser jefe (correo corporativo @abril.pe), para el desplegable del
   * checkbox "Jefe personalizado". Se cachea porque el catálogo no cambia mientras el usuario
   * edita y el formulario se abre una vez por trabajador.
   */
  getJefes(): Observable<JefeCandidatoDto[]> {
    if (!this.jefes$) {
      this.jefes$ = this.http
        .get<JefeCandidatoDto[]>(`${this.base}/jefes`, { headers: buildHabHeaders() })
        .pipe(shareReplay(1), catchError(() => of([])));
    }
    return this.jefes$;
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
    this.areaArbol$ = undefined;
    this.obraOficinaStaff$ = undefined;
    this.jefes$ = undefined;
  }
}
