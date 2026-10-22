import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Leaf } from "lucide-react";

interface LocalGridCardProps {
  name: string;
  sciName: string;
  imageUrl?: string;
  index: number;
  /** 左上角角标（如省排行名次 No.3） */
  badge?: string;
  /** 底部辅助行（如标本记录数） */
  footer?: string;
  /** 已收藏时心形为填充态 */
  collected?: boolean;
  /** 为空时不渲染心形（无养护资料的纯展示行不可收藏） */
  onToggleHeart?: () => void;
  /** 为空时整卡不可点击 */
  onClick?: () => void;
}

/**
 * 本地图鉴的紧凑网格卡片（一排三个）
 * 离线数组与省级排行共用；收藏状态用心形表达，无养护资料的行仅展示
 */
export function LocalGridCard({
  name,
  sciName,
  imageUrl,
  index,
  badge,
  footer,
  collected = false,
  onToggleHeart,
  onClick,
}: LocalGridCardProps) {
  const clickable = Boolean(onClick);
  // 图片加载失败时回退为叶子图标（记录失败的 url，换图后自动重置）
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.03, 0.3),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative min-w-0"
    >
      <button
        onClick={onClick}
        disabled={!clickable}
        className={`w-full text-left ${clickable ? "" : "cursor-default"}`}
      >
        <span className="relative block aspect-square overflow-hidden rounded-xl bg-sage-100">
          {showImage ? (
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              onError={() => setFailedUrl(imageUrl ?? null)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Leaf size={22} className="text-sage-400" />
            </span>
          )}
          {badge && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-white/85 px-1.5 py-0.5 text-[9px] font-medium leading-none text-sage-600 backdrop-blur-sm">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1.5 block truncate text-[12.5px] text-ink">
          {name}
        </span>
        <span className="block truncate text-[9.5px] italic text-sage-500">
          {sciName}
        </span>
        {footer && (
          <span className="mt-0.5 block text-[9px] text-sage-400">
            {footer}
          </span>
        )}
      </button>

      {onToggleHeart && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleHeart();
          }}
          aria-label={collected ? "移出花园" : "加入花园"}
          className={`absolute right-1.5 top-1.5 flex h-[26px] w-[26px] items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
            collected ? "bg-rose-500 text-white" : "bg-white/85 text-sage-500"
          }`}
        >
          <Heart size={13} fill={collected ? "currentColor" : "none"} />
        </button>
      )}
    </motion.div>
  );
}
