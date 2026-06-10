import {
    Component,
    input,
} from '@angular/core';
import { SafePipe } from './safe.pipe';

@Component({
    selector: 'app-icon,icon',
    template: `
        <div class="flex h-[1.25em] w-[1.25em] items-center justify-center">
            @let iconValue = icon();
            @if (!iconValue || iconValue.type !== 'img') {
                <i [class]="iconValue?.class || className()">
                    {{ iconValue?.content }}
                    <ng-content />
                </i>
            }
            @if (iconValue && iconValue.type === 'img') {
                <img
                    class="h-[1em] w-[1em]"
                    [src]="iconValue.src | safe: 'resource'"
                />
            }
        </div>
    `,
    styles: [
        `
            i {
                font-size: 1em;
            }
        `,
    ],
    imports: [SafePipe],
})
export class IconComponent {
    public readonly className = input<string>('material-icons');
    /** Icon details */
    public readonly icon = input<{
        class: string;
        src: string;
        type: 'img' | 'icon';
        content: string;
    }>();
}
