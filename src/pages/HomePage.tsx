import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronRight, Leaf } from "lucide-react";
import type { Plant, UserLocation } from "../types";
import type { LocationStatus } from "../hooks/useLocation";
import { LocationPill } from "../components/LocationPill";
import { LocalGridCard } from "../components/LocalGridCard";

interface HomePageProps {
  location: UserLocation | null;
  locationStatus: LocationStatus;
  locationError: string | null;
  onLocate: () => void;
  onSelectManual: (province: string, city: string) => void;
  onClearLocation: () => void;
  garden: Plant[];
  /** 本地常见植物预览（已定位时为该省植物，未定位时为离线 20 种） */
  preview: Plant[];
  onSearchTap: () => void;
  onGardenTap: () => void;
  onSelect: (plant: Plant) => void;
  isInGarden: (id: string) => boolean;
  onToggleGarden: (plant: Plant) => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

/** 花园概览的小圆头像：图片缺失或加载失败时统一回退为叶子图标 */
function GardenAvatar({ plant }: { plant: Plant }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full border border-sage-200 bg-sage-100">
      {plant.imageUrl && !failed ? (
        <img
          src={plant.imageUrl}
          alt={plant.name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Leaf size={16} className="text-sage-400" />
      )}
    </span>
  );
}

export function HomePage({
  location,
  locationStatus,
  locationError,
  onLocate,
  onSelectManual,
  onClearLocation,
  garden,
  preview,
  onSearchTap,
  onGardenTap,
  onSelect,
  isInGarden,
  onToggleGarden,
}: HomePageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-sage-500">
          植语 · Plant Care
        </p>
        <LocationPill
          location={location}
          status={locationStatus}
          error={locationError}
          onLocate={onLocate}
          onSelectManual={onSelectManual}
          onClear={onClearLocation}
        />
      </div>
      <h1 className="mt-3 font-serif text-[28px] leading-[1.3] text-ink">
        {greeting()}，
        <br />
        今天也好好照料植物
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        离线图鉴随时可查，联网百科补充更多植物资料。
      </p>

      {/* 搜索入口吸顶：向下滑动经过搜索栏后，它停留在页面最上方方便随时点击 */}
      <div className="sticky top-0 z-20 -mx-5 mt-5 bg-cream/95 px-5 py-3 backdrop-blur-md">
        <button
          onClick={onSearchTap}
          className="flex w-full items-center gap-3 rounded-2xl border border-sage-200 bg-white/80 px-4 py-4 text-left transition-colors active:bg-sage-50"
        >
          <Search size={18} className="shrink-0 text-sage-500" />
          <span className="flex-1 truncate text-sm text-sage-400">
            搜索植物名称，如龟背竹、绿萝…
          </span>
          <ChevronRight size={16} className="shrink-0 text-sage-300" />
        </button>
      </div>

      {/* 花园概览 */}
      <button
        onClick={onGardenTap}
        className="mt-9 flex w-full items-center gap-4 border-t border-sage-200 pt-6 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[15.5px] text-ink">我的花园</p>
          <p className="mt-1 text-[11px] text-sage-500">
            {garden.length > 0
              ? `已收藏 ${garden.length} 株植物`
              : "还没有植物，去图鉴添加吧"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {garden.slice(0, 3).map((plant) => (
            <GardenAvatar key={plant.id} plant={plant} />
          ))}
          <ChevronRight size={16} className="text-sage-300" />
        </div>
      </button>

      {/* 最近浏览：一行 3 个，每浏览一种新植物就多展示一个；未浏览过时为空态 */}
      <section className="mt-9">
        <h2 className="font-serif text-[15.5px] text-ink">最近浏览</h2>

        {preview.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-sage-200 px-5 py-8 text-center">
            <Leaf size={22} className="mx-auto text-sage-300" />
            <p className="mt-3 font-serif text-base text-sage-700">
              这里还空着呢
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-sage-500">
              去本地图鉴或植物百科点开任意一株植物，它就会出现在这里——看得越多，你的图鉴就越丰富。
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5">
            {preview.map((plant, index) => (
              <LocalGridCard
                key={plant.id}
                name={plant.name}
                sciName={plant.scientificName || plant.category}
                imageUrl={plant.imageUrl}
                index={index}
                collected={isInGarden(plant.id)}
                onToggleHeart={() => onToggleGarden(plant)}
                onClick={() => onSelect(plant)}
              />
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}
