import { AccessRoleDto, AccessUserDto } from '../../../shared/dtos/access.dto';

/** Una fila de Seguridad → Funcionalidades, tal como llega del backend. */
export interface FuncionalidadListItemDto {
  featureId: number;
  featureKey: string;
  moduleId: number | null;
  moduleName: string | null;
  /** Roles que la tienen asignada. */
  rolesCount: number;
  /** Usuarios que la reciben por alguno de esos roles, cada uno contado una vez. */
  usersCount: number;
}

/** La fila con los textos ya resueltos para mostrar, buscar y ordenar. */
export interface FuncionalidadRow extends FuncionalidadListItemDto {
  /** Nombre legible (el del sidebar); el featureKey queda como texto secundario. */
  label: string;
  /** Nombre del módulo, o «Sin módulo asignado». */
  moduleLabel: string;
}

/** Detalle de una funcionalidad: los roles que la tienen y quiénes acceden por ellos. */
export interface FuncionalidadDetalleDto {
  featureId: number;
  featureKey: string;
  moduleId: number | null;
  moduleName: string | null;
  roles: AccessRoleDto[];
  users: AccessUserDto[];
}
