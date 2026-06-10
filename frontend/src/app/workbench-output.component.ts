import {
    Component,
    ElementRef,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
import { AsyncHandler } from './common/async-handler.class';
import { SpecBuildService } from './services/build.service';
import { SpecTestService } from './services/test.service';
import { IconComponent } from './ui/icon.component';
import { TerminalComponent } from './ui/terminal.component';
import { TranslatePipe } from './ui/translate.pipe';

@Component({
    selector: 'workbench-output',
    template: `
        <div
            name="output"
            [class.fullscreen]="fullscreen()"
            class="border-base-400 text-neutral-content bg-neutral absolute inset-0 flex flex-col border-t"
        >
            <div class="flex w-full items-center gap-2 p-2">
                <button
                    icon
                    default
                    matRipple
                    [matTooltip]="'TESTS_RUN' | translate"
                    [disabled]="running()"
                    (click)="runTestsWithFeedback()"
                >
                    @if (running()) {
                        <mat-spinner [diameter]="24" />
                    } @else {
                        <icon>play_arrow</icon>
                    }
                </button>
                @if (running()) {
                    <button
                        icon
                        default
                        error
                        matRipple
                        [matTooltip]="'TESTS_CANCEL' | translate"
                        (click)="cancelTests()"
                    >
                        <icon>stop</icon>
                    </button>
                }
                <div class="w-0 flex-1"></div>
                <button icon (click)="fullscreen.update((value) => !value)">
                    <icon>{{
                        fullscreen()
                            ? 'keyboard_arrow_down'
                            : 'keyboard_arrow_up'
                    }}</icon>
                </button>
            </div>
            <div class="w-full flex-1 overflow-auto" #body>
                @if (!running() || results()) {
                    <a-terminal
                        [content]="
                            results() || 'TESTS_RESULTS_EMPTY' | translate
                        "
                        [resize]="fullscreen()"
                    />
                }
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
                transition: top 200ms;
                top: 0;
            }

            .fullscreen {
                top: -21.5rem;
            }
        `,
    ],
    imports: [
        MatProgressSpinner,
        IconComponent,
        TerminalComponent,
        TranslatePipe,
        MatTooltip,
    ],
})
export class WorkbenchOutputComponent extends AsyncHandler {
    private _build = inject(SpecBuildService);
    private _tests = inject(SpecTestService);

    public readonly results = signal('');
    public readonly fullscreen = signal(false);
    public readonly running = signal(false);

    constructor() {
        super();
        effect(() => {
            this._build.active_driver();
            this.results.set('');
        });
    }

    public readonly runTests = async () => {
        this.running.set(true);
        this.results.set(
            this.processResults(await this._tests.runSpec({}).catch((i) => i)),
        );
        this.running.set(false);
    };

    public readonly runTestsWithFeedback = async () => {
        this.results.set('');
        this.running.set(true);
        if (localStorage.getItem('DEBUG_WITH_API')) {
            this.runTests();
        } else {
            this.subscription(
                'test',
                this._tests.runSpecWithFeedback(
                    {},
                    (data) =>
                        this.results.update(
                            (current) => current + this.processResults(data),
                        ),
                    () => this.running.set(false),
                ),
            );
        }
    };

    private readonly _body_el = viewChild<ElementRef<HTMLDivElement>>('body');

    public cancelTests() {
        this.timeout('terminate', () => {
            this.unsub('test');
            this.running.set(false);
        });
    }

    private processResults(details: string): string {
        const success = details.indexOf('exited with 0') >= 0;
        this._build.setTestStatus(success ? 'passed' : 'failed');
        if (success) this.cancelTests();
        this.timeout(
            'scroll',
            () =>
                this._body_el().nativeElement.scrollTo(
                    0,
                    this._body_el().nativeElement.scrollHeight,
                ),
            10,
        );
        return details;
    }
}
