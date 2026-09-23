import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ConsolidadosService } from '../services/consolidados.service';
import { ConsolidadoListItemDto } from '../dtos/consolidado.dto';
import { confirmarConCorreos, pedirAvisos } from '../../../shared/confirmar-correos';

/** Lo que necesitan los trámites para correr: los servicios que ya tiene cada componente. */
export interface TramitesDeps {
  service: ConsolidadosService;
  loader: LoaderService;
  errorService: ErrorService;
}

// Los dos trámites del consolidador sobre un consolidado —avisarle a la jefatura y pedirle la
// corrección al Coordinador ERP—. Los disparan la fila de la tabla y el detalle, así que viven acá
// y no repetidos en los dos componentes.
//
// En los dos el correo ES la acción: el backend corta con 409 si no le llega a nadie, así que sin
// destinatarios se dice por qué en vez de dejar confirmar. Devuelven true si se hizo, para que
// quien los llamó recargue lo que muestra.

/** Le avisa a la jefatura que el consolidado tiene reembolsos esperando su visto bueno. */
export async function avisarJefatura(deps: TramitesDeps, c: ConsolidadoListItemDto): Promise<boolean> {
  if (!c.puedeAvisarJefatura) return false;

  const avisos = await pedirAvisos(deps.service.correoPreview({
    consolidadoIds: [c.id],
    aprobar: false,
    accion: 'AVISO_JEFATURA',
  }));
  if (avisos.length === 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Nadie recibiría el aviso',
      text: 'Está apagado en Configuración → Correos o la jefatura no tiene correo registrado.',
      confirmButtonColor: '#0F6E56',
    });
    return false;
  }

  const result = await confirmarConCorreos({
    titulo: c.jefaturaAvisadaAt ? '¿Volver a avisar a la jefatura?' : '¿Avisar a la jefatura?',
    // Solo cuando es una repetición: el resto del tiempo el título ya lo dice todo.
    nota: c.jefaturaAvisadaAt ? 'Ya le avisaste por este consolidado.' : undefined,
    avisos,
    confirmButtonText: c.jefaturaAvisadaAt ? 'Sí, avisar de nuevo' : 'Sí, avisar',
  });
  if (!result.isConfirmed) return false;

  return ejecutar(deps, deps.service.notificarJefatura(c.id));
}

/**
 * Le pide al Coordinador ERP que corrija el registro del S10. Es el camino para cuando la
 * observación no se resuelve volviendo a adjuntar el consolidado porque el arreglo está dentro del
 * S10.
 */
export async function solicitarCorreccionErp(
  deps: TramitesDeps,
  c: ConsolidadoListItemDto,
): Promise<boolean> {
  if (!c.puedeSolicitarCorreccion) return false;

  const avisos = await pedirAvisos(deps.service.correoPreview({
    consolidadoIds: [c.id],
    aprobar: false,
    accion: 'CORRECCION_ERP',
  }));
  if (avisos.length === 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Nadie recibiría la solicitud',
      text: 'No hay ningún Coordinador ERP con correo registrado. Avisa al administrador del sistema.',
      confirmButtonColor: '#0F6E56',
    });
    return false;
  }

  const { value: motivo, isConfirmed } = await confirmarConCorreos({
    titulo: '¿Solicitar la corrección al ERP?',
    avisos,
    observacion: {
      label: 'Motivo',
      placeholder: 'Qué necesitas que corrija en el S10…',
    },
    confirmButtonText: 'Sí, solicitar',
  });
  if (!isConfirmed || !motivo) return false;

  return ejecutar(deps, deps.service.solicitarCorreccionS10(c.id, motivo));
}

function ejecutar(deps: TramitesDeps, peticion: Observable<{ message: string }>): Promise<boolean> {
  deps.loader.show();
  return firstValueFrom(peticion).then(
    (res) => {
      deps.loader.hide();
      Swal.fire({ icon: 'success', title: res.message, timer: 2200, showConfirmButton: false });
      return true;
    },
    (err: HttpErrorResponse) => {
      deps.loader.hide();
      deps.errorService.handleError(err);
      return false;
    },
  );
}
