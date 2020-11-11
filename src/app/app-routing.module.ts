import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { WorkbenchComponent } from './workbench.component';


const routes: Routes = [
    { path: '', component: WorkbenchComponent },
    { path: ':repo', component: WorkbenchComponent },
    { path: ':repo/:driver', component: WorkbenchComponent },
    { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
