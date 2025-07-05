import Phaser from 'phaser'

interface CategoryData {
    category: string
    displayName: string
    images: string[]
    sounds: string[]
    audioMap?: Record<string, string>
    assetPaths?: {
        images?: string
        sounds?: string
    }
    fileExtensions?: {
        images?: string
        sounds?: string
    }
}

export class GameScene extends Phaser.Scene {
    private animalSprites: Phaser.Physics.Matter.Sprite[] = []
    private animalKeys: string[] = []
    private spawnTimer: Phaser.Time.TimerEvent | null = null
    private gameWidth: number = 0
    private gameHeight: number = 0
    private lastSpawnedAnimal: string | null = null
    private floor: MatterJS.BodyType | null = null
    private floorGraphics: Phaser.GameObjects.Graphics | null = null
    
    private categoryData: CategoryData | null = null
    private audioMap: Record<string, string> = {}
    private assetPaths: Record<string, string> = {}
    private fileExtensions: Record<string, string> = {}

    constructor() {
        super({ key: 'GameScene' })
    }

    preload(): void {
        this.load.json('animals', 'data/animals.json')
        
        this.load.on('filecomplete-json-animals', () => {
            this.loadCategoryAssets()
        })

        this.load.on('progress', (progress: number) => {
            console.log(`Loading: ${Math.round(progress * 100)}%`)
        })

        this.load.on('loaderror', (file: Phaser.Loader.File) => {
            console.warn(`❌ Failed to load: ${file.key} (${file.src})`)
        })

        this.load.on('complete', () => {
            this.validateAssets()
        })
    }
    
    private loadCategoryAssets(): void {
        try {
            this.categoryData = this.cache.json.get('animals') as CategoryData
            
            if (!this.categoryData) {
                console.error('❌ Failed to load category data')
                this.useFallbackData()
                return
            }
            
            console.log(`✅ Loaded category: ${this.categoryData.displayName}`)
            
            this.audioMap = this.categoryData.audioMap || {}
            this.assetPaths = this.categoryData.assetPaths || {}
            this.fileExtensions = this.categoryData.fileExtensions || {}
            
            const imagePath = this.assetPaths.images || 'illust/'
            const imageExt = this.fileExtensions.images || '.png'
            
            this.categoryData.images.forEach(imageName => {
                this.load.image(imageName, `${imagePath}${imageName}${imageExt}`)
                this.animalKeys.push(imageName)
            })
            
            const soundPath = this.assetPaths.sounds || 'voice/'
            const soundExt = this.fileExtensions.sounds || '.wav'
            
            this.categoryData.sounds.forEach(soundName => {
                this.load.audio(soundName, `${soundPath}${soundName}${soundExt}`)
            })
            
            this.load.start()
            
        } catch (error) {
            console.error('❌ Error loading category assets:', error)
            this.useFallbackData()
        }
    }
    
    private useFallbackData(): void {
        console.warn('🔄 Using fallback data due to JSON load failure')
        
        this.categoryData = {
            category: 'animals',
            displayName: '動物（フォールバック）',
            images: ['cat-01', 'dog-01', 'elephant-01'],
            sounds: ['cat', 'dog', 'elephant']
        }
        
        this.audioMap = {
            'cat-01': 'cat',
            'dog-01': 'dog',
            'elephant-01': 'elephant'
        }
        
        this.assetPaths = { images: 'illust/', sounds: 'voice/' }
        this.fileExtensions = { images: '.png', sounds: '.wav' }
        
        this.categoryData.images.forEach(imageName => {
            this.load.image(imageName, `illust/${imageName}.png`)
            this.animalKeys.push(imageName)
        })
        
        this.categoryData.sounds.forEach(soundName => {
            this.load.audio(soundName, `voice/${soundName}.wav`)
        })
        
        this.load.start()
    }
    
    private validateAssets(): void {
        if (!this.categoryData) {
            console.error('❌ No category data available')
            return
        }
        
        console.log('✅ All loading attempts completed. Checking assets...')
        
        this.categoryData.images.forEach(imageName => {
            const texture = this.textures.get(imageName)
            if (!texture || texture.key === '__MISSING') {
                console.warn(`❌ Missing texture: ${imageName}`)
            } else {
                console.log(`✅ Loaded texture: ${imageName}`)
            }
        })
        
        this.categoryData.sounds.forEach(soundName => {
            if (this.cache.audio.exists(soundName)) {
                console.log(`✅ Loaded audio: ${soundName}`)
            } else {
                console.warn(`❌ Missing audio: ${soundName}`)
            }
        })
    }

    create(): void {
        this.gameWidth = this.scale.width
        this.gameHeight = this.getViewportHeight()
        
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleViewportChange()
            })
        }
        
        this.initializeGame()
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
            this.scale.resize(this.gameWidth, this.gameHeight)
            this.updateFloorPosition()
        }
    }
    
    private updateFloorPosition(): void {
        if (this.floor) {
            this.matter.world.remove(this.matter.world, this.floor)
        }
        this.floor = this.matter.add.rectangle(this.gameWidth / 2, this.gameHeight - 20, this.gameWidth, 40, {
            isStatic: true,
            render: {
                fillStyle: '#8B4513'
            }
        })
        
        if (this.floorGraphics) {
            this.floorGraphics.destroy()
        }
        this.floorGraphics = this.add.graphics()
        this.floorGraphics.fillStyle(0x8B4513)
        this.floorGraphics.fillRect(0, this.gameHeight - 40, this.gameWidth, 40)
        this.floorGraphics.fillStyle(0x228B22)
        this.floorGraphics.fillRect(0, this.gameHeight - 45, this.gameWidth, 5)
    }
    
    private initializeGame(): void {
        this.matter.world.setBounds(0, 0, this.gameWidth, this.gameHeight, 32, true, true, false, true)
        this.matter.world.engine.world.gravity.y = 0.67
        this.updateFloorPosition()
        this.cameras.main.setBackgroundColor('#87CEEB')
        this.startAnimalSpawning()
    }

    private startAnimalSpawning(): void {
        this.spawnTimer = this.time.addEvent({
            delay: 1500,
            callback: this.spawnRandomAnimal,
            callbackScope: this,
            loop: true
        })
    }

    private spawnRandomAnimal(): void {
        let randomKey: string
        do {
            randomKey = Phaser.Utils.Array.GetRandom(this.animalKeys)
        } while (randomKey === this.lastSpawnedAnimal && this.animalKeys.length > 1)
        
        this.lastSpawnedAnimal = randomKey
        
        const texture = this.textures.get(randomKey)
        if (!texture || texture.key === '__MISSING') {
            console.warn(`Texture not found for: ${randomKey}`)
            return
        }
        
        const x = Phaser.Math.Between(50, this.gameWidth - 50)
        const animal = this.matter.add.sprite(x, 0, randomKey)
        
        if (!animal || !animal.texture || animal.texture.key === '__MISSING') {
            console.warn(`Failed to create sprite for: ${randomKey}`)
            if (animal) animal.destroy()
            return
        }
        
        const aspectRatio = this.gameWidth / this.gameHeight
        const minDimension = Math.min(this.gameWidth, this.gameHeight)

        let scale: number
        if (aspectRatio > 1.2) {
            scale = Math.min(1.0, Math.max(0.7, minDimension / 600))
        } else {
            scale = Math.min(0.7, Math.max(0.4, minDimension / 700))
        }
        
        animal.setScale(scale)

        const spriteHeight = animal.height * scale
        const y = -spriteHeight
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

        animal.setInteractive()
        
        animal.on('pointerdown', () => {
            if (animal.getData('removing')) {
                return
            }
            this.playAnimalSound(randomKey, animal)
        })

        this.animalSprites.push(animal)

        this.time.delayedCall(10000, () => {
            if (animal && animal.active) {
                this.removeAnimalWithAnimation(animal)
            }
        })
    }

    private removeAnimalWithAnimation(animal: Phaser.Physics.Matter.Sprite): void {
        if (animal.getData('removing')) {
            return
        }
        
        animal.setData('removing', true)
        animal.setStatic(true)
        
        this.tweens.add({
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

    private playAnimalSound(animalKey: string, sprite: Phaser.Physics.Matter.Sprite): void {
        const audioKey = this.audioMap[animalKey]
        
        if (!audioKey) {
            console.warn(`No audio mapping found for: ${animalKey}`)
            return
        }
        
        if (!this.cache.audio.exists(audioKey)) {
            console.warn(`Audio file not found: ${audioKey}`)
            return
        }
        
        this.showClickEffect(sprite)
        
        try {
            this.sound.play(audioKey, { volume: 0.7 })
            console.log(`🔊 Playing sound: ${audioKey} for ${animalKey}`)
        } catch (error) {
            console.error(`Failed to play sound: ${audioKey}`, error)
        }
    }

    private showClickEffect(sprite: Phaser.Physics.Matter.Sprite): void {
        const originalScale = sprite.scaleX
        const enlargeScale = originalScale * 1.38
        
        this.tweens.add({
            targets: sprite,
            scaleX: enlargeScale,
            scaleY: enlargeScale,
            duration: 100,
            ease: 'Power2.easeOut',
            yoyo: true,
            onComplete: () => {
                sprite.setScale(originalScale)
            }
        })
    }

    update(): void {
        const floorY = this.gameHeight - 40
        
        this.animalSprites = this.animalSprites.filter(sprite => {
            if (sprite.y > floorY + 200 && !sprite.getData('removing')) {
                this.removeAnimalWithAnimation(sprite)
            }
            return sprite.active
        })
    }
}