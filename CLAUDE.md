# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリでコードを扱う際のガイダンスを提供します。

## プロジェクト概要

Phaser 3 + Matter.js を使用した動物落下ゲームです。可愛い動物イラストが上から降ってきて床に積み重なり、クリックで音声が再生されるインタラクティブなWebアプリケーションです。iPhone Safari完全対応、QRコード生成機能付きサーバーでモバイルテストも簡単です。

## プロジェクト構造

```
/
├── index.html          # メインHTMLファイル（フルスクリーン対応、iPhone Safari対応）
├── index2.html         # 動物画像一覧表示ページ（デバッグ用）
├── js/
│   └── game.js        # メインゲームロジック（音声・クリック機能付き）
├── package.json       # 依存関係管理（Phaser 3.80.1含む）
├── package-lock.json  # npm lockファイル
├── server.js          # Node.js HTTPサーバー（QRコード生成機能付き）
├── start-server.sh    # サーバー起動スクリプト
├── illust/           # 透過処理済み動物画像（24種類）
├── voice/            # 動物音声ファイル（16種類のWAV）
├── org/              # 元画像ファイル（28枚）
├── dist/             # ビルド出力ディレクトリ
├── node_modules/     # npm依存関係
└── CLAUDE.md         # このファイル
```

## 開発コマンド

```bash
# 推奨: Node.jsサーバー起動（QRコード表示、ネットワークアクセス対応）
npm run serve
# または
npm run dev

# Pythonサーバー
npm run serve-python

# シェルスクリプト（QRコード生成付き）
./start-server.sh

# 本番ビルド
npm run build

# ブラウザで http://localhost:8000 にアクセス
# スマホは表示されるQRコードでアクセス
```

## 技術スタック

- **Phaser 3.80.1**: ゲームエンジン（CDN経由 + npm管理）
- **Matter.js**: 物理エンジン（Phaser組み込み）
- **Node.js**: 開発サーバー（QRコード生成、ネットワークアクセス対応）
- **Visual Viewport API**: iPhone Safari対応の画面サイズ取得
- **Web Audio API**: 音声再生（16種類の動物音声）
- **ImageMagick**: 画像処理（背景透過・クロップ）

## ゲーム機能

### 実装済み機能
- **フルスクリーン対応**: レスポンシブキャンバス（iPhone Safari完全対応）
- **24種類の動物スプライト**: ランダム生成（重複防止機能付き）
- **音声再生機能**: クリックで動物の鳴き声再生（16種類のWAVファイル）
- **クリックエフェクト**: 1.38倍拡大バウンドアニメーション
- **物理演算**: 重力・衝突・バウンス（パフォーマンス最適化済み）
- **床表示**: 茶色＋草装飾
- **削除アニメーション**: 0.4秒でスケール0＋透明度0.3フェードアウト
- **レスポンシブスケーリング**: 画面アスペクト比によるスプライトサイズ自動調整
- **画像ロードエラーハンドリング**: 欠損画像の自動スキップ
- **QRコード生成**: モバイルテスト用（start-server.sh、npm run serve）

### アニメーション詳細
- **落下**: 1.5秒間隔でランダム位置から生成
- **回転**: `-0.01～0.01`の微細な回転（大幅に減速）
- **重力**: 0.67（2/3に減速、自然な落下感）
- **削除**: 0.4秒かけてスケール0＋透明度0.3でフェードアウト
- **クリック**: 1.38倍拡大→元サイズの滑らかなバウンド

## 画像処理

### 元画像処理コマンド
```bash
# orgディレクトリの画像を透過処理してillustに移動
for file in org/*.png; do
  filename=$(basename "$file")
  magick "$file" -bordercolor white -border 1 -alpha set -channel rgba -fuzz 5% -fill none -draw "alpha 0,0 floodfill" +channel -shave 1x1 -trim +repage "illust/$filename"
done
```

### 利用可能な動物画像（24種類）
- baby-chiken-01, baby-chiken-02
- bird-01, butterfly-01, butterfly-02
- cat-01, cat-02, cat-03, cat-04, chiken-01
- cow-01, dog-01, dog-02, elephant-01
- fish-01, fish-02, fox-01, giraffe-01, gorilla-01
- lion-01, monkey-01, monkey-02, pig-02, turtle-01

### 音声ファイル（16種類、WAV形式）
- baby-chiken, bird, butterfly, cat, chiken, cow, dog, elephant
- fish, fox, giraffe, gorilla, lion, monkey, pig, turtle

### 動物と音声のマッピング
画像ファイル名から音声ファイル名へのマッピングテーブルで管理。複数の画像が同じ音声を共有（例：cat-01～04 → cat.wav）

## アーキテクチャ

### GameScene クラス
- `preload()`: 画像・音声アセットのロードとエラーハンドリング
- `create()`: 物理世界・床・UI要素・音声マッピングの初期化
- `spawnRandomAnimal()`: ランダム動物生成ロジック（重複防止付き）
- `removeAnimalWithAnimation()`: スムーズなスプライト削除
- `update()`: 画面外オブジェクトの自動削除
- `addClickHandler()`: スプライトクリック時の音声再生＋拡大エフェクト
- `handleResize()`: iPhone Safari対応のリサイズハンドリング

### 物理設定（最適化済み）
- 重力: `y = 0.67`（2/3に減速）
- バウンス: `0.3`
- 摩擦: `0.7`
- 回転速度: `-0.01～0.01`（大幅に減速）
- 境界: Visual Viewport APIで動的対応（iPhone Safari対応）

### レスポンシブ設計
- **デスクトップ**: スプライト横幅350px
- **モバイル縦**: スプライト横幅280px（アスペクト比 < 1.0）
- **モバイル横**: スプライト横幅350px（アスペクト比 >= 1.0）
- **Visual Viewport**: iPhone SafariのURL表示/非表示に動的対応

## デバッグ・テスト

### コンソールログ
- `✅ Loaded successfully: [画像名]` - 正常ロード
- `❌ Failed to load image: [画像名]` - ロードエラー  
- `❌ Missing texture: [画像名]` - テクスチャ欠損
- `🔊 Playing sound: [音声名]` - 音声再生
- `📱 Viewport changed: [幅x高さ]` - iPhone Safari画面変更

### 開発者ツール
- **ブラウザ**: F12 → Consoleで画像・音声ロード状況確認
- **index2.html**: 画像一覧とサイズ確認（デバッグ用）
- **QRコード**: `npm run serve`でモバイルテスト用QRコード生成

### モバイルテスト
1. `npm run serve` でサーバー起動
2. 表示されるQRコードをスマホで読み取り
3. iPhone Safari、Android Chrome両方で動作確認可能

## Git管理

ローカルリポジトリとして初期化済み。主要な変更はコミット履歴で追跡可能。

## 機能追加履歴

- **v1.0** (853899c): 象イラスト更新
- **v0.9** (be726a7): iPhone Safari対応（Visual Viewport API）
- **v0.8** (b8e9289): ビルド機能、.gitignore設定
- **v0.7** (d51571a): 画像ファイル更新、動物イラスト追加
- **v0.6** (a7fd0d7): 音声再生、クリックエフェクト実装

## 今後の拡張可能性

- **ゲーム要素**: スコア、タイマー、レベル制
- **エフェクト**: パーティクル、爆発、星エフェクト
- **設定**: 音量調整、物理パラメータ調整
- **ソーシャル**: スクリーンショット共有、ハイスコア
- **アクセシビリティ**: キーボード操作、音声ガイド