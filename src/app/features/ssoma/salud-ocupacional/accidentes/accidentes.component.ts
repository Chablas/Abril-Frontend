import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SSOMA_TABS } from '../topico/topico.component';

@Component({
  selector: 'app-accidentes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './accidentes.component.html',
})
export class AccidentesComponent {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
}
