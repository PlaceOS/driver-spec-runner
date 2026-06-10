import { Pipe, PipeTransform, inject } from '@angular/core';

import { LocaleService } from '../services/locale.service';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
    private _locale = inject(LocaleService);

    public transform(value: string, args: Record<string, any> = {}) {
        return this._locale.get(value, args);
    }
}
