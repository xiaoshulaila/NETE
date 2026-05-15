import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { moduleTranslations } from "./moduleTranslations";

const resources = {
  zh: {
    translation: {
      common: {
        language: "语言",
        chinese: "简体中文",
        english: "English",
        loading: "加载中...",
        unavailable: "--",
      },
      nav: {
        home: "首页",
        mining: "矿机",
        vip: "VIP",
        c2c: "C2C",
        seed: "种子 NETE",
        team: "团队",
        my: "我的",
        wallet: {
          connect: "连接钱包",
          disconnect: "断开连接",
          switchChain: "切换到目标链",
          processing: "处理中...",
        },
      },
      footer: {
        tagline: "连接传统支付与 Web3 的透明可持续生态。",
        product: "产品",
        developers: "开发者",
        company: "公司",
        mining: "矿机",
        c2cMarket: "C2C 市场",
        project: "项目介绍",
        myPanel: "我的面板",
        teamCenter: "团队中心",
        home: "首页",
        team: "团队",
        built: "",
        privacy: "",
        terms: "",
      },
      c2cFrame: {
        quick: "快捷区",
        self: "自选区",
        vip: "VIP 尊享区",
        orders: "订单",
        profile: "个人中心",
        more: "更多",
      },
      modules: moduleTranslations.zh,
      landing: {
        toast: {
          default: "NETE 操作已成功提交",
          core: "正在加载 NETE 核心模型...",
          launch: "正在进入 NETE 应用生态...",
          wallet: "正在初始化你的链上参与账户...",
        },
        hero: {
          badge: "通缩经济｜社区自治｜透明合规",
          titleA: "NETE｜连接传统支付",
          titleB: "与 Web3 的",
          titleC: "未来。",
          subtitle: "NETE 以链上通缩经济模型、POS 质押挖矿重塑时间价值，构建透明可持续的去中心化经济引擎。",
          primary: "查看核心模型",
          secondary: "了解机制细节",
          phone: {
            modulesTitle: "一屏直达\n核心模块",
            modulesA: "矿机 / C2C / 我的",
            modulesB: "团队 · 种子",
            account: "我的链上账户",
            totalAsset: "NETE 总资产",
            data: "今日关键数据",
            principal: "本金钱包",
            withdrawable: "可提余额",
            circulate: "流通钱包",
            team: "团队业绩",
            c2c: "C2C 自选区",
            realtime: "REALTIME",
            merchants: "实时优选\n委托商家",
            quickPrice: "快捷区价格",
            bestMatch: "最优撮合",
            sellerFee: "卖方手续费",
            transparent: "链上透明",
            quick: "快捷区",
            self: "自选区",
            orders: "订单",
            vipBoost: "业绩权益",
            max: "最高 45%",
            miningIncome: "矿机收益",
            daily: "每日结算",
          },
        },
        features: {
          eyebrow: "// Onchain Mechanisms",
          title: "自动即信任\n链上核心机制",
          desc: "以智能合约自动执行矿机质押挖矿、社区激励与安全透明机制，让产出、分配和流通规则全链上可查。",
          cards: [
            { title: "质押挖矿・复利增长", desc: "多档位矿机灵活参与，每日自动产息，本金复投、利润可提，周期自动延长减产防通胀。", tag: "多档矿机｜每日产息｜周期减产" },
            { title: "多级激励・共治共享", desc: "直推 8 人享 20 层加速，V1-V9 等级分红，手续费全链上分配，C2C 支持做市商。", tag: "20 层加速｜V1-V9 分红" },
            { title: "链上可信・规则透明", desc: "合约自动执行，无中央资金池，全数据上链可查。", tag: "智能合约｜无资金池｜数据可查" },
            { title: "技术团队", desc: "EEA 联盟成员，自主研发 VIA Protocol 与 Nete 平台，拥有全栈区块链技术，安全可信。", tag: "VIA Protocol｜Nete 平台" }
          ],
        },
        project: {
          eyebrow: "// Deflation Model",
          title: "稀缺即价值，通缩经济模型",
          desc: "NETE 以 30 亿枚初始总量启动，通过提币及激活矿机触发直接销毁，最终通缩目标为 2100 万枚。",
          mechanismsTitle: "发行与通缩",
          rulesTitle: "初始分配",
          modelMechanisms: [
            "初始总量：30 亿枚 NETE。",
            "终极通缩：2100 万枚。",
            "通缩触发：提币及激活矿机直接销毁。",
            "链上通缩经济模型持续压缩流通供给。"
          ],
          roadmapItems: [
            "种子轮：500 万枚，单价 0.5 USDT。",
            "空投：500 万枚。",
            "POS 质押产出：约 29.9 亿枚。",
            "空投与质押产出共同构成生态启动入口。"
          ],
          contractItems: [
            { name: "空投转化", detail: "注册送 100 型空投矿机，75 天内购买不低于 100 型真实矿机后，空投矿机可转为永久。" },
            { name: "POS 质押挖矿", detail: "通过矿机参与产出，形成链上可追踪的时间价值释放路径。" },
            { name: "透明合规", detail: "关键规则由合约执行，销毁、产出与分配过程全链上可查。" }
          ],
        },
        markets: {
          eyebrow: "// Token Economy",
          title: "发行、分配与\n空投转化",
          cards: [
            { name: "初始总量", ticker: "SUPPLY", price: "30 亿 NETE", change: "生态启动总供给" },
            { name: "终极通缩", ticker: "DEFLATION", price: "2100 万 NETE", change: "提币及激活矿机触发销毁" },
            { name: "种子轮", ticker: "SEED", price: "500 万 NETE", change: "0.5 USDT / NETE" },
            { name: "空投", ticker: "AIRDROP", price: "500 万 NETE", change: "注册送 100 型空投矿机" },
            { name: "POS 质押产出", ticker: "POS", price: "约 29.9 亿 NETE", change: "矿机产出释放" }
          ],
        },
        cta: {
          title: "加入 NETE｜共建透明、可持续的链上价值生态",
          subtitle: "从通缩经济、POS 质押挖矿到社区自治，NETE 以透明规则连接传统支付与 Web3 的未来。",
          action: "立即参与 NETE",
          enter: "立即进入",
          quick: "快速前往",
          mining: "矿机模块",
          c2c: "C2C 市场",
        },
      },
    },
  },
  en: {
    translation: {
      common: {
        language: "Language",
        chinese: "简体中文",
        english: "English",
        loading: "Loading...",
        unavailable: "--",
      },
      nav: {
        home: "Home",
        mining: "Mining",
        vip: "VIP",
        c2c: "C2C",
        seed: "Seed NETE",
        team: "Team",
        my: "My",
        wallet: {
          connect: "Connect Wallet",
          disconnect: "Disconnect",
          switchChain: "Switch Chain",
          processing: "Processing...",
        },
      },
      footer: {
        tagline: "Connecting traditional payments and Web3 through a transparent, sustainable ecosystem.",
        product: "Product",
        developers: "Developers",
        company: "Company",
        mining: "Mining",
        c2cMarket: "C2C Market",
        project: "Project Overview",
        myPanel: "My Dashboard",
        teamCenter: "Team Center",
        home: "Home",
        team: "Team",
        built: "Built with ♥ on Ethereum",
        privacy: "Privacy",
        terms: "Terms",
      },
      c2cFrame: {
        quick: "Quick Zone",
        self: "Market Zone",
        vip: "VIP Zone",
        orders: "Orders",
        profile: "Profile",
        more: "More",
      },
      modules: moduleTranslations.en,
      landing: {
        toast: {
          default: "NETE action submitted",
          core: "Loading the NETE core model...",
          launch: "Entering the NETE ecosystem...",
          wallet: "Initializing your on-chain account...",
        },
        hero: {
          badge: "Deflationary Economy | Community Autonomy | Transparent Compliance",
          titleA: "NETE | Connecting Traditional",
          titleB: "Payments with the",
          titleC: "Future of Web3.",
          subtitle: "NETE reshapes time value through an on-chain deflationary economy and POS staking mining, building a transparent, sustainable decentralized economic engine.",
          primary: "View Core Model",
          secondary: "Explore Mechanics",
          phone: {
            modulesTitle: "Core modules\nin one screen",
            modulesA: "Mining / C2C / My",
            modulesB: "Team · Seed",
            account: "My On-chain Account",
            totalAsset: "Total NETE Assets",
            data: "Key Data Today",
            principal: "Principal Wallet",
            withdrawable: "Withdrawable",
            circulate: "Circulating Wallet",
            team: "Team Volume",
            c2c: "C2C Market Zone",
            realtime: "REALTIME",
            merchants: "Live curated\nmerchant orders",
            quickPrice: "Quick Price",
            bestMatch: "Best Match",
            sellerFee: "Seller Fee",
            transparent: "On-chain",
            quick: "Quick",
            self: "Market",
            orders: "Orders",
            vipBoost: "Performance",
            max: "Up to 45%",
            miningIncome: "Mining Yield",
            daily: "Daily Settlement",
          },
        },
        features: {
          eyebrow: "// Onchain Mechanisms",
          title: "Automation Builds Trust\nCore On-chain Mechanisms",
          desc: "Smart contracts automate miner staking, community incentives, and transparent safety rules, making output, distribution, and circulation fully traceable on-chain.",
          cards: [
            { title: "Staking Mining, Compound Growth", desc: "Multiple miner tiers offer flexible participation, daily automated yield, principal reinvestment, withdrawable profit, and cycle extensions with output reduction to prevent inflation.", tag: "Multi-tier miners | Daily yield | Cycle reduction" },
            { title: "Multi-level Incentives, Shared Governance", desc: "Users with 8 direct referrals unlock 20-level acceleration, V1-V9 level dividends, fully on-chain fee distribution, and C2C market-maker support.", tag: "20-level acceleration | V1-V9 dividends" },
            { title: "On-chain Trust, Transparent Rules", desc: "Contracts execute automatically with no central fund pool, and all data is verifiable on-chain.", tag: "Smart contracts | No fund pool | Verifiable data" },
            { title: "Technical Team", desc: "As an EEA alliance member, the team independently develops VIA Protocol and the Nete platform with full-stack blockchain capabilities and trusted security.", tag: "VIA Protocol | Nete Platform" }
          ],
        },
        project: {
          eyebrow: "// Deflation Model",
          title: "Scarcity Creates Value, A Deflationary Economy",
          desc: "NETE starts with an initial supply of 3 billion tokens. Withdrawals and miner activation trigger direct burns, with an ultimate deflation target of 21 million tokens.",
          mechanismsTitle: "Issuance and Deflation",
          rulesTitle: "Initial Allocation",
          modelMechanisms: [
            "Initial supply: 3 billion NETE.",
            "Ultimate deflation target: 21 million tokens.",
            "Burn trigger: withdrawals and miner activation directly destroy tokens.",
            "The on-chain deflationary economy continuously compresses circulating supply."
          ],
          roadmapItems: [
            "Seed round: 5 million tokens at 0.5 USDT each.",
            "Airdrop: 5 million tokens.",
            "POS staking output: about 2.99 billion tokens.",
            "Airdrops and staking output together form the ecosystem launch entry."
          ],
          contractItems: [
            { name: "Airdrop Conversion", detail: "Registration grants a 100-type airdrop miner. If the user buys a real miner of at least 100 type within 75 days, the airdrop miner can become permanent." },
            { name: "POS Staking Mining", detail: "Users participate through miners, creating an on-chain traceable path for time-value release." },
            { name: "Transparent Compliance", detail: "Core rules are executed by contracts, with burns, output, and distribution fully verifiable on-chain." }
          ],
        },
        markets: {
          eyebrow: "// Token Economy",
          title: "Issuance, Allocation\nand Airdrop Conversion",
          cards: [
            { name: "Initial Supply", ticker: "SUPPLY", price: "3B NETE", change: "Total ecosystem launch supply" },
            { name: "Ultimate Deflation", ticker: "DEFLATION", price: "21M NETE", change: "Burns triggered by withdrawals and miner activation" },
            { name: "Seed Round", ticker: "SEED", price: "5M NETE", change: "0.5 USDT / NETE" },
            { name: "Airdrop", ticker: "AIRDROP", price: "5M NETE", change: "Register to receive a 100-type airdrop miner" },
            { name: "POS Staking Output", ticker: "POS", price: "About 2.99B NETE", change: "Released through miner output" }
          ],
        },
        cta: {
          title: "Join NETE | Build a transparent, sustainable on-chain value ecosystem together",
          subtitle: "From a deflationary economy and POS staking mining to community autonomy, NETE uses transparent rules to connect traditional payments with the future of Web3.",
          action: "Join NETE Now",
          enter: "Enter",
          quick: "Open",
          mining: "Mining Module",
          c2c: "C2C Market",
        },
      },
    },
  },
};

function normalizeLanguage(language) {
  return language?.toLowerCase().startsWith("en") ? "en" : "zh";
}

const savedLanguage = typeof window !== "undefined" ? window.localStorage.getItem("nete-lang") : null;
const browserLanguage = typeof window !== "undefined" ? window.navigator.language : "zh";
const initialLanguage = normalizeLanguage(savedLanguage || browserLanguage);

function syncDocumentLanguage(language) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalizeLanguage(language) === "en" ? "en" : "zh-CN";
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "zh",
  supportedLngs: ["zh", "en"],
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  syncDocumentLanguage(language);
  if (typeof window !== "undefined") {
    window.localStorage.setItem("nete-lang", normalizeLanguage(language));
  }
});

syncDocumentLanguage(initialLanguage);

export default i18n;
