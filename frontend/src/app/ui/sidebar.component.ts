import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { SpecBuildService } from '../services/build.service';

@Component({
    selector: 'sidebar',
    template: `
        <mat-form-field appearance="outline" class="m-2">
            <mat-select [ngModel]="repo" (ngModelChange)="setRepo($event)">
                <mat-option *ngFor="let repo of repos | async" [value]="repo">
                    {{ repo }}
                </mat-option>
            </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="mb-2 mx-2">
            <i matPrefix class="material-icons">search</i>
            <input
                matInput
                [(ngModel)]="search_str"
                (ngModelChange)="setFilter($event)"
                placeholder="Filter drivers..."
            />
        </mat-form-field>
        <div class="overflow-y-auto flex-1 border-t border-gray-300">
            <ng-container *ngIf="(drivers | async)?.length; else empty_state">
                <a
                    *ngFor="let driver of drivers | async"
                    mat-button
                    class="w-full border-gray-200"
                    [routerLink]="['/' + repo, driver]"
                    routerLinkActive="active"
                    (click)="setDriver(driver)"
                    [title]="driver"
                >
                    <div class="flex items-center my-2">
                        <div
                            name="dot"
                            [class]="
                                'mr-4 h-2 w-2 rounded-full border border-white ' +
                                ((statues | async)[repo + '|' + driver]
                                    ? (statues | async)[repo + '|' + driver]
                                    : '')
                            "
                        ></div>
                        <div
                            class="truncate flex-1 w-1/2 "
                            [innerHTML]="driver | driverFormat"
                        ></div>
                    </div>
                </a>
            </ng-container>
        </div>
        <ng-template #empty_state>
            <p class="p-2 w-full text-center">No Drivers</p>
        </ng-template>
    `,
    styles: [
        `
            :host {
                display: flex;
                flex-direction: column;
                max-width: 20rem;
            }

            mat-form-field {
                height: 3.5rem;
            }

            p {
                margin: 1rem 0;
            }

            [name='dot'] {
                background-color: #ffb300;
            }

            [name='dot'].failed {
                background-color: #d50000;
            }

            [name='dot'].passed {
                background-color: #43a047;
            }

            a {
                border-bottom: 1px solid #edf2f7;
                border-radius: 0;
            }

            a.active {
                background-color: #c92366;
                color: #fff;
            }
        `,
    ],
})
export class SidebarComponent {
    private _search_filter = new BehaviorSubject<string>('');

    public readonly repos = this._build.repositories;
    public readonly drivers = combineLatest([
        this._build.driver_list,
        this._search_filter,
    ]).pipe(
        map((details) => {
            const [drivers, filter] = details;
            return drivers.filter((d) =>
                d.toLowerCase().includes(filter.toLowerCase())
            );
        })
    );
    public readonly statues = this._build.test_statuses;

    public readonly setRepo = (id) => this._build.setRepository(id);
    public readonly setDriver = (id) => this._build.setDriver(id);
    public readonly setFilter = (s) => this._search_filter.next(s);

    public search_str = '';

    public get repo() {
        return this._build.getRepository();
    }

    constructor(private _build: SpecBuildService) {}
}
