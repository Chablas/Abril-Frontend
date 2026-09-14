/**
 * Piezas con las que los detalles de Seguridad (funcionalidad, rol y usuario) cuentan quién tiene
 * acceso a qué. El backend lee el acceso igual que al iniciar sesión: usuario → rol → funcionalidad,
 * sin asignaciones ni roles eliminados, y sin usuarios eliminados.
 */

/** Rol por el que llega un acceso: el «vía» de un usuario o de una funcionalidad. */
export interface RoleRefDto {
  roleId: number;
  roleDescription: string;
}

/** Rol con lo que reparte. */
export interface AccessRoleDto {
  roleId: number;
  roleDescription: string;
  usersCount: number;
  featuresCount: number;
}

/**
 * Usuario con acceso. Uno desactivado conserva sus roles y se lista igual: no puede iniciar
 * sesión, pero recupera el acceso al reactivarlo.
 */
export interface AccessUserDto {
  userId: number;
  email: string;
  displayName: string | null;
  active: boolean;
  /** Roles que le dan el acceso. Null cuando el rol ya es el contexto (detalle de un rol). */
  viaRoles: RoleRefDto[] | null;
}

/** Funcionalidad a la que se tiene acceso. */
export interface AccessFeatureDto {
  featureId: number;
  featureKey: string;
  moduleId: number | null;
  moduleName: string | null;
  /** Roles que la dan. Null cuando el rol ya es el contexto (detalle de un rol). */
  viaRoles: RoleRefDto[] | null;
}
