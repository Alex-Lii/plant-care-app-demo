import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

/**
 * 启动等待页（Splash）
 * 与整体「克制的有机极简」一致：奶油纸感底 + 衬线字标 + 一根细线生长
 * 由 App 控制展示时长，退出时整体淡出
 */
export function Splash() {
  return (
    <motion.div
      key="splash"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream"
    >
      {/* 叶片标记：轻微上浮 + 呼吸 */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-700 text-white"
      >
        <motion.span
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex"
        >
          <Leaf size={24} />
        </motion.span>
      </motion.div>

      {/* 字标 */}
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 font-serif text-3xl text-ink"
      >
        植语
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-2 text-[11px] uppercase tracking-[0.28em] text-sage-500"
      >
        Plant Care
      </motion.p>

      {/* 细线生长动画（进度暗示，不用转圈） */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 h-px w-24 origin-left bg-sage-300"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-4 text-xs text-sage-400"
      >
        正在唤醒你的植物…
      </motion.p>
    </motion.div>
  );
}
