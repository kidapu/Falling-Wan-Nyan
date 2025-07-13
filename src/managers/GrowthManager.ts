export interface GrowthConfig {
    maxLevel: number
    growthMultiplier: number
    growthDuration: number
    resetDuration: number
    resetScale: number
    soundPitchStep: number
    removeOnMaxLevel: boolean // true: remove sprite, false: reset to base
}

export interface GrowthState {
    currentLevel: number
    maxLevel: number
    baseScale: number
    isGrowing: boolean
    isResetting: boolean
}

export class GrowthManager {
    private scene: Phaser.Scene
    private config: GrowthConfig

    constructor(scene: Phaser.Scene, config?: Partial<GrowthConfig>) {
        this.scene = scene
        this.config = {
            maxLevel: 7,
            growthMultiplier: 1.12,
            growthDuration: 200,
            resetDuration: 200,
            resetScale: 0.9,
            soundPitchStep: 0.08,
            removeOnMaxLevel: false, // default: reset behavior (animals)
            ...config
        }
    }

    initializeGrowthState(sprite: Phaser.Physics.Matter.Sprite, baseScale: number): GrowthState {
        const growthState: GrowthState = {
            currentLevel: 0,
            maxLevel: this.config.maxLevel,
            baseScale: baseScale,
            isGrowing: false,
            isResetting: false
        }
        
        sprite.setData('growthState', growthState)
        return growthState
    }

    canGrow(sprite: Phaser.Physics.Matter.Sprite): boolean {
        if (!sprite || !sprite.active || sprite.getData('removing')) {
            return false
        }
        
        const growthState = sprite.getData('growthState') as GrowthState
        return growthState && !growthState.isGrowing && !growthState.isResetting
    }

    growAnimal(sprite: Phaser.Physics.Matter.Sprite): Promise<boolean> {
        return new Promise((resolve) => {
            const growthState = sprite.getData('growthState') as GrowthState
            
            if (!this.canGrow(sprite)) {
                resolve(false)
                return
            }

            growthState.isGrowing = true
            
            if (growthState.currentLevel >= growthState.maxLevel) {
                if (this.config.removeOnMaxLevel) {
                    this.removeAnimal(sprite).then(() => {
                        resolve(true)
                    })
                } else {
                    this.resetAnimal(sprite).then(() => {
                        resolve(true)
                    })
                }
                return
            }

            growthState.currentLevel++
            const newScale = this.calculateScale(growthState)
            
            this.scene.tweens.add({
                targets: sprite,
                scaleX: newScale,
                scaleY: newScale,
                duration: this.config.growthDuration,
                ease: 'Back.easeOut',
                onComplete: () => {
                    if (sprite && sprite.active && !sprite.getData('removing')) {
                        growthState.isGrowing = false
                        this.updatePhysicsBody(sprite, newScale)
                        console.log(`🌱 Animal grown to level ${growthState.currentLevel}`)
                        resolve(true)
                    } else {
                        console.warn('⚠️ Sprite was removed during growth animation')
                        resolve(false)
                    }
                }
            })
        })
    }

    private resetAnimal(sprite: Phaser.Physics.Matter.Sprite): Promise<void> {
        return new Promise((resolve) => {
            const growthState = sprite.getData('growthState') as GrowthState
            growthState.isResetting = true

            const resetScale = growthState.baseScale * this.config.resetScale
            
            this.scene.tweens.add({
                targets: sprite,
                scaleX: resetScale,
                scaleY: resetScale,
                alpha: 0.7,
                duration: this.config.resetDuration,
                ease: 'Power2.easeIn',
                onComplete: () => {
                    if (sprite && sprite.active && !sprite.getData('removing')) {
                        sprite.setAlpha(1)
                        growthState.currentLevel = 0
                        growthState.isGrowing = false
                        growthState.isResetting = false
                        this.updatePhysicsBody(sprite, resetScale)
                        resolve()
                    } else {
                        console.warn('⚠️ Sprite was removed during reset animation')
                        resolve()
                    }
                }
            })
        })
    }

    private removeAnimal(sprite: Phaser.Physics.Matter.Sprite): Promise<void> {
        return new Promise((resolve) => {
            if (!sprite || !sprite.active) {
                resolve()
                return
            }
            
            const growthState = sprite.getData('growthState') as GrowthState
            if (growthState) {
                growthState.isResetting = true
            }
            
            sprite.setData('removing', true)
            
            try {
                sprite.setStatic(true)
            } catch (error) {
                console.warn('⚠️ Failed to set sprite static during removal:', error)
            }
            
            this.scene.tweens.add({
                targets: sprite,
                scaleX: 0,
                scaleY: 0,
                alpha: 0.3,
                duration: this.config.resetDuration,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    // Emit custom event for scene to handle sprite removal
                    this.scene.events.emit('sprite-removed', sprite)
                    
                    if (sprite && sprite.active) {
                        sprite.destroy()
                    }
                    resolve()
                }
            })
        })
    }


    private calculateScale(growthState: GrowthState): number {
        return growthState.baseScale * Math.pow(this.config.growthMultiplier, growthState.currentLevel)
    }

    private updatePhysicsBody(sprite: Phaser.Physics.Matter.Sprite, scale: number): void {
        if (!sprite || !sprite.active || !sprite.body || sprite.getData('removing')) {
            return
        }

        try {
            // Check if body is valid and has required properties
            if (!('velocity' in sprite.body) || !sprite.body.position) {
                console.warn('⚠️ Invalid physics body detected, skipping update')
                return
            }

            // Store current position and velocity
            const currentX = sprite.x
            const currentY = sprite.y
            const currentVelocityX = sprite.body.velocity.x
            const currentVelocityY = sprite.body.velocity.y
            const currentAngularVelocity = 'angularVelocity' in sprite.body ? sprite.body.angularVelocity : 0
            
            // Temporarily pause physics engine to prevent race conditions
            const world = sprite.body.world
            const wasRunning = world.enabled
            if (wasRunning) {
                world.enabled = false
            }
            
            // Update body size
            sprite.setBody({
                type: 'rectangle',
                width: sprite.width * scale,
                height: sprite.height * scale
            })
            
            // Re-enable physics engine
            if (wasRunning) {
                world.enabled = true
            }
            
            // Restore position and velocity after a small delay to ensure body is fully initialized
            sprite.scene.time.delayedCall(1, () => {
                if (sprite && sprite.active && sprite.body) {
                    sprite.setPosition(currentX, currentY)
                    sprite.setVelocity(currentVelocityX, currentVelocityY)
                    sprite.setAngularVelocity(currentAngularVelocity)
                }
            })
            
        } catch (error) {
            console.error('❌ Physics body update error:', error)
        }
    }

    getCurrentLevel(sprite: Phaser.Physics.Matter.Sprite): number {
        if (!sprite || !sprite.active || sprite.getData('removing')) {
            return 0
        }
        
        const growthState = sprite.getData('growthState') as GrowthState
        return growthState ? growthState.currentLevel : 0
    }

    getMaxLevel(): number {
        return this.config.maxLevel
    }

    getSoundPitchMultiplier(sprite: Phaser.Physics.Matter.Sprite): number {
        if (!sprite || !sprite.active || sprite.getData('removing')) {
            return 1.0 // Default pitch for invalid sprites
        }
        
        const level = this.getCurrentLevel(sprite)
        return 1 + (level * this.config.soundPitchStep)
    }

    updateConfig(newConfig: Partial<GrowthConfig>): void {
        this.config = { ...this.config, ...newConfig }
    }
}