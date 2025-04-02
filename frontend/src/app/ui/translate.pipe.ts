import { Pipe, PipeTransform } from '@angular/core';

import { LocaleService } from '../services/locale.service';

@Pipe({
    name: 'translate',
    standalone: false,
})
export class TranslatePipe implements PipeTransform {
    constructor(private _locale: LocaleService) {}

    public transform(value: string, args: Record<string, any> = {}) {
        return this._locale.get(value, args);
    }
}
