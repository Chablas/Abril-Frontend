import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectSubContractorDTO } from '../../dtos/projectSubContractorDto.model';

@Component({
  standalone: true,
  selector: 'app-card',
  imports: [CommonModule],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  @Input() item!: ProjectSubContractorDTO;
  @Output() cardClick = new EventEmitter<number>();

  readonly stepDots = Array(8);

  private readonly stepStyles: Record<number, string> = {
    1: 'bg-blue-50 text-blue-500 border-blue-200',
    2: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    3: 'bg-green-50 text-green-600 border-green-200',
    4: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    5: 'bg-orange-50 text-orange-600 border-orange-200',
    6: 'bg-purple-50 text-purple-600 border-purple-200',
    7: 'bg-pink-50 text-pink-600 border-pink-200',
    8: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  stepBadgeClass(): string {
    return this.stepStyles[this.item.projectSubContractorStatusId] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  }
}
