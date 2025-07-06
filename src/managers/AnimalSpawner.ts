import { ViewportManager } from './ViewportManager'
import { SoundManager } from './SoundManager'
import { GrowthManager } from './GrowthManager'

export class AnimalSpawner {
    private scene: Phaser.Scene
    private viewportManager: ViewportManager
    private soundManager: SoundManager
    private growthManager: GrowthManager
    private animalSprites: Phaser.Physics.Matter.Sprite[] = []
    private animalKeys: string[] = []
    private spawnTimer: Phaser.Time.TimerEvent | null = null
    private lastSpawnedAnimal: string | null = null

    constructor(scene: Phaser.Scene, viewportManager: ViewportManager, soundManager: SoundManager, growthManager: GrowthManager) {
        this.scene = scene
        this.viewportManager = viewportManager
        this.soundManager = soundManager
        this.growthManager = growthManager
    }

    private handleSpriteRemoved(sprite: Phaser.Physics.Matter.Sprite): void {
        const index = this.animalSprites.indexOf(sprite)
        if (index > -1) {
            this.animalSprites.splice(index, 1)
        }
    }

    setAnimalKeys(keys: string[]): void {
        this.animalKeys = keys
    }

    startSpawning(): void {
        // Setup sprite removal event listener when starting
        this.scene.events.on('sprite-removed', this.handleSpriteRemoved.bind(this))
        
        this.spawnTimer = this.scene.time.addEvent({
            delay: 1500,
            callback: this.spawnRandomAnimal,
            callbackScope: this,
            loop: true
        })
    }

    stopSpawning(): void {
        if (this.spawnTimer) {
            this.spawnTimer.remove()
            this.spawnTimer = null
        }
    }

    private spawnRandomAnimal(): void {
        let randomKey: string
        do {
            randomKey = Phaser.Utils.Array.GetRandom(this.animalKeys)
        } while (randomKey === this.lastSpawnedAnimal && this.animalKeys.length > 1)
        
        this.lastSpawnedAnimal = randomKey
        
        const texture = this.scene.textures.get(randomKey)
        if (!texture || texture.key === '__MISSING') {
            console.warn(`Texture not found for: ${randomKey}`)
            return
        }
        
        const gameWidth = this.viewportManager.getGameWidth()
        const x = Phaser.Math.Between(50, gameWidth - 50)
        const animal = this.scene.matter.add.sprite(x, 0, randomKey)
        
        if (!animal || !animal.texture || animal.texture.key === '__MISSING') {
            console.warn(`Failed to create sprite for: ${randomKey}`)
            if (animal) animal.destroy()
            return
        }
        
        this.setupAnimalSprite(animal, randomKey)
        this.animalSprites.push(animal)
        
        this.scene.time.delayedCall(10000, () => {
            if (animal && animal.active) {
                this.removeAnimalWithAnimation(animal)
            }
        })
    }

    private setupAnimalSprite(animal: Phaser.Physics.Matter.Sprite, animalKey: string): void {
        const scale = this.viewportManager.calculateSpriteScale()
        animal.setScale(scale)

        const spriteHeight = animal.height * scale
        const y = -spriteHeight
        const gameWidth = this.viewportManager.getGameWidth()
        const x = Phaser.Math.Between(50, gameWidth - 50)
        animal.setPosition(x, y)

        animal.setBody({
            type: 'rectangle',
            width: animal.width * scale,
            height: animal.height * scale
        })

        animal.setBounce(0.3)
        animal.setFriction(0.7)
        animal.setVelocity(0, 0)
        animal.setAngularVelocity(Phaser.Math.FloatBetween(-0.01, 0.01))

        // Initialize growth state
        this.growthManager.initializeGrowthState(animal, scale)
        
        // Store animal key for sound effects
        animal.setData('animalKey', animalKey)

        animal.setInteractive()
        
        animal.on('pointerdown', () => {
            if (animal.getData('removing')) {
                return
            }
            this.handleAnimalClick(animal, animalKey)
        })
    }

    private async handleAnimalClick(animal: Phaser.Physics.Matter.Sprite, animalKey: string): Promise<void> {
        if (!this.growthManager.canGrow(animal)) {
            return
        }

        // Play sound with pitch based on growth level
        const pitchMultiplier = this.growthManager.getSoundPitchMultiplier(animal)
        this.soundManager.playAnimalSoundWithPitch(animalKey, pitchMultiplier)
        
        // Grow the animal
        await this.growthManager.growAnimal(animal)
        
        // Growth feedback removed
    }


    removeAnimalWithAnimation(animal: Phaser.Physics.Matter.Sprite): void {
        if (animal.getData('removing')) {
            return
        }
        
        animal.setData('removing', true)
        animal.setStatic(true)
        
        this.scene.tweens.add({
            targets: animal,
            scaleX: 0,
            scaleY: 0,
            alpha: 0.3,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => {
                const index = this.animalSprites.indexOf(animal)
                if (index > -1) {
                    this.animalSprites.splice(index, 1)
                }
                if (animal && animal.active) {
                    animal.destroy()
                }
            }
        })
    }

    update(): void {
        const gameHeight = this.viewportManager.getGameHeight()
        const floorY = gameHeight - 40
        
        this.animalSprites = this.animalSprites.filter(sprite => {
            if (sprite.y > floorY + 200 && !sprite.getData('removing')) {
                this.removeAnimalWithAnimation(sprite)
            }
            return sprite.active
        })
    }

    getAnimalSprites(): Phaser.Physics.Matter.Sprite[] {
        return this.animalSprites
    }
}