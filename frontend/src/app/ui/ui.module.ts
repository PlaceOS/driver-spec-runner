import { CommonModule } from '@angular/common';
import { NgModule, Type } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DriverFormatPipe } from './driver-format.pipe';
import { IconComponent } from './icon.component';
import { SafePipe } from './safe.pipe';
import { SanitizePipe } from './sanitise.pipe';
import { SettingsToggleComponent } from './settings-toggle.component';
import { SidebarComponent } from './sidebar.component';
import { TerminalComponent } from './terminal.component';
import { TopbarHeaderComponent } from './topbar-header.component';
import { TranslatePipe } from './translate.pipe';

const COMPONENTS: Type<any>[] = [
    SidebarComponent,
    TopbarHeaderComponent,
    DriverFormatPipe,
    TerminalComponent,
    TranslatePipe,
    SafePipe,
    SanitizePipe,
    IconComponent,
    SettingsToggleComponent,
];

const MAT_MODULES: any[] = [
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
];

const ANGULAR_MODULES: any[] = [FormsModule, ReactiveFormsModule];

@NgModule({
    declarations: [COMPONENTS],
    imports: [CommonModule, RouterModule, ...MAT_MODULES, ...ANGULAR_MODULES],
    exports: [COMPONENTS, ...MAT_MODULES, ...ANGULAR_MODULES],
})
export class UIModule {}
