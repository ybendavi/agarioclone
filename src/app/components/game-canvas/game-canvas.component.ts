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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <canvas #gameCanvas
            [width]="canvasWidth"
            [height]="canvasHeight"
            (mousemove)="onMouseMove($event)"
            (touchmove)="onTouchMove($event)"
            (touchstart)="onTouchStart($event)">
    </canvas>
    <div class="score" *ngIf="currentGameState.player">
      Mass: {{currentGameState.player.mass | number:'1.0-0'}}
    </div>
    <div class="controls" *ngIf="isMobileDevice">
      <button class="control-btn split-btn" (touchstart)="onSplit()">Split</button>
      <button class="control-btn eject-btn" (touchstart)="onEject()">Eject</button>
    </div>
    <div class="game-over" *ngIf="currentGameState.gameOver">
      <div class="game-over-content">
        <h2>Game Over!</h2>
        <p>Final Score: {{currentGameState.score}}</p>
        <button class="restart-btn" (click)="restartGame()">Play Again</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: relative;
      display: block;
      touch-action: none;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    canvas {
      background-color: #000;
      border: 2px solid #00ffff;
      box-shadow: 0 0 20px #00ffff80;
      touch-action: none;
      width: 100% !important;
      height: 100% !important;
    }
    .score {
      position: absolute;
      top: env(safe-area-inset-top, 20px);
      left: env(safe-area-inset-left, 20px);
      color: #00ffff;
      font-family: 'Courier New', monospace;
      font-size: clamp(14px, 4vw, 24px);
      text-shadow: 0 0 10px #00ffff;
      z-index: 1;
      padding: 8px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 8px;
    }
    .controls {
      position: fixed;
      bottom: env(safe-area-inset-bottom, 20px);
      right: env(safe-area-inset-right, 20px);
      display: flex;
      gap: 12px;
      z-index: 1;
    }
    .control-btn {
      width: clamp(50px, 15vw, 70px);
      height: clamp(50px, 15vw, 70px);
      border-radius: 50%;
      background: rgba(0, 255, 255, 0.2);
      border: 2px solid #00ffff;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      font-size: clamp(12px, 3vw, 16px);
      text-shadow: 0 0 5px #00ffff;
      box-shadow: 0 0 10px #00ffff80;
      touch-action: manipulation;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .control-btn:active {
      background: rgba(0, 255, 255, 0.4);
      transform: scale(0.95);
    }
    .game-over {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2;
    }
    .game-over-content {
      text-align: center;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 10px #00ffff;
      padding: 20px;
      width: 90%;
      max-width: 400px;
    }
    .game-over-content h2 {
      font-size: clamp(24px, 6vw, 36px);
      margin-bottom: 10px;
    }
    .game-over-content p {
      font-size: clamp(16px, 4vw, 24px);
      margin-bottom: 20px;
    }
    .restart-btn {
      padding: clamp(8px, 2vw, 15px) clamp(16px, 4vw, 30px);
      font-size: clamp(14px, 4vw, 20px);
      background: rgba(0, 255, 255, 0.2);
      border: 2px solid #00ffff;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 5px #00ffff;
      box-shadow: 0 0 10px #00ffff80;
      cursor: pointer;
      border-radius: 8px;
    }
    @media (max-width: 768px) {
      .score {
        font-size: 14px;
        padding: 4px 8px;
      }
      .control-btn {
        width: 50px;
        height: 50px;
        font-size: 12px;
      }
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

  public isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  private lastTouchPosition = { x: 0, y: 0 };
  private isTouch = false;

  constructor(private gameService: GameService) {
    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();
  }

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
    if (this.isTouch) return; // Ignore mouse events if touch is being used
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasWidth / rect.width;
    const scaleY = this.canvasHeight / rect.height;
    
    this.mousePosition = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this.isTouch = true;
    this.handleTouch(event);
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isTouch) return;
    this.handleTouch(event);
  }

  private handleTouch(event: TouchEvent): void {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Scale touch coordinates to canvas coordinates
      const scaleX = this.canvasWidth / rect.width;
      const scaleY = this.canvasHeight / rect.height;
      
      this.lastTouchPosition = {
        x: x * scaleX,
        y: y * scaleY
      };
      
      this.mousePosition = this.lastTouchPosition;
    }
  }

  private updatePlayerPosition(): void {
    this.gameService.updatePlayerPosition(this.mousePosition.x, this.mousePosition.y);
  }

  private draw(): void {
    if (!this.ctx) return;

    // Clear canvas with a dark background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw grid with cyberpunk effect
    this.drawGrid();

    // Apply viewport transform
    this.ctx.save();
    this.ctx.translate(-this.currentGameState.map.viewportX, -this.currentGameState.map.viewportY);

    // Draw map borders with cyberpunk effect
    this.drawMapBorders();

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

    // Draw main grid lines
    this.ctx.strokeStyle = '#ffffff10';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = offsetX; x <= this.canvasWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasHeight);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = offsetY; y <= this.canvasHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasWidth, y);
      this.ctx.stroke();
    }

    // Draw highlighted grid lines every 5 cells
    this.ctx.strokeStyle = '#00ffff15';
    this.ctx.lineWidth = 2;

    for (let x = offsetX; x <= this.canvasWidth; x += gridSize * 5) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasHeight);
      this.ctx.stroke();
    }

    for (let y = offsetY; y <= this.canvasHeight; y += gridSize * 5) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasWidth, y);
      this.ctx.stroke();
    }
  }

  private drawMapBorders(): void {
    const borderWidth = 10;
    const glowSize = 20;
    const mapWidth = this.currentGameState.map.width;
    const mapHeight = this.currentGameState.map.height;

    this.ctx.save();

    // Draw outer glow
    const gradient = this.ctx.createLinearGradient(0, 0, mapWidth, mapHeight);
    gradient.addColorStop(0, '#ff00ff40');
    gradient.addColorStop(0.5, '#00ffff40');
    gradient.addColorStop(1, '#ff00ff40');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = borderWidth + glowSize;
    this.ctx.shadowColor = '#00ffff';
    this.ctx.shadowBlur = glowSize;
    this.ctx.strokeRect(0, 0, mapWidth, mapHeight);

    // Draw main border
    this.ctx.strokeStyle = '#00ffff';
    this.ctx.lineWidth = borderWidth;
    this.ctx.shadowBlur = 0;
    this.ctx.strokeRect(0, 0, mapWidth, mapHeight);

    // Draw corner accents
    const cornerSize = 50;
    const corners = [
      [0, 0], // Top-left
      [mapWidth, 0], // Top-right
      [0, mapHeight], // Bottom-left
      [mapWidth, mapHeight] // Bottom-right
    ];

    this.ctx.strokeStyle = '#ff00ff';
    this.ctx.lineWidth = borderWidth / 2;
    this.ctx.shadowColor = '#ff00ff';
    this.ctx.shadowBlur = glowSize / 2;

    corners.forEach(([x, y]) => {
      // Horizontal accent
      this.ctx.beginPath();
      this.ctx.moveTo(x - (x === mapWidth ? cornerSize : 0), y);
      this.ctx.lineTo(x + (x === 0 ? cornerSize : 0), y);
      this.ctx.stroke();

      // Vertical accent
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - (y === mapHeight ? cornerSize : 0));
      this.ctx.lineTo(x, y + (y === 0 ? cornerSize : 0));
      this.ctx.stroke();
    });

    // Add scanline effect
    const scanlineHeight = 2;
    const scanlineSpacing = 4;
    this.ctx.globalAlpha = 0.1;
    this.ctx.fillStyle = '#ffffff';

    for (let y = 0; y < mapHeight; y += scanlineSpacing) {
      this.ctx.fillRect(0, y, mapWidth, scanlineHeight);
    }

    this.ctx.restore();
  }

  private drawCell(cell: Cell): void {
    if (!this.ctx) return;

    this.ctx.save();
    if (cell.isPlayer) {
      // Draw player with image
      const playerImageData = this.gameService.getPlayerImage();
      if (playerImageData.loaded) {
        // Create circular clipping path
        this.ctx.beginPath();
        this.ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
        this.ctx.clip();

        // Draw the image
        const size = cell.radius * 2;
        this.ctx.drawImage(
          playerImageData.image,
          cell.x - cell.radius,
          cell.y - cell.radius,
          size,
          size
        );

        // Draw glow effect
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      } else {
        // Fallback to default circle if image not loaded
        this.drawDefaultCell(cell);
      }
    } else {
      this.drawDefaultCell(cell);
    }
    this.ctx.restore();
  }

  private drawDefaultCell(cell: Cell): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
    
    // Fill with color
    this.ctx.fillStyle = cell.color;
    this.ctx.fill();
    
    // Add glow effect
    if (cell.glowColor) {
      this.ctx.shadowColor = cell.glowColor;
      this.ctx.shadowBlur = 20;
      this.ctx.strokeStyle = cell.color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Draw name and description if they exist
    if (cell.name) {
      // Calculate base font size based on cell radius
      const baseFontSize = Math.max(12, Math.min(cell.radius / 4, 24));
      
      // Split the name by '/' to handle multi-part names
      const nameParts = cell.name.split('/');
      
      // Calculate line heights
      const nameLineHeight = baseFontSize * 1.2;
      const descLineHeight = baseFontSize * 0.9;
      
      // Calculate total height needed for text
      const descriptionLines = cell.description ? 
        this.wrapText(cell.description, cell.radius * 1.8, `${baseFontSize * 0.7}px "Courier New"`) : [];
      const totalHeight = (nameParts.length * nameLineHeight) + 
        (descriptionLines.length * descLineHeight) +
        (cell.description ? baseFontSize * 0.5 : 0); // Add spacing between name and description
      
      // Starting Y position to center all text vertically
      let y = cell.y - (totalHeight / 2);

      // Draw name with enhanced cyberpunk style
      this.ctx.textAlign = 'center';
      
      // Draw each part of the name with enhanced effects
      nameParts.forEach((part, index) => {
        const yPos = y + nameLineHeight;
        
        // Draw outer glow
        this.ctx.shadowColor = cell.glowColor || '#00ffff';
        this.ctx.shadowBlur = 15;
        this.ctx.font = `bold ${baseFontSize}px "Courier New"`;
        
        // Draw text outline
        this.ctx.strokeStyle = cell.glowColor || '#00ffff';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(part.trim(), cell.x, yPos);
        
        // Draw inner text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(part.trim(), cell.x, yPos);
        
        // Draw highlight effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = `bold ${baseFontSize * 0.95}px "Courier New"`;
        this.ctx.fillText(part.trim(), cell.x, yPos);
        
        y += nameLineHeight;
      });
      
      // Add separator with glowing effect
      if (cell.description) {
        this.ctx.beginPath();
        this.ctx.moveTo(cell.x - cell.radius * 0.5, y);
        this.ctx.lineTo(cell.x + cell.radius * 0.5, y);
        this.ctx.strokeStyle = cell.glowColor || '#00ffff';
        this.ctx.lineWidth = 1;
        this.ctx.shadowBlur = 8;
        this.ctx.stroke();
        y += baseFontSize * 0.5;
        
        // Draw description with different style
        this.ctx.font = `${baseFontSize * 0.7}px "Courier New"`;
        this.ctx.fillStyle = '#ffffff90';
        this.ctx.shadowBlur = 3;
        
        descriptionLines.forEach(line => {
          this.ctx.fillText(line, cell.x, y + descLineHeight);
          y += descLineHeight;
        });
      }

      // Draw mass with cyberpunk style
      const massText = `Mass: ${Math.round(cell.mass)}`;
      this.ctx.font = `${baseFontSize * 0.7}px "Courier New"`;
      this.ctx.fillStyle = '#ffffff80';
      this.ctx.shadowBlur = 2;
      this.ctx.fillText(massText, cell.x, y + descLineHeight);
      
      // Reset shadow effects
      this.ctx.shadowBlur = 0;
    }
  }

  private wrapText(text: string, maxWidth: number, font: string): string[] {
    if (!this.ctx) return [text];
    
    this.ctx.font = font;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = this.ctx.measureText(currentLine + " " + word).width;
      
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
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
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.gameService.restartGame();
    this.startGameLoop();
  }

  private onResize(): void {
    const pixelRatio = window.devicePixelRatio || 1;
    
    // For mobile, use screen dimensions to ensure full coverage
    if (this.isMobileDevice) {
      this.canvasWidth = screen.width * pixelRatio;
      this.canvasHeight = screen.height * pixelRatio;
    } else {
      this.canvasWidth = (window.innerWidth - 20) * pixelRatio;
      this.canvasHeight = (window.innerHeight - 20) * pixelRatio;
    }
    
    if (this.canvasRef?.nativeElement) {
      const canvas = this.canvasRef.nativeElement;
      canvas.style.width = this.isMobileDevice ? '100vw' : `${window.innerWidth - 20}px`;
      canvas.style.height = this.isMobileDevice ? '100vh' : `${window.innerHeight - 20}px`;
      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;
      
      if (this.ctx) {
        this.ctx.scale(pixelRatio, pixelRatio);
      }
    }
  }

  onSplit(): void {
    this.handleKeyboardEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  }

  onEject(): void {
    this.handleKeyboardEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  }
}
