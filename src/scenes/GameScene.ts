import Phaser from 'phaser'
import { AssetLoader } from '../managers/AssetLoader'
import { ViewportManager } from '../managers/ViewportManager'
import { SoundManager } from '../managers/SoundManager'
import { PhysicsManager } from '../managers/PhysicsManager'
import { GrowthManager } from '../managers/GrowthManager'
import { CategorySwitcher, CategorySwitchEvent } from '../managers/CategorySwitcher'
import { UnifiedSpawner } from '../managers/UnifiedSpawner'

export class GameScene extends Phaser.Scene {
    private assetLoaderAnimals: AssetLoader
    private assetLoaderFruits: AssetLoader
    private assetLoaderDailyItems: AssetLoader
    private viewportManager: ViewportManager
    private soundManager: SoundManager
    private growthManager: GrowthManager
    private unifiedSpawner: UnifiedSpawner
    private physicsManager: PhysicsManager
    private categorySwitcher: CategorySwitcher

    constructor() {
        super({ key: 'GameScene' })
        
        this.assetLoaderAnimals = new AssetLoader(this, 'animals')
        this.assetLoaderFruits = new AssetLoader(this, 'fruits')
        this.assetLoaderDailyItems = new AssetLoader(this, 'daily_items')
        this.viewportManager = new ViewportManager(this)
        this.soundManager = new SoundManager(this)
        this.growthManager = new GrowthManager(this, { removeOnMaxLevel: true })
        this.unifiedSpawner = new UnifiedSpawner(this, this.viewportManager, this.soundManager, this.growthManager, {
            useConvexHull: true,           // 凸包機能を有効化する場合はtrueに設定
            hullSamplingInterval: 5,       // サンプリング間隔（1-20、小さいほど精密）
            hullAlphaThreshold: 128,       // アルファ閾値（0-255）
            hullDebugDraw: false          // デバッグ描画を有効化
        })
        this.physicsManager = new PhysicsManager(this, this.viewportManager)
        this.categorySwitcher = new CategorySwitcher(this, {
            switchInterval: 60000, // 60秒
            categories: ['animals', 'fruits', 'daily_items'],
            showCountdown: true,
            warningTime: 10000 // 10秒前警告
        })
    }

    async preload(): Promise<void> {
        // SE音ファイルを読み込み
        this.load.audio('drop', 'audio/se/drop.mp3')
        
        // 地面のテクスチャを読み込み
        this.load.image('ground2', 'data/texture/ground2.png')
        
        // 全カテゴリのアセットを読み込み
        await Promise.all([
            this.assetLoaderAnimals.loadAssets(),
            this.assetLoaderFruits.loadAssets(),
            this.assetLoaderDailyItems.loadAssets()
        ])
        
        // UnifiedSpawnerにカテゴリデータを設定
        const animalsData = this.assetLoaderAnimals.getCategoryData()
        const fruitsData = this.assetLoaderFruits.getCategoryData()
        const dailyItemsData = this.assetLoaderDailyItems.getCategoryData()
        
        // カテゴリ表示名と質問を収集
        const categoryDisplayNames: Record<string, string> = {}
        const categoryQuestions: Record<string, string> = {}
        
        if (animalsData) {
            this.unifiedSpawner.setCategoryData('animals', animalsData)
            categoryDisplayNames['animals'] = animalsData.displayName
            categoryQuestions['animals'] = (animalsData as any).question
        }
        if (fruitsData) {
            this.unifiedSpawner.setCategoryData('fruits', fruitsData)
            categoryDisplayNames['fruits'] = fruitsData.displayName
            categoryQuestions['fruits'] = (fruitsData as any).question
        }
        if (dailyItemsData) {
            this.unifiedSpawner.setCategoryData('daily_items', dailyItemsData)
            categoryDisplayNames['daily_items'] = dailyItemsData.displayName
            categoryQuestions['daily_items'] = (dailyItemsData as any).question
        }
        
        // CategorySwitcherに表示名と質問を設定
        this.categorySwitcher.setCategoryDisplayNames(categoryDisplayNames)
        this.categorySwitcher.setCategoryQuestions(categoryQuestions)
        
        // この時点で既にsetCategoryDataによってaudioMapは設定済み
        // 追加で初期設定は不要
    }
    

    create(): void {
        this.viewportManager.initialize(() => {
            this.physicsManager.updateFloorPosition()
            this.categorySwitcher.handleResize(this.scale.width, this.scale.height)
        })
        
        // SoundManagerを初期化（inputが利用可能になってから）
        this.soundManager.initialize()
        
        this.physicsManager.initialize()
        this.setupCollisionEvents()
        
        // カテゴリ切り替えイベントハンドラー設定
        this.categorySwitcher.setOnCategorySwitch(this.handleCategorySwitch.bind(this))
        
        // スポーンとカテゴリ切り替えを開始
        this.unifiedSpawner.startSpawning()
        this.categorySwitcher.startSwitching()
    }
    

    update(): void {
        this.unifiedSpawner.update()
    }

    private setupCollisionEvents(): void {
        // Listen for collision events to play drop sound when sprites hit floor
        this.matter.world.on('collisionstart', (event: any) => {
            const pairs = event.pairs
            
            for (let i = 0; i < pairs.length; i++) {
                const { bodyA, bodyB } = pairs[i]
                
                // Check if collision involves the floor
                const isFloorCollision = this.isFloorBody(bodyA) || this.isFloorBody(bodyB)
                
                if (isFloorCollision) {
                    // Find the sprite body (not the floor)
                    const spriteBody = this.isFloorBody(bodyA) ? bodyB : bodyA
                    const sprite = this.findSpriteFromBody(spriteBody)
                    
                    if (sprite && !sprite.getData('hasLanded')) {
                        // Mark sprite as landed to prevent multiple sounds
                        sprite.setData('hasLanded', true)
                        
                        // Play drop sound
                        // this.soundManager.playDropSound()
                    }
                }
            }
        })
    }

    private findSpriteFromBody(body: MatterJS.BodyType): Phaser.Physics.Matter.Sprite | null {
        return this.unifiedSpawner.findSpriteFromBody(body)
    }

    private isFloorBody(body: MatterJS.BodyType): boolean {
        return this.physicsManager.isFloorBody(body)
    }

    private handleCategorySwitch(event: CategorySwitchEvent): void {
        console.log(`🔄 Category switch: ${event.from} → ${event.to}`)
        
        // スポナーのカテゴリを切り替え
        this.unifiedSpawner.switchCategory(event.to)
        
        // 背景色を変更
        this.updateBackgroundColor(event.to)
    }

    private updateBackgroundColor(category: string): void {
        const colors = {
            'animals': '#87CEEB',  // 動物: 空色
            'fruits': '#87CEEB',   // フルーツ: 空色（動物と同じ）
            'daily_items': '#87CEEB' // 日用品: 空色（動物と同じ）
        }
        
        const targetColor = colors[category as keyof typeof colors] || '#87CEEB'
        
        // 背景色のスムーズな変更
        this.cameras.main.setBackgroundColor(targetColor)
    }
}