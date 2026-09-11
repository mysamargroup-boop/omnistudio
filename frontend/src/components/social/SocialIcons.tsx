"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SocialIconProps {
  platform: string;
  className?: string;
  size?: number;
  showBg?: boolean;
}

export default function SocialIcon({
  platform,
  className = "w-5 h-5",
  size = 20,
  showBg = true,
}: SocialIconProps) {
  const p = platform.toLowerCase();

  // 1. INSTAGRAM
  if (p === "instagram" || p === "ig" || p === "insta") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && (
          <>
            <defs>
              <linearGradient id="ig-grad-full" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f09433" />
                <stop offset="25%" stopColor="#e6683c" />
                <stop offset="50%" stopColor="#dc2743" />
                <stop offset="75%" stopColor="#cc2366" />
                <stop offset="100%" stopColor="#bc1888" />
              </linearGradient>
            </defs>
            <rect width="24" height="24" rx="6" fill="url(#ig-grad-full)" />
          </>
        )}
        <rect
          x={showBg ? "5.5" : "2.5"}
          y={showBg ? "5.5" : "2.5"}
          width={showBg ? "13" : "19"}
          height={showBg ? "13" : "19"}
          rx={showBg ? "3.5" : "5"}
          stroke={showBg ? "#FFFFFF" : "currentColor"}
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="12"
          r={showBg ? "3.5" : "4.5"}
          stroke={showBg ? "#FFFFFF" : "currentColor"}
          strokeWidth="1.8"
        />
        <circle
          cx={showBg ? "15.8" : "17"}
          cy={showBg ? "8.2" : "7"}
          r="1"
          fill={showBg ? "#FFFFFF" : "currentColor"}
        />
      </svg>
    );
  }

  // 2. TIKTOK
  if (p === "tiktok" || p === "tt") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#010101" />}
        <g transform={showBg ? "translate(1.5, 1.5) scale(0.88)" : "translate(0, 0)"}>
          <path
            d="M16.5 8.2c-1.1-.3-2-1.1-2.3-2.2H12v10.5c0 1.5-1.2 2.7-2.7 2.7S6.6 18 6.6 16.5s1.2-2.7 2.7-2.7c.3 0 .6.1.9.2v-2.4c-.3 0-.6-.1-.9-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V9.7c1.3.9 2.9 1.4 4.6 1.4v-2.3c-.2-.4-.4-.5-.7-.6z"
            fill="#00F2FE"
          />
          <path
            d="M17.1 8.7c-1.1-.3-2-1.1-2.3-2.2h-2.3v10.5c0 1.5-1.2 2.7-2.7 2.7s-2.7-1.2-2.7-2.7 1.2-2.7 2.7-2.7c.3 0 .6.1.9.2V12c-.3 0-.6-.1-.9-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V10.2c1.3.9 2.9 1.4 4.6 1.4V9.3c-.2-.4-.4-.5-.7-.6z"
            fill="#FE2C55"
          />
          <path
            d="M16.8 8.4c-1.1-.3-2-1.1-2.3-2.2h-2.3v10.5c0 1.5-1.2 2.7-2.7 2.7s-2.7-1.2-2.7-2.7 1.2-2.7 2.7-2.7c.3 0 .6.1.9.2v-2.4c-.3 0-.6-.1-.9-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V9.9c1.3.9 2.9 1.4 4.6 1.4V9c-.2-.4-.4-.5-.7-.6z"
            fill="#FFFFFF"
          />
        </g>
      </svg>
    );
  }

  // 3. YOUTUBE SHORTS
  if (p === "youtube_shorts" || p === "shorts" || p === "ys") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#FF0000" />}
        <g transform={showBg ? "translate(1, 1) scale(0.92)" : "translate(0, 0)"}>
          <path
            d="M14.8 6.5c-1.2-.8-2.9-.5-3.8.7L9.2 9.9c-.6.9-.4 2.1.5 2.7l.8.5-1.9 1.2c-1.2.8-1.5 2.3-.8 3.5.7 1.1 2.3 1.5 3.5.8l2.2-1.4c-.9-.6-1.1-1.8-.5-2.7l1.8-2.7c.6-.9.4-2.1-.5-2.7l-.8-.5 1.9-1.2c1.2-.8 1.5-2.3.8-3.5-.3-.4-.6-.7-1-.9z"
            fill="#FFFFFF"
          />
          <polygon points="10.8,9.8 14.5,12 10.8,14.2" fill="#FF0000" />
        </g>
      </svg>
    );
  }

  // 4. YOUTUBE VIDEO
  if (p === "youtube_videos" || p === "youtube" || p === "yt") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#CC0000" />}
        <path
          d="M19.5 8.2c-.2-.9-.9-1.6-1.8-1.8C16.1 6 12 6 12 6s-4.1 0-5.7.4c-.9.2-1.6.9-1.8 1.8-.4 1.6-.4 5-.4 5s0 3.4.4 5c.2.9.9 1.6 1.8 1.8 1.6.4 5.7.4 5.7.4s4.1 0 5.7-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-5 .4-5s0-3.4-.4-5z"
          fill={showBg ? "#FFFFFF" : "#FF0000"}
        />
        <polygon points="10.5,9.5 15,12 10.5,14.5" fill={showBg ? "#CC0000" : "#FFFFFF"} />
      </svg>
    );
  }

  // 5. X / TWITTER
  if (p === "twitter" || p === "x" || p === "x_twitter") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#000000" />}
        <path
          d="M15.4 6h1.9l-4.2 4.8 5 6.4h-3.9l-3.1-4-3.5 4H5.7l4.5-5.2L5.4 6h4l2.8 3.7L15.4 6zm-.7 10h1L8.5 7.1H7.4l7.3 8.9z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 6. LINKEDIN PERSONAL
  if (p === "linkedin_personal" || p === "linkedin" || p === "li") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#0A66C2" />}
        <path
          d="M7.5 9.5h2.2v7.2H7.5V9.5zm1.1-3.6c.8 0 1.4.6 1.4 1.4 0 .7-.6 1.3-1.4 1.3-.7 0-1.3-.6-1.3-1.3 0-.8.6-1.4 1.3-1.4zm3.6 3.6h2.1v1h.1c.3-.6 1.1-1.2 2.2-1.2 2.3 0 2.8 1.5 2.8 3.5v3.9H17.2v-3.4c0-.8 0-1.8-1.1-1.8-1.1 0-1.3.9-1.3 1.8v3.4h-2.2V9.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 7. LINKEDIN COMPANY
  if (p === "linkedin_company" || p === "lc") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#004182" />}
        <path
          d="M7 9.5h2.1v7.2H7V9.5zm1.1-3.6c.7 0 1.3.6 1.3 1.3 0 .8-.6 1.4-1.3 1.4-.8 0-1.4-.6-1.4-1.4 0-.7.6-1.3 1.4-1.3zm3.5 3.6h2v1h.1c.3-.6 1-1.2 2.1-1.2 2.2 0 2.6 1.5 2.6 3.5v3.9H17.2v-3.4c0-.8 0-1.8-1.1-1.8-1.1 0-1.3.9-1.3 1.8v3.4h-2.2V9.5z"
          fill="#FFFFFF"
        />
        <circle cx="18.5" cy="5.5" r="2.2" fill="#38BDF8" />
      </svg>
    );
  }

  // 8. FACEBOOK PAGES
  if (p === "facebook_pages" || p === "facebook" || p === "fb") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#1877F2" />}
        <path
          d="M15 12.3l.5-3.3h-3.2V6.8c0-.9.4-1.8 1.9-1.8h1.4V2.2c-.3 0-1.4-.1-2.6-.1-2.7 0-4.4 1.6-4.4 4.5v2.4H5.7v3.3h2.9v8h3.9v-8H15z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 9. FACEBOOK GROUPS
  if (p === "facebook_groups" || p === "fg") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#0A7CFF" />}
        <path
          d="M9.5 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm5 0a2 2 0 100-4 2 2 0 000 4zm-5 1.5c-2.3 0-6 1.2-6 3.5V17h12v-2.5c0-2.3-3.7-3.5-6-3.5zm5 0c-.3 0-.7 0-1.2.1 1.1.8 1.7 1.8 1.7 3.4V17h5v-2.5c0-2.3-3.7-3.5-5.5-3.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 10. THREADS
  if (p === "threads" || p === "th") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#000000" />}
        <path
          d="M12.4 5.2c-3.7 0-6.7 3-6.7 6.8s3 6.8 6.7 6.8c2.2 0 4.1-1 5.3-2.8l-1.5-1c-.9 1.3-2.3 2-3.8 2-2.7 0-4.8-2.1-4.8-4.9s2.1-4.9 4.8-4.9c2.5 0 4.5 1.8 4.7 4.3h-4.8c0 1.2.9 2 2.1 2 .8 0 1.5-.4 1.9-1l1.4 1c-.8 1.2-2 1.8-3.3 1.8-2.2 0-3.9-1.6-3.9-3.9s1.7-3.9 3.9-3.9c1.1 0 2.1.4 2.8 1.1.7.8 1.1 1.7 1.1 2.8 0 3.2-2.4 5.8-5.8 5.8-3.6 0-6.6-2.9-6.6-6.6s3-6.6 6.6-6.6c2.4 0 4.6 1.3 5.7 3.3l1.5-1c-1.4-2.5-4-4-7.2-4z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 11. PINTEREST
  if (p === "pinterest" || p === "pin") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#BD081C" />}
        <path
          d="M12 5C8.1 5 5 8.1 5 12c0 3 1.8 5.5 4.5 6.5-.1-.6-.1-1.4.1-2.1l1.2-5.1s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.7 0-2.5-1.8-4.2-4.3-4.2-2.9 0-4.6 2.2-4.6 4.5 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.2c0 .2-.1.2-.3.1-1.2-.5-1.9-2.2-1.9-3.5 0-2.9 2.1-5.5 6-5.5 3.2 0 5.6 2.3 5.6 5.3 0 3.1-2 5.7-4.7 5.7-1 0-1.8-.5-2.1-1.1l-.6 2.2c-.2.8-.8 1.9-1.2 2.5 1 .3 2.1.5 3.2.5 3.9 0 7-3.1 7-7s-3.1-7-7-7z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 12. SNAPCHAT
  if (p === "snapchat" || p === "sc") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#FFFC00" />}
        <g transform="translate(1, 1) scale(0.92)">
          <path
            d="M12 6.5c-2.3 0-3.6 1.7-3.6 3.5 0 .5.2 1.3.2 1.4s-.3.1-.6.1c-.4 0-.9-.2-1.1-.3-.2-.1-.3 0-.3.1s-.1.6.4.9c.5.3 1.1.4 1.4.5.1 0 .2.1.1.3-.3.8-.9 1.4-1.9 1.6-.2 0-.3.2-.3.3 0 .2.3.3.7.4.8.2 1.5.2 2.2.8.2.2.4.5.7.5.3 0 .5-.3.8-.5.6-.4 1.3-.7 2.1-.7s1.5.3 2.1.7c.3.2.5.5.8.5.3 0 .5-.3.7-.5.7-.6 1.4-.6 2.2-.8.4-.1.7-.2.7-.4 0-.1-.1-.3-.3-.3-1-.2-1.6-.8-1.9-1.6-.1-.2 0-.3.1-.3.3-.1.9-.2 1.4-.5.5-.3.4-.8.4-.9 0-.1-.1-.2-.3-.1-.2.1-.7.3-1.1.3-.3 0-.6 0-.6-.1s.2-.9.2-1.4c0-1.8-1.3-3.5-3.6-3.5z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="0.8"
          />
        </g>
      </svg>
    );
  }

  // 13. TELEGRAM
  if (p === "telegram" || p === "tg") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#229ED9" />}
        <path
          d="M6 11.8l3.6 1.4 1.4 4.3c.2.5.8.6 1.1.2l2-1.9 4.1 3c.5.4 1.2.1 1.3-.6l2.3-11.2c.1-.7-.5-1.2-1.1-.9L4.8 10.5c-.7.3-.6 1.3 1.2 1.3zm4.7 1.1l7.1-4.4c.2-.1.4.1.2.3l-5.9 5.3-.3 2.2-1.1-3.4z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 14. WHATSAPP
  if (p === "whatsapp" || p === "wa") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#25D366" />}
        <path
          d="M12 5.5c-3.6 0-6.5 2.9-6.5 6.5 0 1.2.3 2.3.9 3.3L5.5 18.5l3.3-.9c1 .5 2.1.8 3.2.8 3.6 0 6.5-2.9 6.5-6.5S15.6 5.5 12 5.5zm3.8 9.2c-.2.4-.9.8-1.3.8-.4 0-.8.1-2.4-.6-1.9-.8-3.1-2.8-3.2-2.9-.1-.1-.8-1.1-.8-2.1 0-1 .5-1.5.7-1.7.2-.2.4-.2.6-.2h.4c.2 0 .3 0 .5.4.2.4.6 1.4.6 1.5 0 .1 0 .3-.1.4l-.3.3c-.1.1-.2.2-.1.4.3.5.7 1.1 1.2 1.5.7.5 1.2.7 1.4.8.2.1.3 0 .4-.1l.5-.6c.1-.2.3-.2.5-.1.2.1 1.2.6 1.4.7.2.1.3.2.3.3.1.2.1.7-.1 1z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 15. GOOGLE BUSINESS
  if (p === "google_business" || p === "gb" || p === "google") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {showBg && <rect width="24" height="24" rx="6" fill="#4285F4" />}
        <g transform="translate(1, 1) scale(0.92)">
          <path
            d="M17.5 12.2c0-.5 0-.9-.1-1.3H12v2.5h3.1c-.1.8-.5 1.5-1.2 1.9v1.6h2c1.2-1.1 1.7-2.7 1.7-4.7z"
            fill="#FFFFFF"
          />
          <path
            d="M12 17.8c1.6 0 2.9-.5 3.9-1.4l-2-1.6c-.5.4-1.2.6-1.9.6-1.5 0-2.7-1-3.2-2.3H6.8v1.6c1 2 3.1 3.1 5.2 3.1z"
            fill="#34A853"
          />
          <path
            d="M8.8 13.1c-.1-.4-.2-.8-.2-1.1 0-.4.1-.8.2-1.1V9.3H6.8c-.4.9-.7 1.8-.7 2.7s.3 1.8.7 2.7l2-1.6z"
            fill="#FBBC05"
          />
          <path
            d="M12 8.7c.9 0 1.6.3 2.2.9l1.6-1.6C14.9 7 13.6 6.5 12 6.5c-2.1 0-4.2 1.1-5.2 3.1l2 1.6c.5-1.3 1.7-2.5 3.2-2.5z"
            fill="#EA4335"
          />
        </g>
      </svg>
    );
  }

  // Fallback generic globe
  return (
    <div
      className={cn("rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold text-[10px]", className)}
      style={{ width: size, height: size }}
    >
      {platform.slice(0, 2).toUpperCase()}
    </div>
  );
}
