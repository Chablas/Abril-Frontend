import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogoClinicas } from './components/catalogo-clinicas/catalogo-clinicas';
import { CatalogoMedicos } from './components/catalogo-medicos/catalogo-medicos';
import { CatalogoEmoTipos } from './components/catalogo-emo-tipos/catalogo-emo-tipos';

type CatalogoTab = 'clinicas' | 'medicos' | 'emo-tipos';

@Component({
  selector: 'app-salud-catalogos',
  standalone: true,
  imports: [CommonModule, CatalogoClinicas, CatalogoMedicos, CatalogoEmoTipos],
  templateUrl: './catalogos.html',
  styleUrl: './catalogos.css',
})
export class Catalogos {
  activeTab: CatalogoTab = 'clinicas';

  setTab(tab: CatalogoTab): void {
    this.activeTab = tab;
  }
}
