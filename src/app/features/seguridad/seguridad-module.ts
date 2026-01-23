import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Layout } from "../../shared/components/layout/layout";
import { Users } from "./pages/users/users";

const routes: Routes = [
  { path: "", component: Layout, children: [
    { path: '', redirectTo: 'users', pathMatch: 'full' },
    { path: "usuarios", children: [
      { path: "", component: Users, data: { titulo: 'USUARIOS' } }
    ] },
  ] }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes), CommonModule, Users
  ],
  exports: [RouterModule]
})
export class SeguridadModule { }
