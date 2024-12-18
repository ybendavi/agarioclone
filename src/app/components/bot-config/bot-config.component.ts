import { Component, OnInit } from '@angular/core';
import { BotConfig, GameConfig } from '../../models/bot-config.model';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-bot-config',
  template: `
    <div class="config-panel" *ngIf="isDevMode">
      <h2>Bot Configuration</h2>
      <div class="bot-list">
        <div class="bot-item" *ngFor="let bot of botConfig.bots">
          <div class="bot-header">
            <input [(ngModel)]="bot.name" placeholder="Bot Name">
            <button (click)="removeBot(bot)">X</button>
          </div>
          <div class="bot-controls">
            <div class="control-group">
              <label>Level (1-20):</label>
              <input type="number" [(ngModel)]="bot.level" min="1" max="20" 
                     (change)="updateBotMass(bot)">
            </div>
            <div class="control-group">
              <label>Color:</label>
              <input type="color" [(ngModel)]="bot.color">
            </div>
          </div>
        </div>
      </div>
      <div class="actions">
        <button (click)="addBot()">Add Bot</button>
        <button (click)="saveConfig()">Save Configuration</button>
      </div>
    </div>
  `,
  styles: [`
    .config-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #00ffff;
      border-radius: 8px;
      padding: 20px;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      box-shadow: 0 0 20px #00ffff80;
      z-index: 1000;
      max-width: 400px;
    }
    h2 {
      margin: 0 0 20px 0;
      text-align: center;
      text-shadow: 0 0 10px #00ffff;
    }
    .bot-list {
      max-height: 60vh;
      overflow-y: auto;
    }
    .bot-item {
      margin-bottom: 15px;
      padding: 10px;
      border: 1px solid #00ffff50;
      border-radius: 4px;
      background: rgba(0, 255, 255, 0.1);
    }
    .bot-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .bot-controls {
      display: grid;
      gap: 10px;
    }
    .control-group {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    input {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #00ffff;
      color: #00ffff;
      padding: 5px;
      border-radius: 4px;
    }
    button {
      background: rgba(0, 255, 255, 0.2);
      border: 1px solid #00ffff;
      color: #00ffff;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      text-shadow: 0 0 5px #00ffff;
    }
    button:hover {
      background: rgba(0, 255, 255, 0.3);
    }
    .actions {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
  `]
})
export class BotConfigComponent implements OnInit {
  isDevMode = true; // You might want to control this through environment variables
  botConfig: GameConfig = { bots: [] };

  constructor(private gameService: GameService) {}

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    // Load configuration from the game service
    this.gameService.loadBotConfig().subscribe(
      config => this.botConfig = config,
      error => {
        console.warn('Failed to load bot config, using defaults:', error);
        this.initializeDefaultConfig();
      }
    );
  }

  private initializeDefaultConfig() {
    this.botConfig = {
      bots: [
        {
          id: 1,
          level: 5,
          mass: 100,
          color: '#ff00ff',
          name: 'CyberX'
        }
      ]
    };
  }

  addBot() {
    const newBot: BotConfig = {
      id: Date.now(),
      level: 1,
      mass: 50,
      color: '#00ffff',
      name: 'New Bot'
    };
    this.botConfig.bots.push(newBot);
  }

  removeBot(bot: BotConfig) {
    const index = this.botConfig.bots.indexOf(bot);
    if (index > -1) {
      this.botConfig.bots.splice(index, 1);
    }
  }

  updateBotMass(bot: BotConfig) {
    // Scale mass based on level (1-20)
    bot.mass = bot.level * 50; // Simple linear scaling
  }

  saveConfig() {
    this.gameService.saveBotConfig(this.botConfig);
  }
}
