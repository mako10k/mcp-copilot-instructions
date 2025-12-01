# GitHub Copilot Instructions とLLMエージェント安全性に関する調査レポート

**作成日**: 2025年12月1日

このドキュメントは、`.github/copilot-instructions.md`ファイルの仕様とベストプラクティス、およびLLMエージェントが安全かつ効率的に動作するための一般的な原則について調査した結果をまとめたものです。

---

## 1. GitHub Copilot Custom Instructions の仕様とベストプラクティス

### 1.1 概要

GitHub Copilotでは、`.github/copilot-instructions.md`ファイルをリポジトリのルートに配置することで、カスタム指示をCopilotに提供できます。これにより、プロジェクト固有のコーディング規約、アーキテクチャパターン、開発フローなどをCopilotに理解させることができます。

### 1.2 主要な参考資料

#### 公式ドキュメント

1. **Adding repository custom instructions for GitHub Copilot**
   - URL: https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
   - 内容: カスタム指示ファイルの作成方法、配置場所、基本的な記述方法について解説

2. **Best practices for using GitHub Copilot to work on tasks**
   - URL: https://docs.github.com/enterprise-cloud@latest/copilot/tutorials/coding-agent/get-the-best-results
   - 内容: 効果的な`copilot-instructions.md`ファイルの例、タスク実行時のベストプラクティス

3. **Use custom instructions in VS Code**
   - URL: https://code.visualstudio.com/docs/copilot/customization/custom-instructions
   - 内容: VS Code環境でのカスタム指示の使用方法、ワークスペース固有の設定

4. **Customize chat to your workflow**
   - URL: https://code.visualstudio.com/docs/copilot/customization/overview
   - 内容: チャット機能のカスタマイズ方法、コーディング標準や好みの設定方法

5. **Customize chat responses - Visual Studio**
   - URL: https://learn.microsoft.com/en-us/visualstudio/ide/copilot-chat-context
   - 内容: Visual Studioでのカスタム指示の使用、`.instructions`ファイルの活用

### 1.3 コミュニティのベストプラクティス

#### 主要な記事とディスカッション

6. **5 tips for writing better custom instructions for Copilot**
   - URL: https://github.blog/ai-and-ml/github-copilot/5-tips-for-writing-better-custom-instructions-for-copilot/
   - 主な内容:
     - 確立されたプラクティスが守られるようにする
     - Bashコマンドとビルドエラーを最小限に抑える
     - 明確で具体的な指示を書く

7. **Mastering GitHub Copilot Custom Instructions**
   - URL: https://medium.com/@anil.goyal0057/mastering-github-copilot-custom-instructions-with-github-copilot-instructions-md-f353e5abf2b1
   - 主な内容:
     - ルールを読みやすく保つ（CopilotはYAMLやJSON形式のルールエクスポートを解析しない）
     - 優先順位をつける
     - プロジェクト固有のパターンを明確にする

8. **Save Hours By Giving GitHub Copilot Custom Instructions**
   - URL: https://byrayray.medium.com/save-hours-by-giving-github-copilot-custom-instructions-for-code-and-commit-generation-229495a15af8
   - 主な内容:
     - 時間の経過とともに学んだベストプラクティス
     - コードとコミット生成のための効果的な指示の書き方

9. **Reddit: copilot-instructions.md has helped me so much**
   - URL: https://www.reddit.com/r/ChatGPTCoding/comments/1jl6gll/copilotinstructionsmd_has_helped_me_so_much/
   - 主な内容:
     - 実践的なガイドラインの例
     - プロジェクト構造の文書化
     - 運用上のガイドラインの設定

10. **Guidance on efficient use of copilot-instructions.md**
    - URL: https://www.reddit.com/r/GithubCopilot/comments/1lfz0wt/guidance_on_efficient_use_of_copilotinstructionsmd/
    - 主な内容:
      - カスタムフロントエンドライブラリやデザインシステムでの効率的な使用方法
      - 再利用可能なコンポーネントとユーティリティの管理

### 1.4 重要なポイントと推奨事項

#### ファイル配置
- `.github/copilot-instructions.md`をリポジトリのルートに配置
- プロジェクト固有の指示は追加の`.instructions`ファイルで管理可能

#### 記述のベストプラクティス
1. **明確性**: 指示は明確で具体的に記述する
2. **構造化**: マークダウン形式で階層的に整理する
3. **優先順位**: 重要なルールから順に記述する
4. **可読性**: 人間が読みやすい形式を維持する（YAML/JSON は避ける）
5. **コンテキスト**: プロジェクトのアーキテクチャやパターンを説明する
6. **テスト規約**: テストファイルの命名規則（例: `*.spec.ts`）を明記する

#### 含めるべき内容
- コーディング規約とスタイルガイド
- プロジェクト構造の説明
- 使用するフレームワークとライブラリ
- 命名規則
- テストの方針
- セキュリティとパフォーマンスのガイドライン
- ドキュメント作成の方針

---

## 2. LLMエージェントの安全性と効率性に関する一般原則

### 2.1 概要

LLMエージェントが「道を失わず」ユーザーの指示を確実に守りながら、安全かつ効率的に開発を進めるためには、複数のレイヤーでの対策が必要です。以下は、業界で認識されているベストプラクティスと一般原則です。

### 2.2 ハルシネーション（幻覚）対策

#### 主要な参考資料

11. **Best Practices for Mitigating Hallucinations in LLMs (Microsoft)**
    - URL: https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/best-practices-for-mitigating-hallucinations-in-large-language-models-llms/4403129
    - 対象者: 開発者、アーキテクト、エンタープライズ環境でLLMを扱うMLOpsチーム
    - 主要な対策:
      - コンテキストの適切な提供
      - 検証可能な情報源の使用
      - 出力の検証メカニズム

12. **Reducing hallucinations with custom intervention (AWS)**
    - URL: https://aws.amazon.com/blogs/machine-learning/reducing-hallucinations-in-large-language-models-with-custom-intervention-using-amazon-bedrock-agents/
    - 主な内容:
      - Amazon Bedrock Agentsを使用したカスタム介入
      - スケーラブルでカスタマイズ可能なハルシネーション緩和策

13. **What Are AI Hallucinations? (IBM)**
    - URL: https://www.ibm.com/think/topics/ai-hallucinations
    - 主な内容:
      - ハルシネーションの定義と原因
      - 削減方法の概要

14. **What are AI hallucinations? (Google Cloud)**
    - URL: https://cloud.google.com/discover/what-are-ai-hallucinations
    - 主な対策:
      - 可能な出力を制限する
      - 高品質なトレーニングデータの使用
      - 人間によるレビューの組み込み

### 2.3 ガードレールとアライメント

#### 主要な参考資料

15. **Building Safe AI: Understanding Agent Guardrails**
    - URL: https://dev.to/satyam_chourasiya_99ea2e4/building-safe-ai-understanding-agent-guardrails-and-the-power-of-prompt-engineering-29d2
    - 主な内容:
      - ユーザーの意図がリスクまたは範囲外かどうかを判断
      - 拒否戦略の実装
      - プロンプトエンジニアリングの力

16. **Safeguarding LLMs with Guardrails (Medium/TDS)**
    - URL: https://medium.com/data-science/safeguarding-llms-with-guardrails-4f5d9f57cff2
    - 主な内容:
      - 正規のユーザー意図を作成するようLLMに求めるプロンプト
      - ガードレールの実装パターン

17. **What are AI guardrails? (McKinsey)**
    - URL: https://www.mckinsey.com/featured-insights/mckinsey-explainers/what-are-ai-guardrails
    - 主な内容:
      - ユースケース別のガードレール
      - アライメントガードレール: 生成されたコンテンツがユーザーの期待と一致することを保証

18. **Securing AI Agents with Layered Guardrails**
    - URL: https://www.enkryptai.com/blog/securing-ai-agents-a-comprehensive-framework-for-agent-guardrails
    - 主な内容:
      - 入力ガードレール: LLMに到達する前にすべてのユーザーリクエストをスクリーニング
      - 多層防御アプローチ

19. **The landscape of LLM guardrails**
    - URL: https://www.ml6.eu/en/blog/the-landscape-of-llm-guardrails-intervention-levels-and-techniques
    - 主な内容:
      - 介入レベルとテクニック
      - プロンプトエンジニアリングとchain-of-thought
      - ガードレールが必要な理由

### 2.4 セキュリティとリスク管理

#### 主要な参考資料

20. **Safeguarding Large Language Models: A Survey (arXiv)**
    - URL: https://arxiv.org/html/2406.02622v1
    - 内容: LLMの保護に関する包括的な調査

21. **Security planning for LLM-based applications (Microsoft Learn)**
    - URL: https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/generative-ai/mlops-in-openai/security/security-plan-llm-application
    - 主な内容:
      - LLMを使用する際のセキュリティリスク評価のベストプラクティス
      - セキュリティ計画の立案

22. **OWASP Top 10 for LLM Applications 2025**
    - URL: https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf
    - 主な内容:
      - LLMアプリケーションにおける上位10のリスク
      - セキュリティ設定ミスのベストプラクティスに従う
      - 過度なエージェンシー（Excessive Agency）の防止

23. **OWASP Top 10 for LLMs: Risks & Mitigations**
    - URL: https://strobes.co/blog/owasp-top-10-risk-mitigations-for-llms-and-gen-ai-apps-2025/
    - 主な内容:
      - 2025年のリスクと緩和戦略
      - セキュリティ設定ミスのベストプラクティス

### 2.5 プロンプトエンジニアリングとインテント理解

24. **LLM Security 101: Guardrails, Alignment, and Hidden Risks**
    - URL: https://hiddenlayer.com/innovation-hub/llm-security-101-the-hidden-risks-of-genai/
    - 主な内容:
      - 内部推論の分析
      - プロンプトの意図分析

25. **What Is Prompt Engineering? A Comprehensive Guide**
    - URL: https://www.getmaxim.ai/articles/what-is-prompt-engineering-a-comprehensive-guide-for-modern-ai-teams/
    - 主な内容:
      - ユーザーの意図とビジネス要件に合わせる
      - 現代のAIチームにおけるプロンプトエンジニアリング

---

## 3. MCPサーバー設計への応用

### 3.1 設計原則

`.github/copilot-instructions.md`をメンテナンスするMCPサーバーを設計する際は、以下の原則を考慮すべきです:

#### 1. **コンテキスト維持**
- プロジェクトの現在の状態を継続的に追跡
- コーディング規約の変更を検出
- 新しいパターンやライブラリの導入を認識

#### 2. **段階的な更新**
- 大きな変更を一度に行わず、段階的に適用
- 変更履歴を記録し、ロールバック可能にする
- チームメンバーへの通知機能

#### 3. **検証メカニズム**
- 指示の有効性を定期的に検証
- Copilotの出力品質をモニタリング
- フィードバックループの実装

#### 4. **安全性の確保**
- 機密情報の漏洩防止
- 不適切な指示の自動検出
- 承認プロセスの組み込み

#### 5. **効率性の最適化**
- 冗長な指示の削減
- 優先度の高い指示の強調
- トークン使用量の最適化

### 3.2 実装すべき機能

1. **自動監視**
   - コードベースの変更を監視
   - 新しいパターンの出現を検出
   - チーム規約の遵守状況をチェック

2. **インテリジェント更新**
   - 変更に基づいて指示を自動提案
   - コンテキストに応じた優先順位付け
   - 重複や矛盾の検出と解決

3. **品質保証**
   - 指示の明確性チェック
   - 文法とフォーマットの検証
   - 効果測定メトリクスの収集

4. **コラボレーション支援**
   - チームメンバーへの変更通知
   - レビューとフィードバックのワークフロー
   - バージョン管理との統合

### 3.3 避けるべき落とし穴

1. **過度な指示**
   - 指示が長すぎるとCopilotの性能が低下
   - 本質的でない詳細は省略する

2. **曖昧な表現**
   - 解釈の余地がある指示は避ける
   - 具体的な例を含める

3. **矛盾する指示**
   - 定期的に一貫性をチェック
   - 優先順位を明確にする

4. **古い情報**
   - 定期的な更新スケジュールを設定
   - 非推奨となった内容の削除

---

## 4. まとめ

### 4.1 重要なポイント

1. **明確性と具体性**: 指示は明確で具体的、かつ実行可能であるべき
2. **段階的アプローチ**: 大きな変更は段階的に適用し、検証する
3. **継続的改善**: フィードバックループを確立し、継続的に改善する
4. **安全性優先**: セキュリティとプライバシーを常に考慮する
5. **チーム連携**: チーム全体でコンテキストを共有し、協力する

### 4.2 次のステップ

MCPサーバーの実装において、以下を優先的に検討することを推奨します:

1. **基盤の確立**: 基本的な監視と更新機能の実装
2. **検証の自動化**: 指示の品質チェックとテストの自動化
3. **フィードバック収集**: Copilotの効果測定とユーザーフィードバックの収集
4. **継続的改善**: データに基づく継続的な改善サイクルの確立

---

**参考文献**: 本ドキュメントで引用したすべてのURLは2025年12月1日時点で有効です。
