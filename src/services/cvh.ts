import type { CvhPlantInfo } from "../types";
import { API_BASE } from "./apiBase";

/**
 * 中国数字植物标本馆（CVH）「中国植物物种名录」数据接入
 *
 * 数据链路：名称解析（autocomplete）→ 名录信息（species_info）→ 形态描述（trait_info）
 *
 * 两个接口限制（见 vite.config.ts 的 /api/cvh 代理与 server/index.mjs）：
 * 1. 响应头 Access-Control-Allow-Origin 为非法值 "www.cvh.ac.cn"，浏览器不能直接跨域调用；
 * 2. 接口校验 Referer，缺失时返回 {"message":"access denied"}。
 * 因此请求统一走 `/api/cvh`：开发态由 vite 代理转发，生产态由轻量后端转发，两者都会补上 Referer。
 *
 * 接口不可用（未走代理、名录无此条目、网络异常）时一律静默返回 null，
 * 不影响网络百科本身的结果展示。
 */

const CVH_BASE = `${API_BASE}/cvh`;

/** 去掉 CVH 返回文本里的 <em> 标记并压缩空白 */
function cleanText(raw: unknown): string {
  return String(raw ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface CvhSuggestion {
  /** 拉丁名，同时作为 species_info 的查询键 */
  value: string;
  /** 中文名，可能为空 */
  desc: string;
}

/**
 * 名称自动补全：把中文名或学名解析成名录中的规范拉丁名
 * 名录以学名为主键，species_info 只认拉丁名，中文名必须先经过这一步
 */
async function resolveTaxonName(term: string): Promise<CvhSuggestion[]> {
  const res = await fetch(
    `${CVH_BASE}/controller/ajax/autocomplete.php?term=${encodeURIComponent(term)}`
  );
  if (!res.ok) return [];

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * 从候选里挑出与查询最匹配的一条
 * 优先精确匹配学名，其次匹配学名前缀（如 Phalaenopsis amabilis → Phalaenopsis amabilis var. aphrodite），
 * 再次精确匹配中文名；剩余候选不唯一时返回 null，避免张冠李戴
 */
function pickSuggestion(
  suggestions: CvhSuggestion[],
  scientificName: string,
  chineseName: string
): CvhSuggestion | null {
  if (suggestions.length === 0) return null;

  const sci = scientificName.trim().toLowerCase();
  if (sci) {
    const exact = suggestions.find(
      (s) => String(s.value).trim().toLowerCase() === sci
    );
    if (exact) return exact;

    const prefix = suggestions.find((s) =>
      String(s.value).trim().toLowerCase().startsWith(sci)
    );
    if (prefix) return prefix;
  }

  const chn = chineseName.trim().toLowerCase();
  if (chn) {
    const exactCh = suggestions.find(
      (s) => String(s.desc).trim().toLowerCase() === chn
    );
    if (exactCh) return exactCh;
  }

  return suggestions.length === 1 ? suggestions[0] : null;
}

/** 形态描述接口，失败时仍返回已获取的名录信息 */
async function fetchTrait(
  canonicalName: string
): Promise<{ trait: string; reference: string } | null> {
  if (!canonicalName) return null;

  const res = await fetch(`${CVH_BASE}/controller/species/trait_info.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ canonicalName }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (data?.status !== "success" || !data.info) return null;

  return {
    trait: cleanText(data.info.trait),
    reference: cleanText(data.info.reference),
  };
}

async function queryCvh(
  scientificName: string,
  chineseName: string
): Promise<CvhPlantInfo | null> {
  // 学名优先，中文名兜底
  let suggestion: CvhSuggestion | null = null;
  if (scientificName.trim()) {
    suggestion = pickSuggestion(
      await resolveTaxonName(scientificName),
      scientificName,
      chineseName
    );
  }
  if (!suggestion && chineseName.trim()) {
    suggestion = pickSuggestion(
      await resolveTaxonName(chineseName),
      scientificName,
      chineseName
    );
  }

  const taxonKey = String(suggestion?.value ?? "").trim();
  if (!taxonKey) return null;

  const res = await fetch(
    `${CVH_BASE}/controller/species/species_info.php?spname=${encodeURIComponent(taxonKey)}`
  );
  if (!res.ok) return null;

  const payload = await res.json();
  if (payload?.status !== "success" || !payload.info) return null;

  const info = payload.info;

  const synonyms: string[] = [];
  if (info.hasSynName === 1 && Array.isArray(info.synName)) {
    for (const item of info.synName) {
      for (const key of Object.keys(item ?? {})) {
        const name = cleanText((item as Record<string, unknown>)[key]);
        if (name) synonyms.push(name);
      }
    }
  }

  const trait = await fetchTrait(cleanText(info.canName));

  return {
    chName: cleanText(info.chName) || chineseName,
    sciName: cleanText(info.sciName),
    // acc_status 为 "0" 表示该名称未被接受，需给出接受名
    acceptedName:
      info.acc_status === "0"
        ? cleanText(`${info.accName_sci ?? ""}（${info.accName_ch ?? ""}）`)
        : null,
    synonyms: synonyms.slice(0, 8),
    distribution: cleanText(info.distribution_c),
    description: trait?.trait ?? "",
    reference: trait?.reference ?? "",
  };
}

/** 已命中的结果缓存，避免重复搜索同一植物时反复请求名录 */
const cache = new Map<string, CvhPlantInfo>();

/**
 * 查询中国植物物种名录
 * @param scientificName 学名，优先用它匹配
 * @param chineseName 中文名（调用方已做繁简归一化），学名匹配不到时兜底
 */
export async function fetchCvhPlantInfo(
  scientificName: string,
  chineseName: string
): Promise<CvhPlantInfo | null> {
  const key = `${scientificName}|${chineseName}`.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const info = await queryCvh(scientificName, chineseName);
    // 仅缓存命中的结果，避免把偶发失败当成「名录无此条目」永久缓存
    if (info) cache.set(key, info);
    return info;
  } catch {
    return null;
  }
}
