import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="game-container">
      <app-game-canvas></app-game-canvas>
    </div>
  `,
  styles: [`
    .game-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #f0f0f0;
    }
  `]
})
export class AppComponent {
  title = 'agario-clone';
}
