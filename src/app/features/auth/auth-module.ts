import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompleteRegistration } from "./pages/complete-registration/complete-registration";
import { Login } from "./pages/login/login";
import { MsalRedirect } from "./pages/msal-redirect/msal-redirect";

const routes: Routes = [
  { path: "complete-registration", component: CompleteRegistration },
  { path: "login", component: Login },
  { path: "msal-redirect", component: MsalRedirect },
]

@NgModule({
  declarations: [],
  imports: [
    RouterModule.forChild(routes), CommonModule
  ],
  exports: [RouterModule] 
})
export class AuthModule { }
