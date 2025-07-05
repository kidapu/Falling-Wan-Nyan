export class SoundManager {
    private scene: Phaser.Scene
    private audioMap: Record<string, string> = {}

    constructor(scene: Phaser.Scene) {
        this.scene = scene
    }

    setAudioMap(audioMap: Record<string, string>): void {
        this.audioMap = audioMap
    }

    playAnimalSound(animalKey: string): boolean {
        return this.playAnimalSoundWithPitch(animalKey, 1.0)
    }

    playAnimalSoundWithPitch(animalKey: string, pitchMultiplier: number = 1.0): boolean {
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
}