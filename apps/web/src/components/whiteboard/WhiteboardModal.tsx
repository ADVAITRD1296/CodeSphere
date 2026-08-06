'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  Pencil,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  Eraser,
  Trash2,
  Download,
  Check
} from 'lucide-react';
import { WhiteboardElement, WhiteboardTool, WhiteboardPoint } from '@codesphere/shared';

interface WhiteboardModalProps {
  isOpen: boolean;
  elements: WhiteboardElement[];
  currentUserId: string;
  currentUsername: string;
  onAddElement: (element: WhiteboardElement) => void;
  onClear: () => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Mauve', hex: '#cba6f7' },
  { name: 'Blue', hex: '#89b4fa' },
  { name: 'Green', hex: '#a6e3a1' },
  { name: 'Peach', hex: '#fab387' },
  { name: 'Red', hex: '#f38ba8' },
  { name: 'White', hex: '#cdd6f4' },
];

const STROKE_SIZES = [2, 4, 8];

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({
  isOpen,
  elements,
  currentUserId,
  currentUsername,
  onAddElement,
  onClear,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [selectedColor, setSelectedColor] = useState('#89b4fa');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<WhiteboardPoint[]>([]);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<WhiteboardPoint | null>(null);

  // Resize canvas to match display container
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, [isOpen]);

  // Main Canvas Render Engine
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw grid background lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x < displayWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displayHeight);
      ctx.stroke();
    }
    for (let y = 0; y < displayHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.stroke();
    }

    // Helper: draw single element
    const drawElement = (el: WhiteboardElement | { tool: WhiteboardTool; points: WhiteboardPoint[]; color: string; strokeWidth: number; text?: string }) => {
      if (!el.points || el.points.length === 0) return;

      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const p1 = el.points[0];
      const p2 = el.points[el.points.length - 1];

      switch (el.tool) {
        case 'pen':
        case 'eraser':
          if (el.tool === 'eraser') {
            ctx.strokeStyle = '#181825';
            ctx.lineWidth = el.strokeWidth * 3;
          }
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
          break;

        case 'line':
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          break;

        case 'arrow':
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Draw arrowhead
          const headlen = 12;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const angle = Math.atan2(dy, dx);
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
          break;

        case 'rectangle':
          ctx.beginPath();
          ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
          ctx.stroke();
          break;

        case 'ellipse':
          const rx = Math.abs(p2.x - p1.x) / 2;
          const ry = Math.abs(p2.y - p1.y) / 2;
          const cx = Math.min(p1.x, p2.x) + rx;
          const cy = Math.min(p1.y, p2.y) + ry;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;

        case 'text':
          if (el.text) {
            ctx.font = `600 ${el.strokeWidth * 6 + 10}px 'Inter', sans-serif`;
            ctx.fillText(el.text, p1.x, p1.y);
          }
          break;
      }
      ctx.restore();
    };

    // Render committed elements
    elements.forEach(drawElement);

    // Render active drawing preview
    if (isDrawing && currentPoints.length > 0) {
      drawElement({
        tool: activeTool,
        points: currentPoints,
        color: activeTool === 'eraser' ? '#181825' : selectedColor,
        strokeWidth: strokeWidth
      });
    }
  }, [elements, isDrawing, currentPoints, activeTool, selectedColor, strokeWidth]);

  useEffect(() => {
    if (isOpen) {
      renderCanvas();
    }
  }, [isOpen, renderCanvas]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>): WhiteboardPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    if (activeTool === 'text') {
      setTextPos(pos);
      return;
    }

    setIsDrawing(true);
    setCurrentPoints([pos]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    if (activeTool === 'pen' || activeTool === 'eraser') {
      setCurrentPoints((prev) => [...prev, pos]);
    } else {
      setCurrentPoints((prev) => [prev[0], pos]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPoints.length === 0) {
      setIsDrawing(false);
      return;
    }

    const newElement: WhiteboardElement = {
      id: `el_${Math.random().toString(36).substring(2, 9)}`,
      tool: activeTool,
      points: currentPoints,
      color: activeTool === 'eraser' ? '#181825' : selectedColor,
      strokeWidth: strokeWidth,
      userId: currentUserId,
      username: currentUsername,
      createdAt: new Date().toISOString()
    };

    onAddElement(newElement);
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleAddText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !textPos) return;

    const newElement: WhiteboardElement = {
      id: `el_${Math.random().toString(36).substring(2, 9)}`,
      tool: 'text',
      points: [textPos],
      color: selectedColor,
      strokeWidth: strokeWidth,
      text: textInput.trim(),
      userId: currentUserId,
      username: currentUsername,
      createdAt: new Date().toISOString()
    };

    onAddElement(newElement);
    setTextInput('');
    setTextPos(null);
  };

  // Export Canvas to PNG Image
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Fill dark background for exported image
    ctx.fillStyle = '#181825';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `codesphere-whiteboard-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, padding: '20px' }}>
      <div
        className="glass-panel animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1280px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px'
        }}
      >
        {/* Whiteboard Top Toolbar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(24, 24, 37, 0.8)',
          backdropFilter: 'blur(12px)',
          userSelect: 'none'
        }}>
          {/* Tools Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setActiveTool('pen')}
              className={`ide-pill-btn${activeTool === 'pen' ? ' active' : ''}`}
              title="Pencil / Freehand"
            >
              <Pencil size={14} /> Pen
            </button>
            <button
              onClick={() => setActiveTool('line')}
              className={`ide-pill-btn${activeTool === 'line' ? ' active' : ''}`}
              title="Straight Line"
            >
              <Minus size={14} /> Line
            </button>
            <button
              onClick={() => setActiveTool('arrow')}
              className={`ide-pill-btn${activeTool === 'arrow' ? ' active' : ''}`}
              title="Arrow"
            >
              <ArrowUpRight size={14} /> Arrow
            </button>
            <button
              onClick={() => setActiveTool('rectangle')}
              className={`ide-pill-btn${activeTool === 'rectangle' ? ' active' : ''}`}
              title="Rectangle"
            >
              <Square size={14} /> Box
            </button>
            <button
              onClick={() => setActiveTool('ellipse')}
              className={`ide-pill-btn${activeTool === 'ellipse' ? ' active' : ''}`}
              title="Circle / Ellipse"
            >
              <Circle size={14} /> Circle
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={`ide-pill-btn${activeTool === 'text' ? ' active' : ''}`}
              title="Click canvas to add text"
            >
              <Type size={14} /> Text
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`ide-pill-btn${activeTool === 'eraser' ? ' active' : ''}`}
              title="Eraser"
            >
              <Eraser size={14} /> Eraser
            </button>
          </div>

          {/* Color & Stroke Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Colors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: c.hex,
                    border: selectedColor === c.hex ? '2px solid #ffffff' : 'none',
                    cursor: 'pointer',
                    transform: selectedColor === c.hex ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              ))}
            </div>

            <span className="divider-v" style={{ height: '18px' }} />

            {/* Stroke Width */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {STROKE_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setStrokeWidth(size)}
                  className={`ide-icon-btn${strokeWidth === size ? ' active' : ''}`}
                  style={{ width: '26px', height: '26px', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  {size}px
                </button>
              ))}
            </div>

            <span className="divider-v" style={{ height: '18px' }} />

            {/* Clear & Export */}
            <button
              onClick={onClear}
              className="ide-pill-btn"
              title="Clear entire whiteboard canvas"
              style={{ color: 'var(--red)', borderColor: 'rgba(243,139,168,0.3)' }}
            >
              <Trash2 size={13} /> Clear
            </button>

            <button
              onClick={handleExportPNG}
              className="btn-primary"
              style={{ padding: '5px 12px', fontSize: '0.78rem', gap: '5px' }}
            >
              <Download size={13} /> Export PNG
            </button>

            <button onClick={onClose} className="ide-icon-btn" title="Close Whiteboard">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Main Interactive Canvas Area */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#181825' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ width: '100%', height: '100%', cursor: activeTool === 'text' ? 'text' : 'crosshair' }}
          />

          {/* Inline Text Input Dialog on Click */}
          {textPos && (
            <div
              style={{
                position: 'absolute',
                left: `${textPos.x}px`,
                top: `${textPos.y}px`,
                zIndex: 10,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <form onSubmit={handleAddText} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  autoFocus
                  className="input-field"
                  placeholder="Type whiteboard text…"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', width: '220px', borderColor: selectedColor }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '6px 10px' }}>
                  <Check size={14} />
                </button>
                <button type="button" className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setTextPos(null)}>
                  <X size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
