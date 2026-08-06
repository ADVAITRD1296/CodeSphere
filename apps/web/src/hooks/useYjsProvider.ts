import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import type { editor } from 'monaco-editor';

const WS_SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws/collaboration';

export function useYjsProvider(
  fileId: string | null,
  editorInstance: editor.IStandaloneCodeEditor | null,
  username?: string,
  userColor?: string
) {
  const [isSynced, setIsSynced] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    if (!fileId || !editorInstance) return;

    const doc = new Y.Doc();
    docRef.current = doc;

    // Connect to Yjs WebSocket Server
    const provider = new WebsocketProvider(WS_SERVER_URL, fileId, doc, {
      connect: true,
      params: { fileId }
    });

    providerRef.current = provider;

    provider.on('status', (event: { status: string }) => {
      setIsSynced(event.status === 'connected');
    });

    // Set User Awareness metadata for cursors
    if (username && userColor) {
      provider.awareness.setLocalStateField('user', {
        name: username,
        color: userColor
      });
    }

    const ytext = doc.getText('monaco');
    const model = editorInstance.getModel();

    if (model) {
      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([editorInstance]),
        provider.awareness
      );
      bindingRef.current = binding;
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
    };
  }, [fileId, editorInstance, username, userColor]);

  return { isSynced };
}
