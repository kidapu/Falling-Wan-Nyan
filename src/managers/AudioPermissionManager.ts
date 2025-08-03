export class AudioPermissionManager {
    private static instance: AudioPermissionManager | null = null
    private audioContext: AudioContext | null = null
    private isInitialized: boolean = false
    private onPermissionGranted: (() => void) | null = null

    private constructor() {}

    public static getInstance(): AudioPermissionManager {
        if (!AudioPermissionManager.instance) {
            AudioPermissionManager.instance = new AudioPermissionManager()
        }
        return AudioPermissionManager.instance
    }

    public setupSplashScreen(onGranted: () => void): void {
        this.onPermissionGranted = onGranted
        
        const startButton = document.getElementById('start-button')
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.handleStartClick()
            })
        }
    }

    private async handleStartClick(): Promise<void> {
        try {
            // AudioContextを作成または再開
            if (!this.audioContext) {
                this.audioContext = new AudioContext()
            }
            
            // サスペンド状態の場合は再開
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume()
            }
            
            // 無音を再生して音声許可を取得
            const oscillator = this.audioContext.createOscillator()
            const gainNode = this.audioContext.createGain()
            gainNode.gain.value = 0.0001 // ほぼ無音
            oscillator.connect(gainNode)
            gainNode.connect(this.audioContext.destination)
            oscillator.start()
            oscillator.stop(this.audioContext.currentTime + 0.1)
            
            this.isInitialized = true
            
            // スプラッシュ画面を非表示
            const splashScreen = document.getElementById('splash-screen')
            if (splashScreen) {
                splashScreen.classList.add('hidden')
                
                // アニメーション完了後に完全に削除
                setTimeout(() => {
                    splashScreen.style.display = 'none'
                }, 500)
            }
            
            // コールバックを実行
            if (this.onPermissionGranted) {
                this.onPermissionGranted()
            }
        } catch (error) {
            console.error('Failed to initialize audio context:', error)
        }
    }

    public getAudioContext(): AudioContext | null {
        return this.audioContext
    }

    public isAudioInitialized(): boolean {
        return this.isInitialized
    }
}