import Phaser from 'phaser'
import { AssetLoader } from '../managers/AssetLoader'
import { ViewportManager } from '../managers/ViewportManager'
import { SoundManager } from '../managers/SoundManager'
import { AnimalSpawner } from '../managers/AnimalSpawner'
import { PhysicsManager } from '../managers/PhysicsManager'
import { GrowthManager } from '../managers/GrowthManager'

export class GameScene extends Phaser.Scene {
    private assetLoader: AssetLoader
    private viewportManager: ViewportManager
    private soundManager: SoundManager
    private growthManager: GrowthManager
    private animalSpawner: AnimalSpawner
    private physicsManager: PhysicsManager

    constructor() {
        super({ key: 'GameScene' })
        
        this.assetLoader = new AssetLoader(this)
        this.viewportManager = new ViewportManager(this)
        this.soundManager = new SoundManager(this)
        this.growthManager = new GrowthManager(this)
        this.animalSpawner = new AnimalSpawner(this, this.viewportManager, this.soundManager, this.growthManager)
        this.physicsManager = new PhysicsManager(this, this.viewportManager)
    }

    async preload(): Promise<void> {
        await this.assetLoader.loadAssets()
        
        const audioMap = this.assetLoader.getAudioMap()
        const imageKeys = this.assetLoader.getImageKeys()
        
        this.soundManager.setAudioMap(audioMap)
        this.animalSpawner.setAnimalKeys(imageKeys)
    }
    

    create(): void {
        this.viewportManager.initialize(() => {
            this.physicsManager.updateFloorPosition()
        })
        
        this.physicsManager.initialize()
        this.animalSpawner.startSpawning()
    }
    

    update(): void {
        this.animalSpawner.update()
    }
}