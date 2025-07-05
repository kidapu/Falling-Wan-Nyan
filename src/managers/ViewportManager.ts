export class ViewportManager {
    private scene: Phaser.Scene
    private gameWidth: number = 0
    private gameHeight: number = 0
    private onResizeCallback?: () => void

    constructor(scene: Phaser.Scene) {
        this.scene = scene
    }

    initialize(onResizeCallback?: () => void): void {
        this.onResizeCallback = onResizeCallback
        this.gameWidth = this.scene.scale.width
        this.gameHeight = this.getViewportHeight()
        
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleViewportChange()
            })
        }
    }

    private getViewportHeight(): number {
        return window.visualViewport ? 
            window.visualViewport.height : 
            window.innerHeight
    }

    private handleViewportChange(): void {
        const newHeight = this.getViewportHeight()
        if (Math.abs(this.gameHeight - newHeight) > 10) {
            this.gameWidth = window.visualViewport!.width
            this.gameHeight = newHeight
            this.scene.scale.resize(this.gameWidth, this.gameHeight)
            
            if (this.onResizeCallback) {
                this.onResizeCallback()
            }
        }
    }

    getGameWidth(): number {
        return this.gameWidth
    }

    getGameHeight(): number {
        return this.gameHeight
    }

    calculateSpriteScale(): number {
        const aspectRatio = this.gameWidth / this.gameHeight
        const minDimension = Math.min(this.gameWidth, this.gameHeight)

        if (aspectRatio > 1.2) {
            return Math.min(1.0, Math.max(0.7, minDimension / 600))
        } else {
            return Math.min(0.7, Math.max(0.4, minDimension / 700))
        }
    }
}