import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block animate-spin rounded-full border-2 border-line dark:border-line-dark border-t-accent"
      [style.width.px]="size"
      [style.height.px]="size"
      aria-label="loading"
    ></span>
  `,
})
export class SpinnerComponent {
  @Input() size = 20;
}
