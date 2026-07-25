import { Component, HostListener, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionItem } from './notificaciones.dto';

/**
 * Campanita de notificaciones del encabezado (lado derecho de app-abril-page-header):
 * badge rojo con el nº de no leídas + panel desplegable con pestañas Todo / En proceso /
 * Atendido. Click en una notificación no leída la marca leída y "apaga sus colores";
 * "Marcar leídas" atiende todas de una vez.
 */
@Component({
  standalone: true,
  selector: 'app-notificaciones-bell',
  imports: [CommonModule],
  templateUrl: './notificaciones-bell.html',
})
export class NotificacionesBell implements OnInit {
  abierto = false;
  tab: 'todo' | 'proceso' | 'atendido' = 'todo';

  private readonly platformId = inject(PLATFORM_ID);

  constructor(public svc: NotificacionesService) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) this.svc.cargar();
  }

  togglePanel(event: MouseEvent): void {
    event.stopPropagation();
    this.abierto = !this.abierto;
    if (this.abierto) {
      this.tab = 'todo';
      this.svc.cargar(true); // refresco al abrir
    }
  }

  @HostListener('document:click')
  cerrarPanel(): void {
    this.abierto = false;
  }

  get filtradas(): NotificacionItem[] {
    switch (this.tab) {
      case 'proceso':  return this.svc.notificaciones.filter((n) => !n.leida);
      case 'atendido': return this.svc.notificaciones.filter((n) => n.leida);
      default:         return this.svc.notificaciones;
    }
  }

  onItemClick(n: NotificacionItem): void {
    this.svc.marcarLeida(n);
  }

  /** Iniciales del avatar a partir del nombre de quien generó el evento. */
  iniciales(nombre: string | null): string {
    if (!nombre?.trim()) return '·';
    const partes = nombre.trim().split(/\s+/);
    const primera = partes[0]?.charAt(0) ?? '';
    const segunda = partes[1]?.charAt(0) ?? '';
    return (primera + segunda).toUpperCase() || '·';
  }
}
