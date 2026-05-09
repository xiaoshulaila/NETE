import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { formatUnits } from "viem";
import mockUsdtAbi from "../abis/MockUSDT.json";
import neteCoreAbi from "../abis/NeteCore.json";
import neteMarketAbi from "../abis/NeteMarket.json";
import neteNetworkAbi from "../abis/NeteNetwork.json";
import neteTokenAbi from "../abis/NeteToken.json";
import { NETE_CHAIN_ID, assertContractAddress } from "../config/neteRuntime";
import { wagmiConfig } from "../web3/wagmiConfig";

const ONE_18 = 10n ** 18n;

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

async function send({ account, address, abi, functionName, args = [] }) {
  const hash = await writeContract(wagmiConfig, {
    chainId: NETE_CHAIN_ID,
    account: ensureAccount(account),
    address,
    abi,
    functionName,
    args,
  });

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
  const [seedPrice, seedRemaining, posRemaining, presaleActive] = await Promise.all([
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "SEED_PRICE" }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "seedRemaining" }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "posRemaining" }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "presaleActive" }),
  ]);

  return {
    seedPrice,
    seedRemaining,
    posRemaining,
    presaleActive,
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

    if (!raw || toBigInt(raw.principal) === 0n) continue;

    tiers.push({
      tierIndex: index,
      principal: raw.principal,
      maxSlots: Number(raw.maxSlots),
      cycleDays: Number(raw.cycleDays),
      returnBps: Number(raw.returnBps),
      extendDays: Number(raw.extendDays),
      maxDays: Number(raw.maxDays),
      feeBps: Number(raw.feeBps),
      principalText: formatUnits(raw.principal, 18),
      returnRateText: ratioToPercentText(raw.returnBps),
      feeText: ratioToPercentText(raw.feeBps),
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
  const [positionIds, airdropInfo] = await Promise.all([
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "getUserPositions", args: [user] }),
    read({ address: coreAddress, abi: neteCoreAbi, functionName: "airdropInfos", args: [user] }),
  ]);

  const rows = await Promise.all(
    positionIds.map(async (positionId) => {
      const [position, pendingReward, profit] = await Promise.all([
        read({ address: coreAddress, abi: neteCoreAbi, functionName: "getPosition", args: [positionId] }),
        read({ address: coreAddress, abi: neteCoreAbi, functionName: "getPendingReward", args: [positionId] }),
        read({ address: coreAddress, abi: neteCoreAbi, functionName: "positionProfit", args: [positionId] }),
      ]);

      const cycleTotalDays = Number(position.endAt > position.startAt ? (position.endAt - position.startAt) / 86400n : 0n);
      const cyclePassedDays = Number(position.lastSettleAt > position.startAt ? (position.lastSettleAt - position.startAt) / 86400n : 0n);

      return {
        positionId: positionId.toString(),
        tierIndex: Number(position.tierIndex),
        principal: position.principal,
        totalReturn: position.totalReturn,
        grossClaimed: position.grossClaimed,
        principalRecovered: position.principalRecovered,
        currentPeriod: Number(position.currentPeriod),
        state: Number(position.state),
        isAirdrop: Boolean(position.isAirdrop),
        startAt: Number(position.startAt),
        endAt: Number(position.endAt),
        pendingReward,
        profit,
        cyclePassedDays,
        cycleTotalDays,
      };
    }),
  );

  return {
    airdropInfo,
    positions: rows.sort((a, b) => Number(b.positionId) - Number(a.positionId)),
  };
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

export async function activateMiner(account, tierIndex) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "activateMiner",
    args: [tierIndex],
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

export async function buySeed(account, usdtAmount) {
  return send({
    account,
    address: assertContractAddress("neteCore"),
    abi: neteCoreAbi,
    functionName: "buySeed",
    args: [toBigInt(usdtAmount)],
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

export async function createSellOrder(account, neteAmount, pricePerNete) {
  return send({
    account,
    address: assertContractAddress("neteMarket"),
    abi: neteMarketAbi,
    functionName: "createSellOrder",
    args: [toBigInt(neteAmount), toBigInt(pricePerNete)],
  });
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
