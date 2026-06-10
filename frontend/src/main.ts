import {
    enableProdMode,
    importProvidersFrom,
    provideZonelessChangeDetection,
} from '@angular/core';

import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
    provideRouter,
    withComponentInputBinding,
    withHashLocation,
} from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes, withHashLocation(), withComponentInputBinding()),
        importProvidersFrom(
            BrowserModule,
            BrowserAnimationsModule,
            MatSnackBarModule,
            ServiceWorkerModule.register('ngsw-worker.js', {
                enabled: environment.production,
            }),
        ),
    ],
}).catch((err) => console.error(err));
