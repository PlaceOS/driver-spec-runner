import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpecBuildService } from '../services/build.service';
import { LocaleService } from '../services/locale.service';
import { IconComponent } from './icon.component';
import { TranslatePipe } from './translate.pipe';

@Component({
    selector: 'topbar-header',
    template: `
        <div
            class="bg-secondary text-secondary-content border-base-300 flex w-full items-center space-x-2 border-b p-2"
        >
            <button
                icon
                matRipple
                class="text-secondary-content"
                (click)="toggle()"
            >
                <icon class="text-2xl">{{
                    show_sidebar ? 'close' : 'menu'
                }}</icon>
            </button>
            <a [routerLink]="['/']" class="h-full">
                <img class="h-10 sm:block" alt="PlaceOS" [src]="logo" />
            </a>
            <h2 class="m-0 px-4 text-xl font-medium">
                {{ 'APP_TITLE' | translate }}
            </h2>
            <div class="min-w-0 flex-1"></div>
            <!-- <button *ngIf="locales.length > 1" [matMenuTriggerFor]="menu">
                <div class="flex items-center justify-between">
                    <app-icon class="text-2xl text-white">language</app-icon>
                    <div class="ml-2 text-left leading-tight text-white">
                        <div>{{ 'LANGUAGE_WORD' | translate }}</div>
                        <div
                            *ngIf="('LANGUAGE_WORD' | translate) !== 'Language'"
                            class="text-xs opacity-30"
                        >
                            Language
                        </div>
                    </div>
                    <div
                        class="bg-base-400 text-base-content ml-4 max-w-24 truncate rounded px-2 py-1 text-sm"
                        [matTooltip]="active_locale | translate"
                    >
                        {{ active_locale | translate }}
                    </div>
                </div>
            </button>
            <mat-menu #menu="matMenu">
                <button
                    mat-menu-item
                    *ngFor="let lang of locales"
                    (click)="setLocale(lang.id)"
                >
                    <div
                        class="flex h-14 min-w-[24rem] items-center justify-between space-x-8"
                    >
                        <div
                            class="leading-tight"
                            [class.mt-2]="
                                (lang.name | translate) !== lang.local
                            "
                        >
                            <div>{{ lang.name | translate }}</div>
                            <div
                                *ngIf="(lang.name | translate) !== lang.local"
                                class="text-xs opacity-30"
                            >
                                {{ lang.local }}
                            </div>
                        </div>
                    </div>
                </button>
            </mat-menu> -->
            <button icon matRipple (click)="toggleDarkMode()">
                <icon class="text-2xl">{{
                    dark_mode() ? 'dark_mode' : 'light_mode'
                }}</icon>
            </button>
        </div>
    `,
    styles: [``],
    imports: [IconComponent, RouterLink, TranslatePipe],
})
export class TopbarHeaderComponent {
    private _build = inject(SpecBuildService);
    private _locale = inject(LocaleService);
    public readonly dark_mode = signal(
        localStorage.getItem('PlaceOS.theme') === 'dark',
    );

    public readonly setLocale = (code: string) => {
        console.log('Set Locale:', code);
        this._locale.setLocale(code);
        localStorage.setItem('PlaceOS.locale', code);
        setTimeout(() => location.reload(), 300);
    };

    public get active_locale(): string {
        const locale_list = this.locales;
        const locale = this._locale.locale;
        for (const item of locale_list) {
            if (item.id === locale) return item.name;
        }
        return 'LANGUAGE.ENGLISH';
    }

    public get locales(): {
        id: string;
        name: string;
        local: string;
        flag: string;
    }[] {
        return [
            {
                id: 'en-AU',
                name: 'LANGUAGE.ENGLISH',
                local: 'English',
                flag: '🇦🇺',
            },
            {
                id: 'en-US',
                name: 'LANGUAGE.ENGLISH_US',
                local: 'English (US)',
                flag: '🇺🇸',
            },
            {
                id: 'fr',
                name: 'LANGUAGE.FRENCH',
                local: 'Français',
                flag: '🇫🇷',
            },
            {
                id: 'fr-CA',
                name: 'LANGUAGE.FRENCH_CA',
                local: 'Français (Canada)',
                flag: '🇨🇦',
            },
            {
                id: 'es',
                name: 'LANGUAGE.SPANISH',
                local: 'Español',
                flag: '🇪🇸',
            },
            {
                id: 'pt',
                name: 'LANGUAGE.PORTUGESE',
                local: 'Português',
                flag: '🇵🇹',
            },
            {
                id: 'it',
                name: 'LANGUAGE.ITALIAN',
                local: 'Italiano',
                flag: '🇮🇹',
            },
            { id: 'zh', name: 'LANGUAGE.CHINESE', local: '中文', flag: '🇨🇳' },
            {
                id: 'ja-JP',
                name: 'LANGUAGE.JAPANESE',
                local: '日本語',
                flag: '🇯🇵',
            },
            { id: 'ar', name: 'LANGUAGE.ARABIC', local: 'عربية', flag: '' },
        ];
    }

    public get show_sidebar() {
        return this._build.sidebar();
    }

    public readonly toggle = () => this._build.toggleSidebar();

    public get logo() {
        return localStorage.getItem('PlaceOS.theme') === 'dark'
            ? 'assets/logo-dark.svg'
            : 'assets/logo-dark.svg';
    }

    public toggleDarkMode() {
        const enabled = !this.dark_mode();
        this.dark_mode.set(enabled);
        if (enabled) {
            localStorage.setItem('PlaceOS.theme', 'dark');
            document.body.classList.add('theme-dark');
        } else {
            localStorage.removeItem('PlaceOS.theme');
            document.body.classList.remove('theme-dark');
        }
    }

    public ngOnInit() {
        if (this.dark_mode()) {
            document.body.classList.add('theme-dark');
        } else {
            document.body.classList.remove('theme-dark');
        }
    }
}
