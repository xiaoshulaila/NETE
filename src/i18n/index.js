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
        tagline: "透明、可持续、社区共治的链上时间价值生态。",
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
        built: "Built with ♥ on Ethereum",
        privacy: "Privacy",
        terms: "Terms",
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
          badge: "Onchain Live · Community Governed",
          titleA: "透明通缩。",
          titleB: "社区共治的",
          titleC: "链上时间价值引擎。",
          subtitle: "NETE 以智能合约驱动“质押销毁挖矿 + 多级社区激励 + 三重通缩机制”，构建透明、可持续、可审计的链上经济模型。发行总量恒定 30 亿枚，终极通缩目标为 2100 万枚。",
          primary: "查看核心模型",
          secondary: "了解机制细节",
          phone: {
            modulesTitle: "一屏直达\n核心模块",
            modulesA: "矿机 / C2C / VIP",
            modulesB: "团队 · 我的",
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
            vipBoost: "VIP 加速",
            max: "最高 45%",
            miningIncome: "矿机收益",
            daily: "每日结算",
          },
        },
        features: {
          eyebrow: "// Core Mechanisms",
          title: "链上规则驱动的\n可持续增长模型",
          desc: "以公开可验证的合约规则替代中心化口径，围绕发行、产出、分配、销毁与治理构建完整闭环，提升生态的透明度、稳定性与长期价值承载能力。",
          cards: [
            { title: "三重通缩机制", desc: "每次链上提币与激活矿机均触发销毁，结合产出节奏调节阀控制通胀速度，通过机制化收缩推动总量从 30 亿向 2100 万持续收敛。", tag: "30 亿 → 2100 万" },
            { title: "POS 质押销毁挖矿", desc: "约 99.66% 代币通过质押销毁挖矿释放，空投矿机作为转化入口并受有效期与转正规则约束，产出路径清晰且可审计。", tag: "约 29.9 亿 POS 释放" },
            { title: "社区治理 V1-V9", desc: "提币手续费社区分红中，50% 按等级平分、50% 按当日新增业绩加权，并叠加固定奖励与分享加速机制，形成可持续的增长激励网络。", tag: "双轨分红 + 固定奖励" },
            { title: "链上安全与可追溯", desc: "无中心资金池，所有资金锁定在合约与用户钱包；合约自动执行、权限可放弃，交易、分红、销毁全链上公开可查。", tag: "公开透明 · 可验证" }
          ],
        },
        project: {
          eyebrow: "// Project Overview",
          title: "NETE 项目介绍",
          desc: "NETE 定位为“透明、可持续、社区共治”的链上时间价值生态，通过规则可验证、过程可追踪、分配可审计的机制设计，系统性解决传统卷轴模型中“黑箱操作、不可持续、信任脆弱”的结构性问题。",
          mechanismsTitle: "经济模型关键机制",
          rulesTitle: "分配与流通规则",
          modelMechanisms: [
            "初始总量 30 亿枚，恒定不增发。",
            "终极通缩目标：流通量压缩至 2100 万枚。",
            "每次链上提币与激活矿机触发销毁，形成强制通缩。",
            "提币手续费按矿机等级收取 20%-30%，每日链上自动分配。"
          ],
          roadmapItems: [
            "提币手续费分配：20% 销毁、30% 项目方、50% 社区分红。",
            "社区分红中 50% 按 V1-V9 平分，50% 按当日新增业绩加权。",
            "C2C 交易卖方手续费 10%（USDT），用于流动性支持与生态建设。",
            "V4 及以上可申请做市商账户，免手续费并赚取 5% 市场差价。"
          ],
          contractItems: [
            { name: "启动分配结构", detail: "种子轮 500 万（0.17%）+ 阶段空投 500 万（0.17%），其余由质押销毁挖矿释放" },
            { name: "POS 产出配比", detail: "约 29.9 亿（99.66%）通过 POS 质押销毁挖矿产生，确保产出与通缩协同" },
            { name: "安全与透明性", detail: "无中心资金池、合约自动执行、权限可放弃、交易与分配数据全链上可追溯" }
          ],
        },
        markets: {
          eyebrow: "// Tokenomics",
          title: "核心经济参数\n一览",
          cards: [
            { name: "发行总量", ticker: "SUPPLY", price: "30 亿 NETE", change: "恒定不增发" },
            { name: "极限通缩目标", ticker: "DEFLATION", price: "2100 万 NETE", change: "提币/激活触发销毁" },
            { name: "启动分配结构", ticker: "BOOTSTRAP", price: "500 万 + 500 万", change: "种子轮 0.5 USDT / NETE" },
            { name: "提币手续费分配", ticker: "FEE SPLIT", price: "20% / 30% / 50%", change: "销毁 / 项目方 / 社区" },
            { name: "C2C 流通机制", ticker: "C2C", price: "卖方手续费 10%", change: "V4+ 做市商可申请免手续费" }
          ],
        },
        cta: {
          title: "准备加入 NETE 链上经济生态？",
          subtitle: "从矿机产出、社区治理到 C2C 流通，所有关键行为由合约自动执行并全链路可审计，为长期参与者提供可验证、可持续的价值增长路径。",
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
        tagline: "A transparent, sustainable, community-governed on-chain time-value economy.",
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
          badge: "Onchain Live · Community Governed",
          titleA: "Transparent deflation.",
          titleB: "Community-governed",
          titleC: "on-chain time-value engine.",
          subtitle: "NETE uses smart contracts to power stake-burn mining, multi-level community incentives, and a triple deflation model. Supply is fixed at 3 billion, with a long-term deflation target of 21 million.",
          primary: "View Core Model",
          secondary: "Explore Mechanics",
          phone: {
            modulesTitle: "Core modules\nin one screen",
            modulesA: "Mining / C2C / VIP",
            modulesB: "Team · My",
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
            vipBoost: "VIP Boost",
            max: "Up to 45%",
            miningIncome: "Mining Yield",
            daily: "Daily Settlement",
          },
        },
        features: {
          eyebrow: "// Core Mechanisms",
          title: "Sustainable growth\npowered by on-chain rules",
          desc: "NETE replaces opaque centralized accounting with public, verifiable contract rules across issuance, yield, distribution, burns, and governance.",
          cards: [
            { title: "Triple Deflation", desc: "Withdrawals and miner activation both trigger burns. Output pacing controls inflation while supply gradually converges from 3 billion toward 21 million.", tag: "3B → 21M" },
            { title: "POS Stake-Burn Mining", desc: "Roughly 99.66% of tokens are released through stake-burn mining. Airdrop miners serve as the conversion entry with clear validity and promotion rules.", tag: "Approx. 2.99B via POS" },
            { title: "V1-V9 Community Governance", desc: "Community dividends split by level and daily new performance, then combine with fixed rewards and referral acceleration.", tag: "Dual dividends + rewards" },
            { title: "On-chain Safety and Traceability", desc: "No central fund pool. Funds remain in contracts and user wallets, while trades, dividends, and burns are publicly traceable.", tag: "Transparent · Verifiable" }
          ],
        },
        project: {
          eyebrow: "// Project Overview",
          title: "NETE Project Overview",
          desc: "NETE is a transparent, sustainable, community-governed on-chain time-value ecosystem. Its verifiable rules, traceable processes, and auditable distribution address the trust gaps of opaque models.",
          mechanismsTitle: "Core Economic Mechanics",
          rulesTitle: "Distribution and Circulation Rules",
          modelMechanisms: [
            "Initial supply is fixed at 3 billion with no additional issuance.",
            "Long-term deflation target: compress circulating supply to 21 million.",
            "Withdrawals and miner activation trigger burns, creating forced deflation.",
            "Withdrawal fees are collected by miner tier at 20%-30% and distributed daily on-chain."
          ],
          roadmapItems: [
            "Withdrawal fee split: 20% burn, 30% project treasury, 50% community dividends.",
            "Community dividends: 50% split across V1-V9 and 50% weighted by daily new performance.",
            "C2C seller fee is 10% in USDT for liquidity support and ecosystem development.",
            "V4+ users can apply for market-maker accounts, waive fees, and earn a 5% spread."
          ],
          contractItems: [
            { name: "Bootstrap Allocation", detail: "5M seed round (0.17%) + 5M staged airdrop (0.17%); the rest is released through stake-burn mining." },
            { name: "POS Output Mix", detail: "About 2.99B (99.66%) is generated through POS stake-burn mining, aligning output with deflation." },
            { name: "Safety and Transparency", detail: "No central fund pool, automated contracts, revocable privileges, and on-chain traceability for trades and distribution." }
          ],
        },
        markets: {
          eyebrow: "// Tokenomics",
          title: "Core economic\nparameters",
          cards: [
            { name: "Total Supply", ticker: "SUPPLY", price: "3B NETE", change: "Fixed supply" },
            { name: "Deflation Target", ticker: "DEFLATION", price: "21M NETE", change: "Burns from withdrawal / activation" },
            { name: "Bootstrap Allocation", ticker: "BOOTSTRAP", price: "5M + 5M", change: "Seed round at 0.5 USDT / NETE" },
            { name: "Withdrawal Fee Split", ticker: "FEE SPLIT", price: "20% / 30% / 50%", change: "Burn / Project / Community" },
            { name: "C2C Circulation", ticker: "C2C", price: "10% seller fee", change: "V4+ can apply for fee-free maker status" }
          ],
        },
        cta: {
          title: "Ready to join the NETE on-chain economy?",
          subtitle: "From mining output and community governance to C2C circulation, key actions are contract-executed and auditable end to end.",
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
