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
        this.viewportManager = new ViewportManager(this)
        this.soundManager = new SoundManager(this)
        this.growthManager = new GrowthManager(this, { removeOnMaxLevel: true })
        this.unifiedSpawner = new UnifiedSpawner(this, this.viewportManager, this.soundManager, this.growthManager)
        this.physicsManager = new PhysicsManager(this, this.viewportManager)
        this.categorySwitcher = new CategorySwitcher(this, {
            switchInterval: 60000, // 60秒
            categories: ['animals', 'fruits'],
            showCountdown: true,
            warningTime: 10000 // 10秒前警告
        })
    }

    async preload(): Promise<void> {
        // 両方のカテゴリのアセットを読み込み
        await Promise.all([
            this.assetLoaderAnimals.loadAssets(),
            this.assetLoaderFruits.loadAssets()
        ])
        
        // UnifiedSpawnerにカテゴリデータを設定
        const animalsData = this.assetLoaderAnimals.getCategoryData()
        const fruitsData = this.assetLoaderFruits.getCategoryData()
        
        if (animalsData) {
            this.unifiedSpawner.setCategoryData('animals', animalsData)
        }
        if (fruitsData) {
            this.unifiedSpawner.setCategoryData('fruits', fruitsData)
        }
        
        // 初期カテゴリ（動物）の音声マップを設定
        if (animalsData?.audioMap) {
            this.soundManager.setAudioMap(animalsData.audioMap)
        }
    }
    

    create(): void {
        this.viewportManager.initialize(() => {
            this.physicsManager.updateFloorPosition()
            this.categorySwitcher.handleResize(this.scale.width, this.scale.height)
        })
        
        this.physicsManager.initialize()
        
        // カテゴリ切り替えイベントハンドラー設定
        this.categorySwitcher.setOnCategorySwitch(this.handleCategorySwitch.bind(this))
        
        // スポーンとカテゴリ切り替えを開始
        this.unifiedSpawner.startSpawning()
        this.categorySwitcher.startSwitching()
    }
    

    update(): void {
        this.unifiedSpawner.update()
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
            'fruits': '#FFE4E1'    // フルーツ: ピンク系
        }
        
        const targetColor = colors[category as keyof typeof colors] || '#87CEEB'
        
        // 背景色のスムーズな変更
        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 1000,
            ease: 'Power2.easeInOut',
            onUpdate: (tween) => {
                const progress = tween.getValue()
                const currentColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.HexStringToColor(this.cameras.main.backgroundColor.toString(16)),
                    Phaser.Display.Color.HexStringToColor(targetColor),
                    1,
                    progress
                )
                this.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(currentColor.r, currentColor.g, currentColor.b))
            }
        })
    }
}