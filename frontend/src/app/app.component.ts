import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';

import { setupCache } from './common/application';
import { setNotifyOutlet } from './common/notifications';
import { SpecBuildService } from './services/build.service';

@Component({
    selector: 'app-root',
    template: `
        <div class="absolute inset-0 overflow-hidden flex flex-col">
            <topbar-header class="z-20"></topbar-header>
            <div class="flex flex-1 w-full" style="height: 50%">
                <sidebar class="h-full shadow z-10 overflow-hidden" [class.show]="show_sidebar | async"></sidebar>
                <div name="content" class="h-full flex-1 w-1/2 bg-gray-200 z-0">
                    <router-outlet></router-outlet>
                </div>
            </div>
        </div>
    `,
    styleUrls: [
        '../styles/application.styles.css',
        '../styles/custom-element.styles.scss',
        '../styles/native-element.styles.css',
    ],
    encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {
    public readonly show_sidebar = this._build.sidebar;

    constructor(private _snackbar: MatSnackBar, private _cache: SwUpdate, private _build: SpecBuildService) {}

    public ngOnInit(): void {
        setNotifyOutlet(this._snackbar);
        setupCache(this._cache);
    }
}
