import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { Roles } from '../constants/roles';
import { EvJefeSsomaService } from '../../features/evaluaciones/services/ev-jefe-ssoma.service';
import { EvPeriodoDto } from '../../features/evaluaciones/dtos/ev-jefe-ssoma.model';

/**
 * Evaluación anónima obligatoria al Jefe SSOMA (Flujo B): mientras haya un período
 * activo y el usuario (Coordinador/Prevencionista SSOMA) no la haya completado, se
 * bloquea el resto del sistema con un banner de pantalla completa hasta que la
 * registre — mismo criterio que las charlas SSOMA obligatorias del contratista.
 */
@Injectable({ providedIn: 'root' })
export class EvJefeSsomaBannerService {
  private auth = inject(AuthService);
  private svc = inject(EvJefeSsomaService);

  private debeEvaluarSubject = new BehaviorSubject<boolean>(false);
  readonly debeEvaluar$ = this.debeEvaluarSubject.asObservable();

  periodo: EvPeriodoDto | null = null;
  private consultado = false;

  get aplicaParaUsuario(): boolean {
    const roles = this.auth.getRoles();
    return roles.includes(Roles.COORDINADOR_SSOMA) || roles.includes(Roles.PREVENCIONISTA);
  }

  verificar(): void {
    if (!this.aplicaParaUsuario) {
      this.debeEvaluarSubject.next(false);
      return;
    }

    this.svc.getInicio().subscribe({
      next: (data) => {
        this.periodo = data.periodo;
        this.consultado = true;
        this.debeEvaluarSubject.next(!!data.periodo && !data.yaEvalue);
      },
      error: () => {
        // Si falla la consulta no bloqueamos el sistema por un error de red/servidor.
        this.debeEvaluarSubject.next(false);
      },
    });
  }

  marcarCompletado(): void {
    this.debeEvaluarSubject.next(false);
  }

  reset(): void {
    this.consultado = false;
    this.periodo = null;
    this.debeEvaluarSubject.next(false);
  }
}
