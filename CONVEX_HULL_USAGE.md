# 凸包（Convex Hull）機能の使用方法

## 概要
Matter.js の Vertices.hull() を使用して、透過PNG画像のアルファチャンネルから自動的に凸包を生成し、より正確な物理境界を設定できます。

## 有効化方法

`src/scenes/GameScene.ts` の UnifiedSpawner 初期化部分で `useConvexHull: true` に設定：

```typescript
this.unifiedSpawner = new UnifiedSpawner(this, this.viewportManager, this.soundManager, this.growthManager, {
    useConvexHull: true,           // 凸包機能を有効化
    hullSamplingInterval: 5,       // サンプリング間隔（1-20、小さいほど精密）
    hullAlphaThreshold: 128,       // アルファ閾値（0-255）
    hullDebugDraw: false          // デバッグ描画を有効化
})
```

## 設定オプション

### useConvexHull (boolean)
- `true`: 凸包を使用した物理境界を生成
- `false`: 従来の矩形ボディを使用（デフォルト）

### hullSamplingInterval (number: 1-20)
- エッジ検出時のピクセル間隔
- 小さい値: より精密だがパフォーマンスコストが高い
- 大きい値: 処理が軽いが精度が低下
- 推奨値: 5-10

### hullAlphaThreshold (number: 0-255)
- 透明/不透明を判定するアルファ値の閾値
- 128: 半透明以上を不透明とみなす（デフォルト）
- 255に近い: より厳密な境界検出

### hullDebugDraw (boolean)
- `true`: 凸包の頂点と輪郭を可視化
- エッジ点: 緑色の点
- 凸包輪郭: 赤色の線
- 頂点: 青色の点

## 動作原理

1. **アルファチャンネル解析**
   - 画像の各ピクセルのアルファ値をチェック
   - 閾値以上かつ隣接に透明部分がある点をエッジとして検出

2. **凸包生成**
   - 検出したエッジ点から Matter.js の Vertices.hull() で凸包を計算
   - Douglas-Peucker アルゴリズムで頂点を簡略化

3. **キャッシュシステム**
   - 生成した凸包データをキャッシュして再利用
   - 同じテクスチャへの再計算を防止

## パフォーマンスへの影響

- 初回のテクスチャロード時に凸包計算のオーバーヘッドあり
- キャッシュにより2回目以降は高速
- 複雑な形状ほど頂点数が増え、物理演算のコストが上昇

## 制限事項

- 凸包なので凹んだ形状は表現できない
- 複雑な形状は単純化される
- 完全に透明な画像では凸包を生成できない

## デバッグ方法

1. `hullDebugDraw: true` に設定
2. ゲームを実行して凸包の形状を確認
3. `hullSamplingInterval` を調整して最適な値を見つける

## トラブルシューティング

### 凸包が生成されない場合
- コンソールでエラーメッセージを確認
- 画像が完全に透明でないか確認
- `hullAlphaThreshold` を下げてみる

### パフォーマンスが低下する場合
- `hullSamplingInterval` を大きくする
- 頂点数の多い複雑な画像を避ける
- 必要な画像のみ凸包を使用する（カテゴリごとに設定を分ける）