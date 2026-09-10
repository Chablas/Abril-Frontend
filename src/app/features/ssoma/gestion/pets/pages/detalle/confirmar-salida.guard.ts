import { CanDeactivateFn } from '@angular/router';
import Swal from 'sweetalert2';
import { PetsDetalle } from './pets-detalle';

// Antes, editar una sección narrativa y navegar fuera sin guardar perdía el
// cambio en silencio. Este guard corre al salir de /pets/:id dentro de la app
// (volver a la lista, ir a otra ruta) y pregunta antes de descartar el cambio.
// Cerrar o recargar la pestaña del navegador no pasa por acá — eso lo cubre el
// HostListener de beforeunload en el propio componente.
export const confirmarSalidaSinGuardarGuard: CanDeactivateFn<PetsDetalle> = async (component) => {
  if (!component.hayCambiosSinGuardar()) return true;

  const res = await Swal.fire({
    icon: 'warning',
    title: 'Tienes cambios sin guardar',
    text: 'El texto que escribiste en una sección todavía no se guardó — si sales ahora, se perderá.',
    showCancelButton: true,
    confirmButtonText: 'Salir sin guardar',
    cancelButtonText: 'Quedarme',
  });
  return res.isConfirmed;
};
