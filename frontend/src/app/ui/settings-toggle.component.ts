import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'settings-toggle',
    template: `
        <button
            matRipple
            class="hover:bg-base-200 relative flex flex-1 items-center space-x-2 overflow-hidden rounded border py-1 pr-1 pl-2"
            [class.border-base-300]="!value"
            [class.border-info]="value"
            (click)="setValue(!value)"
        >
            <div
                class="bg-info absolute inset-0 opacity-10"
                *ngIf="value"
            ></div>
            <div class="ml-2 flex flex-1 items-center space-x-2 text-left">
                <div>{{ name }}</div>
                <icon *ngIf="info" [matTooltip]="info">info</icon>
            </div>
            <mat-checkbox
                [(ngModel)]="value"
                class="pointer-events-none"
            ></mat-checkbox>
        </button>
    `,
    styles: [
        `
            :host {
                display: flex;
            }
        `,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SettingsToggleComponent),
            multi: true,
        },
    ],
    standalone: false,
})
export class SettingsToggleComponent implements ControlValueAccessor {
    @Input() public name: string;
    @Input() public info: string;

    public value: boolean;

    /** Form control on change handler */
    private _onChange: (_: boolean) => void;
    /** Form control on touch handler */
    private _onTouch: (_: boolean) => void;

    public readonly registerOnChange = (fn) => (this._onChange = fn);
    public readonly registerOnTouched = (fn) => (this._onTouch = fn);

    /**
     * Update the form field value
     * @param new_value New value to set on the form field
     */
    public setValue(new_value: boolean): void {
        this.value = new_value;
        /* istanbul ignore else */
        if (this._onChange) this._onChange(new_value);
    }

    /* istanbul ignore next */
    /**
     * Update local value when form control value is changed
     * @param value The new value for the component
     */
    public writeValue(value: boolean) {
        this.value = value;
    }
}
