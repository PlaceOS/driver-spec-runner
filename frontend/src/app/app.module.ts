import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';

import { MatSnackBarModule } from '@angular/material/snack-bar';

import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { UIModule } from './ui/ui.module';
import { WorkbenchFormComponent } from './workbench-form.component';
import { WorkbenchOutputComponent } from './workbench-output.component';
import { WorkbenchComponent } from './workbench.component';

@NgModule({
    declarations: [
        AppComponent,
        WorkbenchComponent,
        WorkbenchFormComponent,
        WorkbenchOutputComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatSnackBarModule,
        UIModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
        }),
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
