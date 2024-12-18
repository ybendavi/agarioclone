export interface BotConfig {
  id: number;
  level: number;  // 1 to 20
  mass: number;
  color: string;
  name: string;
  description: string;
}

export interface GameConfig {
  bots: BotConfig[];
}
