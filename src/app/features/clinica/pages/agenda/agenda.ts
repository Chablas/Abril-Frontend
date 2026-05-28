import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ClinicaProgramacionService } from '../../services/clinica-programacion.service';
import { ProgramacionClinicaDto, ClinicaAccionDto } from '../../dtos/clinica.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { CompletarEmo } from './components/completar-emo/completar-emo';
import { environment } from '../../../../../environments/environment';

type FiltroEstado = '' | 'Programado' | 'Aceptado por Clínica' | 'En Atención' | 'Completado' | 'Rechazado';

@Component({
  selector: 'app-clinica-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, CompletarEmo],
  templateUrl: './agenda.html',
  styleUrls: ['./agenda.css'],
})
export class Agenda implements OnInit {
  items: ProgramacionClinicaDto[] = [];
  loading = false;
  accionando: number | null = null;

  selectedDate = new Date().toISOString().split('T')[0];
  filtroEstado: FiltroEstado = '';
  busqueda = '';

  modalAceptar: {
    open: boolean;
    item: ProgramacionClinicaDto | null;
    nuevaFecha: string;
    horaAceptar: string;
    horaError: string;
  } = {
    open: false,
    item: null,
    nuevaFecha: '',
    horaAceptar: '',
    horaError: '',
  };

  completandoItem: ProgramacionClinicaDto | null = null;

  activeTab: 'agenda' | 'interconsultas' = 'agenda';
  interconsultas: any[] = [];
  interconsultasLoading = false;
  interconsultasFiltroEstado = 'Pendiente';
  interconsultasBusqueda = '';

  icDetalle: any = null;
  icPaso: 1 | 2 = 1;
  icLevantamiento = {
    fechaAtencion: '',
    diagnostico: '',
    resultado: '',
    archivoFile: null as File | null,
    archivoError: '',
    fechaError: '',
    cargando: false,
  };

  modalInterconsulta = {
    visible: false,
    progId: 0,
    workerId: 0,
    emoId: null as number | null,
    workerNombre: '',
    workerDni: '',
    especialidad: '',
    observacion: '',
    archivoFile: null as File | null,
    archivoError: '',
    especialidadError: '',
    cargando: false,
  };

  readonly estadosFiltro: { key: FiltroEstado; label: string }[] = [
    { key: '', label: 'Todos' },
    { key: 'Programado', label: 'Programado' },
    { key: 'Aceptado por Clínica', label: 'Aceptado' },
    { key: 'En Atención', label: 'En Atención' },
    { key: 'Completado', label: 'Completado' },
    { key: 'Rechazado', label: 'Rechazado' },
  ];

  constructor(
    private svc: ClinicaProgramacionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAgenda(this.selectedDate);
    this.cargarInterconsultas();
  }

  loadAgenda(fecha: string): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getProgramacionesFiltradas({ desde: fecha, hasta: fecha }).subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onDateChange(): void {
    this.loadAgenda(this.selectedDate);
  }

  // ── Counts ───────────────────────────────────────────────
  get totalHoy(): number { return this.items.length; }
  get countProgramados(): number { return this.items.filter(i => i.estado === 'Programado').length; }
  get countAceptados(): number { return this.items.filter(i => i.estado === 'Aceptado por Clínica').length; }
  get countEnAtencion(): number { return this.items.filter(i => i.estado === 'En Atención').length; }
  get countCompletados(): number { return this.items.filter(i => i.estado === 'Completado').length; }
  get countRechazados(): number {
    return this.items.filter(i =>
      ['Rechazado por Clínica', 'Cancelado', 'No se presentó'].includes(i.estado),
    ).length;
  }

  countForFiltro(key: FiltroEstado): number {
    switch (key) {
      case '': return this.totalHoy;
      case 'Programado': return this.countProgramados;
      case 'Aceptado por Clínica': return this.countAceptados;
      case 'En Atención': return this.countEnAtencion;
      case 'Completado': return this.countCompletados;
      case 'Rechazado': return this.countRechazados;
    }
  }

  // ── Filter ───────────────────────────────────────────────
  get programacionesFiltradas(): ProgramacionClinicaDto[] {
    let base = this.items;
    if (this.filtroEstado === 'Rechazado') {
      base = base.filter(i =>
        ['Rechazado por Clínica', 'Cancelado', 'No se presentó'].includes(i.estado),
      );
    } else if (this.filtroEstado) {
      base = base.filter(i => i.estado === this.filtroEstado);
    }
    if (this.busqueda.trim()) {
      const q = this.busqueda.trim().toLowerCase();
      base = base.filter(i =>
        i.workerNombre.toLowerCase().includes(q) || i.workerDni.includes(q),
      );
    }
    return base;
  }

  // ── Modal Aceptar ────────────────────────────────────────
  abrirAceptar(item: ProgramacionClinicaDto): void {
    this.modalAceptar = {
      open: true,
      item,
      nuevaFecha: item.fechaProgramada ?? '',
      horaAceptar: item.horaProgramada ?? '',
      horaError: '',
    };
  }

  cancelarAceptar(): void {
    this.modalAceptar = { open: false, item: null, nuevaFecha: '', horaAceptar: '', horaError: '' };
  }

  confirmarAceptar(): void {
    const item = this.modalAceptar.item;
    if (!item) return;
    if (!this.modalAceptar.horaAceptar || this.modalAceptar.horaAceptar.trim() === '' || this.modalAceptar.horaAceptar === '--:--') {
      this.modalAceptar.horaError = 'La hora es obligatoria';
      return;
    }
    this.modalAceptar.horaError = '';
    const body: ClinicaAccionDto = {
      id: item.id,
      accion: 'Aceptar',
      fechaNueva: this.modalAceptar.nuevaFecha,
      horaNueva: this.modalAceptar.horaAceptar,
    };
    this.cancelarAceptar();
    this.ejecutarAccion(item.id, body);
  }

  // ── Rechazar (SweetAlert2) ───────────────────────────────
  rechazar(item: ProgramacionClinicaDto): void {
    Swal.fire({
      title: 'Rechazar programación',
      html: `<span style="font-size:0.87rem;color:#94a3b8">${item.workerNombre}</span>`,
      input: 'text',
      inputPlaceholder: 'Motivo de rechazo *',
      inputAttributes: { autocomplete: 'off' },
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      preConfirm: (motivo: string) => {
        if (!motivo?.trim()) {
          Swal.showValidationMessage('Ingresa el motivo de rechazo');
          return false;
        }
        return motivo.trim();
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.ejecutarAccion(item.id, {
          id: item.id,
          accion: 'Rechazar',
          motivoRechazo: result.value,
        });
      }
    });
  }

  // ── CheckIn ──────────────────────────────────────────────
  checkIn(item: ProgramacionClinicaDto): void {
    const hora = new Date().toTimeString().slice(0, 5);
    this.ejecutarAccion(item.id, { id: item.id, accion: 'CheckIn', checkInHora: hora });
  }

  // ── Completar EMO ────────────────────────────────────────
  abrirCompletar(item: ProgramacionClinicaDto): void {
    this.completandoItem = item;
  }

  onCompletado(): void {
    this.completandoItem = null;
    this.loadAgenda(this.selectedDate);
  }

  // ── Shared ───────────────────────────────────────────────
  private ejecutarAccion(id: number, body: ClinicaAccionDto): void {
    this.accionando = id;
    this.svc.accionClinica(id, body).subscribe({
      next: () => {
        this.accionando = null;
        this.loadAgenda(this.selectedDate);
      },
      error: (err) => {
        this.accionando = null;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Tabs ─────────────────────────────────────────────────
  cambiarTab(tab: 'agenda' | 'interconsultas'): void {
    this.activeTab = tab;
    if (tab === 'interconsultas' && this.interconsultas.length === 0) {
      this.cargarInterconsultas();
    }
    this.cdr.detectChanges();
  }

  cargarInterconsultas(): void {
    this.interconsultasLoading = true;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );
    const params = new HttpParams()
      .set('estado', this.interconsultasFiltroEstado)
      .set('pageSize', '100');

    this.http.get<any[]>(
      `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/interconsultas`,
      { headers, params }
    ).subscribe({
      next: (res: any) => {
        this.interconsultas = Array.isArray(res) ? res : (res.data ?? res.items ?? []);
        this.interconsultasLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.interconsultas = [];
        this.interconsultasLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  calcularDiasPendientes(fechaDerivacion: string): number {
    const hoy = new Date();
    const fecha = new Date(fechaDerivacion);
    return Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
  }

  // ── Panel lateral interconsultas ─────────────────────────
  seleccionarInterconsulta(item: any): void {
    this.icDetalle = item;
    this.icPaso = item.estado === 'Completado' ? 2 : 1;
    this.icLevantamiento = {
      fechaAtencion: '',
      diagnostico: '',
      resultado: '',
      archivoFile: null,
      archivoError: '',
      fechaError: '',
      cargando: false,
    };
    this.cdr.detectChanges();
  }

  onArchivoLevantamiento(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.icLevantamiento.archivoFile = input.files?.[0] ?? null;
    this.icLevantamiento.archivoError = '';
  }

  async confirmarLevantamiento(): Promise<void> {
    const lev = this.icLevantamiento;
    lev.fechaError = '';
    lev.archivoError = '';

    if (!lev.fechaAtencion) { lev.fechaError = 'La fecha de atención es obligatoria'; return; }
    if (!lev.archivoFile)   { lev.archivoError = 'Debes adjuntar el informe de interconsulta'; return; }

    lev.cargando = true;
    const base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional`;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});

    try {
      const fd = new FormData();
      fd.append('file', lev.archivoFile);
      const uploadResp: any = await lastValueFrom(
        this.http.post(`${base}/interconsultas/${this.icDetalle.id}/documentos`, fd, { headers }),
      );
      const urlInforme = uploadResp?.url ?? uploadResp?.path ?? '';

      await lastValueFrom(
        this.http.patch(`${base}/interconsultas/${this.icDetalle.id}/resultado`, {
          estado: 'Atendida',
          fechaAtencion: lev.fechaAtencion,
          diagnostico: lev.diagnostico || undefined,
          resultado: lev.resultado || undefined,
          urlInforme: urlInforme || undefined,
        }, { headers }),
      );

      this.icPaso = 2;
      this.cdr.detectChanges();
      this.cargarInterconsultas();
    } catch (err: any) {
      const mensaje = err?.error?.message ?? err?.message ?? 'Error al levantar la interconsulta';
      Swal.fire('Error', mensaje, 'error');
    } finally {
      lev.cargando = false;
    }
  }

  icEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'ic-chip-orange',
      'Atendida':  'ic-chip-green',
      'Cancelada': 'ic-chip-gray',
    };
    return map[estado] ?? 'ic-chip-gray';
  }

  icDiasClass(dias: number): string {
    if (dias > 15) return 'ic-chip-red';
    if (dias >= 8)  return 'ic-chip-orange';
    return 'ic-chip-green';
  }

  // ── Interconsulta (nueva desde card) ─────────────────────
  abrirInterconsulta(item: any): void {
    this.modalInterconsulta = {
      visible: true,
      progId: item.id,
      workerId: item.workerId,
      emoId: item.emoId ?? null,
      workerNombre: item.workerNombre,
      workerDni: item.workerDni,
      especialidad: '',
      observacion: '',
      archivoFile: null,
      archivoError: '',
      especialidadError: '',
      cargando: false,
    };
  }

  cancelarInterconsulta(): void {
    this.modalInterconsulta.visible = false;
  }

  onArchivoInterconsulta(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.modalInterconsulta.archivoFile = input.files?.[0] ?? null;
    this.modalInterconsulta.archivoError = '';
  }

  async confirmarInterconsulta(): Promise<void> {
    const m = this.modalInterconsulta;
    m.especialidadError = '';
    m.archivoError = '';

    if (!m.especialidad.trim()) {
      m.especialidadError = 'La especialidad es obligatoria';
      return;
    }
    if (!m.archivoFile) {
      m.archivoError = 'Debes adjuntar la evidencia';
      return;
    }

    m.cargando = true;
    const base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional`;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});

    try {
      const body = {
        emoId: m.emoId,
        workerId: m.workerId,
        especialidad: m.especialidad.trim(),
        observacion: m.observacion.trim() || undefined,
        fechaDerivacion: new Date().toISOString().split('T')[0],
      };
      const resp: any = await lastValueFrom(
        this.http.post(`${base}/interconsultas`, body, { headers }),
      );
      const interconsultaId = resp?.id ?? resp?.data?.id;

      if (interconsultaId && m.archivoFile) {
        const fd = new FormData();
        fd.append('file', m.archivoFile);
        fd.append('tipo', 'interconsulta');
        await lastValueFrom(
          this.http.post(`${base}/interconsultas/${interconsultaId}/documentos`, fd, { headers }),
        );
      }

      this.cancelarInterconsulta();
      this.loadAgenda(this.selectedDate);
      Swal.fire('Interconsulta registrada', '', 'success');
    } catch (err: any) {
      const mensaje = err?.error?.message ?? err?.message ?? 'Error al registrar la interconsulta';
      Swal.fire('Error', mensaje, 'error');
    } finally {
      m.cargando = false;
    }
  }

  // ── CSS helpers ──────────────────────────────────────────
  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Programado': 'chip-blue',
      'Aceptado por Clínica': 'chip-violet',
      'En Atención': 'chip-orange',
      'Completado': 'chip-green',
      'Rechazado por Clínica': 'chip-slate',
      'Cancelado': 'chip-slate',
      'No se presentó': 'chip-slate',
    };
    return map[estado] ?? 'chip-slate';
  }

  cardBorderClass(estado: string): string {
    const map: Record<string, string> = {
      'Programado': 'card-bl-blue',
      'Aceptado por Clínica': 'card-bl-violet',
      'En Atención': 'card-bl-orange',
      'Completado': 'card-bl-green',
      'Rechazado por Clínica': 'card-bl-slate',
      'Cancelado': 'card-bl-slate',
      'No se presentó': 'card-bl-slate',
    };
    return map[estado] ?? 'card-bl-slate';
  }

  filtroClass(key: FiltroEstado): string {
    const map: Record<string, string> = {
      'Programado': 'pill-blue',
      'Aceptado por Clínica': 'pill-violet',
      'En Atención': 'pill-orange',
      'Completado': 'pill-green',
      'Rechazado': 'pill-slate',
    };
    return map[key] ?? '';
  }

  esTerminal(estado: string): boolean {
    return ['Completado', 'Rechazado por Clínica', 'Cancelado', 'No se presentó'].includes(estado);
  }

  fechaClass(fecha: string): string {
    const hoy = new Date().toISOString().split('T')[0];
    if (fecha === hoy) return 'fecha-hoy';
    if (fecha < hoy) return 'fecha-pasada';
    return 'fecha-futura';
  }
}
