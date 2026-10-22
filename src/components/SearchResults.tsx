import { Search, AlertCircle, Sparkles, Leaf } from "lucide-react";
import type { Plant, ProvincePlant } from "../types";
import { LocalGridCard } from "./LocalGridCard";
import { ProvinceFloraList } from "./ProvinceFloraList";

interface SearchResultsProps {
  results: Plant[];
  /** 已授权定位时的省级常见植物排行；未授权时为 null */
  flora: ProvincePlant[] | null;
  /** 已授权定位的省份短名 */
  province: string | null;
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  query: string;
  mode: "local" | "online";
  isInGarden: (id: string) => boolean;
  onToggleGarden: (plant: Plant) => void;
  onSelect: (plant: Plant) => void;
}

export function SearchResults({
  results,
  flora,
  province,
  loading,
  error,
  hasSearched,
  query,
  mode,
  isInGarden,
  onToggleGarden,
  onSelect,
}: SearchResultsProps) {
  // 加载状态
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-[1.5px] border-sage-200 border-t-sage-600" />
        <p className="mt-4 text-xs text-sage-500">
          {mode === "online"
            ? province
              ? "正在从中国植物志查询…"
              : "正在从植物百科查询…"
            : "正在搜索本地图鉴…"}
        </p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center border-y border-sage-200/70 py-16 text-center">
        <AlertCircle size={22} className="text-rose-400" />
        <p className="mt-4 font-serif text-lg text-ink">查询出错了</p>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-sage-500">
          {error}
        </p>
        {mode === "online" && (
          <p className="mt-2 max-w-xs text-xs text-sage-400">
            网络查询可能受网络环境影响，请检查后重试
          </p>
        )}
      </div>
    );
  }

  // 已授权定位 → 展示该省常见植物排行（本地图鉴的另一套数据集）
  if (flora) {
    return (
      <ProvinceFloraList
        province={province ?? "本省"}
        rows={flora}
        query={query}
        isInGarden={isInGarden}
        onToggleGarden={onToggleGarden}
        onSelect={onSelect}
      />
    );
  }

  // 空查询 — 欢迎提示
  if (results.length === 0 && !query.trim()) {
    return (
      <div className="flex flex-col items-center border-y border-sage-200/70 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100">
          {mode === "online" ? (
            <Sparkles size={26} className="text-sage-500" />
          ) : (
            <Leaf size={26} className="text-sage-500" />
          )}
        </span>
        <h3 className="mt-5 font-serif text-lg text-ink">
          {mode === "online"
            ? province
              ? "联网查询中国植物志"
              : "联网查询植物百科"
            : "浏览本地图鉴"}
        </h3>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-sage-500">
          {mode === "online"
            ? province
              ? "输入植物名称，在中国植物志（iplant.cn）中查找物种"
              : "输入植物名称，从 Wikipedia 百科查找并解析养护信息"
            : "输入植物名称，从本地图鉴快速查找常见植物的养护方法"}
        </p>
      </div>
    );
  }

  // 空结果
  if (results.length === 0 && hasSearched) {
    return (
      <div className="flex flex-col items-center border-y border-sage-200/70 py-16 text-center">
        <Search size={22} className="text-sage-400" />
        <p className="mt-4 font-serif text-lg text-ink">
          未找到「{query}」相关植物
        </p>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-sage-500">
          换个关键词试试
        </p>
      </div>
    );
  }

  // 结果列表
  return (
    <div>
      {hasSearched && query && (
        <p className="mb-5 text-xs text-sage-500">
          找到 <span className="text-sage-700">{results.length}</span> 个与「
          {query}」相关的结果
        </p>
      )}

      {/* 所有界面统一一排三个的紧凑网格（已收藏的由上层排在最前） */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-5">
        {results.map((plant, index) => (
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
    </div>
  );
}
