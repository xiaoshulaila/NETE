import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { moduleTranslations } from "./moduleTranslations";

const resources = {
  zh: {
    translation: {
      common: {
        language: "语言",
        chinese: "简体中文",
        traditionalChinese: "繁體中文",
        english: "English",
        japanese: "日本語",
        korean: "한국어",
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
          select: "选择钱包",
          connecting: "连接中...",
          noConnector: "暂无可用钱包连接方式",
          connectionFailed: "钱包连接失败",
        },
      },
      footer: {
        tagline: "连接传统支付与 Web3 的透明可持续生态。",
        closing: "加入NETE｜让每一次交易都成为价值的连接。",
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
          badge: "通缩经济｜社区自治｜透明规则",
          titleA: "NETE｜连接传统支付",
          titleB: "与 Web3 的",
          titleC: "未来。",
          subtitle: "NETE 以链上通缩经济模型与矿机产出机制重塑时间价值，构建透明可持续的去中心化经济引擎。",
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
            { title: "链上可信・规则透明", desc: "合约自动执行，无中央资金池，全数据上链可查。", tag: "智能合约｜无资金池｜数据可查" }
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
            "矿机产出释放：约 29.9 亿枚。",
            "空投与矿机产出共同构成生态启动入口。"
          ],
          contractItems: [
            { name: "空投转化", detail: "注册送 100 型空投矿机，75 天内购买不低于 100 型真实矿机后，空投矿机可转为永久。" }
          ],
        },
        announcements: {
          aria: "NETE 公告栏",
          label: "公告",
          close: "关闭公告",
        },
        bridge: {
          aria: "机制与经济模型衔接",
          items: [
            { title: "合约执行", desc: "规则自动触发" },
            { title: "产出释放", desc: "按周期透明流转" },
            { title: "价值回流", desc: "销毁与分配同步完成" }
          ],
        },
        team: {
          eyebrow: "// Technical Team",
          title: "技术基因，2018年我们就已站在浪潮之巅",
          desc: "EEA 联盟成员，自主研发 VIA Protocol 与 Nete 平台，以全栈区块链技术能力支撑生态长期运行。",
          items: [
            { title: "自主研发", desc: "核心协议、业务合约与前端交互统一围绕链上透明规则构建。", tag: "VIA Protocol｜Nete 平台" },
            { title: "安全可信", desc: "以合约自动执行为基础，持续提升生态参与、结算与数据同步的可靠性。", tag: "全栈技术｜链上验证" }
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
            { name: "矿机产出释放", ticker: "MINING", price: "约 29.9 亿 NETE", change: "按链上规则逐步释放" }
          ],
        },
        cta: {
          title: "NETE基金会 | 不是管理者，是守护者",
          subtitle: "NETE Foundation不隶属于任何单一商业实体，它以独立、透明、非营利为原则，致力于：",
          foundationItems: [
            "维护NETE生态的长期健康发展",
            "管理生态基金，支持开发者与创新项目",
            "推动社区治理，逐步实现权力下放",
            "链接传统金融与Web3世界，降低准入门槛"
          ],
          closing: "加入NETE｜让每一次交易都成为价值的连接。",
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
        traditionalChinese: "繁體中文",
        english: "English",
        japanese: "日本語",
        korean: "한국어",
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
          select: "Select Wallet",
          connecting: "Connecting...",
          noConnector: "No wallet connector available",
          connectionFailed: "Wallet connection failed",
        },
      },
      footer: {
        tagline: "Connecting traditional payments and Web3 through a transparent, sustainable ecosystem.",
        closing: "Join NETE | Let every transaction become a connection of value.",
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
          badge: "Deflationary Economy | Community Autonomy | Transparent Rules",
          titleA: "NETE | Connecting Traditional",
          titleB: "Payments with the",
          titleC: "Future of Web3.",
          subtitle: "NETE reshapes time value through an on-chain deflationary economy and miner output mechanism, building a transparent, sustainable decentralized economic engine.",
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
            { title: "On-chain Trust, Transparent Rules", desc: "Contracts execute automatically with no central fund pool, and all data is verifiable on-chain.", tag: "Smart contracts | No fund pool | Verifiable data" }
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
            "Miner output release: about 2.99 billion tokens.",
            "Airdrops and miner output together form the ecosystem launch entry."
          ],
          contractItems: [
            { name: "Airdrop Conversion", detail: "Registration grants a 100-type airdrop miner. If the user buys a real miner of at least 100 type within 75 days, the airdrop miner can become permanent." }
          ],
        },
        announcements: {
          aria: "NETE announcements",
          label: "Notice",
          close: "Close announcement",
        },
        bridge: {
          aria: "Mechanism and economic model transition",
          items: [
            { title: "Contract Execution", desc: "Rules trigger automatically" },
            { title: "Output Release", desc: "Transparent cycle-based flow" },
            { title: "Value Return", desc: "Burns and distribution complete together" }
          ],
        },
        team: {
          eyebrow: "// Technical Team",
          title: "Technical DNA, ahead of the wave since 2018",
          desc: "As an EEA alliance member, the team independently develops VIA Protocol and the Nete platform, supporting long-term ecosystem operations with full-stack blockchain capabilities.",
          items: [
            { title: "Independent R&D", desc: "Core protocol, business contracts, and frontend flows are built around transparent on-chain rules.", tag: "VIA Protocol | Nete Platform" },
            { title: "Secure and Reliable", desc: "Contract automation improves reliability across participation, settlement, and data synchronization.", tag: "Full-stack tech | On-chain verification" }
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
            { name: "Miner Output Release", ticker: "MINING", price: "About 2.99B NETE", change: "Released gradually by on-chain rules" }
          ],
        },
        cta: {
          title: "NETE Foundation | Not a manager, but a guardian",
          subtitle: "NETE Foundation is not affiliated with any single commercial entity. It is independent, transparent, and non-profit, committed to:",
          foundationItems: [
            "Maintaining the long-term health of the NETE ecosystem",
            "Managing the ecosystem fund and supporting developers and innovation",
            "Promoting community governance and progressive decentralization",
            "Connecting traditional finance with Web3 and lowering access barriers"
          ],
          closing: "Join NETE | Let every transaction become a connection of value.",
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

export const languageOptions = [
  { key: "zh", labelKey: "common.chinese" },
  { key: "zh-TW", labelKey: "common.traditionalChinese" },
  { key: "en", labelKey: "common.english" },
  { key: "ja", labelKey: "common.japanese" },
  { key: "ko", labelKey: "common.korean" },
];

function mergeTranslations(base, overrides) {
  if (Array.isArray(base) || Array.isArray(overrides)) return overrides ?? base;
  if (!base || typeof base !== "object") return overrides ?? base;

  const result = { ...base };
  for (const [key, value] of Object.entries(overrides || {})) {
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeTranslations(base[key], value)
      : value;
  }
  return result;
}

resources["zh-TW"] = {
  translation: mergeTranslations(resources.zh.translation, {
    common: {
      language: "語言",
      loading: "載入中...",
    },
    nav: {
      home: "首頁",
      mining: "礦機",
      seed: "種子 NETE",
      team: "團隊",
      my: "我的",
      wallet: {
        connect: "連接錢包",
        disconnect: "斷開連接",
        switchChain: "切換到目標鏈",
        processing: "處理中...",
        select: "選擇錢包",
        connecting: "連接中...",
        noConnector: "暫無可用錢包連接方式",
        connectionFailed: "錢包連接失敗",
      },
    },
    footer: {
      tagline: "連接傳統支付與 Web3 的透明可持續生態。",
      closing: "加入NETE｜讓每一次交易都成為價值的連接。",
    },
    modules: moduleTranslations["zh-TW"],
    landing: {
      hero: {
        badge: "通縮經濟｜社區自治｜透明規則",
        titleA: "NETE｜連接傳統支付",
        titleB: "與 Web3 的",
        titleC: "未來。",
        subtitle: "NETE 以鏈上通縮經濟模型與礦機產出機制重塑時間價值，構建透明可持續的去中心化經濟引擎。",
        primary: "查看核心模型",
        secondary: "了解機制細節",
      },
      features: {
        title: "自動即信任\n鏈上核心機制",
        desc: "以智能合約自動執行礦機質押挖礦、社區激勵與安全透明機制。",
        cards: [
          { title: "質押挖礦・複利增長", desc: "多檔位礦機靈活參與，每日自動產息，本金復投、利潤可提。", tag: "多檔礦機｜每日產息｜週期減產" },
          { title: "多級激勵・共治共享", desc: "直推 8 人享 20 層加速，V1-V9 等級分紅，手續費全鏈上分配。", tag: "20 層加速｜V1-V9 分紅" },
          { title: "鏈上可信・規則透明", desc: "合約自動執行，無中央資金池，全數據鏈上可查。", tag: "智能合約｜無資金池｜數據可查" },
        ],
      },
      project: {
        title: "稀缺即價值，通縮經濟模型",
        desc: "NETE 以 30 億枚初始總量啟動，通過提幣及激活礦機觸發直接銷毀，最終通縮目標為 2100 萬枚。",
        mechanismsTitle: "發行與通縮",
        rulesTitle: "初始分配",
        modelMechanisms: ["初始總量：30 億枚 NETE。", "終極通縮：2100 萬枚。", "通縮觸發：提幣及激活礦機直接銷毀。", "鏈上通縮經濟模型持續壓縮流通供給。"],
        roadmapItems: ["種子輪：500 萬枚，單價 0.5 USDT。", "空投：500 萬枚。", "礦機產出釋放：約 29.9 億枚。", "空投與礦機產出共同構成生態啟動入口。"],
        contractItems: [{ name: "空投轉化", detail: "注册送 100 型空投礦機，75 天內購買不低於 100 型真實礦機後，空投礦機可轉為永久。" }],
      },
      announcements: {
        aria: "NETE 公告欄",
        label: "公告",
        close: "關閉公告",
      },
      bridge: {
        aria: "機制與經濟模型銜接",
        items: [
          { title: "合約執行", desc: "規則自動觸發" },
          { title: "產出釋放", desc: "按週期透明流轉" },
          { title: "價值回流", desc: "銷毀與分配同步完成" },
        ],
      },
      team: {
        title: "技術基因，2018年我們就已站在浪潮之巔",
        desc: "EEA 聯盟成員，自主研發 VIA Protocol 與 Nete 平台，以全棧區塊鏈技術能力支撐生態長期運行。",
        items: [
          { title: "自主研發", desc: "核心協議、業務合約與前端交互統一圍繞鏈上透明規則構建。", tag: "VIA Protocol｜Nete 平台" },
          { title: "安全可信", desc: "以合約自動執行為基礎，提升參與、結算與數據同步可靠性。", tag: "全棧技術｜鏈上驗證" },
        ],
      },
      cta: {
        title: "NETE基金會 | 不是管理者，是守護者",
        subtitle: "NETE Foundation不隸屬於任何單一商業實體，它以獨立、透明、非營利為原則，致力於：",
        foundationItems: [
          "維護NETE生態的長期健康發展",
          "管理生態基金，支持開發者與創新項目",
          "推動社區治理，逐步實現權力下放",
          "連接傳統金融與Web3世界，降低准入門檻",
        ],
        closing: "加入NETE｜讓每一次交易都成為價值的連接。",
      },
    },
  }),
};

resources.ja = {
  translation: mergeTranslations(resources.en.translation, {
    common: {
      language: "言語",
      loading: "読み込み中...",
    },
    nav: {
      home: "ホーム",
      mining: "マイニング",
      seed: "シードNETE",
      team: "チーム",
      my: "マイ",
      wallet: {
        connect: "ウォレット接続",
        disconnect: "切断",
        switchChain: "チェーン切替",
        processing: "処理中...",
        select: "ウォレット選択",
        connecting: "接続中...",
        noConnector: "利用可能なウォレット接続がありません",
        connectionFailed: "ウォレット接続に失敗しました",
      },
    },
    footer: {
      tagline: "従来型決済とWeb3をつなぐ透明で持続可能なエコシステム。",
      closing: "NETEに参加｜すべての取引を価値のつながりへ。",
    },
    modules: moduleTranslations.ja,
    landing: {
      hero: {
        badge: "デフレ経済｜コミュニティ自治｜透明なルール",
        titleA: "NETE｜従来型決済と",
        titleB: "Web3の未来を",
        titleC: "つなぐ。",
        subtitle: "NETEはオンチェーンのデフレ経済モデルとマイナー産出メカニズムで時間価値を再構築します。",
        primary: "コアモデルを見る",
        secondary: "仕組みを見る",
      },
      features: {
        eyebrow: "// オンチェーンメカニズム",
        title: "自動化が信頼を生む\nオンチェーン中核機構",
        desc: "スマートコントラクトがマイニング、コミュニティ報酬、透明な安全ルールを自動実行します。",
        cards: [
          { title: "ステーキングマイニング", desc: "複数ランクのマイナー、日次収益、元本再投資、利益引き出しに対応。", tag: "多段階｜日次収益｜周期調整" },
          { title: "多層インセンティブ", desc: "20層加速、V1-V9配当、オンチェーン手数料分配をサポート。", tag: "20層加速｜Vレベル報酬" },
          { title: "透明なオンチェーンルール", desc: "コントラクトが自動実行し、主要データはオンチェーンで検証できます。", tag: "スマートコントラクト｜検証可能" },
        ],
      },
      project: {
        title: "希少性が価値を生むデフレ経済",
        desc: "NETEは30億枚の初期供給から始まり、引き出しとマイナー有効化でバーンが発生します。",
        mechanismsTitle: "発行とデフレ",
        rulesTitle: "初期配分",
        modelMechanisms: ["初期供給：30億 NETE。", "最終デフレ目標：2100万枚。", "バーン条件：引き出しとマイナー有効化。", "オンチェーンモデルが流通供給を継続的に圧縮。"],
        roadmapItems: ["シード：500万枚、0.5 USDT。", "エアドロップ：500万枚。", "マイナー産出：約29.9億枚。", "エアドロップとマイナー産出が初期参加入口を形成。"],
        contractItems: [{ name: "エアドロップ転換", detail: "登録で100型エアドロップマイナーを受け取り、条件達成後に永久化できます。" }],
      },
      announcements: {
        aria: "NETE お知らせ",
        label: "お知らせ",
        close: "お知らせを閉じる",
      },
      bridge: {
        aria: "仕組みと経済モデルの接続",
        items: [
          { title: "契約実行", desc: "ルールが自動で発動" },
          { title: "産出リリース", desc: "周期ごとに透明に流通" },
          { title: "価値還流", desc: "バーンと分配を同時完了" },
        ],
      },
      team: {
        eyebrow: "// 技術チーム",
        title: "技術的DNA、2018年から波の先端へ",
        desc: "EEAメンバーとして、VIA ProtocolとNeteプラットフォームを独自開発し、長期運用を支えます。",
        items: [
          { title: "独自開発", desc: "プロトコル、業務コントラクト、UIを透明なオンチェーンルールに沿って構築。", tag: "VIA Protocol｜Nete" },
          { title: "安全で信頼性の高い運用", desc: "自動実行により参加、精算、データ同期の信頼性を高めます。", tag: "フルスタック｜オンチェーン検証" },
        ],
      },
      cta: {
        title: "NETE Foundation | 管理者ではなく守護者",
        subtitle: "NETE Foundationは単一の商業主体に属さず、独立・透明・非営利を原則とします。",
        foundationItems: [
          "NETEエコシステムの長期的な健全性を維持",
          "エコシステム基金を管理し開発者と革新を支援",
          "コミュニティガバナンスと段階的な分散化を推進",
          "従来型金融とWeb3をつなぎ参加障壁を下げる",
        ],
        closing: "NETEに参加｜すべての取引を価値のつながりへ。",
      },
    },
  }),
};

resources.ko = {
  translation: mergeTranslations(resources.en.translation, {
    common: {
      language: "언어",
      loading: "로딩 중...",
    },
    nav: {
      home: "홈",
      mining: "마이닝",
      seed: "시드 NETE",
      team: "팀",
      my: "내 계정",
      wallet: {
        connect: "지갑 연결",
        disconnect: "연결 해제",
        switchChain: "체인 전환",
        processing: "처리 중...",
        select: "지갑 선택",
        connecting: "연결 중...",
        noConnector: "사용 가능한 지갑 연결이 없습니다",
        connectionFailed: "지갑 연결 실패",
      },
    },
    footer: {
      tagline: "전통 결제와 Web3를 연결하는 투명하고 지속 가능한 생태계.",
      closing: "NETE 참여｜모든 거래를 가치의 연결로.",
    },
    modules: moduleTranslations.ko,
    landing: {
      hero: {
        badge: "디플레이션 경제｜커뮤니티 자치｜투명한 규칙",
        titleA: "NETE｜전통 결제와",
        titleB: "Web3의 미래를",
        titleC: "연결합니다.",
        subtitle: "NETE는 온체인 디플레이션 경제 모델과 마이너 산출 메커니즘으로 시간 가치를 재구성합니다.",
        primary: "핵심 모델 보기",
        secondary: "메커니즘 보기",
      },
      features: {
        eyebrow: "// 온체인 메커니즘",
        title: "자동화가 신뢰를 만듭니다\n온체인 핵심 메커니즘",
        desc: "스마트 컨트랙트가 마이닝, 커뮤니티 인센티브, 투명한 보안 규칙을 자동 실행합니다.",
        cards: [
          { title: "스테이킹 마이닝", desc: "다양한 마이너, 일일 수익, 원금 재투자, 수익 인출을 지원합니다.", tag: "다단계｜일일 수익｜주기 조정" },
          { title: "다층 인센티브", desc: "20단계 가속, V1-V9 배당, 온체인 수수료 분배를 지원합니다.", tag: "20단계 가속｜V레벨 보상" },
          { title: "투명한 온체인 규칙", desc: "컨트랙트가 자동 실행되며 핵심 데이터는 온체인에서 검증됩니다.", tag: "스마트 컨트랙트｜검증 가능" },
        ],
      },
      project: {
        title: "희소성이 가치를 만드는 디플레이션 경제",
        desc: "NETE는 30억 개 초기 공급으로 시작하며 인출과 마이너 활성화 시 소각이 발생합니다.",
        mechanismsTitle: "발행과 디플레이션",
        rulesTitle: "초기 배분",
        modelMechanisms: ["초기 공급량: 30억 NETE.", "최종 디플레이션 목표: 2100만 개.", "소각 조건: 인출 및 마이너 활성화.", "온체인 모델이 유통 공급을 지속적으로 압축합니다."],
        roadmapItems: ["시드 라운드: 500만 개, 0.5 USDT.", "에어드롭: 500만 개.", "마이너 산출: 약 29.9억 개.", "에어드롭과 마이너 산출이 초기 참여 입구를 구성합니다."],
        contractItems: [{ name: "에어드롭 전환", detail: "가입 시 100형 에어드롭 마이너를 받고 조건 충족 후 영구 마이너로 전환할 수 있습니다." }],
      },
      announcements: {
        aria: "NETE 공지",
        label: "공지",
        close: "공지 닫기",
      },
      bridge: {
        aria: "메커니즘과 경제 모델 연결",
        items: [
          { title: "컨트랙트 실행", desc: "규칙이 자동으로 작동" },
          { title: "산출 릴리스", desc: "주기별 투명한 흐름" },
          { title: "가치 환류", desc: "소각과 분배 동시 완료" },
        ],
      },
      team: {
        eyebrow: "// 기술 팀",
        title: "기술 DNA, 2018년부터 흐름의 최전선에",
        desc: "EEA 멤버로서 VIA Protocol과 Nete 플랫폼을 자체 개발하고 장기 생태계 운영을 지원합니다.",
        items: [
          { title: "자체 개발", desc: "프로토콜, 비즈니스 컨트랙트, UI를 투명한 온체인 규칙 중심으로 구축합니다.", tag: "VIA Protocol｜Nete" },
          { title: "안전하고 신뢰 가능", desc: "자동 실행을 기반으로 참여, 정산, 데이터 동기화의 신뢰성을 높입니다.", tag: "풀스택｜온체인 검증" },
        ],
      },
      cta: {
        title: "NETE Foundation | 관리자가 아닌 수호자",
        subtitle: "NETE Foundation은 단일 상업 주체에 속하지 않으며 독립성, 투명성, 비영리를 원칙으로 합니다.",
        foundationItems: [
          "NETE 생태계의 장기적 건강성 유지",
          "생태계 펀드를 관리하고 개발자와 혁신 지원",
          "커뮤니티 거버넌스와 점진적 분산화 추진",
          "전통 금융과 Web3를 연결하고 진입 장벽 완화",
        ],
        closing: "NETE 참여｜모든 거래를 가치의 연결로.",
      },
    },
  }),
};

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("zh-tw") || value.startsWith("zh-hk") || value.includes("hant")) return "zh-TW";
  if (value.startsWith("en")) return "en";
  if (value.startsWith("ja")) return "ja";
  if (value.startsWith("ko")) return "ko";
  return "zh";
}

const savedLanguage = typeof window !== "undefined" ? window.localStorage.getItem("nete-lang") : null;
const browserLanguage = typeof window !== "undefined" ? window.navigator.language : "zh";
const initialLanguage = normalizeLanguage(savedLanguage || browserLanguage);

function syncDocumentLanguage(language) {
  if (typeof document !== "undefined") {
    const nextLanguage = normalizeLanguage(language);
    document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : nextLanguage;
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "zh",
  supportedLngs: languageOptions.map((item) => item.key),
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
