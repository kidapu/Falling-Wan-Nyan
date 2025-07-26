import Phaser from 'phaser'

export interface ConvexHullOptions {
    samplingInterval?: number      // ピクセル間隔（デフォルト: 5）
    alphaThreshold?: number        // アルファ閾値（デフォルト: 128）
    simplifyTolerance?: number     // 簡略化の許容値（デフォルト: 2）
    debugDraw?: boolean           // デバッグ描画フラグ
}

export interface CachedHullData {
    vertices: MatterJS.Vector[]
    timestamp: number
}

export class ConvexHullGenerator {
    private scene: Phaser.Scene
    private cache: Map<string, CachedHullData> = new Map()
    private debugGraphics: Phaser.GameObjects.Graphics | null = null

    constructor(scene: Phaser.Scene) {
        this.scene = scene
    }

    generateVerticesFromTexture(
        textureKey: string, 
        options: ConvexHullOptions = {}
    ): MatterJS.Vector[] | null {
        const {
            samplingInterval = 5,
            alphaThreshold = 128,
            simplifyTolerance = 2,
            debugDraw = false
        } = options

        // キャッシュチェック
        const cacheKey = `${textureKey}_${samplingInterval}_${alphaThreshold}`
        const cached = this.cache.get(cacheKey)
        if (cached) {
            console.log(`✅ Using cached hull for: ${textureKey}`)
            return cached.vertices
        }

        // テクスチャ取得
        const texture = this.scene.textures.get(textureKey)
        if (!texture) {
            console.error(`❌ Texture not found: ${textureKey}`)
            return null
        }

        // ソースイメージ取得
        const sourceImage = texture.getSourceImage()
        if (!(sourceImage instanceof HTMLImageElement)) {
            console.error(`❌ Invalid source image for: ${textureKey}`)
            return null
        }

        // Canvas作成してイメージデータ取得
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) {
            console.error('❌ Failed to create canvas context')
            return null
        }

        canvas.width = sourceImage.width
        canvas.height = sourceImage.height
        context.drawImage(sourceImage, 0, 0)

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // エッジ点を検出
        const edgePoints: MatterJS.Vector[] = []
        
        // 画像の境界をスキャン（サンプリング間隔で間引き）
        for (let y = 0; y < canvas.height; y += samplingInterval) {
            for (let x = 0; x < canvas.width; x += samplingInterval) {
                const index = (y * canvas.width + x) * 4
                const alpha = data[index + 3]

                // アルファ値が閾値以上かつ、隣接ピクセルに透明部分がある場合はエッジ
                if (alpha >= alphaThreshold && this.isEdgePixel(data, x, y, canvas.width, canvas.height, alphaThreshold)) {
                    edgePoints.push({ x, y })
                }
            }
        }

        if (edgePoints.length === 0) {
            console.warn(`⚠️ No edge points found for: ${textureKey}`)
            return null
        }

        // Matter.js Vertices.hull()で凸包を計算
        const hull = (this.scene.matter as any).vertices.hull(edgePoints)

        // 頂点を簡略化（オプション）
        let simplifiedHull = hull
        if (simplifyTolerance > 0) {
            simplifiedHull = this.simplifyVertices(hull, simplifyTolerance)
        }

        // 中心点でオフセット調整
        const centroid = this.calculateCentroid(simplifiedHull)
        const centeredVertices = simplifiedHull.map((v: any) => ({
            x: v.x - centroid.x,
            y: v.y - centroid.y
        }))

        // キャッシュに保存
        this.cache.set(cacheKey, {
            vertices: centeredVertices,
            timestamp: Date.now()
        })

        // デバッグ描画
        if (debugDraw) {
            this.drawDebugHull(simplifiedHull, edgePoints)
        }

        console.log(`✅ Generated hull for ${textureKey}: ${centeredVertices.length} vertices`)
        return centeredVertices
    }

    private isEdgePixel(
        data: Uint8ClampedArray, 
        x: number, 
        y: number, 
        width: number, 
        height: number,
        threshold: number
    ): boolean {
        // 8方向の隣接ピクセルをチェック
        const directions = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ]

        for (const [dx, dy] of directions) {
            const nx = x + dx
            const ny = y + dy

            // 境界チェック
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                return true // 画像の端はエッジ
            }

            const index = (ny * width + nx) * 4
            const alpha = data[index + 3]

            if (alpha < threshold) {
                return true // 透明な隣接ピクセルがある
            }
        }

        return false
    }

    private calculateCentroid(vertices: MatterJS.Vector[]): MatterJS.Vector {
        let sumX = 0
        let sumY = 0
        
        for (const v of vertices) {
            sumX += v.x
            sumY += v.y
        }

        return {
            x: sumX / vertices.length,
            y: sumY / vertices.length
        }
    }

    private simplifyVertices(vertices: MatterJS.Vector[], tolerance: number): MatterJS.Vector[] {
        if (vertices.length <= 3) return vertices

        // Douglas-Peucker algorithm
        let maxDistance = 0
        let maxIndex = 0

        // 最初と最後の点を結ぶ線分から最も遠い点を探す
        for (let i = 1; i < vertices.length - 1; i++) {
            const distance = this.perpendicularDistance(
                vertices[i], 
                vertices[0], 
                vertices[vertices.length - 1]
            )
            
            if (distance > maxDistance) {
                maxDistance = distance
                maxIndex = i
            }
        }

        // 許容値より大きい場合は再帰的に簡略化
        if (maxDistance > tolerance) {
            const left = this.simplifyVertices(vertices.slice(0, maxIndex + 1), tolerance)
            const right = this.simplifyVertices(vertices.slice(maxIndex), tolerance)
            
            return left.slice(0, -1).concat(right)
        } else {
            return [vertices[0], vertices[vertices.length - 1]]
        }
    }

    private perpendicularDistance(
        point: MatterJS.Vector, 
        lineStart: MatterJS.Vector, 
        lineEnd: MatterJS.Vector
    ): number {
        const dx = lineEnd.x - lineStart.x
        const dy = lineEnd.y - lineStart.y
        
        if (dx === 0 && dy === 0) {
            return Math.sqrt(
                Math.pow(point.x - lineStart.x, 2) + 
                Math.pow(point.y - lineStart.y, 2)
            )
        }

        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / 
                  (dx * dx + dy * dy)
        
        const closestPoint = {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        }

        return Math.sqrt(
            Math.pow(point.x - closestPoint.x, 2) + 
            Math.pow(point.y - closestPoint.y, 2)
        )
    }

    private drawDebugHull(hull: MatterJS.Vector[], edgePoints: MatterJS.Vector[]): void {
        if (!this.debugGraphics) {
            this.debugGraphics = this.scene.add.graphics()
        }

        this.debugGraphics!.clear()

        // エッジ点を描画（緑）
        this.debugGraphics!.fillStyle(0x00ff00, 0.5)
        edgePoints.forEach(point => {
            this.debugGraphics!.fillCircle(point.x, point.y, 2)
        })

        // 凸包の輪郭を描画（赤）
        this.debugGraphics!.lineStyle(2, 0xff0000, 1)
        this.debugGraphics!.beginPath()
        this.debugGraphics!.moveTo(hull[0].x, hull[0].y)
        
        for (let i = 1; i < hull.length; i++) {
            this.debugGraphics!.lineTo(hull[i].x, hull[i].y)
        }
        
        this.debugGraphics!.closePath()
        this.debugGraphics!.strokePath()

        // 頂点を描画（青）- 1.5倍のサイズ
        this.debugGraphics!.fillStyle(0x0000ff, 1)
        hull.forEach(vertex => {
            this.debugGraphics!.fillCircle(vertex.x, vertex.y, 6) // 4から6に変更（1.5倍）
        })
    }

    clearCache(): void {
        this.cache.clear()
        console.log('🗑️ Hull cache cleared')
    }

    clearDebugGraphics(): void {
        if (this.debugGraphics) {
            this.debugGraphics.destroy()
            this.debugGraphics = null
        }
    }
}