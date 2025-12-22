import * as React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Google Gemini sparkle mark icon.
 * Uses currentColor for theme compatibility.
 */
export function GeminiIcon({
  size = 24,
  className,
  ...props
}: IconProps): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Gemini-inspired four-point sparkle */}
      <path d="M12 2C12 2 12 8 12 12C12 8 12 2 12 2Z" fill="currentColor" />
      <path d="M12 22C12 22 12 16 12 12C12 16 12 22 12 22Z" fill="currentColor" />
      <path d="M2 12C2 12 8 12 12 12C8 12 2 12 2 12Z" fill="currentColor" />
      <path d="M22 12C22 12 16 12 12 12C16 12 22 12 22 12Z" fill="currentColor" />
      {/* Four-point star shape */}
      <path
        d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export default GeminiIcon;
