import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

import { AppComponent } from './app.component';
import { GameCanvasComponent } from './components/game-canvas/game-canvas.component';
import { GameService } from './services/game.service';

@NgModule({
  declarations: [
    AppComponent,
    GameCanvasComponent
  ],
  imports: [
    BrowserModule,
    CommonModule
  ],
  providers: [GameService],
  bootstrap: [AppComponent]
})
export class AppModule { }
