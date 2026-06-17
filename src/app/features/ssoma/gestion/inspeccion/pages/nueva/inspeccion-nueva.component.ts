import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { InspeccionService } from '../../inspeccion.service';
import {
  InspeccionTipoDto,
  InspeccionChecklistItemDto,
  CrearInspeccionRequest,
  InspeccionRespuestaRequest,
  InspeccionHallazgoRequest,
} from '../../inspeccion.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { TrabajadorHabService } from '../../../../../../features/habilitacion/services/trabajador-hab.service';
import { WorkerHabilitacionListDto } from '../../../../../../features/habilitacion/dtos/trabajador.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import Swal from 'sweetalert2';

interface RespuestaForm {
  itemId: number;
  pregunta: string;
  categoria: string;
  orden: number;
  resultado: 'Cumple' | 'NoCumple' | 'NA' | '';
  observacion: string;
  showObs: boolean;
}

interface ChecklistGrupoForm {
  categoria: string;
  items: RespuestaForm[];
}

interface HallazgoForm {
  uid: number;
  descripcion: string;
  tipo: 'Critico' | 'Mayor' | 'Menor';
  area: string;
  responsableNombre: string;
  responsableCargo: string;
  fechaLimite: string;
  accionCorrectiva: string;
  fotosBase64: string[];
  fotosPreview: string[];
  expandido: boolean;
}

@Component({
  selector: 'app-inspeccion-nueva',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './inspeccion-nueva.component.html',
  styleUrl: './inspeccion-nueva.component.css',
})
export class InspeccionNuevaComponent implements OnInit, AfterViewInit {
  paso = 1;
  readonly totalPasos = 4;
  readonly pasoLabels = ['Cabecera', 'Checklist', 'Hallazgos', 'Cierre'];
  guardando = false;
  loadingCatalogos = false;
  checklistLoading = false;

  // Catálogos
  tipos: InspeccionTipoDto[] = [];
  proyectos: any[] = [];
  workers: WorkerHabilitacionListDto[] = [];

  // Paso 1
  proyectoId = 0;
  tipoId = 0;
  esPlanificada = true;
  fecha = new Date().toISOString().split('T')[0];
  horaInicio = '';
  horaFin = '';
  area = '';
  responsableArea = '';
  responsableAreaId: number | null = null;

  // Paso 2 — checklist
  grupos: ChecklistGrupoForm[] = [];
  respuestas: RespuestaForm[] = [];
  ultimoTipoIdCargado = 0;

  // Paso 3 — hallazgos
  hallazgos: HallazgoForm[] = [];
  hallazgoNextUid = 1;
  mostrarFormHallazgo = false;
  nuevoHallazgo: HallazgoForm = this.emptyHallazgo();

  // Paso 4 — cierre
  inspectorNombre = '';
  inspectorCargo = '';
  inspectorEmpresa = '';
  representanteNombre = '';
  representanteCargo = '';
  descripcionCausas = '';
  conclusiones = '';

  // Canvas inspector
  @ViewChild('canvasInspector') canvasInspector!: ElementRef<HTMLCanvasElement>;
  private ctxInspector?: CanvasRenderingContext2D;
  private drawingInspector = false;
  firmaInspectorBase64 = '';

  // Canvas representante
  @ViewChild('canvasRepresentante') canvasRepresentante!: ElementRef<HTMLCanvasElement>;
  private ctxRepresentante?: CanvasRenderingContext2D;
  private drawingRepresentante = false;
  firmaRepresentanteBase64 = '';

  // Photo input refs
  @ViewChildren('fotoInput') fotoInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private inspeccionService: InspeccionService,
    private projectService: ProjectService,
    private trabajadorHabService: TrabajadorHabService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadingCatalogos = true;
    forkJoin({
      catalogos: this.inspeccionService.getCatalogos(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
      workers: this.trabajadorHabService.getTrabajadores({ pageSize: 9999 }),
    }).subscribe({
      next: ({ catalogos, proyectos, workers }) => {
        this.tipos = catalogos.tipos;
        this.proyectos = proyectos.data;
        this.workers = workers.data;
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void {}

  onResponsableChange(id: number | null): void {
    this.responsableAreaId = id;
    if (!id) {
      this.responsableArea = '';
    } else {
      const w = this.workers.find(x => x.workerId === id);
      if (w) this.responsableArea = w.apellidoNombre;
    }
    this.cdr.markForCheck();
  }

  get puedeAvanzar(): boolean {
    if (this.paso === 1) {
      return (this.proyectoId ?? 0) > 0 && !!this.tipoId && !!this.fecha;
    }
    if (this.paso === 2) {
      return this.respuestas.length > 0 && this.cntRespondidos === this.respuestas.length;
    }
    return true;
  }

  // ── CHECKLIST ──────────────────────────────────────────────────────────────

  cargarChecklist(): void {
    if (!this.tipoId || this.tipoId === this.ultimoTipoIdCargado) return;
    this.checklistLoading = true;
    this.cdr.markForCheck();
    this.inspeccionService.getChecklist(this.tipoId).subscribe({
      next: (items) => {
        this.respuestas = items.map((item) => ({
          itemId: item.id,
          pregunta: item.pregunta,
          categoria: item.categoria ?? 'General',
          orden: item.orden,
          resultado: '',
          observacion: '',
          showObs: false,
        }));
        this.grupos = this.agrupar(this.respuestas);
        this.ultimoTipoIdCargado = this.tipoId;
        this.checklistLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.checklistLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private agrupar(items: RespuestaForm[]): ChecklistGrupoForm[] {
    const map = new Map<string, RespuestaForm[]>();
    for (const item of items) {
      const cat = item.categoria ?? 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries()).map(([categoria, its]) => ({ categoria, items: its }));
  }

  setRespuesta(item: RespuestaForm, val: 'Cumple' | 'NoCumple' | 'NA'): void {
    item.resultado = item.resultado === val ? '' : val;
    item.showObs = item.resultado === 'NoCumple';
    if (!item.showObs) item.observacion = '';
    this.cdr.markForCheck();
  }

  get cntCumple(): number {
    return this.respuestas.filter((r) => r.resultado === 'Cumple').length;
  }

  get cntNoCumple(): number {
    return this.respuestas.filter((r) => r.resultado === 'NoCumple').length;
  }

  get cntNA(): number {
    return this.respuestas.filter((r) => r.resultado === 'NA').length;
  }

  get cntRespondidos(): number {
    return this.respuestas.filter((r) => r.resultado !== '').length;
  }

  get tasaRealtime(): number {
    const d = this.cntCumple + this.cntNoCumple;
    return d > 0 ? Math.round((this.cntCumple / d) * 100) : 0;
  }

  get tasaClass(): string {
    const t = this.tasaRealtime;
    if (t >= 80) return 'score-verde';
    if (t >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  // ── HALLAZGOS ──────────────────────────────────────────────────────────────

  emptyHallazgo(): HallazgoForm {
    return {
      uid: this.hallazgoNextUid++,
      descripcion: '',
      tipo: 'Mayor',
      area: '',
      responsableNombre: '',
      responsableCargo: '',
      fechaLimite: '',
      accionCorrectiva: '',
      fotosBase64: [],
      fotosPreview: [],
      expandido: true,
    };
  }

  agregarHallazgo(): void {
    this.nuevoHallazgo = this.emptyHallazgo();
    this.mostrarFormHallazgo = true;
    this.cdr.markForCheck();
  }

  confirmarHallazgo(): void {
    if (!this.nuevoHallazgo.descripcion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ingresa la descripción del hallazgo', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    if (this.nuevoHallazgo.fotosBase64.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Agrega al menos una foto al hallazgo', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    this.hallazgos.push({ ...this.nuevoHallazgo });
    this.mostrarFormHallazgo = false;
    this.cdr.markForCheck();
  }

  cancelarHallazgo(): void {
    this.mostrarFormHallazgo = false;
    this.cdr.markForCheck();
  }

  quitarHallazgo(uid: number): void {
    this.hallazgos = this.hallazgos.filter((h) => h.uid !== uid);
    this.cdr.markForCheck();
  }

  setTipoHallazgo(h: HallazgoForm, tipo: 'Critico' | 'Mayor' | 'Menor'): void {
    h.tipo = tipo;
    this.cdr.markForCheck();
  }

  onFotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    const h = this.nuevoHallazgo;
    for (let i = 0; i < files.length && h.fotosBase64.length < 5; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        h.fotosPreview.push(dataUrl);
        h.fotosBase64.push(dataUrl.split(',')[1]);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  quitarFoto(h: HallazgoForm, idx: number): void {
    h.fotosBase64.splice(idx, 1);
    h.fotosPreview.splice(idx, 1);
    this.cdr.markForCheck();
  }

  tipoHallazgoClass(tipo: string): string {
    if (tipo === 'Critico') return 'badge-critico';
    if (tipo === 'Mayor') return 'badge-mayor';
    return 'badge-menor';
  }

  // ── CANVAS INSPECTOR ───────────────────────────────────────────────────────

  initCanvasInspector(): void {
    if (!this.canvasInspector) return;
    this.ctxInspector = this.canvasInspector.nativeElement.getContext('2d')!;
    this.ctxInspector.strokeStyle = '#1b3a2d';
    this.ctxInspector.lineWidth = 2;
    this.ctxInspector.lineCap = 'round';
  }

  startDrawInspector(e: MouseEvent): void {
    if (!this.ctxInspector) this.initCanvasInspector();
    this.drawingInspector = true;
    this.ctxInspector!.beginPath();
    this.ctxInspector!.moveTo(e.offsetX, e.offsetY);
  }

  drawInspector(e: MouseEvent): void {
    if (!this.drawingInspector || !this.ctxInspector) return;
    this.ctxInspector.lineTo(e.offsetX, e.offsetY);
    this.ctxInspector.stroke();
  }

  stopDrawInspector(): void {
    this.drawingInspector = false;
    if (this.canvasInspector) {
      this.firmaInspectorBase64 = this.canvasInspector.nativeElement.toDataURL('image/png').split(',')[1];
    }
  }

  startDrawInspectorTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctxInspector) this.initCanvasInspector();
    const rect = this.canvasInspector.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.drawingInspector = true;
    this.ctxInspector!.beginPath();
    this.ctxInspector!.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawInspectorTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.drawingInspector || !this.ctxInspector) return;
    const rect = this.canvasInspector.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.ctxInspector.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    this.ctxInspector.stroke();
  }

  clearCanvasInspector(): void {
    if (this.canvasInspector) {
      const c = this.canvasInspector.nativeElement;
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
      this.firmaInspectorBase64 = '';
      this.cdr.markForCheck();
    }
  }

  // ── CANVAS REPRESENTANTE ───────────────────────────────────────────────────

  initCanvasRepresentante(): void {
    if (!this.canvasRepresentante) return;
    this.ctxRepresentante = this.canvasRepresentante.nativeElement.getContext('2d')!;
    this.ctxRepresentante.strokeStyle = '#1b3a2d';
    this.ctxRepresentante.lineWidth = 2;
    this.ctxRepresentante.lineCap = 'round';
  }

  startDrawRepresentante(e: MouseEvent): void {
    if (!this.ctxRepresentante) this.initCanvasRepresentante();
    this.drawingRepresentante = true;
    this.ctxRepresentante!.beginPath();
    this.ctxRepresentante!.moveTo(e.offsetX, e.offsetY);
  }

  drawRepresentante(e: MouseEvent): void {
    if (!this.drawingRepresentante || !this.ctxRepresentante) return;
    this.ctxRepresentante.lineTo(e.offsetX, e.offsetY);
    this.ctxRepresentante.stroke();
  }

  stopDrawRepresentante(): void {
    this.drawingRepresentante = false;
    if (this.canvasRepresentante) {
      this.firmaRepresentanteBase64 = this.canvasRepresentante.nativeElement.toDataURL('image/png').split(',')[1];
    }
  }

  startDrawRepresentanteTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctxRepresentante) this.initCanvasRepresentante();
    const rect = this.canvasRepresentante.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.drawingRepresentante = true;
    this.ctxRepresentante!.beginPath();
    this.ctxRepresentante!.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawRepresentanteTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.drawingRepresentante || !this.ctxRepresentante) return;
    const rect = this.canvasRepresentante.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.ctxRepresentante.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    this.ctxRepresentante.stroke();
  }

  clearCanvasRepresentante(): void {
    if (this.canvasRepresentante) {
      const c = this.canvasRepresentante.nativeElement;
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
      this.firmaRepresentanteBase64 = '';
      this.cdr.markForCheck();
    }
  }

  // ── WIZARD NAV ─────────────────────────────────────────────────────────────

  siguiente(): void {
    if (!this.validarPaso()) return;
    if (this.paso === 1) {
      this.cargarChecklist();
    }
    this.paso++;
    if (this.paso === 4) {
      setTimeout(() => {
        this.initCanvasInspector();
        this.initCanvasRepresentante();
      }, 100);
    }
    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  anterior(): void {
    this.paso--;
    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  validarPaso(): boolean {
    if (this.paso === 1) {
      if (!this.proyectoId) {
        Swal.fire({ icon: 'warning', title: 'Selecciona un proyecto', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
      if (!this.tipoId) {
        Swal.fire({ icon: 'warning', title: 'Selecciona el tipo de inspección', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
      if (!this.fecha) {
        Swal.fire({ icon: 'warning', title: 'Ingresa la fecha', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
    }
    return true;
  }

  guardar(): void {
    if (this.guardando) return;
    this.guardando = true;
    this.loaderService.show();

    const respuestasReq: InspeccionRespuestaRequest[] = this.respuestas
      .filter((r) => r.resultado !== '')
      .map((r) => ({
        itemId: r.itemId,
        resultado: r.resultado as 'Cumple' | 'NoCumple' | 'NA',
        observacion: r.observacion || undefined,
      }));

    const hallazgosReq: InspeccionHallazgoRequest[] = this.hallazgos.map((h) => ({
      descripcion: h.descripcion,
      tipo: h.tipo,
      area: h.area || undefined,
      responsableNombre: h.responsableNombre || undefined,
      responsableCargo: h.responsableCargo || undefined,
      fechaLimite: h.fechaLimite || undefined,
      accionCorrectiva: h.accionCorrectiva || undefined,
      fotosBase64: h.fotosBase64,
    }));

    const request: CrearInspeccionRequest = {
      proyectoId: Number(this.proyectoId),
      tipoId: Number(this.tipoId),
      esPlanificada: this.esPlanificada,
      fecha: this.fecha,
      horaInicio: this.horaInicio || undefined,
      horaFin: this.horaFin || undefined,
      area: this.area || undefined,
      responsableArea: this.responsableArea || undefined,
      inspectorNombre: this.inspectorNombre || undefined,
      inspectorCargo: this.inspectorCargo || undefined,
      inspectorEmpresa: this.inspectorEmpresa || undefined,
      firmaInspectorBase64: this.firmaInspectorBase64 || undefined,
      representanteNombre: this.representanteNombre || undefined,
      representanteCargo: this.representanteCargo || undefined,
      firmaRepresentanteBase64: this.firmaRepresentanteBase64 || undefined,
      descripcionCausas: this.descripcionCausas || undefined,
      conclusiones: this.conclusiones || undefined,
      respuestas: respuestasReq,
      hallazgos: hallazgosReq,
    };

    this.inspeccionService.crear(request).subscribe({
      next: ({ id }) => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Inspección registrada',
          text: `Inspección #${id} creada correctamente.`,
          confirmButtonText: 'Ver detalle',
          showCancelButton: true,
          cancelButtonText: 'Nueva inspección',
        }).then((res) => {
          if (res.isConfirmed) {
            this.router.navigate(['/ssoma/gestion/inspeccion', id]);
          } else {
            this.router.navigate(['/ssoma/gestion/inspeccion/nueva']);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/ssoma/gestion/inspeccion/lista']);
  }
}
