import {
    NO_ERRORS_SCHEMA,
    provideZonelessChangeDetection,
    signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { AppComponent } from './app.component';
import { SpecBuildService } from './services/build.service';
import { LocaleService } from './services/locale.service';

describe('AppComponent', () => {
    beforeEach(async () => {
        const storage: Record<string, string> = {};
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                getItem: (key: string) => storage[key] ?? null,
                setItem: (key: string, value: string) =>
                    (storage[key] = `${value}`),
                removeItem: (key: string) => delete storage[key],
            },
        });
        await TestBed.configureTestingModule({
            imports: [AppComponent, RouterModule.forRoot([])],
            providers: [
                { provide: MatSnackBar, useValue: {} },
                { provide: SwUpdate, useValue: {} },
                provideZonelessChangeDetection(),
                {
                    provide: LocaleService,
                    useValue: { locale: 'en-AU', get: (key: string) => key },
                },
                {
                    provide: SpecBuildService,
                    useValue: {
                        sidebar: signal(false).asReadonly(),
                        repositories: signal(['Public']).asReadonly(),
                        driver_list: signal([]).asReadonly(),
                        test_statuses: signal({}).asReadonly(),
                        getRepository: () => 'Public',
                        setRepository: () => undefined,
                        setDriver: () => undefined,
                        toggleSidebar: () => undefined,
                    },
                },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should render the app shell', () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const compiled = fixture.nativeElement;
        expect(compiled.querySelector('topbar-header')).toBeTruthy();
        expect(compiled.querySelector('sidebar')).toBeTruthy();
        expect(compiled.querySelector('[name="content"]')).toBeTruthy();
    });
});
