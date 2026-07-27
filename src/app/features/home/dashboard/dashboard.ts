import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LearningService } from '../../../core/learning/learning.service';
import { LearningCategoryDto } from '../../../core/learning/learning.model';
import { HomeGreeting } from '../../../shared/components/home-greeting/home-greeting';
import { LearningCenter } from '../../../shared/components/learning-center/learning-center';
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
  imports: [CommonModule, HomeGreeting, LearningCenter, HighlightCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  readonly novedades = NOVEDADES;

  /**
   * Grupos del Centro de aprendizaje, ya filtrados por rol en el backend (una
   * categoría es visible si es "pública interna" o si el usuario tiene alguno de
   * sus roles). Si el usuario no puede ver ningún grupo, la lista queda vacía y el
   * panel no se muestra.
   */
  categorias: LearningCategoryDto[] = [];

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
    private learningService: LearningService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.firstName = (user?.displayName ?? '').split(' ')[0] || '';
      this.jobTitle = user?.jobTitle ?? '';
    }

    // Carga silenciosa: es contenido complementario de la portada, no debe tapar
    // la pantalla con el spinner global. Si falla, simplemente no se muestra el panel.
    // App zoneless: forzamos el refresco para que el panel aparezca sin un click extra.
    this.learningService.getInicio().subscribe({
      next: (data) => {
        this.categorias = data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.categorias = [];
        this.cdr.detectChanges();
      },
    });
  }

  irAlBoletin(): void {
    this.router.navigate(['/boletin']);
  }

  get todayCapitalized(): string {
    return this.today.charAt(0).toUpperCase() + this.today.slice(1);
  }
}
