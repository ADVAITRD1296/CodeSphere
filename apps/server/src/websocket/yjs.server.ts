import { WebSocketServer } from 'ws';
import http from 'http';
// Use the official y-websocket server utilities – this implements the full
// y-websocket sync protocol (sync step 1/2, awareness, ping/pong) which the
// client-side WebsocketProvider expects.
// The CJS require is used because y-websocket/bin/utils is a CommonJS module.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { setupWSConnection, setContentInitializor } = require('y-websocket/bin/utils');

import * as Y from 'yjs';
import { prisma } from '../lib/prisma.js';

// Debounce timer map for DB persistence per document name
const persistTimers = new Map<string, NodeJS.Timeout>();

// Called once when a new Yjs document is first created on the server.
// We use this to seed the document with the latest content from the DB.
setContentInitializor(async (ydoc: Y.Doc) => {
  // The doc name set by setupWSConnection is the full path minus leading slash,
  // e.g. "ws/collaboration/<fileId>". Extract the fileId from the end.
  const docName: string = (ydoc as any).name || '';
  const parts = docName.split('/');
  const fileId = parts[parts.length - 1];

  if (!fileId) return;

  try {
    const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
    if (file?.content) {
      const ytext = ydoc.getText('monaco');
      // Only insert if the doc is currently empty (avoid duplicating content)
      if (ytext.toString().length === 0) {
        ydoc.transact(() => {
          ytext.insert(0, file.content!);
        });
      }
    }
  } catch (err) {
    console.error(`[Yjs] Failed to load initial content for fileId=${fileId}:`, err);
  }

  // Set up debounced DB persistence on every update
  ydoc.on('update', () => {
    if (persistTimers.has(docName)) {
      clearTimeout(persistTimers.get(docName)!);
    }
    persistTimers.set(
      docName,
      setTimeout(async () => {
        persistTimers.delete(docName);
        try {
          const content = ydoc.getText('monaco').toString();
          await prisma.projectFile.update({
            where: { id: fileId },
            data: { content },
          });
        } catch (err) {
          console.error(`[Yjs] Failed to persist fileId=${fileId}:`, err);
        }
      }, 1000)
    );
  });
});

export function setupYjsWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(
      request.url || '',
      `http://${request.headers.host}`
    ).pathname;

    // Accept any path starting with /ws/collaboration
    // WebsocketProvider connects to: ws://host:port/ws/collaboration/<roomId>
    if (pathname.startsWith('/ws/collaboration')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, request) => {
    // setupWSConnection handles the full y-websocket protocol:
    // sync step 1/2, awareness broadcast, ping/pong keepalive.
    // It derives the docName from req.url automatically.
    setupWSConnection(ws, request);
  });

  return wss;
}
