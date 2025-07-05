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
            this.scene.sound.play(audioKey, { volume: 0.7 })
            console.log(`🔊 Playing sound: ${audioKey} for ${animalKey}`)
            return true
        } catch (error) {
            console.error(`Failed to play sound: ${audioKey}`, error)
            return false
        }
    }
}