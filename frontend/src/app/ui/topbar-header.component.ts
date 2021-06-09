import { Component } from '@angular/core';
import { SpecBuildService } from '../services/build.service';

@Component({
    selector: 'topbar-header',
    template: `
        <button mat-icon-button class="text-white" (click)="toggle()">
            <i class="material-icons">{{ (show_sidebar | async) ? 'close' : 'menu' }}</i>
        </button>
        <a [routerLink]="['/']" class="h-full">
            <img class="h-10" src="assets/logo-dark.svg"/>
        </a>
        <h2 class="px-4 text-white">Driver Spec Runner</h2>
        <div class="flex-1 min-w-0"></div>
    `,
    styles: [`
        :host {
            display: flex;
            align-items: center;
            padding: .5rem;
            width: 100%;
            background-color: #0A0D2E;
        }

        h2 {
            margin: 0;
        }
    `]
})
export class TopbarHeaderComponent {

    public readonly show_sidebar = this._build.sidebar;

    public readonly toggle = () => this._build.toggleSidebar();

    constructor(private _build: SpecBuildService) {}
}
