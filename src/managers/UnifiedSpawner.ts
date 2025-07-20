import { ViewportManager } from './ViewportManager'
import { SoundManager } from './SoundManager'
import { GrowthManager } from './GrowthManager'
import { CategoryData } from './AssetLoader'
import { EmojiTextureGenerator } from './EmojiTextureGenerator'

export interface SpawnerConfig {
    spawnInterval: number
    autoRemoveDelay: number
    maxSprites: number
}

export class UnifiedSpawner {
    private scene: Phaser.Scene
    private viewportManager: ViewportManager
    private soundManager: SoundManager
    private growthManager: GrowthManager
    private emojiGenerator: EmojiTextureGenerator
    
    private gameSprites: Phaser.Physics.Matter.Sprite[] = []
    private spawnTimer: Phaser.Time.TimerEvent | null = null
    private lastSpawned: string | null = null
    
    private currentCategory: string = 'animals'
    private categoryData: Record<string, CategoryData> = {}
    private config: SpawnerConfig

    constructor(
        scene: Phaser.Scene, 
        viewportManager: ViewportManager, 
        soundManager: SoundManager, 
        growthManager: GrowthManager,
        config: Partial<SpawnerConfig> = {}
    ) {
        this.scene = scene
        this.viewportManager = viewportManager
        this.soundManager = soundManager
        this.growthManager = growthManager
        this.emojiGenerator = new EmojiTextureGenerator(scene)
        
        this.config = {
            spawnInterval: 1500,
            autoRemoveDelay: 10000,
            maxSprites: 20,
            ...config
        }
    }

    public setCategoryData(category: string, data: CategoryData): void {
        this.categoryData[category] = data
        
        // audioMapを新しい構造から抽出して追加
        const audioMap: Record<string, string> = {}
        Object.entries(data.entities).forEach(([entityKey, entityData]) => {
            audioMap[entityKey] = entityData.audioMap
        })
        this.soundManager.addAudioMappings(audioMap)
        
        // エモジテクスチャを生成（フルーツの場合）
        if (data.emojiMapping) {
            Object.entries(data.emojiMapping).forEach(([key, emoji]) => {
                this.emojiGenerator.createEmojiTexture(key, emoji)
            })
        }
    }

    public switchCategory(newCategory: string): void {
        if (this.currentCategory === newCategory) return
        
        console.log(`🔄 Switching category from ${this.currentCategory} to ${newCategory}`)
        
        // 既存スプライトは削除せずに残す
        // 新しく生成されるスプライトのみを新カテゴリに変更
        
        // カテゴリ変更
        this.currentCategory = newCategory
        
        // audioMapは既にsetCategoryDataで追加済みなので、ここでは何もしない
    }

    public startSpawning(): void {
        // Setup sprite removal event listener when starting (scene is fully initialized)
        this.scene.events.on('sprite-removed', this.handleSpriteRemoved.bind(this))
        
        if (this.spawnTimer) {
            this.spawnTimer.remove()
        }
        
        this.spawnTimer = this.scene.time.addEvent({
            delay: this.config.spawnInterval,
            callback: this.spawnRandomEntity,
            callbackScope: this,
            loop: true
        })
        
        console.log(`✅ Started spawning ${this.currentCategory}`)
    }

    public stopSpawning(): void {
        if (this.spawnTimer) {
            this.spawnTimer.remove()
            this.spawnTimer = null
        }
        console.log(`⏹️ Stopped spawning`)
    }

    public clearCurrentSprites(): void {
        // 既存スプライトを削除アニメーションで除去
        this.gameSprites.forEach(sprite => {
            if (sprite && sprite.active && !sprite.getData('removing')) {
                this.removeEntityWithAnimation(sprite)
            }
        })
    }

    private getCurrentCategoryData(): CategoryData | null {
        return this.categoryData[this.currentCategory] || null
    }

    private spawnRandomEntity(): void {
        const categoryData = this.getCurrentCategoryData()
        if (!categoryData || !categoryData.entities) {
            return
        }

        // 最大スプライト数チェック
        if (this.gameSprites.length >= this.config.maxSprites) {
            return
        }

        // エンティティキー一覧を取得
        const entityKeys = Object.keys(categoryData.entities)
        
        // ランダムエンティティ選択（重複防止）
        let randomKey: string
        do {
            randomKey = Phaser.Utils.Array.GetRandom(entityKeys)
        } while (randomKey === this.lastSpawned && entityKeys.length > 1)
        
        this.lastSpawned = randomKey
        
        const sprite = this.createSprite(randomKey)
        if (sprite) {
            this.setupSprite(sprite, randomKey)
            this.gameSprites.push(sprite)
            
            // 自動削除タイマー
            this.scene.time.delayedCall(this.config.autoRemoveDelay, () => {
                if (sprite && sprite.active && !sprite.getData('removing')) {
                    this.removeEntityWithAnimation(sprite)
                }
            })
        }
    }

    private createSprite(entityKey: string): Phaser.Physics.Matter.Sprite | null {
        // テクスチャ存在確認
        if (!this.scene.textures.exists(entityKey)) {
            console.warn(`❌ Texture not found for: ${entityKey}`)
            return null
        }

        const gameWidth = this.scene.scale.width
        const x = Phaser.Math.Between(50, gameWidth - 50)
        
        const sprite = this.scene.matter.add.sprite(x, 0, entityKey)
        if (!sprite) {
            console.warn(`❌ Failed to create sprite for: ${entityKey}`)
            return null
        }

        return sprite
    }

    private setupSprite(sprite: Phaser.Physics.Matter.Sprite, entityKey: string): void {
        const scale = this.calculateScale(entityKey)
        sprite.setScale(scale)

        // 位置調整
        const spriteHeight = sprite.height * scale
        const y = -spriteHeight
        sprite.setPosition(sprite.x, y)

        // 物理プロパティ設定
        sprite.setBody({
            type: 'rectangle',
            width: sprite.width * scale,
            height: sprite.height * scale
        })

        sprite.setBounce(0.3)
        sprite.setFriction(0.7)
        sprite.setVelocity(0, 0)
        sprite.setAngularVelocity(Phaser.Math.FloatBetween(-0.01, 0.01))

        // インタラクティブ設定
        sprite.setInteractive()
        sprite.on('pointerdown', () => {
            this.handleSpriteClick(sprite, entityKey)
        })

        // 成長状態初期化
        this.growthManager.initializeGrowthState(sprite, scale)
    }

    private calculateScale(entityKey: string): number {
        const gameWidth = this.scene.scale.width
        const gameHeight = this.scene.scale.height
        const aspectRatio = gameWidth / gameHeight
        const minDimension = Math.min(gameWidth, gameHeight)
        
        // 個別のベーススケールを取得
        const categoryData = this.categoryData[this.currentCategory]
        const baseScale = categoryData?.entities?.[entityKey]?.baseScale || 1.0
        
        // レスポンシブ倍率を計算
        let responsiveMultiplier: number
        
        // フルーツは少し大きめに（1.3倍調整済み）
        if (this.currentCategory === 'fruits') {
            if (aspectRatio > 1.2) {
                // 横長画面（PC等）
                responsiveMultiplier = Math.min(0.65, Math.max(0.455, minDimension / 923))
            } else {
                // 縦長画面（モバイル）
                if (minDimension < 450) {
                    // iPhone系
                    responsiveMultiplier = Math.min(0.35, Math.max(0.2, minDimension / 1300))
                } else {
                    // iPad系
                    responsiveMultiplier = Math.min(0.455, Math.max(0.26, minDimension / 1077))
                }
            }
        } else {
            // 動物のレスポンシブ倍率
            if (aspectRatio > 1.2) {
                // 横長画面（PC等）
                responsiveMultiplier = Math.min(1.0, Math.max(0.7, minDimension / 600))
            } else {
                // 縦長画面（モバイル）
                if (minDimension < 450) {
                    // iPhone系（より小さく）
                    responsiveMultiplier = Math.min(0.5, Math.max(0.3, minDimension / 900))
                } else {
                    // iPad系（現状維持）
                    responsiveMultiplier = Math.min(0.7, Math.max(0.4, minDimension / 700))
                }
            }
        }
        
        // ベーススケール × レスポンシブ倍率
        return baseScale * responsiveMultiplier
    }

    private async handleSpriteClick(sprite: Phaser.Physics.Matter.Sprite, entityKey: string): Promise<void> {
        // Validate sprite state before any operations
        if (!sprite || !sprite.active || sprite.getData('removing') || !this.growthManager.canGrow(sprite)) {
            return
        }

        const pitchMultiplier = this.growthManager.getSoundPitchMultiplier(sprite)
        this.soundManager.playAnimalSoundWithPitch(entityKey, pitchMultiplier)
        
        // Double-check sprite is still valid before growing
        if (sprite && sprite.active && !sprite.getData('removing')) {
            await this.growthManager.growAnimal(sprite)
        }
    }

    private removeEntityWithAnimation(sprite: Phaser.Physics.Matter.Sprite): void {
        if (sprite.getData('removing')) {
            return
        }
        
        sprite.setData('removing', true)
        sprite.setStatic(true)
        
        this.scene.tweens.add({
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

    private handleSpriteRemoved(sprite: Phaser.Physics.Matter.Sprite): void {
        const index = this.gameSprites.indexOf(sprite)
        if (index > -1) {
            this.gameSprites.splice(index, 1)
        }
    }

    public update(): void {
        const gameHeight = this.scene.scale.height
        const floorY = gameHeight - 40
        
        this.gameSprites = this.gameSprites.filter(sprite => {
            if (sprite.y > floorY + 200 && !sprite.getData('removing')) {
                this.removeEntityWithAnimation(sprite)
            }
            return sprite.active
        })
    }

    public getCurrentCategory(): string {
        return this.currentCategory
    }

    public getSpriteCount(): number {
        return this.gameSprites.length
    }

    public getAllSprites(): Phaser.Physics.Matter.Sprite[] {
        return [...this.gameSprites]
    }

    public findSpriteFromBody(body: MatterJS.BodyType): Phaser.Physics.Matter.Sprite | null {
        return this.gameSprites.find(sprite => sprite.body === body) || null
    }
}