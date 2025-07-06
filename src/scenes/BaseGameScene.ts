import { AssetLoader } from '../managers/AssetLoader'
import { GrowthManager } from '../managers/GrowthManager'
import { SoundManager } from '../managers/SoundManager'
import { ViewportManager } from '../managers/ViewportManager'
import { PhysicsManager } from '../managers/PhysicsManager'

export interface GameConfig {
    sceneKey: string
    dataFile: string
    spawnInterval: number
    autoRemoveDelay: number
    floorHeight: number
    backgroundColor: string
    growthConfig?: {
        removeOnMaxLevel?: boolean
    }
}

export abstract class BaseGameScene extends Phaser.Scene {
    protected gameSprites: Phaser.Physics.Matter.Sprite[] = []
    protected spawnTimer: Phaser.Time.TimerEvent | null = null
    protected gameWidth = 0
    protected gameHeight = 0
    protected lastSpawned: string | null = null
    
    protected assetLoader!: AssetLoader
    protected growthManager!: GrowthManager
    protected soundManager!: SoundManager
    protected viewportManager!: ViewportManager
    protected physicsManager!: PhysicsManager
    
    protected gameData: any = null
    protected floor: any = null
    protected floorGraphics: Phaser.GameObjects.Graphics | null = null
    
    protected config: GameConfig

    constructor(config: GameConfig) {
        super({ key: config.sceneKey })
        this.config = config
    }

    async preload() {
        this.assetLoader = new AssetLoader(this)
        try {
            await this.assetLoader.loadAssets()
            this.gameData = this.assetLoader.getCategoryData()
        } catch (error) {
            console.error('Failed to load assets:', error)
        }
    }

    create() {
        this.gameWidth = this.scale.width
        this.gameHeight = this.getViewportHeight()
        
        this.initializeManagers()
        this.initializeGame()
        this.setupEventListeners()
    }

    protected initializeManagers() {
        this.viewportManager = new ViewportManager(this)
        this.physicsManager = new PhysicsManager(this)
        this.growthManager = new GrowthManager(this, this.config.growthConfig)
        this.soundManager = new SoundManager(this, this.assetLoader)
    }

    protected initializeGame() {
        this.physicsManager.setupWorld(this.gameWidth, this.gameHeight)
        this.updateFloorPosition()
        this.cameras.main.setBackgroundColor(this.config.backgroundColor)
        this.startSpawning()
    }

    protected setupEventListeners() {
        // Listen for sprite removal events from GrowthManager
        this.events.on('sprite-removed', this.handleSpriteRemoved.bind(this))
        
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleViewportChange()
            })
        }
    }

    protected handleSpriteRemoved(sprite: Phaser.Physics.Matter.Sprite) {
        const index = this.gameSprites.indexOf(sprite)
        if (index > -1) {
            this.gameSprites.splice(index, 1)
        }
    }

    protected getViewportHeight(): number {
        return window.visualViewport ? 
            window.visualViewport.height : 
            window.innerHeight
    }

    protected handleViewportChange() {
        const newHeight = this.getViewportHeight()
        if (Math.abs(this.gameHeight - newHeight) > 10) {
            this.gameWidth = window.visualViewport?.width || window.innerWidth
            this.gameHeight = newHeight
            this.scale.resize(this.gameWidth, this.gameHeight)
            this.updateFloorPosition()
        }
    }

    protected updateFloorPosition() {
        if (this.floor) {
            this.matter.world.remove(this.floor)
        }
        
        this.floor = this.matter.add.rectangle(
            this.gameWidth / 2, 
            this.gameHeight - this.config.floorHeight / 2, 
            this.gameWidth, 
            this.config.floorHeight, 
            { isStatic: true }
        )
        
        if (this.floorGraphics) {
            this.floorGraphics.destroy()
        }
        
        this.floorGraphics = this.add.graphics()
        this.floorGraphics.fillStyle(0x8B4513)
        this.floorGraphics.fillRect(0, this.gameHeight - this.config.floorHeight, this.gameWidth, this.config.floorHeight)
        this.floorGraphics.fillStyle(0x228B22)
        this.floorGraphics.fillRect(0, this.gameHeight - this.config.floorHeight - 5, this.gameWidth, 5)
    }

    protected startSpawning() {
        if (!this.gameData) {
            this.time.delayedCall(500, () => {
                this.startSpawning()
            })
            return
        }
        
        this.spawnTimer = this.time.addEvent({
            delay: this.config.spawnInterval,
            callback: this.spawnRandomEntity,
            callbackScope: this,
            loop: true
        })
    }

    protected spawnRandomEntity() {
        if (!this.gameData || !this.gameData.images) {
            return
        }

        let randomKey: string
        do {
            randomKey = Phaser.Utils.Array.GetRandom(this.gameData.images)
        } while (randomKey === this.lastSpawned && this.gameData.images.length > 1)
        
        this.lastSpawned = randomKey
        
        const sprite = this.createSprite(randomKey)
        if (sprite) {
            this.setupSprite(sprite, randomKey)
            this.gameSprites.push(sprite)
            
            // Auto remove after delay
            this.time.delayedCall(this.config.autoRemoveDelay, () => {
                if (sprite && sprite.active && !sprite.getData('removing')) {
                    this.removeEntityWithAnimation(sprite)
                }
            })
        }
    }

    protected removeEntityWithAnimation(sprite: Phaser.Physics.Matter.Sprite) {
        if (sprite.getData('removing')) {
            return
        }
        
        sprite.setData('removing', true)
        sprite.setStatic(true)
        
        this.tweens.add({
            targets: sprite,
            scaleX: 0,
            scaleY: 0,
            alpha: 0.3,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => {
                const index = this.gameSprites.indexOf(sprite)
                if (index > -1) {
                    this.gameSprites.splice(index, 1)
                }
                if (sprite && sprite.active) {
                    sprite.destroy()
                }
            }
        })
    }

    protected async handleSpriteClick(sprite: Phaser.Physics.Matter.Sprite, entityKey: string) {
        if (!this.growthManager.canGrow(sprite)) {
            return
        }

        const pitchMultiplier = this.growthManager.getSoundPitchMultiplier(sprite)
        this.soundManager.playAnimalSoundWithPitch(entityKey, pitchMultiplier)
        
        await this.growthManager.growAnimal(sprite)
    }

    update() {
        const floorY = this.gameHeight - this.config.floorHeight
        
        this.gameSprites = this.gameSprites.filter(sprite => {
            if (sprite.y > floorY + 200 && !sprite.getData('removing')) {
                this.removeEntityWithAnimation(sprite)
            }
            return sprite.active
        })
    }

    // Abstract methods to be implemented by subclasses
    protected abstract createSprite(entityKey: string): Phaser.Physics.Matter.Sprite | null
    protected abstract setupSprite(sprite: Phaser.Physics.Matter.Sprite, entityKey: string): void
    protected abstract calculateScale(): number
}