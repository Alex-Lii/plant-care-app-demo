import { motion } from "framer-motion";
import { Leaf, BookOpen } from "lucide-react";
import type { Plant } from "../types";
import { LocalGridCard } from "./LocalGridCard";

interface GardenViewProps {
  garden: Plant[];
  isInGarden: (id: string) => boolean;
  onToggleGarden: (plant: Plant) => void;
  onSelect: (plant: Plant) => void;
  /** 空花园时引导去图鉴 */
  onGoAtlas: () => void;
}

export function GardenView({
  garden,
  isInGarden,
  onToggleGarden,
  onSelect,
  onGoAtlas,
}: GardenViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="mb-7">
        <h1 className="font-serif text-2xl text-ink">我的花园</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {garden.length > 0
            ? `已收藏 ${garden.length} 株植物，点击卡片查看养护详情`
            : "把喜欢的植物收藏在这里，随时查看养护方法"}
        </p>
      </header>

      {garden.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-y border-sage-200/70 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100">
            <Leaf size={28} className="text-sage-400" />
          </span>
          <p className="mt-5 font-serif text-lg text-ink">花园里还没有植物</p>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-sage-500">
            在搜索结果中点击心形图标，就能把植物加入花园
          </p>
          <button
            onClick={onGoAtlas}
            className="mt-6 flex items-center gap-1.5 rounded-full bg-sage-700 px-5 py-2.5 text-sm font-medium text-white active:bg-sage-800"
          >
            <BookOpen size={14} />
            去本地图鉴
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5">
          {garden.map((plant, index) => (
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
    </motion.div>
  );
}
