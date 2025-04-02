import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'driverFormat',
    standalone: false,
})
export class DriverFormatPipe implements PipeTransform {
    transform(format: string): string {
        if (format.indexOf('/') >= 0) {
            let parts = format.split('/');
            parts.splice(0, 1);
            parts = parts.map((p) => p.replace('.cr', ''));
            return `<div class="flex items-center space-x-2">${parts
                .map((i) => `<div class="name-part">${i}</div>`)
                .join(
                    '<i class="material-icons" style="font-size: 1.2rem !important;">keyboard_arrow_right</i>',
                )}</div>`;
        }
        return format;
    }
}
