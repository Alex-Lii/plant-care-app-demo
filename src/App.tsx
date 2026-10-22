import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav, type PageKey } from "./components/BottomNav";
import { GardenView } from "./components/GardenView";
import { HomePage } from "./pages/HomePage";
import { LocalAtlasPage } from "./pages/LocalAtlasPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PlantDetail } from "./components/PlantDetail";
import { CollectPrompt } from "./components/CollectPrompt";
import { Splash } from "./components/Splash";
import { usePlantSearch } from "./hooks/usePlantSearch";
import { useGarden } from "./hooks/useGarden";
import { useLocation } from "./hooks/useLocation";
import type { Plant } from "./types";

/** 最近浏览记录的 localStorage key */
const RECENT_KEY = "plant-care-recent";
/** 收藏提醒开关（"0" 为关闭，默认开启） */
const PROMPT_KEY = "plant-care-collect-prompt";

export default function App() {
  const {
    location,
    status: locationStatus,
    error: locationError,
    locate,
    setManually,
    clear,
  } = useLocation();

  // 已授权定位 → 省级常见植物排行；未授权 → 固定 20 种离线数组
  const province = location?.province ?? null;

  const {
    query,
    mode,
    results,
    flora,
    loading,
    error,
    hasSearched,
    search,
    changeMode,
  } = usePlantSearch(province);

  const { garden, isInGarden, toggleGarden } = useGarden();

  const [page, setPage] = useState<PageKey>("home");
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  /** 启动等待页：等字体就绪且至少展示 1.5 秒后淡出 */
  const [booting, setBooting] = useState(true);
  /** 首页搜索入口跳转图鉴时，递增以触发搜索框聚焦 */
  const [focusToken, setFocusToken] = useState(0);
  /** 最近浏览的植物（最新的在前），用于首页「最近浏览」区块 */
  const [recentPlants, setRecentPlants] = useState<Plant[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
      // 只接受完整的植物对象；旧版本存的是 id 数组，直接丢弃
      return parsed.filter(
        (p): p is Plant =>
          Boolean(p) && typeof (p as Plant).id === "string" && typeof (p as Plant).name === "string"
      );
    } catch {
      return [];
    }
  });

  /** 收藏提醒开关（默认开启，「我的 → 提醒设置」可关闭） */
  const [promptEnabled, setPromptEnabled] = useState<boolean>(
    () => localStorage.getItem(PROMPT_KEY) !== "0"
  );
  /** 待确认的收藏/移出操作（仅用户主动点击心形时弹出模态问询条） */
  const [prompt, setPrompt] = useState<{
    plant: Plant;
    kind: "collect" | "remove";
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recentPlants));
    } catch {
      // ignore
    }
  }, [recentPlants]);

  useEffect(() => {
    try {
      localStorage.setItem(PROMPT_KEY, promptEnabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [promptEnabled]);

  // 切换页签回到顶部
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  // 启动等待页：字体加载完成与最短展示时长（1.5s）两者都满足后关闭
  useEffect(() => {
    let done = false;
    const fontsReady =
      typeof document !== "undefined" && document.fonts
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve();
    const minTime = new Promise((resolve) => setTimeout(resolve, 1500));

    Promise.all([fontsReady, minTime]).then(() => {
      if (!done) setBooting(false);
    });
    return () => {
      done = true;
    };
  }, []);

  // 打开详情即记为一次浏览：去重置顶，每浏览一种新植物，首页「最近浏览」就多展示一个
  const handleSelect = (plant: Plant) => {
    setSelectedPlant(plant);
    setRecentPlants((prev) =>
      [plant, ...prev.filter((p) => p.id !== plant.id)].slice(0, 40)
    );
  };

  // 关闭详情面板（收藏提醒只在主动点击心形时弹出，浏览详情关闭不再打扰）
  const handleDetailClose = () => {
    setSelectedPlant(null);
  };

  // 问询条确认：收藏 / 移出花园
  const handlePromptConfirm = () => {
    if (prompt) toggleGarden(prompt.plant);
    setPrompt(null);
  };

  // 问询条「暂不」：不做任何变更，直接关闭
  const handlePromptDismiss = () => {
    setPrompt(null);
  };

  // 任何界面（首页 / 本地植物百科 / 我的花园 / 详情面板）的心形入口：
  // 只有主动点击心形（收藏或移出）才弹模态问询条，必须选择「收藏/移出」或「暂不」
  // 后才生效；提醒在「我的」中关闭时则直接执行
  const requestCollect = (plant: Plant) => {
    if (promptEnabled) {
      setPrompt({ plant, kind: isInGarden(plant.id) ? "remove" : "collect" });
    } else {
      toggleGarden(plant);
    }
  };

  // 首页「最近浏览」：只展示浏览过的植物，按浏览时间倒序；未浏览过时为空
  const preview = recentPlants;

  const openAtlas = () => {
    setPage("atlas");
    setFocusToken((token) => token + 1);
  };

  // 切换页签：离开「本地植物百科」时退出联网查询，再次进入时仍展示最开始的本地植物
  const handlePageChange = (next: PageKey) => {
    if (page === "atlas" && next !== "atlas") {
      search("");
      changeMode("local");
    }
    setPage(next);
    setPrompt(null);
  };

  return (
    <div className="min-h-screen bg-cream">
      <AnimatePresence>{booting && <Splash />}</AnimatePresence>

      <main className="mx-auto max-w-md px-5 pb-[calc(5.5rem_+_env(safe-area-inset-bottom))] pt-[calc(1.75rem_+_env(safe-area-inset-top))]">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {page === "home" && (
              <HomePage
                location={location}
                locationStatus={locationStatus}
                locationError={locationError}
                onLocate={locate}
                onSelectManual={setManually}
                onClearLocation={clear}
                garden={garden}
                preview={preview}
                onSearchTap={openAtlas}
                onGardenTap={() => setPage("garden")}
                onSelect={handleSelect}
                isInGarden={isInGarden}
                onToggleGarden={requestCollect}
              />
            )}

            {page === "atlas" && (
              <LocalAtlasPage
                location={location}
                status={locationStatus}
                locationError={locationError}
                onLocate={locate}
                onSelectManual={setManually}
                onClear={clear}
                query={query}
                mode={mode}
                results={results}
                flora={flora}
                province={province}
                loading={loading}
                error={error}
                hasSearched={hasSearched}
                onSearch={search}
                onModeChange={changeMode}
                focusToken={focusToken}
                isInGarden={isInGarden}
                onToggleGarden={requestCollect}
                onSelect={handleSelect}
              />
            )}

            {page === "garden" && (
              <GardenView
                garden={garden}
                isInGarden={isInGarden}
                onToggleGarden={requestCollect}
                onSelect={handleSelect}
                onGoAtlas={() => setPage("atlas")}
              />
            )}

            {page === "profile" && (
              <ProfilePage
                location={location}
                status={locationStatus}
                locationError={locationError}
                onLocate={locate}
                onSelectManual={setManually}
                onClear={clear}
                garden={garden}
                onOpenGarden={() => setPage("garden")}
                collectPromptEnabled={promptEnabled}
                onToggleCollectPrompt={setPromptEnabled}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav page={page} onChange={handlePageChange} />

      {/* 收藏/移出确认条（仅在用户主动点击心形时弹出） */}
      <AnimatePresence>
        {prompt && (
          <CollectPrompt
            key={`${prompt.kind}-${prompt.plant.id}`}
            plant={prompt.plant}
            kind={prompt.kind}
            onConfirm={handlePromptConfirm}
            onDismiss={handlePromptDismiss}
          />
        )}
      </AnimatePresence>

      {/* 植物详情滑入面板 */}
      <PlantDetail
        plant={selectedPlant}
        inGarden={selectedPlant ? isInGarden(selectedPlant.id) : false}
        onToggleGarden={requestCollect}
        onClose={handleDetailClose}
      />
    </div>
  );
}
