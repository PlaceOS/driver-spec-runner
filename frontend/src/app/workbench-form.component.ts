import { Component } from '@angular/core';
import { SpecBuildService } from './services/build.service';
import { SpecTestService } from './services/test.service';

@Component({
    selector: 'workbench-form',
    template: `
        <div class="py-2 flex flex-col">
            <label>Repository</label>
            <div class="py-4">{{ repo | async }}</div>
        </div>
        <div class="flex space-x-2 flex-wrap">
            <div class="py-2 flex flex-col flex-1">
                <label>Driver</label>
                <div class="py-4">{{ driver | async }}</div>
            </div>
            <div class="py-2 flex flex-col flex-1">
                <label>Commit</label>
                <mat-form-field appearance="outline">
                    <mat-select
                        [ngModel]="driver_commit | async"
                        (ngModelChange)="setCommit($event)"
                    >
                        <mat-option
                            *ngFor="let commit of driver_commits | async"
                            [value]="commit"
                        >
                            {{ commit.subject }}
                        </mat-option>
                    </mat-select>
                </mat-form-field>
            </div>
        </div>
        <div class="flex space-x-2 flex-wrap">
            <div class="py-2 flex flex-col flex-1">
                <label>Spec File</label>
                <mat-form-field appearance="outline">
                    <mat-select
                        [ngModel]="spec_file | async"
                        (ngModelChange)="setSpecFile($event)"
                    >
                        <mat-option
                            *ngFor="let spec of specs | async"
                            [value]="spec"
                        >
                            {{ spec }}
                        </mat-option>
                    </mat-select>
                </mat-form-field>
            </div>
            <div class="py-2 flex flex-col flex-1">
                <label>Spec File Commit</label>
                <mat-form-field appearance="outline">
                    <mat-select
                        [ngModel]="spec_commit | async"
                        (ngModelChange)="setSpecCommit($event)"
                    >
                        <mat-option
                            *ngFor="let commit of spec_commits | async"
                            [value]="commit"
                        >
                            {{ commit.subject }}
                        </mat-option>
                    </mat-select>
                </mat-form-field>
            </div>
        </div>
        <div class="py-2 flex items-center">
            <mat-checkbox
                [ngModel]="(settings | async).force"
                (ngModelChange)="setSettings({ force: $event })"
                >Force Recompilation</mat-checkbox
            >
        </div>
        <div class="py-2 flex items-center">
            <mat-checkbox
                [ngModel]="(settings | async).debug_symbols"
                (ngModelChange)="setSettings({ debug_symbols: $event })"
                >Compile with Debug Symbols</mat-checkbox
            >
        </div>
    `,
    styles: [
        `
            :host {
                padding: 1rem;
            }

            label {
                width: 10rem;
            }

            mat-form-field {
                height: 3.5rem;
                min-width: 16rem;
            }
        `,
    ],
})
export class WorkbenchFormComponent {
    public readonly repo = this._build.active_repo;
    public readonly driver = this._build.active_driver;
    public readonly driver_commit = this._build.active_commit;
    public readonly driver_commits = this._build.driver_commits;
    public readonly spec_commit = this._tests.active_commit;
    public readonly spec_commits = this._tests.commit_list;
    public readonly spec_file = this._tests.active_spec;
    public readonly specs = this._tests.spec_list;
    public readonly settings = this._tests.settings;

    public readonly setCommit = (d) => this._build.setCommit(d);
    public readonly setSpecFile = (d) => this._tests.setSpec(d);
    public readonly setSpecCommit = (d) => this._tests.setCommit(d);
    public readonly setSettings = (s) => this._tests.setSettings(s);

    constructor(
        private _build: SpecBuildService,
        private _tests: SpecTestService
    ) {}
}
