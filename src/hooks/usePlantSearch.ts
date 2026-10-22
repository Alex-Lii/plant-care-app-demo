import { useState, useCallback, useEffect, useRef } from "react";
import type { Plant, ProvincePlant, SearchMode } from "../types";
import { localPlants } from "../data/plants";
import { filterProvinceFlora, getProvinceFlora } from "../data/provinceFlora";
import { fetchCvhPlantInfo } from "../services/cvh";
import { searchIplant } from "../services/iplant";

interface SearchState {
  results: Plant[];
  /** 已授权定位时的省级常见植物排行；未授权时为 null */
  flora: ProvincePlant[] | null;
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
}

const DEFAULT_STATE: SearchState = {
  results: [],
  flora: null,
  loading: false,
  error: null,
  hasSearched: false,
};

// 网络百科每次查询的候选页面数量上限（控制并发请求数）
const ONLINE_SEARCH_LIMIT = 15;
const ONLINE_SUMMARY_LIMIT = 10;
const ONLINE_RESULT_LIMIT = 6;

/** 搜索结果候选页（标题、摘要片段、分类） */
interface Candidate {
  page: any;
  snippet: string;
  categories: string[];
}

/** 通过植物校验后的候选页（附页面摘要） */
type ResolvedEntry = Candidate & { summary: any };

/**
 * @param province 已授权定位得到的省份短名；为 null 表示未授权（无持久化定位），
 *                 本地图鉴固定展示离线 20 种，绝不触发任何网络定位
 */
export function usePlantSearch(province: string | null = null) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("local");
  const [state, setState] = useState<SearchState>({
    ...DEFAULT_STATE,
    results: localPlants,
  });
  /** 只采用最后一次发起的搜索结果，避免退出搜索时「联网空查询」覆盖本地结果 */
  const requestId = useRef(0);

  // 本地搜索：未授权定位时在当前 20 种离线数组内过滤
  const searchLocal = useCallback((q: string): Plant[] => {
    const normalized = q.trim().toLowerCase();
    if (!normalized) return localPlants;

    return localPlants.filter((plant) => {
      const haystack = [
        plant.name,
        plant.scientificName,
        plant.category,
        ...plant.aliases,
      ]
        .join(" ")
        .toLowerCase();
      // 双向匹配：字段包含查询词，或查询词包含植物名/别名（如搜「樟树」可命中「樟」）
      const names = [plant.name, ...plant.aliases].filter(Boolean);
      return (
        haystack.includes(normalized) ||
        names.some((n) => normalized.includes(n.toLowerCase()))
      );
    });
  }, []);

  // 网络搜索 — 使用 Wikipedia API，仅返回植物类条目
  const searchOnline = useCallback(async (q: string): Promise<Plant[]> => {
    const normalized = q.trim();
    if (!normalized) return [];

    // 1. 搜索 Wikipedia 页面
    const searchUrl = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      normalized
    )}&srnamespace=0&srlimit=${ONLINE_SEARCH_LIMIT}&format=json&origin=*`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error("网络搜索失败，请重试");

    const searchData = await searchRes.json();
    const pages: any[] = searchData.query?.search ?? [];

    if (pages.length === 0) return [];

    // 2. 批量获取所有页面的分类，用于第一轮过滤
    const pageIds = pages.map((p) => p.pageid).join("|");
    const categoriesMap = await fetchCategories(pageIds);

    // 3. 第一轮过滤：先排除消歧义页与同名非植物条目（影视、人物、地点等）
    const plantCandidates: Candidate[] = pages
      .map((page) => ({
        page,
        snippet: stripHtml(page.snippet ?? ""),
        categories: categoriesMap[page.pageid] ?? [],
      }))
      .filter(({ page, categories }) => !isObviouslyNonPlant(page.title, categories));

    if (plantCandidates.length === 0) return [];

    // 别名在维基上多以重定向页存在（如「白掌」→「白鹤芋」），解析出目标标题一并用于相关性匹配
    const redirectTarget = await resolveRedirect(normalized);
    const relevanceKeys = [normalized, redirectTarget]
      .filter((t): t is string => Boolean(t))
      .map((t) => normalizeZh(t).toLowerCase());

    // 标题匹配的候选优先拉取摘要（请求预算只有 10 个，避免相关条目被排位靠后的候选挤掉）
    const titleRank = (title: string) => {
      const key = normalizeZh(String(title)).toLowerCase();
      return relevanceKeys.some((k) => key.includes(k)) ? 0 : 1;
    };
    const orderedCandidates = [...plantCandidates].sort(
      (a, b) => titleRank(a.page.title) - titleRank(b.page.title)
    );

    // 4. 并发获取页面摘要，用简介与正文做第二轮植物校验
    const resolved = await Promise.all(
      orderedCandidates
        .slice(0, ONLINE_SUMMARY_LIMIT)
        .map(async ({ page, snippet, categories }): Promise<ResolvedEntry | null> => {
          const summary = await fetchSummary(page.title);
          if (!summary) return null;

          // 仍不是植物条目 → 丢弃（含同名非植物内容）
          if (!isPlantEntry(page.title, snippet, categories, summary)) {
            return null;
          }

          return { page, snippet, categories, summary };
        })
    );

    const entries = resolved.filter((e): e is ResolvedEntry => e !== null);
    if (entries.length === 0) return [];

    // 5. 学名：优先取 Wikidata 的 P225（分类单元名称），其次从简介「学名：」解析
    const taxonNames = await fetchTaxonNames(
      entries.map((e) => String(e.summary.wikibase_item ?? "")).filter(Boolean)
    );

    const plants: Plant[] = entries.map(({ page, snippet, summary }) => {
      const extract = summary.extract || snippet;
      const name = summary.title || page.title;
      const category = guessCategory(name, extract);

      return {
        id: `wiki-${page.pageid}`,
        name,
        scientificName:
          taxonNames[String(summary.wikibase_item ?? "")] ||
          extractScientificName(extract),
        aliases: [],
        category,
        light: inferLight(extract),
        water: inferWater(extract),
        humidity: inferHumidity(extract),
        temperature: inferTemperature(extract),
        soil: "建议使用排水良好的营养土",
        difficulty: inferDifficulty(extract),
        toxicity: inferToxicity(extract),
        description: truncate(extract, 180),
        careTips: generateTips(category, extract),
        imageUrl:
          summary.originalimage?.source ||
          summary.thumbnail?.source ||
          "",
        source: "online" as const,
        hasCareInfo: hasCareEvidence(extract),
      };
    });

    // 6. 标题相关性过滤：维基搜索是全文检索，会命中正文提及查询词的其它条目
    //    （如搜「虎尾兰」命中「龙血树属」、搜「钝角顶苞苔」命中「顶苞苔属」）。
    //    只保留标题与查询词（或其重定向目标）匹配的条目，没有匹配则返回空结果
    const finalList = plants.filter((p) => {
      const title = normalizeZh(p.name).toLowerCase();
      return relevanceKeys.some((k) => title.includes(k));
    });

    const results = finalList.slice(0, ONLINE_RESULT_LIMIT);

    // 7. 补充中国植物物种名录（CVH）信息，与 Wikipedia 互补：
    //    名录给出权威接受名、异名、省级分布与《中国植物志》形态描述。
    //    接口不可用或名录中没有该条目时静默跳过，不影响网络百科自身的结果
    await Promise.all(
      results.map(async (plant) => {
        plant.cvh = await fetchCvhPlantInfo(
          plant.scientificName,
          normalizeZh(plant.name)
        );
      })
    );

    return results;
  }, []);

  const performSearch = useCallback(
    async (q: string, searchMode: SearchMode) => {
      const currentId = ++requestId.current;
      const isStale = () => currentId !== requestId.current;

      setState((s) => ({ ...s, loading: true, error: null, hasSearched: true }));

      try {
        if (searchMode === "local") {
          // 已授权定位 → 该省常见植物排行；未授权 → 固定 20 种离线数组
          if (province) {
            const rows = filterProvinceFlora(getProvinceFlora(province), q);
            if (isStale()) return;
            setState({
              results: [],
              flora: rows,
              loading: false,
              error: null,
              hasSearched: true,
            });
          } else {
            const results = searchLocal(q);
            if (isStale()) return;
            setState({
              results,
              flora: null,
              loading: false,
              error: null,
              hasSearched: true,
            });
          }
        } else {
          // 定位在中国（已授权定位到省）时，联网搜索改用中国植物志（iplant.cn）；
          // 未定位时仍从 Wikipedia 查询
          const results = province
            ? await searchIplant(q)
            : await searchOnline(q);
          if (isStale()) return;
          setState({
            results,
            flora: null,
            loading: false,
            error: null,
            hasSearched: true,
          });
        }
      } catch (err) {
        if (isStale()) return;
        setState({
          results: [],
          flora: null,
          loading: false,
          error: err instanceof Error ? err.message : "搜索出错了",
          hasSearched: true,
        });
      }
    },
    [province, searchLocal, searchOnline]
  );

  // 模式切换或定位变化时重新搜索（定位变化会改变本地图鉴的数据集）
  useEffect(() => {
    performSearch(query, mode);
  }, [mode, province]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      performSearch(q, mode);
    },
    [mode, performSearch]
  );

  const handleModeChange = useCallback(
    (newMode: SearchMode) => {
      setMode(newMode);
    },
    []
  );

  return {
    query,
    mode,
    ...state,
    search: handleSearch,
    changeMode: handleModeChange,
  };
}

// ===== 网络百科：植物条目识别 =====

/** 批量获取页面分类 */
async function fetchCategories(pageIds: string): Promise<Record<number, string[]>> {
  const map: Record<number, string[]> = {};
  try {
    const url = `https://zh.wikipedia.org/w/api.php?action=query&prop=categories&pageids=${pageIds}&cllimit=50&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return map;

    const data = await res.json();
    const catPages = data.query?.pages ?? {};
    for (const key of Object.keys(catPages)) {
      map[Number(key)] = (catPages[key].categories ?? []).map((c: any) =>
        stripCategoryPrefix(c.title)
      );
    }
  } catch {
    // 分类获取失败时继续，由摘要与正文兜底判断
  }
  return map;
}

/** 获取页面摘要（REST API，失败时重试一次，避免限流导致结果丢失） */
async function fetchSummary(title: string): Promise<any | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const url = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
      // 4xx 明确失败，不再重试
      if (res.status < 500 && res.status !== 429) return null;
    } catch {
      // 网络异常时重试
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

/**
 * 批量取 Wikidata 的 P225（分类单元名称）作为学名的可靠来源
 * 只在该请求失败时回退到从简介正文解析，不影响搜索结果
 */
async function fetchTaxonNames(wikibaseIds: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const ids = wikibaseIds.filter(Boolean);
  if (ids.length === 0) return map;

  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join(
    "|"
  )}&props=claims&format=json&origin=*`;

  // 共享代理 IP 易被 Wikimedia 限流，重试 3 次
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const entities = data.entities ?? {};
      for (const id of Object.keys(entities)) {
        const claims = entities[id]?.claims?.P225 ?? [];
        for (const claim of claims) {
          const value = claim?.mainsnak?.datavalue?.value;
          if (typeof value === "string" && value.trim()) {
            map[id] = value.trim();
            break;
          }
        }
      }
      return map;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return map;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, "");
}

function stripCategoryPrefix(title: string): string {
  return title.replace(/^(?:Category|分類|分类)\s*[:：]\s*/i, "").trim();
}

/**
 * 繁→简字符对照表（仅覆盖分类名/简介中常见的用字）
 * 中文维基的分类与简介繁简混用，统一转简后再匹配关键词，避免漏判
 */
const TRAD_TO_SIMP: Record<string, string> = {
  電: "电", 視: "视", 劇: "剧", 動: "动", 畫: "画", 遊: "游", 戲: "戏",
  員: "员", 藝: "艺", 導: "导", 運: "运", 樂: "乐", 隊: "队", 團: "团",
  業: "业", 織: "织", 構: "构", 黨: "党", 學: "学", 區: "区", 車: "车",
  鐵: "铁", 機: "机", 場: "场", 脈: "脉", 島: "岛", 嶼: "屿", 軟: "软",
  體: "体", 網: "网", 節: "节", 獎: "奖", 項: "项", 賽: "赛", 爭: "争",
  戰: "战", 話: "话", 傳: "传", 藥: "药", 樹: "树", 葉: "叶", 實: "实",
  種: "种", 蘚: "藓", 園: "园", 觀: "观", 賞: "赏", 農: "农", 雙: "双",
  單: "单", 綠: "绿", 澆: "浇", 濕: "湿", 溫: "温", 專: "专", 輯: "辑",
  說: "说", 屬: "属", 義: "义", 條: "条", 術: "术", 錄: "录", 攝: "摄",
  獨: "独", 數: "数", 與: "与", 為: "为", 個: "个", 這: "这", 們: "们",
  產: "产", 類: "类", 積: "积", 週: "周", 龍: "龙", 門: "门", 鳥: "鸟",
  魚: "鱼", 蟲: "虫", 貝: "贝", 醫: "医", 護: "护", 檢: "检", 驗: "验",
  資: "资", 處: "处", 長: "长", 會: "会", 價: "价", 書: "书", 記: "记",
  標: "标", 準: "准", 圍: "围", 內: "内", 筆: "笔", 頁: "页", 圖: "图",
  語: "语", 詞: "词", 現: "现", 組: "组", 報: "报", 雜: "杂", 誌: "志",
  陰: "阴", 陽: "阳", 喬: "乔", 詩: "诗", 國: "国", 編: "编", 綜: "综",
  紀: "纪", 絡: "络",
  蘭: "兰", 鶴: "鹤", 蓮: "莲", 蘋: "苹", 鳳: "凤", 麥: "麦", 蘆: "芦",
  蘇: "苏", 華: "华", 蕎: "荞", 漿: "浆", 齊: "齐", 萬: "万", 歲: "岁",
  雲: "云", 縣: "县", 鄉: "乡", 楊: "杨", 欖: "榄", 欒: "栾", 樺: "桦",
  檜: "桧", 樅: "枞", 楨: "桢", 梔: "栀", 薔: "蔷", 薺: "荠", 蕪: "芜",
  蒼: "苍", 蕓: "芸", 蔥: "葱", 薑: "姜", 蠟: "蜡", 蠅: "蝇", 纖: "纤",
  豔: "艳", 艷: "艳", 馬: "马", 風: "风", 還: "还", 過: "过", 進: "进",
  開: "开", 關: "关", 問: "问", 間: "间", 題: "题", 樣: "样", 時: "时",
  對: "对", 讀: "读", 寫: "写", 聽: "听", 聲: "声", 飛: "飞", 輪: "轮",
  錢: "钱", 銀: "银", 礦: "矿", 鹽: "盐", 鷺: "鹭", 鷹: "鹰", 鴉: "鸦",
  鵝: "鹅", 鷗: "鸥", 鸚: "鹦", 鵡: "鹉",
};

function normalizeZh(text: string): string {
  let out = "";
  for (const ch of text) out += TRAD_TO_SIMP[ch] ?? ch;
  return out;
}

/** 标题中带非植物主题的括号限定词（Wikipedia 以此区分同名条目，匹配前已转简） */
const NON_PLANT_TITLE_QUALIFIER_RE =
  /[（(][^）)]*?(电影|电视剧|剧集|网络剧|歌曲|专辑|单曲|音乐|小说|漫画|动画|动漫|游戏|综艺|纪录片|歌剧|人物|艺人|演员|歌手|导演|作家|乐队|乐团|球队|公司|企业|品牌|学校|大学|学院|车站|铁路|城市|行政区|地名|山脉|河流|湖泊|岛屿|国家|软件|网站|编程语言|节日|事件|战争|奖项|消歧义|disambiguation)[^）)]*?[）)]/i;

/** 分类中表明是非植物内容的主题关键词（影视、人物、机构、地点等，匹配前已转简） */
const NON_PLANT_CATEGORY_KEYWORDS = [
  "电影", "电视剧", "剧集", "网络剧", "歌剧", "音乐剧", "综艺", "纪录片",
  "演出", "歌曲", "专辑", "单曲", "音乐", "唱片", "动画", "动漫", "漫画",
  "小说", "游戏", "电子游戏", "影视", "人物", "演员", "艺人", "歌手",
  "导演", "作家", "运动员", "政治人物", "乐队", "乐团", "团体", "球队",
  "公司", "企业", "品牌", "组织", "机构", "政党", "协会", "集团", "媒体",
  "大学", "学校", "学院", "城市", "行政区", "地名", "车站", "铁路",
  "公路", "机场", "港口", "山脉", "河流", "湖泊", "岛屿", "旅游",
  "软件", "网站", "编程语言", "操作系统", "节日", "奖项", "赛事",
  "比赛", "战争", "战役", "事件", "宗教", "神话", "文物", "杂志",
  "期刊", "报纸", "电台", "电视台", "植物学", "植物园",
  "film", "movie", "television", "song", "album", "band", "singer",
  "actor", "company", "organization", "university", "school", "city",
  "software", "website", "video game", "novel",
];

/** 原生动物/微生物等非植物生物（用于排除同名生物条目） */
const ANIMAL_DESCRIPTION_RE =
  /动物|昆虫|鸟类|鸟纲|鱼类|鱼纲|蛇类|蛇亚目|蜥蜴|蛙类|蟾蜍|蝾螈|龟鳖|鳄目|哺乳动物|哺乳纲|蜘蛛|软体动物|甲壳|节肢动物|爬行动物|两栖动物|棘皮动物|刺胞动物|环节动物|线形动物|真菌|细菌|病毒|微生物|藻类|长臂猿|灵长类|灵长目|猩猩|狒狒|猕猴|猫科|犬科|熊科|鹿科|牛科|猪科|马科|象科|海豚|海豹|海狮|海象|海牛|蝙蝠|啮齿|有袋类|食肉目|偶蹄目|奇蹄目|长鼻目|有鳞目|无尾目|硬骨鱼|软骨鱼|蛛形纲|珊瑚|水母|海葵|海星|海胆|海参|鹦鹉|企鹅|鸵鸟|猫头鹰/i;

/** 简介中明确表明是植物的关键词 */
const PLANT_DESCRIPTION_RE =
  /植物|花卉|乔木|灌木|草本|藤本|多肉|仙人掌|蕨|苔藓|树木|果树|农作物|作物/i;

/** 简介中表明是影视、人物、地点、机构等非植物内容的关键词 */
const NON_PLANT_DESCRIPTION_RE =
  /电影|電視劇|电视剧|剧集|网络剧|歌曲|专辑|单曲|音乐作品|歌手|演员|艺人|导演|作家|小说家|诗人|主持人|政治人物|运动员|乐队|乐团|小说|漫画|动画|动漫|电子游戏|公司|企业|品牌|组织|机构|政党|大学|学院|学校|城市|首都|行政区|国家|地名|车站|铁路|公路|机场|港口|山脉|河流|湖泊|岛屿|旅游|软件|网站|编程语言|操作系统|应用程序|节日|奖项|比赛|赛事|战争|战役|事件|宗教|神话|传说|植物学|植物园|植物油|植物人|film|movie|television|song|album|band|singer|actor|actress|company|organization|university|school|city|software|website|video game|novel|botanist|botany/i;

/** 植物相关分类关键词（多字词，避免「花」「树」等单字误判） */
const PLANT_CATEGORY_KEYWORDS = [
  "植物", "花卉", "树木", "草本", "木本", "藤本", "多肉", "仙人掌",
  "蕨类", "苔藓", "园艺", "盆栽", "观赏植物", "被子植物", "裸子植物",
  "双子叶植物", "单子叶植物",
];

/** 分类单元分类名，如「天南星科」「龟背竹属」（繁简统一后再匹配） */
const TAXON_CATEGORY_RE = /^[\u4e00-\u9fa5]{2,6}(?:科|属)$/;

/** 形如「XX科/XX属」但并非分类单元的分类名，避免误判（维基百科、信息科学、金属等） */
const NON_TAXON_KE_RE =
  /(?:科学|学科|百科|维基|本科|专科|外科|内科|儿科|妇科|眼科|牙科|骨科|皮肤科|精神科|医科|理科|文科|工科|社科|教科|全科|科普|金属|附属|专属)$/;

/**
 * 动物分类单元名：以动物用字 + 「科/属」结尾（如「长臂猿科」「猫属」）
 * 中文植物属名多在属前保留 ≥2 个语义字（虎刺属、猪笼草属、鹤望兰属、燕麦属），
 * 因此结尾锚定不会误伤这些植物
 */
const ANIMAL_TAXON_CATEGORY_RE =
  /(?:猿|猴|猩猩|狒狒|猕猴|长臂猿|猫|犬|狗|狼|狐|熊|熊猫|浣熊|貂|鼬|獾|獭|獺|鹿|麝|羚|牛|羊|豬|猪|馬|马|驴|驢|骆驼|駱駝|象|犀|河马|鲸|豚|海豹|海狮|海象|海牛|蝙蝠|兔|鼠|松鼠|仓鼠|河狸|狮|獅|虎|豹|蛇|蟒|蚺|蜥蜴|龟|鱉|鳖|鳄|鱷|蛙|蟾蜍|蝾螈|蠑螈|鲵|鱼|鯊|鲨|鳐|魟|虾|蟹|螺|蜗牛|蛞蝓|乌贼|章鱼|昆虫|蝴蝶|甲虫|蜻蜓|螳螂|蝉|蝗虫|蟋蟀|蚂蚁|蟻|蜜蜂|蝇|蚊|蜘蛛|蝎|蠍|蜈蚣|马陆|蚯蚓|水蛭|珊瑚|水母|海葵|海星|海胆|海参|鸟|鸡|雉|鸭|雁|燕|雀|鹰|鷹|鸮|鹦鹉|鸚鵡|鹤|鶴|鸦|鸽|鸠|鹃|鹅)(?:科|属)$/;

/** 正文中的植物特征关键词（兜底判断，需命中多个） */
const PLANT_TEXT_KEYWORDS = [
  "叶片", "叶子", "花瓣", "花序", "花冠", "花萼", "果实", "种子",
  "植株", "根系", "花期", "果期", "学名", "栽培", "繁殖", "扦插",
  "播种", "嫁接", "分株", "叶插", "盆栽", "园艺", "常绿", "落叶",
  "多年生", "一年生", "灌木", "乔木", "草本", "藤本", "喜阴", "喜阳",
  "耐旱", "耐寒", "耐阴", "土壤", "浇水", "光照", "观赏植物",
];

/** 判断是否为消歧义页或列表页 */
function isDisambiguation(title: string, categories: string[]): boolean {
  const t = normalizeZh(title).toLowerCase();
  if (t.includes("消歧义") || t.includes("disambiguation")) return true;
  if (t.endsWith("列表")) return true;
  const catText = normalizeZh(categories.join(" ")).toLowerCase();
  return catText.includes("消歧义") || catText.includes("disambiguation");
}

/**
 * 第一轮过滤：仅凭标题与分类即可判定为非植物内容时返回 true
 * 用于在拉取摘要前排除掉同名的影视、人物、地点等条目
 */
function isObviouslyNonPlant(title: string, categories: string[]): boolean {
  if (isDisambiguation(title, categories)) return true;
  if (NON_PLANT_TITLE_QUALIFIER_RE.test(normalizeZh(title))) return true;

  const catText = normalizeZh(categories.join(" ")).toLowerCase();
  if (catText && NON_PLANT_CATEGORY_KEYWORDS.some((kw) => catText.includes(kw))) {
    return true;
  }

  return false;
}

/**
 * 第二轮过滤：结合标题、分类、简介与正文判断是否是植物条目
 * 只有确认为植物才返回 true，同名非植物内容一律过滤
 */
function isPlantEntry(
  title: string,
  snippet: string,
  categories: string[],
  summary: any
): boolean {
  // 0. 消歧义页 / 列表页不显示
  if (summary.type === "disambiguation") return false;
  if (isDisambiguation(title, categories)) return false;

  // 1. 标题带非植物主题限定词 → 同名非植物条目
  if (NON_PLANT_TITLE_QUALIFIER_RE.test(normalizeZh(title))) return false;

  const description = normalizeZh(String(summary.description ?? "").trim());

  // 2. 简介表明是影视 / 人物 / 地点等 → 排除
  if (description && NON_PLANT_DESCRIPTION_RE.test(description)) return false;

  // 3. 简介直接写明是植物 → 保留
  if (description && PLANT_DESCRIPTION_RE.test(description)) return true;

  // 4. 简介表明是动物 / 微生物 → 排除
  if (description && ANIMAL_DESCRIPTION_RE.test(description)) return false;

  // 5. 分类中含植物关键词或科/属等分类单元 → 保留
  if (hasPlantCategory(categories)) return true;

  // 6. 正文中植物特征词足够多 → 保留（兜底）
  const text = normalizeZh(
    `${title} ${snippet} ${String(summary.extract ?? "")}`
  ).toLowerCase();
  const hits = PLANT_TEXT_KEYWORDS.filter((kw) => text.includes(kw)).length;
  return hits >= 3;
}

function hasPlantCategory(categories: string[]): boolean {
  return categories.some((cat) => {
    const name = normalizeZh(stripCategoryPrefix(cat));
    if (!name) return false;
    if (PLANT_CATEGORY_KEYWORDS.some((kw) => name.includes(kw))) return true;
    return (
      TAXON_CATEGORY_RE.test(name) &&
      !NON_TAXON_KE_RE.test(name) &&
      !ANIMAL_TAXON_CATEGORY_RE.test(name)
    );
  });
}

// ===== 养护信息推断（基于摘要文本的启发式规则） =====

function guessCategory(title: string, text: string): string {
  const t = (title + text).toLowerCase();
  if (/多肉|景天|仙人掌|succulent|cactus/i.test(t)) return "多肉植物";
  if (/兰|orchid/i.test(t)) return "观花植物";
  if (/蕨|fern/i.test(t)) return "蕨类植物";
  if (/竹芋|calathea|maranta/i.test(t)) return "观叶植物";
  return "观叶植物";
}

/**
 * 解析查询词的重定向目标标题（别名检索，如「白掌」→「白鹤芋」）
 * 页面不存在或不是重定向时返回 null，仅用原查询词做标题匹配
 */
async function resolveRedirect(title: string): Promise<string | null> {
  try {
    const url = `https://zh.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      title
    )}&redirects=1&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    return data.query?.redirects?.[0]?.to ?? null;
  } catch {
    return null;
  }
}

/** 正文长度低于此值且无养护关键词时，认为信息不足以推断养护参数（实测维基一句话条目仅 15–16 字） */
const CARE_INFO_MIN_LENGTH = 30;

/** 养护线索关键词：正文出现任意一个即视为具备养护信息 */
const CARE_KEYWORD_RE =
  /光照|日照|阳光|耐阴|喜阴|喜阳|散射光|全日照|半阴|遮阴|浇水|灌溉|湿润|干旱|耐旱|水分|排水|浇透|温度|耐寒|越冬|低温|高温|气温|适温|湿度|喷雾|土壤|基质|腐殖|沙质|酸碱|栽培|种植|养护|繁殖|扦插|播种|嫁接|分株|盆栽|施肥|修剪|移植|育苗/;

/**
 * 判断条目是否有足够内容推断养护参数
 * 短条目（如「XX属为YY科的一个属」）套用默认值等于编造养护建议，应判定为无养护信息
 */
function hasCareEvidence(text: string): boolean {
  const plain = stripHtml(text);
  return plain.length >= CARE_INFO_MIN_LENGTH || CARE_KEYWORD_RE.test(plain);
}

/**
 * 从简介/正文中提取拉丁学名
 * 优先取「学名：」后的拉丁名（兼容属级页面的单名），其次匹配裸双名法
 * 提取不到时返回空串，不再回退成通用名
 */
function extractScientificName(text: string): string {
  const plain = stripHtml(text).replace(/[（）()【】[\]]/g, " ");

  const labeled = plain.match(/学名\s*[:：]\s*([A-Z][a-zA-Z.-]*(?:\s+[a-z][a-z-]+){0,2})/);
  if (labeled) return trimTaxonName(labeled[1]);

  const binomial = plain.match(/\b([A-Z][a-z]{2,}(?:\s+[a-z][a-z-]+){1,2})\b/);
  return binomial ? trimTaxonName(binomial[1]) : "";
}

/** 去掉学名末尾的标点与常见后缀 */
function trimTaxonName(name: string): string {
  return name
    .replace(/\s*(?:sp|spp|subsp|var|f)\.?$/i, "")
    .replace(/[\s,;.、。]+$/, "")
    .trim();
}

function inferLight(text: string): string {
  if (/阴|shade|low light/i.test(text)) return "低光环境";
  if (/阳|sun|bright/i.test(text)) return "明亮光照";
  return "明亮散射光";
}

function inferWater(text: string): string {
  if (/耐旱|drought/i.test(text)) return "土壤干燥后浇水";
  if (/湿润|moist|wet/i.test(text)) return "保持土壤微湿";
  return "表土干燥后浇透";
}

function inferHumidity(text: string): string {
  if (/热带|tropical|humid/i.test(text)) return "60% 以上";
  return "40%–60%";
}

function inferTemperature(text: string): string {
  if (/耐寒|cold|hardy/i.test(text)) return "10–25°C";
  return "15–27°C";
}

function inferDifficulty(text: string): "新手友好" | "中等" | "有挑战" {
  if (/易|easy|hardy/i.test(text)) return "新手友好";
  if (/难|difficult|tricky/i.test(text)) return "有挑战";
  return "中等";
}

function inferToxicity(text: string): string {
  if (/有毒|toxic|poisonous/i.test(text)) return "可能有毒，避免误食";
  return "毒性未知，请谨慎";
}

function generateTips(category: string, _text: string): string[] {
  const tips: string[] = [];
  if (category === "多肉植物") {
    tips.push("确保充足光照，避免徒长");
    tips.push("宁干勿湿，浇水过多易烂根");
  } else if (category === "观花植物") {
    tips.push("花后及时修剪残花，促进复花");
    tips.push("生长期适当补充磷钾肥");
  } else {
    tips.push("定期擦拭叶片，保持清洁");
    tips.push("根据季节调整浇水频率");
  }
  tips.push("网络百科信息仅供参考，具体养护请结合实际环境");
  return tips;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}
