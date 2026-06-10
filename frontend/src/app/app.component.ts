import {
    Component,
    OnInit,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';

import { RouterOutlet } from '@angular/router';
import { setupCache } from './common/application';
import { setNotifyOutlet } from './common/notifications';
import { SpecBuildService } from './services/build.service';
import { SidebarComponent } from './ui/sidebar.component';
import { TopbarHeaderComponent } from './ui/topbar-header.component';

@Component({
    selector: 'app-root',
    template: `
        <div
            class="bg-base-200 text-base-content absolute inset-0 flex flex-col overflow-hidden"
        >
            <topbar-header class="z-20" />
            <div class="flex w-full flex-1" style="height: 50%">
                <sidebar
                    class="z-10 h-full overflow-hidden shadow"
                    [class.show]="show_sidebar"
                />
                <div name="content" class="bg-base-200 z-0 h-full w-1/2 flex-1">
                    <router-outlet />
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
    imports: [TopbarHeaderComponent, SidebarComponent, RouterOutlet],
})
export class AppComponent implements OnInit {
    private _snackbar = inject(MatSnackBar);
    private _cache = inject(SwUpdate);
    private _build = inject(SpecBuildService);

    public get show_sidebar() {
        return this._build.sidebar();
    }

    public ngOnInit(): void {
        setNotifyOutlet(this._snackbar);
        setupCache(this._cache);
    }
}
