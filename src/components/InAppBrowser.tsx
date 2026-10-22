import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

interface InAppBrowserProps {
  url: string;
  title: string;
  onClose: () => void;
}

/**
 * 应用内浏览器层：以 iframe 内嵌打开外部站点，不跳出应用
 * 顶栏提供返回关闭与「在浏览器中打开」的兜底入口
 */
export function InAppBrowser({ url, title, onClose }: InAppBrowserProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[70] flex flex-col bg-cream"
      role="dialog"
      aria-modal="true"
      aria-label={`${title}浏览`}
    >
      {/* 顶栏 */}
      <header className="flex shrink-0 items-center gap-2 border-b border-sage-200 bg-white/90 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button
          onClick={onClose}
          aria-label="关闭并返回"
          className="flex h-9 w-9 items-center justify-center rounded-full text-sage-600 transition-colors active:bg-sage-100"
        >
          <ArrowLeft size={20} />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm text-ink">{title}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="在浏览器中打开"
          className="flex h-9 w-9 items-center justify-center rounded-full text-sage-500 transition-colors active:bg-sage-100"
        >
          <ExternalLink size={16} />
        </a>
      </header>

      {/* 页面内容 */}
      <div className="relative min-h-0 flex-1">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 size={22} className="animate-spin text-sage-500" />
            <p className="text-xs text-sage-500">正在加载 {url} …</p>
          </div>
        )}
        <iframe
          src={url}
          title={title}
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </motion.div>
  );
}
