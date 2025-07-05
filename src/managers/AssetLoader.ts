export interface CategoryData {
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

export class AssetLoader {
    private scene: Phaser.Scene
    private categoryData: CategoryData | null = null
    private audioMap: Record<string, string> = {}
    private assetPaths: Record<string, string> = {}
    private fileExtensions: Record<string, string> = {}
    private loadedImageKeys: string[] = []

    constructor(scene: Phaser.Scene) {
        this.scene = scene
    }

    async loadAssets(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.setupLoadHandlers(resolve, reject)
            this.scene.load.json('animals', 'data/animals.json')
            this.scene.load.start()
        })
    }

    private setupLoadHandlers(resolve: () => void, reject: (error: Error) => void): void {
        this.scene.load.on('filecomplete-json-animals', () => {
            this.loadCategoryAssets().then(resolve).catch(reject)
        })

        this.scene.load.on('progress', (progress: number) => {
            console.log(`Loading: ${Math.round(progress * 100)}%`)
        })

        this.scene.load.on('loaderror', (file: Phaser.Loader.File) => {
            console.warn(`❌ Failed to load: ${file.key} (${file.src})`)
        })

        this.scene.load.on('complete', () => {
            this.validateAssets()
            resolve()
        })
    }

    private async loadCategoryAssets(): Promise<void> {
        try {
            this.categoryData = this.scene.cache.json.get('animals') as CategoryData
            
            if (!this.categoryData) {
                console.error('❌ Failed to load category data')
                this.useFallbackData()
                return
            }
            
            console.log(`✅ Loaded category: ${this.categoryData.displayName}`)
            
            this.audioMap = this.categoryData.audioMap || {}
            this.assetPaths = this.categoryData.assetPaths || {}
            this.fileExtensions = this.categoryData.fileExtensions || {}
            
            this.loadImages()
            this.loadSounds()
            
            this.scene.load.start()
            
        } catch (error) {
            console.error('❌ Error loading category assets:', error)
            this.useFallbackData()
        }
    }

    private loadImages(): void {
        const imagePath = this.assetPaths.images || 'illust/'
        const imageExt = this.fileExtensions.images || '.png'
        
        this.categoryData?.images.forEach(imageName => {
            this.scene.load.image(imageName, `${imagePath}${imageName}${imageExt}`)
            this.loadedImageKeys.push(imageName)
        })
    }

    private loadSounds(): void {
        const soundPath = this.assetPaths.sounds || 'voice/'
        const soundExt = this.fileExtensions.sounds || '.wav'
        
        this.categoryData?.sounds.forEach(soundName => {
            this.scene.load.audio(soundName, `${soundPath}${soundName}${soundExt}`)
        })
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
        
        this.loadImages()
        this.loadSounds()
        this.scene.load.start()
    }

    private validateAssets(): void {
        if (!this.categoryData) {
            console.error('❌ No category data available')
            return
        }
        
        console.log('✅ All loading attempts completed. Checking assets...')
        
        this.categoryData.images.forEach(imageName => {
            const texture = this.scene.textures.get(imageName)
            if (!texture || texture.key === '__MISSING') {
                console.warn(`❌ Missing texture: ${imageName}`)
            } else {
                console.log(`✅ Loaded texture: ${imageName}`)
            }
        })
        
        this.categoryData.sounds.forEach(soundName => {
            if (this.scene.cache.audio.exists(soundName)) {
                console.log(`✅ Loaded audio: ${soundName}`)
            } else {
                console.warn(`❌ Missing audio: ${soundName}`)
            }
        })
    }

    getImageKeys(): string[] {
        return this.loadedImageKeys
    }

    getAudioMap(): Record<string, string> {
        return this.audioMap
    }

    getCategoryData(): CategoryData | null {
        return this.categoryData
    }
}