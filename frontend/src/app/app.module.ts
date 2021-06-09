import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';

import { UIModule } from './ui/ui.module';
import { WorkbenchComponent } from './workbench.component';
import { WorkbenchFormComponent } from './workbench-form.component';
import { WorkbenchOutputComponent } from './workbench-output.component';

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
        HttpClientModule,
        UIModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
        }),
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
