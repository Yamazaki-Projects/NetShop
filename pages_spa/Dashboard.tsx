import React from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus } from '../types';
import { Card, StatusBadge } from '../components/UI';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon, gradient }: { title: string; value: number; icon: string; gradient: string }) => (
  <Card style={{ 
    padding: '32px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '28px',
    border: 'none',
    background: 'var(--bg-card)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{ 
      width: '72px', 
      height: '72px', 
      background: gradient, 
      color: 'white', 
      borderRadius: '20px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontSize: '1.75rem',
      zIndex: 2
    }}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <div style={{ zIndex: 2 }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '6px', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>{value}</div>
    </div>
  </Card>
);

const Dashboard = () => {
  const { user } = useAppContext();
  const cases = db.getCases(user!);
  const recentCases = [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '48px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '10px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Welcome, {user?.name.split(' ')[0]} <span style={{ color: 'var(--primary)' }}>.</span>
        </h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, fontSize: '1.1rem' }}>
          最新の状況を確認して、スムーズな業務を。
        </p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '28px', 
        marginBottom: '48px' 
      }}>
        <StatCard title="総案件" value={cases.length} icon="fa-layer-group" gradient="var(--grad-primary)" />
        <StatCard title="審査待ち" value={cases.filter(c => c.status === CaseStatus.SUBMITTED).length} icon="fa-hourglass-start" gradient="linear-gradient(135deg, #f59e0b, #fbbf24)" />
        <StatCard title="要修正" value={cases.filter(c => c.status === CaseStatus.NEEDS_FIX).length} icon="fa-triangle-exclamation" gradient="linear-gradient(135deg, #ef4444, #f87171)" />
        <StatCard title="承認済み" value={cases.filter(c => c.status === CaseStatus.APPROVED).length} icon="fa-check-double" gradient="linear-gradient(135deg, #10b981, #34d399)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px', alignItems: 'start' }}>
        <Card title="最近のアクティビティ">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="align-left">案件情報</th>
                  <th className="align-center">ステータス</th>
                  <th className="align-right">更新日時</th>
                </tr>
              </thead>
              <tbody>
                {recentCases.map(c => (
                  <tr key={c.id}>
                    <td className="align-left">
                      <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{c.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 700 }}>{c.platform}</div>
                    </td>
                    <td className="align-center"><StatusBadge status={c.status} /></td>
                    <td className="align-right">
                      <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.85rem' }}>
                        {new Date(c.updatedAt).toLocaleDateString('ja-JP')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="アナウンスメント">
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ color: '#f59e0b' }}><i className="fa-solid fa-circle-exclamation"></i></div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>審査書類の形式が一部変更されました</div>
            </div>
            <div style={{ borderBottom: '1px solid var(--border)' }}></div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ color: '#10b981' }}><i className="fa-solid fa-rocket"></i></div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>新機能：一括承認機能が追加されました</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;