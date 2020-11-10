import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {GestureConfig, MatCommonModule} from '@angular/material/core';
import {HAMMER_GESTURE_CONFIG} from '@angular/platform-browser';

import {RangeSlider} from './range_slider';

@NgModule({
  declarations: [RangeSlider],
  exports: [RangeSlider],
  imports: [
    CommonModule,
    MatCommonModule,
  ],
  providers: [{provide: HAMMER_GESTURE_CONFIG, useClass: GestureConfig}]
})
export class RangeSliderModule {
}
