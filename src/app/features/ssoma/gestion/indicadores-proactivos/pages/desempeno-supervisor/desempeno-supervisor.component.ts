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
  metaLeccion: number;
  metaEvalContratista: number;
  metaEvalResidente: number;
  actualRacs: number;
  actualOpt: number;
  actualInspecciones: number;
  actualCharlas: number;
  actualLeccion: number;
  actualEvalContratista: number;
  actualEvalResidente: number;
  pctRacs: number;
  pctOpt: number;
  pctInspecciones: number;
  pctCharlas: number;
  pctLeccion: number;
  pctEvalContratista: number;
  pctEvalResidente: number;
  pctGeneral: number;
  fechaLogro100: string | null;
  esPrimeroEnProyecto: boolean;
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
    return [...this.todos()].sort((a, b) => b.pctGeneral - a.pctGeneral);
  });

  promedioProyecto = computed(() => {
    const s = this.supervisores();
    if (!s.length) return 0;
    return s.reduce((acc, x) => acc + x.pctGeneral, 0) / s.length;
  });

  metaSemanal = computed(() => {
    const hoy = new Date();
    const esMesActual = hoy.getMonth() + 1 === this.mes() && hoy.getFullYear() === this.anio();
    if (!esMesActual) return 100;
    const dia = hoy.getDate();
    if (dia <= 7)  return 25;
    if (dia <= 14) return 50;
    if (dia <= 21) return 75;
    return 100;
  });

  esMejor(s: DesempenoSupervisorDto): boolean {
    const sups = this.supervisores();
    if (!sups.length) return false;
    const max = Math.max(...sups.map(x => x.pctGeneral));
    return s.pctGeneral === max && max >= this.metaSemanal();
  }

  semanaActual = computed(() => {
    const hoy = new Date();
    if (hoy.getMonth() + 1 !== this.mes() || hoy.getFullYear() !== this.anio()) return null;
    const dia = hoy.getDate();
    if (dia <= 7)  return 1;
    if (dia <= 14) return 2;
    if (dia <= 21) return 3;
    return 4;
  });

  metaEsperada = computed(() => {
    const semana = this.semanaActual();
    if (semana !== null) return semana * 25;
    const hoy = new Date();
    const mesSelec  = new Date(this.anio(), this.mes() - 1, 1);
    const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return mesSelec < mesActual ? 100 : 0;
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
    { key: 'Racs',         label: 'RAC',     color: '#0f4c75', icon: 'ti-file-description' },
    { key: 'Opt',          label: 'OPT',     color: '#7c3aed', icon: 'ti-eye' },
    { key: 'Inspecciones', label: 'Insp.',   color: '#0891b2', icon: 'ti-clipboard-check' },
    { key: 'Charlas',      label: 'Charlas', color: '#16a34a', icon: 'ti-presentation' },
  ];

  readonly CHECKS = [
    { key: 'Leccion',         label: 'Lección',     icon: 'ti-bulb' },
    { key: 'EvalContratista', label: 'Contratista', icon: 'ti-building' },
    { key: 'EvalResidente',   label: 'Residente',   icon: 'ti-user-check' },
  ];

  hizo(s: DesempenoSupervisorDto, key: string): boolean {
    return ((s as any)[`actual${key}`] ?? 0) > 0;
  }

  constructor() {
    effect(() => {
      this.mes(); this.anio(); this.proyectoFiltro();
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
    let params = new HttpParams().set('mes', this.mes()).set('anio', this.anio());
    const pid = this.proyectoFiltro();
    if (pid) params = params.set('proyectoId', pid);
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

  superaEnAlguno(s: DesempenoSupervisorDto): boolean {
    return s.pctGeneral >= this.metaSemanal();
  }

  nombreTitleCase(nombre: string): string {
    return nombre.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  metaMarkerLeft(): string { return `${this.metaEsperada()}%`; }

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

  ritmoClass(s: DesempenoSupervisorDto): string {
    const meta = this.metaEsperada();
    if (!meta || s.pctGeneral >= 100) return '';
    if (s.pctGeneral >= meta)         return 'ritmo-ok';
    if (s.pctGeneral >= meta * 0.8)   return 'ritmo-cerca';
    return 'ritmo-atras';
  }

  ritmoLabel(s: DesempenoSupervisorDto): string {
    const meta = this.metaEsperada();
    const sem  = this.semanaActual();
    if (!meta || !sem || s.pctGeneral >= 100) return '';
    if (s.pctGeneral >= meta) return `Al ritmo · sem ${sem}`;
    return `↓ Meta sem ${sem}: ${meta}%`;
  }

  mostrarRitmo(s: DesempenoSupervisorDto): boolean {
    return !!this.semanaActual() && s.pctGeneral < 100;
  }
}
