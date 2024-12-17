# Agar.io Clone

An Angular-based implementation of the popular Agar.io game, featuring AI-controlled opponents and browser-based gameplay.

## Features

- Browser-based gameplay using HTML5 Canvas
- Mouse-controlled player movement
- AI-controlled opponents with dynamic behavior
- Splitting and mass ejection mechanics
- Virus obstacles
- Randomly spawning food pellets
- Responsive design

## Controls

- Mouse Movement: Control your cell's direction
- Space Bar: Split your cell
- W Key: Eject mass
- ESC Key: Pause game

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:4200`

## Game Rules

- Eat smaller cells and food pellets to grow
- Avoid larger cells that can eat you
- Use viruses to split larger opponents
- Split and eject mass strategically to outmaneuver opponents

## Technical Implementation

The game is built using Angular 17 and implements the following key components:

- Canvas-based rendering for smooth gameplay
- AI logic for opponent behavior
- Collision detection system
- Responsive design for various screen sizes
