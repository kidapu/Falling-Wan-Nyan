import { ViewportManager } from './ViewportManager'

export class PhysicsManager {
    private scene: Phaser.Scene
    private viewportManager: ViewportManager
    private floor: MatterJS.BodyType | null = null
    private floorGraphics: Phaser.GameObjects.Graphics | null = null

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
            this.scene.matter.world.remove(this.scene.matter.world.bodies, this.floor)
        }
        
        this.floor = this.scene.matter.add.rectangle(gameWidth / 2, gameHeight - 20, gameWidth, 40, {
            isStatic: true
        })
        
        if (this.floorGraphics) {
            this.floorGraphics.destroy()
        }
        
        this.floorGraphics = this.scene.add.graphics()
        this.floorGraphics.fillStyle(0x8B4513)
        this.floorGraphics.fillRect(0, gameHeight - 40, gameWidth, 40)
        this.floorGraphics.fillStyle(0x228B22)
        this.floorGraphics.fillRect(0, gameHeight - 45, gameWidth, 5)
    }

    getFloorY(): number {
        return this.viewportManager.getGameHeight() - 40
    }
}