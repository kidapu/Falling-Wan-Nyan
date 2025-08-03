/**
 * ルビ記法をHTMLに変換するユーティリティ
 * 
 * 使用例:
 * parseRuby("この動物（どうぶつ）はなに？") => "この<ruby>動物<rt>どうぶつ</rt></ruby>はなに？"
 * parseRuby("果物（くだもの）のなまえは？") => "<ruby>果物<rt>くだもの</rt></ruby>のなまえは？"
 */
export function parseRuby(text: string): string {
    // 漢字（ひらがな）の形式を検出してHTMLのrubyタグに変換
    // パターン: 1文字以上の漢字 + （ + ひらがな・カタカナ + ）
    const rubyPattern = /([\u4E00-\u9FAF]+)（([ぁ-んァ-ヶー]+)）/g
    
    return text.replace(rubyPattern, '<ruby>$1<rt>$2</rt></ruby>')
}

/**
 * HTMLを含むテキストを安全にDOM要素に設定
 */
export function setHtmlContent(element: HTMLElement, htmlContent: string): void {
    element.innerHTML = htmlContent
}