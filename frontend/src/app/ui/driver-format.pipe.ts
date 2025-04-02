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
            return `<div class="formatted-driver-name">${parts
                .map((i) => `<div class="name-part">${i}</div>`)
                .join(
                    '<div class="icon"><i class="material-icons">keyboard_arrow_right</i></div>',
                )}</div>`;
        }
        return format;
    }
}
