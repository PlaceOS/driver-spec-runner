import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkbenchComponent } from './workbench.component';

const routes: Routes = [
    { path: '', component: WorkbenchComponent },
    { path: ':repo', component: WorkbenchComponent },
    { path: ':repo/:driver', component: WorkbenchComponent },
    { path: '**', redirectTo: '' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
