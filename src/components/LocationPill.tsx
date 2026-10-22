import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, LocateFixed, Loader2, X } from "lucide-react";
import type { UserLocation } from "../types";
import { PROVINCES, findProvince } from "../data/regions";
import type { LocationStatus } from "../hooks/useLocation";

interface LocationPillProps {
  location: UserLocation | null;
  status: LocationStatus;
  error: string | null;
  onLocate: () => void;
  onSelectManual: (province: string, city: string) => void;
  onClear: () => void;
}

/**
 * 页面右上角的紧凑定位入口：仅显示当前城市，点击展开底部弹层
 * 弹层内含 GPS 定位、省 / 市手动选择与清除，触控目标 ≥ 44px
 */
export function LocationPill({
  location,
  status,
  error,
  onLocate,
  onSelectManual,
  onClear,
}: LocationPillProps) {
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
      <button
        onClick={openSheet}
        aria-label={location ? `当前定位：${location.city}` : "选择城市"}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-sage-200 bg-white/80 px-3.5 text-xs text-sage-700 active:bg-sage-50"
      >
        {locating ? (
          <Loader2 size={13} className="animate-spin text-sage-500" />
        ) : (
          <MapPin size={13} className="text-sage-500" />
        )}
        <span className="max-w-[7.5rem] truncate">
          {locating ? "定位中…" : location ? location.city : "未定位"}
        </span>
      </button>

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
              <div className="mx-auto max-w-md">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-serif text-lg text-ink">定位</h3>
                  <button
                    onClick={() => setSheetOpen(false)}
                    aria-label="关闭"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sage-500 active:bg-sage-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <button
                  onClick={onLocate}
                  disabled={locating}
                  className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-sage-700 text-sm font-medium text-white transition-colors active:bg-sage-800 disabled:opacity-60"
                >
                  {locating ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LocateFixed size={15} />
                  )}
                  使用 GPS 定位
                </button>

                {error && (
                  <p className="mt-2 text-xs leading-relaxed text-rose-500">
                    {error}
                  </p>
                )}

                <label className="mb-3 mt-5 block">
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
                  <span className="mb-1.5 block text-xs text-sage-500">
                    城市
                  </span>
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

                {location && (
                  <button
                    onClick={() => {
                      onClear();
                      setSheetOpen(false);
                    }}
                    className="mt-2 h-11 w-full rounded-2xl text-sm text-sage-500 active:bg-sage-100"
                  >
                    清除定位
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
