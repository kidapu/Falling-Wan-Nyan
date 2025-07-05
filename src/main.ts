import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'

function getInitialViewportHeight(): number {
    return window.visualViewport ? 
        window.visualViewport.height : 
        window.innerHeight
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: getInitialViewportHeight(),
    parent: 'game-canvas',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: false,
            enableSleeping: false
        }
    },
    scene: GameScene
}

new Phaser.Game(config)