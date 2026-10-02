import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';

/**
 * Estado de la cuenta con la que el propietario entra a la app Convivir Abril. Lo calcula el
 * backend (GestionPropietariosRepository.GetPaged), en este orden.
 */
export type PropietarioAcceso = 'SIN_CUENTA' | 'SIN_ROL' | 'PENDIENTE' | 'DESACTIVADO' | 'ACTIVO';

export interface PropietarioProyectoDto {
  projectId: number;
  projectDescription: string;
}

export interface PropiedadDto {
  propietarioId: number;
  personId: number;
  projectId: number;
  proyecto: string;
  torre: string | null;
  departamento: string;
}

export interface PropietarioListItemDto {
  personId: number;
  userId: number | null;
  dni: string | null;
  firstNames: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
  fullName: string | null;
  /** Correo de la cuenta: ahí le llegan la invitación y la recuperación de contraseña. */
  email: string | null;
  phoneNumber: number | null;
  acceso: PropietarioAcceso;
  /** Sin otro rol que PROPIETARIO: su correo se edita desde acá (si no, desde Seguridad → Usuarios). */
  soloPropietario: boolean;
  propiedades: PropiedadDto[];
}

/** Carga inicial: proyectos (filtro y formulario) + primera página. */
export interface PropietariosInitDto {
  proyectos: PropietarioProyectoDto[];
  propietarios: PagedResponseDTO<PropietarioListItemDto>;
}

export interface PropiedadGuardarDto {
  /** null en una propiedad nueva. */
  propietarioId: number | null;
  projectId: number;
  torre: string | null;
  departamento: string;
}

export interface PropietarioCreateDto {
  dni: string;
  firstNames: string;
  firstLastName: string;
  secondLastName: string | null;
  email: string;
  phoneNumber: number | null;
  propiedades: PropiedadGuardarDto[];
}

/** El DNI no se edita: es con lo que entra a la app. */
export type PropietarioUpdateDto = Omit<PropietarioCreateDto, 'dni'>;

export interface PropietarioGuardadoDto {
  personId: number;
  invitacionEnviadaA: string | null;
  /** Quedó guardado pero el correo de invitación falló: hay que reenviarlo. */
  invitacionFallida: boolean;
}

/** Lupa del DNI: la persona del sistema (GTH, Seguridad) o los datos de RENIEC. */
export interface PropietarioPersonaDto {
  fuente: 'SISTEMA' | 'RENIEC' | 'NINGUNA';
  personId: number | null;
  firstNames: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
  email: string | null;
  phoneNumber: number | null;
  /** Ya tiene usuario: se reusa y su correo no se cambia desde acá. */
  tieneUsuario: boolean;
  /** Ya está en la lista: se edita desde la tabla. */
  yaEsPropietario: boolean;
}
