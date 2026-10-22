import { useState, useEffect, useCallback } from "react";
import type { LocationSource, UserLocation } from "../types";
import {
  getCoords,
  getCoordsByIp,
  getGeoPermission,
  reverseGeocode,
} from "../services/coords";
import { normalizeProvince } from "../data/regions";

const STORAGE_KEY = "plant-care-location";

export type LocationStatus = "idle" | "locating" | "error";

function loadLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UserLocation;
    const province = normalizeProvince(parsed?.province ?? "");
    if (!province) return null;

    return {
      province,
      city: String(parsed.city ?? "") || province,
      source: (parsed.source ?? "manual") as LocationSource,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * 定位状态（镜像 useGarden 的持久化写法：固定 key + 惰性读取 + 写入 effect）
 *
 * 权限门控是本地图鉴分流的关键：
 * - 未授权时**绝不触发 IP 兜底**（不因网络而暴露位置、也不产生「定位成功」的假象）；
 * - 只有用户明确点击「定位」才会申请权限；
 * - IP 兜底仅在权限确为 granted 且 GPS 取坐标失败时启用。
 *
 * 全部失败均不抛异常，只落到 status/error，由 UI 提示「手动选择城市」。
 */
export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(() =>
    loadLocation()
  );
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (location) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [location]);

  const locate = useCallback(async () => {
    setStatus("locating");
    setError(null);

    const deniedMessage =
      "定位权限未授予，请在系统设置中允许定位，或手动选择城市";

    try {
      // 1. 权限门控：已明确拒绝时直接终止，绝不发起 IP 查询
      const permission = await getGeoPermission();
      if (permission === "denied") {
        setStatus("error");
        setError(deniedMessage);
        return;
      }

      // 2. 设备 GPS 优先
      let coords: { latitude: number; longitude: number } | null = null;
      let source: LocationSource = "gps";

      try {
        coords = await getCoords();
      } catch {
        // 3. 仅当权限确为 granted 时才允许 IP 兜底
        const after = permission === "granted" ? "granted" : await getGeoPermission();
        if (after !== "granted") {
          setStatus("error");
          setError(deniedMessage);
          return;
        }
        const ipCoords = await getCoordsByIp();
        if (ipCoords) {
          coords = ipCoords;
          source = "ip";
        }
      }

      if (!coords) {
        setStatus("error");
        setError("无法获取当前位置，请稍后重试或手动选择城市");
        return;
      }

      const place = await reverseGeocode(coords);
      const province = normalizeProvince(place?.province ?? "");
      if (!place || !province) {
        setStatus("error");
        setError("坐标解析失败，请手动选择城市");
        return;
      }

      setLocation({
        province,
        city: place.city,
        source,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("定位失败，请稍后重试或手动选择城市");
    }
  }, []);

  /** 手动选择城市：视为已授权，等效于定位成功 */
  const setManually = useCallback((province: string, city: string) => {
    const short = normalizeProvince(province);
    if (!short) return;

    setLocation({
      province: short,
      city: city || province,
      source: "manual",
    });
    setStatus("idle");
    setError(null);
  }, []);

  const clear = useCallback(() => {
    setLocation(null);
    setStatus("idle");
    setError(null);
  }, []);

  return { location, status, error, locate, setManually, clear };
}
