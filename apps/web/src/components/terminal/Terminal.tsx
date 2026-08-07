'use client';

import React, { useEffect, useRef, memo, useCallback, useState } from 'react';
import { Play, Trash2, ChevronDown, ChevronUp, Terminal as TerminalIcon, Send, StopCircle, Copy, Download } from 'lucide-react';
import { ProgrammingLanguage } from '@codesphere/shared';
import { TerminalLine, TerminalSession } from '../../hooks/useTerminal';

// ─── Minimal ANSI → HTML Converter ─────────────────────────────────────────
const ANSI_COLORS: Record<string, string> = {
  '30': '#45475a', '31': '#f38ba8', '32': '#a6e3a1', '33': '#f9e2af',
  '34': '#89b4fa', '35': '#cba6f7', '36': '#89dceb', '37': '#cdd6f4',
  '90': '#585b70', '91': '#f38ba8', '92': '#a6e3a1', '93': '#f9e2af',
  '94': '#89b4fa', '95': '#cba6f7', '96': '#89dceb', '97': '#cdd6f4',
};

const BG_COLORS: Record<string, string> = {
  '40': '#45475a', '41': '#f38ba8', '42': '#a6e3a1', '43': '#f9e2af',
  '44': '#89b4fa', '45': '#cba6f7', '46': '#89dceb', '47': '#cdd6f4',
};

function ansiToHtml(text: string): string {
  // Escape HTML first
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let result = '';
  let styles: string[] = [];
  const parts = escaped.split(/\x1b\[([0-9;]*)m/);

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Text chunk
      const text = parts[i];
      if (text) {
        if (styles.length > 0) {
          result += `<span style="${styles.join(';')}">${text}</span>`;
        } else {
          result += text;
        }
      }
    } else {
      // ANSI code chunk
      const codes = parts[i].split(';');
      styles = [];
      for (const code of codes) {
        if (code === '0' || code === '') {
          styles = [];
        } else if (code === '1') {
          styles.push('font-weight:bold');
        } else if (code === '3') {
          styles.push('font-style:italic');
        } else if (code === '4') {
          styles.push('text-decoration:underline');
        } else if (ANSI_COLORS[code]) {
          styles.push(`color:${ANSI_COLORS[code]}`);
        } else if (BG_COLORS[code]) {
          styles.push(`background:${BG_COLORS[code]}`);
        }
      }
    }
  }

  return result;
}

// ─── Single Terminal Line Renderer ──────────────────────────────────────────
const TerminalLineItem = memo(({ line }: { line: TerminalLine }) => {
  const baseColorMap: Record<string, string> = {
    stdout: '#cdd6f4',
    stderr: '#f38ba8',
    info:   '#89dceb',
    system: '#6c7086',
    stdin:  '#89dceb',
  };

  const html = ansiToHtml(line.content);
  const baseColor = baseColorMap[line.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0',
        fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", "Consolas", monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        padding: '1px 0',
        color: baseColor,
        wordBreak: 'break-all',
      }}
    >
      {line.type === 'stderr' && (
        <span style={{ color: '#f38ba8', marginRight: '6px', flexShrink: 0, userSelect: 'none' }}>
          ✗
        </span>
      )}
      {line.type === 'stdin' && (
        <span style={{ color: '#89dceb', marginRight: '6px', flexShrink: 0, userSelect: 'none' }}>
          ›
        </span>
      )}
      <span dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />
    </div>
  );
});
TerminalLineItem.displayName = 'TerminalLineItem';

// ─── Language Config ─────────────────────────────────────────────────────────
const LANGUAGE_OPTIONS: { value: ProgrammingLanguage; label: string; ext: string }[] = [
  { value: 'JAVASCRIPT', label: 'JavaScript', ext: '.js' },
  { value: 'TYPESCRIPT', label: 'TypeScript', ext: '.ts' },
  { value: 'PYTHON',     label: 'Python',     ext: '.py' },
  { value: 'GO',         label: 'Go',         ext: '.go' },
  { value: 'CPP',        label: 'C++',        ext: '.cpp' },
];

// ─── Terminal Panel Props ─────────────────────────────────────────────────────
interface TerminalPanelProps {
  lines: TerminalLine[];
  session: TerminalSession | null;
  isRunning: boolean;
  onRun: (language: ProgrammingLanguage, code: string) => void;
  onClear: () => void;
  onSendInput: (input: string) => void;
  onKillExecution: () => void;
  activeFileContent?: string;
  activeFileLanguage?: ProgrammingLanguage;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  height: number;
  onResizeStart: (e: React.MouseEvent) => void;
}

// ─── Main Terminal Panel Component ────────────────────────────────────────────
export const TerminalPanel = memo(({
  lines,
  session,
  isRunning,
  onRun,
  onClear,
  onSendInput,
  onKillExecution,
  activeFileContent,
  activeFileLanguage,
  isCollapsed,
  onToggleCollapse,
  height,
  onResizeStart,
}: TerminalPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedLanguage, setSelectedLanguage] = React.useState<ProgrammingLanguage>(
    activeFileLanguage || 'JAVASCRIPT'
  );
  const [stdinValue, setStdinValue] = useState('');

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, isCollapsed]);

  // Focus stdin input when process starts running
  useEffect(() => {
    if (isRunning && inputRef.current && !isCollapsed) {
      inputRef.current.focus();
    }
  }, [isRunning, isCollapsed]);

  // Sync language with active file
  useEffect(() => {
    if (activeFileLanguage) {
      setSelectedLanguage(activeFileLanguage);
    }
  }, [activeFileLanguage]);

  const handleRun = useCallback(() => {
    const code = activeFileContent || '// No file open';
    onRun(selectedLanguage, code);
  }, [selectedLanguage, activeFileContent, onRun]);

  const handleSendInput = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const val = stdinValue;
      if (!val.trim() && val !== '') {
        // allow empty sends (user just pressed Enter)
      }
      onSendInput(val);
      setStdinValue('');
    },
    [stdinValue, onSendInput]
  );

  const statusDot = session?.isRunning
    ? { color: '#f9e2af', label: 'RUNNING', pulse: true }
    : session?.exitCode === 0
    ? { color: '#a6e3a1', label: 'SUCCESS', pulse: false }
    : session
    ? { color: '#f38ba8', label: `EXIT ${session.exitCode}`, pulse: false }
    : { color: '#585b70', label: 'IDLE', pulse: false };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--crust)',
        borderTop: '1px solid var(--border)',
        height: isCollapsed ? '38px' : `${height}px`,
        transition: 'height 0.15s ease',
        userSelect: 'none',
        position: 'relative',
        flexShrink: 0,
        width: '100%',
      }}
    >
      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            cursor: 'ns-resize',
            zIndex: 10,
            backgroundColor: 'transparent',
          }}
          title="Drag to resize terminal"
        />
      )}

      {/* Terminal Header */}
      <div
        style={{
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          backgroundColor: 'var(--mantle)',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        {/* Left: Icon + Title + Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TerminalIcon size={14} style={{ color: '#89b4fa', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#9399b2', letterSpacing: '0.05em' }}>
            TERMINAL
          </span>
          {session && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '4px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: statusDot.color,
                  boxShadow: statusDot.pulse ? `0 0 0 2px ${statusDot.color}40` : 'none',
                  animation: statusDot.pulse ? 'pulse-dot 1s ease infinite' : 'none',
                }}
              />
              <span style={{ fontSize: '10px', color: statusDot.color, fontWeight: 600, letterSpacing: '0.08em' }}>
                {statusDot.label}
              </span>
              {session.durationMs !== undefined && (
                <span style={{ fontSize: '10px', color: '#585b70' }}>
                  {session.durationMs}ms
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Language Selector */}
          {!isCollapsed && (
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as ProgrammingLanguage)}
              disabled={isRunning}
              style={{
                backgroundColor: 'var(--base)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Run Button — hidden while running */}
          {!isCollapsed && !isRunning && (
            <button
              onClick={handleRun}
              title={`Run ${selectedLanguage}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                backgroundColor: '#a6e3a1',
                color: '#1e1e2e',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Play size={10} fill="currentColor" />
              Run
            </button>
          )}

          {/* Stop / Kill button — shown only while running */}
          {!isCollapsed && isRunning && (
            <button
              onClick={onKillExecution}
              title="Stop running process (SIGKILL)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                backgroundColor: 'rgba(243, 139, 168, 0.15)',
                color: '#f38ba8',
                border: '1px solid rgba(243, 139, 168, 0.3)',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(243, 139, 168, 0.28)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(243, 139, 168, 0.15)';
              }}
            >
              <StopCircle size={10} />
              Stop
            </button>
          )}

          {/* Clear Button */}
          {!isCollapsed && lines.length > 0 && !isRunning && (
            <>
              {/* Copy Terminal Log */}
              <button
                onClick={() => {
                  const logText = lines.map(l => l.content).join('\n');
                  navigator.clipboard.writeText(logText);
                }}
                title="Copy terminal output to clipboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--subtext0)',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--subtext0)')}
              >
                <Copy size={13} />
              </button>

              {/* Download Terminal Log */}
              <button
                onClick={() => {
                  const logText = lines.map(l => l.content).join('\n');
                  const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `codesphere-terminal-${Date.now()}.log`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                title="Download terminal log file"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--subtext0)',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--subtext0)')}
              >
                <Download size={13} />
              </button>

              <button
                onClick={onClear}
                title="Clear terminal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--subtext0)',
                  cursor: 'pointer',
                  padding: '3px',
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--subtext0)')}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand terminal' : 'Collapse terminal'}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              color: '#585b70',
              cursor: 'pointer',
              padding: '3px',
              borderRadius: '4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#cdd6f4')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#585b70')}
          >
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      {!isCollapsed && (
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 16px 8px',
            userSelect: 'text',
            scrollbarWidth: 'thin',
            scrollbarColor: '#313244 transparent',
          }}
        >
          {lines.length === 0 ? (
            <div
              style={{
                color: '#45475a',
                fontSize: '12px',
                fontFamily: '"JetBrains Mono", monospace',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '8px',
              }}
            >
              <span>$ Welcome to CodeSphere Terminal</span>
              <span style={{ color: '#313244' }}>
                Select a language and click Run to execute the active file.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {lines.map((line) => (
                <TerminalLineItem key={line.id} line={line} />
              ))}
              {session?.isRunning && (
                <div
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '14px',
                    backgroundColor: '#89b4fa',
                    marginTop: '2px',
                    animation: 'blink-cursor 1s step-end infinite',
                    verticalAlign: 'middle',
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Interactive Stdin Input Bar ─────────────────────────────────── */}
      {!isCollapsed && isRunning && (
        <form
          onSubmit={handleSendInput}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--mantle)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {/* stdin prompt symbol */}
          <span
            style={{
              color: '#89dceb',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            ▶ stdin:
          </span>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={stdinValue}
            onChange={(e) => setStdinValue(e.target.value)}
            placeholder="Type input and press Enter to send…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{
              flex: 1,
              backgroundColor: 'rgba(137, 180, 250, 0.06)',
              border: '1px solid rgba(137, 180, 250, 0.2)',
              borderRadius: '4px',
              color: '#cdd6f4',
              fontSize: '13px',
              fontFamily: '"JetBrains Mono", monospace',
              padding: '4px 10px',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(137, 180, 250, 0.5)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(137, 180, 250, 0.2)')}
          />

          {/* Send button */}
          <button
            type="submit"
            title="Send input (Enter)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              backgroundColor: 'rgba(137, 220, 235, 0.12)',
              color: '#89dceb',
              border: '1px solid rgba(137, 220, 235, 0.25)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(137, 220, 235, 0.22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(137, 220, 235, 0.12)';
            }}
          >
            <Send size={11} />
            Send
          </button>
        </form>
      )}

      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(249,226,175,0.6); }
          70% { box-shadow: 0 0 0 4px rgba(249,226,175,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,226,175,0); }
        }
      `}</style>
    </div>
  );
});

TerminalPanel.displayName = 'TerminalPanel';
