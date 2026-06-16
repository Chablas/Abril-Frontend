/**
 * Roles de usuario de la aplicación (cross-cutting).
 *
 * Centraliza los strings exactos de roles para evitar "magic strings" repartidos
 * por componentes, guards y servicios. El emparejamiento de roles es **sensible a
 * mayúsculas/acentos** (string exacto del claim JWT), así que estos valores deben
 * coincidir literalmente con los que emite el backend.
 *
 * Uso:
 *   import { Roles } from 'src/app/core/constants/roles';
 *   this.authService.hasRole(Roles.COSTOS_OFICINA_CENTRAL);
 */
export const Roles = {
  COSTOS_ADMINISTRADOR:   'ADMINISTRADOR DE COSTOS Y PRESUPUESTOS',
  COSTOS_OFICINA_CENTRAL: 'USUARIO DE COSTOS Y PRESUPUESTOS DE OFICINA CENTRAL',
  COSTOS_OFICINA_TECNICA: 'USUARIO DE COSTOS Y PRESUPUESTOS DE OFICINA TÉCNICA',
  ADMINISTRADOR_DE_OBRA:  'ADMINISTRADOR DE OBRA',
  // Agrega aquí los demás roles a medida que se necesiten, p. ej.:
  // ADMINISTRADOR_SISTEMA: 'ADMINISTRADOR DEL SISTEMA',
  // ADMINISTRADOR_UDP:     'ADMINISTRADOR DE UDP',
  // USUARIO_UDP:           'USUARIO DE UDP',
} as const;

/** Unión de los valores literales de rol (para tipar parámetros que esperen un rol). */
export type Role = (typeof Roles)[keyof typeof Roles];
