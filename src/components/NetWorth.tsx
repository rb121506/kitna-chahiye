import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { NET_WORTH_ASSET_LABELS, NET_WORTH_LIABILITY_LABELS } from '../lib/constants';
import { compact, rupees } from '../lib/format';
import { netWorthOf, type NetWorthSnapshot } from '../lib/tools';
import { loadNetWorthHistory, saveNetWorthHistory } from '../lib/toolsStorage';
import { AnimatedNumber, Slider } from './ui';

function blank(): number[] {
  return NET_WORTH_ASSET_LABELS.map(() => 0);
}

export function NetWorth() {
  const [history, setHistory] = useState<NetWorthSnapshot[]>(loadNetWorthHistory);
  const latest = history[0];
  const [assets, setAssets] = useState<number[]>(latest?.assets ?? blank());
  const [liabilities, setLiabilities] = useState<number[]>(latest?.liabilities ?? NET_WORTH_LIABILITY_LABELS.map(() => 0));
  const { assets: assetTotal, liabilities: liabilityTotal, net } = netWorthOf({ assets, liabilities });
  const maxBar = Math.max(assetTotal, liabilityTotal, 1);

  const persist = (next: NetWorthSnapshot[]) => {
    setHistory(next);
    saveNetWorthHistory(next);
  };

  const save = () => {
    const snap: NetWorthSnapshot = { id: Date.now().toString(36), savedAt: Date.now(), assets: [...assets], liabilities: [...liabilities] };
    persist([snap, ...history].slice(0, 24));
  };

  const prevNet = history[0] ? netWorthOf(history[0]).net : null;
  const delta = prevNet !== null ? net - prevNet : null;

  return (
    <div className="tool">
      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">What you're actually worth</h3>
            <p className="card-sub">Everything you own, minus everything you owe. Snapshots stay in this browser.</p>
          </div>
        </header>
        <div className="nw-hero">
          <span className="nw-label">Net worth</span>
          <AnimatedNumber className="nw-num" value={net} format={compact} />
          {delta !== null && Math.abs(delta) > 500 && (
            <span className={`nw-delta ${delta >= 0 ? 'is-pos' : 'is-neg'}`}>{delta >= 0 ? '▲' : '▼'} {compact(Math.abs(delta))} since last save</span>
          )}
        </div>
        <div className="nw-bars">
          <div className="nw-bar-row">
            <span>Assets</span>
            <span className="nw-bar"><motion.span className="is-good" initial={false} animate={{ width: `${(assetTotal / maxBar) * 100}%` }} transition={{ duration: 0.4 }} /></span>
            <b className="num">{compact(assetTotal)}</b>
          </div>
          <div className="nw-bar-row">
            <span>Liabilities</span>
            <span className="nw-bar"><motion.span className="is-bad" initial={false} animate={{ width: `${(liabilityTotal / maxBar) * 100}%` }} transition={{ duration: 0.4 }} /></span>
            <b className="num">{compact(liabilityTotal)}</b>
          </div>
        </div>

        <div className="nw-cols">
          <div>
            <p className="slip-sec">Assets</p>
            {NET_WORTH_ASSET_LABELS.map((label, i) => (
              <Slider key={label} id={`nw-a-${i}`} label={label} value={assets[i]} max={20000000} step={5000} unit="rupee" curve={2.4}
                onChange={(v) => setAssets((a) => a.map((x, j) => (j === i ? v : x)))} />
            ))}
          </div>
          <div>
            <p className="slip-sec">Liabilities</p>
            {NET_WORTH_LIABILITY_LABELS.map((label, i) => (
              <Slider key={label} id={`nw-l-${i}`} label={label} value={liabilities[i]} max={20000000} step={5000} unit="rupee" curve={2.4}
                onChange={(v) => setLiabilities((a) => a.map((x, j) => (j === i ? v : x)))} />
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={save}>Save today's snapshot</button>
      </article>

      <article className="card">
        <h3 className="card-title">History</h3>
        <p className="card-sub">Your saved snapshots, most recent first</p>
        {history.length === 0 ? (
          <p className="note">Nothing saved yet — add your numbers above and save your first snapshot.</p>
        ) : (
          <ul className="nw-history">
            <AnimatePresence initial={false}>
              {history.map((h) => {
                const n = netWorthOf(h).net;
                return (
                  <motion.li key={h.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span>{new Date(h.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <b className="num">{rupees(n)}</b>
                    <button type="button" className="icon-x" aria-label="Delete snapshot" onClick={() => persist(history.filter((x) => x.id !== h.id))}>×</button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </article>
    </div>
  );
}
