import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex items-center gap-0.5" [attr.aria-label]="'Rating ' + (value ?? 0) + '/10'">
      @for (s of stars; track s) {
        <span
          class="relative inline-block"
          [style.width.px]="size"
          [style.height.px]="size"
          (mouseleave)="hover.set(null)"
        >
          <svg
            viewBox="0 0 24 24"
            [attr.width]="size"
            [attr.height]="size"
            class="text-line dark:text-line-dark"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          >
            <path d="M12 17.3 5.82 21l1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.73L18.18 21z" />
          </svg>
          @if (filled(s) || half(s)) {
            <span class="absolute inset-0 overflow-hidden" [style.width.px]="half(s) ? size / 2 : size">
              <svg
                viewBox="0 0 24 24"
                [attr.width]="size"
                [attr.height]="size"
                class="text-accent"
                fill="currentColor"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              >
                <path d="M12 17.3 5.82 21l1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.73L18.18 21z" />
              </svg>
            </span>
          }
          @if (!readOnly) {
            <button
              type="button"
              class="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
              [attr.aria-label]="'Set rating to ' + (s * 2 - 1)"
              (mouseenter)="hover.set(s * 2 - 1)"
              (click)="handleClick(s, true)"
            ></button>
            <button
              type="button"
              class="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
              [attr.aria-label]="'Set rating to ' + (s * 2)"
              (mouseenter)="hover.set(s * 2)"
              (click)="handleClick(s, false)"
            ></button>
          }
        </span>
      }
      @if (value != null) {
        <span class="ml-1.5 text-xs text-ink-muted dark:text-ink-dark-muted">{{ (value / 2).toFixed(1) }}</span>
      }
    </div>
  `,
})
export class StarRatingComponent {
  @Input() value: number | null | undefined = null;
  @Input() readOnly = false;
  @Input() size = 18;
  @Output() valueChange = new EventEmitter<number | null>();

  hover = signal<number | null>(null);
  stars = [1, 2, 3, 4, 5];

  private display(): number {
    return this.hover() ?? this.value ?? 0;
  }

  filled(s: number): boolean {
    return this.display() >= s * 2;
  }

  half(s: number): boolean {
    return !this.filled(s) && this.display() >= s * 2 - 1;
  }

  handleClick(starIdx: number, half: boolean) {
    if (this.readOnly) return;
    const next = starIdx * 2 - (half ? 1 : 0);
    this.valueChange.emit(this.value === next ? null : next);
  }
}
