export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  aliases: string[];
  category: string;
  light: string;
  water: string;
  humidity: string;
  temperature: string;
  soil: string;
  difficulty: "新手友好" | "中等" | "有挑战";
  toxicity: string;
  description: string;
  careTips: string[];
  imageUrl: string;
  source: "local" | "online";
  /** 条目是否有足够内容推断养护参数；网络百科的短条目为 false，界面不展示养护信息 */
  hasCareInfo: boolean;
  /** 中国植物物种名录（CVH）补充信息；仅当名录中存在对应条目时才有值 */
  cvh?: CvhPlantInfo | null;
  /** 条目原文页地址（如中国植物志 iplant.cn 条目页）；有值时详情面板提供「查看原文」入口 */
  externalUrl?: string;
}

/** 来自中国数字植物标本馆（CVH）「中国植物物种名录」的权威信息 */
export interface CvhPlantInfo {
  /** 名录中的中文名 */
  chName: string;
  /** 名录中的学名（拉丁名） */
  sciName: string;
  /** 该名称在名录中未被接受时给出的接受名，如「= Ginkgo biloba（银杏）」 */
  acceptedName: string | null;
  /** 异名 */
  synonyms: string[];
  /** 省级分布 */
  distribution: string;
  /** 形态描述，取自《中国植物志》 */
  description: string;
  /** 描述引用来源 */
  reference: string;
}

export type SearchMode = "local" | "online";

/** 省级行政区（含下辖地级行政区，用于手动选择城市） */
export interface Province {
  /** 全称，如「内蒙古自治区」 */
  name: string;
  /** 短名，与 CVH 的 distribution_c 同口径，如「内蒙古」 */
  short: string;
  /** 下辖地级行政区；直辖市为自身 */
  cities: string[];
}

/** 定位来源：设备 GPS / IP 兜底 / 手动选择 */
export type LocationSource = "gps" | "ip" | "manual";

/** 用户定位结果；持久化于 localStorage（key: plant-care-location） */
export interface UserLocation {
  /** 省名短名，如「浙江」 */
  province: string;
  /** 市名，如「杭州市」 */
  city: string;
  source: LocationSource;
  latitude?: number;
  longitude?: number;
}

/**
 * 省级常见植物排行的一行
 * 口径为「CVH 标本按省聚合的常见度排行」；本期为模拟数据（见 src/data/provinceFlora.ts）
 */
export interface ProvincePlant {
  /** 排名，从 1 开始 */
  rank: number;
  /** 中文名 */
  name: string;
  /** 拉丁学名 */
  scientificName: string;
  /** 该省的标本采集记录数（本期为模拟值，仅用于体现排序） */
  records: number;
  /**
   * 中文名命中本地 20 种时挂载完整养护数据，该行可点开详情并带养护标记；
   * 未命中时为 undefined，该行仅作展示、不可点击
   */
  plant?: Plant;
}
