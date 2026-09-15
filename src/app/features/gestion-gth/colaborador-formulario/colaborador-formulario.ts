import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../shared/components/date-picker/date-picker';
import { ColaboradorFormularioService } from './services/colaborador-formulario.service';
import {
  ColaboradorFormularioPublico,
  ColaboradorFormularioRespuestas,
  OpcionFormulario,
  RazonSocialOpcion,
  respuestasVacias,
} from './dtos/colaborador-formulario.dto';

/**
 * Página PÚBLICA del formulario «Nuevos Talentos» (acceso por token, sin login). Es lo que abre el
 * correo de bienvenida del onboarding y reemplaza al Microsoft Forms del mismo nombre.
 *
 * NO vuelve a preguntar lo que el formulario del postulante ya capturó —nombre, documento, fecha
 * de nacimiento, celular, distrito, estado civil, estudios—: eso se muestra en un panel de solo
 * lectura para que el colaborador lo verifique. Lo que se pide acá es lo que recién existe ahora
 * que entra.
 */
@Component({
  standalone: true,
  selector: 'app-colaborador-formulario',
  imports: [CommonModule, FormsModule, SearchSelect, DatePicker],
  templateUrl: './colaborador-formulario.html',
  styleUrl: './colaborador-formulario.css',
})
export class ColaboradorFormulario implements OnInit {
  /** Color de acento del formulario (verde de la marca Abril). */
  readonly accent = 'var(--color-abril-primary-dark)';

  token = '';
  cargando = true;
  enviando = false;
  errorCarga = false;
  mensajeError = '';
  /** true cuando el colaborador envió el formulario (pantalla de agradecimiento). */
  enviado = false;

  data: ColaboradorFormularioPublico | null = null;
  model: ColaboradorFormularioRespuestas = respuestasVacias();

  /** Largo máximo del número de celular (9 dígitos), igual que en el resto del sistema. */
  readonly celularLargo = 9;

  /**
   * Cantidad de hijos. Se guarda como entero («Más de 3» → 4, el número exacto lo confirma GTH)
   * para que la columna no termine siendo un catálogo de textos.
   *
   * Los `id` del desplegable NO son la cantidad: arrancan en 1 porque app-search-select trata el
   * valor 0 como "sin selección" —muestra el placeholder y no deja limpiar—, así que «0 hijos»
   * se vería como un campo vacío que sin embargo pasa la validación. `hijos` es el valor real que
   * se guarda.
   */
  readonly opcionesHijos: { id: number; nombre: string; hijos: number }[] = [
    { id: 1, nombre: '0 hijos', hijos: 0 },
    { id: 2, nombre: '1 hijo', hijos: 1 },
    { id: 3, nombre: '2 hijos', hijos: 2 },
    { id: 4, nombre: '3 hijos', hijos: 3 },
    { id: 5, nombre: 'Más de 3 hijos', hijos: 4 },
  ];

  /** Opción elegida en el desplegable de hijos (su `id`, no la cantidad). */
  opcionHijos: number | null = null;

  paso = 1;
  readonly totalPasos = 7;
  readonly pasosNombres = [
    'Datos personales',
    'Información laboral',
    'Pago de haberes',
    'Información complementaria',
    'Renta de 5ta',
    'Examen médico',
    'Consentimiento',
  ];

  constructor(
    private route: ActivatedRoute,
    private service: ColaboradorFormularioService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorCarga = true;
      this.mensajeError = 'El enlace del formulario no es válido.';
      this.cargando = false;
      return;
    }
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    // App zoneless: forzamos el refresco para que el formulario aparezca sin un click extra.
    this.service.getPublico(this.token).subscribe({
      next: (data) => {
        this.data = data;
        this.model = { ...respuestasVacias(), ...data.respuestas };
        this.opcionHijos =
          this.opcionesHijos.find((o) => o.hijos === this.model.numeroHijos)?.id ?? null;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError =
          err.error?.message ?? 'No se pudo cargar el formulario. Verifica el enlace e inténtalo de nuevo.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Catálogos (atajos para el template) ─────────────────────────────────
  get puestos(): OpcionFormulario[] { return this.data?.puestos ?? []; }
  get ubicaciones(): OpcionFormulario[] { return this.data?.ubicaciones ?? []; }
  get razonesSociales(): RazonSocialOpcion[] { return this.data?.razonesSociales ?? []; }
  get sexos(): OpcionFormulario[] { return this.data?.sexos ?? []; }
  get tallasCalzado(): OpcionFormulario[] { return this.data?.tallasCalzado ?? []; }
  get tallas(): OpcionFormulario[] { return this.data?.tallas ?? []; }
  get rentaQuinta(): OpcionFormulario[] { return this.data?.rentaQuinta ?? []; }

  // ── Pago de haberes ─────────────────────────────────────────────────────
  /** Razón social elegida, que es de donde sale el banco de la pregunta siguiente. */
  get razonSocial(): RazonSocialOpcion | null {
    return this.razonesSociales.find((r) => r.id === this.model.contributorId) ?? null;
  }

  /**
   * Banco con el que trabaja su razón social. null cuando todavía no eligió una o cuando esa razón
   * social no tiene banco cargado en Configuración: en ese caso no se le pregunta nada, porque no
   * se le puede decir en qué banco se le abriría la cuenta.
   */
  get banco(): string | null {
    return this.razonSocial?.bancoNombre ?? null;
  }

  /** Traduce la opción elegida a la cantidad que se guarda. */
  onHijosChange(id: number | null): void {
    this.opcionHijos = id;
    this.model.numeroHijos = this.opcionesHijos.find((o) => o.id === id)?.hijos ?? null;
  }

  // ── Número de celular (solo dígitos) ────────────────────────────────────
  /** Filtra lo tecleado en el celular de emergencia: solo dígitos y máximo 9. */
  onCelularEmergenciaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = (input.value ?? '').replace(/\D/g, '').slice(0, this.celularLargo);
    if (input.value !== limpio) input.value = limpio;
    this.model.celularEmergencia = limpio;
  }

  // ── Fechas ──────────────────────────────────────────────────────────────
  /**
   * El EMO es de ENTRADA: se da antes del primer día. El `[max]` del date-picker ya lo bloquea,
   * pero no toca lo que ya estaba puesto, así que al mover la fecha de ingreso se limpia un EMO
   * que quedó después.
   */
  onFechaIngresoChange(fecha: string | null): void {
    this.model.fechaIngreso = fecha;
    if (this.emoDespuesDelIngreso) this.model.fechaEmo = null;
  }

  /** true si hay ambas fechas y el EMO cae después del ingreso (las fechas son 'YYYY-MM-DD'). */
  get emoDespuesDelIngreso(): boolean {
    const ingreso = this.model.fechaIngreso;
    const emo = this.model.fechaEmo;
    return !!ingreso && !!emo && emo > ingreso;
  }

  // ── Validación por paso ─────────────────────────────────────────────────
  private lleno(v: string | null): boolean {
    return !!v && v.trim().length > 0;
  }

  get datosPersonalesValidos(): boolean {
    return this.lleno(this.model.direccion);
  }

  get laboralValida(): boolean {
    const m = this.model;
    return (
      !!m.puestoId &&
      !!m.fechaIngreso &&
      m.remuneracionMensual !== null && m.remuneracionMensual > 0 &&
      !!m.ubicacionId &&
      !!m.contributorId
    );
  }

  /**
   * Sin banco cargado no hay pregunta que responder, así que el paso queda válido: no se puede
   * exigir una respuesta que la pantalla no está mostrando.
   */
  get haberesValidos(): boolean {
    return !this.banco || this.model.cuentaSueldo !== null;
  }

  get complementariaValida(): boolean {
    const m = this.model;
    return (
      !!m.sexoId &&
      this.lleno(m.contactoEmergencia) &&
      this.lleno(m.celularEmergencia) &&
      m.numeroHijos !== null &&
      !!m.tallaCalzadoId &&
      !!m.tallaId &&
      m.usaLentes !== null &&
      this.lleno(m.hobbies)
    );
  }

  get rentaValida(): boolean {
    return !!this.model.rentaQuintaId;
  }

  get emoValido(): boolean {
    return !!this.model.fechaEmo && !this.emoDespuesDelIngreso;
  }

  get puedeEnviar(): boolean {
    return this.model.declaracionVeracidad === true;
  }

  get pasoActualValido(): boolean {
    switch (this.paso) {
      case 1: return this.datosPersonalesValidos;
      case 2: return this.laboralValida;
      case 3: return this.haberesValidos;
      case 4: return this.complementariaValida;
      case 5: return this.rentaValida;
      case 6: return this.emoValido;
      case 7: return this.puedeEnviar;
      default: return false;
    }
  }

  // ── Navegación ──────────────────────────────────────────────────────────
  siguiente(): void {
    if (!this.pasoActualValido) {
      this.avisoIncompleto();
      return;
    }
    if (this.paso < this.totalPasos) {
      this.paso++;
      this.scrollTop();
    }
  }

  anterior(): void {
    if (this.paso > 1) {
      this.paso--;
      this.scrollTop();
    }
  }

  private scrollTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private avisoIncompleto(): void {
    // El EMO después del ingreso sí está "completo": con el mensaje genérico el colaborador
    // buscaría un campo vacío que no existe.
    if (this.paso === 6 && this.emoDespuesDelIngreso) {
      this.aviso(
        'Revisa la fecha de tu EMO',
        'El examen médico de entrada se da ANTES de tu fecha de ingreso: elige un día anterior.',
      );
      return;
    }

    // El consentimiento no es un campo que se complete sino una declaración que se marca.
    if (this.paso === 7) {
      this.aviso(
        'Declaración requerida',
        'Debes declarar que la información consignada es veraz para enviar el formulario.',
      );
      return;
    }

    this.aviso('Faltan datos', 'Completa los campos obligatorios de esta sección antes de continuar.');
  }

  private aviso(title: string, text: string): void {
    Swal.fire({ icon: 'warning', title, text, confirmButtonColor: 'var(--color-abril-primary-dark)' });
  }

  enviar(): void {
    if (!this.puedeEnviar) {
      this.avisoIncompleto();
      return;
    }

    this.enviando = true;
    // App zoneless: forzamos el refresco para reflejar el estado de envío y la pantalla final.
    this.service.guardarPublico(this.token, this.model).subscribe({
      next: () => {
        this.enviando = false;
        this.enviado = true;
        this.cdr.detectChanges();
        this.scrollTop();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'No se pudo enviar',
          text: err.error?.message ?? 'Ocurrió un error al enviar el formulario. Inténtalo nuevamente.',
          confirmButtonColor: 'var(--color-abril-primary-dark)',
        });
      },
    });
  }

  /** Setea una respuesta Sí/No. */
  setBool(campo: 'cuentaSueldo' | 'usaLentes' | 'declaracionVeracidad', valor: boolean): void {
    this.model[campo] = valor;
  }
}
