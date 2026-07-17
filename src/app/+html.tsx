import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web-only root HTML for static rendering.
 * Runs in Node during `expo export -p web` — no browser APIs here.
 */
export default function Root ({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#C1502E" />
        <meta name="description" content="Track which countries you've visited on an interactive world map." />

        {/* PWA / Add to Home Screen (especially iOS Safari) */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Field Atlas" />
        <meta name="mobile-web-app-capable" content="yes" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
