export interface SwitchConfig {
    switchInterval: number      // 切り替え間隔 (ミリ秒)
    categories: string[]        // カテゴリ名配列
    showCountdown: boolean      // カウントダウン表示
    warningTime: number         // 警告表示開始時間 (ミリ秒前)
    categoryDisplayNames?: Record<string, string> // カテゴリ表示名マップ
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
    private countdownElement: HTMLElement | null = null
    private categoryElement: HTMLElement | null = null
    private switchNotificationElement: HTMLElement | null = null
    private remainingTime: number = 0
    private onCategorySwitch: ((event: CategorySwitchEvent) => void) | null = null
    private categoryDisplayNames: Record<string, string> = {}
    private categoryQuestions: Record<string, string> = {}

    constructor(scene: Phaser.Scene, config: Partial<SwitchConfig> = {}) {
        this.scene = scene
        this.config = {
            switchInterval: 60000,      // 60秒
            categories: ['animals', 'fruits'],
            showCountdown: true,
            warningTime: 10000,         // 10秒前
            ...config
        }
        this.categoryDisplayNames = config.categoryDisplayNames || {}
        this.remainingTime = this.config.switchInterval
    }

    public setOnCategorySwitch(callback: (event: CategorySwitchEvent) => void): void {
        this.onCategorySwitch = callback
    }

    public setCategoryDisplayNames(displayNames: Record<string, string>): void {
        this.categoryDisplayNames = { ...this.categoryDisplayNames, ...displayNames }
    }

    public setCategoryQuestions(questions: Record<string, string>): void {
        this.categoryQuestions = { ...this.categoryQuestions, ...questions }
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
        // DOM要素を取得
        this.categoryElement = document.getElementById('category-display')
        this.countdownElement = document.getElementById('countdown-display')
        this.switchNotificationElement = document.getElementById('switch-notification')
        
        // カウントダウン要素にクリックイベントを追加
        if (this.config.showCountdown && this.countdownElement) {
            this.countdownElement.addEventListener('click', () => {
                this.handleCountdownTap()
            })
        }

        this.updateCategoryDisplay()
    }

    private destroyUI(): void {
        // DOM要素は削除せず、内容をクリアするだけ
        if (this.categoryElement) {
            this.categoryElement.textContent = ''
        }
        if (this.countdownElement) {
            this.countdownElement.textContent = ''
        }
        if (this.switchNotificationElement) {
            this.switchNotificationElement.style.display = 'none'
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
        if (!this.categoryElement) return

        // カテゴリ表示名と質問を取得
        const getQuestion = (category: string): string => {
            return this.categoryQuestions[category] || category
        }

        // 切り替えアニメーション (CSS animation)
        this.categoryElement.style.animation = 'none'
        setTimeout(() => {
            if (this.categoryElement) {
                this.categoryElement.style.animation = 'pulse 0.6s ease-out'
                this.updateCategoryDisplay()
            }
        }, 10)

        // 短時間の切り替え通知表示
        if (this.switchNotificationElement) {
            this.switchNotificationElement.textContent = getQuestion(toCategory)
            this.switchNotificationElement.style.display = 'block'
            
            // フェードインアニメーション
            setTimeout(() => {
                if (this.switchNotificationElement) {
                    this.switchNotificationElement.style.opacity = '1'
                    this.switchNotificationElement.style.transition = 'opacity 0.5s ease-out'
                }
            }, 10)
            
            // 1.5秒後にフェードアウト
            setTimeout(() => {
                if (this.switchNotificationElement) {
                    this.switchNotificationElement.style.opacity = '0'
                    this.switchNotificationElement.style.transition = 'opacity 0.5s ease-in'
                    
                    // 完全に非表示にする
                    setTimeout(() => {
                        if (this.switchNotificationElement) {
                            this.switchNotificationElement.style.display = 'none'
                        }
                    }, 500)
                }
            }, 2000)
        }
    }

    private updateCountdown(): void {
        this.remainingTime -= 1000

        if (this.remainingTime <= 0) {
            this.remainingTime = this.config.switchInterval
        }

        this.updateCountdownDisplay()
    }

    private updateCategoryDisplay(): void {
        if (!this.categoryElement) return

        const currentCategory = this.getCurrentCategory()
        const question = this.categoryQuestions[currentCategory] || currentCategory
        this.categoryElement.textContent = question
    }

    private updateCountdownDisplay(): void {
        if (!this.countdownElement || !this.config.showCountdown) return

        const seconds = Math.ceil(this.remainingTime / 1000)
        
        // 警告時間内の場合は色を変更
        if (this.remainingTime <= this.config.warningTime) {
            this.countdownElement.style.color = '#FF6B6B'
        } else {
            this.countdownElement.style.color = '#FFFFFF'
        }
        
        this.countdownElement.textContent = `${seconds}秒`
    }

    private handleCountdownTap(): void {
        // タップエフェクトを表示
        this.showTapEffect()
        
        // 手動でカテゴリ切り替えを実行
        this.performSwitch()
    }
    
    private showTapEffect(): void {
        if (!this.countdownElement) return
        
        // タップエフェクト: CSSアニメーション
        this.countdownElement.style.animation = 'none'
        const originalColor = this.countdownElement.style.color
        
        setTimeout(() => {
            if (this.countdownElement) {
                this.countdownElement.style.animation = 'tap-effect 0.2s ease-out'
                this.countdownElement.style.color = '#FFD700' // ゴールド
                
                // 色を元に戻す
                setTimeout(() => {
                    if (this.countdownElement) {
                        this.countdownElement.style.color = originalColor
                    }
                }, 200)
            }
        }, 10)
    }

    public handleResize(width: number, height: number): void {
        // DOM要素は CSS で自動的に配置されるため、リサイズ処理は不要
    }
}