"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaXTwitter,
  FaLinkedin,
  FaFacebook,
  FaThreads,
  FaPinterest,
  FaSnapchat,
  FaTelegram,
  FaWhatsapp,
  FaGoogle,
  FaUsers,
  FaBuilding,
  FaStore
} from "react-icons/fa6";
import { SiYoutubeshorts } from "react-icons/si";

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

  const iconSize = showBg ? Math.round(size * 0.58) : size;

  // 1. INSTAGRAM
  if (p === "instagram" || p === "ig" || p === "insta") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl flex items-center justify-center shrink-0 shadow-xs bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white",
            className
          )}
        >
          <FaInstagram size={iconSize} />
        </div>
      );
    }
    return <FaInstagram size={size} className={cn("text-[#E1306C] shrink-0", className)} />;
  }

  // 2. TIKTOK
  if (p === "tiktok" || p === "tt") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-black flex items-center justify-center shrink-0 shadow-xs text-white border border-zinc-800",
            className
          )}
        >
          <FaTiktok size={iconSize} className="drop-shadow-[1px_1px_0px_rgba(37,244,238,0.9)]" />
        </div>
      );
    }
    return <FaTiktok size={size} className={cn("text-black dark:text-white shrink-0", className)} />;
  }

  // 3. YOUTUBE SHORTS
  if (p === "youtube_shorts" || p === "yt_shorts" || p === "shorts") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#FF0000] flex items-center justify-center shrink-0 shadow-xs text-white",
            className
          )}
        >
          <SiYoutubeshorts size={iconSize} />
        </div>
      );
    }
    return <SiYoutubeshorts size={size} className={cn("text-[#FF0000] shrink-0", className)} />;
  }

  // 4. YOUTUBE VIDEO
  if (p === "youtube_video" || p === "youtube" || p === "yt") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#FF0000] flex items-center justify-center shrink-0 shadow-xs text-white",
            className
          )}
        >
          <FaYoutube size={iconSize} />
        </div>
      );
    }
    return <FaYoutube size={size} className={cn("text-[#FF0000] shrink-0", className)} />;
  }

  // 5. X (TWITTER)
  if (p === "twitter" || p === "x" || p === "x_twitter") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-black flex items-center justify-center shrink-0 shadow-xs text-white border border-zinc-800",
            className
          )}
        >
          <FaXTwitter size={iconSize} />
        </div>
      );
    }
    return <FaXTwitter size={size} className={cn("text-black dark:text-white shrink-0", className)} />;
  }

  // 6. LINKEDIN PERSONAL
  if (p === "linkedin_personal" || p === "linkedin" || p === "li") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#0A66C2] flex items-center justify-center shrink-0 shadow-xs text-white",
            className
          )}
        >
          <FaLinkedin size={iconSize} />
        </div>
      );
    }
    return <FaLinkedin size={size} className={cn("text-[#0A66C2] shrink-0", className)} />;
  }

  // 7. LINKEDIN COMPANY
  if (p === "linkedin_company" || p === "linkedin_org") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#0A66C2] flex items-center justify-center shrink-0 shadow-xs text-white relative",
            className
          )}
        >
          <FaLinkedin size={iconSize} />
          <div className="absolute -bottom-0.5 -right-0.5 bg-zinc-950 text-white rounded-full p-0.5 border border-white/40 shadow-xs">
            <FaBuilding className="w-2 h-2 text-white" />
          </div>
        </div>
      );
    }
    return (
      <div className="relative inline-flex items-center">
        <FaLinkedin size={size} className={cn("text-[#0A66C2] shrink-0", className)} />
        <FaBuilding className="w-2.5 h-2.5 text-zinc-600 dark:text-zinc-300 absolute -bottom-0.5 -right-0.5" />
      </div>
    );
  }

  // 8. FACEBOOK PAGES
  if (p === "facebook_pages" || p === "facebook" || p === "fb") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0 shadow-xs text-white",
            className
          )}
        >
          <FaFacebook size={iconSize} />
        </div>
      );
    }
    return <FaFacebook size={size} className={cn("text-[#1877F2] shrink-0", className)} />;
  }

  // 9. FACEBOOK GROUPS
  if (p === "facebook_groups" || p === "fb_groups") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0 shadow-xs text-white relative",
            className
          )}
        >
          <FaFacebook size={iconSize} />
          <div className="absolute -bottom-0.5 -right-0.5 bg-zinc-950 text-white rounded-full p-0.5 border border-white/40 shadow-xs">
            <FaUsers className="w-2 h-2 text-white" />
          </div>
        </div>
      );
    }
    return (
      <div className="relative inline-flex items-center">
        <FaFacebook size={size} className={cn("text-[#1877F2] shrink-0", className)} />
        <FaUsers className="w-2.5 h-2.5 text-zinc-600 dark:text-zinc-300 absolute -bottom-0.5 -right-0.5" />
      </div>
    );
  }

  // 10. THREADS
  if (p === "threads") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-black flex items-center justify-center shrink-0 shadow-xs text-white border border-zinc-800",
            className
          )}
        >
          <FaThreads size={iconSize} />
        </div>
      );
    }
    return <FaThreads size={size} className={cn("text-black dark:text-white shrink-0", className)} />;
  }

  // 11. PINTEREST
  if (p === "pinterest" || p === "pin") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#E60023] flex items-center justify-center shrink-0 shadow-xs text-white",
            className
          )}
        >
          <FaPinterest size={iconSize} />
        </div>
      );
    }
    return <FaPinterest size={size} className={cn("text-[#E60023] shrink-0", className)} />;
  }

  // 12. SNAPCHAT
  if (p === "snapchat_spotlight" || p === "snapchat" || p === "sc") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#FFFC00] flex items-center justify-center shrink-0 shadow-xs text-black border border-yellow-400",
            className
          )}
        >
          <FaSnapchat size={iconSize} />
        </div>
      );
    }
    return <FaSnapchat size={size} className={cn("text-[#FFFC00] shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]", className)} />;
  }

  // 13. TELEGRAM
  if (p === "telegram_channels" || p === "telegram" || p === "tg") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#24A1DE] flex items-center justify-center shrink-0 shadow-xs text-white",
            className
          )}
        >
          <FaTelegram size={iconSize} />
        </div>
      );
    }
    return <FaTelegram size={size} className={cn("text-[#24A1DE] shrink-0", className)} />;
  }

  // 14. WHATSAPP
  if (p === "whatsapp_channels" || p === "whatsapp" || p === "wa") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#25D366] flex items-center justify-center shrink-0 shadow-xs text-white",
            className
          )}
        >
          <FaWhatsapp size={iconSize} />
        </div>
      );
    }
    return <FaWhatsapp size={size} className={cn("text-[#25D366] shrink-0", className)} />;
  }

  // 15. GOOGLE BUSINESS PROFILE
  if (p === "google_business" || p === "google" || p === "gbp") {
    if (showBg) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "rounded-xl bg-[#4285F4] flex items-center justify-center shrink-0 shadow-xs text-white relative",
            className
          )}
        >
          <FaStore size={iconSize} />
          <div className="absolute -bottom-0.5 -right-0.5 bg-white text-[#4285F4] rounded-full p-0.5 shadow-xs">
            <FaGoogle className="w-1.5 h-1.5" />
          </div>
        </div>
      );
    }
    return (
      <div className="relative inline-flex items-center">
        <FaStore size={size} className={cn("text-[#4285F4] shrink-0", className)} />
        <FaGoogle className="w-2.5 h-2.5 text-[#EA4335] absolute -bottom-0.5 -right-0.5" />
      </div>
    );
  }

  // Generic Fallback
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "rounded-xl bg-zinc-700 flex items-center justify-center shrink-0 text-white font-bold text-[10px]",
        className
      )}
    >
      {platform.slice(0, 2).toUpperCase()}
    </div>
  );
}
