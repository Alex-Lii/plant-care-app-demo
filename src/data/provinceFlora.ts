import type { Plant, ProvincePlant } from "../types";
import { localPlants } from "./plants";

/**
 * 省级常见植物排行（本期为**模拟数据**）
 *
 * 口径（已确认）：CVH（中国数字植物标本馆）标本按省聚合后的常见度排行 ——
 * 「标本采集记录数」降序即近似常见度。真实口径需按省聚合 /api/cvh/controller/spms/list.php，
 * 单省动辄几十万条记录，必须由后端离线 ETL 抓取一次后入库（后续再做增量），
 * 故本期先用模拟数据打通 UI 与数据流。
 *
 * 模拟数据必须满足：
 * 1. **确定性**：以省名做种子生成，同一省份每次结果完全一致（避免刷新跳变）；
 * 2. **覆盖全部 34 个省级行政区**：任意省名都能生成，不出现「有定位却无数据」的死路；
 *
 * 后续替换为真实聚合数据时，只需改写 getProvinceFlora 的数据来源，UI 无需改动。
 */

/** 每省展示的行数 */
const ROW_COUNT = 18;
/** 每省至少出现的「本地 20 种」数量，保证存在带养护标记、可点开详情的行 */
const MIN_LOCAL = 5;

/** 乡土 / 园林植物的养护资料（按大众园艺常识人工整理，与模拟排行数据配套） */
interface WildCare {
  light: string;
  water: string;
  humidity: string;
  temperature: string;
  soil: string;
  difficulty: Plant["difficulty"];
  toxicity: string;
  description: string;
  careTips: string[];
}

/** 除本地 20 种之外的常见乡土 / 园林植物池（名称使用大众常用全名，每种都配养护资料） */
const WILD_POOL: {
  name: string;
  scientificName: string;
  care: WildCare;
}[] = [
  {
    name: "马尾松",
    scientificName: "Pinus massoniana",
    care: {
      light: "全日照",
      water: "耐旱，忌积水",
      humidity: "对空气湿度不敏感",
      temperature: "耐 -10℃ 低温与夏季高温",
      soil: "酸性土壤（pH 4.5~6.5），贫瘠山地亦可生长",
      difficulty: "有挑战",
      toxicity: "无毒",
      description:
        "松科常绿大乔木，南方荒山造林的先锋树种，树皮红褐色呈不规则鳞片状剥落。",
      careTips: [
        "家庭盆栽宜选矮化品种，置于通风向阳处",
        "忌积水与土壤板结，梅雨季注意排涝",
      ],
    },
  },
  {
    name: "樟树",
    scientificName: "Cinnamomum camphora",
    care: {
      light: "全日照，亦耐半阴",
      water: "耐旱，幼苗期保持土壤微润",
      humidity: "适应性强",
      temperature: "喜温暖，耐 -7℃ 左右短时低温",
      soil: "深厚肥沃的微酸性砂质壤土",
      difficulty: "中等",
      toxicity: "枝叶含樟脑香气，不可食用",
      description:
        "樟科常绿大乔木，南方最常见的行道树与庭荫树之一，全株散发樟脑清香。",
      careTips: [
        "移栽宜在春季萌芽前进行，需带土球",
        "作盆景观赏需常修剪控制株高",
      ],
    },
  },
  {
    name: "桂花",
    scientificName: "Osmanthus fragrans",
    care: {
      light: "全日照至半阴，光照充足开花更盛",
      water: "见干见湿，忌积水",
      humidity: "喜较高的空气湿度",
      temperature: "喜温暖，耐 -5℃ 左右低温，北方盆栽冬季入室",
      soil: "肥沃、排水良好的微酸性砂壤土",
      difficulty: "中等",
      toxicity: "花无毒，可制作桂花茶与糕点",
      description:
        "木犀科常绿小乔木，秋季开花，香气浓郁，是中国传统十大名花之一。",
      careTips: [
        "花芽分化期（6~8 月）保证光照并补磷钾肥",
        "盆栽每 1~2 年换盆一次，避免土壤碱化",
      ],
    },
  },
  {
    name: "银杏",
    scientificName: "Ginkgo biloba",
    care: {
      light: "全日照",
      water: "耐旱，忌积水",
      humidity: "对湿度要求不高",
      temperature: "极耐寒，可耐 -20℃",
      soil: "土层深厚、排水良好，微酸至微碱均可",
      difficulty: "新手友好",
      toxicity: "种仁（白果）可食，但含微量毒素，不宜生食或过量",
      description:
        "银杏科落叶大乔木，有「活化石」之称，扇形叶入秋金黄，观赏价值极高。",
      careTips: [
        "生长缓慢，盆景造型需耐心",
        "作果树需配植雌株并防白果气味沾衣",
      ],
    },
  },
  {
    name: "毛竹",
    scientificName: "Phyllostachys edulis",
    care: {
      light: "全日照或半阴",
      water: "喜湿润，忌积水",
      humidity: "喜空气湿润",
      temperature: "喜温暖湿润，耐 -10℃ 左右",
      soil: "土层深厚肥沃、排水良好的酸性土",
      difficulty: "有挑战",
      toxicity: "竿与叶无毒",
      description:
        "禾本科大型竹类，秆高可达 20 米，是我国分布最广、经济价值最高的竹种。",
      careTips: [
        "地栽需设隔根板防止竹鞭蔓延",
        "盆栽保持盆土湿润并常喷雾",
      ],
    },
  },
  {
    name: "茶树",
    scientificName: "Camellia sinensis",
    care: {
      light: "半阴或明亮散射光，忌烈日暴晒",
      water: "喜湿润，忌积水",
      humidity: "喜高湿环境",
      temperature: "喜温暖，适宜 18~25℃，耐 -8℃ 左右",
      soil: "酸性红壤或黄壤（pH 4.5~5.5）",
      difficulty: "中等",
      toxicity: "嫩叶可制茶，无毒",
      description:
        "山茶科常绿灌木或小乔木，世界著名饮品作物，嫩芽经加工即成茶叶。",
      careTips: [
        "盆栽用酸性营养土，定期补硫酸亚铁防黄化",
        "可采摘嫩芽自制绿茶",
      ],
    },
  },
  {
    name: "油茶",
    scientificName: "Camellia oleifera",
    care: {
      light: "全日照",
      water: "耐旱，忌积水",
      humidity: "对湿度要求不高",
      temperature: "耐寒，可耐 -10℃",
      soil: "酸性土壤，贫瘠山地亦能生长",
      difficulty: "中等",
      toxicity: "种子可榨茶油，无毒",
      description:
        "山茶科常绿灌木或小乔木，与油棕、油橄榄、椰子并称世界四大木本油料植物。",
      careTips: [
        "秋季果熟期需充足光照提高含油量",
        "幼树修剪成自然开心形利于通风透光",
      ],
    },
  },
  {
    name: "水杉",
    scientificName: "Metasequoia glyptostroboides",
    care: {
      light: "全日照",
      water: "喜湿润，耐短时水湿",
      humidity: "喜空气湿润",
      temperature: "耐寒，可耐 -15℃",
      soil: "肥沃湿润的土壤，河滩水边亦可",
      difficulty: "中等",
      toxicity: "无毒",
      description:
        "杉科落叶乔木，孑遗植物「活化石」，羽状对生的小叶入冬变褐脱落。",
      careTips: [
        "喜光，荫蔽处生长不良",
        "春栽成活率高，注意保持土壤湿润",
      ],
    },
  },
  {
    name: "侧柏",
    scientificName: "Platycladus orientalis",
    care: {
      light: "全日照，稍耐阴",
      water: "极耐旱，忌积水",
      humidity: "喜干燥环境",
      temperature: "极耐寒，可耐 -25℃",
      soil: "对土壤要求不严，钙质土、瘠薄地均可",
      difficulty: "新手友好",
      toxicity: "枝叶与种仁可入药，不宜食用",
      description:
        "柏科常绿乔木，树冠塔形，北方最常见的绿化与造林树种之一。",
      careTips: [
        "耐修剪，常作绿篱与造型盆景",
        "忌低洼积水地栽植",
      ],
    },
  },
  {
    name: "广玉兰",
    scientificName: "Magnolia grandiflora",
    care: {
      light: "全日照，耐半阴",
      water: "喜湿润，忌积水",
      humidity: "喜湿润空气",
      temperature: "喜温暖，耐 -5℃ 左右，北方需防寒",
      soil: "肥沃、湿润、排水良好的微酸性土",
      difficulty: "中等",
      toxicity: "无毒",
      description:
        "木兰科常绿乔木，叶革质光亮，花大如荷、白色芳香，被誉为「荷花玉兰」。",
      careTips: [
        "根系肉质怕涝，雨季注意排水",
        "移栽需带土球并适当疏枝",
      ],
    },
  },
  {
    name: "紫薇",
    scientificName: "Lagerstroemia indica",
    care: {
      light: "全日照，光照越足开花越多",
      water: "耐旱，忌长期积水",
      humidity: "对湿度不敏感",
      temperature: "耐热，亦耐 -10℃ 左右",
      soil: "排水良好的石灰性土壤或砂壤土",
      difficulty: "新手友好",
      toxicity: "无毒",
      description:
        "千屈菜科落叶小乔木，夏季花期长达百日，故称「百日红」，树干光滑。",
      careTips: [
        "冬季重剪促来年新枝开花",
        "花后及时剪除残花序可二次开花",
      ],
    },
  },
  {
    name: "女贞",
    scientificName: "Ligustrum lucidum",
    care: {
      light: "全日照，耐半阴",
      water: "耐旱亦耐湿，适应性强",
      humidity: "对湿度要求不高",
      temperature: "耐寒，可耐 -10℃",
      soil: "不择土壤",
      difficulty: "新手友好",
      toxicity: "果实可入药（女贞子），不宜食用",
      description:
        "木犀科常绿乔木，枝叶茂密、终年常绿，常用作绿篱与行道树。",
      careTips: [
        "生长快，耐修剪，每年整形 1~2 次",
        "播种或扦插繁殖均易成活",
      ],
    },
  },
  {
    name: "构树",
    scientificName: "Broussonetia papyrifera",
    care: {
      light: "全日照",
      water: "极耐旱、耐贫瘠",
      humidity: "对湿度不敏感",
      temperature: "耐寒，可耐 -15℃",
      soil: "不择土壤，荒地石缝皆可生长",
      difficulty: "新手友好",
      toxicity: "聚花果（楮桃）成熟后可食",
      description: "桑科落叶乔木，速生乡土树种，叶面粗糙，雌雄异株。",
      careTips: [
        "生长极快，注意控制栽植范围",
        "雄株开花不结果，观果选雌株",
      ],
    },
  },
  {
    name: "枫香",
    scientificName: "Liquidambar formosana",
    care: {
      light: "全日照",
      water: "喜湿润，耐短时水湿",
      humidity: "喜湿润空气",
      temperature: "耐寒，可耐 -10℃",
      soil: "酸性或中性土壤",
      difficulty: "中等",
      toxicity: "无毒",
      description:
        "金缕梅科落叶大乔木，树脂有香气，秋叶红艳，是南方著名秋色叶树种。",
      careTips: [
        "作秋景树需充足光照叶色才红",
        "移栽大苗需重剪并带土球",
      ],
    },
  },
  {
    name: "黄栌",
    scientificName: "Cotinus coggygria",
    care: {
      light: "全日照",
      water: "耐旱，忌积水",
      humidity: "喜干燥",
      temperature: "极耐寒，可耐 -15℃，亦耐高温",
      soil: "耐瘠薄，排水良好的砂砾土最佳",
      difficulty: "新手友好",
      toxicity: "无毒",
      description:
        "漆树科落叶灌木或小乔木，香山红叶的主要树种，不育花序如烟，亦称「烟树」。",
      careTips: [
        "秋季昼夜温差大叶色更红",
        "雨季注意排水防烂根",
      ],
    },
  },
  {
    name: "杜鹃",
    scientificName: "Rhododendron simsii",
    care: {
      light: "半阴或明亮散射光，忌烈日直晒",
      water: "喜湿润，忌积水",
      humidity: "喜高湿，需常喷雾",
      temperature: "喜凉爽，适宜 15~25℃，冬季耐 -5℃ 左右",
      soil: "酸性土（pH 5~6），忌碱性水土",
      difficulty: "有挑战",
      toxicity: "部分种类有毒，花与叶不可食用",
      description:
        "杜鹃花科常绿或落叶灌木，酸性土指示植物，春季花繁色艳，品种极多。",
      careTips: [
        "浇水用雨水或晾晒过的自来水，防土壤碱化",
        "花后摘除残花并疏剪过密枝",
      ],
    },
  },
  {
    name: "栀子",
    scientificName: "Gardenia jasminoides",
    care: {
      light: "全日照，夏季适当遮阴",
      water: "喜湿润，忌积水",
      humidity: "喜高湿环境",
      temperature: "喜温暖，适宜 18~25℃，冬季不低于 0℃",
      soil: "酸性土（pH 5~6）",
      difficulty: "中等",
      toxicity: "花无毒，可窨茶或食用",
      description:
        "茜草科常绿灌木，初夏开白色重瓣花，香气浓郁，叶色终年翠绿。",
      careTips: [
        "黄叶多为缺铁所致，浇灌硫酸亚铁溶液",
        "花后短截枝条促分枝",
      ],
    },
  },
  {
    name: "山茶",
    scientificName: "Camellia japonica",
    care: {
      light: "半阴或散射光，忌暴晒",
      water: "见干见湿，忌积水",
      humidity: "喜高湿",
      temperature: "喜温暖，适宜 10~20℃，耐寒品种可耐 -5℃",
      soil: "酸性肥沃土壤（pH 5~6）",
      difficulty: "中等",
      toxicity: "无毒",
      description:
        "山茶科常绿灌木，冬春开花，花色丰富，是中国传统十大名花之一。",
      careTips: [
        "花蕾过多时适当疏蕾，每枝留 1~2 个",
        "冬季移入室内明亮处，远离暖气",
      ],
    },
  },
  {
    name: "木槿",
    scientificName: "Hibiscus syriacus",
    care: {
      light: "全日照",
      water: "耐旱，忌积水",
      humidity: "对湿度要求不高",
      temperature: "耐寒，可耐 -15℃",
      soil: "不择土壤，瘠薄地亦能生长",
      difficulty: "新手友好",
      toxicity: "花无毒，可作蔬菜食用",
      description:
        "锦葵科落叶灌木，夏秋开花，朝开暮落、日日不绝，韩国国花。",
      careTips: [
        "冬季强剪，来年新枝开花繁茂",
        "及时摘除残花保持整洁",
      ],
    },
  },
  {
    name: "迎春花",
    scientificName: "Jasminum nudiflorum",
    care: {
      light: "全日照，亦耐半阴",
      water: "耐旱，忌积水",
      humidity: "对湿度要求不高",
      temperature: "耐寒，可耐 -10℃",
      soil: "不择土壤",
      difficulty: "新手友好",
      toxicity: "无毒",
      description:
        "木犀科落叶灌木，早春先花后叶，金色小花缀满枝条，是「雪中四友」之一。",
      careTips: [
        "花后短截开花枝促分枝",
        "盆景可蟠扎成垂枝形",
      ],
    },
  },
  {
    name: "石榴",
    scientificName: "Punica granatum",
    care: {
      light: "全日照，光照越足花越繁",
      water: "耐旱，忌积水",
      humidity: "对湿度要求不高",
      temperature: "耐热，亦耐 -10℃ 左右，盆栽越冬 0℃ 以上",
      soil: "排水良好的砂壤土",
      difficulty: "中等",
      toxicity: "果实可食，营养丰富",
      description:
        "石榴科落叶灌木或小乔木，花果兼赏，石榴花是传统吉祥花卉。",
      careTips: [
        "花期控水并补磷钾肥提高坐果率",
        "盆栽选矮生观赏品种",
      ],
    },
  },
  {
    name: "桑树",
    scientificName: "Morus alba",
    care: {
      light: "全日照",
      water: "耐旱，忌长期积水",
      humidity: "对湿度要求不高",
      temperature: "极耐寒，可耐 -20℃",
      soil: "不择土壤，耐贫瘠与轻度盐碱",
      difficulty: "新手友好",
      toxicity: "果实（桑葚）成熟后可食",
      description:
        "桑科落叶乔木，家蚕唯一主食，栽桑养蚕已有数千年历史。",
      careTips: [
        "采果后修剪整形",
        "地栽与建筑保持距离，根系强健",
      ],
    },
  },
  {
    name: "榆树",
    scientificName: "Ulmus pumila",
    care: {
      light: "全日照",
      water: "极耐旱、耐贫瘠",
      humidity: "对湿度不敏感",
      temperature: "极耐寒，可耐 -25℃",
      soil: "不择土壤，瘠薄地亦能生长",
      difficulty: "新手友好",
      toxicity: "翅果（榆钱）可食",
      description: "榆科落叶乔木，适应力极强，是北方最常见的乡土树种。",
      careTips: [
        "发芽力强，耐重度修剪，常作盆景",
        "注意防治榆蓝叶甲",
      ],
    },
  },
  {
    name: "槐树",
    scientificName: "Styphnolobium japonicum",
    care: {
      light: "全日照",
      water: "耐旱，忌积水",
      humidity: "对湿度要求不高",
      temperature: "极耐寒，可耐 -25℃",
      soil: "对土壤要求不严，钙质土亦可",
      difficulty: "新手友好",
      toxicity: "花蕾（槐米）可入药，不可大量生食",
      description:
        "豆科落叶乔木，中国传统庭荫树，「门前古槐」多见于北方村落。",
      careTips: [
        "生长慢但寿命长，幼期立支柱防风倒",
        "夏季注意防治槐蚜",
      ],
    },
  },
  {
    name: "梧桐",
    scientificName: "Firmiana simplex",
    care: {
      light: "全日照",
      water: "喜湿润，耐短时干旱",
      humidity: "对湿度要求不高",
      temperature: "耐寒，可耐 -10℃",
      soil: "土层深厚肥沃、排水良好",
      difficulty: "中等",
      toxicity: "无毒",
      description:
        "梧桐科落叶乔木，树皮青绿光滑，「凤栖梧桐」即指此树，种子可炒食。",
      careTips: [
        "幼苗期防寒防冻",
        "落叶期清理残叶减少病虫越冬",
      ],
    },
  },
  {
    name: "木芙蓉",
    scientificName: "Hibiscus mutabilis",
    care: {
      light: "全日照",
      water: "喜湿润，忌积水",
      humidity: "喜湿润空气",
      temperature: "喜温暖，耐 -5℃ 左右，北方需保护越冬",
      soil: "肥沃湿润、排水良好的土壤",
      difficulty: "中等",
      toxicity: "花与叶可入药，不宜食用",
      description:
        "锦葵科落叶灌木，秋季开花一日三变，故称「三醉芙蓉」。",
      careTips: [
        "花后剪除残花并疏枝",
        "北方盆栽冬季入冷室",
      ],
    },
  },
  {
    name: "芭蕉",
    scientificName: "Musa basjoo",
    care: {
      light: "全日照至半阴",
      water: "喜大水，生长季保持盆土湿润",
      humidity: "喜高湿，常喷雾",
      temperature: "喜温暖，适宜 15~30℃，冬季 5℃ 以上",
      soil: "肥沃湿润的黏质土",
      difficulty: "中等",
      toxicity: "果实与叶无毒",
      description:
        "芭蕉科大型草本，叶片宽大舒展，颇具热带风情，「雨打芭蕉」是古典意境。",
      careTips: [
        "冬季低温休眠期控水",
        "叶片怕风撕裂，宜置避风处",
      ],
    },
  },
  {
    name: "棕榈",
    scientificName: "Trachycarpus fortunei",
    care: {
      light: "半阴至全日照，幼树耐阴",
      water: "喜湿润，忌积水",
      humidity: "喜湿润空气",
      temperature: "耐寒，可耐 -8℃，是最耐寒的棕榈植物之一",
      soil: "排水良好、湿润肥沃的土壤",
      difficulty: "中等",
      toxicity: "无毒",
      description:
        "棕榈科常绿乔木，树干直立，扇形叶丛生顶端，南方庭院常见。",
      careTips: [
        "不耐移栽，定植后勿频繁挪动",
        "定期清理枯叶保持株形",
      ],
    },
  },
  {
    name: "芦苇",
    scientificName: "Phragmites australis",
    care: {
      light: "全日照",
      water: "极耐湿，可长期生长于浅水",
      humidity: "喜高湿",
      temperature: "极耐寒，可耐 -20℃",
      soil: "不限，水田、沼泽、旱地皆可",
      difficulty: "新手友好",
      toxicity: "无毒",
      description:
        "禾本科多年生草本，水边湿地常见，秋日芦花如絮是著名景致。",
      careTips: [
        "盆栽可作水景，保持水位",
        "地下茎蔓延迅速，地栽需控制",
      ],
    },
  },
  {
    name: "蒲公英",
    scientificName: "Taraxacum mongolicum",
    care: {
      light: "全日照",
      water: "耐旱，忌积水",
      humidity: "对湿度不敏感",
      temperature: "极耐寒，早春即萌发",
      soil: "不择土壤，瘠薄地亦可",
      difficulty: "新手友好",
      toxicity: "全株可食，可作野菜与入药",
      description:
        "菊科多年生草本，黄色头状花序，种子带冠毛随风传播，药食同源。",
      careTips: [
        "食用以早春嫩株为佳，开花前采收",
        "自播能力强，不想蔓延需及时去残花",
      ],
    },
  },
  {
    name: "车前",
    scientificName: "Plantago asiatica",
    care: {
      light: "全日照，耐半阴",
      water: "喜湿润，亦耐旱",
      humidity: "对湿度要求不高",
      temperature: "耐寒亦耐热",
      soil: "不择土壤，耐践踏",
      difficulty: "新手友好",
      toxicity: "全草可入药（车前草），嫩叶可食",
      description:
        "车前科多年生草本，穗状花序，是田边路旁最常见的野草之一。",
      careTips: [
        "采种后可自播繁殖",
        "食用前焯水去涩",
      ],
    },
  },
  {
    name: "狗尾草",
    scientificName: "Setaria viridis",
    care: {
      light: "全日照",
      water: "极耐旱",
      humidity: "对湿度不敏感",
      temperature: "喜温暖，适应性强",
      soil: "不择土壤",
      difficulty: "新手友好",
      toxicity: "无毒",
      description:
        "禾本科一年生草本，花序形似狗尾，是常见的杂草型草本，亦可用作花境点缀。",
      careTips: [
        "作观赏草需控制自播",
        "冬季枯萎，来年靠种子繁殖",
      ],
    },
  },
  {
    name: "马唐",
    scientificName: "Digitaria sanguinalis",
    care: {
      light: "全日照",
      water: "耐旱",
      humidity: "对湿度要求不高",
      temperature: "喜温暖，夏秋生长旺盛",
      soil: "不择土壤",
      difficulty: "新手友好",
      toxicity: "无毒",
      description:
        "禾本科一年生草本，匍匐生长节上生根，是夏季常见禾草。",
      careTips: [
        "作草坪混播可增加耐踩性",
        "农田中多作杂草防除",
      ],
    },
  },
  {
    name: "艾草",
    scientificName: "Artemisia argyi",
    care: {
      light: "全日照",
      water: "耐旱，忌积水",
      humidity: "喜干燥通风",
      temperature: "耐寒，可耐 -15℃",
      soil: "排水良好、耐贫瘠的土壤",
      difficulty: "新手友好",
      toxicity: "全草芳香，可入药、制艾绒，端午悬艾是传统习俗",
      description:
        "菊科多年生草本，叶片羽状深裂、密被灰白绒毛，是中国传统药草。",
      careTips: [
        "生长快，每年可收割 2~3 次",
        "忌积水，雨季注意排涝",
      ],
    },
  },
  {
    name: "荠菜",
    scientificName: "Capsella bursa-pastoris",
    care: {
      light: "全日照",
      water: "喜湿润，忌干旱",
      humidity: "对湿度要求不高",
      temperature: "耐寒，可耐 -10℃，早春即返青",
      soil: "不择土壤，疏松肥沃更佳",
      difficulty: "新手友好",
      toxicity: "嫩株是常见野菜，可包饺子、做馄饨",
      description:
        "十字花科一年或二年生草本，白花小巧，全国分布的早春野菜。",
      careTips: [
        "秋冬播种，分期采收",
        "开花后纤维变粗，风味下降",
      ],
    },
  },
  {
    name: "南天竹",
    scientificName: "Nandina domestica",
    care: {
      light: "半阴或明亮散射光，忌暴晒",
      water: "见干见湿",
      humidity: "对湿度要求不高",
      temperature: "耐寒，可耐 -10℃",
      soil: "肥沃、排水良好的砂壤土",
      difficulty: "中等",
      toxicity: "全株有毒（含氰苷类），严禁食用，红果尤甚",
      description:
        "小檗科常绿灌木，秋冬叶红果红，是传统的观叶观果植物。",
      careTips: [
        "结果期充足光照果色更艳",
        "家有幼儿宠物慎栽，防误食红果",
      ],
    },
  },
];

const LOCAL_POOL = localPlants.map((plant) => ({
  name: plant.name,
  scientificName: plant.scientificName,
}));

const POOL = [...LOCAL_POOL, ...WILD_POOL];

const LOCAL_BY_NAME = new Map(localPlants.map((plant) => [plant.name, plant]));
const WILD_BY_NAME = new Map(WILD_POOL.map((taxon) => [taxon.name, taxon]));

/** 用乡土植物的养护资料构造完整 Plant（区别于 floraRowToPlant 的无资料兜底条目） */
function buildWildPlant(taxon: {
  name: string;
  scientificName: string;
  care: WildCare;
}): Plant {
  return {
    id: `wild-${taxon.name}`,
    name: taxon.name,
    scientificName: taxon.scientificName,
    aliases: [],
    category: "乡土植物",
    ...taxon.care,
    imageUrl: "",
    source: "local",
    hasCareInfo: true,
  };
}

/** FNV-1a：把省名散列成一个稳定的整数种子 */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32：确定性伪随机数发生器 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, ProvincePlant[]>();

function buildProvinceFlora(provinceShort: string): ProvincePlant[] {
  const rand = mulberry32(hashString(provinceShort) || 1);

  // 打乱候选池（按随机分值降序，同分按名称排序保证稳定）
  const picked = POOL.map((taxon) => ({ taxon, score: rand() }))
    .sort(
      (a, b) =>
        b.score - a.score || a.taxon.name.localeCompare(b.taxon.name, "zh")
    )
    .slice(0, ROW_COUNT)
    .map((item) => item.taxon);

  // 保证本地 20 种里至少有 MIN_LOCAL 条出现（使可点开的养护行确实存在）
  const pickedLocal = picked.filter((taxon) => LOCAL_BY_NAME.has(taxon.name));
  const pickedOther = picked.filter((taxon) => !LOCAL_BY_NAME.has(taxon.name));

  if (pickedLocal.length < MIN_LOCAL) {
    const extra = LOCAL_POOL.filter(
      (taxon) => !pickedLocal.some((item) => item.name === taxon.name)
    ).slice(0, MIN_LOCAL - pickedLocal.length);

    pickedLocal.push(...extra);
    pickedOther.splice(0, extra.length);
  }

  // 排名顺序同样由种子决定
  const ordered = [...pickedOther, ...pickedLocal]
    .map((taxon) => ({ taxon, score: rand() }))
    .sort(
      (a, b) =>
        b.score - a.score || a.taxon.name.localeCompare(b.taxon.name, "zh")
    );

  // 记录数：随排名衰减，强制严格递减
  const base = 500 + Math.floor(rand() * 80000);
  let previous = Number.POSITIVE_INFINITY;

  return ordered.map((item, index) => {
    const raw = Math.round(base / Math.pow(index + 1, 1.25));
    const records = Math.max(3, Math.min(previous - 1, raw));
    previous = records;

    const local = LOCAL_BY_NAME.get(item.taxon.name);
    const wild = WILD_BY_NAME.get(item.taxon.name);

    return {
      rank: index + 1,
      name: item.taxon.name,
      scientificName: item.taxon.scientificName,
      records,
      // 本地 20 种用完整条目；乡土植物用人工整理的养护资料条目
      plant: local ?? (wild ? buildWildPlant(wild) : undefined),
    };
  });
}

/**
 * 取某省的常见植物排行（本期为模拟数据）
 * @param provinceShort 省份短名，如「浙江」
 */
export function getProvinceFlora(provinceShort: string): ProvincePlant[] {
  const key = String(provinceShort ?? "").trim();
  if (!key) return [];

  const cached = cache.get(key);
  if (cached) return cached;

  const rows = buildProvinceFlora(key);
  cache.set(key, rows);
  return rows;
}

/** 在当前省的排行数据内按关键词过滤（带关键词的搜索在已授权状态下同样可用） */
export function filterProvinceFlora(
  rows: ProvincePlant[],
  query: string
): ProvincePlant[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;

  return rows.filter((row) => {
    const names = [row.name, ...(row.plant?.aliases ?? [])].filter(Boolean);
    const haystack = [
      row.name,
      row.scientificName,
      ...(row.plant?.aliases ?? []),
    ]
      .join(" ")
      .toLowerCase();
    // 双向匹配：字段包含查询词，或查询词包含植物名（如搜「樟树」可命中「樟」）
    return (
      haystack.includes(normalized) ||
      names.some((n) => normalized.includes(n.toLowerCase()))
    );
  });
}

/**
 * 为未命中数据集的排行行构造最小可用 Plant（兜底：正常情况下所有行都带 plant）
 * 用途：让排行中的每一种植物都可收藏、可打开详情（详情会提示暂无养护资料）
 */
export function floraRowToPlant(row: ProvincePlant, province: string): Plant {
  return {
    id: `flora-${province}-${row.name}`,
    name: row.name,
    scientificName: row.scientificName,
    aliases: [],
    category: `${province}常见植物`,
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
    source: "local",
    hasCareInfo: false,
  };
}
