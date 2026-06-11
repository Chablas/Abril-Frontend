import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { LessonAreas } from '../lesson-areas/lesson-areas';
import { Areas } from '../areas-subareas/components/areas';
import { Templates } from '../templates/components/templates';
import { CatalogTypes } from '../catalog-types/catalog-types';
import { CatalogItems } from '../catalog-items/catalog-items';

type ConfigSection = 'areas' | 'area-relations' | 'templates' | 'catalog-types' | 'catalog-items';

/**
 * Contenedor de configuración de lecciones aprendidas.
 *
 * Agrupa en una sola ruta (`mejora-continua/lecciones-configuracion`) las
 * pantallas que antes vivían en rutas separadas (`configuration/areas`,
 * `area-relations`, `templates`, `catalog-types`, `catalog-items`),
 * conmutándolas por secciones con el mismo patrón que `lesson-reminders`.
 *
 * La sección activa se sincroniza con el query param `?seccion=` para
 * permitir enlaces directos a una sección concreta.
 */
@Component({
  selector: 'app-lecciones-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    SectionTabs,
    LessonAreas,
    Areas,
    Templates,
    CatalogTypes,
    CatalogItems,
  ],
  templateUrl: './lecciones-configuracion.html',
})
export class LeccionesConfiguracion implements OnInit {
  activeSection: ConfigSection = 'areas';

  readonly sectionTabs: SectionTab[] = [
    { id: 'areas', label: 'Áreas' },
    { id: 'area-relations', label: 'Relaciones por área' },
    { id: 'templates', label: 'Plantillas' },
    { id: 'catalog-types', label: 'Tipos de catálogo' },
    { id: 'catalog-items', label: 'Ítems de catálogo' },
  ];

  private readonly validSections = this.sectionTabs.map((t) => t.id);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const seccion = this.route.snapshot.queryParamMap.get('seccion');
    if (seccion && this.validSections.includes(seccion)) {
      this.activeSection = seccion as ConfigSection;
    }
  }

  onSectionChange(id: string): void {
    this.activeSection = id as ConfigSection;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { seccion: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
