import { Roles } from './roles';

/**
 * Quién crea y edita proyectos, y quién asigna su residente. El resto de los roles ve los
 * proyectos en solo lectura. Se decide por rol, sin una feature aparte.
 *
 * El residente va por separado porque da permisos: el Cronograma de Hitos deja subir versiones
 * solo al residente de la obra. Por eso el RESIDENTE edita proyectos pero no cambia quién es el
 * residente, ni en Configuración → Proyectos ni en Gestión de responsables.
 *
 * Espejo del backend `Shared/Constants/ProyectoRoles.cs`: mantener ambos alineados. El backend es
 * el que manda; esto solo decide qué se muestra editable.
 */
export const ROLES_EDITAN_PROYECTOS: readonly string[] = [
  Roles.ADMINISTRADOR_SISTEMA,
  Roles.JEFE_PROYECTOS,
  Roles.COORDINADOR_PROYECTOS,
  Roles.GERENTE_INMOBILIARIO,
  Roles.RESIDENTE,
];

export const ROLES_ASIGNAN_RESIDENTE: readonly string[] = [
  Roles.ADMINISTRADOR_SISTEMA,
  Roles.JEFE_PROYECTOS,
  Roles.COORDINADOR_PROYECTOS,
  Roles.GERENTE_INMOBILIARIO,
];
