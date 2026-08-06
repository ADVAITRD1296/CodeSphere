import React from 'react';
import '../styles/globals.css';

export const metadata = {
  title: 'CodeSphere - Real-Time Collaborative Code Editor & Execution Platform',
  description: 'Production-grade cloud IDE supporting conflict-free real-time multiplayer code editing and sandboxed remote execution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
