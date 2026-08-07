'use client';

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { X, FileCode, Wifi, WifiOff, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { ProjectFileDto, ProgrammingLanguage, LineLockInfo } from '@codesphere/shared';
import { useYjsProvider } from '../../hooks/useYjsProvider';
import { useTheme } from '../../hooks/useTheme';

interface MonacoEditorProps {
  activeFile: ProjectFileDto | null;
  openFileIds: string[];
  allFiles: ProjectFileDto[];
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onChangeContent?: (value: string) => void;
  isReadOnly?: boolean;
  username?: string;
  userColor?: string;
  currentUserId?: string;
  userRole?: string;

  // Line Locking Props
  locks?: LineLockInfo[];
  myLocks?: LineLockInfo[];
  lockError?: string | null;
  onRequestLock?: (startLine: number, endLine: number) => void;
  onReleaseLock?: (lockId: string) => void;
  onForceReleaseLock?: (lockId: string) => void;
  isRangeLockedByOther?: (startLine: number, endLine: number) => LineLockInfo | null;
}


let providersRegistered = false;

export const MonacoEditorComponent: React.FC<MonacoEditorProps> = memo(({
  activeFile,
  openFileIds,
  allFiles,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  isReadOnly = false,
  username,
  userColor,
  currentUserId,
  userRole = 'EDITOR',
  locks = [],
  myLocks = [],
  lockError = null,
  onRequestLock,
  onReleaseLock,
  onForceReleaseLock,
  isRangeLockedByOther
}) => {
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
  const [interceptBanner, setInterceptBanner] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [dirtyFileIds, setDirtyFileIds] = useState<Set<string>>(new Set());
  const decorationsCollectionRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();

  const { isSynced } = useYjsProvider(
    activeFile ? activeFile.id : null,
    editorInstance,
    username,
    userColor
  );

  // ─── Monaco Line Lock Visual Decorations Effect ─────────────────────────────
  useEffect(() => {
    if (!editorInstance || !activeFile) return;

    const monaco = (window as any).monaco;
    if (!monaco) return;

    const fileLocks = locks.filter(l => l.fileId === activeFile.id);
    const newDecorations: editor.IModelDeltaDecoration[] = fileLocks.map(lock => {
      const isOwn = lock.userId === currentUserId;
      return {
        range: new monaco.Range(lock.startLine, 1, lock.endLine, 1),
        options: {
          isWholeLine: true,
          className: isOwn ? 'monaco-line-lock-highlight-own' : 'monaco-line-lock-highlight',
          glyphMarginClassName: 'monaco-line-lock-glyph',
          hoverMessage: {
            value: `🔒 **${isOwn ? 'Your Lock' : `Locked by ${lock.username}`}** (Lines ${lock.startLine}–${lock.endLine})`
          }
        }
      };
    });

    if (!decorationsCollectionRef.current) {
      decorationsCollectionRef.current = editorInstance.createDecorationsCollection(newDecorations);
    } else {
      decorationsCollectionRef.current.set(newDecorations);
    }
  }, [editorInstance, activeFile, locks, currentUserId]);

  // ─── Dynamic Monaco Theme Conversion Effect (Dark / Light Mode) ───────────
  useEffect(() => {
    const monaco = (window as any).monaco;
    if (!monaco) return;
    const targetTheme = theme === 'light' ? 'catppuccin-latte' : 'catppuccin-mocha';
    monaco.editor.setTheme(targetTheme);
  }, [theme]);

  // ─── Keydown Edit Interception Guard ───────────────────────────────────────
  useEffect(() => {
    if (!editorInstance || !isRangeLockedByOther) return;

    const disposable = editorInstance.onKeyDown((e) => {
      // Ignore navigation-only keys (arrows, ctrl, meta, alt, shift, escape)
      const navKeys = [15, 16, 17, 18, 9, 2, 3, 4, 5, 89, 90]; // Monaco KeyCodes
      if (e.ctrlKey || e.metaKey || e.altKey) {
        // If meta/ctrl + char (like typing Ctrl+V, Ctrl+X), check selection
      }

      const selection = editorInstance.getSelection();
      if (!selection) return;

      const startLine = selection.startLineNumber;
      const endLine = selection.endLineNumber;

      const lock = isRangeLockedByOther(startLine, endLine);
      if (lock) {
        // Intercept and prevent write action on locked lines!
        e.preventDefault();
        e.stopPropagation();

        const msg = `🔒 Lines ${lock.startLine}–${lock.endLine} locked by ${lock.username}`;
        setInterceptBanner(msg);

        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setInterceptBanner(null), 3000);
      }
    });

    return () => {
      disposable.dispose();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [editorInstance, isRangeLockedByOther]);

  // Handle locking currently selected lines or cursor line
  const handleLockSelectedLines = () => {
    if (!editorInstance || !onRequestLock) return;
    const selection = editorInstance.getSelection();
    if (selection) {
      onRequestLock(selection.startLineNumber, selection.endLineNumber);
    }
  };


  const getMonacoLanguage = (lang: ProgrammingLanguage): string => {
    switch (lang) {
      case 'JAVASCRIPT': return 'javascript';
      case 'TYPESCRIPT': return 'typescript';
      case 'PYTHON': return 'python';
      case 'CPP': return 'cpp';
      case 'GO': return 'go';
      default: return 'javascript';
    }
  };

  // ─── Configure Language Services Before Monaco Mounts ──────────────────
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    // ─── Register Catppuccin Mocha Theme (Dark) ──────────────────────────
    monaco.editor.defineTheme('catppuccin-mocha', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'cdd6f4', background: '1e1e2e' },
        { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cba6f7' },
        { token: 'keyword.operator', foreground: '89dceb' },
        { token: 'string', foreground: 'a6e3a1' },
        { token: 'string.escape', foreground: 'f38ba8' },
        { token: 'number', foreground: 'fab387' },
        { token: 'operator', foreground: '89dceb' },
        { token: 'type', foreground: 'f9e2af' },
        { token: 'class', foreground: 'f9e2af' },
        { token: 'interface', foreground: '94e2d5' },
        { token: 'function', foreground: '89b4fa' },
        { token: 'variable', foreground: 'cdd6f4' },
        { token: 'variable.predefined', foreground: 'f38ba8' },
        { token: 'constant', foreground: 'fab387' },
        { token: 'punctuation', foreground: 'cdd6f4' },
        { token: 'delimiter', foreground: '6c7086' },
        { token: 'tag', foreground: 'f38ba8' },
        { token: 'attribute.name', foreground: '89b4fa' },
        { token: 'attribute.value', foreground: 'a6e3a1' },
        { token: 'metatag', foreground: 'f38ba8' },
        { token: 'annotation', foreground: 'cba6f7' },
        { token: 'regexp', foreground: 'f38ba8' },
        { token: 'invalid', foreground: 'f38ba8', fontStyle: 'underline' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.selectionBackground': '#45475a',
        'editor.inactiveSelectionBackground': '#313244',
        'editor.lineHighlightBackground': '#252535',
        'editorCursor.foreground': '#cba6f7',
        'editorWhitespace.foreground': '#313244',
        'editorIndentGuide.background': '#313244',
        'editorIndentGuide.activeBackground': '#45475a',
        'editorLineNumber.foreground': '#45475a',
        'editorLineNumber.activeForeground': '#cba6f7',
        'editorGutter.background': '#1e1e2e',
        'editorBracketMatch.background': '#45475a44',
        'editorBracketMatch.border': '#89b4fa',
        'editor.wordHighlightBackground': '#45475a66',
        'editor.findMatchBackground': '#f9e2af33',
        'editor.findMatchHighlightBackground': '#f9e2af1a',
        'editorSuggestWidget.background': '#1e1e2e',
        'editorSuggestWidget.border': '#313244',
        'editorSuggestWidget.foreground': '#cdd6f4',
        'editorSuggestWidget.selectedBackground': '#313244',
        'editorSuggestWidget.highlightForeground': '#89b4fa',
        'editorHoverWidget.background': '#181825',
        'editorHoverWidget.border': '#313244',
        'scrollbarSlider.background': '#45475a88',
        'scrollbarSlider.hoverBackground': '#45475a',
        'scrollbarSlider.activeBackground': '#585b70',
        'minimap.background': '#1e1e2e',
        'editorOverviewRuler.border': '#1e1e2e',
        'editorOverviewRuler.background': '#1e1e2e',
      },
    });

    // ─── Register Catppuccin Latte Theme (Light) ─────────────────────────
    monaco.editor.defineTheme('catppuccin-latte', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: '4c4f69', background: 'eff1f5' },
        { token: 'comment', foreground: '9ca0b0', fontStyle: 'italic' },
        { token: 'keyword', foreground: '8839ef' },
        { token: 'keyword.operator', foreground: '04a5e5' },
        { token: 'string', foreground: '40a02b' },
        { token: 'string.escape', foreground: 'd20f39' },
        { token: 'number', foreground: 'fe640b' },
        { token: 'operator', foreground: '04a5e5' },
        { token: 'type', foreground: 'df8e1d' },
        { token: 'class', foreground: 'df8e1d' },
        { token: 'interface', foreground: '179299' },
        { token: 'function', foreground: '1e66f5' },
        { token: 'variable', foreground: '4c4f69' },
        { token: 'constant', foreground: 'fe640b' },
        { token: 'delimiter', foreground: '9ca0b0' },
      ],
      colors: {
        'editor.background': '#eff1f5',
        'editor.foreground': '#4c4f69',
        'editor.selectionBackground': '#acb0be66',
        'editor.inactiveSelectionBackground': '#ccd0da66',
        'editor.lineHighlightBackground': '#e6e9ef',
        'editorCursor.foreground': '#8839ef',
        'editorWhitespace.foreground': '#bcc0cc',
        'editorIndentGuide.background': '#ccd0da',
        'editorIndentGuide.activeBackground': '#bcc0cc',
        'editorLineNumber.foreground': '#9ca0b0',
        'editorLineNumber.activeForeground': '#8839ef',
        'editorGutter.background': '#eff1f5',
        'editorOverviewRuler.border': '#eff1f5',
        'editorOverviewRuler.background': '#eff1f5',
        'editorSuggestWidget.background': '#e6e9ef',
        'editorSuggestWidget.border': '#ccd0da',
        'editorSuggestWidget.foreground': '#4c4f69',
        'editorSuggestWidget.selectedBackground': '#ccd0da',
        'scrollbarSlider.background': '#acb0be66',
        'scrollbarSlider.hoverBackground': '#acb0be99',
        'scrollbarSlider.activeBackground': '#7c7f93',
        'minimap.background': '#eff1f5',
      },
    });

    if (providersRegistered) return;
    providersRegistered = true;
    // JavaScript & TypeScript IntelliSense configuration
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
      strict: false,
      noEmit: true,
      esModuleInterop: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.React,
      lib: ['esnext', 'dom'],
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.React,
      lib: ['esnext', 'dom'],
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Add console, Math, JSON, Promise type stubs for richer JS/TS completions
    const consoleLib = `
      declare interface Console {
        log(...data: any[]): void;
        error(...data: any[]): void;
        warn(...data: any[]): void;
        info(...data: any[]): void;
        debug(...data: any[]): void;
        table(tabularData: any, properties?: string[]): void;
        time(label?: string): void;
        timeEnd(label?: string): void;
        clear(): void;
        assert(condition?: boolean, ...data: any[]): void;
        count(label?: string): void;
        dir(item?: any, options?: any): void;
        trace(...data: any[]): void;
        group(...data: any[]): void;
        groupEnd(): void;
      }
      declare var console: Console;
      declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
      declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
      declare function clearTimeout(id?: number): void;
      declare function clearInterval(id?: number): void;
      declare function fetch(input: string | Request, init?: RequestInit): Promise<Response>;
      declare function alert(message?: any): void;
      declare function prompt(message?: string, _default?: string): string | null;
    `;
    monaco.languages.typescript.javascriptDefaults.addExtraLib(consoleLib, 'ts:global.d.ts');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(consoleLib, 'ts:global.d.ts');

    // ─── Python Snippets & Completions ────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${1})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Print to stdout', range },
          { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:function_name}(${2:params}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Define a function', range },
          { label: 'class', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Define a class', range },
          { label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'For loop', range },
          { label: 'while', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'while ${1:condition}:\n\t${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'While loop', range },
          { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n\t${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'If statement', range },
          { label: 'ifelse', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'If-else statement', range },
          { label: 'try', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:print(e)}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Try-except block', range },
          { label: 'with', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'with ${1:expression} as ${2:variable}:\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'With statement', range },
          { label: 'import', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'import ${1:module}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Import module', range },
          { label: 'from_import', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'from ${1:module} import ${2:name}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'From...import', range },
          { label: 'lambda', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'lambda ${1:args}: ${2:expression}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Lambda function', range },
          { label: 'list_comprehension', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[${1:expr} for ${2:item} in ${3:iterable}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'List comprehension', range },
          { label: 'dict_comprehension', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Dict comprehension', range },
          { label: 'main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if __name__ == "__main__":\n\t${1:main()}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Main guard', range },
          { label: 'input', kind: monaco.languages.CompletionItemKind.Function, insertText: 'input(${1:"Enter: "})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Read user input', range },
          { label: 'range', kind: monaco.languages.CompletionItemKind.Function, insertText: 'range(${1:stop})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Generate range', range },
          { label: 'len', kind: monaco.languages.CompletionItemKind.Function, insertText: 'len(${1:obj})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Get length', range },
          { label: 'enumerate', kind: monaco.languages.CompletionItemKind.Function, insertText: 'enumerate(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Enumerate iterable', range },
          { label: 'zip', kind: monaco.languages.CompletionItemKind.Function, insertText: 'zip(${1:iter1}, ${2:iter2})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Zip iterables', range },
          { label: 'map', kind: monaco.languages.CompletionItemKind.Function, insertText: 'map(${1:func}, ${2:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Map function', range },
          { label: 'filter', kind: monaco.languages.CompletionItemKind.Function, insertText: 'filter(${1:func}, ${2:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Filter iterable', range },
          { label: 'sorted', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sorted(${1:iterable}, key=${2:None}, reverse=${3:False})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Sort iterable', range },
        ];

        return { suggestions: suggestions as any[] };
      },
    });

    // ─── C++ Snippets & Completions ───────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('cpp', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          { label: 'include_iostream', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '#include <iostream>\nusing namespace std;', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: '#include <iostream>', range },
          { label: 'main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'int main() {\n\t${1}\n\treturn 0;\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Main function', range },
          { label: 'cout', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'cout << ${1:"Hello"} << endl;', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Print to stdout', range },
          { label: 'cin', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'cin >> ${1:variable};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Read from stdin', range },
          { label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'For loop', range },
          { label: 'foreach', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for (auto& ${1:item} : ${2:container}) {\n\t${3}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Range-based for', range },
          { label: 'while', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'while (${1:condition}) {\n\t${2}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'While loop', range },
          { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if (${1:condition}) {\n\t${2}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'If statement', range },
          { label: 'class', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'class ${1:ClassName} {\npublic:\n\t${1:ClassName}() {\n\t\t${2}\n\t}\n};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Class definition', range },
          { label: 'struct', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'struct ${1:Name} {\n\t${2:int value;}\n};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Struct definition', range },
          { label: 'vector', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'vector<${1:int}> ${2:vec};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'std::vector', range },
          { label: 'include_vector', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '#include <vector>', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: '#include <vector>', range },
          { label: 'include_string', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '#include <string>', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: '#include <string>', range },
          { label: 'include_algorithm', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '#include <algorithm>', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: '#include <algorithm>', range },
        ];

        return { suggestions: suggestions as any[] };
      },
    });

    // ─── Go Snippets & Completions ────────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('go', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          { label: 'package_main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'package main\n\nimport "fmt"\n\nfunc main() {\n\t${1:fmt.Println("Hello, World!")}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Main package boilerplate', range },
          { label: 'fmt.Println', kind: monaco.languages.CompletionItemKind.Function, insertText: 'fmt.Println(${1})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Print line', range },
          { label: 'fmt.Printf', kind: monaco.languages.CompletionItemKind.Function, insertText: 'fmt.Printf("${1:%s}\\n", ${2:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Printf', range },
          { label: 'func', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Function definition', range },
          { label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t${3}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'For loop', range },
          { label: 'forrange', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:i}, ${2:v} := range ${3:slice} {\n\t${4}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Range loop', range },
          { label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition} {\n\t${2}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'If statement', range },
          { label: 'iferr', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if err != nil {\n\t${1:return err}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Error check', range },
          { label: 'struct', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'type ${1:Name} struct {\n\t${2:Field} ${3:Type}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Struct definition', range },
          { label: 'interface', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'type ${1:Name} interface {\n\t${2:Method}(${3:params}) ${4:returnType}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Interface definition', range },
          { label: 'switch', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'switch ${1:value} {\ncase ${2:v1}:\n\t${3}\ndefault:\n\t${4}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Switch statement', range },
          { label: 'goroutine', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'go func() {\n\t${1}\n}()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Goroutine', range },
          { label: 'channel', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '${1:ch} := make(chan ${2:int})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Make channel', range },
          { label: 'defer', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'defer ${1:func()}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Defer statement', range },
        ];

        return { suggestions: suggestions as any[] };
      },
    });
  }, []);

  const handleEditorMount: OnMount = (editor) => {
    setEditorInstance(editor);
    // Track cursor position for status bar
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ line: e.position.lineNumber, col: e.position.column });
    });
  };

  const openFiles = allFiles.filter(f => openFileIds.includes(f.id));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--base)' }}>
      {/* File Tabs Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--mantle)', borderBottom: '1px solid var(--border)', minHeight: '38px' }}>
        <div className="editor-tabs-scroll" style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', flex: 1 }}>
          {openFiles.map(file => {
            const isActive = activeFile?.id === file.id;
            const isDirty = dirtyFileIds.has(file.id);
            return (
              <div
                key={file.id}
                onClick={() => onSelectTab(file.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  height: '38px',
                  cursor: 'pointer',
                  fontSize: '0.83rem',
                  backgroundColor: isActive ? 'var(--base)' : 'transparent',
                  borderTop: isActive ? '2px solid var(--blue)' : '2px solid transparent',
                  borderRight: '1px solid var(--border)',
                  color: isActive ? 'var(--text)' : 'var(--subtext0)',
                  userSelect: 'none',
                  flexShrink: 0,
                  transition: 'background 0.1s',
                }}
              >
                <FileCode size={13} style={{ color: isActive ? 'var(--blue)' : 'var(--overlay0)', flexShrink: 0 }} />
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                {/* Dirty indicator dot */}
                {isDirty && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--peach)', flexShrink: 0 }} />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--overlay0)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '3px',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--overlay0)')}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Tab Bar Actions (Line Locks + Sync Status) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px' }}>
          {activeFile && !isReadOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Lock Selected Lines Button */}
              <button
                onClick={handleLockSelectedLines}
                className="ide-pill-btn"
                title="Lock selected line range to prevent concurrent edits"
                style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              >
                <Lock size={12} color="var(--mauve)" /> Lock Lines
              </button>

              {/* Release Active Locks */}
              {myLocks.length > 0 && (
                <button
                  onClick={() => myLocks.forEach(l => onReleaseLock && onReleaseLock(l.lockId))}
                  className="ide-pill-btn"
                  title="Release your active line locks on this file"
                  style={{ padding: '3px 8px', fontSize: '0.74rem', color: 'var(--green)', borderColor: 'rgba(166,227,161,0.3)' }}
                >
                  <Unlock size={12} /> Unlock ({myLocks.length})
                </button>
              )}

              {/* Admin Force Unlock */}
              {userRole === 'OWNER' && locks.filter(l => l.userId !== currentUserId).length > 0 && (
                <button
                  onClick={() => locks.filter(l => l.userId !== currentUserId).forEach(l => onForceReleaseLock && onForceReleaseLock(l.lockId))}
                  className="ide-pill-btn"
                  title="Force unlock all lines locked by other users (Owner override)"
                  style={{ padding: '3px 8px', fontSize: '0.74rem', color: 'var(--red)', borderColor: 'rgba(243,139,168,0.3)' }}
                >
                  <ShieldAlert size={12} /> Force Unlock
                </button>
              )}
            </div>
          )}

          {/* Sync Status Badge */}
          {activeFile && (
            <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: isSynced ? '#a6e3a1' : '#fab387' }}>
              {isSynced ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{isSynced ? 'Live Sync' : 'Connecting'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Monaco Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Intercept / Conflict Warning Banner */}
        {(interceptBanner || lockError) && (
          <div className="lock-toast-banner">
            <Lock size={16} />
            <span>{interceptBanner || lockError}</span>
          </div>
        )}

        {activeFile ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {/* Breadcrumb Bar */}
            <div style={{
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              gap: '6px',
              backgroundColor: 'var(--base)',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.75rem',
              color: 'var(--subtext0)',
              flexShrink: 0,
            }}>
              <FileCode size={12} style={{ color: 'var(--blue)', flexShrink: 0 }} />
              <span style={{ color: 'var(--overlay0)' }}>{activeFile.language.toLowerCase()}</span>
              <span style={{ color: 'var(--overlay0)' }}>›</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{activeFile.name}</span>
              {isReadOnly && (
                <span style={{ marginLeft: '6px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(243,139,168,0.15)', color: 'var(--red)', fontSize: '0.7rem' }}>Read Only</span>
              )}
            </div>

            {/* Monaco Editor — uses flex:1 so breadcrumb + status bar are excluded from its height */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language={getMonacoLanguage(activeFile.language)}
              defaultValue={activeFile.content}
              theme={theme === 'light' ? 'catppuccin-latte' : 'catppuccin-mocha'}
              beforeMount={handleBeforeMount}
              onMount={handleEditorMount}
              onChange={(val) => {
                if (onChangeContent) {
                  onChangeContent(val || '');
                  // Mark file as dirty
                  setDirtyFileIds(prev => new Set(prev).add(activeFile.id));
                }
              }}
              options={{
                readOnly: isReadOnly,
                fontSize: 14,
                fontFamily: "'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace",
                fontLigatures: true,
                glyphMargin: true,
                minimap: { enabled: false },
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                bracketPairColorization: { enabled: true },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                wordBasedSuggestions: 'allDocuments',
                snippetSuggestions: 'inline',
                quickSuggestions: { other: true, comments: false, strings: true },
                suggest: {
                  showKeywords: true, showSnippets: true, showFunctions: true,
                  showClasses: true, showVariables: true, showModules: true,
                  showConstructors: true, showFields: true, showInterfaces: true,
                  showStructs: true, showEvents: true, showOperators: true,
                  showUnits: true, showValues: true, showConstants: true,
                  showEnums: true, showEnumMembers: true, showTypeParameters: true,
                  showColors: true, showFiles: true, showReferences: true,
                  showWords: true, showProperties: true, showMethods: true,
                  insertMode: 'replace', filterGraceful: true,
                  snippetsPreventQuickSuggestions: false, localityBonus: true,
                  shareSuggestSelections: true, showIcons: true, preview: true,
                },
                parameterHints: { enabled: true, cycle: true },
                inlineSuggest: { enabled: true },
                formatOnPaste: true, formatOnType: true,
                autoClosingBrackets: 'always', autoClosingQuotes: 'always',
                autoIndent: 'full', autoSurround: 'languageDefined',
                linkedEditing: true, matchBrackets: 'always',
                renderWhitespace: 'selection',
                guides: { bracketPairs: true, indentation: true },
                padding: { top: 8, bottom: 8 },
              }}
            />
            </div>

            {/* Status Bar */}
            <div style={{
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              backgroundColor: 'var(--blue)',
              color: '#1e1e2e',
              fontSize: '0.72rem',
              fontWeight: 600,
              flexShrink: 0,
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
                <span>{activeFile.language}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isSynced
                  ? <span>● Live Sync</span>
                  : <span style={{ color: '#fab387' }}>● Syncing…</span>
                }
                {isReadOnly && <span style={{ color: '#f38ba8' }}>🔒 View Only</span>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            height: '100%',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: 'var(--overlay0)',
            userSelect: 'none',
          }}>
            <FileCode size={48} style={{ opacity: 0.3 }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--subtext0)', marginBottom: '6px' }}>
                No File Open
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--overlay0)' }}>
                Select a file from the explorer to start editing
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

MonacoEditorComponent.displayName = 'MonacoEditorComponent';

