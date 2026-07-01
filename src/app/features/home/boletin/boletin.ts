import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BirthdayClub } from './birthday-club/birthday-club';

type TabKey = 'inicio' | 'somos-abril' | 'efemerides' | 'bienestar' | 'novedades' | 'opina';

interface Tab {
  key: TabKey;
  label: string;
}

interface TarjetaSomosAbril {
  titulo: string;
  descripcion: string;
  img: string;
}

/**
 * Boletín interno "Vive Abril". Se muestra a los trabajadores de Abril al entrar
 * a inicio. Arranca con una portada animada (overlay) que aparece una vez por
 * sesión; al pulsar "¡VAMOS!" se entra al boletín con sus pestañas. Un botón
 * flotante (esquina inferior derecha) permite ir al dashboard en cualquier momento.
 */
@Component({
  selector: 'app-boletin',
  standalone: true,
  imports: [BirthdayClub],
  templateUrl: './boletin.html',
  styleUrl: './boletin.css',
})
export class Boletin implements OnInit {
  /** Clave de sessionStorage para mostrar la portada solo una vez por sesión. */
  private static readonly PORTADA_KEY = 'boletin_portada_vista';

  readonly tabs: Tab[] = [
    { key: 'inicio', label: 'INICIO' },
    { key: 'somos-abril', label: 'SOMOS ABRIL' },
    { key: 'efemerides', label: 'EFEMÉRIDES' },
    { key: 'bienestar', label: 'BIENESTAR' },
    { key: 'novedades', label: 'NOVEDADES' },
    { key: 'opina', label: 'OPINA' },
  ];

  readonly tarjetas: TarjetaSomosAbril[] = [
    {
      titulo: 'THE BIRTHDAY CLUB',
      descripcion: '¡Descubre los protagonistas de <strong>Abril, Mayo y Junio</strong>!',
      img: '/images/inicio/perro-cumpleanero.webp',
    },
    {
      titulo: 'NUEVOS TALENTOS',
      descripcion:
        '<strong>Nuevas ideas</strong>, misma pasión. Conoce quiénes se sumaron a <strong>ABRIL</strong>.',
      img: '/images/inicio/perro-ropa-azul.webp',
    },
    {
      titulo: 'ORGULLO ABRIL',
      descripcion: '<strong>Años de trayectoria</strong> que construyen nuestra historia.',
      img: '/images/inicio/perro-en-medalla.webp',
    },
  ];

  /** Overlay de portada a pantalla completa con las animaciones de entrada. */
  mostrarPortada = false;

  /** Pestaña activa del boletín una vez cerrada la portada. */
  tabActiva: TabKey = 'somos-abril';

  /** Modal "THE BIRTHDAY CLUB" (calendario de cumpleaños del trimestre). */
  mostrarCumpleanos = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const yaVista =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem(Boletin.PORTADA_KEY) === '1';
    this.mostrarPortada = !yaVista;
  }

  /** "¡VAMOS!": cierra la portada y entra al boletín (pestaña SOMOS ABRIL). */
  entrarAlBoletin(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(Boletin.PORTADA_KEY, '1');
    }
    this.mostrarPortada = false;
    this.tabActiva = 'somos-abril';
  }

  seleccionarTab(tab: TabKey): void {
    // La pestaña INICIO reabre la portada animada a pantalla completa.
    if (tab === 'inicio') {
      this.mostrarPortada = true;
      return;
    }
    this.tabActiva = tab;
  }

  irAlDashboard(): void {
    this.router.navigate(['/']);
  }

  /**
   * "VER MÁS" de una tarjeta de SOMOS ABRIL. Por ahora solo la primera
   * (THE BIRTHDAY CLUB) abre su modal de calendario de cumpleaños.
   */
  verMas(index: number): void {
    if (index === 0) this.mostrarCumpleanos = true;
  }

  cerrarCumpleanos(): void {
    this.mostrarCumpleanos = false;
  }
}
