import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'driverFormat' })
export class DriverFormatPipe implements PipeTransform {
    transform(format: string): string {
        if (format.indexOf('/') >= 0) {
            let parts = format.split('/');
            parts.splice(0, 1);
            parts = parts.map((p) => p.replace('.cr', ''));
            return `<div class="flex items-center gap-1 truncate max-w-full">${parts
                .map((i) => `${i}`)
                .join(
                    '<i class="material-icons" style="font-size: 1.2rem !important;">keyboard_arrow_right</i>',
                )}</div>`;
        }
        return format;
    }
}
