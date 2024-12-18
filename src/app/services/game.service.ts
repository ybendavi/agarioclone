import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { GameConfig, BotConfig } from '../models/bot-config.model';

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
  description?: string;
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
  map: GameMap;
  gameOver: boolean;
  score: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly MAP_WIDTH = 6000;  // 1.5x larger
  private readonly MAP_HEIGHT = 6000; // 1.5x larger
  private readonly VIEWPORT_WIDTH = Math.min(window.innerWidth, 1920);
  private readonly VIEWPORT_HEIGHT = Math.min(window.innerHeight, 1080);
  private readonly INITIAL_PLAYER_MASS = 2000;
  private readonly INITIAL_BOT_COUNT = 15;
  private readonly FOOD_COUNT = 2000;
  private readonly PLAYER_AVATAR = 'assets/images/player-avatar.svg';
  private readonly NEON_COLORS = [
    { main: '#ff00ff', glow: '#ff00ff80' }, // Magenta
    { main: '#00ffff', glow: '#00ffff80' }, // Cyan
    { main: '#ff3366', glow: '#ff336680' }, // Neon Pink
    { main: '#33ff33', glow: '#33ff3380' }, // Neon Green
    { main: '#3366ff', glow: '#3366ff80' }  // Neon Blue
  ];
  private readonly BASE_GAME_SPEED = 50; // Base speed multiplier
  private readonly MAX_SPEED_MULTIPLIER = 3; // Maximum speed increase

  private playerImage: HTMLImageElement = new Image();
  private playerImageLoaded = false;
  private botConfig: GameConfig | null = null;

  private gameState = new BehaviorSubject<GameState>({
    player: null,
    bots: [],
    food: [],
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

  private lastCalculatedSpeed: number = 0;
  private lastSpeedCalculationMass: number = 0;
  private readonly SQRT_CACHE_SIZE = 1000;
  private sqrtCache: Map<number, number> = new Map();

  private fastSqrt(n: number): number {
    if (n <= this.SQRT_CACHE_SIZE) {
      const cached = this.sqrtCache.get(n);
      if (cached !== undefined) return cached;
      const sqrt = Math.sqrt(n);
      this.sqrtCache.set(n, sqrt);
      return sqrt;
    }
    return Math.sqrt(n);
  }

  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return this.fastSqrt(dx * dx + dy * dy);
  }

  private calculateDynamicGameSpeed(): number {
    const currentState = this.gameState.value;
    if (!currentState.player) return this.BASE_GAME_SPEED;

    if (currentState.player.mass === this.lastSpeedCalculationMass) {
      return this.lastCalculatedSpeed;
    }

    const massThreshold = 100;
    if (currentState.player.mass <= massThreshold) {
      this.lastCalculatedSpeed = this.BASE_GAME_SPEED;
      this.lastSpeedCalculationMass = currentState.player.mass;
      return this.BASE_GAME_SPEED;
    }

    const speedMultiplier = 1 + Math.min(
      this.MAX_SPEED_MULTIPLIER - 1,
      Math.log10(currentState.player.mass / massThreshold)
    );

    this.lastCalculatedSpeed = this.BASE_GAME_SPEED * speedMultiplier;
    this.lastSpeedCalculationMass = currentState.player.mass;
    return this.lastCalculatedSpeed;
  }

  constructor(private http: HttpClient) {
    for (let i = 0; i <= this.SQRT_CACHE_SIZE; i++) {
      this.sqrtCache.set(i, Math.sqrt(i));
    }
    
    this.loadPlayerAvatar();
    this.loadBotConfig().subscribe(config => {
      this.botConfig = config;
      this.initializeGame();
    });
  }

  private loadPlayerAvatar() {
    this.playerImage.onload = () => {
      this.playerImageLoaded = true;
    };
    this.playerImage.onerror = () => {
      console.warn('Failed to load player avatar image');
      this.playerImageLoaded = false;
    };
    this.playerImage.src = this.PLAYER_AVATAR;
  }

  loadBotConfig(): Observable<GameConfig> {
    return this.http.get<GameConfig>('assets/config/bots.json').pipe(
      catchError(error => {
        console.warn('Error loading bot config:', error);
        return of({ bots: [] });
      })
    );
  }

  saveBotConfig(config: GameConfig): void {
    this.botConfig = config;
    localStorage.setItem('botConfig', JSON.stringify(config));
    this.initializeGame();
  }

  private findSafeSpawnLocation(bots: Cell[]): { x: number, y: number } {
    const MIN_SAFE_DISTANCE = 200;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    while (attempts < MAX_ATTEMPTS) {
      const x = Math.random() * this.MAP_WIDTH;
      const y = Math.random() * this.MAP_HEIGHT;
      
      const isSafe = bots.every(bot => {
        const distance = this.calculateDistance(x, y, bot.x, bot.y);
        return distance > MIN_SAFE_DISTANCE;
      });

      if (isSafe) {
        return { x, y };
      }
      attempts++;
    }

    let bestSpot = { x: 0, y: 0 };
    let maxMinDistance = 0;

    for (let i = 0; i < 10; i++) {
      const x = Math.random() * this.MAP_WIDTH;
      const y = Math.random() * this.MAP_HEIGHT;
      
      const minDistance = Math.min(...bots.map(bot => 
        this.calculateDistance(x, y, bot.x, bot.y)
      ));

      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestSpot = { x, y };
      }
    }

    return bestSpot;
  }

  private createCell(isPlayer: boolean): Cell {
    const color = this.getRandomNeonColor();
    if (isPlayer) {
      const safeSpot = this.findSafeSpawnLocation(this.gameState.value.bots);
      return {
        id: Math.random().toString(36).substr(2, 9),
        x: safeSpot.x,
        y: safeSpot.y,
        radius: this.INITIAL_PLAYER_MASS,
        color: color.main,
        glowColor: color.glow,
        velocity: { x: 0, y: 0 },
        isPlayer,
        mass: this.INITIAL_PLAYER_MASS
      };
    }
    
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

  private createBotFromConfig(botConfig: BotConfig): Cell {
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * this.MAP_WIDTH,
      y: Math.random() * this.MAP_HEIGHT,
      radius: Math.sqrt(botConfig.mass) * 4,
      color: botConfig.color,
      glowColor: `${botConfig.color}80`, 
      velocity: { x: 0, y: 0 },
      isPlayer: false,
      mass: botConfig.mass,
      name: botConfig.name,
      description: botConfig.description
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

  private getRandomNeonColor(): { main: string; glow: string } {
    return this.NEON_COLORS[Math.floor(Math.random() * this.NEON_COLORS.length)];
  }

  private calculateSpeed(mass: number, isPlayer: boolean = false): number {
    const gameSpeed = this.calculateDynamicGameSpeed();
    const baseSpeed = gameSpeed / this.fastSqrt(mass);
    return isPlayer ? baseSpeed * 1.7 : baseSpeed;
  }

  private initializeGame(): void {
    const player = this.createCell(true);
    const bots: Cell[] = [];
    
    if (this.botConfig && this.botConfig.bots.length > 0) {
      this.botConfig.bots.forEach(botConfig => {
        bots.push(this.createBotFromConfig(botConfig));
      });
    } else {
      for (let i = 0; i < this.INITIAL_BOT_COUNT; i++) {
        bots.push(this.createCell(false));
      }
    }

    const food: Cell[] = [];
    for (let i = 0; i < this.FOOD_COUNT; i++) {
      food.push(this.createFood());
    }

    const initialState: GameState = {
      player,
      bots,
      food,
      gameOver: false,
      score: 0,
      map: {
        width: this.MAP_WIDTH,
        height: this.MAP_HEIGHT,
        viewportX: 0,
        viewportY: 0
      }
    };

    this.gameState.next(initialState);
  }

  restartGame(): void {
    this.initializeGame();
  }

  updatePlayerPosition(mouseX: number, mouseY: number): void {
    const currentState = this.gameState.value;
    if (!currentState.player || currentState.gameOver) return;

    const centerX = this.VIEWPORT_WIDTH / 2;
    const centerY = this.VIEWPORT_HEIGHT / 2;
    
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = this.calculateDistance(centerX, centerY, mouseX, mouseY);

    if (distance > 0) {
      const speed = this.calculateSpeed(currentState.player.mass, true);
      const velocityX = (dx / distance) * speed;
      const velocityY = (dy / distance) * speed;

      currentState.player.x = Math.max(0, Math.min(this.MAP_WIDTH, currentState.player.x + velocityX));
      currentState.player.y = Math.max(0, Math.min(this.MAP_HEIGHT, currentState.player.y + velocityY));

      currentState.map.viewportX = currentState.player.x - this.VIEWPORT_WIDTH / 2;
      currentState.map.viewportY = currentState.player.y - this.VIEWPORT_HEIGHT / 2;

      currentState.map.viewportX = Math.max(0, Math.min(this.MAP_WIDTH - this.VIEWPORT_WIDTH, currentState.map.viewportX));
      currentState.map.viewportY = Math.max(0, Math.min(this.MAP_HEIGHT - this.VIEWPORT_HEIGHT, currentState.map.viewportY));
    }

    this.gameState.next(currentState);
  }

  updateBots(): void {
    const currentState = this.gameState.value;
    if (!currentState.player || currentState.gameOver) return;

    const playerX = currentState.player.x;
    const playerY = currentState.player.y;
    const playerMass = currentState.player.mass;
    const playerRadius = currentState.player.radius;
    const playerMassThreshold = playerMass * 1.02;

    currentState.bots = currentState.bots.filter(bot => {
      const distance = this.calculateDistance(playerX, playerY, bot.x, bot.y);

      if (distance < bot.radius && bot.mass > playerMassThreshold) {
        currentState.gameOver = true;
        currentState.score = Math.floor(playerMass);
        currentState.player = null;
        return true;
      }

      if (distance < playerRadius && playerMass > bot.mass * 1.02) {
        const massGain = bot.mass * 0.8;
        currentState.player!.mass += massGain;
        currentState.player!.radius = this.fastSqrt(currentState.player!.mass) * 4;
        return false;
      }

      const shouldFlee = bot.mass < playerMass;
      const speed = this.calculateSpeed(bot.mass);
      const direction = shouldFlee ? -1 : 1;

      if (distance > 0) {
        const dx = playerX - bot.x;
        const dy = playerY - bot.y;
        const velocityX = (dx / distance) * speed * direction;
        const velocityY = (dy / distance) * speed * direction;
        
        bot.x = Math.max(0, Math.min(this.MAP_WIDTH, bot.x + velocityX));
        bot.y = Math.max(0, Math.min(this.MAP_HEIGHT, bot.y + velocityY));
      }

      return true;
    });

    this.gameState.next(currentState);
  }

  checkCollisions(): void {
    const currentState = this.gameState.value;
    if (!currentState.player || currentState.gameOver) return;

    const playerX = currentState.player.x;
    const playerY = currentState.player.y;
    const playerRadius = currentState.player.radius;

    currentState.food = currentState.food.filter(food => {
      const distance = this.calculateDistance(playerX, playerY, food.x, food.y);
      
      if (distance < playerRadius) {
        currentState.player!.mass += food.mass;
        currentState.player!.radius = this.fastSqrt(currentState.player!.mass) * 4;
        return false;
      }
      return true;
    });

    if (currentState.food.length < this.FOOD_COUNT) {
      const newFood: Cell[] = [];
      const foodNeeded = this.FOOD_COUNT - currentState.food.length;
      for (let i = 0; i < foodNeeded; i++) {
        newFood.push(this.createFood());
      }
      currentState.food = [...currentState.food, ...newFood];
    }

    this.gameState.next(currentState);
  }

  splitCell(): void {
    // Implementation for cell splitting
  }

  ejectMass(): void {
    // Implementation for mass ejection
  }

  getPlayerImage(): { image: HTMLImageElement; loaded: boolean } {
    return {
      image: this.playerImage,
      loaded: this.playerImageLoaded
    };
  }
}
