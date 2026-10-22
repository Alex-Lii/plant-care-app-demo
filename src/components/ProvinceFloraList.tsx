import type { Plant, ProvincePlant } from "../types";
import { floraRowToPlant } from "../data/provinceFlora";
import { LocalGridCard } from "./LocalGridCard";

interface ProvinceFloraListProps {
  province: string;
  rows: ProvincePlant[];
  query: string;
  isInGarden: (id: string) => boolean;
  onToggleGarden: (plant: Plant) => void;
  onSelect: (plant: Plant) => void;
}

/**
 * 已授权定位时的本地植物百科：该省常见植物
 * 每一种植物都可收藏、可点开详情（无养护资料的条目详情页会提示暂无资料）
 */
export function ProvinceFloraList({
  province,
  rows,
  query,
  isInGarden,
  onToggleGarden,
  onSelect,
}: ProvinceFloraListProps) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-serif text-lg text-ink">{province}常见植物</h3>
        <p className="mt-1 text-xs text-sage-500">共 {rows.length} 种</p>
      </div>

      {query.trim() && (
        <p className="mb-3 text-xs text-sage-500">
          筛选出 <span className="text-sage-700">{rows.length}</span> 个与「
          {query}」相关的结果
        </p>
      )}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center border-y border-sage-200/70 py-16 text-center">
          <p className="font-serif text-lg text-ink">
            未找到「{query}」相关植物
          </p>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-sage-500">
            {province}常见植物中暂无该植物，清空关键词可查看全部
          </p>
        </div>
      ) : (
        // 一排三个的紧凑网格；名次保留为左上角角标，已收藏的由上层排在最前
        <div className="grid grid-cols-3 gap-x-3 gap-y-5">
          {rows.map((row, index) => {
            const plant = row.plant ?? floraRowToPlant(row, province);

            return (
              <LocalGridCard
                key={`${row.rank}-${row.name}`}
                name={row.name}
                sciName={row.scientificName}
                imageUrl={plant.imageUrl || undefined}
                index={index}
                badge={`No.${row.rank}`}
                footer={`${row.records.toLocaleString()} 条记录`}
                collected={isInGarden(plant.id)}
                onToggleHeart={() => onToggleGarden(plant)}
                onClick={() => onSelect(plant)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
