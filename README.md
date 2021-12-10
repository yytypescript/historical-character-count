# historical-character-count

サバイバルTypeScriptの文字数の歴史的遷移をGitのコミットログから抽出するツールです。

## Requirements

- Node v14
- CLIツール
  - git 2.34.1
  - find

## Usage

このリポジトリをcloneします。

パッケージをインストールします。

```sh
pnpm install
```

JavaScriptをビルドします。

```sh
pnpm build
```

処理を実行します。(5分以上かかります)

```sh
pnpm start
```

実行が終わると、stats.csvとstats.jsonが生成されます。
