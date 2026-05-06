import { ChangeDetectionStrategy, Component, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { LibraryService } from '../../services/library.service';
import { IconComponent } from '../../components/icon/icon.component';
import { WatchEntry } from '../../models/types';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-2xl space-y-8">
      <header>
        <h1 class="text-3xl font-bold">Settings</h1>
      </header>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold">Appearance</h2>
        <div class="flex gap-2">
          <button
            type="button"
            class="chip"
            [class.chip-active]="settings.theme() === 'light'"
            (click)="settings.setTheme('light')"
          >
            Light
          </button>
          <button
            type="button"
            class="chip"
            [class.chip-active]="settings.theme() === 'dark'"
            (click)="settings.setTheme('dark')"
          >
            Dark
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold">OMDb API key</h2>
        <p class="text-sm text-ink-muted dark:text-ink-dark-muted">
          Used to search movies and series.
          <a class="text-accent hover:underline" href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noreferrer">
            Get a free key
          </a>
          (1000 requests/day). The key is stored only in your browser's localStorage.
        </p>
        <div class="flex gap-2">
          <input
            type="password"
            [(ngModel)]="keyDraft"
            name="key"
            class="input"
            placeholder="Paste your OMDb key…"
          />
          <button type="button" class="btn-primary whitespace-nowrap" (click)="saveKey()">
            @if (savedFlash()) {
              <app-icon name="check" [size]="16" /> Saved
            } @else {
              Save
            }
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold">Backup</h2>
        <p class="text-sm text-ink-muted dark:text-ink-dark-muted">
          Export your library to a JSON file, or import one. Useful for moving between devices or making a snapshot.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-outline"
            (click)="exportJson()"
            [disabled]="library.entries().length === 0"
          >
            Export {{ library.entries().length }} entries
          </button>
          <input
            #fileInput
            type="file"
            accept="application/json"
            class="hidden"
            (change)="onFileSelected($event)"
          />
          <button type="button" class="btn-outline" (click)="fileInput.click()">
            Import JSON
          </button>
        </div>
        @if (importMsg(); as msg) {
          <p class="text-sm">{{ msg }}</p>
        }
      </section>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-danger">Danger zone</h2>
        <button type="button" class="btn-danger" (click)="handleClear()" [disabled]="library.entries().length === 0">
          Clear library
        </button>
      </section>

      <section class="text-xs text-ink-muted dark:text-ink-dark-muted pt-6 border-t border-line dark:border-line-dark">
        Built for WEB-LAB6 · Angular 18 + TypeScript · Storage: IndexedDB (entries) + localStorage (preferences) · APIs: Jikan, OMDb.
      </section>
    </div>
  `,
})
export class SettingsComponent {
  settings = inject(SettingsService);
  library = inject(LibraryService);

  keyDraft = this.settings.omdbKey();
  savedFlash = signal(false);
  importMsg = signal<string | null>(null);

  saveKey() {
    this.settings.setOmdbKey(this.keyDraft.trim());
    this.savedFlash.set(true);
    setTimeout(() => this.savedFlash.set(false), 1500);
  }

  exportJson() {
    const blob = new Blob([JSON.stringify(this.library.entries(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reel-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.importMsg.set(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Expected an array of entries');
      await this.library.importMany(parsed as WatchEntry[]);
      this.importMsg.set(`Imported ${parsed.length} entries.`);
    } catch (e) {
      this.importMsg.set(`Import failed: ${(e as Error).message}`);
    }
  }

  handleClear() {
    if (!confirm('This will permanently delete all entries from your library. Continue?')) return;
    this.library.clearAll();
  }
}
