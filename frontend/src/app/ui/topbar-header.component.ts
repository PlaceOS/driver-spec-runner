import { Component } from '@angular/core';
import { SpecBuildService } from '../services/build.service';

@Component({
    selector: 'topbar-header',
    template: `
        <div
            class="bg-secondary text-secondary-content border-base-300 flex w-full items-center border-b p-2"
        >
            <button
                icon
                matRipple
                class="text-secondary-content"
                (click)="toggle()"
            >
                <icon class="text-2xl">{{
                    (show_sidebar | async) ? 'close' : 'menu'
                }}</icon>
            </button>
            <a [routerLink]="['/']" class="h-full">
                <img class="h-10 sm:block" alt="PlaceOS" [src]="logo" />
            </a>
            <h2 class="m-0 px-4 text-xl font-medium">
                {{ 'APP_TITLE' | translate }}
            </h2>
            <div class="min-w-0 flex-1"></div>
            <button icon matRipple (click)="toggleDarkMode()">
                <icon class="text-2xl">{{
                    dark_mode ? 'dark_mode' : 'light_mode'
                }}</icon>
            </button>
        </div>
    `,
    styles: [``],
    standalone: false,
})
export class TopbarHeaderComponent {
    public get show_sidebar() {
        return this._build.sidebar;
    }

    public readonly toggle = () => this._build.toggleSidebar();

    public get logo() {
        return localStorage.getItem('PlaceOS.theme') === 'dark'
            ? 'assets/logo-dark.svg'
            : 'assets/logo-dark.svg';
    }

    public get dark_mode() {
        return localStorage.getItem('PlaceOS.theme') === 'dark';
    }

    public toggleDarkMode() {
        if (this.dark_mode) {
            localStorage.removeItem('PlaceOS.theme');
            document.body.classList.remove('theme-dark');
        } else {
            localStorage.setItem('PlaceOS.theme', 'dark');
            document.body.classList.add('theme-dark');
        }
    }

    constructor(private _build: SpecBuildService) {}

    public ngOnInit() {
        if (this.dark_mode) {
            document.body.classList.add('theme-dark');
        } else {
            document.body.classList.remove('theme-dark');
        }
    }
}
