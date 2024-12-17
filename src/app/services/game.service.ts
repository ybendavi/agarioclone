import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Cell {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  velocity: { x: number; y: number };
  isPlayer: boolean;
  mass: number;
  glowColor?: string;
  name?: string;
}

export interface GameMap {
  width: number;
  height: number;
  viewportX: number;
  viewportY: number;
}

export interface GameState {
  player: Cell | null;
  bots: Cell[];
  food: Cell[];
  viruses: Cell[];
  map: GameMap;
  gameOver: boolean;
  score: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly MAP_WIDTH = 4000;
  private readonly MAP_HEIGHT = 4000;
  private readonly VIEWPORT_WIDTH = window.innerWidth;
  private readonly VIEWPORT_HEIGHT = window.innerHeight;
  private readonly BOT_NAMES = ['CyberX', 'NeoBot', 'ByteRunner', 'GridHack', 'SynthCore', 'DataPunk', 'NetRider', 'VoidMind'];
  private readonly INITIAL_PLAYER_MASS = 20;
  private readonly INITIAL_BOT_COUNT = 15;
  private readonly FOOD_COUNT = 200;
  private readonly NEON_COLORS = [
    { main: '#ff00ff', glow: '#ff00ff80' }, // Magenta
    { main: '#00ffff', glow: '#00ffff80' }, // Cyan
    { main: '#ff3366', glow: '#ff336680' }, // Neon Pink
    { main: '#33ff33', glow: '#33ff3380' }, // Neon Green
    { main: '#3366ff', glow: '#3366ff80' }  // Neon Blue
  ];

  private gameState = new BehaviorSubject<GameState>({
    player: null,
    bots: [],
    food: [],
    viruses: [],
    map: {
      width: this.MAP_WIDTH,
      height: this.MAP_HEIGHT,
      viewportX: 0,
      viewportY: 0
    },
    gameOver: false,
    score: 0
  });

  gameState$ = this.gameState.asObservable();

  constructor() {
    this.initializeGame();
  }

  initializeGame(): void {
    const player = this.createCell(true);
    const bots = Array.from({ length: this.INITIAL_BOT_COUNT }, () => this.createBot());
    const food = Array.from({ length: this.FOOD_COUNT }, () => this.createFood());
    const viruses = this.createViruses();

    this.gameState.next({
      player,
      bots,
      food,
      viruses,
      map: {
        width: this.MAP_WIDTH,
        height: this.MAP_HEIGHT,
        viewportX: player.x - this.VIEWPORT_WIDTH / 2,
        viewportY: player.y - this.VIEWPORT_HEIGHT / 2
      },
      gameOver: false,
      score: 0
    });
  }

  restartGame(): void {
    this.initializeGame();
  }

  private createCell(isPlayer: boolean): Cell {
    const color = this.getRandomNeonColor();
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * this.MAP_WIDTH,
      y: Math.random() * this.MAP_HEIGHT,
      radius: this.INITIAL_PLAYER_MASS,
      color: color.main,
      glowColor: color.glow,
      velocity: { x: 0, y: 0 },
      isPlayer,
      mass: this.INITIAL_PLAYER_MASS
    };
  }

  private createBot(): Cell {
    const color = this.getRandomNeonColor();
    const mass = Math.random() * 100 + 10; // Random size between 10 and 110
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * this.MAP_WIDTH,
      y: Math.random() * this.MAP_HEIGHT,
      radius: Math.sqrt(mass * 100),
      color: color.main,
      glowColor: color.glow,
      velocity: { x: 0, y: 0 },
      isPlayer: false,
      mass: mass,
      name: this.BOT_NAMES[Math.floor(Math.random() * this.BOT_NAMES.length)]
    };
  }

  private createFood(): Cell {
    const color = this.getRandomNeonColor();
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * this.MAP_WIDTH,
      y: Math.random() * this.MAP_HEIGHT,
      radius: 3,
      color: color.main,
      glowColor: color.glow,
      velocity: { x: 0, y: 0 },
      isPlayer: false,
      mass: 1
    };
  }

  private createViruses(): Cell[] {
    const virusCount = Math.floor((this.MAP_WIDTH * this.MAP_HEIGHT) / 250000);
    return Array.from({ length: virusCount }, () => ({
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * this.MAP_WIDTH,
      y: Math.random() * this.MAP_HEIGHT,
      radius: 30,
      color: '#33ff33',
      glowColor: '#33ff3380',
      velocity: { x: 0, y: 0 },
      isPlayer: false,
      mass: 100
    }));
  }

  private getRandomNeonColor(): { main: string; glow: string } {
    return this.NEON_COLORS[Math.floor(Math.random() * this.NEON_COLORS.length)];
  }

  updatePlayerPosition(mouseX: number, mouseY: number): void {
    const currentState = this.gameState.value;
    if (!currentState.player || currentState.gameOver) return;

    const centerX = this.VIEWPORT_WIDTH / 2;
    const centerY = this.VIEWPORT_HEIGHT / 2;
    
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      // Speed decreases as mass increases (square root relationship)
      // Base speed is 16 (doubled from 8), minimum speed is 4 (doubled from 2)
      const speed = Math.max(4, 16 * Math.pow(currentState.player.mass, -0.3));
      const velocityX = (dx / distance) * speed;
      const velocityY = (dy / distance) * speed;

      // Update player position
      currentState.player.x = Math.max(0, Math.min(this.MAP_WIDTH, currentState.player.x + velocityX));
      currentState.player.y = Math.max(0, Math.min(this.MAP_HEIGHT, currentState.player.y + velocityY));

      // Update viewport position
      currentState.map.viewportX = currentState.player.x - this.VIEWPORT_WIDTH / 2;
      currentState.map.viewportY = currentState.player.y - this.VIEWPORT_HEIGHT / 2;

      // Clamp viewport to map boundaries
      currentState.map.viewportX = Math.max(0, Math.min(this.MAP_WIDTH - this.VIEWPORT_WIDTH, currentState.map.viewportX));
      currentState.map.viewportY = Math.max(0, Math.min(this.MAP_HEIGHT - this.VIEWPORT_HEIGHT, currentState.map.viewportY));
    }

    this.gameState.next(currentState);
  }

  updateBots(): void {
    const currentState = this.gameState.value;
    if (!currentState.player || currentState.gameOver) return;

    currentState.bots = currentState.bots.map(bot => {
      const dx = currentState.player!.x - bot.x;
      const dy = currentState.player!.y - bot.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if bot can eat player
      if (distance < bot.radius && bot.mass > currentState.player!.mass * 1.1) {
        currentState.gameOver = true;
        currentState.score = Math.floor(currentState.player!.mass);
        currentState.player = null;
        return bot;
      }

      // Check if player can eat bot
      if (distance < currentState.player!.radius && currentState.player!.mass > bot.mass * 1.1) {
        currentState.player!.mass += bot.mass;
        currentState.player!.radius = Math.sqrt(currentState.player!.mass * 100);
        return this.createBot(); // Replace eaten bot with a new one
      }

      const shouldFlee = bot.mass < currentState.player!.mass;
      const speed = Math.max(1.5, 6 * Math.pow(bot.mass, -0.3));
      const direction = shouldFlee ? -1 : 1;

      if (distance > 0) {
        const velocityX = (dx / distance) * speed * direction;
        const velocityY = (dy / distance) * speed * direction;
        
        bot.x = Math.max(0, Math.min(this.MAP_WIDTH, bot.x + velocityX));
        bot.y = Math.max(0, Math.min(this.MAP_HEIGHT, bot.y + velocityY));
      }

      return bot;
    });

    this.gameState.next(currentState);
  }

  checkCollisions(): void {
    const currentState = this.gameState.value;
    if (!currentState.player || currentState.gameOver) return;

    // Check collisions between player and food
    currentState.food = currentState.food.filter(food => {
      const distance = Math.sqrt(
        Math.pow(currentState.player!.x - food.x, 2) +
        Math.pow(currentState.player!.y - food.y, 2)
      );
      
      if (distance < currentState.player!.radius) {
        currentState.player!.mass += food.mass;
        currentState.player!.radius = Math.sqrt(currentState.player!.mass * 100);
        return false;
      }
      return true;
    });

    // Replenish food
    while (currentState.food.length < this.FOOD_COUNT) {
      currentState.food.push(this.createFood());
    }

    this.gameState.next(currentState);
  }

  splitCell(): void {
    // Implementation for cell splitting
  }

  ejectMass(): void {
    // Implementation for mass ejection
  }
}
