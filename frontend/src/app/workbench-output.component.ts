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
                    [disabled]="running() || !spec_file()"
                    (click)="runTests()"
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

    public readonly results = this._tests.run_output;
    public readonly fullscreen = signal(false);
    public readonly running = this._tests.run_active;
    public readonly spec_file = this._tests.active_spec;

    private readonly _body_el = viewChild<ElementRef<HTMLDivElement>>('body');

    constructor() {
        super();
        effect(() => {
            this._build.active_driver();
            this._tests.clearRunOutput();
        });
        effect(() => {
            if (!this._tests.run_output()) return;
            this.timeout(
                'scroll',
                () => {
                    const element = this._body_el()?.nativeElement;
                    element?.scrollTo(0, element.scrollHeight);
                },
                10,
            );
        });
    }

    public runTests() {
        this._tests.startSpecRun();
    }

    public cancelTests() {
        this.timeout('terminate', () => this._tests.stopSpecRun());
    }
}
