import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Database, Info, ExternalLink } from "lucide-react";
import type { Plant, UserLocation } from "../types";
import type { LocationStatus } from "../hooks/useLocation";
import { LocationBar } from "../components/LocationBar";
import { InAppBrowser } from "../components/InAppBrowser";

interface ProfilePageProps {
  location: UserLocation | null;
  status: LocationStatus;
  locationError: string | null;
  onLocate: () => void;
  onSelectManual: (province: string, city: string) => void;
  onClear: () => void;

  garden: Plant[];
  onOpenGarden: () => void;

  /** 收藏提醒开关：本地图鉴浏览详情关闭后，是否弹出收藏问询条 */
  collectPromptEnabled: boolean;
  onToggleCollectPrompt: (enabled: boolean) => void;
}

const SOURCES: {
  title: string;
  detail: string;
  url?: string;
  linkText?: string;
  /**
   * 是否可在应用内 iframe 打开
   * iplant.cn 通过 CSP frame-ancestors 禁止被第三方页面内嵌（iframe 必然白屏），
   * 只能新标签 / 系统浏览器打开
   */
  inApp?: boolean;
}[] = [
  { title: "本地图鉴", detail: "内置 20 种常见室内植物的养护数据，离线可用" },
  {
    title: "植物百科",
    detail: "Wikipedia 中文百科摘要，仅保留植物类条目",
    url: "https://zh.wikipedia.org",
    linkText: "zh.wikipedia.org",
    inApp: true,
  },
  {
    title: "中国植物志",
    detail: "《中国植物志》在线版（植物智 iplant.cn），定位在中国时的联网检索源",
    url: "https://www.iplant.cn",
    linkText: "iplant.cn",
  },
  {
    title: "省级常见植物",
    detail: "口径为省内标本采集记录数降序，本期为模拟数据",
  },
];

export function ProfilePage({
  location,
  status,
  locationError,
  onLocate,
  onSelectManual,
  onClear,
  garden,
  onOpenGarden,
  collectPromptEnabled,
  onToggleCollectPrompt,
}: ProfilePageProps) {
  // 应用内浏览的数据来源站点（iframe 内嵌，不跳出应用）
  const [browsing, setBrowsing] = useState<{ url: string; title: string } | null>(
    null
  );

  const categories = new Map<string, number>();
  for (const plant of garden) {
    categories.set(plant.category, (categories.get(plant.category) ?? 0) + 1);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="mb-7">
        <h1 className="font-serif text-2xl text-ink">我的</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          定位、花园与数据来源设置。
        </p>
      </header>

      {/* 定位设置 */}
      <section>
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-sage-500">
          定位设置
        </h2>
        <LocationBar
          location={location}
          status={status}
          error={locationError}
          onLocate={onLocate}
          onSelectManual={onSelectManual}
          onClear={onClear}
        />
      </section>

      {/* 提醒设置 */}
      <section className="mt-8">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-sage-500">
          提醒设置
        </h2>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-sage-200 bg-white/80 px-5 py-4">
          <div>
            <p className="text-sm text-ink">收藏提醒</p>
            <p className="mt-0.5 text-xs leading-relaxed text-sage-500">
              收藏或移出植物时，先询问确认再操作
            </p>
          </div>
          <button
            role="switch"
            aria-checked={collectPromptEnabled}
            aria-label="收藏提醒"
            onClick={() => onToggleCollectPrompt(!collectPromptEnabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              collectPromptEnabled ? "bg-sage-600" : "bg-sage-200"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                collectPromptEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      {/* 花园统计 */}
      <section className="mt-8">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-sage-500">
          我的花园
        </h2>
        <button
          onClick={onOpenGarden}
          className="w-full rounded-2xl border border-sage-200 bg-white/80 px-5 py-5 text-left"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl text-ink">{garden.length}</span>
            <span className="text-sm text-sage-500">株植物已收藏</span>
            <Heart
              size={15}
              className="ml-auto text-rose-400"
              fill={garden.length > 0 ? "currentColor" : "none"}
            />
          </div>

          {categories.size > 0 ? (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-sage-200/70 pt-4">
              {[...categories].map(([name, count]) => (
                <span key={name} className="text-xs text-sage-600">
                  {name}
                  <span className="ml-1 text-sage-400">{count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-sage-400">
              在搜索结果中点击心形图标即可收藏植物
            </p>
          )}
        </button>
      </section>

      {/* 数据来源 */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-sage-500">
          <Database size={12} />
          数据来源
        </h2>
        <dl className="divide-y divide-sage-200/70 border-y border-sage-200/70">
          {SOURCES.map((source) => (
            <div key={source.title} className="py-3.5">
              <dt className="flex items-center justify-between gap-3 text-sm text-ink">
                <span>{source.title}</span>
                {source.url && (
                  <button
                    onClick={() => {
                      const url = source.url;
                      if (!url) return;
                      // iplant.cn 禁止 iframe 内嵌，直接在新标签/系统浏览器打开
                      if (source.inApp) {
                        setBrowsing({ url, title: source.title });
                      } else {
                        window.open(url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    aria-label={
                      source.inApp
                        ? `在应用内打开${source.title}`
                        : `在浏览器中打开${source.title}`
                    }
                    className="flex shrink-0 items-center gap-1 text-[11px] text-sage-600 underline decoration-sage-300 underline-offset-2 transition-colors active:text-sage-800"
                  >
                    {source.linkText}
                    <ExternalLink size={11} />
                  </button>
                )}
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-sage-500">
                {source.detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 隐私政策 */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-sage-500">
          <Info size={12} />
          隐私
        </h2>
        <button
          onClick={() => setBrowsing({ url: "/privacy.html", title: "隐私政策" })}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-sage-200 bg-white/80 px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm text-ink">隐私政策</p>
            <p className="mt-0.5 text-xs leading-relaxed text-sage-500">
              说明 App 存储什么数据、联网请求到哪里，全部本地处理
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-sage-600 underline decoration-sage-300 underline-offset-2">
            查看
            <ExternalLink size={11} />
          </span>
        </button>
      </section>

      {/* 关于 */}
      <section className="mt-8">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-sage-500">
          关于
        </h2>
        <div className="flex items-start gap-2 rounded-2xl bg-sage-100/50 px-4 py-4">
          <Info size={14} className="mt-0.5 shrink-0 text-sage-500" />
          <p className="text-xs leading-relaxed text-sage-600">
            植语 · Plant Care —— 手机端植物养护助手。定位权限仅在点击「定位」时申请，不会在启动时弹窗；未授权时图鉴保持离线数据，不触发网络定位。
          </p>
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-sage-400">
        植语 · Plant Care · 数据仅供参考
      </p>

      {/* 应用内浏览层：iframe 内嵌打开数据来源站点 */}
      <AnimatePresence>
        {browsing && (
          <InAppBrowser
            url={browsing.url}
            title={browsing.title}
            onClose={() => setBrowsing(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
