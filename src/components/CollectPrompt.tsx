import { motion } from "framer-motion";
import { Heart, HeartCrack } from "lucide-react";
import type { Plant } from "../types";

interface CollectPromptProps {
  plant: Plant;
  /** collect=收藏确认；remove=移出花园确认 */
  kind: "collect" | "remove";
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * 收藏/移出确认条（所有界面：首页 / 本地植物百科 / 我的花园 / 详情面板）
 * 仅在用户主动点击心形时弹出：模态询问，必须选择「收藏 / 移出」或「暂不」后才能继续操作
 */
export function CollectPrompt({
  plant,
  kind,
  onConfirm,
  onDismiss,
}: CollectPromptProps) {
  const isCollect = kind === "collect";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="dialog"
      aria-modal="true"
      aria-label={isCollect ? `收藏${plant.name}` : `移出${plant.name}`}
      className="fixed inset-0 z-[60]"
    >
      {/* 遮罩：不响应点击，强制用户做出选择后才能继续 */}
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mx-auto max-w-md px-5"
      >
        <div className="rounded-2xl border border-sage-200 bg-white/95 p-4 shadow-lg shadow-sage-900/10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            {isCollect ? (
              <Heart size={16} className="shrink-0 text-rose-400" />
            ) : (
              <HeartCrack size={16} className="shrink-0 text-rose-500" />
            )}
            <p className="flex-1 text-sm text-ink">
              {isCollect
                ? `收藏「${plant.name}」到我的花园吗？`
                : `将「${plant.name}」移出我的花园吗？`}
            </p>
          </div>

          <div className="mt-3 flex gap-2.5">
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-xl py-2.5 text-sm text-white transition-colors ${
                isCollect
                  ? "bg-sage-700 active:bg-sage-800"
                  : "bg-rose-500 active:bg-rose-600"
              }`}
            >
              {isCollect ? "收藏" : "移出"}
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 rounded-xl border border-sage-200 py-2.5 text-sm text-sage-600 transition-colors active:bg-sage-50"
            >
              暂不
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
