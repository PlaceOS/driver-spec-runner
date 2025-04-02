import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';

import { setupCache } from './common/application';
import { setNotifyOutlet } from './common/notifications';
import { SpecBuildService } from './services/build.service';

@Component({
    selector: 'app-root',
    template: `
        <div
            class="bg-base-200 text-base-content absolute inset-0 flex flex-col overflow-hidden"
        >
            <topbar-header class="z-20"></topbar-header>
            <div class="flex w-full flex-1" style="height: 50%">
                <sidebar
                    class="z-10 h-full overflow-hidden shadow"
                    [class.show]="show_sidebar | async"
                ></sidebar>
                <div name="content" class="bg-base-200 z-0 h-full w-1/2 flex-1">
                    <router-outlet></router-outlet>
                </div>
            </div>
        </div>
    `,
    styleUrls: [
        '../styles/application.styles.css',
        '../styles/custom-element.styles.css',
        '../styles/native-element.styles.css',
    ],
    encapsulation: ViewEncapsulation.None,
    standalone: false,
})
export class AppComponent implements OnInit {
    public get show_sidebar() {
        return this._build.sidebar;
    }

    constructor(
        private _snackbar: MatSnackBar,
        private _cache: SwUpdate,
        private _build: SpecBuildService,
    ) {}

    public ngOnInit(): void {
        setNotifyOutlet(this._snackbar);
        setupCache(this._cache);
    }
}
