import { ViewportManager } from './ViewportManager'

export class PhysicsManager {
    private scene: Phaser.Scene
    private viewportManager: ViewportManager
    private floor: MatterJS.BodyType | null = null
    private groundTileSprite: Phaser.GameObjects.TileSprite | null = null

    constructor(scene: Phaser.Scene, viewportManager: ViewportManager) {
        this.scene = scene
        this.viewportManager = viewportManager
    }

    initialize(): void {
        const gameWidth = this.viewportManager.getGameWidth()
        const gameHeight = this.viewportManager.getGameHeight()
        
        this.scene.matter.world.setBounds(0, 0, gameWidth, gameHeight, 32, true, true, false, true)
        this.scene.matter.world.engine.world.gravity.y = 0.67
        this.updateFloorPosition()
        this.scene.cameras.main.setBackgroundColor('#87CEEB')
    }

    updateFloorPosition(): void {
        const gameWidth = this.viewportManager.getGameWidth()
        const gameHeight = this.viewportManager.getGameHeight()
        
        if (this.floor) {
            this.scene.matter.world.remove(this.floor)
        }
        
        this.floor = this.scene.matter.add.rectangle(gameWidth / 2, gameHeight - 30, gameWidth, 40, {
            isStatic: true
        })
        
        if (this.groundTileSprite) {
            this.groundTileSprite.destroy()
        }
        
        // ground.pngで地面全体を描画（50px）
        this.groundTileSprite = this.scene.add.tileSprite(
            gameWidth / 2,
            gameHeight - 25,
            gameWidth,
            50,
            'ground'
        )
    }

    getFloorY(): number {
        return this.viewportManager.getGameHeight() - 50
    }

    isFloorBody(body: MatterJS.BodyType): boolean {
        return body === this.floor
    }

    getFloor(): MatterJS.BodyType | null {
        return this.floor
    }
}