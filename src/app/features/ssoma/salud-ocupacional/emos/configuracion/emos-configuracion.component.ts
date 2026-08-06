import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { SSOMA_TABS } from '../../shared/salud-ocupacional-tabs';
import { EmoCorreosConfigComponent } from './correos/emo-correos-config.component';

/**
 * Contenedor de la Configuración de EMOs.
 *
 * Acceso restringido por la feature 'ssoma.salud-ocupacional.emos.configuracion'
 * (roleGuard en la ruta). Usa `app-section-tabs` para conmutar entre secciones;
 * por ahora existe una sola sección: los destinatarios (Para/CC) de los correos
 * de programación de EMO.
 */
@Component({
  selector: 'app-emos-configuracion',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, SectionTabs, EmoCorreosConfigComponent],
  templateUrl: './emos-configuracion.component.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class EmosConfiguracionComponent {
  readonly tabs = SSOMA_TABS;
  readonly sectionTabs: SectionTab[] = [
    { id: 'correos', label: 'Correos de programación de EMO' },
  ];
  activeSection = 'correos';

  constructor(private router: Router) {}

  onSectionChange(id: string): void {
    this.activeSection = id;
  }

  volver(): void {
    this.router.navigate(['/ssoma/salud-ocupacional/emos']);
  }
}
