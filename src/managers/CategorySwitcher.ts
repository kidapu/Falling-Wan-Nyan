export interface SwitchConfig {
    switchInterval: number      // 切り替え間隔 (ミリ秒)
    categories: string[]        // カテゴリ名配列
    showCountdown: boolean      // カウントダウン表示
    warningTime: number         // 警告表示開始時間 (ミリ秒前)
}

export interface CategorySwitchEvent {
    from: string
    to: string
    index: number
}

export class CategorySwitcher {
    private scene: Phaser.Scene
    private config: SwitchConfig
    private currentCategoryIndex: number = 0
    private switchTimer: Phaser.Time.TimerEvent | null = null
    private countdownTimer: Phaser.Time.TimerEvent | null = null
    private countdownText: Phaser.GameObjects.Text | null = null
    private categoryText: Phaser.GameObjects.Text | null = null
    private remainingTime: number = 0
    private onCategorySwitch: ((event: CategorySwitchEvent) => void) | null = null

    constructor(scene: Phaser.Scene, config: Partial<SwitchConfig> = {}) {
        this.scene = scene
        this.config = {
            switchInterval: 60000,      // 60秒
            categories: ['animals', 'fruits'],
            showCountdown: true,
            warningTime: 10000,         // 10秒前
            ...config
        }
        this.remainingTime = this.config.switchInterval
    }

    public setOnCategorySwitch(callback: (event: CategorySwitchEvent) => void): void {
        this.onCategorySwitch = callback
    }

    public startSwitching(): void {
        this.createUI()
        this.startSwitchTimer()
        this.startCountdownTimer()
        
        // 初期カテゴリを通知
        this.notifyCategorySwitch()
    }

    public stopSwitching(): void {
        if (this.switchTimer) {
            this.switchTimer.remove()
            this.switchTimer = null
        }
        if (this.countdownTimer) {
            this.countdownTimer.remove()
            this.countdownTimer = null
        }
        this.destroyUI()
    }

    public getCurrentCategory(): string {
        return this.config.categories[this.currentCategoryIndex]
    }

    public forceSwitch(): void {
        this.performSwitch()
    }

    private createUI(): void {
        const gameWidth = this.scene.scale.width
        
        // カテゴリ表示テキスト
        this.categoryText = this.scene.add.text(gameWidth / 2, 40, '', {
            fontSize: '24px',
            color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 16, y: 8 },
            align: 'center'
        }).setOrigin(0.5, 0.5).setDepth(1000)

        // カウントダウン表示テキスト
        if (this.config.showCountdown) {
            this.countdownText = this.scene.add.text(gameWidth - 20, 20, '', {
                fontSize: '18px',
                color: '#FFFFFF',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: { x: 8, y: 4 },
                align: 'right'
            }).setOrigin(1, 0).setDepth(1000)
        }

        this.updateCategoryDisplay()
    }

    private destroyUI(): void {
        if (this.categoryText) {
            this.categoryText.destroy()
            this.categoryText = null
        }
        if (this.countdownText) {
            this.countdownText.destroy()
            this.countdownText = null
        }
    }

    private startSwitchTimer(): void {
        this.switchTimer = this.scene.time.addEvent({
            delay: this.config.switchInterval,
            callback: this.performSwitch,
            callbackScope: this,
            loop: true
        })
    }

    private startCountdownTimer(): void {
        this.countdownTimer = this.scene.time.addEvent({
            delay: 1000, // 1秒ごと
            callback: this.updateCountdown,
            callbackScope: this,
            loop: true
        })
    }

    private performSwitch(): void {
        const fromCategory = this.getCurrentCategory()
        
        // 次のカテゴリにスイッチ
        this.currentCategoryIndex = (this.currentCategoryIndex + 1) % this.config.categories.length
        const toCategory = this.getCurrentCategory()
        
        // 切り替えアニメーション開始
        this.showSwitchAnimation(fromCategory, toCategory)
        
        // カウントダウンリセット
        this.remainingTime = this.config.switchInterval
        
        // コールバック通知
        this.notifyCategorySwitch()
    }

    private notifyCategorySwitch(): void {
        if (this.onCategorySwitch) {
            const event: CategorySwitchEvent = {
                from: this.config.categories[(this.currentCategoryIndex - 1 + this.config.categories.length) % this.config.categories.length],
                to: this.getCurrentCategory(),
                index: this.currentCategoryIndex
            }
            this.onCategorySwitch(event)
        }
    }

    private showSwitchAnimation(fromCategory: string, toCategory: string): void {
        if (!this.categoryText) return

        // カテゴリ名のマッピング
        const categoryNames: Record<string, string> = {
            'animals': 'どうぶつのなまえは？',
            'fruits': 'フルーツのなまえは？'
        }

        // 切り替えアニメーション
        this.scene.tweens.add({
            targets: this.categoryText,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0.8,
            duration: 300,
            ease: 'Power2.easeOut',
            yoyo: true,
            onComplete: () => {
                this.updateCategoryDisplay()
            }
        })

        // 短時間の切り替え通知表示
        const switchNotification = this.scene.add.text(
            this.scene.scale.width / 2, 
            this.scene.scale.height / 2, 
            `${categoryNames[toCategory]}`,
            {
                fontSize: '32px',
                color: '#FFFFFF',
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: { x: 20, y: 10 },
                align: 'center'
            }
        ).setOrigin(0.5, 0.5).setDepth(1001).setAlpha(0)

        // 通知アニメーション
        this.scene.tweens.add({
            targets: switchNotification,
            alpha: 1,
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(1500, () => {
                    this.scene.tweens.add({
                        targets: switchNotification,
                        alpha: 0,
                        duration: 500,
                        ease: 'Power2.easeIn',
                        onComplete: () => {
                            switchNotification.destroy()
                        }
                    })
                })
            }
        })
    }

    private updateCountdown(): void {
        this.remainingTime -= 1000

        if (this.remainingTime <= 0) {
            this.remainingTime = this.config.switchInterval
        }

        this.updateCountdownDisplay()
    }

    private updateCategoryDisplay(): void {
        if (!this.categoryText) return

        const categoryNames: Record<string, string> = {
            'animals': 'どうぶつのなまえは？',
            'fruits': 'フルーツのなまえは？'
        }

        const currentCategory = this.getCurrentCategory()
        this.categoryText.setText(categoryNames[currentCategory] || currentCategory)
    }

    private updateCountdownDisplay(): void {
        if (!this.countdownText || !this.config.showCountdown) return

        const seconds = Math.ceil(this.remainingTime / 1000)
        
        // 警告時間内の場合は色を変更
        if (this.remainingTime <= this.config.warningTime) {
            this.countdownText.setColor('#FF6B6B')
            this.countdownText.setText(`切り替えまで: ${seconds}秒`)
        } else {
            this.countdownText.setColor('#FFFFFF')
            this.countdownText.setText(`${seconds}秒`)
        }
    }

    public handleResize(width: number, height: number): void {
        if (this.categoryText) {
            this.categoryText.setPosition(width / 2, 40)
        }
        if (this.countdownText) {
            this.countdownText.setPosition(width - 20, 20)
        }
    }
}