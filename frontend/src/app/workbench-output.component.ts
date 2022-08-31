import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { BaseClass } from './common/base.class';
import { SpecBuildService } from './services/build.service';
import { SpecTestService } from './services/test.service';

@Component({
    selector: 'workbench-output',
    template: `
        <div
            name="output"
            [class]="
                'absolute inset-0 flex flex-col border-t border-white text-white ' +
                (fullscreen ? 'fullscreen' : '')
            "
        >
            <div class="flex items-center p-2 w-full space-x-2">
                <button mat-button (click)="runTestsWithFeedback()">Run Tests</button>
                <button mat-button *ngIf="running" (click)="cancelTests()">Cancel Tests</button>
                <mat-spinner *ngIf="running" [diameter]="32"></mat-spinner>
                <div class="flex-1 w-0"></div>
                <button mat-icon-button (click)="fullscreen = !fullscreen">
                    <i class="material-icons">{{
                        fullscreen ? 'keyboard_arrow_down' : 'keyboard_arrow_up'
                    }}</i>
                </button>
            </div>
            <div class="flex-1 w-full overflow-auto" #body>
                <a-terminal
                    *ngIf="!running || results"
                    [content]="results || 'No test results to display'"
                    [resize]="fullscreen"
                ></a-terminal>
            </div>
            </div>
    `,
    styles: [
        `
            :host {
                position: relative;
                height: 100%;
                width: 100%;
            }

            [name='output'] {
                background-color: #424242;
                transition: top 200ms;
                top: 0;
            }

            .fullscreen {
                top: -21.5rem;
            }
        `,
    ],
})
export class WorkbenchOutputComponent extends BaseClass implements OnInit {
    public results: string = '';
    public fullscreen: boolean = false;
    public running: boolean = false;

    public readonly runTests = async () => {
        this.running = true;
        this.results = this.processResults(
            await this._tests.runSpec({}).catch((i) => i)
        );
        this.running = false;
    };

    public readonly runTestsWithFeedback = async () => {
        this.results = '';
        this.running = true;
        if (localStorage.getItem('DEBUG_WITH_API')) {
            this.runTests();
        } else {
            this.subscription('test', this._tests.runSpecWithFeedback().subscribe(
                (data) => this.results += this.processResults(data), 
                () => this.running = false, 
                () => this.running = false
            ));
        }
    }

    @ViewChild('body') private _body_el: ElementRef<HTMLDivElement>;

    constructor(
        private _build: SpecBuildService,
        private _tests: SpecTestService
    ) {
        super();
    }

    public ngOnInit(): void {
        this.subscription(
            'driver',
            this._build.active_driver.subscribe(() => (this.results = ''))
        );
    }

    public cancelTests() {
        this.timeout('terminate', () => {
            this.unsub('test');
            this.running = false;
        });
    }

    private processResults(details: string): string {
        const success = details.indexOf('exited with 0') >= 0;
        this._build.setTestStatus(success ? 'passed' : 'failed');
        if (success) this.cancelTests();
        this.timeout(
            'scroll',
            () =>
                this._body_el.nativeElement.scrollTo(
                    0,
                    this._body_el.nativeElement.scrollHeight
                ),
            10
        );
        return details;
    }
}
