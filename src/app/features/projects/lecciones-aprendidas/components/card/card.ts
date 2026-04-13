import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonListDTO } from '../../../../../core/dtos/lesson/lesson.model';

@Component({
  selector: 'app-lesson-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.html',
})
export class LessonCard {
  @Input() item!: LessonListDTO;
  @Input() apiUrl = '';
  @Output() cardClick = new EventEmitter<number>();

  getOpportunityImage(images: any[]): any | null {
    return images?.find(img => img.imageTypeDescription === 'OPORTUNIDAD') ?? null;
  }

  getImprovementImage(images: any[]): any | null {
    return images?.find(img => img.imageTypeDescription === 'MEJORA') ?? null;
  }

  imageUrl(url: string): string {
    return url.startsWith('http') ? url : this.apiUrl + url;
  }
}
