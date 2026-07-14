import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Roles } from '../../../core/constants/roles';
import { GUIA_LECCIONES_APRENDIDAS } from '../../../shared/constants/mejora-continua-guia';
import { HomeGreeting } from '../../../shared/components/home-greeting/home-greeting';
import { LearningGuides } from '../../../shared/components/learning-guides/learning-guides';
import { HighlightCard } from '../../../shared/components/highlight-card/highlight-card';

interface Highlight {
  titulo: string;
  descripcion: string;
  img: string;
}

/** Copia exacta del contenido de las tarjetas SOMOS ABRIL del boletín. */
const NOVEDADES: Highlight[] = [
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HomeGreeting, LearningGuides, HighlightCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  /** Guías en video de Mejora Continua (por ahora solo Lecciones Aprendidas). */
  readonly guiasMejoraContinua = [GUIA_LECCIONES_APRENDIDAS];

  readonly novedades = NOVEDADES;

  /** Nombre de pila (primera palabra del displayName guardado en el login). */
  firstName = '';
  jobTitle = '';

  /** Fecha de hoy en es-PE, formato largo, con la primera letra en mayúscula. */
  readonly today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (typeof localStorage === 'undefined') return;
    const user = JSON.parse(localStorage.getItem('user') ?? '{}');
    this.firstName = (user?.displayName ?? '').split(' ')[0] || '';
    this.jobTitle = user?.jobTitle ?? '';
  }

  irAlBoletin(): void {
    this.router.navigate(['/boletin']);
  }

  get todayCapitalized(): string {
    return this.today.charAt(0).toUpperCase() + this.today.slice(1);
  }

  /**
   * La sección de guías de Mejora Continua solo es visible para los roles
   * 'ADMINISTRADOR DE MEJORA CONTINUA' y 'USUARIO DE ABRIL'.
   */
  get puedeVerGuiasMejoraContinua(): boolean {
    return (
      this.authService.hasRole(Roles.ADMINISTRADOR_MEJORA_CONTINUA) ||
      this.authService.hasRole(Roles.USUARIO_DE_ABRIL)
    );
  }
}
