import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PetsService } from '../../pets.service';
import {
  PetDetalleDto,
  PetPasoDto,
  ImportPasoPreviewDto,
  ImportParrafoDto,
  PetItemSeleccionadoDto,
  PetAnexoDto,
  CatalogoItemDto,
  PetFirmaDto,
  PetRolFirma,
  AgregarItemPersonalizadoRequest,
  PetSeccionTexto,
  PetVersionDto,
} from '../../pets.dtos';
import { forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { environment } from '../../../../../../../environments/environment';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { WorkerSearchInput } from '../../../../salud-ocupacional/shared/worker-search-input/worker-search-input';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import { AccidenteIncidenteService } from '../../../accidentes-incidentes/accidente-incidente.service';
import { FlashProyectoDto, ContratistaCatalogoDto } from '../../../accidentes-incidentes/accidente-incidente.dtos';

interface ParrafoSeleccionable extends ImportParrafoDto {
  seleccionado: boolean;
  profundidad: number;
}

interface PasoPreviewNodo extends ImportPasoPreviewDto {
  profundidad: number;
  // Solo se usa cuando el bloque va a un destino de catálogo (Marco Legal/EPP/
  // Recursos): permite elegir el sub-tipo POR FILA en vez de uno solo para todo el
  // bloque — una tabla como Recursos trae Equipos/Herramientas/Materiales mezclados
  // en un mismo encabezado "no reconocido", así que forzar un único tipo para todo el
  // bloque mandaba, por ejemplo, los tornillos y los andamios al mismo sitio.
  tipoOverride?: string | null;
}

// Un encabezado del Word que el importador no supo a qué pestaña pertenece (ver
// SeccionesNoReconocidas en el backend) — el usuario elige el destino a mano en vez
// de que el sistema adivine en silencio dentro de un documento de seguridad.
interface SeccionNoReconocida {
  titulo: string;
  parrafos: PasoPreviewNodo[];
  destino: string; // key de una pestaña (tabs), o '' si aún no se eligió
  destinoTipo: string | null; // sub-tipo cuando destino es una pestaña de catálogo
}

// Calcula cuántos niveles de "padre" tiene cada elemento (para sangrarlo en la
// vista previa) siguiendo parentIndice dentro de la MISMA lista — no asume que
// venga ordenada ni que los padres estén antes que los hijos.
function calcularProfundidades<T extends { indice: number; parentIndice?: number | null }>(lista: T[]): Map<number, number> {
  const porIndice = new Map(lista.map((p) => [p.indice, p]));
  const profundidades = new Map<number, number>();
  const visitando = new Set<number>();

  const calc = (item: T): number => {
    if (profundidades.has(item.indice)) return profundidades.get(item.indice)!;
    if (item.parentIndice == null || !porIndice.has(item.parentIndice) || visitando.has(item.indice)) {
      profundidades.set(item.indice, 0);
      return 0;
    }
    visitando.add(item.indice);
    const d = calc(porIndice.get(item.parentIndice)!) + 1;
    visitando.delete(item.indice);
    profundidades.set(item.indice, d);
    return d;
  };

  lista.forEach((item) => calc(item));
  return profundidades;
}

// Nodo del árbol de "Procedimiento de trabajo": subtitulo/paso/letra/guion, con
// hijos anidados (sin límite de niveles) y numeración ya calculada para mostrar
// ("numero" nunca se guarda en el backend, se recalcula cada vez que se arma el árbol).
interface PasoNodo extends PetPasoDto {
  hijos: PasoNodo[];
  numero: string;
  nuevoHijoTexto: string;
  nuevoHijoTipo: string;
}

const TIPOS_PASO = [
  { value: 'paso', label: 'Texto' },
  { value: 'letra', label: 'Letra (a, b, c)' },
  { value: 'guion', label: 'Guion (-)' },
  { value: 'subtitulo', label: 'Subtítulo' },
];

type TabKind = 'arbol' | 'texto' | 'catalogo' | 'anexos' | 'firmas' | 'importar';

interface TabDef {
  key: string;
  label: string;
  kind: TabKind;
  ayuda: string;
}

// Procedimiento y Responsabilidades sí tienen estructura real (pasos/subtítulos) y
// usan el árbol reusado. El resto de secciones narrativas son un solo bloque de
// texto — no tiene sentido que cada oración sea su propia fila con tipo/controles.
const TABS: TabDef[] = [
  {
    key: 'procedimiento',
    label: 'Procedimiento',
    kind: 'arbol',
    ayuda:
      'Estos pasos son los que OPT jala automáticamente al seleccionar este PETS. El número se calcula por posición — insertar uno en medio corre el resto sin que tengas que renumerar nada.',
  },
  { key: 'introduccion', label: 'Introducción', kind: 'texto', ayuda: 'Por qué existe este PETS y el contexto general de la actividad.' },
  {
    key: 'alcance',
    label: 'Alcance',
    kind: 'texto',
    ayuda: 'A qué actividades, áreas o etapas del proyecto aplica este PETS (y qué queda fuera).',
  },
  { key: 'objetivo', label: 'Objetivo', kind: 'texto', ayuda: 'Qué se busca lograr al aplicar este procedimiento.' },
  {
    key: 'marco_legal',
    label: 'Marco Legal',
    kind: 'catalogo',
    ayuda: 'Normas y estándares aplicables a esta actividad — elige del catálogo o agrega uno propio.',
  },
  { key: 'definiciones', label: 'Definiciones', kind: 'texto', ayuda: 'Términos técnicos usados en el documento que conviene aclarar.' },
  {
    key: 'responsabilidades',
    label: 'Responsabilidades',
    kind: 'arbol',
    ayuda: 'Quién hace qué — normalmente un subtítulo por cargo con sus responsabilidades debajo.',
  },
  {
    key: 'gestion_personal',
    label: 'Gestión de Personal',
    kind: 'arbol',
    ayuda: 'Quién puede ocupar cada rol de este PETS — normalmente un subtítulo "Personal" con la experiencia/certificaciones mínimas por cargo debajo. A diferencia de Responsabilidades (qué debe hacer cada rol), acá se describe quién califica para ocuparlo.',
  },
  {
    key: 'epp',
    label: 'EPP',
    kind: 'catalogo',
    ayuda: 'Equipos de protección personal requeridos: básico, específico según la tarea, y de emergencia.',
  },
  {
    key: 'recurso',
    label: 'Recursos',
    kind: 'catalogo',
    ayuda: 'Equipos, herramientas y materiales necesarios para ejecutar la actividad.',
  },
  { key: 'restricciones', label: 'Restricciones', kind: 'texto', ayuda: 'Condiciones bajo las cuales NO se debe ejecutar esta actividad.' },
  {
    key: 'anexos',
    label: 'Anexos',
    kind: 'anexos',
    ayuda: 'Documentos de respaldo (planos, fichas técnicas, permisos) adjuntos a este PETS.',
  },
  {
    key: 'firmas',
    label: 'Firmas',
    kind: 'firmas',
    ayuda: 'Elaborado / Revisado / Aprobado por — el nombre se busca del personal de Abril, el cargo se autocompleta.',
  },
  {
    key: 'importar',
    label: 'Importar Word',
    kind: 'importar',
    ayuda: 'Sube un PETS ya existente en Word y arma automáticamente el resto de las pestañas — nada se guarda hasta que confirmes.',
  },
];

// Sub-bloques dentro de una pestaña de catálogo: Marco Legal no distingue tipo,
// EPP y Recursos sí — cada bloque se agrega/elimina de forma independiente.
const CATALOGO_TIPOS: Record<string, { value: string | null; label: string }[]> = {
  marco_legal: [{ value: null, label: 'Normas aplicables' }],
  epp: [
    { value: 'basico', label: 'EPP básico' },
    { value: 'especifico', label: 'EPP específico según la tarea' },
    { value: 'emergencia', label: 'EPP de emergencia' },
  ],
  recurso: [
    { value: 'equipo', label: 'Equipos' },
    { value: 'herramienta', label: 'Herramientas' },
    { value: 'material', label: 'Materiales' },
  ],
};

function claveCatalogo(grupo: string, tipo: string | null): string {
  return `${grupo}:${tipo ?? ''}`;
}

const ROLES_FIRMA: { value: PetRolFirma; label: string }[] = [
  { value: 'elaborado', label: 'Elaborado por' },
  { value: 'revisado', label: 'Revisado por' },
  { value: 'aprobado', label: 'Aprobado por' },
];

@Component({
  selector: 'app-pets-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect, WorkerSearchInput],
  templateUrl: './pets-detalle.html',
  styleUrl: './pets-detalle.css',
})
export class PetsDetalle implements OnInit {
  id!: number;
  loading = true;
  detalle: PetDetalleDto | null = null;
  guardandoCabecera = false;

  // Snapshot de Datos generales tal como quedó guardado — comparar contra esto (no un
  // simple "algo cambió alguna vez") es lo que permite saber si HOY hay algo pendiente
  // de guardar, incluso después de guardar una vez y seguir editando.
  private cabeceraGuardada: {
    nombre: string;
    codigo: string | null | undefined;
    sharepointUrl: string | null | undefined;
    activo: boolean;
    origen: string;
    contributorId: number | null | undefined;
    proyectoId: number | null | undefined;
  } | null = null;

  // La pantalla normal es SOLO LECTURA — "Editar" es lo único que habilita los campos
  // y a la vez expande a pantalla completa (mismo mecanismo que ya usa Importar), para
  // no marear con "¿por dónde edito, y por qué hay dos botones de guardar?". Salir
  // pasa siempre por conGuardiaDeCambios(), así nunca se pierde un cambio sin avisar.
  modoEdicion = false;
  get pantallaCompleta(): boolean {
    return this.modoEdicion;
  }

  entrarModoEdicion(): void {
    this.modoEdicion = true;
    this.cdr.markForCheck();
  }

  // Si la pestaña activa es de las que tienen un "Guardar" propio (texto narrativo,
  // firmas), un solo botón hace las dos cosas: guarda lo pendiente Y sale — nadie
  // debería tener que acordarse de guardar la sección Y ADEMÁS salir de edición por
  // separado. Procedimiento/Responsabilidades, EPP/Recursos/Marco Legal y Anexos ya se
  // guardan solos por acción (blur, agregar, subir) y no necesitan este paso.
  get haySeccionPendienteDeGuardar(): boolean {
    const tab = this.tabActiva;
    if (tab.kind === 'texto') return this.textoSeccionTieneCambios(tab.key);
    if (tab.kind === 'firmas') return true; // sin un "dirty" fino por campo — barato guardar de todos modos
    return false;
  }

  get etiquetaSalirEdicion(): string {
    return this.haySeccionPendienteDeGuardar ? 'Guardar y salir' : 'Salir de edición';
  }

  private textoSeccionTieneCambios(key: string): boolean {
    if (!this.detalle) return false;
    return (this.textoSecciones[key] ?? '') !== (this.detalle.seccionesTexto[key as PetSeccionTexto] ?? '');
  }

  salirModoEdicion(): void {
    const tab = this.tabActiva;
    if (tab.kind === 'texto' && this.textoSeccionTieneCambios(tab.key)) {
      this.guardarTextoSeccion(() => this.finalizarSalidaEdicion());
      return;
    }
    if (tab.kind === 'firmas') {
      this.guardarFirmas(() => this.finalizarSalidaEdicion());
      return;
    }
    this.finalizarSalidaEdicion();
  }

  private finalizarSalidaEdicion(): void {
    this.conGuardiaDeCambios(() => {
      this.modoEdicion = false;
      this.cdr.markForCheck();
    });
  }

  readonly tiposPaso = TIPOS_PASO;
  readonly tabs = TABS;
  readonly catalogoTipos = CATALOGO_TIPOS;
  readonly rolesFirma = ROLES_FIRMA;

  // ── Firmas (Elaborado por / Revisado por / Aprobado por) ─────────────────
  guardandoFirmas = false;
  subiendoFirmaRol: string | null = null;
  exportandoPdf = false;

  onFirmanteSeleccionado(rol: PetRolFirma, w: WorkerSearchItemDto | null): void {
    if (!this.detalle) return;
    const f = this.detalle.firmas[rol];
    f.nombre = w?.apellidoNombre ?? '';
    f.cargo = w?.cargo || w?.puesto || f.cargo;
    this.cdr.markForCheck();
  }

  // El combo busca por texto, pero la firma ya guardada solo trae el nombre como string —
  // se arma un WorkerSearchItemDto mínimo para que el combo lo muestre como "ya elegido" en
  // vez de aparecer vacío cada vez que se recarga el PETS.
  firmanteActual(rol: PetRolFirma): WorkerSearchItemDto | null {
    const nombre = this.detalle?.firmas[rol]?.nombre;
    if (!nombre) return null;
    return { id: 0, apellidoNombre: nombre, dni: '', cargo: this.detalle?.firmas[rol]?.cargo ?? undefined, activo: true };
  }

  firmaUrl(firma: PetFirmaDto): string | null {
    if (!firma.firmaUrl) return null;
    return firma.firmaUrl.startsWith('http') ? firma.firmaUrl : `${this.apiOrigin}${firma.firmaUrl}`;
  }

  guardarFirmas(onDone?: () => void): void {
    if (!this.detalle) return;
    this.guardandoFirmas = true;
    const detalle = this.detalle;
    this.conCarga(
      forkJoin(
        this.rolesFirma.map((r) => {
          const f = detalle.firmas[r.value];
          return this.petsService.actualizarFirma(this.id, r.value, { nombre: f.nombre, cargo: f.cargo, fecha: f.fecha });
        }),
      ),
    ).subscribe({
      next: () => {
        this.guardandoFirmas = false;
        Swal.fire({ icon: 'success', title: 'Firmas guardadas', toast: true, position: 'top-end', showConfirmButton: false, timer: 1800 });
        this.cdr.markForCheck();
        onDone?.();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoFirmas = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onFirmaImagenSeleccionada(event: Event, rol: PetRolFirma): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.subiendoFirmaRol = rol;
    this.conCarga(this.petsService.subirFirma(this.id, rol, file)).subscribe({
      next: ({ firmaUrl }) => {
        this.subiendoFirmaRol = null;
        if (this.detalle) this.detalle.firmas[rol].firmaUrl = firmaUrl;
        input.value = '';
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoFirmaRol = null;
        input.value = '';
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Exportar ──────────────────────────────────────────────────────────────
  // Abre el PDF inline en una pestaña nueva (visor nativo del navegador), no lo
  // descarga — mientras el PETS se sigue armando, es "vista previa", no entregable.
  exportarPdf(): void {
    if (!this.detalle) return;
    // Se abre en blanco AHORA, de forma síncrona dentro del click — así el navegador
    // no lo trata como pop-up bloqueado cuando recién le seteamos la URL más abajo.
    const nuevaVentana = window.open('', '_blank');
    this.exportandoPdf = true;
    this.petsService.exportarPdf(this.id).subscribe({
      next: (blob) => {
        this.exportandoPdf = false;
        const url = window.URL.createObjectURL(blob);
        if (nuevaVentana) {
          nuevaVentana.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.exportandoPdf = false;
        nuevaVentana?.close();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  seccionActiva = 'procedimiento';

  get tabActiva(): TabDef {
    return this.tabs.find((t) => t.key === this.seccionActiva) ?? this.tabs[0];
  }

  // Punto (indicador) en la pestaña cuando ya tiene contenido cargado — antes las
  // 11 pestañas se veían todas iguales sin forma de saber cuáles faltaban.
  tabTieneContenido(tab: TabDef): boolean {
    if (!this.detalle) return false;
    switch (tab.kind) {
      case 'arbol':
        return (this.arboles[tab.key]?.length ?? 0) > 0;
      case 'texto':
        return !!this.textoSecciones[tab.key]?.trim();
      case 'catalogo': {
        const lista = tab.key === 'marco_legal' ? this.detalle.marcoLegal : tab.key === 'epp' ? this.detalle.epp : this.detalle.recursos;
        return (lista?.length ?? 0) > 0;
      }
      case 'anexos':
        return this.detalle.anexos.length > 0;
      case 'firmas':
        return this.rolesFirma.some((r) => !!this.detalle!.firmas[r.value]?.nombre?.trim());
      default:
        return false;
    }
  }

  // Árboles por sección (procedimiento + responsabilidades), reconstruidos cada
  // vez que se recarga. Solo se muestra el de la pestaña activa.
  arboles: Record<string, PasoNodo[]> = {};

  get arbol(): PasoNodo[] {
    return this.arboles[this.seccionActiva] ?? [];
  }

  // ── Secciones narrativas (bloque de texto único) ─────────────────────────
  textoSecciones: Record<string, string> = {};
  guardandoTextoSeccion: Record<string, boolean> = {};

  guardarTextoSeccion(onDone?: () => void): void {
    const seccion = this.seccionActiva;
    const contenido = this.textoSecciones[seccion] ?? '';
    this.guardandoTextoSeccion[seccion] = true;
    this.conCarga(this.petsService.actualizarSeccionTexto(this.id, seccion, contenido)).subscribe({
      next: () => {
        this.guardandoTextoSeccion[seccion] = false;
        // Actualiza el "guardado" contra el que se compara para detectar cambios sin
        // guardar — si no, salir de la pestaña seguiría avisando aunque ya se guardó.
        if (this.detalle) this.detalle.seccionesTexto[seccion as PetSeccionTexto] = contenido;
        Swal.fire({ icon: 'success', title: 'Guardado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        this.cdr.markForCheck();
        onDone?.();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoTextoSeccion[seccion] = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Catálogo (Marco Legal / EPP / Recursos) ──────────────────────────────
  catalogoOpciones: Record<string, CatalogoItemDto[]> = {};
  seleccionEnCurso: Record<string, number | null> = {};
  personalizadoTexto: Record<string, string> = {};
  personalizadoAlCatalogo: Record<string, boolean> = {};
  guardandoSeleccion: Record<string, boolean> = {};

  // ── Anexos ────────────────────────────────────────────────────────────────
  nuevoAnexoNombre = '';
  subiendoAnexo = false;

  // Agregar al final (nivel superior)
  nuevoPasoTexto = '';
  nuevoPasoTipo = 'paso';
  agregando = false;

  // Insertar en medio — parentId + índice identifican el grupo de hermanos y la
  // posición exacta donde se abre el formulario.
  insertarEnPadre: number | null = null;
  insertarEnIndice: number | null = null;
  insertarTexto = '';
  insertarTipo = 'paso';

  subiendoImagenPasoId: number | null = null;

  // Importar desde Word (detección automática de TODAS las secciones conocidas)
  importandoDocx = false;
  previewSeccionesArbol: Record<string, PasoPreviewNodo[]> | null = null;
  previewSeccionesTexto: Record<string, string> | null = null;
  // Encabezados detectados que no calzaron con ningún marcador conocido — cada uno
  // se queda acá hasta que el usuario elige a qué pestaña enviarlo (o descartarlo).
  previewNoReconocidas: SeccionNoReconocida[] = [];
  // Ítems de Marco Legal/EPP/Recursos que el usuario ya trió desde una sección no
  // reconocida — se agregan como personalizados de este PETS al confirmar.
  previewItemsCatalogo: AgregarItemPersonalizadoRequest[] = [];
  confirmandoImportacion = false;

  // true: reimportar una versión corregida — borra el Procedimiento vigente antes de
  // insertar. false (default): agrega al final, como antes. Se resetea en cada import nuevo.
  reemplazarAlConfirmar = false;

  // Importar desde Word (selección manual — respaldo cuando no se detecta el
  // encabezado automáticamente, o el usuario prefiere elegir a mano)
  previewManual: ParrafoSeleccionable[] | null = null;
  rangoDesde: number | null = null;
  rangoHasta: number | null = null;

  readonly apiOrigin = environment.apiUrl.replace(/\/$/, '');
  readonly plantillaUrl = `${this.apiOrigin}/templates/pets-plantilla.docx`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private petsService: PetsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private accidenteIncidenteService: AccidenteIncidenteService,
  ) {}

  proyectos: FlashProyectoDto[] = [];
  contratistas: ContratistaCatalogoDto[] = [];

  // Cualquier prevencionista/coordinador SSOMA edita el PETS; solo el Jefe SSOMA
  // aprueba la publicación de una versión oficial (el backend también lo exige,
  // esto solo evita mostrar un botón que va a devolver 403).
  get puedeAprobar(): boolean {
    return this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA);
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.accidenteIncidenteService.inicializar().subscribe({
      next: (init) => {
        this.proyectos = init.proyectos;
        this.contratistas = init.contratistas;
        this.cdr.markForCheck();
      },
    });
  }

  // Cierre/recarga de la pestaña del navegador — el guard de ruta (canDeactivate)
  // cubre navegar DENTRO de la app; esto cubre salir de la app por completo.
  @HostListener('window:beforeunload', ['$event'])
  avisarSalidaSinGuardar(event: BeforeUnloadEvent): void {
    if (this.hayCambiosSinGuardar()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  // Todo lo que se puede perder al salir sin guardar:
  // (a) Datos generales tocado desde el último "Guardar cambios" (cabeceraGuardada);
  // (b) una sección narrativa (Introducción/Alcance/...) editada sin guardar — se
  //     compara contra lo último cargado del backend (actualizado también al guardar,
  //     ver guardarTextoSeccion).
  // Los pasos (Procedimiento/Responsabilidades) ya NO entran acá: se guardan solos al
  // salir del campo (onBlurTextoPaso), así que no hay "edición a medias" que perder —
  // el blur del navegador ya corre antes de cualquier cambio de pestaña o navegación.
  hayCambiosSinGuardar(): boolean {
    if (!this.detalle) return false;

    if (this.cabeceraGuardada) {
      const c = this.cabeceraGuardada;
      if (
        this.detalle.nombre !== c.nombre ||
        this.detalle.codigo !== c.codigo ||
        this.detalle.sharepointUrl !== c.sharepointUrl ||
        this.detalle.activo !== c.activo ||
        this.detalle.origen !== c.origen ||
        this.detalle.contributorId !== c.contributorId ||
        this.detalle.proyectoId !== c.proyectoId
      ) {
        return true;
      }
    }

    return this.tabs
      .filter((t) => t.kind === 'texto')
      .some((t) => (this.textoSecciones[t.key] ?? '') !== (this.detalle!.seccionesTexto[t.key as PetSeccionTexto] ?? ''));
  }

  imagenUrl(paso: PetPasoDto): string | null {
    if (!paso.imagenUrl) return null;
    return paso.imagenUrl.startsWith('http') ? paso.imagenUrl : `${this.apiOrigin}${paso.imagenUrl}`;
  }

  private resolverUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.apiOrigin}${url}`;
  }

  // Todas las imágenes del paso (antes solo se mostraba/editaba una) — cada una con
  // su propia URL resuelta y su Id, para poder borrarlas una por una.
  imagenesPaso(paso: PetPasoDto): { id: number; url: string }[] {
    return paso.imagenes.map((i) => ({ id: i.id, url: this.resolverUrl(i.url) }));
  }

  // Sin esto, *ngFor recreaba el <img> de CADA miniatura en cada detección de
  // cambios (imagenesPaso() arma un array/objetos nuevos cada vez que se llama, así
  // que Angular los veía como "todos distintos" y los reemplazaba todos). El navegador
  // exige que "mousedown" y "mouseup" caigan sobre el MISMO elemento para sintetizar
  // el evento "click" — como el <img> se destruía y recreaba justo al presionar el
  // mouse (mousedown ya dispara detección de cambios), el click nunca llegaba a
  // dispararse: no era un bug de mi código de zoom, era que el elemento nunca
  // sobrevivía entero el gesto de clic.
  trackPasoId(_: number, nodo: PasoNodo): number {
    return nodo.id;
  }

  trackImagenId(_: number, img: { id: number; url: string }): number {
    return img.id;
  }

  // Chequeo barato de sintaxis — no es corrección ortográfica (para eso ya alcanza
  // con el corrector nativo del navegador, spellcheck="true" en los textarea), esto
  // detecta paréntesis/comillas que se quedaron sin cerrar, un error común al pegar
  // texto de un Word real (ej. "Uso de reflectores (Cuando el área... realizar."
  // sin el ")" de cierre) y que a simple vista pasa desapercibido en un párrafo largo.
  tieneSimbolosDesbalanceados(texto: string | null | undefined): boolean {
    if (!texto) return false;
    let balance = 0;
    for (const ch of texto) {
      if (ch === '(') balance++;
      else if (ch === ')') balance--;
      if (balance < 0) return true;
    }
    if (balance !== 0) return true;
    const comillas = (texto.match(/"/g) ?? []).length;
    return comillas % 2 !== 0;
  }

  imagenAmpliada: string | null = null;

  ampliarImagen(url: string): void {
    this.imagenAmpliada = url;
    this.cdr.markForCheck();
  }

  cerrarImagenAmpliada(): void {
    this.imagenAmpliada = null;
    this.cdr.markForCheck();
  }

  // ── Versionado y aprobación ─────────────────────────────────────────────────
  mostrarModalAprobar = false;
  motivoAprobar = '';
  aprobando = false;
  mostrarHistorial = false;
  versiones: PetVersionDto[] = [];
  cargandoVersiones = false;

  private nombreUsuarioActual(): string {
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      return user?.displayName ?? 'Usuario';
    } catch {
      return 'Usuario';
    }
  }

  abrirAprobarVersion(): void {
    this.motivoAprobar = '';
    this.mostrarModalAprobar = true;
  }

  cancelarAprobarVersion(): void {
    this.mostrarModalAprobar = false;
  }

  confirmarAprobarVersion(): void {
    if (!this.motivoAprobar.trim() || !this.detalle) return;
    this.aprobando = true;
    this.conCarga(
      this.petsService.aprobarVersion(this.id, { motivo: this.motivoAprobar.trim(), aprobadoPorNombre: this.nombreUsuarioActual() }),
    )
      .subscribe({
        next: (v) => {
          this.aprobando = false;
          this.mostrarModalAprobar = false;
          this.detalle!.estadoRevision = 'aprobado';
          this.detalle!.versionVigente = v.numeroVersion;
          Swal.fire({ icon: 'success', title: `Versión ${v.numeroVersion} aprobada`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.aprobando = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  toggleHistorial(): void {
    this.mostrarHistorial = !this.mostrarHistorial;
    if (this.mostrarHistorial && this.versiones.length === 0) this.cargarVersiones();
  }

  private cargarVersiones(): void {
    this.cargandoVersiones = true;
    this.petsService.getVersiones(this.id).subscribe({
      next: (vs) => {
        this.versiones = vs;
        this.cargandoVersiones = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoVersiones = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  descargarPdfVersion(numeroVersion: number): void {
    this.petsService.exportarPdfVersion(this.id, numeroVersion).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // Conecta el loader GLOBAL de la app (LoaderService — el mismo overlay bloqueante
  // que usa el resto de la plataforma) a cualquier llamada al backend de esta
  // pantalla. Antes ninguna acción lo usaba: mover/sangrar/cambiar tipo/guardar no
  // avisaban que estaban en curso y se podía seguir haciendo clic en cualquier lado
  // mientras la petición viajaba — peligroso si el usuario dispara dos veces la
  // misma acción o navega a mitad de una escritura. finalize() garantiza el hide()
  // tanto en éxito como en error, sin tener que repetirlo en cada subscribe.
  private conCarga<T>(obs$: Observable<T>): Observable<T> {
    this.loaderService.show();
    return obs$.pipe(finalize(() => this.loaderService.hide()));
  }

  // Solo muestra el mensaje "Cargando…" (que reemplaza a .detalle-body por *ngIf,
  // destruyendo y recreando todo el contenido) en la carga inicial. En las recargas
  // posteriores — después de cada cambio menor (mover, sangrar, cambiar tipo) — el
  // contenedor se queda montado, así el navegador conserva el scroll donde estaba en
  // vez de saltar arriba cada vez.
  load(): void {
    const esPrimeraCarga = !this.detalle;
    if (esPrimeraCarga) this.loading = true;
    this.conCarga(this.petsService.getDetalle(this.id)).subscribe({
      next: (d) => {
        this.detalle = d;
        this.cabeceraGuardada = {
          nombre: d.nombre,
          codigo: d.codigo,
          sharepointUrl: d.sharepointUrl,
          activo: d.activo,
          origen: d.origen,
          contributorId: d.contributorId,
          proyectoId: d.proyectoId,
        };
        // Fecha default = hoy en cada rol de firma sin fecha todavía (editable después) —
        // evita que el usuario tenga que teclearla a mano cada vez que arma un PETS nuevo.
        const hoy = new Date().toISOString().slice(0, 10);
        for (const r of this.rolesFirma)
          if (!d.firmas[r.value].fecha) d.firmas[r.value].fecha = hoy;
        this.arboles = {
          // El número de capítulo (6, 8...) es fijo: es el orden estándar de la
          // plantilla de PETS (ver Marcadores en el importador del backend), no algo
          // que varíe por documento — así el "8.1" que se ve acá coincide con el "8.1"
          // del PDF exportado, aunque la barra de pestañas muestre Procedimiento primero
          // por conveniencia de uso.
          procedimiento: this.construirArbol(d.pasos, '8'),
          responsabilidades: this.construirArbol(d.responsabilidades, '6'),
          gestion_personal: this.construirArbol(d.gestionPersonal, '7'),
        };
        this.textoSecciones = { ...d.seccionesTexto };
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── PESTAÑAS ──────────────────────────────────────────────────────────────
  // Punto de entrada para clics del usuario (tabs, botón volver) — antes de perder lo
  // que no se guardó, avisa y deja elegir. Las llamadas internas (ej. después de
  // confirmar una importación) siguen usando seleccionarTab()/irALista() directo, sin
  // pasar por acá, porque en esos casos no hay nada pendiente que se pueda perder.
  private conGuardiaDeCambios(accion: () => void): void {
    if (!this.hayCambiosSinGuardar()) {
      accion();
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: 'Tienes cambios sin guardar',
      text: 'Hay datos generales editados sin guardar, o un paso a medio editar. Si sales ahora, se pierden.',
      showCancelButton: true,
      confirmButtonText: 'Salir sin guardar',
      cancelButtonText: 'Seguir editando',
    }).then((res) => {
      if (res.isConfirmed) accion();
    });
  }

  onTabClick(key: string): void {
    if (key === this.seccionActiva) return;
    if (this.confirmandoImportacion) {
      Swal.fire({ icon: 'info', title: 'Espera a que termine de importar', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.conGuardiaDeCambios(() => this.seleccionarTab(key));
  }

  seleccionarTab(key: string): void {
    this.seccionActiva = key;
    // Cualquier edición/inserción a medias queda de la pestaña anterior — se
    // descarta al cambiar para no dejar un formulario abierto "flotando". La
    // vista previa de importación vive en su propia tarjeta (siempre visible,
    // no depende de la pestaña activa), así que NO se toca acá — cambiar de
    // pestaña ya no la interrumpe.
    this.cancelarInsertar();
    this.limpiarSeleccionPasos();

    const tab = this.tabs.find((t) => t.key === key);
    if (tab?.kind === 'catalogo') {
      this.cargarOpcionesCatalogo(tab.key);
    }
    this.cdr.markForCheck();
  }

  private construirArbol(pasos: PetPasoDto[], prefijoCapitulo = ''): PasoNodo[] {
    const nodos = new Map<number, PasoNodo>();
    pasos.forEach((p) => nodos.set(p.id, { ...p, hijos: [], numero: '', nuevoHijoTexto: '', nuevoHijoTipo: 'paso' }));

    const raiz: PasoNodo[] = [];
    pasos.forEach((p) => {
      const nodo = nodos.get(p.id)!;
      if (p.parentId != null && nodos.has(p.parentId)) {
        nodos.get(p.parentId)!.hijos.push(nodo);
      } else {
        raiz.push(nodo);
      }
    });

    const ordenarYNumerar = (lista: PasoNodo[], prefijoSubtitulo: string): void => {
      lista.sort((a, b) => a.orden - b.orden);
      let nSubtitulo = 0;
      let nLetra = 0;
      for (const n of lista) {
        if (n.tipo === 'subtitulo') {
          nSubtitulo++;
          n.numero = prefijoSubtitulo ? `${prefijoSubtitulo}.${nSubtitulo}` : `${nSubtitulo}`;
        } else if (n.tipo === 'letra') {
          nLetra++;
          n.numero = this.letraDesdeIndice(nLetra - 1);
        } else {
          n.numero = '';
        }
        ordenarYNumerar(n.hijos, n.tipo === 'subtitulo' ? n.numero : prefijoSubtitulo);
      }
    };
    ordenarYNumerar(raiz, prefijoCapitulo);
    return raiz;
  }

  // a, b, c, ..., z, aa, ab, ... (igual que columnas de Excel)
  private letraDesdeIndice(i: number): string {
    let s = '';
    let n = i;
    do {
      s = String.fromCharCode(97 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
  }

  irALista(): void {
    if (this.confirmandoImportacion) {
      Swal.fire({ icon: 'info', title: 'Espera a que termine de importar', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.conGuardiaDeCambios(() => this.router.navigate(['/ssoma/gestion/pets']));
  }

  guardarCabecera(): void {
    if (!this.detalle) return;
    this.guardandoCabecera = true;
    this.conCarga(
      this.petsService.actualizar(this.id, {
        nombre: this.detalle.nombre,
        codigo: this.detalle.codigo,
        sharepointUrl: this.detalle.sharepointUrl,
        activo: this.detalle.activo,
        origen: this.detalle.origen,
        contributorId: this.detalle.origen === 'Contratista' ? this.detalle.contributorId : undefined,
        proyectoId: this.detalle.origen === 'Contratista' ? this.detalle.proyectoId : undefined,
      }),
    )
      .subscribe({
        next: () => {
          this.guardandoCabecera = false;
          this.cabeceraGuardada = {
            nombre: this.detalle!.nombre,
            codigo: this.detalle!.codigo,
            sharepointUrl: this.detalle!.sharepointUrl,
            activo: this.detalle!.activo,
            origen: this.detalle!.origen,
            contributorId: this.detalle!.contributorId,
            proyectoId: this.detalle!.proyectoId,
          };
          Swal.fire({ icon: 'success', title: 'Guardado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1800 });
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoCabecera = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── PASOS: agregar al final (nivel superior) ─────────────────────────────
  agregarPasoFinal(): void {
    const texto = this.nuevoPasoTexto.trim();
    if (!texto) return;
    this.agregando = true;
    this.conCarga(
      this.petsService.agregarPaso(this.id, { descripcion: texto, seccion: this.seccionActiva, parentId: null, tipo: this.nuevoPasoTipo }),
    )
      .subscribe({
        next: () => {
          this.agregando = false;
          this.nuevoPasoTexto = '';
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.agregando = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── PASOS: agregar dentro de un subtítulo ────────────────────────────────
  agregarHijo(nodo: PasoNodo): void {
    const texto = nodo.nuevoHijoTexto.trim();
    if (!texto) return;
    this.conCarga(
      this.petsService.agregarPaso(this.id, { descripcion: texto, seccion: this.seccionActiva, parentId: nodo.id, tipo: nodo.nuevoHijoTipo }),
    )
      .subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── PASOS: insertar en una posición específica ───────────────────────────
  // parentId + index (0-based, dentro de ese grupo de hermanos) identifican
  // exactamente dónde se quiere insertar — nunca se toca el orden de otro grupo.
  abrirInsertarEn(parentId: number | null, index: number): void {
    this.insertarEnPadre = parentId;
    this.insertarEnIndice = index;
    this.insertarTexto = '';
    this.insertarTipo = 'paso';
    this.cdr.markForCheck();
  }

  cancelarInsertar(): void {
    this.insertarEnPadre = null;
    this.insertarEnIndice = null;
    this.insertarTexto = '';
    this.cdr.markForCheck();
  }

  confirmarInsertar(): void {
    const texto = this.insertarTexto.trim();
    if (!texto || this.insertarEnIndice === null) return;
    const posicion = this.insertarEnIndice + 1; // 1-based para el backend
    this.conCarga(
      this.petsService.agregarPaso(this.id, {
        descripcion: texto,
        seccion: this.seccionActiva,
        parentId: this.insertarEnPadre,
        tipo: this.insertarTipo,
        posicion,
      }),
    )
      .subscribe({
        next: () => {
          this.cancelarInsertar();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── PASOS: edición inline (clic directo, guarda al salir del campo) ──────
  // Reemplaza el flujo viejo de "lápiz → Cancelar/Guardar": ya se está en modo
  // edición global (modoEdicion), así que pedir una confirmación aparte por cada
  // fila era un paso de más. El valor se guarda al ENFOCAR (no en cada tecla) para
  // poder ofrecer "Deshacer" después de guardar, y para no disparar un guardado si
  // el usuario entra y sale del campo sin cambiar nada. A propósito NO se llama
  // this.load() después de guardar — recargar todo el árbol destruye y recrea los
  // <textarea>, lo que borraría el historial nativo de Ctrl+Z del navegador.
  private valorPasoAlEnfocar = new Map<number, string>();

  onFocoTextoPaso(nodo: PasoNodo): void {
    this.valorPasoAlEnfocar.set(nodo.id, nodo.descripcion);
  }

  onBlurTextoPaso(nodo: PasoNodo): void {
    const anterior = this.valorPasoAlEnfocar.get(nodo.id) ?? nodo.descripcion;
    this.valorPasoAlEnfocar.delete(nodo.id);
    const texto = nodo.descripcion.trim();
    if (!texto) {
      nodo.descripcion = anterior; // no se permite dejarlo vacío — se revierte solo
      this.cdr.markForCheck();
      return;
    }
    if (texto === anterior) return; // no cambió nada, no hay nada que guardar
    nodo.descripcion = texto;
    this.conCarga(this.petsService.actualizarPaso(this.id, nodo.id, { descripcion: texto, tipo: nodo.tipo })).subscribe({
      next: () => this.ofrecerDeshacerTextoPaso(nodo, anterior),
      error: (err: HttpErrorResponse) => {
        nodo.descripcion = anterior;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private ofrecerDeshacerTextoPaso(nodo: PasoNodo, textoAnterior: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Guardado',
      showConfirmButton: true,
      confirmButtonText: 'Deshacer',
      timer: 5000,
      timerProgressBar: true,
    }).then((res) => {
      if (!res.isConfirmed) return;
      const textoActual = nodo.descripcion;
      nodo.descripcion = textoAnterior;
      this.conCarga(this.petsService.actualizarPaso(this.id, nodo.id, { descripcion: textoAnterior, tipo: nodo.tipo })).subscribe({
        next: () => this.cdr.markForCheck(),
        error: (err: HttpErrorResponse) => {
          nodo.descripcion = textoActual;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  // El <select> de tipo se guarda directo al cambiar (no hace falta esperar un
  // "blur" — elegir una opción ya es una decisión tomada), sin deshacer: cambiar de
  // tipo es una acción estructural poco frecuente, no una corrección de texto.
  // Recarga (this.load()) en vez de solo mutar nodo.tipo localmente: la numeración
  // (8.1, 8.1.1, a/b/c) depende del tipo de TODOS los hermanos, así que hay que
  // volver a correr ordenarYNumerar sobre el árbol completo, no solo este nodo.
  //
  // Al convertir una fila plana en Subtítulo, lo esperable es que "jale" con todo lo
  // que ya estaba debajo de ella (sus responsabilidades/pasos), no que quede vacía —
  // así que absorbe automáticamente a los hermanos siguientes (mismo nivel) hasta el
  // próximo subtítulo, convirtiéndolos en hijos de este. Al revés (un subtítulo con
  // hijos deja de serlo) se bloquea: esos hijos quedarían huérfanos e invisibles en
  // pantalla, hay que sacarlos primero (quitar sangría) o borrarlos.
  // Nada se guarda hasta que el usuario confirma en el diálogo — si cancela, el
  // <select> vuelve solo a su valor anterior porque [ngModel] sigue apuntando a
  // nodo.tipo, que nunca se llegó a tocar.
  onChangeTipoPaso(nodo: PasoNodo, tipoNuevo: string, hermanos: PasoNodo[], index: number): void {
    const anterior = nodo.tipo;
    if (tipoNuevo === anterior) return;

    if (anterior === 'subtitulo' && nodo.hijos.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Este subtítulo tiene contenido dentro',
        text: 'Saca primero lo que tiene dentro (quitar sangría) o bórralo antes de cambiarle el tipo.',
        confirmButtonText: 'Entendido',
      });
      this.cdr.markForCheck();
      return;
    }

    const seVuelveSubtitulo = tipoNuevo === 'subtitulo';
    const aAbsorber: PasoNodo[] = [];
    if (seVuelveSubtitulo) {
      for (let i = index + 1; i < hermanos.length; i++) {
        if (hermanos[i].tipo === 'subtitulo') break;
        aAbsorber.push(hermanos[i]);
      }
    }

    const etiquetaTipo = this.tiposPaso.find((t) => t.value === tipoNuevo)?.label ?? tipoNuevo;
    Swal.fire({
      icon: 'question',
      title: `¿Cambiar a "${etiquetaTipo}"?`,
      text:
        aAbsorber.length > 0
          ? `Además, lo que sigue debajo (${aAbsorber.length} fila${aAbsorber.length === 1 ? '' : 's'}) pasará a estar dentro de este subtítulo.`
          : 'Este cambio se guarda de inmediato.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) { this.cdr.markForCheck(); return; }

      nodo.tipo = tipoNuevo;
      this.cdr.markForCheck();
      this.conCarga(this.petsService.actualizarPaso(this.id, nodo.id, { descripcion: nodo.descripcion, tipo: tipoNuevo })).subscribe({
        next: () => {
          if (aAbsorber.length === 0) { this.load(); return; }
          this.loaderService.show();
          this.reparentarSecuencial(aAbsorber.map((n) => n.id), nodo.id, () => this.load());
        },
        error: (err: HttpErrorResponse) => {
          nodo.tipo = anterior;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  // Reasigna una lista de pasos al mismo nuevoParentId, uno por uno y en orden (cada
  // llamada al backend los agrega al final del grupo de hermanos) — así el orden
  // visual de los hermanos absorbidos se conserva como hijos. El loader global se
  // prende UNA sola vez en el llamador (evitar el parpadeo de apagar/prender entre
  // cada ítem de la cadena) y se apaga acá, en el único punto de salida (éxito final
  // o error), sin importar cuántos pasos se hayan reparentado.
  private reparentarSecuencial(idsPendientes: number[], nuevoParentId: number, onDone: () => void): void {
    if (idsPendientes.length === 0) { this.loaderService.hide(); onDone(); return; }
    const [primero, ...resto] = idsPendientes;
    this.petsService.cambiarNivelPaso(this.id, primero, nuevoParentId).subscribe({
      next: () => this.reparentarSecuencial(resto, nuevoParentId, onDone),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.load();
      },
    });
  }

  // ── PASOS: selección múltiple + mover en bloque a un subtítulo ───────────
  // Para el caso de "tengo 5 ítems sueltos que en realidad son de este subtítulo,
  // pero no está justo encima" — sangrar de a uno obliga a reordenar primero. Con
  // checkboxes se eligen los que sean (de cualquier nivel/sección) y se mandan todos
  // de una al subtítulo que se busque, sin importar dónde esté.
  pasosSeleccionados = new Set<number>();
  subtituloDestinoId: number | null = null;

  estaSeleccionado(id: number): boolean {
    return this.pasosSeleccionados.has(id);
  }

  toggleSeleccionPaso(id: number): void {
    if (this.pasosSeleccionados.has(id)) this.pasosSeleccionados.delete(id);
    else this.pasosSeleccionados.add(id);
    this.cdr.markForCheck();
  }

  limpiarSeleccionPasos(): void {
    this.pasosSeleccionados.clear();
    this.subtituloDestinoId = null;
    this.cdr.markForCheck();
  }

  // Subtítulos de la pestaña activa, aplanados, para elegir destino — el propio nodo
  // seleccionado no puede ser su propio destino (el backend lo rechaza igual, pero
  // así ni siquiera aparece en la lista).
  get subtitulosDisponibles(): { id: number; label: string }[] {
    const acc: { id: number; label: string }[] = [];
    const recorrer = (lista: PasoNodo[]): void => {
      for (const n of lista) {
        if (n.tipo === 'subtitulo' && !this.pasosSeleccionados.has(n.id)) {
          const texto = n.descripcion.length > 60 ? `${n.descripcion.slice(0, 60)}…` : n.descripcion;
          acc.push({ id: n.id, label: `${n.numero} — ${texto}` });
        }
        recorrer(n.hijos);
      }
    };
    recorrer(this.arbol);
    return acc;
  }

  moverSeleccionAlSubtitulo(): void {
    if (!this.subtituloDestinoId || this.pasosSeleccionados.size === 0) return;
    const ids = [...this.pasosSeleccionados];
    const destino = this.subtituloDestinoId;
    this.loaderService.show();
    this.reparentarSecuencial(ids, destino, () => {
      this.limpiarSeleccionPasos();
      this.load();
    });
  }

  // ── PASOS: sangrar / quitar sangría (cambiar de nivel) ───────────────────
  // "Sangrar" mete el paso dentro del hermano inmediatamente anterior (debe ser un
  // subtítulo — es el único tipo que la pantalla dibuja con hijos). "Quitar sangría"
  // lo saca de su padre actual y lo deja como hermano de ese padre, justo después de
  // él. Ambos recargan (this.load()) para que la numeración se recalcule igual que
  // con cualquier otro cambio estructural.
  puedeSangrar(hermanos: PasoNodo[], index: number): boolean {
    return index > 0 && hermanos[index - 1].tipo === 'subtitulo';
  }

  sangrarPaso(nodo: PasoNodo, hermanos: PasoNodo[], index: number): void {
    if (!this.puedeSangrar(hermanos, index)) return;
    const nuevoParentId = hermanos[index - 1].id;
    this.conCarga(this.petsService.cambiarNivelPaso(this.id, nodo.id, nuevoParentId)).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  quitarSangriaPaso(nodo: PasoNodo, parentParentId: number | null): void {
    this.conCarga(this.petsService.cambiarNivelPaso(this.id, nodo.id, parentParentId)).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── PASOS: eliminar ───────────────────────────────────────────────────────
  eliminarPaso(nodo: PasoNodo): void {
    const esSubtitulo = nodo.tipo === 'subtitulo' && nodo.hijos.length > 0;
    Swal.fire({
      icon: 'warning',
      title: esSubtitulo ? 'Este subtítulo tiene pasos dentro' : 'Eliminar paso',
      text: esSubtitulo
        ? 'Elimina primero los pasos que están dentro de este subtítulo.'
        : 'Este paso dejará de aparecer para quien lo use (OPT, checklists), pero se conserva en lo ya ejecutado.',
      showCancelButton: !esSubtitulo,
      confirmButtonText: esSubtitulo ? 'Entendido' : 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (esSubtitulo || !res.isConfirmed) return;
      this.conCarga(this.petsService.eliminarPaso(this.id, nodo.id)).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // ── PASOS: reordenar (mover arriba / abajo dentro del mismo grupo) ───────
  moverArriba(hermanos: PasoNodo[], parentId: number | null, index: number): void {
    if (index <= 0) return;
    this.reordenar(hermanos, parentId, index, index - 1);
  }

  moverAbajo(hermanos: PasoNodo[], parentId: number | null, index: number): void {
    if (index >= hermanos.length - 1) return;
    this.reordenar(hermanos, parentId, index, index + 1);
  }

  private reordenar(hermanos: PasoNodo[], parentId: number | null, desde: number, hacia: number): void {
    const copia = [...hermanos];
    const [movido] = copia.splice(desde, 1);
    copia.splice(hacia, 0, movido);
    const pasoIds = copia.map((p) => p.id);

    this.conCarga(this.petsService.reordenarPasos(this.id, { seccion: this.seccionActiva, parentId, pasoIds })).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.load();
      },
    });
  }

  // ── PASOS: imagen ─────────────────────────────────────────────────────────
  // Agrega una imagen MÁS al paso (ya no reemplaza la única que hubiera) — un paso
  // puede tener varias fotos, cada una se borra por separado con eliminarImagenPaso.
  onFileSelected(event: Event, paso: PetPasoDto): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subirImagenArchivo(file, paso, () => (input.value = ''));
  }

  // Ctrl+V sobre el botón "+" de la galería del paso — misma subida que arrastrar/
  // seleccionar archivo, solo que la imagen viene del portapapeles (ej. un screenshot
  // recortado, o "copiar imagen" desde el Word/navegador) en vez de un archivo en disco.
  onPasteImagenPaso(event: ClipboardEvent, paso: PetPasoDto): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          this.subirImagenArchivo(file, paso);
        }
        return;
      }
    }
  }

  private subirImagenArchivo(file: File, paso: PetPasoDto, onFinally?: () => void): void {
    this.subiendoImagenPasoId = paso.id;
    this.petsService.subirImagenPaso(this.id, paso.id, file).subscribe({
      next: ({ id, imagenUrl }) => {
        this.subiendoImagenPasoId = null;
        paso.imagenes = [...paso.imagenes, { id, url: imagenUrl }];
        if (!paso.imagenUrl) paso.imagenUrl = imagenUrl;
        onFinally?.();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoImagenPasoId = null;
        this.errorService.handleError(err);
        onFinally?.();
        this.cdr.markForCheck();
      },
    });
  }

  eliminarImagenPaso(paso: PetPasoDto, imagen: { id: number; url: string }): void {
    Swal.fire({ icon: 'question', title: '¿Eliminar esta imagen?', showCancelButton: true, confirmButtonText: 'Eliminar' }).then((res) => {
      if (!res.isConfirmed) return;
      this.conCarga(this.petsService.eliminarImagenPaso(this.id, paso.id, imagen.id)).subscribe({
        next: () => {
          paso.imagenes = paso.imagenes.filter((i) => i.id !== imagen.id);
          if (paso.imagenUrl === imagen.url) paso.imagenUrl = paso.imagenes[0]?.url;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // ── PASOS: categoría (hoy solo "medio_ambiente") ─────────────────────────
  toggleMedioAmbiente(paso: PetPasoDto): void {
    const nueva = paso.categoria === 'medio_ambiente' ? null : 'medio_ambiente';
    const anterior = paso.categoria;
    paso.categoria = nueva;
    this.cdr.markForCheck();
    this.petsService.actualizarCategoriaPaso(this.id, paso.id, nueva).subscribe({
      error: (err: HttpErrorResponse) => {
        paso.categoria = anterior;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── IMPORTAR DESDE WORD ───────────────────────────────────────────────────
  onArchivoDocxSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importandoDocx = true;
    this.reemplazarAlConfirmar = false;
    this.petsService.previewImportarDocx(file).subscribe({
      next: (preview) => {
        this.importandoDocx = false;
        input.value = '';

        const huboArbol = Object.keys(preview.seccionesArbol).length > 0;
        const huboTexto = Object.keys(preview.seccionesTexto).length > 0;
        const seccionesNoReconocidas = preview.seccionesNoReconocidas ?? {};
        const huboNoReconocidas = Object.keys(seccionesNoReconocidas).length > 0;

        // No depende de "seccionEncontrada" (eso solo indica si hubo algún marcador
        // CONOCIDO): un documento que solo trae encabezados no reconocidos también
        // debe mostrar la vista previa, para poder triar esos encabezados en vez de
        // caer al modo manual (que los ignoraría por completo).
        if (huboArbol || huboTexto || huboNoReconocidas) {
          const seccionesArbol: Record<string, PasoPreviewNodo[]> = {};
          for (const seccion of Object.keys(preview.seccionesArbol)) {
            const pasos = preview.seccionesArbol[seccion];
            const profundidades = calcularProfundidades(pasos);
            seccionesArbol[seccion] = pasos.map((p) => ({ ...p, profundidad: profundidades.get(p.indice) ?? 0 }));
          }
          this.previewSeccionesArbol = seccionesArbol;
          this.previewSeccionesTexto = { ...preview.seccionesTexto };
          this.previewNoReconocidas = Object.keys(seccionesNoReconocidas).map((titulo) => {
            const parrafos = seccionesNoReconocidas[titulo];
            const profundidades = calcularProfundidades(parrafos);
            return {
              titulo,
              parrafos: parrafos.map((p) => ({ ...p, profundidad: profundidades.get(p.indice) ?? 0 })),
              destino: '',
              destinoTipo: null,
            };
          });
          this.previewItemsCatalogo = [];
          this.cdr.markForCheck();
          return;
        }

        // No se detectó NINGÚN título de sección conocido: en vez de un error sin
        // salida, se ofrece elegir a mano los pasos de Procedimiento sobre todo el
        // contenido del documento.
        Swal.fire({
          icon: 'info',
          title: 'No detecté ninguna sección conocida automáticamente',
          text: 'Te muestro todo el documento para que marques tú mismo dónde empiezan y terminan los pasos del Procedimiento.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3500,
        });
        const profundidadesManual = calcularProfundidades(preview.todosLosParrafos);
        this.previewManual = preview.todosLosParrafos.map((p) => ({
          ...p,
          seleccionado: false,
          profundidad: profundidadesManual.get(p.indice) ?? 0,
        }));
        this.rangoDesde = null;
        this.rangoHasta = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.importandoDocx = false;
        input.value = '';
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  objectKeys(obj: Record<string, unknown> | null): string[] {
    return obj ? Object.keys(obj) : [];
  }

  labelDeSeccion(key: string): string {
    return this.tabs.find((t) => t.key === key)?.label ?? key;
  }

  quitarPreviewPaso(seccion: string, index: number): void {
    if (!this.previewSeccionesArbol?.[seccion]) return;
    this.previewSeccionesArbol[seccion] = this.previewSeccionesArbol[seccion].filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  // ── IMPORTAR DESDE WORD: secciones no reconocidas (triage manual) ────────
  // Opciones de destino para una sección no reconocida: cualquier pestaña real
  // salvo Anexos (es un archivo, no texto que se pueda pegar en un catálogo).
  readonly destinosNoReconocida = this.tabs.filter((t) => t.kind !== 'anexos' && t.kind !== 'firmas' && t.kind !== 'importar');

  subtiposDestino(destino: string): { value: string | null; label: string }[] {
    return this.catalogoTipos[destino] ?? [];
  }

  onDestinoNoReconocidaChange(bloque: SeccionNoReconocida): void {
    const tab = this.tabs.find((t) => t.key === bloque.destino);
    bloque.destinoTipo = tab?.kind === 'catalogo' ? (this.subtiposDestino(bloque.destino)[0]?.value ?? null) : null;
    // Default por fila = el tipo del bloque, pero cada fila lo puede cambiar antes de
    // enviar (ver comentario en PasoPreviewNodo.tipoOverride).
    for (const p of bloque.parrafos) p.tipoOverride = bloque.destinoTipo;
  }

  // Aplica un sub-tipo a TODAS las filas del bloque de un solo golpe — sin esto,
  // corregir un bloque de ~100 materiales que el importador clasificó por defecto
  // como "herramienta" obligaba a cambiar fila por fila.
  marcarTodosTipo(bloque: SeccionNoReconocida, tipo: string | null): void {
    for (const p of bloque.parrafos) p.tipoOverride = tipo;
    this.cdr.markForCheck();
  }

  aplicarNoReconocida(bloque: SeccionNoReconocida): void {
    if (!bloque.destino) return;
    const tab = this.tabs.find((t) => t.key === bloque.destino);
    if (!tab) return;

    if (tab.kind === 'arbol') {
      const actual = this.previewSeccionesArbol ?? {};
      this.previewSeccionesArbol = { ...actual, [tab.key]: [...(actual[tab.key] ?? []), ...bloque.parrafos] };
    } else if (tab.kind === 'texto') {
      const actual = this.previewSeccionesTexto ?? {};
      const previo = actual[tab.key] ?? '';
      const nuevo = bloque.parrafos.map((p) => p.texto).filter((t) => t.trim().length > 0);
      this.previewSeccionesTexto = { ...actual, [tab.key]: [previo, ...nuevo].filter((t) => t.trim().length > 0).join('\n\n') };
    } else if (tab.kind === 'catalogo') {
      const nuevos = bloque.parrafos
        .filter((p) => p.texto.trim().length > 0)
        .map((p) => ({ grupo: tab.key, tipo: p.tipoOverride ?? bloque.destinoTipo, descripcion: p.texto.trim(), agregarAlCatalogoGlobal: false }));
      this.previewItemsCatalogo = [...this.previewItemsCatalogo, ...nuevos];
    }

    this.previewNoReconocidas = this.previewNoReconocidas.filter((b) => b !== bloque);
    this.cdr.markForCheck();
  }

  // Quita UNA fila del bloque (ej. "Equipos"/"Herramientas"/"Materiales" como
  // encabezado de columna colado, que no es contenido real) sin descartar el resto —
  // "Descartar" a nivel de bloque tira todo, esto es más quirúrgico.
  quitarFilaNoReconocida(bloque: SeccionNoReconocida, p: PasoPreviewNodo): void {
    bloque.parrafos = bloque.parrafos.filter((x) => x !== p);
    if (bloque.parrafos.length === 0) this.previewNoReconocidas = this.previewNoReconocidas.filter((b) => b !== bloque);
    this.cdr.markForCheck();
  }

  descartarNoReconocida(bloque: SeccionNoReconocida): void {
    this.previewNoReconocidas = this.previewNoReconocidas.filter((b) => b !== bloque);
    this.cdr.markForCheck();
  }

  quitarItemCatalogoPreview(index: number): void {
    this.previewItemsCatalogo = this.previewItemsCatalogo.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  cancelarImportacion(): void {
    this.previewSeccionesArbol = null;
    this.previewSeccionesTexto = null;
    this.previewNoReconocidas = [];
    this.previewItemsCatalogo = [];
    this.cdr.markForCheck();
  }

  // Cuenta cuántos pasos existentes se perderían si se marca "reemplazar", sumando
  // solo las secciones en árbol que el documento realmente trajo.
  totalExistenteEnSeccionesDetectadas(): number {
    if (!this.previewSeccionesArbol || !this.detalle) return 0;
    let total = 0;
    if (this.previewSeccionesArbol['procedimiento']) total += this.detalle.pasos.length;
    if (this.previewSeccionesArbol['responsabilidades']) total += this.detalle.responsabilidades.length;
    if (this.previewSeccionesArbol['gestion_personal']) total += this.detalle.gestionPersonal.length;
    return total;
  }

  confirmarImportacion(): void {
    if (this.confirmandoImportacion) return;
    if (!this.previewSeccionesArbol && !this.previewSeccionesTexto && this.previewItemsCatalogo.length === 0) return;

    if (this.previewNoReconocidas.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Hay secciones sin asignar',
        text: `${this.previewNoReconocidas.length} encabezado(s) detectado(s) todavía no tienen un destino elegido — su contenido NO se va a importar si continúas.`,
        showCancelButton: true,
        confirmButtonText: 'Continuar de todos modos',
        cancelButtonText: 'Volver a revisar',
      }).then((res) => {
        if (res.isConfirmed) this.continuarConfirmarImportacion();
      });
      return;
    }
    this.continuarConfirmarImportacion();
  }

  // Antes, esta decisión dependía de que el usuario hubiera visto y marcado el
  // checkbox "Reemplazar existentes" al fondo de una lista que puede tener cientos
  // de filas — fácil de saltarse sin querer, y el resultado (agregar vs. reemplazar)
  // no se avisaba en ese caso. Ahora, si hay algo que se podría duplicar, SIEMPRE se
  // pregunta explícitamente en el momento de confirmar, sin importar si se llegó a
  // ver el checkbox o no.
  private continuarConfirmarImportacion(): void {
    const totalActual = this.totalExistenteEnSeccionesDetectadas();
    const hayCatalogoExistente = this.previewItemsCatalogo.length > 0;

    if (totalActual === 0 && !hayCatalogoExistente) {
      this.ejecutarConfirmarImportacion();
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Reemplazar lo que ya existe?',
      html: `
        ${totalActual > 0 ? `Hay <b>${totalActual}</b> paso(s) ya guardados en Procedimiento/Responsabilidades.<br>` : ''}
        ${hayCatalogoExistente ? 'También estás por triar ítems de Marco Legal/EPP/Recursos.<br>' : ''}
        <br>
        <b>Reemplazar</b>: borra lo existente antes de insertar lo nuevo — usa esto si estás corrigiendo una versión ya importada.<br>
        <b>Solo agregar</b>: suma lo nuevo sin tocar lo existente — puede duplicar contenido.
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Reemplazar',
      denyButtonText: 'Solo agregar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (res.isDismissed) return;
      this.reemplazarAlConfirmar = res.isConfirmed;
      this.ejecutarConfirmarImportacion();
    });
  }

  private ejecutarConfirmarImportacion(): void {
    // markForCheck() es imprescindible acá: esto corre dentro de un .then() de
    // SweetAlert2 (Reemplazar/Solo agregar), y en un componente OnPush cambiar una
    // propiedad ahí NO repinta la plantilla sola — sin este markForCheck, el overlay
    // de "Importando…" (*ngIf="confirmandoImportacion") se quedaba armado en el
    // estado pero invisible hasta que la respuesta HTTP disparaba otro ciclo de
    // detección de cambios por su cuenta, que es justo cuando ya no hacía falta.
    this.confirmandoImportacion = true;
    this.cdr.markForCheck();
    const seccionesArbol: Record<string, { indice: number; parentIndice?: number | null; tipo: string; texto: string; imagenBase64?: string; categoria?: string | null }[]> = {};
    for (const seccion of Object.keys(this.previewSeccionesArbol ?? {})) {
      seccionesArbol[seccion] = (this.previewSeccionesArbol ?? {})[seccion].map((p) => ({
        indice: p.indice,
        parentIndice: p.parentIndice,
        tipo: p.tipo,
        texto: p.texto,
        imagenBase64: p.imagenBase64,
        categoria: p.categoria,
      }));
    }

    this.conCarga(
      this.petsService.confirmarImportarDocx(this.id, {
        seccionesArbol,
        seccionesTexto: this.previewSeccionesTexto ?? {},
        reemplazar: this.reemplazarAlConfirmar,
        itemsCatalogo: this.previewItemsCatalogo,
      }),
    )
      .subscribe({
        next: () => {
          this.confirmandoImportacion = false;
          this.previewSeccionesArbol = null;
          this.previewSeccionesTexto = null;
          this.previewNoReconocidas = [];
          this.previewItemsCatalogo = [];
          Swal.fire({ icon: 'success', title: 'Documento importado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          this.load();
          // Cierra el modal de importación y lleva directo a Procedimiento, para revisar
          // lo recién importado — antes se quedaba en la pantalla de importar, ya vacía.
          this.seleccionarTab('procedimiento');
        },
        error: (err: HttpErrorResponse) => {
          this.confirmandoImportacion = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── IMPORTAR DESDE WORD: selección manual (respaldo) ─────────────────────
  get seleccionadosManual(): ParrafoSeleccionable[] {
    return this.previewManual?.filter((p) => p.seleccionado) ?? [];
  }

  toggleSeleccionManual(p: ParrafoSeleccionable): void {
    p.seleccionado = !p.seleccionado;
  }

  seleccionarRango(): void {
    if (!this.previewManual || this.rangoDesde === null || this.rangoHasta === null) return;
    const desde = Math.min(this.rangoDesde, this.rangoHasta);
    const hasta = Math.max(this.rangoDesde, this.rangoHasta);
    this.previewManual.forEach((p) => {
      if (p.indice >= desde && p.indice <= hasta) p.seleccionado = true;
    });
    this.cdr.markForCheck();
  }

  limpiarSeleccionManual(): void {
    this.previewManual?.forEach((p) => (p.seleccionado = false));
    this.cdr.markForCheck();
  }

  cancelarImportacionManual(): void {
    this.previewManual = null;
    this.rangoDesde = null;
    this.rangoHasta = null;
    this.cdr.markForCheck();
  }

  confirmarSeleccionManual(): void {
    if (this.confirmandoImportacion) return;
    const seleccionados = this.seleccionadosManual;
    if (seleccionados.length === 0) return;

    const totalActual = this.detalle?.pasos.length ?? 0;
    if (totalActual === 0) {
      this.ejecutarConfirmarSeleccionManual(seleccionados);
      return;
    }

    // Misma lógica que confirmarImportacion(): la decisión se pregunta SIEMPRE al
    // confirmar, no depende de haber visto el checkbox inline.
    Swal.fire({
      icon: 'question',
      title: '¿Reemplazar el Procedimiento actual?',
      html: `Ya hay <b>${totalActual}</b> paso(s) guardados.<br><br>
        <b>Reemplazar</b>: se eliminan antes de insertar los ${seleccionados.length} nuevos.<br>
        <b>Solo agregar</b>: los ${seleccionados.length} nuevos se suman a los existentes.`,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Reemplazar',
      denyButtonText: 'Solo agregar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (res.isDismissed) return;
      this.reemplazarAlConfirmar = res.isConfirmed;
      this.ejecutarConfirmarSeleccionManual(seleccionados);
    });
  }

  private ejecutarConfirmarSeleccionManual(seleccionados: ParrafoSeleccionable[]): void {
    this.confirmandoImportacion = true;
    this.cdr.markForCheck();
    this.conCarga(
      this.petsService.confirmarImportarDocx(this.id, {
        seccionesArbol: {
          procedimiento: seleccionados.map((p) => ({
            indice: p.indice,
            parentIndice: p.parentIndice,
            tipo: p.tipo,
            texto: p.texto,
            imagenBase64: p.imagenBase64,
          })),
        },
        seccionesTexto: {},
        reemplazar: this.reemplazarAlConfirmar,
        itemsCatalogo: [],
      }),
    )
      .subscribe({
        next: () => {
          this.confirmandoImportacion = false;
          this.previewManual = null;
          Swal.fire({ icon: 'success', title: 'Pasos importados', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          this.load();
          this.seleccionarTab('procedimiento');
        },
        error: (err: HttpErrorResponse) => {
          this.confirmandoImportacion = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── CATÁLOGO (Marco Legal / EPP / Recursos) ──────────────────────────────

  claveCatalogo(grupo: string, tipo: string | null): string {
    return claveCatalogo(grupo, tipo);
  }

  itemsPorTipo(grupo: string, tipo: string | null): PetItemSeleccionadoDto[] {
    if (!this.detalle) return [];
    const lista =
      grupo === 'marco_legal' ? this.detalle.marcoLegal : grupo === 'epp' ? this.detalle.epp : this.detalle.recursos;
    return (lista ?? []).filter((i) => (tipo == null ? true : i.tipo === tipo));
  }

  opcionesDisponibles(grupo: string, tipo: string | null): CatalogoItemDto[] {
    const seleccionadosIds = new Set(
      this.itemsPorTipo(grupo, tipo)
        .map((i) => i.catalogoItemId)
        .filter((id): id is number => id != null),
    );
    return (this.catalogoOpciones[claveCatalogo(grupo, tipo)] ?? []).filter((o) => !seleccionadosIds.has(o.id));
  }

  private cargarOpcionesCatalogo(grupo: string): void {
    const tipos = this.catalogoTipos[grupo] ?? [{ value: null, label: '' }];
    tipos.forEach((t) => {
      this.petsService.getCatalogo(grupo, t.value ?? undefined).subscribe({
        next: (items) => {
          this.catalogoOpciones[claveCatalogo(grupo, t.value)] = items;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  agregarDesdeCatalogo(grupo: string, tipo: string | null): void {
    const clave = claveCatalogo(grupo, tipo);
    const catalogoItemId = this.seleccionEnCurso[clave];
    if (!catalogoItemId) return;

    this.guardandoSeleccion[clave] = true;
    this.conCarga(
      this.petsService.seleccionarCatalogoItem(this.id, { grupo, tipo: tipo ?? undefined, catalogoItemId }),
    )
      .subscribe({
        next: () => {
          this.guardandoSeleccion[clave] = false;
          this.seleccionEnCurso[clave] = null;
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoSeleccion[clave] = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  agregarPersonalizado(grupo: string, tipo: string | null): void {
    const clave = claveCatalogo(grupo, tipo);
    const texto = (this.personalizadoTexto[clave] ?? '').trim();
    if (!texto) return;
    const agregarAlCatalogoGlobal = !!this.personalizadoAlCatalogo[clave];

    this.guardandoSeleccion[clave] = true;
    this.conCarga(
      this.petsService.agregarItemPersonalizado(this.id, { grupo, tipo: tipo ?? undefined, descripcion: texto, agregarAlCatalogoGlobal }),
    )
      .subscribe({
        next: () => {
          this.guardandoSeleccion[clave] = false;
          this.personalizadoTexto[clave] = '';
          this.personalizadoAlCatalogo[clave] = false;
          if (agregarAlCatalogoGlobal) this.cargarOpcionesCatalogo(grupo);
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoSeleccion[clave] = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // "Quitar" solo de este PETS — no toca el catálogo global.
  quitarSeleccion(item: PetItemSeleccionadoDto): void {
    Swal.fire({
      icon: 'warning',
      title: 'Quitar de este PETS',
      text: 'Deja de aparecer en este PETS. Si viene del catálogo global, sigue disponible para los demás.',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.conCarga(this.petsService.eliminarSeleccion(this.id, item.id)).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // Elimina (desactiva) del catálogo GLOBAL — afecta la disponibilidad futura
  // para TODOS los PETS, no solo este.
  eliminarDeCatalogoGlobal(item: PetItemSeleccionadoDto): void {
    if (item.catalogoItemId == null) return;
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar del catálogo global',
      text: 'Dejará de poder elegirse en CUALQUIER PETS a futuro. Los PETS que ya lo tenían seleccionado no se ven afectados.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar del catálogo',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.conCarga(this.petsService.desactivarCatalogoItem(item.catalogoItemId!)).subscribe({
        next: () => {
          this.cargarOpcionesCatalogo(item.grupo);
          this.load();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  // ── ANEXOS ────────────────────────────────────────────────────────────────

  anexoUrl(anexo: PetAnexoDto): string {
    return anexo.archivoUrl.startsWith('http') ? anexo.archivoUrl : `${this.apiOrigin}${anexo.archivoUrl}`;
  }

  onAnexoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const nombre = this.nuevoAnexoNombre.trim() || file.name;
    this.subiendoAnexo = true;
    this.conCarga(this.petsService.subirAnexo(this.id, nombre, file)).subscribe({
      next: () => {
        this.subiendoAnexo = false;
        this.nuevoAnexoNombre = '';
        input.value = '';
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoAnexo = false;
        input.value = '';
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  eliminarAnexo(anexo: PetAnexoDto): void {
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar anexo',
      text: `¿Eliminar "${anexo.nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.conCarga(this.petsService.eliminarAnexo(this.id, anexo.id)).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
