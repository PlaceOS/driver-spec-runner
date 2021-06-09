import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SpecBuildService } from './services/build.service';

@Component({
    selector: 'app-workbench',
    template: `
        <ng-container *ngIf="driver; else empty_state">
            <workbench-form class="w-full"></workbench-form>
            <workbench-output class="w-full flex-1 h-0"></workbench-output>
        </ng-container>
        <ng-template #empty_state>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
                <i class="material-icons m-4">arrow_back</i>
                <p>Select a driver from the sidebar to begin</p>
            </div>
        </ng-template>
    `,
    styles: [`
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
    `]
})
export class WorkbenchComponent {
    public driver: string;

    constructor(private _route: ActivatedRoute, private _build: SpecBuildService) {}

    public ngOnInit(): void {
        this._route.paramMap.subscribe((params) => {
            if (params.has('repo')) {
                this._build.setRepository(params.get('repo'));
            }
            if (params.has('driver')) {
                this._build.setDriver(params.get('driver'));
            }
            this.driver = params.get('driver') || '';
        });
    }
}
