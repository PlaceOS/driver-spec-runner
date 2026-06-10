import {
    Component,
    effect,
    inject,
    input,
} from '@angular/core';
import { SpecBuildService } from './services/build.service';
import { TranslatePipe } from './ui/translate.pipe';
import { WorkbenchFormComponent } from './workbench-form.component';
import { WorkbenchOutputComponent } from './workbench-output.component';

@Component({
    selector: 'app-workbench',
    template: `
        @if (driver()) {
            <workbench-form class="w-full" />
            <workbench-output class="h-0 w-full flex-1" />
        } @else {
            <div
                class="absolute inset-0 flex flex-col items-center justify-center"
            >
                <i class="material-icons m-4">arrow_back</i>
                <p>{{ 'DRIVER_SELECT' | translate }}</p>
            </div>
        }
    `,
    styles: [
        `
            :host {
                position: relative;
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
            }

            i {
                font-size: 1.5rem;
            }
        `,
    ],
    imports: [WorkbenchFormComponent, WorkbenchOutputComponent, TranslatePipe],
})
export class WorkbenchComponent {
    private _build = inject(SpecBuildService);

    public readonly repo = input('');
    public readonly driver = input('');

    constructor() {
        effect(() => {
            const repo = this.repo();
            if (repo) this._build.setRepository(repo);
        });
        effect(() => this._build.setDriver(this.driver()));
    }
}
