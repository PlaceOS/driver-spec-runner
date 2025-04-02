import {
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import { AsyncHandler } from '../common/async-handler.class';

@Component({
    selector: 'a-terminal',
    template: `
        <div
            name="terminal"
            class="h-full w-full overflow-hidden bg-[#212121]"
            #container
            (window:resize)="resizeTerminal()"
        >
            <div class="min-h-full max-w-full" #terminal></div>
        </div>
    `,
    styles: [``],
    standalone: false,
})
export class TerminalComponent
    extends AsyncHandler
    implements OnInit, OnChanges, OnDestroy
{
    /** Contents to display on the terminal */
    @Input() public content: string = '';
    /** Resizes terminal display on change */
    @Input() public resize: boolean = false;
    /** Local instance of an xterm terminal */
    public terminal: Terminal;
    public fit_addon: FitAddon;

    @ViewChild('terminal', { static: true })
    public terminal_element: ElementRef<HTMLDivElement>;
    @ViewChild('container', { static: true })
    public container_el: ElementRef<HTMLDivElement>;

    public ngOnInit(): void {
        if (this.terminal) this.ngOnDestroy();
        this.terminal = new Terminal({
            theme: {
                background: `#212121`,
                red: '#e53935',
                blue: '#1e88e5',
                yellow: '#fdd835',
                green: '#43a047',
            },
            fontSize: 14,
            scrollback: 50000,
        });
        this.fit_addon = new FitAddon();
        this.terminal.open(this.terminal_element.nativeElement);
        this.terminal.loadAddon(this.fit_addon);
        this.timeout('init', () => {
            this.resizeTerminal();
            this.updateTerminalContents(this.content || '');
        });
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.content) {
            this.updateTerminalContents(this.content || '');
        }
        if (changes.resize) {
            this.timeout('resize', () => this.resizeTerminal());
        }
    }

    public ngOnDestroy(): void {
        this.terminal.clear();
        this.terminal.dispose();
    }

    /**
     * Resize the terminal display to fill the container element
     */
    public resizeTerminal(): void {
        if (!this.fit_addon || !this.container_el) return;
        this.fit_addon.fit();
    }

    /**
     * Update the rendered contents of the terminal view
     * @param new_content New contents to render
     */
    private updateTerminalContents(new_content: string) {
        if (!this.terminal) return;
        this.terminal.clear();
        const lines: string[] = new_content.replace(/\\n/g, '\n').split('\n');
        for (const line of lines) this.terminal.writeln(line);
        this.timeout('scroll', () => this.terminal.scrollToBottom(), 50);
    }
}
