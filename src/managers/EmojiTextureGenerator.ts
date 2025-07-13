export interface EmojiMapping {
    [key: string]: string
}

export class EmojiTextureGenerator {
    private scene: Phaser.Scene
    private textureSize: number

    constructor(scene: Phaser.Scene, textureSize: number = 384) {
        this.scene = scene
        this.textureSize = textureSize
    }

    createEmojiTexture(key: string, emoji: string): void {
        // Check if texture already exists to prevent duplicate creation
        if (this.scene.textures.exists(key)) {
            console.log(`⚠️ Texture "${key}" already exists, skipping creation`)
            return
        }

        const canvas = document.createElement('canvas')
        canvas.width = this.textureSize
        canvas.height = this.textureSize
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
            ctx.font = `${this.textureSize * 0.8}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(emoji, this.textureSize / 2, this.textureSize / 2)
            
            this.scene.textures.addCanvas(key, canvas)
            console.log(`✅ Created emoji texture: ${key} (${emoji})`)
        }
    }

    createEmojiTextures(emojiMapping: EmojiMapping): void {
        Object.entries(emojiMapping).forEach(([key, emoji]) => {
            this.createEmojiTexture(key, emoji)
        })
    }
}