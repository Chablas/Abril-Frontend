import { Component } from '@angular/core';

import { FirmaPersonal } from '../../../../../shared/components/firma-personal/firma-personal';

/**
 * Mi Perfil → Mi Firma: la firma personal del usuario, la que se estampa en todo lo que firma en la
 * intranet. Hasta el 2026-09-22 vivía en Gestión Administrativa → Configuración → Tu firma.
 *
 * Ofrece las formas de registrarla (subir una imagen, dibujarla o las dos) que hoy tenga marcadas
 * Consolidados → Configuración → Firmas: la misma regla que el modal que salta al firmar sin firma,
 * así lo que se registra acá sirve para firmar.
 */
@Component({
  selector: 'app-mi-firma',
  standalone: true,
  imports: [FirmaPersonal],
  templateUrl: './mi-firma.html',
})
export class MiFirma {}
