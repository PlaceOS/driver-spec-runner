import { DatePipe, SlicePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/autocomplete';
import { MatFormField } from '@angular/material/form-field';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { SpecBuildService } from './services/build.service';
import { SpecTestService } from './services/test.service';
import { DriverFormatPipe } from './ui/driver-format.pipe';
import { SafePipe } from './ui/safe.pipe';
import { SettingsToggleComponent } from './ui/settings-toggle.component';
import { TranslatePipe } from './ui/translate.pipe';

@Component({
    selector: 'workbench-form',
    template: `
        <div class="bg-base-100 border-base-300 rounded border">
            <header
                class="bg-base-200 m-2 flex h-14 w-[calc(100%-1rem)] items-center justify-between rounded border-none px-4 py-2"
            >
                <h3
                    class="flex w-full items-center justify-between space-x-4 text-xl font-medium"
                >
                    <div>{{ 'WORKBENCH_HEADER' | translate }}</div>
                    <div
                        class="bg-base-100 border-base-300 rounded-md border px-2 py-1 font-mono text-xs"
                        [innerHTML]="driver | driverFormat | safe"
                    ></div>
                </h3>
            </header>
            <div class="grid w-full grid-cols-2 gap-4 px-4 pb-4">
                <div class="flex flex-col">
                    <label>{{ 'REPOSITORY' | translate }}</label>
                    <div>{{ repo }}</div>
                </div>
                <div></div>
                <div class="flex flex-1 flex-col">
                    <label>{{ 'DRIVER' | translate }}</label>
                    <div
                        class="truncate font-mono"
                        [matTooltip]="driver"
                    >
                        {{ driver }}
                    </div>
                </div>
                <div class="flex flex-1 flex-col">
                    <label>{{ 'TEST_SPEC_FILE' | translate }}</label>
                    <div
                        class="truncate font-mono"
                        [matTooltip]="spec_file"
                    >
                        {{ spec_file }}
                        @if (!spec_file) {
                            <span class="opacity-30">{{
                                'TEST_SPEC_FILE_EMPTY' | translate
                            }}</span>
                        }
                    </div>
                </div>
                <div class="flex flex-1 flex-col space-y-1">
                    <label>{{ 'GIT_COMMIT' | translate }}</label>
                    <mat-form-field appearance="outline">
                        <mat-select
                            [ngModel]="driver_commit"
                            (ngModelChange)="setCommit($event)"
                            placeholder="Latest Commit"
                        >
                            <mat-select-trigger>
                                <div class="flex items-center space-x-4">
                                    <div class="flex-1 truncate">
                                        {{ driver_commit?.subject }}
                                    </div>
                                    <div
                                        class="bg-base-200 !mr-4 rounded px-1.5 font-mono text-[0.625rem]"
                                    >
                                        {{
                                            driver_commit?.commit || ''
                                                | slice: 0 : 8
                                        }}
                                    </div>
                                </div>
                            </mat-select-trigger>
                            @for (
                                commit of driver_commits;
                                track commit
                            ) {
                                <mat-option [value]="commit">
                                    <div
                                        class="flex w-px flex-1 items-center space-x-2"
                                    >
                                        <div
                                            class="flex w-1/2 flex-1 flex-col truncate leading-tight"
                                        >
                                            <div class="truncate">
                                                {{ commit.subject }}
                                            </div>
                                            <div
                                                class="text-base-content truncate font-mono text-[0.625rem] opacity-30"
                                            >
                                                {{
                                                    commit.date | date: 'medium'
                                                }}
                                                @if (commit.author) {
                                                    <span>
                                                        |
                                                        {{
                                                            commit.author
                                                        }}</span
                                                    >
                                                }
                                            </div>
                                        </div>
                                        <code
                                            class="bg-base-200 rounded p-1 text-xs"
                                            >{{
                                                commit.commit | slice: 0 : 8
                                            }}</code
                                        >
                                    </div>
                                </mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
                </div>
                <div
                    class="flex flex-1 flex-col space-y-1"
                    [class.opacity-30]="!spec_file"
                    [class.pointer-events-none]="!spec_file"
                >
                    <label>{{ 'TEST_SPEC_FILE_COMMIT' | translate }}</label>
                    <mat-form-field appearance="outline">
                        <mat-select
                            [ngModel]="spec_commit"
                            (ngModelChange)="setSpecCommit($event)"
                            [placeholder]="'GIT_COMMIT_LATEST' | translate"
                        >
                            <mat-select-trigger>
                                <div class="flex items-center space-x-4">
                                    <div class="flex-1 truncate">
                                        {{ spec_commit?.subject }}
                                    </div>
                                    <div
                                        class="bg-base-200 !mr-4 rounded px-1.5 font-mono text-[0.625rem]"
                                    >
                                        {{
                                            spec_commit?.commit || ''
                                                | slice: 0 : 8
                                        }}
                                    </div>
                                </div>
                            </mat-select-trigger>
                            @for (
                                commit of spec_commits;
                                track commit
                            ) {
                                <mat-option [value]="commit">
                                    <div
                                        class="flex w-px flex-1 items-center space-x-2"
                                    >
                                        <div
                                            class="flex w-1/2 flex-1 flex-col truncate leading-tight"
                                        >
                                            <div class="truncate">
                                                {{ commit.subject }}
                                            </div>
                                            <div
                                                class="text-base-content truncate font-mono text-[0.625rem] opacity-30"
                                            >
                                                {{
                                                    commit.date | date: 'medium'
                                                }}
                                                @if (commit.author) {
                                                    <span>
                                                        |
                                                        {{
                                                            commit.author
                                                        }}</span
                                                    >
                                                }
                                            </div>
                                        </div>
                                        <code
                                            class="bg-base-200 rounded p-1 text-xs"
                                            >{{
                                                commit.commit | slice: 0 : 8
                                            }}</code
                                        >
                                    </div>
                                </mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
                </div>
                <settings-toggle
                    [name]="'ALLOW_REMOTE_DEBUGGING' | translate"
                    [ngModel]="settings.debug_symbols"
                    (ngModelChange)="setSettings({ debug_symbols: $event })"
                />
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                padding: 0.5rem;
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
    imports: [
        MatTooltip,
        MatFormField,
        MatSelect,
        FormsModule,
        MatSelectTrigger,
        MatOption,
        SettingsToggleComponent,
        SlicePipe,
        DatePipe,
        DriverFormatPipe,
        TranslatePipe,
        SafePipe,
    ],
})
export class WorkbenchFormComponent {
    private _build = inject(SpecBuildService);
    private _tests = inject(SpecTestService);

    public readonly setCommit = (d) => this._build.setCommit(d);
    public readonly setSpecFile = (d) => this._tests.setSpec(d);
    public readonly setSpecCommit = (d) => this._tests.setCommit(d);
    public readonly setSettings = (s) => this._tests.setSettings(s);

    public get repo() {
        return this._build.active_repo();
    }
    public get driver() {
        return this._build.active_driver();
    }
    public get driver_commit() {
        return this._build.active_commit();
    }
    public get driver_commits() {
        return this._build.driver_commits();
    }
    public get spec_commit() {
        return this._tests.active_commit();
    }
    public get spec_commits() {
        return this._tests.commit_list();
    }
    public get spec_file() {
        return this._tests.active_spec();
    }
    public get specs() {
        return this._tests.spec_list();
    }
    public get settings() {
        return this._tests.settings();
    }
}
