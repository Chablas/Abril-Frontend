/**
 * DTOs del formulario «Nuevos Talentos» del colaborador que entra. Espejo de
 * `Features/GestionGthModule/Features/OnboardingFeature/Application/Dtos/OnboardingFormularioDtos.cs`.
 *
 * Es la página pública que abre el correo de bienvenida: acceso por token, sin login.
 */

export interface OpcionFormulario {
  id: number;
  nombre: string;
}

/** Razón social del grupo con el banco que le corresponde (define la pregunta de la cuenta sueldo). */
export interface RazonSocialOpcion extends OpcionFormulario {
  bancoNombre: string | null;
}

/** Lo que el proceso ya capturó del colaborador y el formulario solo muestra. */
export interface DatosRegistrados {
  nombresCompletos: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
  numeroCelular: string | null;
  distrito: string | null;
  estadoCivil: string | null;
  correoElectronico: string | null;
}

/** Todo lo que la página necesita al abrirse, en una sola petición. */
export interface ColaboradorFormularioPublico {
  nombre: string;
  codigo: string;
  puesto: string | null;
  area: string | null;
  proyectoObra: string | null;
  fechaLimite: string | null;
  /** true cuando ya lo envió: la página pasa a solo lectura. */
  soloLectura: boolean;

  datosRegistrados: DatosRegistrados;

  puestos: OpcionFormulario[];
  ubicaciones: OpcionFormulario[];
  razonesSociales: RazonSocialOpcion[];
  sexos: OpcionFormulario[];
  tallasCalzado: OpcionFormulario[];
  tallas: OpcionFormulario[];
  rentaQuinta: OpcionFormulario[];

  respuestas: ColaboradorFormularioRespuestas;
}

/** Las respuestas del formulario. Mismo shape de ida y de vuelta. */
export interface ColaboradorFormularioRespuestas {
  direccion: string | null;

  puestoId: number | null;
  fechaIngreso: string | null;
  remuneracionMensual: number | null;
  ubicacionId: number | null;
  contributorId: number | null;

  cuentaSueldo: boolean | null;

  sexoId: number | null;
  contactoEmergencia: string | null;
  celularEmergencia: string | null;
  numeroHijos: number | null;
  tallaCalzadoId: number | null;
  tallaId: number | null;
  usaLentes: boolean | null;
  hobbies: string | null;

  rentaQuintaId: number | null;
  fechaEmo: string | null;

  declaracionVeracidad: boolean | null;
}

export function respuestasVacias(): ColaboradorFormularioRespuestas {
  return {
    direccion: null,
    puestoId: null,
    fechaIngreso: null,
    remuneracionMensual: null,
    ubicacionId: null,
    contributorId: null,
    cuentaSueldo: null,
    sexoId: null,
    contactoEmergencia: null,
    celularEmergencia: null,
    numeroHijos: null,
    tallaCalzadoId: null,
    tallaId: null,
    usaLentes: null,
    hobbies: null,
    rentaQuintaId: null,
    fechaEmo: null,
    declaracionVeracidad: null,
  };
}
