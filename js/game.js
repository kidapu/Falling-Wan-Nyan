class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.animalSprites = [];
        this.animalKeys = [];
        this.spawnTimer = null;
        this.gameWidth = 0;
        this.gameHeight = 0;
        this.lastSpawnedAnimal = null;
        
        // 画像名→音声名のマッピングテーブル
        this.audioMap = {
            'baby-chiken-01': 'baby-chiken',
            'baby-chiken-02': 'baby-chiken',
            'bird-01': 'bird',
            'butterfly-01': 'butterfly',
            'butterfly-02': 'butterfly',
            'cat-01': 'cat',
            'cat-02': 'cat',
            'cat-03': 'cat',
            'cat-04': 'cat',
            'chiken-01': 'chiken',
            'cow-01': 'cow',
            'dog-01': 'dog',
            'dog-02': 'dog',
            'elephant-01': 'elephant',
            'fish-01': 'fish', // 音声ファイルが存在しない場合はエラーハンドリング
            'fish-02': 'fish', // 音声ファイルが存在しない場合はエラーハンドリング
            'fox-01': 'fox',
            'giraffe-01': 'giraffe',
            'gorilla-01': 'gorilla',
            'lion-01': 'lion',
            'monkey-01': 'monkey',
            'monkey-02': 'monkey',
            'pig-02': 'pig',
            'turtle-01': 'turtle'
        };
    }

    preload() {
        // 動物画像をプリロード
        const animalImages = [
            'baby-chiken-01', 'baby-chiken-02', 'bird-01', 'butterfly-01', 'butterfly-02',
            'cat-01', 'cat-02', 'cat-03', 'cat-04', 'chiken-01',
            'cow-01', 'dog-01', 'dog-02', 'elephant-01',
            'fish-01', 'fish-02', 'fox-01', 'giraffe-01', 'gorilla-01',
            'lion-01', 'monkey-01', 'monkey-02', 'pig-02', 'turtle-01'
        ];

        // 各画像をロード
        animalImages.forEach(imageName => {
            this.load.image(imageName, `illust/${imageName}.png`);
            this.animalKeys.push(imageName);
        });

        // 音声ファイルをプリロード
        const audioFiles = [
            'baby-chiken', 'bird', 'butterfly', 'cat', 'chiken',
            'cow', 'dog', 'elephant', 'fish', 'fox', 'giraffe',
            'gorilla', 'lion', 'monkey', 'pig', 'turtle'
        ];
        
        audioFiles.forEach(audioName => {
            this.load.audio(audioName, `voice/${audioName}.wav`);
        });

        // ロード進行状況を表示
        this.load.on('progress', (progress) => {
            console.log(`Loading: ${Math.round(progress * 100)}%`);
        });

        // ロードエラーを監視
        this.load.on('loaderror', (file) => {
            console.warn(`❌ Failed to load image: ${file.key} (${file.src})`);
        });

        // ロード完了時に各画像と音声の状態をチェック
        this.load.on('complete', () => {
            console.log('✅ All loading attempts completed. Checking assets...');
            
            // 画像のチェック
            animalImages.forEach(imageName => {
                const texture = this.textures.get(imageName);
                if (!texture || texture.key === '__MISSING') {
                    console.warn(`❌ Missing texture: ${imageName}.png`);
                } else {
                    console.log(`✅ Loaded texture: ${imageName}.png`);
                }
            });
            
            // 音声のチェック
            audioFiles.forEach(audioName => {
                if (this.cache.audio.exists(audioName)) {
                    console.log(`✅ Loaded audio: ${audioName}.wav`);
                } else {
                    console.warn(`❌ Missing audio: ${audioName}.wav`);
                }
            });
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