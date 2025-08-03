export class SoundManager {
    private scene: Phaser.Scene
    private audioMap: Record<string, string> = {}
    private audioContextResumed: boolean = false

    constructor(scene: Phaser.Scene) {
        this.scene = scene
    }

    public initialize(): void {
        // AudioPermissionManagerから音声許可状態を確認
        const audioPermissionManager = (window as any).audioPermissionManager
        if (audioPermissionManager && audioPermissionManager.isAudioInitialized()) {
            this.audioContextResumed = true
            console.log('✅ AudioContext already initialized via permission manager')
        } else {
            this.setupAudioContextHandler()
        }
    }

    private setupAudioContextHandler(): void {
        // シーンのinputが利用可能になってからセットアップ
        if (!this.scene.input) {
            console.warn('Scene input not available yet, deferring audio context setup')
            return
        }

        // ユーザージェスチャーでAudioContextを有効化
        const resumeAudioContext = () => {
            const soundManager = this.scene.sound as any
            if (!this.audioContextResumed && soundManager && soundManager.context) {
                soundManager.context.resume().then(() => {
                    this.audioContextResumed = true
                    console.log('✅ AudioContext resumed after user gesture')
                }).catch((error: any) => {
                    console.warn('Failed to resume AudioContext:', error)
                })
            }
        }

        // 画面タップ/クリックでAudioContextを再開
        this.scene.input.on('pointerdown', resumeAudioContext)
        
        // キーボード入力でも再開
        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown', resumeAudioContext)
        }
    }

    addAudioMappings(newMappings: Record<string, string>): void {
        Object.assign(this.audioMap, newMappings)
    }

    setAudioMap(audioMap: Record<string, string>): void {
        this.audioMap = audioMap
    }

    playAnimalSound(animalKey: string): boolean {
        return this.playAnimalSoundWithPitch(animalKey, 1.0)
    }

    playAnimalSoundWithPitch(animalKey: string, pitchMultiplier: number = 1.0): boolean {
        if (!this.checkAudioContext()) {
            return false
        }

        const audioKey = this.audioMap[animalKey]
        
        if (!audioKey) {
            console.warn(`No audio mapping found for: ${animalKey}`)
            return false
        }
        
        if (!this.scene.cache.audio.exists(audioKey)) {
            console.warn(`Audio file not found: ${audioKey}`)
            return false
        }
        
        try {
            const volume = Math.min(0.7, 0.5 + (pitchMultiplier - 1) * 0.3)
            const rate = Math.max(0.5, Math.min(2.0, pitchMultiplier))
            
            this.scene.sound.play(audioKey, { 
                volume: volume,
                rate: rate
            })
            console.log(`🔊 Playing sound: ${audioKey} for ${animalKey} (pitch: ${rate.toFixed(2)})`)
            return true
        } catch (error) {
            console.error(`Failed to play sound: ${audioKey}`, error)
            return false
        }
    }

    playGrowthSound(level: number): void {
        if (!this.checkAudioContext()) {
            return
        }

        const pitch = 1.0 + (level * 0.15)
        const volume = Math.min(0.8, 0.4 + (level * 0.1))
        
        // Use a generic growth sound effect or fallback to cat sound
        const audioKey = 'cat'
        if (this.scene.cache.audio.exists(audioKey)) {
            this.scene.sound.play(audioKey, {
                volume: volume,
                rate: pitch,
                duration: 200
            })
        }
    }

    playResetSound(): void {
        if (!this.checkAudioContext()) {
            return
        }

        // Use a special reset sound or modified animal sound
        const audioKey = 'bird'
        if (this.scene.cache.audio.exists(audioKey)) {
            this.scene.sound.play(audioKey, {
                volume: 0.6,
                rate: 0.7,
                duration: 300
            })
        }
    }

    playDropSound(): void {
        if (!this.checkAudioContext()) {
            return
        }

        const audioKey = 'drop'
        if (this.scene.cache.audio.exists(audioKey)) {
            this.scene.sound.play(audioKey, {
                volume: 0.4,
                rate: 1.0
            })
            console.log(`🔊 Playing drop sound effect`)
        } else {
            console.warn(`Drop sound effect not found: ${audioKey}`)
        }
    }

    private checkAudioContext(): boolean {
        const soundManager = this.scene.sound as any
        if (!soundManager || !soundManager.context) {
            console.warn('No audio context available')
            return false
        }

        if (soundManager.context.state === 'suspended') {
            console.warn('AudioContext is suspended. User gesture required.')
            return false
        }

        return true
    }
}