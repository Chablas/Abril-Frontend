import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompleteRegistration } from "./pages/complete-registration/complete-registration";
import { Login } from "./pages/login/login";

const routes: Routes = [
  { path: "complete-registration", component: CompleteRegistration },
  { path: "login", component: Login },
]

@NgModule({
  declarations: [],
  imports: [
    RouterModule.forChild(routes), CommonModule
  ],
  exports: [RouterModule] 
})
export class AuthModule { }
