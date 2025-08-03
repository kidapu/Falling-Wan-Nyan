import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { AudioPermissionManager } from './managers/AudioPermissionManager'

function getInitialViewportHeight(): number {
    return window.visualViewport ? 
        window.visualViewport.height : 
        window.innerHeight
}

function calculateGameDimensions(): { width: number, height: number } {
    const maxWidth = 480
    const isPC = window.innerWidth >= 768
    
    let width = window.innerWidth
    let height = getInitialViewportHeight()
    
    // PCの場合は幅のみ制限（高さは全画面）
    if (isPC) {
        width = Math.min(width, maxWidth)
    }
    
    return { width, height }
}

function startGame(): void {
    const dimensions = calculateGameDimensions()

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: dimensions.width,
        height: dimensions.height,
        parent: 'game-canvas',
        backgroundColor: '#87CEEB',
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: 'matter',
            matter: {
                gravity: { x: 0, y: 1 },
                debug: false,
                enableSleeping: false
            }
        },
        scene: GameScene
    }

    new Phaser.Game(config)
}

// 音声許可マネージャーを初期化
const audioPermissionManager = AudioPermissionManager.getInstance()
// グローバルに参照を保存（SoundManagerから参照するため）
;(window as any).audioPermissionManager = audioPermissionManager

audioPermissionManager.setupSplashScreen(() => {
    // 音声許可が得られたらゲームを開始
    startGame()
})