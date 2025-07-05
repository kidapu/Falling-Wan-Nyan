class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.animalSprites = [];
        this.animalKeys = [];
        this.spawnTimer = null;
        this.gameWidth = 0;
        this.gameHeight = 0;
        this.lastSpawnedAnimal = null;
        
        // カテゴリデータ（JSONから読み込み）
        this.categoryData = null;
        this.audioMap = {};
        this.assetPaths = {};
        this.fileExtensions = {};
    }

    preload() {
        // JSONデータをロード
        this.load.json('animals', 'data/animals.json');
        
        // JSONロード完了後に画像と音声をロード
        this.load.on('filecomplete-json-animals', () => {
            this.loadCategoryAssets();
        });

        // ロード進行状況を表示
        this.load.on('progress', (progress) => {
            console.log(`Loading: ${Math.round(progress * 100)}%`);
        });

        // ロードエラーを監視
        this.load.on('loaderror', (file) => {
            console.warn(`❌ Failed to load: ${file.key} (${file.src})`);
        });

        // ロード完了時に各画像と音声の状態をチェック
        this.load.on('complete', () => {
            this.validateAssets();
        });
    }
    
    loadCategoryAssets() {
        try {
            // JSONデータを取得
            this.categoryData = this.cache.json.get('animals');
            
            if (!this.categoryData) {
                console.error('❌ Failed to load category data');
                this.useFallbackData();
                return;
            }
            
            console.log(`✅ Loaded category: ${this.categoryData.displayName}`);
            
            // データを設定
            this.audioMap = this.categoryData.audioMap || {};
            this.assetPaths = this.categoryData.assetPaths || {};
            this.fileExtensions = this.categoryData.fileExtensions || {};
            
            // 画像をロード
            const imagePath = this.assetPaths.images || 'illust/';
            const imageExt = this.fileExtensions.images || '.png';
            
            this.categoryData.images.forEach(imageName => {
                this.load.image(imageName, `${imagePath}${imageName}${imageExt}`);
                this.animalKeys.push(imageName);
            });
            
            // 音声をロード
            const soundPath = this.assetPaths.sounds || 'voice/';
            const soundExt = this.fileExtensions.sounds || '.wav';
            
            this.categoryData.sounds.forEach(soundName => {
                this.load.audio(soundName, `${soundPath}${soundName}${soundExt}`);
            });
            
            // 新しいアセットのロードを開始
            this.load.start();
            
        } catch (error) {
            console.error('❌ Error loading category assets:', error);
            this.useFallbackData();
        }
    }
    
    useFallbackData() {
        console.warn('🔄 Using fallback data due to JSON load failure');
        
        // フォールバック用のハードコーディングデータ
        this.categoryData = {
            category: 'animals',
            displayName: '動物（フォールバック）',
            images: ['cat-01', 'dog-01', 'elephant-01'],
            sounds: ['cat', 'dog', 'elephant']
        };
        
        this.audioMap = {
            'cat-01': 'cat',
            'dog-01': 'dog',
            'elephant-01': 'elephant'
        };
        
        this.assetPaths = { images: 'illust/', sounds: 'voice/' };
        this.fileExtensions = { images: '.png', sounds: '.wav' };
        
        // フォールバック画像をロード
        this.categoryData.images.forEach(imageName => {
            this.load.image(imageName, `illust/${imageName}.png`);
            this.animalKeys.push(imageName);
        });
        
        // フォールバック音声をロード
        this.categoryData.sounds.forEach(soundName => {
            this.load.audio(soundName, `voice/${soundName}.wav`);
        });
        
        this.load.start();
    }
    
    validateAssets() {
        if (!this.categoryData) {
            console.error('❌ No category data available');
            return;
        }
        
        console.log('✅ All loading attempts completed. Checking assets...');
        
        // 画像のチェック
        this.categoryData.images.forEach(imageName => {
            const texture = this.textures.get(imageName);
            if (!texture || texture.key === '__MISSING') {
                console.warn(`❌ Missing texture: ${imageName}`);
            } else {
                console.log(`✅ Loaded texture: ${imageName}`);
            }
        });
        
        // 音声のチェック
        this.categoryData.sounds.forEach(soundName => {
            if (this.cache.audio.exists(soundName)) {
                console.log(`✅ Loaded audio: ${soundName}`);
            } else {
                console.warn(`❌ Missing audio: ${soundName}`);
            }
        });
    }

    create() {
        // 実際の表示領域を取得（iPhone Safari対応）
        this.gameWidth = this.scale.width;
        this.gameHeight = this.getViewportHeight();
        
        // Visual Viewport APIでリサイズ監視（iPhone Safari対応）
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleViewportChange();
            });
        }
        
        // ゲーム初期化を実行
        this.initializeGame();
    }
    
    getViewportHeight() {
        return window.visualViewport ? 
            window.visualViewport.height : 
            window.innerHeight;
    }
    
    handleViewportChange() {
        const newHeight = this.getViewportHeight();
        if (Math.abs(this.gameHeight - newHeight) > 10) { // 10px以上の変化で更新
            this.gameWidth = window.visualViewport.width;
            this.gameHeight = newHeight;
            this.scale.resize(this.gameWidth, this.gameHeight);
            this.updateFloorPosition();
        }
    }
    
    updateFloorPosition() {
        // 床の物理ボディを更新
        if (this.floor) {
            this.matter.world.remove(this.matter.world, this.floor);
        }
        this.floor = this.matter.add.rectangle(this.gameWidth / 2, this.gameHeight - 20, this.gameWidth, 40, {
            isStatic: true,
            render: {
                fillStyle: '#8B4513'
            }
        });
        
        // 床のグラフィックを更新
        if (this.floorGraphics) {
            this.floorGraphics.destroy();
        }
        this.floorGraphics = this.add.graphics();
        this.floorGraphics.fillStyle(0x8B4513);
        this.floorGraphics.fillRect(0, this.gameHeight - 40, this.gameWidth, 40);
        this.floorGraphics.fillStyle(0x228B22);
        this.floorGraphics.fillRect(0, this.gameHeight - 45, this.gameWidth, 5);
    }
    
    initializeGame() {
        
        // 物理世界の設定（画面サイズに合わせて）
        this.matter.world.setBounds(0, 0, this.gameWidth, this.gameHeight, 32, true, true, false, true);
        
        // 重力設定（現状の2/3に減速）
        this.matter.world.engine.world.gravity.y = 0.67;

        // 床の初期設定
        this.updateFloorPosition();

        // 背景色設定
        this.cameras.main.setBackgroundColor('#87CEEB');

        // スプライト生成タイマーを開始
        this.startAnimalSpawning();
    }

    startAnimalSpawning() {
        // 1.5秒間隔で動物を生成
        this.spawnTimer = this.time.addEvent({
            delay: 1500,
            callback: this.spawnRandomAnimal,
            callbackScope: this,
            loop: true
        });
    }

    spawnRandomAnimal() {
        // 前回と異なる動物を選択
        let randomKey;
        do {
            randomKey = Phaser.Utils.Array.GetRandom(this.animalKeys);
        } while (randomKey === this.lastSpawnedAnimal && this.animalKeys.length > 1);
        
        // 今回選ばれた動物を記録
        this.lastSpawnedAnimal = randomKey;
        
        // 画像が正常にロードされているかチェック
        const texture = this.textures.get(randomKey);
        if (!texture || texture.key === '__MISSING') {
            console.warn(`Texture not found for: ${randomKey}`);
            return; // 画像が見つからない場合はスプライトを作成しない
        }
        
        // 画面上部のランダムな位置（画面幅に合わせて）
        const x = Phaser.Math.Between(50, this.gameWidth - 50);

        // スプライトを作成
        const animal = this.matter.add.sprite(x, 0, randomKey);
        
        // スプライトが正常に作成されたかチェック
        if (!animal || !animal.texture || animal.texture.key === '__MISSING') {
            console.warn(`Failed to create sprite for: ${randomKey}`);
            if (animal) animal.destroy();
            return;
        }
        
        // 画面のアスペクト比に基づいてスプライトサイズを調整
        const aspectRatio = this.gameWidth / this.gameHeight;
        const minDimension = Math.min(this.gameWidth, this.gameHeight);

        let scale;
        if (aspectRatio > 1.2) {
            // 横長（PC）: 最大1.0、最小0.7
            scale = Math.min(1.0, Math.max(0.7, minDimension / 600));
        } else {
            // 縦長（モバイル）: 最大0.5、最小0.3
            scale = Math.min(0.7, Math.max(0.4, minDimension / 700));
        }
        
        animal.setScale(scale);

        // スプライトの下部が画面より上になるよう位置調整
        const spriteHeight = animal.height * scale;
        const y = -spriteHeight;
        animal.setPosition(x, y);

        // 物理プロパティ設定
        animal.setBody({
            type: 'rectangle',
            width: animal.width * scale,
            height: animal.height * scale
        });

        // バウンス（跳ね返り）を設定
        animal.setBounce(0.3);
        
        // 摩擦を設定
        animal.setFriction(0.7);

        // 初期速度を設定（現状の2/3に減速）
        animal.setVelocity(0, 0); // 初期速度を0にリセット
        
        // 少しの回転を追加（さらに減少して0.3倍）
        animal.setAngularVelocity(Phaser.Math.FloatBetween(-0.01, 0.01));

        // スプライトをインタラクティブにしてクリック/タップ可能にする
        animal.setInteractive();
        
        // クリック/タップイベントハンドラーを追加
        animal.on('pointerdown', () => {
            // フェード中のスプライトは反応しない
            if (animal.getData('removing')) {
                return;
            }
            this.playAnimalSound(randomKey, animal);
        });

        // スプライト配列に追加
        this.animalSprites.push(animal);

        // 画面外に出たスプライトを削除するためのチェック
        this.time.delayedCall(10000, () => {
            if (animal && animal.active) {
                this.removeAnimalWithAnimation(animal);
            }
        });
    }

    removeAnimalWithAnimation(animal) {
        // すでにアニメーション中でないかチェック
        if (animal.getData('removing')) {
            return;
        }
        
        // 削除フラグを設定
        animal.setData('removing', true);
        
        // 物理ボディの動きを停止（位置を固定）
        animal.setStatic(true);
        
        // スケールダウンアニメーション（ease out 0.4秒）
        this.tweens.add({
            targets: animal,
            scaleX: 0,
            scaleY: 0,
            alpha: 0.3,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // アニメーション完了後に削除
                const index = this.animalSprites.indexOf(animal);
                if (index > -1) {
                    this.animalSprites.splice(index, 1);
                }
                if (animal && animal.active) {
                    animal.destroy();
                }
            }
        });
    }

    playAnimalSound(animalKey, sprite) {
        // 画像名から音声ファイル名を取得
        const audioKey = this.audioMap[animalKey];
        
        if (!audioKey) {
            console.warn(`No audio mapping found for: ${animalKey}`);
            return;
        }
        
        // 音声ファイルがキャッシュされているかチェック
        if (!this.cache.audio.exists(audioKey)) {
            console.warn(`Audio file not found: ${audioKey}`);
            return;
        }
        
        // クリックエフェクトを表示
        this.showClickEffect(sprite);
        
        try {
            // 音声を再生（ボリューム0.7で適度な音量に調整）
            this.sound.play(audioKey, { volume: 0.7 });
            
            console.log(`🔊 Playing sound: ${audioKey} for ${animalKey}`);
        } catch (error) {
            console.error(`Failed to play sound: ${audioKey}`, error);
        }
    }

    showClickEffect(sprite) {
        // 現在のスケールを記録して相対的に拡大
        const originalScale = sprite.scaleX;
        const enlargeScale = originalScale * 1.38;
        
        this.tweens.add({
            targets: sprite,
            scaleX: enlargeScale,
            scaleY: enlargeScale,
            duration: 100,
            ease: 'Power2.easeOut',
            yoyo: true,
            onComplete: () => {
                // 元のスケールに確実に戻す
                sprite.setScale(originalScale);
            }
        });
    }

    update() {
        // 画面外に出たスプライトのみを削除（床より下に落ちた場合のみ）
        // 床の位置は this.gameHeight - 40 なので、それより下をチェック
        const floorY = this.gameHeight - 40;
        
        this.animalSprites = this.animalSprites.filter(sprite => {
            // 床より下に落ちた場合のみ削除アニメーション開始
            if (sprite.y > floorY + 200 && !sprite.getData('removing')) {
                this.removeAnimalWithAnimation(sprite);
            }
            return sprite.active;
        });
    }
}

// 実際の表示領域を取得する関数
function getInitialViewportHeight() {
    return window.visualViewport ? 
        window.visualViewport.height : 
        window.innerHeight;
}

// Phaser設定
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: getInitialViewportHeight(),
    parent: 'game-canvas',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: false, // デバッグモードOFF
            enableSleeping: false
        }
    },
    scene: GameScene
};

// ゲーム開始
const game = new Phaser.Game(config);