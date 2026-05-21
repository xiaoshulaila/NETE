# NETE 前端接入指南（合约 + 服务端）


本文档面向前端工程，按业务流程说明如何接入链上合约与后端服务。


## 1. 架构与职责


- 链上合约负责：资金结算、矿机状态、订单撮合、签名领取最终校验。
- 服务端负责：扫块索引、统计聚合、签名消息生成、keeper辅助任务。
- 前端建议：**写操作走合约，读操作优先服务端**（体验更好、聚合更完整）。


## 2. 前置配置


### 2.1 合约地址


需要以下地址（按环境区分）：


- `NeteToken`
- `NeteCore`
- `NeteNetwork`
- `NeteMarket`
- `USDT`


### 2.2 服务端基址


服务支持前缀路由（便于 Nginx 代理），例如：


- `http_base = /nete`
- API 根路径即 `/nete/...`
- 文档路径：`/nete/spec`
- OpenAPI JSON：`/nete/spec.json`


## 3. 业务流程总览


1. 进入页面 -> 拉运行时配置（服务端）
2. 用户绑定推荐关系（可选，链上）
3. 激活矿机（链上）
4. 收益查询（服务端）
5. 领取矿机收益/提现利润（链上，一键提取优先）
6. C2C 挂单/吃单（链上）
7. 推荐/分红/V9 签名领取（服务端拿签名 + 链上提交）


---


## 4. 启动阶段（页面初始化）


### 4.1 读运行时配置（服务端）


`GET /v1/config/runtime`


关键字段：


- `guide_min_price`, `guide_max_price`
- `designated_window`, `recycle_window`
- `require_sbt`, `repurchase_paused`, `presale_active`


前端用途：


- 控制挂单价格区间提示
- 控制矿机/复投按钮态
- 展示系统开关状态


---


## 5. 推荐关系流程


### 5.1 绑定推荐人（链上）


合约：`NeteNetwork.bindReferrer(referrer)`


前端注意：


- 一次性绑定，不可重复。
- 需要在交易前校验 `referrer != self`。
- 建议先读链上 `NeteNetwork.getReferrer(user)` 或后端 `GET /v1/referral/info?user=...`，若已绑定则隐藏绑定按钮。
- 若用户未主动绑定，当前 `NeteCore.buySeed/activateMiner` 会尝试自动绑定到 `topReferrer`；但前端仍建议显式引导用户先绑定真实邀请人。


推荐绑定交互建议：


1. 输入邀请人地址（二维码/邀请码解析后得到地址）。
2. 前端校验：
   - 地址格式合法
   - 不能等于当前钱包地址
3. 发起 `bindReferrer(referrer)` 交易。
4. 成功后刷新：
   - `GET /v1/referral/info?user=<address>`
   - `GET /v1/performance/personal?user=<address>`
   - `GET /v1/performance/legs?user=<address>`


### 5.2 读取推荐信息（服务端）


`GET /v1/referral/info?user=<address>`


返回：


- `referrer`, `direct_count`, `max_depth`
- `own_perf`, `subtree_perf`, `small_leg_perf`, `user_level`
- `own_miner_perf`, `own_seed_perf`（`own_seed_perf` 为预售业绩）
- `subtree_miner_perf`, `subtree_seed_perf`（`subtree_seed_perf` 为团队预售业绩）
- `small_leg_miner_perf`, `small_leg_seed_perf`（`small_leg_seed_perf` 为小区预售业绩）


### 5.2.1 读取直推列表（服务端）


`GET /v1/referral/downlines?user=<address>`


返回：


- `user`
- `downlines`（第一层直推地址列表）
- `total`（直推数量）


### 5.3 个人业绩接口（服务端）


`GET /v1/performance/personal?user=<address>`


返回：


- `user`
- `miner_perf`（矿机业绩）
- `presale_perf`（预售业绩）
- `own_perf`（个人总业绩 = `miner_perf + presale_perf`）


### 5.4 大小区业绩接口（服务端）


`GET /v1/performance/legs?user=<address>`


返回：


- `team_perf`（团队业绩）
- `big_leg_perf`（大区业绩）
- `small_leg_perf`（小区业绩）
- `user_level`


口径说明（后端中心化计算）：


- `team_perf = subtree_perf - own_perf`（不含本人，仅团队下级）
- `big_leg_perf = team_perf - small_leg_perf`
- `small_leg_perf` 与 `user_level` 均以后端索引重算结果为准


---


## 6. 矿机流程（NeteCore）


### 6.1 激活矿机（链上）


1. `NeteToken.approve(NeteCore, amount)`
2. `NeteCore.activateMiner(tierIndex)`


`tierIndex` 默认档位对照（来源于合约 `TierLib.defaultTiers()`）：


| tierIndex | principal (NETE) | maxSlots | cycleDays | returnBps | feeBps |
|---:|---:|---:|---:|---:|---:|
| 0 | 100 | 1 | 35 | 0 | 2000 |
| 1 | 30 | 3 | 35 | 12000 | 2000 |
| 2 | 100 | 3 | 35 | 12000 | 2000 |
| 3 | 300 | 3 | 35 | 12000 | 2000 |
| 4 | 500 | 2 | 35 | 12500 | 2000 |
| 5 | 1000 | 1 | 40 | 13000 | 2000 |
| 6 | 3000 | 1 | 40 | 13500 | 2000 |
| 7 | 5000 | 1 | 40 | 13500 | 2000 |
| 8 | 10000 | 1 | 50 | 14000 | 2000 |
| 9 | 30000 | 1 | 50 | 14000 | 2000 |
| 10 | 50000 | 1 | 50 | 14000 | 2000 |


前端接入注意：


- `activateMiner` 仅允许付费档位（`tierIndex` 必须为 `1..10`）；传 `0` 会在链上 `revert InvalidTier()`。
- `tierIndex` 同时决定激活所需本金、同档位可持有上限、周期、总收益比例。
- 当 `presaleActive=true` 时，部分档位受预售额度限制（售罄会 `revert PresaleTierSoldOut()`）。
- 以上为默认配置，owner 可通过 `setTierConfig()` 调整，前端应以链上实时配置为准。
- 激活矿机支付来源（链上自动混合）：`repurchaseBalance`（本金池）优先 -> `positionProfit`（收益池）其次 -> 钱包 `NETE` 补差。


### 6.2 领取矿机收益（链上）


- `NeteCore.claimReward(positionId)`
- `NeteCore.claimAllRewards()`（一键领取所有可领收益）


按钮交互建议：


- **单笔领取**：在仓位卡片内保留 `claimReward(positionId)`，用于精细化领取。
- **一键领取**：在“我的矿机收益”区域提供主按钮，调用 `claimAllRewards()`。
- **按钮可用态**：
  - 若前端可计算到至少一个仓位存在 `pending > 0`，按钮可点击；
  - 否则可置灰，并提示“暂无可领取收益”。
- **发起后处理**：
  - 按单次链上交易处理（一个 tx）；
  - 成功后刷新仓位、`income/overview`、`income/ledger`。


失败提示建议：


- `NoPendingReward`：提示“当前没有可领取收益”。
- `PosPoolInsufficient`：提示“奖励池余额不足，请稍后再试”。
- 其它 `revert`：显示原始错误并给出“稍后重试/联系客服”。


与单笔领取的区别：


- **粒度**：
  - 单笔领取只处理一个 `positionId`；
  - 一键领取会遍历当前用户全部运行中仓位。
- **事件表现**：
  - 一键领取仍逐仓位产生原有事件（`RewardClaimed` / `AirdropRewardClaimed`）；
  - 后端索引与单笔领取一致，无需额外适配特殊聚合事件。
- **失败策略**：
  - 任何导致交易 `revert` 的条件会使整笔一键交易失败；
  - 前端应提示用户改用单笔领取排查具体仓位问题。


收益拆分口径（paid 矿机）：


- 每次 claim 按该仓位当期参数并行拆分，不再采用“先回本金、再计利润”。
- 设 `P=principal`，`R=totalReturn`，`pending=本次可领总额`：
  - `principalPart = pending * P / R`
  - `profitGross = pending - principalPart`
- 入账：
  - `principalPart -> repurchaseBalance`
  - `profitGross -> positionProfit`


### 6.2.1 BABT 签到（链上）


- `NeteCore.checkInWithBABT()`


新口径：


- 用户持有 `BABT`（当前合约用 `sbtContract` 地址校验余额）可签到。
- 每地址每 24h 仅可签到一次。
- 每次签到增加 `0.5333 NETE` 到签到收益池：`checkinProfitBalance[user]`。
- 用户一旦买过付费矿机（并自动获得空投矿机）后，签到入口关闭。


提现：


- `NeteCore.withdrawCheckInProfit(amount)` 提取签到收益。


### 6.3 提现利润（链上）


- `NeteCore.withdrawProfit(positionId, amount)`
- `NeteCore.withdrawAllProfit()`（一键提取当前地址全部仓位利润到钱包）


提现口径更新：


- 对**所有矿机（含空投矿机）**，提现时按仓位档位配置扣手续费：`fee = amount * tierConfigs[tierIndex].feeBps / 10000`。
- 当前默认配置下，`tier 0..10` 的 `feeBps=2000`，即统一 `20%`。
- 提现手续费分账仍走 `Burn/Treasury/Dividend`。


调费方式（owner）：


- 通过 `NeteCore.setTierConfig(...)` 更新各档 `feeBps`，无需新增独立手续费字段。
- 若使用升级脚本，可设置环境变量：
  - `APPLY_UNIFORM_WITHDRAW_FEE=true`
  - `WITHDRAW_FEE_BPS=2000`
  脚本会在升级后批量把 `tier 1..10` 的 `feeBps` 调整为目标值。


前端按钮建议：


- 主按钮：`一键提取收益到钱包` -> 调用 `withdrawAllProfit()`
- 次按钮（可选）：`按仓位提取` -> 调用 `withdrawProfit(positionId, amount)`


失败提示建议：


- `NoProfitToWithdraw`：提示“当前没有可提取利润”
- `InsufficientProfitBalance`：提示“提取金额超过仓位可提利润”
- 其它 `revert`：展示链上原始错误并提示稍后重试


### 6.3.1 一键复投按钮启用条件（前端）


链上一键复投入口：


- 兼容入口：`NeteCore.repurchaseExpiredMiners()`（默认 `Auto`）
- 显式支付模式入口：`NeteCore.repurchaseExpiredMinersWithMode(payMode)`


链上单个复投入口：


- 兼容入口：`NeteCore.repurchase(positionId)`（默认 `Auto`）
- 显式支付模式入口：`NeteCore.repurchaseWithMode(positionId, payMode)`


`payMode` 约定：


- `0`：仅本金池（`RepurchasePoolOnly`）
- `1`：仅钱包 NETE（`WalletOnly`）
- `2`：自动混合（`Auto`，本金池优先，其次收益池，不足再钱包补差）
- `3`：仅收益池（`ProfitOnly`，按用户各仓位 `positionProfit` 依次扣减）


复投函数会在链上自动处理“当前可结转但仍 Running 的付费矿机”结算，再进入复投判断。前端仍建议按下述条件预筛选，以减少用户失败交易。


判断步骤（建议）：


1. 读取用户仓位：`getUserPositions(user)` + `getPosition(posId)`
2. 过滤可复投仓位（eligible，建议）：
   - `!isAirdrop`
   - `state == PendingRepurchase`（枚举值 `1`）
   - 或 `state == Running`（枚举值 `0`）且 `now >= endAt`
   - 或 `state == Ended`（枚举值 `2`，历史兼容：链上会在复投入口自动转为 `PendingRepurchase`）
3. 计算所需复投总额（按上述 eligible）：
   - `required = sum(principal of eligible)`
4. 读取 `repurchaseBalance(user)` 与运行时配置 `repurchase_paused`


按钮状态建议：


- `eligible.length == 0`：隐藏或置灰，文案 `暂无可复投矿机`
- `eligible.length > 0 && payMode=0 && repurchaseBalance < required`：置灰，文案 `复投余额不足`
- `repurchase_paused == true`：置灰，文案 `系统暂停复投`
- 其余情况：按钮可点，调用 `repurchaseExpiredMinersWithMode(payMode)` 或兼容入口 `repurchaseExpiredMiners()`


`Auto` 组合复投扣款顺序（链上）：


- 先扣 `repurchaseBalance(user)`（本金池）
- 再扣 `positionProfit`（收益池，按用户仓位顺序逐仓扣减）
- 最后不足部分扣钱包 NETE（需 `approve`）


批量复投补充说明：


- `repurchaseExpiredMiners*` 在链上最终仍按 `now >= endAt` 汇总本次批量复投仓位。
- 前端若要提高“按钮可点即成功”的命中率，建议批量按钮只统计 `now >= endAt` 的 eligible 仓位。


错误兜底提示（说明：错误名中仍有 `Expired` 字样，这是历史命名，语义按“暂无可复投矿机”处理）：


- `NoExpiredMinerForRepurchase`：暂无可复投矿机
- `InsufficientBalance`：复投余额不足
- `RepurchasePausedError`：系统暂停复投
- `InvalidRepurchasePayMode`：支付模式无效
- `PositionNotPendingRepurchase`（单复投场景）：当前矿机暂不可复投


复投支付事件（用于前端展示/对账）：


- `RepurchasePayment(user, payMode, fromRepurchasePool, fromProfitPool, fromWallet, totalAmount)`


加速收益与矿机封顶规则（重要）：


- 加速收益会自动分配到“用户当前运行中、等级最高的付费矿机”（非空投）。
- 加速收益会计入矿机周期封顶判断：`grossClaimed + accelClaimed >= totalReturn` 时进入 `PendingRepurchase`。
- 因此高层级加速较高时，矿机可能早于自然周期日结束，需要手动复投进入下一轮。
- 后端会记录 `AccelRewardAdded` 明细到 `accel_reward_ledger`（用户、矿机ID、金额、tx/log、块高、时间），用于对账与排查。


周期递增与封顶规则（Paid 矿机）：


- 首周期使用档位基础周期（不额外加天）。
- 每次复投后，下一周期时长 `+extendDays`（默认 +5 天）。
- 周期时长封顶 `maxDays`（默认 180 天）。
- 达到 180 天后可继续复投，但后续每次周期长度固定 180 天，不再继续增加。


### 6.4 前端收益读取（服务端）


- 总览：`GET /v1/income/overview?user=<address>`
- 流水：`GET /v1/income/ledger?user=<address>&page=1&page_size=20`
- 领取记录：`GET /v1/income/claims?user=<address>&page=1&page_size=20`
- 加速分配明细：`GET /v1/accel/reward-ledger?user=<address>&page=1&page_size=20`


口径提示：


- 服务端收益接口主要用于统计展示（累计口径）。
- 当前“可提取收益/可用于支付的收益池余额”应以链上 `positionProfit` 实时值为准。


领取记录筛选参数（可选）：


- `reward_type`: `referral | dividend | v9`
- `status`: `pending | submitted | confirmed | expired`


---


### 6.4.1 空投矿机（首购付费矿机自动赠送）


链上入口：


- 无需单独领取入口；在首次 `activateMiner(tierIndex)` 成功后自动发放 1 台空投矿机。


新规则：


- 首次购买任意付费矿机时自动赠送 1 台空投矿机（仅一次）。
- 空投矿机永久有效，不再有 75 天过期窗口。
- 空投矿机每周期产出 20 枚 NETE：
  - 周期 1：35 天
  - 后续每周期 +5 天
  - 周期长度上限 180 天（达到后固定 180 天）
- 空投矿机收益进入 `positionProfit`，提现同样收 20% 手续费（默认配置）。


失败提示建议：


- 其它 `revert`：显示原始错误并提示稍后重试。


按钮文案建议：


- 空投区入口：`空投矿机（首购自动赠送）`
- 状态说明：`已自动获得` / `未获得（购买任意付费矿机后自动赠送）`


---


## 6.5 预售记录查询（服务端）


RESTful 路由（统一风格）：


- 全量分页：`GET /v1/presale/records?page=1&page_size=20`
- 按用户分页：`GET /v1/presale/records/:user?page=1&page_size=20`


返回字段（每条记录）：


- `buyer`
- `usdt_amount`
- `nete_amount`
- `tx_hash`
- `log_index`
- `block_number`
- `created_at`


前端用途：


- 预售明细列表
- 用户历史认购记录（时间 / 数量 / 交易哈希）


---


## 6.6 签到记录与统计（服务端）


接口：


- `GET /v1/checkin/records?user=0x...&page=1&page_size=20`


返回字段：


- `user`: 地址（小写）
- `checkin_count`: 累计签到次数
- `checkin_reward_total`: 累计签到奖励（18 位精度整数字符串）
- `items`: 签到明细（按 `checkin_at` 倒序）
  - `amount`
  - `checkin_at`
  - `tx_hash`
  - `log_index`
  - `block_number`
- `total/page/page_size`: 分页信息


---


## 7. C2C 订单流程（NeteMarket）


### 7.1 创建卖单（链上）


1. `NeteToken.approve(NeteMarket, neteAmount)`
2. `NeteMarket.createSellOrder(neteAmount, pricePerNete)`


### 7.2 成交（链上）


1. `USDT.approve(NeteMarket, totalUsdt)`
2. `NeteMarket.fillOrder(orderId)`


### 7.3 订单读取（服务端）


- 订单详情：`GET /v1/orders/:order_id`
- 短号详情：`GET /v1/orders/by-short/:short_no`（推荐用于前端搜索/展示）
- 公域订单簿：`GET /v1/orders/public?page=1&page_size=20`


前端注意：


- `orderId` 是 `uint256` 大整数，前端必须按**字符串**处理。
- 不要用 JS `Number` 存储链上金额或 `orderId`。
- 前端展示建议使用后端返回的 `short_order_no`（10位hex），上链交互仍使用 `order_id`。


### 7.4 我的挂单 / 我的吃单


当前服务端已可通过订单详情与订单簿查询，但前端业务上需要单独支持：


- 我的挂单（我是 `seller`）
- 我的吃单（我是 `buyer`）


后端接口：


- `GET /v1/orders/public/:user?page=1&page_size=20`（我的挂单，`seller=user`）
- `GET /v1/orders/taken/:user?page=1&page_size=20`（我的吃单，`buyer=user`）


若暂未新增接口，前端临时方案：


- 使用 `orders/public` + 按 `seller` 前端过滤（仅适合数据量小）
- 或直接根据已知 `orderId` 列表批量拉详情


### 7.5 订单可见性规则


- 我的挂单查询**不受10分钟窗口限制**，应始终可查。
- 公共订单簿（`/v1/orders/public`）通常用于展示 `Open` 订单。


---


## 8. 签名领取流程（NeteNetwork）


适用奖励：


- 推荐奖励（referral）
- 分红奖励（dividend）
- V9 奖励（v9）


### 8.1 获取签名消息（服务端）


- `POST /v1/referral/claim-message`
- `POST /v1/dividend/claim-message`
- `POST /v1/v9/claim-message`


请求体：


```json
{
  "user": "0x...",
  "amount": "可选，18位精度整数字符串"
}
```


规则：


- `amount` 不传：默认使用当前可领取最大值（已扣除冻结）。
- `amount` 传值：必须 `<= available`。
- 同一 `user + rewardType` 存在活跃签名单时，接口会返回同一单（单飞）。


加速（推荐）奖励结算说明：


- 服务端已内置后台任务，按配置的每日固定 UTC 时间点执行（默认 `00:00`），结算 `D-1` 及历史未结算日的加速奖励。
- 管理接口 `POST /v1/rewards/accel/settle` 仍可用于手动补结算/排查，但日常前端无需主动调用。


### 8.2 前端提交链上领取


合约：`NeteNetwork.claimWithSignature(payload, signature)`


`payload` 使用服务端返回字段：


- `user, amount, epoch, nonce, deadline, claim_id, reward_type`


### 8.3 冻结与超时


- 冻结窗口：**10分钟**
- 活跃单状态：`pending/submitted`
- 超时自动 `expired`，冻结释放
- 成功上链后状态 `confirmed`


前端建议：


- 签名弹窗展示 `deadline` 倒计时
- 倒计时结束后提示“签名已过期，请重新获取”


### 8.4 签名开关


若服务端 `signer.enabled=false`，签名接口返回：


- `403 claim signature disabled`


前端处理：


- 隐藏/禁用签名领取按钮
- 弹出“当前环境未开启签名领取”


---


## 9. 状态一致性与重试建议


### 9.1 索引延迟


- 链上交易成功后，服务端读模型可能有秒级延迟。
- 前端流程建议：
  - 先显示链上交易成功
  - 再轮询服务端 API 刷新聚合视图


### 9.2 幂等与防重


- 订单、收益、推荐等索引具备幂等去重。
- 签名领取使用链上 `nonce + claimId` 校验，服务端使用单飞冻结，避免并发重签。


### 9.3 kill/restart 安全


- 服务端扫块数据与 `last_block/last_hash` 同事务提交，重启不会造成高度与数据错位。


---


## 10. 精度与数据类型规范（前端必须）


- 所有金额（NETE/USDT）使用 `string` + `BigInt`/`bignumber` 处理。
- 不使用浮点数参与业务计算。
- `orderId`, `positionId`, `nonce`, `epoch` 均按字符串/大整数处理。


---


## 11. 推荐接入顺序（工程落地）


1. 封装 `contracts` SDK（写操作）
2. 封装 `service` SDK（读操作、签名）
3. 先完成矿机主流程（激活/收益/提现）
4. 再接 C2C 订单流程
5. 最后接签名领取流程（含倒计时、重试、过期处理）


---


## 12. 常见错误码与处理


- 合约 `revert`：
  - 前端显示链上错误原文（可附业务化翻译）
- 服务端 `403 claim signature disabled`：
  - 提示“签名领取未开启”
- 服务端 `400/500`：
  - 保留 requestId（如果网关有）并提示稍后重试


---


## 13. 调试建议


- 合约交易：优先看链上 tx receipt + event。
- 服务读模型：看 `chain_events` 是否已入库。
- 若出现“链上已成功但服务端未更新”：
  - 检查 indexer 是否追到最新块
  - 检查 `start_block` 配置与网络 RPC 可用性


---


## 14. 前端接口字段对照表（TS 类型定义）


以下类型可直接放到前端 `types/api.ts` 使用。


```ts
export type ApiListResponse<T> = {
  /** 列表数据 */
  items: T[];
  /** 总条数 */
  total: number;
  /** 当前页（部分接口返回） */
  page?: number;
  /** 每页条数（部分接口返回） */
  page_size?: number;
};


export type ClaimRequest = {
  /** 领取用户地址（EVM address） */
  user: string;
  /**
   * 可选领取金额（18位精度整数字符串）
   * - 不传：默认 available（= 可领取总额 - 已确认领取 - 冻结中金额）
   * - 传值：必须 <= available
   */
  amount?: string;
};


export type ClaimMessage = {
  /** 领取用户地址（需与链上 msg.sender 一致） */
  user: string;
  /** 本次签名允许领取金额（18位精度整数字符串） */
  amount: string;
  /** 签名生成时的日分桶（UTC day），用于审计/对账 */
  epoch: number;
  /** 链上 userNonce，claimWithSignature 必须严格匹配 */
  nonce: number;
  /** 签名过期时间（Unix 秒），超过后链上会 ExpiredDeadline */
  deadline: number;
  /** 领取单唯一ID（签名体的一部分，链上 usedClaimIds 防重） */
  claim_id: string;
  /** 奖励类型：0=推荐，1=分红，2=V9 */
  reward_type: 0 | 1 | 2; // 0=Referral, 1=Dividend, 2=V9Pool
  /** EIP-712 签名 */
  signature: string;
};


export type RuntimeConfig = {
  /** 市场指导最低价（18位精度） */
  guide_min_price: string;
  /** 市场指导最高价（18位精度） */
  guide_max_price: string;
  /** 订单可回收窗口（秒） */
  recycle_window: number;
  /** 设计窗口（秒） */
  designated_window: number;
  /** 是否要求 SBT */
  require_sbt: boolean;
  /** 复投是否暂停 */
  repurchase_paused: boolean;
  /** 预售是否开启 */
  presale_active: boolean;
  /** 种子池剩余 NETE（18位精度） */
  seed_remaining: string;
  /** POS 池剩余 NETE（18位精度） */
  pos_remaining: string;
};


export type OrderView = {
  /** 订单ID（uint256，前端按字符串处理） */
  order_id: string;
  /** 10位短订单号（hex，小写） */
  short_order_no: string;
  /** 订单号（bytes32 hex） */
  order_no: string;
  /** 卖家地址 */
  seller: string;
  /** 买家地址（未成交时可能为空串） */
  buyer: string;
  /** 挂单 NETE 数量（18位精度） */
  nete_amount: string;
  /** 单价（USDT/NETE，18位精度） */
  price_usdt: string;
  /** 总价（USDT，18位精度） */
  total_usdt: string;
  /** 手续费（USDT，18位精度） */
  fee: string;
  /** 创建时间（Unix 秒） */
  created_at: number;
  /** 成交时间（Unix 秒，未成交可能为0） */
  filled_at: number;
  /** 私有截止时间（created_at + designated_window） */
  private_deadline: number;
  /** 回收时间（created_at + recycle_window） */
  recycle_at: number;
  /** 订单状态 */
  status: "Open" | "Filled" | "Cancelled" | "Recycled" | string;
  /** 当前是否可在公共订单簿展示 */
  is_public: boolean;
};


export type SeedOrderView = {
  /** 参与预售地址 */
  buyer: string;
  /** 预售支付 USDT 数量（18位精度） */
  usdt_amount: string;
  /** 预售获得 NETE 数量（18位精度） */
  nete_amount: string;
  /** 对应链上交易哈希 */
  tx_hash: string;
  /** 事件日志索引 */
  log_index: number;
  /** 区块高度 */
  block_number: number;
  /** 记录创建时间（Unix 秒） */
  created_at: number;
};


export type ReferralInfo = {
  /** 当前用户地址 */
  user: string;
  /** 推荐人地址（未绑定可能为空） */
  referrer: string;
  /** 直推人数 */
  direct_count: number;
  /** 最大奖励层级深度 */
  max_depth: number;
  /** 个人业绩（18位精度） */
  own_perf: string;
  /** 个人矿机业绩（18位精度） */
  own_miner_perf: string;
  /** 个人预售业绩（18位精度，字段名历史沿用 seed） */
  own_seed_perf: string;
  /** 团队总业绩（18位精度） */
  subtree_perf: string;
  /** 团队矿机业绩（18位精度） */
  subtree_miner_perf: string;
  /** 团队预售业绩（18位精度，字段名历史沿用 seed） */
  subtree_seed_perf: string;
  /** 小区业绩（18位精度） */
  small_leg_perf: string;
  /** 小区矿机业绩（18位精度） */
  small_leg_miner_perf: string;
  /** 小区预售业绩（18位精度，字段名历史沿用 seed） */
  small_leg_seed_perf: string;
  /** 用户等级（V0~V9） */
  user_level: number;
};


export type PersonalPerformance = {
  /** 当前用户地址 */
  user: string;
  /** 个人总业绩（18位精度）= miner_perf + presale_perf */
  own_perf: string;
  /** 矿机业绩（18位精度） */
  miner_perf: string;
  /** 预售业绩（18位精度） */
  presale_perf: string;
};


export type LegPerformance = {
  /** 当前用户地址 */
  user: string;
  /** 团队业绩（18位精度，不含本人） */
  team_perf: string;
  /** 大区业绩（18位精度） */
  big_leg_perf: string;
  /** 小区业绩（18位精度） */
  small_leg_perf: string;
  /** 用户等级（V0~V9） */
  user_level: number;
};


export type IncomeOverview = {
  /** 用户地址 */
  user: string;
  /** 用户等级（V0~V9） */
  user_level: number;
  /** 矿机累计收益 */
  miner_income_total: string;
  /** 矿机利润累计毛额（claim拆分出来的利润，不含扣费） */
  miner_profit_gross_total: string;
  /** 矿机利润累计手续费（统计口径字段） */
  miner_profit_fee_total: string;
  /** 矿机利润累计净额（= 毛额 - 手续费） */
  miner_profit_net_total: string;
  /** 推荐累计收益（已结算） */
  accel_income_total: string;
  /** 分红累计已领取 */
  dividend_income_total: string;
  /** V9累计已领取 */
  v9_income_total: string;
  /** 推荐当前可领取 */
  pending_referral: string;
  /** 分红当前可领取 */
  pending_dividend: string;
  /** V9当前可领取 */
  pending_v9: string;
};


export type IncomeLedgerRow = {
  /** 用户地址 */
  user: string;
  /** 仓位ID */
  position_id: number;
  /** 矿机档位（tierIndex） */
  tier: number;
  /** 矿机本金（18位精度） */
  principal: string;
  /** 是否空投矿机 */
  is_airdrop: boolean;
  /** 结算日（UTC day） */
  epoch_day: number;
  /** 领取时间（Unix 秒时间戳） */
  claimed_at: number;
  /** 本次总收益 */
  gross_reward: string;
  /** 本次计入本金部分 */
  principal_part: string;
  /** 本次计入利润部分 */
  profit_part: string;
  /** 本次利润毛额（与profit_part等价，保留用于新口径显式展示） */
  profit_gross: string;
  /** 本次利润手续费 */
  profit_fee: string;
  /** 本次利润净额（进入positionProfit） */
  profit_net: string;
  /** 本次加速收益 */
  accel_income: string;
  /** 关联交易哈希 */
  tx_hash: string;
};


export type AccelRewardLedgerRow = {
  /** 用户地址 */
  user: string;
  /** 接收加速收益的矿机ID（当前用户运行中的最高档位矿机） */
  position_id: number;
  /** 本次加速分配金额（18位精度） */
  amount: string;
  /** 对应链上交易哈希 */
  tx_hash: string;
  /** 事件日志索引 */
  log_index: number;
  /** 区块高度 */
  block_number: number;
  /** 记录时间（Unix 秒） */
  created_at: number;
};


export type ClaimRecordRow = {
  /** 用户地址 */
  user: string;
  /** 本次签名领取金额（18位精度） */
  amount: string;
  /** 奖励类型：referral/dividend/v9 */
  reward_type: "referral" | "dividend" | "v9" | string;
  /** 结算日（UTC day） */
  epoch: number;
  /** 领取单唯一ID */
  claim_id: string;
  /** 链上 nonce（签名时使用） */
  nonce: number;
  /** 上链交易哈希；未提交时可能为空串 */
  tx_hash: string;
  /** 状态：pending/submitted/confirmed/expired */
  status: "pending" | "submitted" | "confirmed" | "expired" | string;
  /** 记录创建时间（Unix 秒） */
  created_at: number;
  /** 确认领取时间（Unix 秒，未确认时可能为0） */
  claimed_at: number;
};


export type RecycleRunOnceResult = {
  /** 本次回收订单数量 */
  recycled: number;
};
```


### 14.1 路由与类型对应


- `GET /v1/config/runtime` -> `RuntimeConfig`
- `GET /v1/presale/records` -> `ApiListResponse<SeedOrderView>`
- `GET /v1/presale/records/:user` -> `ApiListResponse<SeedOrderView>`
- `GET /v1/orders/public` -> `ApiListResponse<OrderView>`
- `GET /v1/orders/public/:user` -> `ApiListResponse<OrderView>`（我的挂单）
- `GET /v1/orders/taken/:user` -> `ApiListResponse<OrderView>`（我的吃单）
- `GET /v1/orders/:order_id` -> `OrderView`
- `GET /v1/orders/by-short/:short_no` -> `OrderView`
- `GET /v1/referral/info?user=...` -> `ReferralInfo | null`
- `GET /v1/referral/downlines?user=...` -> `{ user, downlines, total }`
- `GET /v1/performance/personal?user=...` -> `PersonalPerformance`
- `GET /v1/performance/legs?user=...` -> `LegPerformance`
- `GET /v1/income/overview?user=...` -> `IncomeOverview`
- `GET /v1/income/ledger?user=...` -> `ApiListResponse<IncomeLedgerRow>`
- `GET /v1/income/claims?user=...` -> `ApiListResponse<ClaimRecordRow>`
- `GET /v1/accel/reward-ledger?user=...` -> `ApiListResponse<AccelRewardLedgerRow>`
- `POST /v1/referral/claim-message` -> `ClaimMessage`
- `POST /v1/dividend/claim-message` -> `ClaimMessage`
- `POST /v1/v9/claim-message` -> `ClaimMessage`
- `POST /v1/keeper/recycle/run-once` -> `RecycleRunOnceResult`


### 14.2 前端实现注意


- 所有金额字段使用 `string`，不要转 JS `number`。
- `order_id` 是大整数，必须字符串处理。
- `claim-message` 返回的 `nonce/deadline` 直接透传到链上 `claimWithSignature`。



