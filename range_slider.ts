import {coerceBooleanProperty, coerceNumberProperty} from '@angular/cdk/coercion';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {ControlValueAccessor} from '@angular/forms';
import {CanDisable, FocusMonitor, FocusOrigin} from '@angular/material/core';
import {_MatSliderMixinBase, MAT_SLIDER_VALUE_ACCESSOR} from '@angular/material/slider';
import {Subscription} from 'rxjs';

/** A data structure of value of range slider. */
interface RangeSliderValue {
  min: number;
  max: number;
}

/** A simple change event emitted by the RangeSlider component. */
export class RangeSliderChange {
  /** The RangeSlider that changed. */
  source!: RangeSlider;

  /** The new min value of the source slider. */
  minValue!: number|null;

  /** The new max value of the source slider. */
  maxValue!: number|null;
}

/**
 * Allows users to select a range interval from another range of values by
 * moving the slider thumb.
 */
@Component({
  preserveWhitespaces: false,
  moduleId: module.id,
  selector: 'cos-range-slider',
  exportAs: 'cosRangeSlider',
  templateUrl: './range_slider.ng.html',
  styleUrls: ['range_slider.css'],
  inputs: ['disabled', 'color', 'tabIndex'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MAT_SLIDER_VALUE_ACCESSOR],
  host: {
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(mouseenter)': 'onMouseEnter()',
    '(slide)': 'onSlide($event)',
    '(slideend)': 'onSlideEnd()',
    '(slidestart)': 'onSlideStart($event)',
    'class': 'mat-slider mat-slider-horizontal',
    'role': 'slider',
    '[tabIndex]': 'tabIndex',
    '[attr.aria-disabled]': 'disabled',
    '[attr.aria-valuemax]': 'max',
    '[attr.aria-valuemin]': 'min',
    '[attr.aria-valuenow]': 'value',
    '[attr.aria-valuenowmin]': 'minValue',
    '[attr.aria-valuenowmax]': 'maxValue',
    '[attr.aria-orientation]': '"horizontal"',
    '[class.mat-slider-disabled]': 'disabled',
    '[class.mat-slider-sliding]': 'isSliding',
    '[class.mat-slider-thumb-label-showing]': 'thumbLabel',
    '[class.mat-slider-min-value]': 'isStartValue',
  }
})
export class RangeSlider extends _MatSliderMixinBase implements
    OnInit, OnDestroy, CanDisable, ControlValueAccessor {
  private clickedPoint?: 'min'|'max';

  private focusSubscription!: Subscription;

  /** The dimensions of the slider. */
  private dimensions: ClientRect|null = null;

  /** Decimal places to round to, based on the step amount. */
  private roundToDecimal = 1;

  private controlValueAccessorChangeFn:
      (value: RangeSliderValue) => void = () => {};

  // tslint:disable-next-line:no-any Override ControlValueAccessor method.
  private onTouched: () => any = () => {};

  /** Reference to the inner slider wrapper element. */
  @ViewChild('sliderWrapper') private sliderWrapper!: ElementRef;

  get percentValue(): RangeSliderValue {
    return this.percentValueInt;
  }
  private percentValueInt: RangeSliderValue = {'min': 0, 'max': 1};

  /** Whether or not to show the thumb label. */
  @Input()
  get thumbLabel(): boolean {
    return this.thumbLabelInt;
  }
  set thumbLabel(value: boolean) {
    this.thumbLabelInt = coerceBooleanProperty(value);
  }
  private thumbLabelInt = false;


  /** The maximum value that the slider can have. */
  @Input()
  get max(): number {
    return this.maxInt;
  }
  set max(v: number) {
    this.maxInt = coerceNumberProperty(v, this.maxInt);

    if (this.maxValueInt === null) {
      this.maxValue = this.maxInt;
    }

    if (this.minValue && this.maxValue) {
      this.percentValueInt =
          this.calculatePercentage({min: this.minValue, max: this.maxValue});
    }

    // Since this also modifies the percentage, we need to let the change
    // detection know.
    this.changeDetectorRef.markForCheck();
  }
  private maxInt = 100;

  /** The minimum value that the slider can have. */
  @Input()
  get min(): number {
    return this.minInt;
  }
  set min(v: number) {
    this.minInt = coerceNumberProperty(v, this.minInt);

    // If the value wasn't explicitly set by the user, set it to the min.
    if (this.minValueInt === null) {
      this.minValue = this.minInt;
    }
    if (this.minValue && this.maxValue) {
      this.percentValueInt =
          this.calculatePercentage({min: this.minValue, max: this.maxValue});
    }

    // Since this also modifies the percentage, we need to let the change
    // detection know.
    this.changeDetectorRef.markForCheck();
  }
  private minInt = 0;

  /** The values at which the thumb will snap. */
  @Input()
  get step(): number {
    return this.stepInt;
  }
  set step(v: number) {
    this.stepInt = coerceNumberProperty(v, this.stepInt);

    if (this.stepInt % 1 !== 0) {
      this.roundToDecimal = this.stepInt.toString().split('.').pop()!.length;
    }

    // Since this also modifies the percentage, we need to let the change
    // detection know.
    this.changeDetectorRef.markForCheck();
  }
  private stepInt = 1;

  /** The minimum current value */
  @Input()
  get minValue(): number|null {
    if (this.minValueInt === null) {
      this.minValue = this.min;
    }
    return this.minValueInt;
  }
  set minValue(v: number|null) {
    if (v !== this.minValueInt) {
      // tslint:disable:ban Needed to round getting value.
      this.minValueInt =
          parseFloat(coerceNumberProperty(v).toFixed(this.roundToDecimal));
      // tslint:enable:ban
      this.percentValueInt = this.calculatePercentage(
          {min: this.minValueInt, max: this.maxValueInt!});

      // Since this also modifies the percentage, we need to let the change
      // detection know.
      this.changeDetectorRef.markForCheck();
    }
  }
  private minValueInt: number|null = null;

  /** The maximum current value */
  @Input()
  get maxValue(): number|null {
    if (this.maxValueInt === null) {
      this.maxValue = this.max;
    }
    return this.maxValueInt;
  }
  set maxValue(v: number|null) {
    if (v !== this.maxValueInt) {
      // tslint:disable:ban Needed to round getting value.
      this.maxValueInt =
          parseFloat(coerceNumberProperty(v).toFixed(this.roundToDecimal));
      // tslint:enable:ban
      this.percentValueInt = this.calculatePercentage(
          {min: this.minValueInt!, max: this.maxValueInt});

      // Since this also modifies the percentage, we need to let the change
      // detection know.
      this.changeDetectorRef.markForCheck();
    }
  }
  private maxValueInt: number|null = null;

  /**
   * Function that will be used to format the value before it is displayed
   * in the thumb label. Can be used to format very large number in order
   * for them to fit into the slider thumb.
   */
  @Input() displayWith?: (value: number|null) => string | number;

  /** Event emitted when slider values has changed, */
  @Output() readonly change = new EventEmitter<RangeSliderChange>();

  /** Event emitted when the slider thumb moves. */
  @Output() readonly input = new EventEmitter<RangeSliderChange>();

  /** The minimum value to be used for display purposes. */
  get minDisplayValue(): string|number {
    if (this.displayWith) {
      return this.displayWith(this.minValue);
    }

    if (this.roundToDecimal && this.minValue && this.minValue % 1 !== 0) {
      return this.minValue.toFixed(this.roundToDecimal);
    }

    return this.minValue || this.min;
  }

  /** The maximum value to be used for display purposes. */
  get maxDisplayValue(): string|number {
    if (this.displayWith) {
      return this.displayWith(this.maxValue);
    }

    if (this.roundToDecimal && this.maxValue && this.maxValue % 1 !== 0) {
      return this.maxValue.toFixed(this.roundToDecimal);
    }

    return this.maxValue || this.max;
  }

  /** Whether the slider is at its start init value. */
  get isStartValue() {
    return this.percentValue.min === 0 && this.percentValue.max === 1;
  }

  /**
   * Whether or not the slider is active (clicked or sliding).
   * Used to shrink and grow the thumb as according to the Material Design spec.
   */
  isActive = false;

  /**
   * Whether or not the thumb is sliding.
   * Used to determine if there should be a transition for the thumb and fill
   * track.
   */
  isSliding = false;

  /** CSS styles for the track fill element. */
  get trackFillStyles(): {[key: string]: string} {
    const translate = Math.round(this.percentValue.min * 100);
    const scale = (1 - this.percentValue.min) - (1 - this.percentValue.max);

    return {transform: `translateX(${translate}%) scale3d(${scale},1,1)`};
  }

  constructor(
      readonly elementRef: ElementRef,
      private readonly focusMonitor: FocusMonitor,
      private readonly changeDetectorRef: ChangeDetectorRef) {
    super(elementRef);
  }

  /** @override */
  ngOnInit() {
    this.focusSubscription =
        this.focusMonitor.monitor(this.elementRef.nativeElement, true)
            .subscribe((origin: FocusOrigin) => {
              this.isActive = !!origin && origin !== 'keyboard';
              this.changeDetectorRef.detectChanges();
            });
  }

  /** @override */
  ngOnDestroy() {
    this.focusMonitor.stopMonitoring(this.elementRef.nativeElement);
    this.focusSubscription.unsubscribe();
  }

  onFocus() {
    this.dimensions = this.getSliderDimensions();
  }

  onBlur() {
    this.onTouched();
  }

  onMouseDown(point: 'min'|'max') {
    this.clickedPoint = point;
  }

  onMouseEnter() {
    if (this.disabled) {
      return;
    }
    this.dimensions = this.getSliderDimensions();
  }

  onTrackClick(event: MouseEvent) {
    if (this.disabled) {
      return;
    }
    const oldMinValue = this.minValue;
    const oldMaxValue = this.maxValue;

    this.updateValueFromPosition(
        this.clickedPoint, {x: event.clientX, y: event.clientY});

    this.clickedPoint = undefined;
    this.isSliding = false;

    // Emit a change and input event if any value changed.
    if ((oldMinValue !== this.minValue) || (oldMaxValue !== this.maxValue)) {
      this.emitInputEvent();
      this.emitChangeEvent();
    }
  }

  onRingClick(event: MouseEvent, point: 'min'|'max') {
    if (this.disabled) {
      return;
    }
    this.clickedPoint = point;
  }

  onSlide(event: Event) {
    if (this.disabled) {
      return;
    }

    if (!this.isSliding) {
      this.onSlideStart(null);
    }
    event.preventDefault();

    const oldMinValue = this.minValue;
    const oldMaxValue = this.maxValue;

    this.updateValueFromPosition(
        this.clickedPoint, {x: event.center.x, y: event.center.y});

    // Emit a change and input event if any value changed.
    if ((oldMinValue !== this.minValue) || (oldMaxValue !== this.maxValue)) {
      this.emitInputEvent();
      this.emitChangeEvent();
    }
  }

  onSlideStart(event: Event|null) {
    if (this.disabled || this.isSliding) {
      return;
    }
    this.onMouseEnter();

    this.isSliding = true;

    if (event) {
      const oldMinValue = this.minValue;
      const oldMaxValue = this.maxValue;

      this.updateValueFromPosition(
          this.clickedPoint, {x: event.center.x, y: event.center.y});

      // Emit a change and input event if any value changed.
      if ((oldMinValue !== this.minValue) || (oldMaxValue !== this.maxValue)) {
        this.emitInputEvent();
        this.emitChangeEvent();
      }
      event.preventDefault();
    }
  }

  onSlideEnd() {
    this.isSliding = false;
  }

  /** CSS styles for the track background element. */
  trackBackgroundStyles(point: 'min'|'max'): {[key: string]: string} {
    const percentValue = this.percentValue[point];
    const percentRestValue = 1 - percentValue;
    const value = Math.round(percentValue * 100);
    const restValue = 100 - value;

    const translate = point === 'min' ? -restValue : 0;
    const scale = point === 'min' ? percentValue : percentRestValue;

    return {transform: `translateX(${translate}%) scale3d(${scale},1,1)`};
  }


  /** CSS styles for the thumb container element. */
  thumbContainerStyles(point: 'min'|'max'): {[key: string]: string} {
    const offset = (1 - this.percentValue[point]) * 100;
    return {'transform': `translateX(-${offset}%)`};
  }

  /** CSS classes for the thumb container element. */
  thumbContainerClasses(point: 'min'|'max'): string[] {
    const res: string[] = [];

    if (this.clickedPoint && this.clickedPoint === point) {
      res.push('active');
    }
    return res;
  }

  /** Calculates the percentage of the slider that a value is. */
  private calculatePercentage(value: RangeSliderValue): RangeSliderValue {
    return {
      min: ((value.min || 0) - this.min) / (this.max - this.min),
      max: ((value.max || 0) - this.min) / (this.max - this.min),
    };
  }

  /** Calculates the value a percentage of the slider corresponds to. */
  private calculateValue(percentage: number) {
    return this.min + percentage * (this.max - this.min);
  }


  private updateValueFromPosition(
      valueType: 'min'|'max'|undefined, pos: {x: number, y: number}) {
    const updateValue = (type: 'min'|'max', val: number) => {
      if (type === 'min') {
        this.minValue = val < this.maxValue!? val : this.maxValue;
      } else if (type === 'max') {
        this.maxValue = val > this.minValue!? val : this.minValue;
      }
    };

    if (!this.dimensions || !valueType) {
      return;
    }

    const offset = this.dimensions.left;
    const size = this.dimensions.width;
    const posComponent = pos.x;

    // The exact value is calculated from the event and used to find the closest
    // snap value
    const percent = RangeSlider.clamp((posComponent - offset) / size);

    if (percent === 0) {
      updateValue(valueType, this.min);
    } else if (percent === 1) {
      updateValue(valueType, this.max);
    } else {
      const exactValue = this.calculateValue(percent);

      const closestValue =
          Math.round((exactValue - this.min) / this.step) * this.step +
          this.min;
      updateValue(
          valueType, RangeSlider.clamp(closestValue, this.min, this.max));
    }
  }

  /**
   * Get the bounding client rect of the slider track element.
   * The track is used rather than the native element to ignore the extra space
   * that the thumb can take up.
   */
  private getSliderDimensions() {
    return this.sliderWrapper ?
        this.sliderWrapper.nativeElement.getBoundingClientRect() :
        null;
  }

  /** Return a number between two numbers. */
  private static clamp(value: number, min = 0, max = 1) {
    return Math.max(min, Math.min(value, max));
  }

  /**
   * Emits a change event if the current values is different from the last
   * emitted value.
   */
  private emitChangeEvent() {
    this.controlValueAccessorChangeFn(
        {min: this.minValue!, max: this.maxValue!});
    this.change.emit(this.createChangeEvent());
  }

  /**
   * Emits an input event when the current value is different from the last
   * emitted value.
   */
  private emitInputEvent() {
    this.input.emit(this.createChangeEvent());
  }

  /** Creates a range slider change object from specified values. */
  private createChangeEvent(minValue = this.minValue, maxValue = this.maxValue):
      RangeSliderChange {
    const event = new RangeSliderChange();

    event.source = this;
    event.minValue = minValue;
    event.maxValue = maxValue;

    return event;
  }

  /**
   * Sets the model value. Implemented as part of ControlValueAccessor.
   * @override
   * @param value
   */
  writeValue(value: RangeSliderValue) {
    this.minValue = value.min;
    this.maxValue = value.max;
  }

  /**
   * Register a callback to be triggered when the value has changed.
   * Implemented as part of ControlValueAccessor.
   * @override
   * @param fn Callback to be registered.
   */
  registerOnChange(fn: (value: RangeSliderValue) => void) {
    this.controlValueAccessorChangeFn = fn;
  }

  /**
   * Registers a callback to be triggered when the value has changed.
   * Implemented as part of ControlValueAccessor.
   * @override
   * @param fn Callback to be registered.
   */
  // tslint:disable-next-line:no-any Override ControlValueAccessor method.
  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  /**
   * Sets whether the component should be disabled.
   * Implemented as part of ControlValueAccessor.
   * @override
   * @param isDisabled
   */
  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }
}
