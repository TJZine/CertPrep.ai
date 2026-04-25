import Script from "next/script";
import type { ReactElement } from "react";

export function ThemeInitScript({ nonce }: { nonce?: string }): ReactElement {
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="theme-init" nonce={nonce} strategy="beforeInteractive">
      {`(function(){try{const stored=localStorage.getItem('theme');const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;const shouldDark=stored==='dark'||(!stored&&prefersDark);const root=document.documentElement;if(shouldDark){root.classList.add('dark');}else{root.classList.remove('dark');}}catch(e){}})();`}
    </Script>
  );
}
