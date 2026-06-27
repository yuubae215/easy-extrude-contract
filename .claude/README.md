# .claude/ — 設計・作業の核(プロジェクト配線版)

`claudekernelbundle.zip`(設計メンタルモデル一式)を、本リポジトリの `.claude/` 配下に
**プロジェクトスコープで配線**したもの。元バンドルの `INSTALL.md` は `~/.claude/` への
全プロジェクト共有配置を想定するが、ここでは本 repo に限って有効化している。

## 構成(三層)

| 配置 | 役割 | 起動 |
|---|---|---|
| `CLAUDE.md` | 不変核(方法・規律・レンズ・選択規則) | project memory として常時 load |
| `templates/` | 生成テンプレ(単一の源)。command が参照する | `/scaffold-project` から |
| `commands/scaffold-project.md` | プロジェクト・インスタンス(CLAUDE.md + 概念図)を生成 | `/scaffold-project` |
| `skills/adr/SKILL.md` | ADR(設計判断記録)作成 skill | 「ADR を書いて」等のプロンプト |
| `hooks/evidence-before-commit.sh` | §5 強制: テスト不通過なら `git commit` を中止 | PreToolUse(Bash)hook |
| `settings.json` | 上記 hook の配線(`$CLAUDE_PROJECT_DIR` 経由) | 自動 |

## 元バンドルからの差分(プロジェクト配線のための調整)

- `settings.json`: hook の command を `~/.claude/...` ではなく
  `"$CLAUDE_PROJECT_DIR/.claude/hooks/evidence-before-commit.sh"` に。
- `commands/scaffold-project.md`: 入力テンプレ参照を `~/.claude/templates/` →
  `.claude/templates/` に。
- `CLAUDE.md` / `hooks/*.sh` の配置コメントを project スコープに更新。
- 内容(規律・テンプレ本体・skill 様式)は元バンドルのまま。

## §5(証拠なき完了禁止)を完全に効かせるには

hook はテストコマンドを 1) `CLAUDE_TEST_CMD` → 2) `.claude/test-command`(先頭1行)
→ 3) 自動検出(npm/cargo/go/pytest/make)の順で解決する。本リポジトリは現状テスト
ランナーを持たないため hook は **fail-open**(警告のみ・ブロックしない)。スキーマ検証
などのチェックを入れたら、その単一の源として `.claude/test-command` に1行で書くと
`git commit` 時に強制される。`git commit --no-verify` で意図的にバイパス可能。
