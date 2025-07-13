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
            
            // Trim the canvas to remove empty space around emoji
            const trimmedCanvas = this.trimCanvas(canvas)
            
            this.scene.textures.addCanvas(key, trimmedCanvas)
            console.log(`✅ Created trimmed emoji texture: ${key} (${emoji}) - ${trimmedCanvas.width}x${trimmedCanvas.height}`)
        }
    }

    private trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
        const ctx = canvas.getContext('2d')
        if (!ctx) return canvas

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const width = canvas.width
        const height = canvas.height

        let top = height, bottom = 0, left = width, right = 0

        // Find the bounding box of non-transparent pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3] // Alpha channel
                if (alpha > 0) {
                    top = Math.min(top, y)
                    bottom = Math.max(bottom, y)
                    left = Math.min(left, x)
                    right = Math.max(right, x)
                }
            }
        }

        // If no non-transparent pixels found, return original canvas
        if (top >= bottom || left >= right) {
            return canvas
        }

        // Add small padding to prevent cutting off emoji edges
        const padding = 8
        top = Math.max(0, top - padding)
        bottom = Math.min(height - 1, bottom + padding)
        left = Math.max(0, left - padding)
        right = Math.min(width - 1, right + padding)

        // Create trimmed canvas
        const trimmedWidth = right - left + 1
        const trimmedHeight = bottom - top + 1
        const trimmedCanvas = document.createElement('canvas')
        trimmedCanvas.width = trimmedWidth
        trimmedCanvas.height = trimmedHeight

        const trimmedCtx = trimmedCanvas.getContext('2d')
        if (trimmedCtx) {
            trimmedCtx.drawImage(
                canvas,
                left, top, trimmedWidth, trimmedHeight,
                0, 0, trimmedWidth, trimmedHeight
            )
        }

        return trimmedCanvas
    }

    createEmojiTextures(emojiMapping: EmojiMapping): void {
        Object.entries(emojiMapping).forEach(([key, emoji]) => {
            this.createEmojiTexture(key, emoji)
        })
    }
}