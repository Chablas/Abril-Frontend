import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BirthdayClub } from './birthday-club/birthday-club';
import { AuthService } from '../../../core/services/auth.service';

type FloatingAction = 'login' | 'inicio-casa' | 'inicio-contratista';

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

  /**
   * El boletín (VAMOS + pestañas) es exclusivo de Casa logueado. Contratistas
   * logueados y visitantes sin sesión solo ven la portada estática, sin poder
   * entrar al contenido.
   */
  puedeVerBoletin = false;

  /**
   * Accesos rápidos de autoservicio (descanso médico / autorización de salida).
   * Exclusivos de Casa logueado: contratistas y clínica no gestionan esto aquí.
   */
  mostrarAccesosRapidos = false;

  /** Estado del botón flotante único (reemplaza al ícono fijo de casa). */
  accionFlotante: FloatingAction = 'login';

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const logueado = !!this.authService.getToken();
    const esCasa = logueado && this.authService.esUsuarioAbrilBoletin();
    const esContratista = logueado && this.authService.isContratista();

    this.puedeVerBoletin = esCasa;
    this.mostrarAccesosRapidos = esCasa;
    this.accionFlotante = esCasa ? 'inicio-casa' : esContratista ? 'inicio-contratista' : 'login';

    const yaVista =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem(Boletin.PORTADA_KEY) === '1';
    // Contratista/visitante: siempre la portada estática, sin VAMOS que abrir.
    this.mostrarPortada = !this.puedeVerBoletin || !yaVista;
  }

  /** "¡VAMOS!": cierra la portada y entra al boletín (pestaña SOMOS ABRIL). */
  entrarAlBoletin(): void {
    if (!this.puedeVerBoletin) return;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(Boletin.PORTADA_KEY, '1');
    }
    this.mostrarPortada = false;
    this.tabActiva = 'somos-abril';
  }

  seleccionarTab(tab: TabKey): void {
    if (!this.puedeVerBoletin) return;
    // La pestaña INICIO reabre la portada animada a pantalla completa.
    if (tab === 'inicio') {
      this.mostrarPortada = true;
      return;
    }
    this.tabActiva = tab;
  }

  /** Click del botón flotante: destino según quién está viendo la portada. */
  irAlDashboard(): void {
    switch (this.accionFlotante) {
      case 'login':
        this.router.navigate(['/auth/login']);
        return;
      case 'inicio-contratista': {
        const modulos = this.authService.getContratistaModulos();
        const landing = modulos === 'SSOMA' ? '/ssoma/gestion/rac/dashboard' : '/habilitacion';
        this.router.navigate([landing]);
        return;
      }
      case 'inicio-casa':
      default:
        this.router.navigate(['/inicio']);
        return;
    }
  }

  irADescansoMedico(): void {
    this.router.navigate(['/ssoma/salud-ocupacional/mi-salud'], { queryParams: { nuevo: '1' } });
  }

  irASolicitudSalida(): void {
    this.router.navigate(['/gestion-administrativa/solicitud-salidas'], { queryParams: { nuevo: '1' } });
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
