#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');
const { minify } = require('html-minifier');

// distディレクトリをクリーンアップ
if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

console.log('🏗️  Building production files...');

// 1. JavaScriptファイルをMinify+難読化
console.log('📦 Minifying JavaScript...');
const gameJsContent = fs.readFileSync('js/game.js', 'utf8');
const minifiedJs = UglifyJS.minify(gameJsContent, {
    compress: {
        drop_console: true,     // console.logを削除
        drop_debugger: true,    // debuggerを削除
        dead_code: true,        // 未使用コードを削除
        unused: true           // 未使用変数を削除
    },
    mangle: {
        toplevel: true,        // トップレベル変数も難読化
        properties: false      // プロパティ名は保持（Phaserとの互換性）
    },
    output: {
        comments: false        // コメントを削除
    }
});

if (minifiedJs.error) {
    console.error('❌ JavaScript minification failed:', minifiedJs.error);
    process.exit(1);
}

// jsディレクトリを作成してMinified JSを保存
fs.mkdirSync('dist/js', { recursive: true });
fs.writeFileSync('dist/js/game.js', minifiedJs.code);
console.log(`✅ game.js: ${gameJsContent.length} → ${minifiedJs.code.length} bytes (${Math.round((1 - minifiedJs.code.length / gameJsContent.length) * 100)}% reduction)`);

// 2. HTMLファイルをMinify
console.log('📦 Minifying HTML...');

// index.html
const indexHtmlContent = fs.readFileSync('index.html', 'utf8');
const minifiedIndexHtml = minify(indexHtmlContent, {
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    collapseWhitespace: true
});
fs.writeFileSync('dist/index.html', minifiedIndexHtml);
console.log(`✅ index.html: ${indexHtmlContent.length} → ${minifiedIndexHtml.length} bytes (${Math.round((1 - minifiedIndexHtml.length / indexHtmlContent.length) * 100)}% reduction)`);

// index2.html
const index2HtmlContent = fs.readFileSync('index2.html', 'utf8');
const minifiedIndex2Html = minify(index2HtmlContent, {
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    collapseWhitespace: true
});
fs.writeFileSync('dist/index2.html', minifiedIndex2Html);
console.log(`✅ index2.html: ${index2HtmlContent.length} → ${minifiedIndex2Html.length} bytes (${Math.round((1 - minifiedIndex2Html.length / index2HtmlContent.length) * 100)}% reduction)`);

// 3. アセットファイルをコピー（画像・音声はMinify不要）
console.log('📁 Copying assets...');

// illustディレクトリ
if (fs.existsSync('illust')) {
    fs.cpSync('illust', 'dist/illust', { recursive: true });
    console.log('✅ Copied illust/ directory');
}

// voiceディレクトリ
if (fs.existsSync('voice')) {
    fs.cpSync('voice', 'dist/voice', { recursive: true });
    console.log('✅ Copied voice/ directory');
}

// サイズ統計を表示
function getDirectorySize(dirPath) {
    let totalSize = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
            totalSize += getDirectorySize(filePath);
        } else {
            totalSize += fs.statSync(filePath).size;
        }
    }
    return totalSize;
}

const originalSize = getDirectorySize('.');
const distSize = getDirectorySize('dist');

console.log('\n📊 Build Summary:');
console.log(`   Original size: ${(originalSize / 1024).toFixed(1)} KB`);
console.log(`   Built size: ${(distSize / 1024).toFixed(1)} KB`);
console.log(`   Reduction: ${Math.round((1 - distSize / originalSize) * 100)}%`);
console.log('\n🚀 Production build complete! Files are in dist/ directory');