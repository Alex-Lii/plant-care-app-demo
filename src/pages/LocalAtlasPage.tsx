import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Plant, ProvincePlant, SearchMode, UserLocation } from "../types";
import type { LocationStatus } from "../hooks/useLocation";
import { LocationPill } from "../components/LocationPill";
import { SearchBar } from "../components/SearchBar";
import { SearchResults } from "../components/SearchResults";
import { LocalGridCard } from "../components/LocalGridCard";
import { localPlants } from "../data/plants";
import {
 filterProvinceFlora,
 floraRowToPlant,
 getProvinceFlora,
} from "../data/provinceFlora";

interface LocalAtlasPageProps {
  location: UserLocation | null;
  status: LocationStatus;
  locationError: string | null;
  onLocate: () => void;
  onSelectManual: (province: string, city: string) => void;
  onClear: () => void;

  query: string;
  mode: SearchMode;
  results: Plant[];
  flora: ProvincePlant[] | null;
  province: string | null;
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  onSearch: (q: string) => void;
  onModeChange: (mode: SearchMode) => void;
  /** 值变化时聚焦搜索框（首页「大搜索入口」跳转过来时使用） */
  focusToken: number;

  isInGarden: (id: string) => boolean;
  onToggleGarden: (plant: Plant) => void;
  onSelect: (plant: Plant) => void;
}

/**
 * 本地植物百科（本地图鉴与植物百科合并）
 * 默认展示本地内容（离线 20 种 / 该省常见植物）；点击搜索框进入
 * 「联网查询植物百科」视图，搜索后同屏展示本地结果与植物百科结果
 */
export function LocalAtlasPage({
  location,
  status,
  locationError,
  onLocate,
  onSelectManual,
  onClear,
  query,
  mode,
  results,
  flora,
  province,
  loading,
  error,
  hasSearched,
  onSearch,
  onModeChange,
  focusToken,
  isInGarden,
  onToggleGarden,
  onSelect,
}: LocalAtlasPageProps) {
  // 「联网查询植物百科」视图是否激活（点击搜索框进入，取消返回本地内容）
  const [searching, setSearching] = useState(false);

  const enterSearch = () => {
    setSearching(true);
    if (mode !== "online") onModeChange("online");
  };

  const exitSearch = () => {
    setSearching(false);
    onSearch(""); // 清空查询词；模式切回本地后 effect 会重新加载本地数据集
    onModeChange("local");
  };

  // 收藏优先（仅本地内容）：已收藏的植物排在最前，其余保持原有顺序
  const orderedResults =
    mode === "local"
      ? [
          ...results.filter((p) => isInGarden(p.id)),
          ...results.filter((p) => !isInGarden(p.id)),
        ]
      : results;
  const orderedFlora = flora
    ? [
        ...flora.filter((row) => row.plant && isInGarden(row.plant.id)),
        ...flora.filter((row) => !row.plant || !isInGarden(row.plant.id)),
      ]
    : flora;

  // 联网搜索时的「本地结果」：在当前本地数据集（离线 20 种 / 该省常见植物）内匹配
  const localMatches = useMemo(() => {
    const qt = query.trim().toLowerCase();
    if (!searching || !qt) return [];

    if (province) {
      // 复用省排行的双向过滤（查询词包含植物名时同样命中，如「樟树」→「樟」）
      return filterProvinceFlora(getProvinceFlora(province), query).map(
        (row) => row.plant ?? floraRowToPlant(row, province)
      );
    }

    return localPlants.filter((plant) => {
      const haystack = [
        plant.name,
        plant.scientificName,
        plant.category,
        ...plant.aliases,
      ]
        .join(" ")
        .toLowerCase();
      const names = [plant.name, ...plant.aliases].filter(Boolean);
      return (
        haystack.includes(qt) ||
        names.some((n) => qt.includes(n.toLowerCase()))
      );
    });
  }, [searching, query, province]);

  const showLocalSection =
    searching && query.trim().length > 0 && hasSearched && localMatches.length > 0;

  const hint = searching
    ? province
      ? "联网查询中国植物志 iplant.cn"
      : "联网查询 Wikipedia 植物百科，仅保留植物类条目"
    : province
      ? `${province}常见植物共 ${flora?.length ?? getProvinceFlora(province).length} 种`
      : "离线数据涵盖 20 种常见室内植物";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-2xl text-ink">本地植物百科</h1>
          <LocationPill
            location={location}
            status={status}
            error={locationError}
            onLocate={onLocate}
            onSelectManual={onSelectManual}
            onClear={onClear}
          />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          {searching
            ? "联网查询植物百科，本地结果一并展示。"
            : "授权定位后展示所在省份的常见植物，未授权时展示离线 20 种。"}
        </p>
      </header>

      {/* 搜索栏吸顶：点击输入框即进入「联网查询植物百科」，向下滑动后仍停留在最上方 */}
      <div className="sticky top-0 z-20 -mx-5 bg-cream/95 px-5 py-3 backdrop-blur-md">
        <SearchBar
          query={query}
          loading={loading}
          searching={searching}
          hint={hint}
          focusToken={focusToken}
          onSearch={onSearch}
          onFocusSearch={enterSearch}
          onCancel={exitSearch}
        />
      </div>

      {/* 本地结果（联网搜索时同屏展示） */}
      {showLocalSection && (
        <section className="mt-8">
          <h2 className="font-serif text-[15.5px] text-ink">本地结果</h2>
          <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5">
            {localMatches.map((plant, index) => (
              <LocalGridCard
                key={plant.id}
                name={plant.name}
                sciName={plant.scientificName || plant.category}
                imageUrl={plant.imageUrl || undefined}
                index={index}
                collected={isInGarden(plant.id)}
                onToggleHeart={() => onToggleGarden(plant)}
                onClick={() => onSelect(plant)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mt-8">
        {showLocalSection && (
          <h2 className="mb-4 font-serif text-[15.5px] text-ink">
            {province ? "中国植物志" : "植物百科"}
          </h2>
        )}
        <SearchResults
          results={orderedResults}
          flora={searching ? null : orderedFlora}
          province={province}
          loading={loading}
          error={error}
          hasSearched={hasSearched}
          query={query}
          mode={mode}
          isInGarden={isInGarden}
          onToggleGarden={onToggleGarden}
          onSelect={onSelect}
        />
      </div>

      {/* 联网查询的数据源说明 */}
      {searching && (
        <p className="mt-8 flex items-start gap-2 border-t border-sage-200 pt-5 text-xs leading-relaxed text-sage-500">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-sage-400" />
          {province
            ? "结果来自中国植物志（iplant.cn）物种检索；条目详情可查看原文页，暂无养护资料的条目会明确提示。"
            : "植物百科仅展示植物类条目，同名非植物内容已过滤；养护建议由百科摘要解析，仅供参考。"}
        </p>
      )}
    </motion.div>
  );
}
