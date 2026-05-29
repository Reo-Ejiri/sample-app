# Architecture

このアプリは、バグが出た場所を追いやすいように役割を分けています。

## ファイルの役割

- `index.html`: 画面の骨組み
- `style.css`: 見た目、レイアウト、色
- `calculator.js`: 点数計算、オカ、供託、ゼロサム判定
- `script.js`: 画面操作、保存、履歴編集、カレンダー、ルール設定

## 修正するときの目安

- ポイント計算が違う: `calculator.js`
- 点数合計やゼロサム判定が違う: `calculator.js`
- ボタン、入力欄、履歴編集の動きが違う: `script.js`
- 文字や画面の配置が違う: `index.html`
- デザインを変えたい: `style.css`

## 計算まわり

`calculator.js` は画面を直接触らない純粋な計算用ファイルです。

主な関数:

- `calculateResults`: 最終持ち点から順位とポイントを計算
- `automaticOka`: 配給原点と返し点からオカを計算
- `expectedScoreTotal`: 供託を考慮した持ち点合計の基準を計算
- `gameTotals`: 持ち点合計とポイント合計の検査に使う値を返す

この構成にしておくと、点数計算のミスは基本的に `calculator.js` だけを見れば直せます。
