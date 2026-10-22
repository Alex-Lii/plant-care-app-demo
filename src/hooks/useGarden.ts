import { useState, useEffect, useCallback } from "react";
import type { Plant } from "../types";

const STORAGE_KEY = "plant-care-garden";

function loadGarden(): Plant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const plants = JSON.parse(raw) as Plant[];
    // 历史数据早于 hasCareInfo 字段，缺省视为有养护信息，避免误判为信息不足
    return plants.map((p) => ({ ...p, hasCareInfo: p.hasCareInfo ?? true }));
  } catch {
    return [];
  }
}

export function useGarden() {
  // 惰性初始化直接读取本机存储：若在 effect 中加载，挂载时持久化 effect 会先用空数组
  // 覆写 localStorage，StrictMode 下第二次加载读到的是被清空的值，刷新即丢数据
  const [garden, setGarden] = useState<Plant[]>(() => loadGarden());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(garden));
    } catch {
      // ignore
    }
  }, [garden]);

  const isInGarden = useCallback(
    (id: string) => garden.some((p) => p.id === id),
    [garden]
  );

  const addToGarden = useCallback((plant: Plant) => {
    setGarden((prev) => {
      if (prev.some((p) => p.id === plant.id)) return prev;
      return [...prev, plant];
    });
  }, []);

  const removeFromGarden = useCallback((id: string) => {
    setGarden((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleGarden = useCallback(
    (plant: Plant) => {
      if (isInGarden(plant.id)) {
        removeFromGarden(plant.id);
      } else {
        addToGarden(plant);
      }
    },
    [isInGarden, addToGarden, removeFromGarden]
  );

  return {
    garden,
    isInGarden,
    addToGarden,
    removeFromGarden,
    toggleGarden,
  };
}
