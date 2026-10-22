import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, LocateFixed, ChevronDown, Loader2, X } from "lucide-react";
import type { LocationSource, UserLocation } from "../types";
import { PROVINCES, findProvince } from "../data/regions";
import type { LocationStatus } from "../hooks/useLocation";

interface LocationBarProps {
  location: UserLocation | null;
  status: LocationStatus;
  error: string | null;
  onLocate: () => void;
  onSelectManual: (province: string, city: string) => void;
  onClear: () => void;
}

const SOURCE_LABEL: Record<LocationSource, string> = {
  gps: "GPS",
  ip: "网络定位",
  manual: "手动",
};

/**
 * 定位栏 + 省 / 市选择底部弹层
 * 触控目标统一 ≥ 44px，适配移动端小屏操作
 */
export function LocationBar({
  location,
  status,
  error,
  onLocate,
  onSelectManual,
  onClear,
}: LocationBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftProvince, setDraftProvince] = useState(PROVINCES[0].name);
  const [draftCity, setDraftCity] = useState(PROVINCES[0].cities[0]);

  const locating = status === "locating";

  const openSheet = () => {
    const current = location ? findProvince(location.province) : null;
    const province = current ?? PROVINCES[0];
    const city = current?.cities.includes(location?.city ?? "")
      ? (location?.city as string)
      : province.cities[0];

    setDraftProvince(province.name);
    setDraftCity(city);
    setSheetOpen(true);
  };

  // 切换省份时重置为其下辖第一个城市
  const handleProvinceChange = (name: string) => {
    setDraftProvince(name);
    const province = findProvince(name);
    setDraftCity(province?.cities[0] ?? name);
  };

  const handleConfirm = () => {
    onSelectManual(draftProvince, draftCity);
    setSheetOpen(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-sage-200 bg-white/70 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <MapPin size={15} className="shrink-0 text-sage-500" />

          <div className="min-w-0 flex-1">
            {locating ? (
              <p className="flex items-center gap-1.5 text-sm text-sage-600">
                <Loader2 size={13} className="animate-spin" />
                正在定位…
              </p>
            ) : location ? (
              <p className="flex items-center gap-2 text-sm">
                <span className="truncate text-ink">
                  {location.city} · {location.province}
                </span>
                <span className="shrink-0 rounded-full bg-sage-100 px-1.5 py-0.5 text-[10px] text-sage-600">
                  {SOURCE_LABEL[location.source]}
                </span>
              </p>
            ) : (
              <p className="text-sm text-sage-500">未定位</p>
            )}
          </div>

          <button
            onClick={onLocate}
            disabled={locating}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-sage-700 px-4 text-sm font-medium text-white transition-colors active:bg-sage-800 disabled:opacity-60"
          >
            <LocateFixed size={15} />
            定位
          </button>

          {location && (
            <button
              onClick={onClear}
              aria-label="清除定位"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sage-500 transition-colors active:bg-sage-50"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 手动选择城市（次级操作，单独一行避免误触定位主按钮） */}
        <button
          onClick={openSheet}
          className="mt-2 flex h-11 w-full items-center gap-1.5 border-t border-sage-200/70 pt-2 text-sm text-sage-600"
        >
          <ChevronDown size={15} />
          {location ? "更换城市" : "手动选择城市"}
        </button>

        {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}

        <p className="mt-1.5 text-[11px] leading-relaxed text-sage-400">
          {location
            ? "已按定位展示所在省份的常见植物"
            : "未开启定位时图鉴仅展示离线 20 种；点击「定位」会申请系统权限"}
        </p>
      </div>

      {/* 省份 / 城市选择：底部弹层 + 原生 select（触屏上两级级联下拉体验更好） */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-40 bg-sage-950/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-cream p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-4 flex max-w-md items-center justify-between">
                <h3 className="font-serif text-lg text-ink">选择城市</h3>
                <button
                  onClick={() => setSheetOpen(false)}
                  aria-label="关闭"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sage-500 active:bg-sage-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mx-auto max-w-md">
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-xs text-sage-500">
                    省份
                  </span>
                  <select
                    value={draftProvince}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="h-11 w-full rounded-xl border border-sage-200 bg-white px-3 text-sm text-ink focus:border-sage-400 focus:outline-none"
                  >
                    {PROVINCES.map((province) => (
                      <option key={province.name} value={province.name}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mb-5 block">
                  <span className="mb-1.5 block text-xs text-sage-500">城市</span>
                  <select
                    value={draftCity}
                    onChange={(e) => setDraftCity(e.target.value)}
                    className="h-11 w-full rounded-xl border border-sage-200 bg-white px-3 text-sm text-ink focus:border-sage-400 focus:outline-none"
                  >
                    {(findProvince(draftProvince)?.cities ?? []).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={handleConfirm}
                  className="h-12 w-full rounded-2xl bg-sage-700 text-sm font-medium text-white transition-colors active:bg-sage-800"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
