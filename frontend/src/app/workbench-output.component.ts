import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { BaseClass } from './common/base.class';
import { SpecBuildService } from './services/build.service';
import { SpecTestService } from './services/test.service';

@Component({
    selector: 'workbench-output',
    template: `
        <div name="output" [class]="'absolute inset-0 flex flex-col border-t border-white bg-gray-800 text-white ' + (fullscreen ? 'fullscreen' : '')">
            <div class="flex items-center p-2 w-full">
                <button mat-button (click)="runTests()">Run!</button>
                <div class="flex-1 w-0"></div>
                <button mat-icon-button (click)="fullscreen = !fullscreen">
                    <i class="material-icons">{{ fullscreen ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</i>
                </button>
            </div>
            <div class="flex-1 w-full overflow-auto" #body>
                <a-terminal *ngIf="!running" [content]="results || 'No test results to display'" [resize]="fullscreen"></a-terminal>
            </div>
            <div *ngIf="running" class="absolute inset-0 bg-white bg-opacity-25 flex items-center justify-center">
                <mat-spinner [diameter]="48"></mat-spinner>
            </div>
        </div>
    `,
    styles: [`
        :host {
            position: relative;
            height: 100%;
            width: 100%;
        }

        [name="output"] {
            transition: top 200ms;
            top: 0;
        }

        .fullscreen {
            top: -24rem;
        }
    `]
})
export class WorkbenchOutputComponent extends BaseClass implements OnInit {
    public results: string = '';
    public fullscreen: boolean = false;
    public running: boolean = false;

    public readonly runTests = async () => {
        this.running = true;
        this.results = this.processResults(await this._tests.runSpec({}).catch(i => i));
        this.running = false;
    };

    @ViewChild('body') private _body_el: ElementRef<HTMLDivElement>;

    constructor(private _build: SpecBuildService, private _tests: SpecTestService) {
        super();
    }

    public ngOnInit(): void {
        this.subscription('driver', this._build.active_driver.subscribe(() => this.results = ''));
    }

    private processResults(details: any): string {
        if (details instanceof Object) {
            details = details.error;
        }
        const success = details.indexOf('exited with 0') >= 0;
        this._build.setTestStatus(success ? 'passed' : 'failed');
        this.timeout('scroll', () => this._body_el.nativeElement.scrollTo(0, this._body_el.nativeElement.scrollHeight), 10);
        return details;
    }
}
