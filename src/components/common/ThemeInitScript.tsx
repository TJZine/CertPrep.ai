import type { ReactElement } from "react";

export function ThemeInitScript({ nonce }: { nonce?: string }): ReactElement {
  return (
    <script
      id="theme-init"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html:
          "(function(){try{const stored=localStorage.getItem('theme');const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;const shouldDark=stored==='dark'||(!stored&&prefersDark);const root=document.documentElement;if(shouldDark){root.classList.add('dark');}else{root.classList.remove('dark');}}catch(e){}})();",
      }}
    />
  );
}
