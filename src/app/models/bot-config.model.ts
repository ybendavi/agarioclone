export interface BotConfig {
  id: number;
  mass: number;
  color: string;
  name: string;
  description: string;
}

export interface GameConfig {
  bots: BotConfig[];
}
