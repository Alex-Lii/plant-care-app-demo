import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor 配置（原生打包为手机 App）
 *
 * 定位使用设备 GPS：原生下走 @capacitor/geolocation，Web 回退 navigator.geolocation。
 * 原生 WebView 跑在 https://localhost（安全上下文），因此 GPS 可用。
 *
 * 注意：打包后原生容器访问不到本机后端，构建时需用
 * `VITE_API_BASE=https://<公网后端或隧道地址>/api npm run build` 覆盖接口基址，
 * 否则 CVH 相关数据（网络百科的「中国植物志」区块）会缺失；定位本身不依赖后端。
 */
const config: CapacitorConfig = {
  appId: "com.plantcare.app",
  appName: "植语 Plant Care",
  webDir: "dist",
  // 图标源文件：scripts/build-icons.py 从 assets.jpg 切出 Android 各密度 + iOS AppIcon
  iconPath: "assets.jpg",
};

export default config;
