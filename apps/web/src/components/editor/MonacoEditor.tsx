'use client';

import React, { useState, useCallback } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { X, FileCode, Wifi, WifiOff } from 'lucide-react';
import { ProjectFileDto, ProgrammingLanguage } from '@codesphere/shared';
import { useYjsProvider } from '../../hooks/useYjsProvider';

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
}

export const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  activeFile,
  openFileIds,
  allFiles,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  isReadOnly = false,
  username,
  userColor
}) => {
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);

  const { isSynced } = useYjsProvider(
    activeFile ? activeFile.id : null,
    editorInstance,
    username,
    userColor
  );

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
  };

  const openFiles = allFiles.filter(f => openFileIds.includes(f.id));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e2e' }}>
      {/* File Tabs Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#181825', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '38px' }}>
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
          {openFiles.map(file => {
            const isActive = activeFile?.id === file.id;
            return (
              <div
                key={file.id}
                onClick={() => onSelectTab(file.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  backgroundColor: isActive ? '#1e1e2e' : 'transparent',
                  borderTop: isActive ? '2px solid #89b4fa' : '2px solid transparent',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  color: isActive ? '#ffffff' : '#9399b2',
                  userSelect: 'none'
                }}
              >
                <FileCode size={14} style={{ color: isActive ? '#89b4fa' : '#6c7086' }} />
                <span>{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6c7086',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '3px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f38ba8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6c7086')}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Sync Status Badge */}
        {activeFile && (
          <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: isSynced ? '#a6e3a1' : '#fab387' }}>
            {isSynced ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isSynced ? 'Live Sync Active' : 'Connecting...'}</span>
          </div>
        )}
      </div>

      {/* Main Monaco Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        {activeFile ? (
          <Editor
            height="100%"
            language={getMonacoLanguage(activeFile.language)}
            defaultValue={activeFile.content}
            theme="vs-dark"
            beforeMount={handleBeforeMount}
            onMount={handleEditorMount}
            onChange={(val) => onChangeContent && onChangeContent(val || '')}
            options={{
              readOnly: isReadOnly,
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace",
              fontLigatures: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              lineNumbers: 'on',
              folding: true,
              bracketPairColorization: { enabled: true },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              // ─── VS Code-like IntelliSense & Suggestions ──────────
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: 'allDocuments',
              snippetSuggestions: 'inline',
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true,
              },
              suggest: {
                showKeywords: true,
                showSnippets: true,
                showFunctions: true,
                showClasses: true,
                showVariables: true,
                showModules: true,
                showConstructors: true,
                showFields: true,
                showInterfaces: true,
                showStructs: true,
                showEvents: true,
                showOperators: true,
                showUnits: true,
                showValues: true,
                showConstants: true,
                showEnums: true,
                showEnumMembers: true,
                showTypeParameters: true,
                showColors: true,
                showFiles: true,
                showReferences: true,
                showWords: true,
                showProperties: true,
                showMethods: true,
                insertMode: 'replace',
                filterGraceful: true,
                snippetsPreventQuickSuggestions: false,
                localityBonus: true,
                shareSuggestSelections: true,
                showIcons: true,
                preview: true,
              },
              parameterHints: { enabled: true, cycle: true },
              inlineSuggest: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              autoIndent: 'full',
              autoSurround: 'languageDefined',
              linkedEditing: true,
              matchBrackets: 'always',
              renderWhitespace: 'selection',
              guides: {
                bracketPairs: true,
                indentation: true,
              },
            }}
          />
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6c7086', fontSize: '0.95rem' }}>
            No file open. Select a file from the explorer sidebar to edit.
          </div>
        )}
      </div>
    </div>
  );
};
