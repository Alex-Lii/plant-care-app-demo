/**
 * 获取坐标与地理反查
 *
 * 定位以「设备 GPS」为主（本项目定位为手机 App，Capacitor 原生打包）：
 * - 原生：`@capacitor/geolocation`，先 requestPermissions 再 getCurrentPosition
 * - Web：`navigator.geolocation`（开发 / PWA，要求 https 或 localhost 安全上下文）
 *
 * IP 定位与坐标反查是第三方免费服务（ipwho.is / BigDataCloud），
 * 仅作为「已授权但 GPS 取不到坐标」时的兜底，且失败一律静默。
 */

export interface Coords {
  latitude: number;
  longitude: number;
}

/** 定位权限状态；"unknown" 表示环境不支持查询，按未授权处理 */
export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

/** 是否运行在 Capacitor 原生容器中 */
export async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * 探测定位权限状态 —— 必须「不弹窗」
 * 原生走 checkPermissions()，Web 走 Permissions API（不支持的浏览器返回 unknown）
 */
export async function getGeoPermission(): Promise<GeoPermission> {
  if (await isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const status = await Geolocation.checkPermissions();
      if (status.location === "granted") return "granted";
      if (status.location === "denied") return "denied";
      return "prompt";
    } catch {
      return "unknown";
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: "geolocation" });
      if (result.state === "granted") return "granted";
      if (result.state === "denied") return "denied";
      return "prompt";
    }
  } catch {
    // Safari 等浏览器不支持查询 geolocation 权限
  }
  return "unknown";
}

/**
 * 取设备坐标（会触发权限申请，只应在用户明确点击「定位」时调用）
 * 失败时抛错，由调用方决定是否走 IP 兜底
 */
export async function getCoords(): Promise<Coords> {
  if (await isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const permission = await Geolocation.requestPermissions();
    if (permission.location === "denied") {
      throw new Error("定位权限未授予");
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("当前环境不支持定位");
  }

  return new Promise<Coords>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => reject(new Error("无法获取设备位置")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/**
 * IP 兜底取坐标
 * ipwho.is 免密钥且允许跨域，但中文名不可靠（?lang=zh 仍返回英文），故只取坐标，
 * 中文省市名统一交给 reverseGeocode 反查
 */
export async function getCoordsByIp(): Promise<Coords | null> {
  try {
    const res = await fetch("https://ipwho.is/");
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.success === false) return null;

    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}

export interface GeoPlace {
  /** 省 / 直辖市全称，如「浙江省」「北京市」 */
  province: string;
  /** 市名，如「杭州市」；直辖市与省名相同 */
  city: string;
}

/** 坐标 → 中文省市（BigDataCloud，免密钥、允许跨域） */
export async function reverseGeocode(coords: Coords): Promise<GeoPlace | null> {
  try {
    const url =
      "https://api.bigdatacloud.net/data/reverse-geocode-client" +
      `?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=zh`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const province = String(data?.principalSubdivision ?? "").trim();
    if (!province) return null;

    const city = String(data?.city ?? "").trim() || province;
    return { province, city };
  } catch {
    return null;
  }
}
