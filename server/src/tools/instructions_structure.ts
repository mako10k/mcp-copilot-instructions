import {
  readInstructionsSections,
  updateSection,
  detectConflictMarkers,
  resolveConflict,
  deleteSection,
  insertSection,
} from '../utils/markdownAst';
import { readInstructionsFileWithState } from '../utils/fileSystem';
import { withLock } from '../utils/lockManager';
import { isRestrictedMode } from '../utils/onboardingStatusManager';

interface ReadStructureArgs {
  action: 'read';
  includeGitInfo?: boolean;
}

interface UpdateStructureArgs {
  action: 'update';
  heading: string;
  content: string;
}

interface DetectConflictsArgs {
  action: 'detect-conflicts';
}

interface ResolveConflictArgs {
  action: 'resolve-conflict';
  heading: string;
  resolution: 'use-head' | 'use-mcp' | 'manual';
  manualContent?: string;
}

interface DeleteStructureArgs {
  action: 'delete';
  heading: string;
}

interface InsertStructureArgs {
  action: 'insert';
  heading: string;
  content: string;
  position: 'before' | 'after' | 'first' | 'last';
  anchor?: string;
}

type InstructionsStructureArgs =
  | ReadStructureArgs
  | UpdateStructureArgs
  | DetectConflictsArgs
  | ResolveConflictArgs
  | DeleteStructureArgs
  | InsertStructureArgs;

export async function instructionsStructure(args: InstructionsStructureArgs) {
  // 機能制限モードのチェック（read と detect-conflicts は許可）
  if (args.action !== 'read' && args.action !== 'detect-conflicts') {
    const restricted = await isRestrictedMode();
    if (restricted) {
      return '❌ 機能制限モード: このアクションは利用できません。\n\n' +
             'オンボーディングを完了するか、読み取り専用モードで使用してください。\n\n' +
             '【詳細確認】\n' +
             'onboarding({ action: "status" })\n\n' +
             '【オンボーディング】\n' +
             'onboarding({ action: "analyze" })';
    }
  }
  
  switch (args.action) {
    case 'read': {
      const sections = await readInstructionsSections();
      if (sections.length === 0) {
        return '指示書が存在しないか、セクションがありません。';
      }
      
      let result = '';
      
      // Git情報を含める場合
      if (args.includeGitInfo) {
        const fileState = await readInstructionsFileWithState();
        if (fileState) {
          result += '📊 ファイル状態:\n';
          result += `  • SHA-256: ${fileState.state.hash.substring(0, 16)}...\n`;
          result += `  • サイズ: ${fileState.content.length} bytes\n`;
          
          if (fileState.state.isGitManaged) {
            result += `  • Git管理: ✓\n`;
            result += `  • コミット: ${fileState.state.gitCommit?.substring(0, 8)}...\n`;
            result += `  • ステータス: ${fileState.state.gitStatus}\n`;
            
            if (fileState.state.gitStatus === 'modified') {
              result += `  ⚠️ 未コミットの変更があります\n`;
            }
          } else {
            result += `  • Git管理: ✗\n`;
          }
          result += '\n';
        }
      }
      
      const summary = sections
        .map(
          (s, i) =>
            `${i + 1}. ${'#'.repeat(s.level)} ${s.heading} (${s.content.length}文字)`
        )
        .join('\n');
      result += `指示書のセクション構造（全${sections.length}セクション）:\n\n${summary}`;
      
      return result;
    }

    case 'update': {
      try {
        // 排他制御を使用してセクション更新
        const result = await withLock(async () => {
          return await updateSection(args.heading, args.content);
        });

        if (result.autoMerged) {
          return `✓ セクション「${args.heading}」を更新しました（他セクションの変更を自動マージ）。`;
        }

        if (!result.success && result.conflict) {
          return `⚠️ ${result.conflict}`;
        }

        return `セクション「${args.heading}」を更新しました。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        
        // ロック取得失敗の場合は分かりやすいメッセージ
        if (message.includes('Failed to acquire lock')) {
          return `❌ ロック取得タイムアウト: 他のセッションが指示書を更新中です。しばらく待ってから再試行してください。`;
        }
        
        return `エラー: ${message}`;
      }
    }

    case 'detect-conflicts': {
      try {
        const conflicts = await detectConflictMarkers();
        if (conflicts.length === 0) {
          return '競合はありません。';
        }

        const conflictList = conflicts
          .map((c, i) => `${i + 1}. セクション: ${c.heading}`)
          .join('\n');

        return `${conflicts.length}件の競合を検出しました:\n\n${conflictList}\n\n` +
          `解決するには action='resolve-conflict' を使用してください。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `エラー: ${message}`;
      }
    }

    case 'resolve-conflict': {
      try {
        // 排他制御を使用して競合解決
        const result = await withLock(async () => {
          return await resolveConflict(
            args.heading,
            args.resolution,
            args.manualContent
          );
        });

        if (!result.success) {
          return `エラー: ${result.error}`;
        }

        const resolutionMsg =
          args.resolution === 'use-head'
            ? '外部変更を採用'
            : args.resolution === 'use-mcp'
            ? 'Copilot変更を採用'
            : '手動統合';

        return `✓ セクション「${args.heading}」の競合を解決しました（${resolutionMsg}）。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `エラー: ${message}`;
      }
    }

    case 'delete': {
      try {
        // 排他制御を使用してセクション削除
        const result = await withLock(async () => {
          return await deleteSection(args.heading);
        });

        if (!result.success) {
          return `エラー: ${result.error}`;
        }

        return `✓ セクション「${args.heading}」を削除しました。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        
        if (message.includes('Failed to acquire lock')) {
          return `❌ ロック取得タイムアウト: 他のセッションが指示書を更新中です。しばらく待ってから再試行してください。`;
        }
        
        return `エラー: ${message}`;
      }
    }

    case 'insert': {
      try {
        // 排他制御を使用してセクション挿入
        const result = await withLock(async () => {
          return await insertSection(
            args.heading,
            args.content,
            args.position,
            args.anchor
          );
        });

        if (!result.success) {
          return `エラー: ${result.error}`;
        }

        const positionMsg =
          args.position === 'first'
            ? '先頭に'
            : args.position === 'last'
            ? '最後に'
            : args.position === 'before'
            ? `「${args.anchor}」の前に`
            : `「${args.anchor}」の後に`;

        return `✓ セクション「${args.heading}」を${positionMsg}挿入しました。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        
        if (message.includes('Failed to acquire lock')) {
          return `❌ ロック取得タイムアウト: 他のセッションが指示書を更新中です。しばらく待ってから再試行してください。`;
        }
        
        return `エラー: ${message}`;
      }
    }

    default:
      return `Unknown action: ${(args as any).action}`;
  }
}
