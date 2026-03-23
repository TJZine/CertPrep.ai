import Script from "next/script";
import type { ReactElement } from "react";

export function ServiceWorkerInitScript({
  nonce,
}: {
  nonce?: string;
}): ReactElement {
  return (
    <Script id="sw-init" nonce={nonce} strategy="afterInteractive">
      {`if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(e){console.error('[SW] Failed:',e);});}`}
    </Script>
  );
}
