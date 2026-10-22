import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sun,
  Droplets,
  Wind,
  Thermometer,
  FlaskConical,
  Gauge,
  Skull,
  Heart,
  Leaf,
  CheckCircle2,
  Globe,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import type { Plant } from "../types";

interface PlantDetailProps {
  plant: Plant | null;
  inGarden: boolean;
  onToggleGarden: (plant: Plant) => void;
  onClose: () => void;
}

export function PlantDetail({
  plant,
  inGarden,
  onToggleGarden,
  onClose,
}: PlantDetailProps) {
  // 顶部大图加载失败时回退为叶子图标（记录失败的 url，换植物后自动重置）
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(plant?.imageUrl) && failedUrl !== plant?.imageUrl;

  return (
    <AnimatePresence>
      {plant && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-sage-950/40 backdrop-blur-sm"
          />

          {/* 面板 */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream"
          >
            {/* 顶部图片区 */}
            <div className="relative h-[214px] shrink-0 overflow-hidden bg-sage-200">
              {showImage ? (
                <img
                  src={plant.imageUrl}
                  alt={plant.name}
                  onError={() => setFailedUrl(plant.imageUrl)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Leaf size={64} className="text-sage-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-sage-950/72 via-sage-950/10 to-transparent" />

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sage-700 backdrop-blur-md"
                aria-label="关闭"
              >
                <X size={15} />
              </button>

              {/* 来源标签 */}
              {plant.source === "online" && (
                <div className="absolute left-3.5 top-3.5 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-medium text-sage-600 backdrop-blur-md">
                  <Globe size={11} />
                  {plant.externalUrl ? "来自中国植物志" : "来自植物百科"}
                </div>
              )}

              {/* 名称 */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="mb-2">
                  <span className="inline-block rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-sage-700">
                    {plant.category}
                  </span>
                </div>
                <h2 className="font-serif text-[28px] leading-tight text-white">
                  {plant.name}
                </h2>
                {plant.scientificName && (
                  <p className="mt-1 text-[11.5px] italic text-sage-200">
                    {plant.scientificName}
                  </p>
                )}
              </div>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="p-6">
                {/* 收藏按钮 */}
                <button
                  onClick={() => onToggleGarden(plant)}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-all duration-200 ${
                    inGarden
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-sage-700 text-white hover:bg-sage-800"
                  }`}
                >
                  <Heart size={18} fill={inGarden ? "currentColor" : "none"} />
                  {inGarden ? "已加入我的花园" : "加入我的花园"}
                </button>

                {/* 条目原文页（中国植物志等站点禁止 iframe 内嵌，在新标签/系统浏览器打开） */}
                {plant.externalUrl && (
                  <a
                    href={plant.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-sage-200 bg-white/80 py-3.5 text-sm font-medium text-sage-700 transition-colors active:bg-sage-100"
                  >
                    <ExternalLink size={16} />
                    在中国植物志（iplant.cn）查看完整条目
                  </a>
                )}

                {/* 描述 */}
                {plant.description && (
                  <p className="mt-6 text-[15px] leading-relaxed text-sage-700">
                    {plant.description}
                  </p>
                )}

              {/* 养护参数（条目信息不足时不展示，避免展示编造的养护参数） */}
                {plant.hasCareInfo ? (
                  <>
                    <div className="mt-7">
                      <h3 className="mb-3 font-serif text-[15.5px] font-semibold text-ink">
                        养护参数
                      </h3>
                      <div className="grid grid-cols-2 gap-[7px]">
                        <CareItem
                          icon={<Sun size={14} className="text-amber-600" />}
                          label="光照"
                          value={plant.light}
                        />
                        <CareItem
                          icon={<Droplets size={14} className="text-blue-500" />}
                          label="浇水"
                          value={plant.water}
                        />
                        <CareItem
                          icon={<Wind size={14} className="text-teal-600" />}
                          label="湿度"
                          value={plant.humidity}
                        />
                        <CareItem
                          icon={<Thermometer size={14} className="text-rose-500" />}
                          label="温度"
                          value={plant.temperature}
                        />
                        <CareItem
                          icon={<FlaskConical size={14} className="text-sage-600" />}
                          label="土壤"
                          value={plant.soil}
                        />
                        <CareItem
                          icon={<Gauge size={14} className="text-purple-500" />}
                          label="难度"
                          value={plant.difficulty}
                        />
                      </div>
                    </div>

                    {/* 毒性 */}
                    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-sage-100/70 p-3">
                      <Skull size={15} className="mt-0.5 shrink-0 text-sage-600" />
                      <div>
                        <p className="text-[11.5px] font-medium text-sage-800">毒性提示</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-sage-600">
                          {plant.toxicity}
                        </p>
                      </div>
                    </div>

                    {/* 养护贴士 */}
                    <div className="mt-7">
                      <h3 className="mb-3 font-serif text-[15.5px] font-semibold text-ink">
                        养护贴士
                      </h3>
                      <ul className="space-y-[9px]">
                        {plant.careTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2
                              size={14}
                              className="mt-0.5 shrink-0 text-sage-500"
                            />
                            <span className="text-[11.5px] leading-[1.65] text-sage-700">
                              {tip}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="mt-7 rounded-2xl bg-sage-100/70 p-3 text-[11.5px] leading-[1.75] text-sage-600">
                    {plant.externalUrl
                      ? "该条目来自中国植物志（iplant.cn），暂无养护资料，可点击上方按钮查看完整条目。"
                      : "该条目来自植物百科，内容信息不足，暂无可靠的养护资料，建议结合其他资料判断。"}
                  </p>
                )}

                {/* 中国植物志（中国植物物种名录）补充信息 */}
                {plant.cvh && (
                  <div className="mt-8 border-t border-sage-200 pt-6">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-sage-500" />
                      <h3 className="font-serif text-lg font-semibold text-ink">
                        中国植物志
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-sage-400">
                      数据来源：中国植物物种名录（CVH 中国数字植物标本馆）
                    </p>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex gap-3">
                        <dt className="w-16 shrink-0 text-sage-500">名录名称</dt>
                        <dd className="text-sage-800">
                          {plant.cvh.chName}
                          {plant.cvh.sciName && (
                            <span className="ml-2 italic text-sage-600">
                              {plant.cvh.sciName}
                            </span>
                          )}
                        </dd>
                      </div>

                      {plant.cvh.acceptedName && (
                        <div className="flex gap-3">
                          <dt className="w-16 shrink-0 text-sage-500">接受名</dt>
                          <dd className="text-sage-800">
                            = {plant.cvh.acceptedName}
                          </dd>
                        </div>
                      )}

                      {plant.cvh.synonyms.length > 0 && (
                        <div className="flex gap-3">
                          <dt className="w-16 shrink-0 text-sage-500">异名</dt>
                          <dd className="italic leading-relaxed text-sage-700">
                            {plant.cvh.synonyms.join(" · ")}
                          </dd>
                        </div>
                      )}

                      {plant.cvh.distribution && (
                        <div className="flex gap-3">
                          <dt className="w-16 shrink-0 text-sage-500">分布</dt>
                          <dd className="text-sage-800">
                            {plant.cvh.distribution}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {plant.cvh.description && (
                      <div className="mt-4">
                        <p className="text-xs text-sage-500">形态描述</p>
                        <p className="mt-2 max-h-64 overflow-y-auto text-sm leading-relaxed text-sage-700">
                          {plant.cvh.description}
                        </p>
                        {plant.cvh.reference && (
                          <p className="mt-2 text-xs text-sage-400">
                            — {plant.cvh.reference}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 别名 */}
                {plant.aliases.length > 0 && (
                  <div className="mt-8 border-t border-sage-200 pt-6">
                    <p className="text-xs uppercase tracking-wider text-sage-500">
                      别名
                    </p>
                    <p className="mt-2 text-sm text-sage-700">
                      {plant.aliases.join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CareItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-sage-100 bg-white p-[7px]">
      <div className="flex items-center gap-[7px]">
        {icon}
        <span className="text-[9px] leading-tight text-sage-500">{label}</span>
      </div>
      <p className="mt-[2px] text-[11px] leading-[1.35] text-ink">{value}</p>
    </div>
  );
}
