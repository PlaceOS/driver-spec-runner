import { Component, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/autocomplete';
import { MatFormField, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SpecBuildService } from '../services/build.service';
import { DriverFormatPipe } from './driver-format.pipe';
import { IconComponent } from './icon.component';
import { TranslatePipe } from './translate.pipe';

@Component({
    selector: 'sidebar',
    template: `
        <div class="bg-base-100 flex h-full max-w-[20rem] flex-col">
            <mat-form-field
                appearance="outline"
                class="no-subscript m-2 w-[calc(100%-1rem)]"
            >
                <mat-select
                    [ngModel]="repo"
                    (ngModelChange)="setRepo($event)"
                    [placeholder]="'REPO_LIST_EMPTY' | translate"
                >
                    @for (repo of repos(); track repo) {
                        <mat-option [value]="repo">
                            {{ repo }}
                        </mat-option>
                    }
                </mat-select>
            </mat-form-field>
            <mat-form-field
                appearance="outline"
                class="no-subscript mx-2 mb-2 w-[calc(100%-1rem)]"
            >
                <icon class="relative left-1 text-2xl" matPrefix>search</icon>
                <input
                    matInput
                    [ngModel]="search_str()"
                    (ngModelChange)="setFilter($event)"
                    [placeholder]="'FILTER' | translate"
                />
            </mat-form-field>
            <div
                class="divide-base-300 border-base-300 h-1/2 flex-1 divide-y overflow-auto border-t"
            >
                @let driver_list = drivers();
                @if (driver_list?.length) {
                    <div
                        class="bg-base-100 sticky top-0 z-10 w-full px-4 py-2 text-right text-sm font-thin"
                    >
                        {{
                            'DRIVER_COUNT'
                                | translate: { count: driver_list.length }
                        }}
                    </div>
                    @for (driver of driver_list; track driver) {
                        <a
                            matRipple
                            class="hover:bg-base-200 relative flex w-full items-center p-2 text-left"
                            [routerLink]="['/' + repo, driver]"
                            routerLinkActive="active"
                            (click)="setDriver(driver)"
                            [title]="driver"
                        >
                            @let status =
                                $safeNavigationMigration(
                                    statues()[repo + '|' + driver]
                                );
                            <div
                                name="dot"
                                [class.bg-warn]="!status"
                                [class.bg-success]="status === 'passed'"
                                [class.bg-error]="status === 'failed'"
                                class="mr-4 h-2 w-2 rounded-full shadow"
                            ></div>
                            <div
                                class="w-1/2 flex-1 truncate font-mono"
                                [innerHTML]="driver | driverFormat"
                            ></div>
                            <div
                                active
                                class="bg-primary absolute inset-y-1 right-0 hidden w-2 rounded-l-lg"
                            ></div>
                        </a>
                    }
                    <div
                        class="bg-base-200 m-2 w-[calc(100%-1rem)] rounded p-2 text-center opacity-60"
                    >
                        {{ 'DRIVER_LIST_END' | translate }}
                    </div>
                } @else {
                    <p class="w-full p-8 text-center opacity-30">
                        {{ 'LIST_EMPTY' | translate }}
                    </p>
                }
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                height: 100%;
            }
            a.active [active] {
                display: block !important;
            }
        `,
    ],
    imports: [
        MatFormField,
        MatSelect,
        FormsModule,
        MatOption,
        IconComponent,
        MatPrefix,
        MatInput,
        RouterLinkActive,
        RouterLink,
        DriverFormatPipe,
        TranslatePipe,
    ],
})
export class SidebarComponent {
    private _build = inject(SpecBuildService);

    private _search_filter = signal('');

    public get repos() {
        return this._build.repositories;
    }
    public readonly drivers = computed(() => {
        const filter = this._search_filter().toLowerCase();
        return this._build
            .driver_list()
            .filter((d: string) => d.toLowerCase().includes(filter))
            .sort((a: string, b: string) => a.localeCompare(b));
    });
    public get statues() {
        return this._build.test_statuses;
    }

    public readonly setRepo = (id: string) => this._build.setRepository(id);
    public readonly setDriver = (id: string) => this._build.setDriver(id);
    public readonly setFilter = (s: string) => {
        this.search_str.set(s);
        this._search_filter.set(s);
    };

    public readonly search_str = signal('');

    public get repo() {
        return this._build.getRepository();
    }

}
