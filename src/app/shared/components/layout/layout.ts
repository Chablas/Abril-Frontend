import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { Sidebar } from "../sidebar/sidebar";
import { Header } from "../header/header";
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Header, NgIf],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  constructor(private router: Router) {}

  isFullPage(): boolean {
    return (
      this.router.url.includes('/habilitacion/trabajadores') ||
      this.router.url.includes('/arquitectura-comercial/dashboard') ||
      this.router.url.includes('/clinica/dashboard') ||
      this.router.url.includes('/clinica/agenda') ||
      this.router.url.includes('/clinica/interconsultas') ||
      this.router.url.includes('/clinica/programaciones') ||
      this.router.url.includes('/habilitacion/dashboard-contratista') ||
      this.router.url.includes('/evaluaciones/dashboard') ||
      this.router.url.includes('/evaluaciones/evaluar') ||
      this.router.url.includes('/evaluaciones/historial') ||
      this.router.url.includes('/evaluaciones/configuracion') ||
      this.router.url.includes('/ssoma/gestion/paso')
    );
  }
}
