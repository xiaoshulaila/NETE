import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { shareAccelerationRules, teamMembers } from "../../data/mockData";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getReferralInfo } from "../../services/neteApi";
import { bindReferrer, readNetworkUserData } from "../../services/neteContracts";
import { formatTokenAmount, isValidAddress, shortAddress } from "../../utils/formatters";

export default function MyTeamPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();
  const shareLayers = t("modules.team.shareLayers", { returnObjects: true });

  const [referrerInput, setReferrerInput] = useState("");
  const [binding, setBinding] = useState(false);
  const [notice, setNotice] = useState("");

  const referralInfoQuery = useQuery({
    queryKey: ["nete", "referral-info", wallet.currentAddress],
    queryFn: () => getReferralInfo(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const networkDataQuery = useQuery({
    queryKey: ["nete", "network-data", wallet.currentAddress],
    queryFn: () => readNetworkUserData(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const referralInfo = referralInfoQuery.data || {};

  const directCount = Number(referralInfo.direct_count ?? 0);
  const totalPerformance = formatTokenAmount(referralInfo.subtree_perf ?? 0n, 18, 2);
  const ownPerformance = formatTokenAmount(referralInfo.own_perf ?? 0n, 18, 2);
  const smallLegPerformance = formatTokenAmount(referralInfo.small_leg_perf ?? 0n, 18, 2);
  const maxDepth = Number(referralInfo.max_depth ?? 0);

  const currentLayers = useMemo(() => {
    if (!directCount) return t("modules.team.layers", { count: 0 });
    return directCount >= 8 ? t("modules.team.layersRange") : t("modules.team.layers", { count: Math.min(directCount, maxDepth || directCount) });
  }, [directCount, maxDepth, t]);

  const bindDisabled = !wallet.isConnected || binding || Boolean(referralInfo.referrer);

  const handleBindReferrer = async () => {
    const referrer = referrerInput.trim();

    if (!wallet.isConnected) {
      setNotice(t("modules.team.messages.connectWallet"));
      return;
    }
    if (!isValidAddress(referrer)) {
      setNotice(t("modules.team.messages.invalidAddress"));
      return;
    }
    if (referrer.toLowerCase() === String(wallet.currentAddress || "").toLowerCase()) {
      setNotice(t("modules.team.messages.selfAddress"));
      return;
    }

    try {
      setBinding(true);
      setNotice("");
      await wallet.ensureCorrectChain();
      const tx = await bindReferrer(wallet.currentAddress, referrer);
      setNotice(t("modules.team.messages.success", { hash: tx.hash }));
      setReferrerInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nete", "referral-info", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "network-data", wallet.currentAddress] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.team.messages.failed");
      setNotice(message);
    } finally {
      setBinding(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-[28px] bg-transparent">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <h1 className="font-display text-2xl font-black tracking-tight text-white md:text-3xl">{t("modules.team.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80">{t("modules.team.desc")}</p>
          </div>
        </div>
      </header>

      {!wallet.isConnected ? <p className="text-xs text-white/70">{t("modules.team.connectHint")}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-white/10 bg-transparent p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.directs")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">{directCount}</div>
        </article>
        <article className="rounded-xl border border-white/10 bg-transparent p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.performance")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">{totalPerformance}</div>
        </article>
        <article className="rounded-xl border border-white/10 bg-transparent p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.layers")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">{currentLayers}</div>
        </article>
        <article className="rounded-xl border border-white/10 bg-transparent p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.level")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">V{networkDataQuery.data?.userLevel ?? 0}</div>
        </article>
      </div>

      <article className="rounded-2xl border border-white/10 bg-transparent p-5">
        <h2 className="font-display text-base font-bold tracking-wide text-white md:text-xl">{t("modules.team.referralTitle")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-transparent p-4 text-sm text-white/85">
            <p>{t("modules.team.currentReferrer", { value: referralInfo.referrer ? shortAddress(referralInfo.referrer) : t("modules.team.unbound") })}</p>
            <p className="mt-2">{t("modules.team.ownPerformance", { value: ownPerformance })}</p>
            <p className="mt-2">{t("modules.team.smallLegPerformance", { value: smallLegPerformance })}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-transparent p-4">
            <p className="text-sm text-white/75">{t("modules.team.bindOnce")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="h-11 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/40"
                placeholder={t("modules.team.inputPlaceholder")}
                value={referrerInput}
                onChange={(event) => setReferrerInput(event.target.value)}
                disabled={Boolean(referralInfo.referrer)}
              />
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#caff00] px-5 text-sm font-semibold tracking-wide text-black transition enabled:hover:shadow-[0_0_30px_rgba(202,255,0,0.45)] disabled:cursor-not-allowed disabled:opacity-45"
                type="button"
                onClick={handleBindReferrer}
                disabled={bindDisabled}
              >
                {binding ? t("modules.team.submitting") : referralInfo.referrer ? t("modules.team.bound") : t("modules.team.bind")}
              </button>
            </div>
            {notice ? <p className="mt-2 break-all text-xs text-white/70">{notice}</p> : null}
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-white/10 bg-transparent p-5">
        <h2 className="font-display text-base font-bold tracking-wide text-white md:text-xl">{t("modules.team.accelerationTitle")}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full border-collapse text-left text-xs md:text-sm [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:text-white/65 [&_td]:border-t [&_td]:border-white/10 [&_td]:px-4 [&_td]:py-3 [&_td]:text-white/85">
            <thead>
              <tr>
                <th>{t("modules.team.directCount")}</th>
                <th>{t("modules.team.layerCount")}</th>
                <th>{t("modules.team.income")}</th>
                <th>{t("modules.team.note")}</th>
              </tr>
            </thead>
            <tbody>
              {shareAccelerationRules.map((row, index) => (
                <tr key={row.directs}>
                  <td>{row.directs}</td>
                  <td>{shareLayers[index] || row.layers}</td>
                  <td>{row.income}</td>
                  <td>{index === 0 ? t("modules.team.accelerationNote") : t("modules.team.emptyDash")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-2xl border border-white/10 bg-transparent p-5">
        <h2 className="font-display text-base font-bold tracking-wide text-white md:text-xl">{t("modules.team.memberTitle")}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full border-collapse text-left text-xs md:text-sm [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:text-white/65 [&_td]:border-t [&_td]:border-white/10 [&_td]:px-4 [&_td]:py-3 [&_td]:text-white/85">
            <thead>
              <tr>
                <th>{t("modules.team.address")}</th>
                <th>{t("modules.team.performance")}</th>
                <th>{t("modules.team.level")}</th>
                <th>{t("modules.team.joinedAt")}</th>
                <th>{t("modules.team.directCount")}</th>
                <th>{t("modules.team.action")}</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.address}>
                  <td>{member.address}</td>
                  <td>{member.performance}</td>
                  <td>{member.level}</td>
                  <td>{member.joinedAt}</td>
                  <td>{member.directs}</td>
                  <td>
                    <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-transparent px-5 text-sm font-semibold tracking-wide text-white transition hover:border-white/40 hover:bg-white/5" type="button">
                      {t("modules.team.viewChildren")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
