import { NgModule, Type } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SidebarComponent } from './sidebar.component';
import { TopbarHeaderComponent } from './topbar-header.component';
import { DriverFormatPipe } from './driver-format.pipe';
import { TerminalComponent } from './terminal.component';

const COMPONENTS: Type<any>[] = [
    SidebarComponent,
    TopbarHeaderComponent,
    DriverFormatPipe,
    TerminalComponent
]

const MAT_MODULES: any[] = [
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
];

const ANGULAR_MODULES: any[] = [
    FormsModule,
    ReactiveFormsModule
]

@NgModule({
    declarations: [COMPONENTS],
    imports: [CommonModule, RouterModule, ...MAT_MODULES, ...ANGULAR_MODULES],
    exports: [COMPONENTS, ...MAT_MODULES, ...ANGULAR_MODULES]
})
export class UIModule { }
