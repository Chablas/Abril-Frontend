/**
 * DTOs de Configuración → Bancos. Espejo de
 * `Features/ConfigurationModule/Features/BancoFeature/Application/Dtos/BancoDtos.cs`.
 */

export interface Banco {
  id: number;
  /** Clave estable (BCP, BBVA…). Se define al crear y ya no se edita. */
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
  /** Razones sociales del grupo que hoy trabajan con este banco. Un banco en uso no se elimina. */
  razonesSociales: number;
}

export interface BancoUpsert {
  /** Solo viaja en el alta: en la edición el código no se toca. */
  codigo?: string;
  nombre: string;
  orden: number;
  activo: boolean;
}
