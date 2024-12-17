import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { GameService, Cell, GameMap } from '../../services/game.service';

interface GameState {
  player: Cell | null;
  bots: Cell[];
  food: Cell[];
  viruses: Cell[];
  map: GameMap;
  gameOver: boolean;
  score: number;
}

@Component({
  selector: 'app-game-canvas',
  template: `
    <canvas #gameCanvas
            [width]="canvasWidth"
            [height]="canvasHeight"
            (mousemove)="onMouseMove($event)">
    </canvas>
    <div class="score" *ngIf="currentGameState.player">
      Mass: {{currentGameState.player.mass | number:'1.0-0'}}
    </div>
    <div class="game-over" *ngIf="currentGameState.gameOver">
      <div class="game-over-content">
        <h2>Game Over!</h2>
        <p>Final Score: {{currentGameState.score}}</p>
        <button (click)="restartGame()">Play Again</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: relative;
      display: block;
    }
    canvas {
      background-color: #000;
      border: 2px solid #00ffff;
      box-shadow: 0 0 20px #00ffff80;
    }
    .score {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      font-size: 24px;
      text-shadow: 0 0 10px #00ffff;
    }
    .game-over {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .game-over-content {
      text-align: center;
      color: #00ffff;
      font-family: 'Courier New', monospace;
    }
    .game-over-content h2 {
      font-size: 48px;
      margin-bottom: 20px;
      text-shadow: 0 0 20px #00ffff;
    }
    .game-over-content p {
      font-size: 24px;
      margin-bottom: 30px;
      text-shadow: 0 0 10px #00ffff;
    }
    button {
      background-color: transparent;
      border: 2px solid #00ffff;
      color: #00ffff;
      padding: 10px 20px;
      font-family: 'Courier New', monospace;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-shadow: 0 0 10px #00ffff;
      box-shadow: 0 0 10px #00ffff80;
    }
    button:hover {
      background-color: #00ffff20;
      box-shadow: 0 0 20px #00ffff;
    }
  `]
})
export class GameCanvasComponent implements OnInit, AfterViewInit {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  canvasWidth = window.innerWidth - 20;
  canvasHeight = window.innerHeight - 20;
  private animationFrameId: number = 0;
  private mousePosition = { x: 0, y: 0 };
  currentGameState: GameState = {
    player: null,
    bots: [],
    food: [],
    viruses: [],
    map: {
      width: 0,
      height: 0,
      viewportX: 0,
      viewportY: 0
    },
    gameOver: false,
    score: 0
  };

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.gameService.gameState$.subscribe((state: GameState) => {
      this.currentGameState = state;
      this.draw();
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.shadowBlur = 15;
    this.startGameLoop();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    switch(event.code) {
      case 'Space':
        this.gameService.splitCell();
        break;
      case 'KeyW':
        this.gameService.ejectMass();
        break;
    }
  }

  private startGameLoop(): void {
    const gameLoop = () => {
      // Update player position based on current mouse position
      this.updatePlayerPosition();
      this.gameService.updateBots();
      this.gameService.checkCollisions();
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };
    gameLoop();
  }

  onMouseMove(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private updatePlayerPosition(): void {
    this.gameService.updatePlayerPosition(this.mousePosition.x, this.mousePosition.y);
  }

  private draw(): void {
    if (!this.ctx) return;

    // Clear canvas with a dark background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw grid
    this.drawGrid();

    // Apply viewport transform
    this.ctx.save();
    this.ctx.translate(-this.currentGameState.map.viewportX, -this.currentGameState.map.viewportY);

    // Draw game elements
    this.drawFood();
    this.drawViruses();
    this.drawBots();
    if (this.currentGameState.player) {
      this.drawCell(this.currentGameState.player);
    }

    // Restore transform
    this.ctx.restore();
  }

  private drawGrid(): void {
    const gridSize = 50;
    const offsetX = -this.currentGameState.map.viewportX % gridSize;
    const offsetY = -this.currentGameState.map.viewportY % gridSize;

    this.ctx.strokeStyle = '#ffffff10';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    // Vertical lines
    for (let x = offsetX; x <= this.canvasWidth; x += gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasHeight);
    }

    // Horizontal lines
    for (let y = offsetY; y <= this.canvasHeight; y += gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasWidth, y);
    }

    this.ctx.stroke();
  }

  private drawCell(cell: Cell): void {
    // Glow effect
    this.ctx.shadowColor = cell.glowColor || cell.color;
    this.ctx.shadowBlur = 20;

    // Main cell
    this.ctx.beginPath();
    this.ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = cell.color;
    this.ctx.fill();

    // Cell border
    this.ctx.strokeStyle = '#ffffff50';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.closePath();

    // Reset shadow
    this.ctx.shadowBlur = 0;

    if (!cell.isPlayer && cell.name) {
      // Draw bot name with cyberpunk style
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.font = 'bold 16px "Courier New"';
      this.ctx.fillText(cell.name, cell.x, cell.y);
      this.ctx.fillStyle = '#ffffff80';
      this.ctx.font = '14px "Courier New"';
      this.ctx.fillText(`Mass: ${Math.round(cell.mass)}`, cell.x, cell.y + 20);
    }
  }

  private drawFood(): void {
    this.currentGameState.food.forEach((food: Cell) => {
      this.ctx.shadowColor = food.glowColor || food.color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = food.color;
      this.ctx.fill();
      this.ctx.closePath();
    });
  }

  private drawViruses(): void {
    this.currentGameState.viruses.forEach((virus: Cell) => {
      this.ctx.shadowColor = virus.glowColor || virus.color;
      this.ctx.shadowBlur = 20;
      this.ctx.beginPath();
      this.ctx.arc(virus.x, virus.y, virus.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = virus.color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#33ff3380';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.ctx.closePath();
    });
  }

  private drawBots(): void {
    this.currentGameState.bots.forEach((bot: Cell) => this.drawCell(bot));
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  restartGame(): void {
    this.gameService.restartGame();
  }
}
