import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-icon,icon',
    template: `
        <div class="flex h-[1.25em] w-[1.25em] items-center justify-center">
            <i
                *ngIf="!icon || icon.type !== 'img'"
                [class]="icon?.class || className"
            >
                {{ icon?.content }}
                <ng-content></ng-content>
            </i>
            <img
                class="h-[1em] w-[1em]"
                *ngIf="icon && icon.type === 'img'"
                [src]="icon.src | safe: 'resource'"
            />
        </div>
    `,
    styles: [
        `
            i {
                font-size: 1em;
            }
        `,
    ],
    standalone: false,
})
export class IconComponent {
    @Input() public className: string = 'material-icons';
    /** Icon details */
    @Input() public icon: {
        class: string;
        src: string;
        type: 'img' | 'icon';
        content: string;
    };
}
