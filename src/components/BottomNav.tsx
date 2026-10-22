import { motion } from "framer-motion";
import { Home, BookOpen, Heart, User } from "lucide-react";

/** 四个一级页面 */
export type PageKey = "home" | "atlas" | "garden" | "profile";

const TABS: { key: PageKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "首页", icon: Home },
  { key: "atlas", label: "本地图鉴", icon: BookOpen },
  { key: "garden", label: "我的花园", icon: Heart },
  { key: "profile", label: "我的", icon: User },
];

interface BottomNavProps {
  page: PageKey;
  onChange: (page: PageKey) => void;
}

/**
 * 手机 App 的固定底部标签栏（含 iPhone 底部安全区）
 * 四个页签文案固定为：首页 / 本地图鉴 / 我的花园 / 我的
 * 收藏数量不在标签栏显示，统一在「我的花园」页内展示
 */
export function BottomNav({ page, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-sage-200/70 bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = page === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              aria-current={active ? "page" : undefined}
              className="relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1.5 pt-2.5"
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-sage-600"
                />
              )}

              <Icon
                size={20}
                strokeWidth={active ? 2.1 : 1.6}
                fill={tab.key === "garden" && active ? "currentColor" : "none"}
                className={active ? "text-sage-700" : "text-sage-400"}
              />

              <span
                className={`text-[11px] leading-none ${
                  active ? "font-medium text-sage-700" : "text-sage-400"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
