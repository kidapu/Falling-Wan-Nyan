import { EmojiTextureGenerator } from './EmojiTextureGenerator'

export interface EntityData {
    audioMap: string
    baseScale: number
}

export interface CategoryData {
    category: string
    displayName: string
    entities: Record<string, EntityData>
    sounds: string[]
    assetPaths?: {
        images?: string
        sounds?: string
    }
    fileExtensions?: {
        images?: string
        sounds?: string
    }
    emojiMapping?: Record<string, string> // For emoji-based textures
}

export class AssetLoader {
    private scene: Phaser.Scene
    private categoryData: CategoryData | null = null
    private audioMap: Record<string, string> = {}
    private baseScales: Record<string, number> = {}
    private assetPaths: Record<string, string> = {}
    private fileExtensions: Record<string, string> = {}
    private loadedImageKeys: string[] = []
    private emojiGenerator: EmojiTextureGenerator
    private dataFileName: string

    constructor(scene: Phaser.Scene, dataFileName: string = 'animals') {
        this.scene = scene
        this.dataFileName = dataFileName
        this.emojiGenerator = new EmojiTextureGenerator(scene)
    }

    async loadAssets(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.setupLoadHandlers(resolve, reject)
            this.scene.load.json(this.dataFileName, `json/${this.dataFileName}.json`)
            this.scene.load.start()
        })
    }

    private setupLoadHandlers(resolve: () => void, reject: (error: Error) => void): void {
        this.scene.load.on(`filecomplete-json-${this.dataFileName}`, () => {
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
            this.categoryData = this.scene.cache.json.get(this.dataFileName) as CategoryData
            
            if (!this.categoryData) {
                console.error('❌ Failed to load category data')
                this.useFallbackData()
                return
            }
            
            console.log(`✅ Loaded category: ${this.categoryData.displayName}`)
            
            // 新しい構造からaudioMapとbaseScalesを抽出
            this.audioMap = {}
            this.baseScales = {}
            
            Object.entries(this.categoryData.entities).forEach(([entityKey, entityData]) => {
                this.audioMap[entityKey] = entityData.audioMap
                this.baseScales[entityKey] = entityData.baseScale
            })
            this.assetPaths = this.categoryData.assetPaths || {}
            this.fileExtensions = this.categoryData.fileExtensions || {}
            
            // Always use loadImages() for mixed texture loading (PNG + emoji)
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
        
        Object.keys(this.categoryData?.entities || {}).forEach(imageName => {
            // Check if this specific image should use emoji texture
            if (this.categoryData?.emojiMapping?.[imageName]) {
                const emoji = this.categoryData.emojiMapping[imageName]
                this.emojiGenerator.createEmojiTexture(imageName, emoji)
                console.log(`✅ Created emoji texture: ${imageName} (${emoji})`)
            } else {
                // Load normal image file
                this.scene.load.image(imageName, `${imagePath}${imageName}${imageExt}`)
            }
            this.loadedImageKeys.push(imageName)
        })
    }

    private loadEmojiTextures(): void {
        if (!this.categoryData?.emojiMapping) return
        
        Object.keys(this.categoryData.entities || {}).forEach(imageName => {
            const emoji = this.categoryData!.emojiMapping![imageName]
            if (emoji) {
                this.emojiGenerator.createEmojiTexture(imageName, emoji)
                this.loadedImageKeys.push(imageName)
            }
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
            entities: {
                'cat-01': { audioMap: 'cat', baseScale: 0.4 },
                'dog-01': { audioMap: 'dog', baseScale: 0.5 },
                'elephant-01': { audioMap: 'elephant', baseScale: 1.0 }
            },
            sounds: ['cat', 'dog', 'elephant']
        }
        
        this.audioMap = {
            'cat-01': 'cat',
            'dog-01': 'dog',
            'elephant-01': 'elephant'
        }
        
        this.baseScales = {
            'cat-01': 0.4,
            'dog-01': 0.5,
            'elephant-01': 1.0
        }
        
        this.assetPaths = { images: 'illust/animals/', sounds: 'voice/animals/' }
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
        
        Object.keys(this.categoryData.entities || {}).forEach(imageName => {
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
    
    getEntityKeys(): string[] {
        return Object.keys(this.categoryData?.entities || {})
    }

    getAudioMap(): Record<string, string> {
        return this.audioMap
    }

    getBaseScales(): Record<string, number> {
        return this.baseScales
    }

    getCategoryData(): CategoryData | null {
        return this.categoryData
    }
}