import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { environment } from '../../../../../../../environments/environment';

export interface DesempenoSupervisorDto {
  supervisorId: number;
  supervisorNombre: string;
  proyectoId: number;
  proyectoNombre: string;
  mes: number;
  anio: number;
  metaRacs: number;
  metaOpt: number;
  metaInspecciones: number;
  metaCharlas: number;
  actualRacs: number;
  actualOpt: number;
  actualInspecciones: number;
  actualCharlas: number;
  pctRacs: number;
  pctOpt: number;
  pctInspecciones: number;
  pctCharlas: number;
  pctGeneral: number;
}

interface ProyectoSimple { id: number; nombre: string; }

@Component({
  selector: 'app-desempeno-supervisor',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './desempeno-supervisor.component.html',
  styleUrls: ['./desempeno-supervisor.component.css'],
})
export class DesempenoSupervisorComponent implements OnInit {
  private http     = inject(HttpClient);
  private loader   = inject(LoaderService);
  private errorSvc = inject(ErrorService);

  private base = `${environment.apiUrl}api/v1/ssoma-desempeno-supervisor`;

  mes    = signal<number>(new Date().getMonth() + 1);
  anio   = signal<number>(new Date().getFullYear());
  proyectoFiltro = signal<number | null>(null);

  todos     = signal<DesempenoSupervisorDto[]>([]);
  proyectos = signal<ProyectoSimple[]>([]);

  supervisores = computed(() => {
    const pid = this.proyectoFiltro();
    const all = this.todos();
    const filtered = pid ? all.filter(s => s.proyectoId === pid) : all;
    return [...filtered].sort((a, b) => b.pctGeneral - a.pctGeneral);
  });

  promedioProyecto = computed(() => {
    const s = this.supervisores();
    if (!s.length) return 0;
    return s.reduce((acc, x) => acc + x.pctGeneral, 0) / s.length;
  });

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  anios = [2024, 2025, 2026, 2027];

  readonly INDICADORES = [
    { key: 'Racs',         label: 'RAC',         color: '#0f4c75', icon: 'ti-file-description' },
    { key: 'Opt',          label: 'OPT',          color: '#7c3aed', icon: 'ti-eye' },
    { key: 'Inspecciones', label: 'Insp.',         color: '#0891b2', icon: 'ti-clipboard-check' },
    { key: 'Charlas',      label: 'Charlas',      color: '#16a34a', icon: 'ti-presentation' },
  ];

  constructor() {
    // Auto-reload al cambiar mes/año
    effect(() => {
      this.mes(); this.anio();
      this.cargar();
    });
  }

  ngOnInit(): void {
    this.http.get<ProyectoSimple[]>(`${environment.apiUrl}api/v1/shared-filters/proyectos`)
      .subscribe({ next: data => this.proyectos.set(data) });
  }

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  cargar(): void {
    this.loader.show();
    const params = new HttpParams().set('mes', this.mes()).set('anio', this.anio());
    this.http.get<DesempenoSupervisorDto[]>(this.base, { headers: this.authHeaders(), params }).subscribe({
      next: data => { this.todos.set(data); this.loader.hide(); },
      error: err  => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  pct(s: DesempenoSupervisorDto, key: string): number {
    return (s as any)[`pct${key}`] ?? 0;
  }

  actual(s: DesempenoSupervisorDto, key: string): number {
    return (s as any)[`actual${key}`] ?? 0;
  }

  meta(s: DesempenoSupervisorDto, key: string): number {
    return (s as any)[`meta${key}`] ?? 0;
  }

  barW(pct: number): string { return `${Math.min(100, pct)}%`; }

  /** Al menos un indicador alcanzó 100% */
  superaEnAlguno(s: DesempenoSupervisorDto): boolean {
    return this.INDICADORES.some(ind => this.pct(s, ind.key) >= 100);
  }

  colorClass(pct: number): string {
    if (pct >= 100) return 'c-verde';
    if (pct >= 75)  return 'c-amarillo';
    if (pct >= 50)  return 'c-naranja';
    return 'c-rojo';
  }

  promedioClass(p: number): string {
    if (p >= 90) return 'c-verde';
    if (p >= 70) return 'c-amarillo';
    if (p >= 50) return 'c-naranja';
    return 'c-rojo';
  }
}
