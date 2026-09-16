import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningCategoryDto, LearningVideoDto, esManual } from '../../../core/learning/learning.model';

/**
 * Centro de aprendizaje y guías: un solo panel con una subsección por grupo/área
 * (encabezado = nombre del área/módulo) y las tarjetas de videos y manuales de cada grupo.
 * Los datos vienen del backend ya filtrados por rol (ver LearningService.getInicio).
 */
@Component({
  selector: 'app-learning-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-center.html',
  styleUrl: './learning-center.css',
})
export class LearningCenter {
  @Input() titulo = 'Centro de aprendizaje y guías';
  @Input() categorias: LearningCategoryDto[] = [];
  /** Color de acento del panel (teal Abril): es el mismo para todos los grupos. */
  @Input() accentColor = '#0F6E56';
  /** Encabezado interno del panel. Se oculta cuando la página ya pone su propio título. */
  @Input() showHeading = true;
  /** Modo ampliado (página dedicada): tarjetas y miniaturas más grandes. */
  @Input() large = false;
  /** Cada grupo/módulo se puede colapsar haciendo clic en su encabezado. */
  @Input() collapsible = false;

  /** Ids de los grupos colapsados. Por defecto todos arrancan desplegados. */
  private readonly colapsados = new Set<number>();

  /** Un manual lleva ícono de documento; un video, el de play. */
  esManual(v: LearningVideoDto): boolean {
    return esManual(v.url);
  }

  isCollapsed(cat: LearningCategoryDto): boolean {
    return this.colapsados.has(cat.id);
  }

  toggle(cat: LearningCategoryDto): void {
    if (this.colapsados.has(cat.id)) {
      this.colapsados.delete(cat.id);
    } else {
      this.colapsados.add(cat.id);
    }
  }
}
