import type { Plant } from "../types";
import { API_BASE } from "./apiBase";

/**
 * 中国植物志在线版「植物智」（iplant.cn）检索接入
 *
 * 定位在中国（已授权定位到省）时，联网搜索的数据源从 Wikipedia 切换为本站。
 * 数据链路：站内检索建议接口 /ashx/searchautocomplete.ashx?query=关键词
 * → 返回中文名 + 学名的候选列表。
 *
 * 两个限制（见 vite.config.ts 的 /api/iplant 代理与 server/index.mjs）：
 * 1. 接口无 Access-Control-Allow-Origin 响应头，浏览器不能直接跨域调用；
 * 2. 缺 Referer 时接口返回空。
 * 因此请求统一走 `/api/iplant`：开发态由 vite 代理转发，生产态由轻量后端转发，两者都补 Referer。
 *
 * 注意：iplant.cn 页面通过 CSP frame-ancestors 禁止被第三方页面内嵌，
 * 因此条目原文页只能在新标签 / 系统浏览器中打开（详情面板提供入口）。
 */

const IPLANT_BASE = `${API_BASE}/iplant`;
/** 条目原文页地址（site 自身搜索即跳转到 /info/{名称}） */
const INFO_PAGE = "https://www.iplant.cn";

interface IplantSuggestion {
  /** 中文名 */
  value: string;
  /** 「中文名 学名」或「别名(正式名)」的组合串，如「银杏 Ginkgo biloba」「樟树(樟)」 */
  data: string;
}

/**
 * 解析建议条目的 data 字段，返回显示名、学名与别名
 * - 「樟树(樟)」→ 显示搜索词形态的别名「樟树」，正式名「樟」收入别名；
 *   显示名跟随用户的搜索习惯（如搜「樟树」时显示「樟树」而非只显示「樟」）
 * - 「银杏 Ginkgo biloba」→ 学名 Ginkgo biloba
 */
function parseSuggestion(
  value: string,
  data: string
): { name: string; scientificName: string; aliases: string[] } {
  const trimmed = data.trim();
  if (!trimmed || trimmed === value) {
    return { name: value, scientificName: "", aliases: [] };
  }

  // 「别名(正式名)」格式：data 为纯中文（可含括号），如「樟树(樟)」「樟树(猴樟)」
  const aliasMatch = trimmed.match(/^([\u4e00-\u9fa5·]+)[(（]([\u4e00-\u9fa5·]+)[)）]$/);
  if (aliasMatch) {
    const outer = aliasMatch[1];
    const inner = aliasMatch[2];
    if (inner === value && outer !== value) {
      // 括号内是正式名。括号外与正式名互为简称/全称（如 樟树↔樟）时，
      // 显示名跟随搜索词形态；否则（如 猴樟 的俗名也叫「樟树」）保留正式名，
      // 以免与其他同别名条目混淆
      if (outer.includes(value) || value.includes(outer)) {
        return { name: outer, scientificName: "", aliases: [value] };
      }
      return { name: value, scientificName: "", aliases: [outer] };
    }
    if (outer === value && inner !== value) {
      // 括号外是正式名 → 括号内是别名
      return { name: value, scientificName: "", aliases: [inner] };
    }
    // 两端都不是正式名（如 value=猴樟、data=樟树(猴樟) 之外的形态）：显示正式名，其余收为别名
    return {
      name: value,
      scientificName: "",
      aliases: [outer, inner].filter((n) => n !== value),
    };
  }

  // 「中文名 学名」格式：第一个空格后是以拉丁字母开头的学名，如「银杏 Ginkgo biloba」
  const sciMatch = trimmed.match(/^(.+?)\s+([A-Za-z][A-Za-z\s\-×.\x27'’]+)$/);
  if (sciMatch) {
    return { name: value, scientificName: sciMatch[2].trim(), aliases: [] };
  }

  return { name: value, scientificName: "", aliases: [] };
}

/**
 * 在中国植物志（iplant.cn）中检索物种
 * 返回最小可用 Plant：仅名称与学名，无养护资料（详情面板提供原文页入口）
 */
export async function searchIplant(query: string): Promise<Plant[]> {
  const q = query.trim();
  if (!q) return [];

  const res = await fetch(
    `${IPLANT_BASE}/ashx/searchautocomplete.ashx?query=${encodeURIComponent(q)}`
  );
  if (!res.ok) throw new Error("中国植物志查询失败，请重试");

  const data = await res.json();
  const suggestions: IplantSuggestion[] = Array.isArray(data?.suggestions)
    ? data.suggestions
    : [];

  // 按正式名去重（保证同一条目跨搜索词的 id 与收藏状态一致）
  const seen = new Set<string>();
  const unique = suggestions.filter((item) => {
    const value = String(item?.value ?? "").trim();
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });

  return unique
    .slice(0, 9)
    .map((item): Plant => {
      const name = String(item?.value ?? "").trim();
      const parsed = parseSuggestion(name, String(item?.data ?? ""));

      return {
        // id 用正式名（value）：同一条目无论搜「樟」还是「樟树」，收藏状态一致
        id: `iplant-${name}`,
        // 显示名跟随搜索词形态：搜「樟树」显示「樟树」，搜「樟」显示「樟」
        name: parsed.name || name,
        scientificName: parsed.scientificName,
        aliases: parsed.aliases,
        category: "中国植物志",
        light: "",
        water: "",
        humidity: "",
        temperature: "",
        soil: "",
        difficulty: "中等",
        toxicity: "",
        description: "",
        careTips: [],
        imageUrl: "",
        source: "online",
        hasCareInfo: false,
        // 原文页始终使用正式名（value），保证跳转有效
        externalUrl: name
          ? `${INFO_PAGE}/${encodeURIComponent(name)}`
          : undefined,
      };
    })
    .filter((plant) => plant.name);
}
