import { getPublicClient, readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { decodeEventLog, formatUnits, parseAbiItem } from "viem";
import mockUsdtAbi from "../abis/MockUSDT.json";
import neteCoreAbi from "../abis/NeteCore.json";
import neteMarketAbi from "../abis/NeteMarket.json";
import neteNetworkAbi from "../abis/NeteNetwork.json";
import neteTokenAbi from "../abis/NeteToken.json";
import { NETE_CHAIN_ID, assertContractAddress, getContractAddress } from "../config/neteRuntime";
import { formatOrderNo } from "../utils/formatters";
import { wagmiConfig } from "../web3/wagmiConfig";

const ONE_18 = 10n ** 18n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BUY_SEED_GAS_LIMIT = 1_500_000n;
const CHECKED_IN_EVENT = parseAbiItem("event CheckedIn(address indexed user,uint256 amount,uint256 checkinAt)");
const erc721BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
];

function ensureAccount(account) {
  if (!account) {
    throw new Error("请先连接钱包");
  }
  return account;
}

function toBigInt(value) {
  if (typeof value === "bigint") return value;
  if (value === undefined || value === null || value === "") return 0n;
  return BigInt(String(value));
}

function ratioToPercentText(bps) {
  return `${(Number(bps || 0n) / 100).toFixed(2)}%`;
}

function pickTierField(raw, key, tupleIndex) {
  if (!raw || typeof raw !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(raw, key)) {
    return raw[key];
  }
  if (Array.isArray(raw) && tupleIndex < raw.length) {
    return raw[tupleIndex];
  }
  return undefined;
}

function isTierConfigScanBoundaryError(error) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  if (!message.includes("revert")) return false;
  return message.includes("tierconfigs") || message.includes("function: tierconfigs");
}

function formatOrderStatus(statusValue) {
  const status = Number(statusValue);
  if (status === 0) return "Open";
  if (status === 1) return "Filled";
  if (status === 2) return "Cancelled";
  if (status === 3) return "Recycled";
  return String(status);
}

async function read({ address, abi, functionName, args = [] }) {
  return readContract(wagmiConfig, {
    chainId: NETE_CHAIN_ID,
    address,
    abi,
    functionName,
    args,
  });
}

async function readOptional(request, fallback) {
  try {
    return await read(request);
  } catch {
    return fallback;
  }
}

async function send({ account, address, abi, functionName, args = [], gas }) {
  const request = {
    chainId: NETE_CHAIN_ID,
    account: ensureAccount(account),
    address,
    abi,
    functionName,
    args,
  };

  if (gas) {
    request.gas = gas;
  }

  const hash = await writeContract(wagmiConfig, request);

  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    chainId: NETE_CHAIN_ID,
    hash,
  });

  return {
    hash,
    receipt,
  };
}

function toOrderView(raw) {
  return {
    order_id: raw.orderId.toString(),
    short_order_no: formatOrderNo(raw.orderNo),
    order_no: raw.orderNo,
    seller: raw.seller,
    buyer: raw.buyer,
    nete_amount: raw.neteAmount.toString(),
    price_usdt: raw.pricePerNete.toString(),
    total_usdt: raw.totalUsdt.toString(),
    created_at: Number(raw.createdAt || 0n),
    filled_at: Number(raw.filledAt || 0n),
    status: formatOrderStatus(raw.status),
    status_code: Number(raw.status || 0),
  };
}

function decodeOrderCreated(receipt, marketAddress) {
  const targetAddress = String(marketAddress || "").toLowerCase();

  for (const log of receipt?.logs || []) {
    if (targetAddress && String(log.address || "").toLowerCase() !== targetAddress) continue;

    try {
      const event = decodeEventLog({
        abi: neteMarketAbi,
        data: log.data,
        topics: log.topics,
      });

      if (event.eventName === "OrderCreated") {
        return event.args;
      }
    } catch {
      // Ignore logs from other contracts in the same transaction.
    }
  }

  return null;
}

export async function readTokenMetrics() {
  const tokenAddress = assertContractAddress("neteToken");
  const [totalSupply, totalBurned, circulatingSupply, decimals] = await Promise.all([
    read({ address: tokenAddress, abi: neteTokenAbi, functionName: "totalSupply" }),
    read({ address: tokenAddress, abi: neteTokenAbi, functionName: "totalBurned" }),
    read({ address: tokenAddress, abi: neteTokenAbi, functionName: "circulatingSupply" }),
    read({ address: tokenAddress, abi: neteTokenAbi, functionName: "decimals" }),
  ]);

  return {
    decimals: Number(decimals),
    totalSupply,
    totalBurned,
    circulatingSupply,
  };
}

export async function readCoreSeedInfo() {
  const coreAddress = assertContractAddress("neteCore");
  const [seedPrice, seedRemaining, posRemaining, presaleActive, seedPoolInit, seedSold, minSeedBuy] = await Promise.all([
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "SEED_PRICE" }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "seedRemaining" }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "posRemaining" }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "presaleActive" }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "SEED_POOL_INIT" }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "seedSold" }),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "MIN_SEED_BUY" }, 30n * ONE_18),
  ]);

  return {
    seedPrice,
    seedRemaining,
    posRemaining,
    presaleActive,
    seedPoolInit,
    seedSold,
    minSeedBuy,
    seedPriceText: formatUnits(seedPrice, 18),
  };
}

export async function readTierConfigs(maxScan = 20) {
  const coreAddress = assertContractAddress("neteCore");
  const tiers = [];

  for (let index = 0; index < maxScan; index += 1) {
    let raw;
    try {
      raw = await read({ address: coreAddress, abi: neteCoreAbi, functionName: "tierConfigs", args: [BigInt(index)] });
    } catch (error) {
      if (index > 0 && isTierConfigScanBoundaryError(error)) break;
      throw error;
    }

    const principal = toBigInt(pickTierField(raw, "principal", 0));
    if (principal === 0n) continue;

    const maxSlots = Number(pickTierField(raw, "maxSlots", 1) ?? 0);
    const cycleDays = Number(pickTierField(raw, "cycleDays", 2) ?? 0);
    const returnBps = Number(pickTierField(raw, "returnBps", 3) ?? 0);
    const extendDays = Number(pickTierField(raw, "extendDays", 4) ?? 0);
    const maxDays = Number(pickTierField(raw, "maxDays", 5) ?? 0);
    const feeBps = Number(pickTierField(raw, "feeBps", 6) ?? 0);

    tiers.push({
      tierIndex: index,
      principal,
      maxSlots,
      cycleDays,
      returnBps,
      extendDays,
      maxDays,
      feeBps,
      principalText: formatUnits(principal, 18),
      returnRateText: ratioToPercentText(returnBps),
      feeText: ratioToPercentText(feeBps),
    });
  }

  return tiers;
}

export async function readUserBalances(user) {
  const tokenAddress = assertContractAddress("neteToken");
  const usdtAddress = assertContractAddress("usdt");

  const [neteBalance, usdtBalance] = await Promise.all([
    read({ address: tokenAddress, abi: neteTokenAbi, functionName: "balanceOf", args: [user] }),
    read({ address: usdtAddress, abi: mockUsdtAbi, functionName: "balanceOf", args: [user] }),
  ]);

  return {
    neteBalance,
    usdtBalance,
  };
}

export async function readUserMiningData(user) {
  const coreAddress = assertContractAddress("neteCore");
  const [positionIds, airdropInfoRaw, timeUnit] = await Promise.all([
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "getUserPositions", args: [user] }),
    readOptional(
      { address: coreAddress, abi: neteCoreAbi, functionName: "airdropInfos", args: [user] },
      { composed: false, positionId: 0n, composeAt: 0n, expireAt: 0n, promoted: false },
    ),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "timeUnit" }, 600n),
  ]);
  const timeUnitSeconds = Number(timeUnit || 600n) || 600;
  const timeUnitBigInt = BigInt(timeUnitSeconds);
  const airdropInfo = {
    composed: Boolean(pickTierField(airdropInfoRaw, "composed", 0)),
    positionId: toBigInt(pickTierField(airdropInfoRaw, "positionId", 1)),
    composeAt: toBigInt(pickTierField(airdropInfoRaw, "composeAt", 2)),
    expireAt: toBigInt(pickTierField(airdropInfoRaw, "expireAt", 3)),
    promoted: Boolean(pickTierField(airdropInfoRaw, "promoted", 4)),
  };

  const [repurchaseBalance, fragmentBalance, airdropRemaining, requireSBT, sbtContract, nftFragmentClaimed, checkinProfitBalance, lastCheckinAt, checkinRewardAmount] = await Promise.all([
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "repurchaseBalance", args: [user] }, 0n),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "fragmentBalance", args: [user] }, 0n),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "airdropRemaining" }, 0n),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "requireSBT" }, false),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "sbtContract" }, ZERO_ADDRESS),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "nftFragmentClaimed", args: [user] }, false),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "checkinProfitBalance", args: [user] }, 0n),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "lastCheckinAt", args: [user] }, 0n),
    readOptional({ address: coreAddress, abi: neteCoreAbi, functionName: "CHECKIN_REWARD_AMOUNT" }, 0n),
  ]);
  const requiresNft = Boolean(requireSBT);
  const configuredBabtAddress = getContractAddress("babt");
  const effectiveSbtContract = String(sbtContract || "").toLowerCase() === ZERO_ADDRESS ? configuredBabtAddress : sbtContract;
  const hasSbtContract = String(effectiveSbtContract || "").toLowerCase() !== ZERO_ADDRESS;
  let sbtBalance = 0n;

  if (requiresNft && hasSbtContract) {
    try {
      sbtBalance = await read({ address: effectiveSbtContract, abi: erc721BalanceAbi, functionName: "balanceOf", args: [user] });
    } catch {
      sbtBalance = 0n;
    }
  }

  const rows = await Promise.all(
    positionIds.map(async (positionId) => {
      const [position, pendingReward, profit] = await Promise.all([
        read({ address: coreAddress, abi: neteCoreAbi, functionName: "getPosition", args: [positionId] }),
        read({ address: coreAddress, abi: neteCoreAbi, functionName: "getPendingReward", args: [positionId] }),
        read({ address: coreAddress, abi: neteCoreAbi, functionName: "positionProfit", args: [positionId] }),
      ]);

      const cycleTotalDays = Number(position.endAt > position.startAt ? (position.endAt - position.startAt) / timeUnitBigInt : 0n);
      const cyclePassedDays = Number(position.lastSettleAt > position.startAt ? (position.lastSettleAt - position.startAt) / timeUnitBigInt : 0n);

      return {
        positionId: positionId.toString(),
        tierIndex: Number(position.tierIndex),
        principal: position.principal,
        totalReturn: position.totalReturn,
        grossClaimed: position.grossClaimed,
        principalRecovered: position.principalRecovered,
        accelClaimed: position.accelClaimed ?? 0n,
        currentPeriod: Number(position.currentPeriod),
        state: Number(position.state),
        isAirdrop: Boolean(position.isAirdrop),
        startAt: Number(position.startAt),
        originStartAt: Number(position.originStartAt ?? 0n),
        endAt: Number(position.endAt),
        pendingReward,
        profit,
        cyclePassedDays,
        cycleTotalDays,
      };
    }),
  );

  return {
    timeUnitSeconds,
    airdropInfo,
    repurchaseBalance,
    fragmentBalance,
    airdropRemaining,
    checkinProfitBalance,
    lastCheckinAt,
    checkinRewardAmount,
    airdropEligibility: {
      requireSBT: requiresNft,
      sbtContract: effectiveSbtContract || sbtContract,
      nftClaimed: Boolean(nftFragmentClaimed),
      sbtBalance,
      hasRequiredNft: !requiresNft || sbtBalance > 0n,
    },
    positions: rows.sort((a, b) => Number(b.positionId) - Number(a.positionId)),
  };
}

export async function readCheckInRecords(user) {
  if (!user) return [];
  const coreAddress = assertContractAddress("neteCore");
  const publicClient = getPublicClient(wagmiConfig, { chainId: NETE_CHAIN_ID });
  const logs = await publicClient.getLogs({
    address: coreAddress,
    event: CHECKED_IN_EVENT,
    args: { user },
    fromBlock: 0n,
    toBlock: "latest",
  });

  return logs
    .map((log) => ({
      id: `${log.transactionHash}-${log.logIndex}`,
      amount: log.args.amount ?? 0n,
      checkinAt: Number(log.args.checkinAt ?? 0n),
      transactionHash: log.transactionHash,
    }))
    .sort((a, b) => b.checkinAt - a.checkinAt);
}

export async function readNetworkUserData(user) {
  const networkAddress = assertContractAddress("neteNetwork");
  const [userLevel, referralAccount, referralClaimed, dividendClaimed, v9Claimed, nonce] = await Promise.all([
    read({ address: networkAddress, abi: neteNetworkAbi, functionName: "userLevel", args: [user] }),
    read({ address: networkAddress, abi: neteNetworkAbi, functionName: "referralAccounts", args: [user] }),
    read({ address: networkAddress, abi: neteNetworkAbi, functionName: "referralClaimed", args: [user] }),
    read({ address: networkAddress, abi: neteNetworkAbi, functionName: "dividendClaimed", args: [user] }),
    read({ address: networkAddress, abi: neteNetworkAbi, functionName: "v9Claimed", args: [user] }),
    read({ address: networkAddress, abi: neteNetworkAbi, functionName: "userNonce", args: [user] }),
  ]);

  return {
    userLevel: Number(userLevel),
    referralAccount,
    referralClaimed,
    dividendClaimed,
    v9Claimed,
    nonce,
  };
}

export async function readMarketConfig() {
  const marketAddress = assertContractAddress("neteMarket");
  const [guideMinPrice, guideMaxPrice, designatedWindow, recycleWindow] = await Promise.all([
    read({ address: marketAddress, abi: neteMarketAbi, functionName: "guideMinPrice" }),
    read({ address: marketAddress, abi: neteMarketAbi, functionName: "guideMaxPrice" }),
    read({ address: marketAddress, abi: neteMarketAbi, functionName: "DESIGNATED_WINDOW" }),
    read({ address: marketAddress, abi: neteMarketAbi, functionName: "RECYCLE_WINDOW" }),
  ]);

  return {
    guideMinPrice,
    guideMaxPrice,
    designatedWindow: Number(designatedWindow),
    recycleWindow: Number(recycleWindow),
    guideMinPriceText: formatUnits(guideMinPrice, 18),
    guideMaxPriceText: formatUnits(guideMaxPrice, 18),
  };
}

export async function readOrderOnChain(orderId) {
  const marketAddress = assertContractAddress("neteMarket");
  const [order, isPublic] = await Promise.all([
    read({ address: marketAddress, abi: neteMarketAbi, functionName: "getOrder", args: [toBigInt(orderId)] }),
    read({ address: marketAddress, abi: neteMarketAbi, functionName: "isOrderPublic", args: [toBigInt(orderId)] }),
  ]);

  return {
    ...toOrderView(order),
    is_public: Boolean(isPublic),
  };
}

export async function approveNeteToCore(account, amount) {
  return send({
    account,
    address: assertContractAddress("neteToken"),
    abi: neteTokenAbi,
    functionName: "approve",
    args: [assertContractAddress("neteCore"), toBigInt(amount)],
  });
}

export async function readNeteCoreAllowance(user) {
  return read({
    address: assertContractAddress("neteToken"),
    abi: neteTokenAbi,
    functionName: "allowance",
    args: [user, assertContractAddress("neteCore")],
  });
}

export async function activateMiner(account, tierIndex) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "activateMiner",
    args: [tierIndex],
  });
}

export async function claimAllRewards(account) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "claimAllRewards",
  });
}

export async function repurchaseExpiredMiners(account) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "repurchaseExpiredMiners",
  });
}

export async function repurchaseExpiredMinersWithMode(account, payMode) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "repurchaseExpiredMinersWithMode",
    args: [Number(payMode)],
  });
}

export async function repurchaseMiner(account, positionId) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "repurchase",
    args: [toBigInt(positionId)],
  });
}

export async function repurchaseMinerWithMode(account, positionId, payMode) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "repurchaseWithMode",
    args: [toBigInt(positionId), Number(payMode)],
  });
}

export async function withdrawAllProfit(account) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "withdrawAllProfit",
  });
}

export async function claimAndActivateAirdropMiner(account) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "claimAndActivateAirdropMiner",
  });
}

export async function checkInWithBABT(account) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "checkInWithBABT",
  });
}

export async function withdrawCheckInProfit(account, amount) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "withdrawCheckInProfit",
    args: [toBigInt(amount)],
  });
}

export async function claimReward(account, positionId) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "claimReward",
    args: [toBigInt(positionId)],
  });
}

export async function claimAirdropReward(account, positionId) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "claimAirdropReward",
    args: [toBigInt(positionId)],
  });
}

export async function withdrawProfit(account, positionId, amount) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "withdrawProfit",
    args: [toBigInt(positionId), toBigInt(amount)],
  });
}

export async function approveUsdtToCore(account, amount) {
  return send({
    account,
    address: assertContractAddress("usdt"),
    abi: mockUsdtAbi,
    functionName: "approve",
    args: [assertContractAddress("neteCore"), toBigInt(amount)],
  });
}

export async function readUsdtCoreAllowance(user) {
  return read({
    address: assertContractAddress("usdt"),
    abi: mockUsdtAbi,
    functionName: "allowance",
    args: [user, assertContractAddress("neteCore")],
  });
}

export async function buySeed(account, usdtAmount) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "buySeed",
    args: [toBigInt(usdtAmount)],
    gas: BUY_SEED_GAS_LIMIT,
  });
}

export async function approveNeteToMarket(account, amount) {
  return send({
    account,
    address: assertContractAddress("neteToken"),
    abi: neteTokenAbi,
    functionName: "approve",
    args: [assertContractAddress("neteMarket"), toBigInt(amount)],
  });
}

export async function readNeteMarketAllowance(user) {
  return read({
    address: assertContractAddress("neteToken"),
    abi: neteTokenAbi,
    functionName: "allowance",
    args: [user, assertContractAddress("neteMarket")],
  });
}

export async function createSellOrder(account, neteAmount, pricePerNete) {
  const marketAddress = assertContractAddress("neteMarket");
  const result = await send({
    account,
    address: marketAddress,
    abi: neteMarketAbi,
    functionName: "createSellOrder",
    args: [toBigInt(neteAmount), toBigInt(pricePerNete)],
  });
  const createdOrder = decodeOrderCreated(result.receipt, marketAddress);

  return {
    ...result,
    orderId: createdOrder?.orderId?.toString?.() || "",
    shortOrderNo: formatOrderNo(createdOrder?.orderNo),
    orderNo: createdOrder?.orderNo || "",
    seller: createdOrder?.seller || account,
    neteAmount: createdOrder?.neteAmount?.toString?.() || toBigInt(neteAmount).toString(),
    pricePerNete: createdOrder?.pricePerNete?.toString?.() || toBigInt(pricePerNete).toString(),
    totalUsdt: createdOrder?.totalUsdt?.toString?.() || ((toBigInt(neteAmount) * toBigInt(pricePerNete)) / ONE_18).toString(),
  };
}

export async function approveUsdtToMarket(account, amount) {
  return send({
    account,
    address: assertContractAddress("usdt"),
    abi: mockUsdtAbi,
    functionName: "approve",
    args: [assertContractAddress("neteMarket"), toBigInt(amount)],
  });
}

export async function readUsdtMarketAllowance(user) {
  return read({
    address: assertContractAddress("usdt"),
    abi: mockUsdtAbi,
    functionName: "allowance",
    args: [user, assertContractAddress("neteMarket")],
  });
}

export async function fillOrder(account, orderId) {
  return send({
    account,
    address: assertContractAddress("neteMarket"),
    abi: neteMarketAbi,
    functionName: "fillOrder",
    args: [toBigInt(orderId)],
  });
}

export async function cancelSellOrder(account, orderId) {
  return send({
    account,
    address: assertContractAddress("neteMarket"),
    abi: neteMarketAbi,
    functionName: "cancelOrder",
    args: [toBigInt(orderId)],
  });
}

export async function bindReferrer(account, referrer) {
  return send({
    account,
    address: assertContractAddress("neteNetwork"),
    abi: neteNetworkAbi,
    functionName: "bindReferrer",
    args: [referrer],
  });
}

export async function claimWithSignature(account, claimMessage) {
  const payload = {
    user: claimMessage.user,
    amount: toBigInt(claimMessage.amount),
    epoch: toBigInt(claimMessage.epoch),
    nonce: toBigInt(claimMessage.nonce),
    deadline: toBigInt(claimMessage.deadline),
    claimId: claimMessage.claim_id,
    rewardType: Number(claimMessage.reward_type),
  };

  return send({
    account,
    address: assertContractAddress("neteNetwork"),
    abi: neteNetworkAbi,
    functionName: "claimWithSignature",
    args: [payload, claimMessage.signature],
  });
}
