import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, PieChart, BarChart3, RefreshCw, Sparkles, Layers, DollarSign } from 'lucide-react';
import { getFinancialInsights } from '../api/analytics.api';
import { formatCurrency } from '../utils/formatCurrency';
import Spinner from '../components/common/Spinner';

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const res = await getFinancialInsights();
      setData(res);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-scroll-area" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spinner size={36} color="var(--accent-blue-light)" />
      </div>
    );
  }

  const summary = data?.summary || { totalIn: 0, totalOut: 0, netSavings: 0, savingsRate: 0, averageTransfer: 0, largestTransfer: 0 };
  const monthlyTrends = data?.monthlyTrends || [];
  const categories = data?.categoryBreakdown || [];

  // Find max monthly volume for scaling SVG bars
  const maxMonthlyVal = Math.max(1, ...monthlyTrends.map(m => Math.max(m.moneyIn, m.moneyOut)));

  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8'
            }}>
              <BarChart3 size={18} />
            </div>
            <h1 className="page-title">Financial Insights</h1>
          </div>
          <p className="page-subtitle">
            Algorithmic personal cash flow analysis and transfer distribution derived from your real double-entry ledger history.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadInsights} title="Refresh Insights">
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="stat-card" style={{ padding: '18px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontWeight: 700 }}>Total Inflow (6M)</span>
            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-green-bg)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-green-light)', fontFamily: 'var(--font-mono)' }}>
            +{formatCurrency(summary.totalIn)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Deposits & incoming transfers</div>
        </div>

        <div className="stat-card" style={{ padding: '18px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontWeight: 700 }}>Total Outflow (6M)</span>
            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
            -{formatCurrency(summary.totalOut)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Outbound peer transfers</div>
        </div>

        <div className="stat-card" style={{ padding: '18px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontWeight: 700 }}>Net Capital Retained</span>
            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-pill)', background: 'rgba(99,102,241,0.15)', color: '#818CF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: summary.netSavings >= 0 ? 'var(--text-primary)' : 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(summary.netSavings)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Savings Rate: <strong style={{ color: 'var(--accent-green-light)' }}>{summary.savingsRate}%</strong>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '18px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontWeight: 700 }}>Velocity Metrics</span>
            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-pill)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(summary.averageTransfer)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Avg. Transfer · Max: {formatCurrency(summary.largestTransfer)}
          </div>
        </div>
      </div>

      {/* Main Visuals Row: Monthly Chart + Spending Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '10px' }}>
        {/* Monthly Cash Flow Trends Bar Chart */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Monthly Inflow vs Outflow</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last 6 months cash flow volume comparison</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-green-light)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-green)' }} /> In
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-amber)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-amber)' }} /> Out
              </span>
            </div>
          </div>

          {monthlyTrends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No monthly activity recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', height: '200px', paddingTop: '20px' }}>
              {monthlyTrends.map((m, idx) => {
                const inHeight = Math.max(4, Math.round((m.moneyIn / maxMonthlyVal) * 150));
                const outHeight = Math.max(4, Math.round((m.moneyOut / maxMonthlyVal) * 150));

                return (
                  <div key={m.month || idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '150px' }}>
                      {/* Green Bar (In) */}
                      <div
                        style={{
                          width: '12px',
                          height: `${inHeight}px`,
                          background: 'linear-gradient(180deg, #34D399, #059669)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.4s ease',
                        }}
                        title={`In: ${formatCurrency(m.moneyIn)}`}
                      />
                      {/* Amber Bar (Out) */}
                      <div
                        style={{
                          width: '12px',
                          height: `${outHeight}px`,
                          background: 'linear-gradient(180deg, #FBBF24, #D97706)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.4s ease',
                        }}
                        title={`Out: ${formatCurrency(m.moneyOut)}`}
                      />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '50px' }}>
                      {m.month.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Breakdown Progress */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Transfer Categorization</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Distribution of funds sent across categories</p>
            </div>
            <PieChart size={18} color="var(--accent-blue-light)" />
          </div>

          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              Execute transfers with notes (e.g. Rent, Groceries, Loans) to generate category insights.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {categories.map((c, i) => (
                <div key={c.category || i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.category}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {formatCurrency(c.amount)} ({c.percentage}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${c.percentage}%`,
                        background: i === 0 ? '#6366F1' : i === 1 ? '#10B981' : i === 2 ? '#F59E0B' : '#EC4899',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
