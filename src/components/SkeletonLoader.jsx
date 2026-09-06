import React from 'react';

export function ShimmerBlock({ width = '100%', height = '20px', style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: 'var(--card-bg)',
        border: '2px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        className="brutalist-shimmer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)',
          animation: 'shimmerSweep 1.5s infinite',
        }}
      />
    </div>
  );
}

export function AppSkeleton() {
  return (
    <div
      style={{
        maxWidth: 1024,
        margin: '0 auto',
        padding: '24px 16px 60px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Header Skeleton */}
      <div style={{ borderBottom: '4px solid var(--border)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <ShimmerBlock width="160px" height="14px" style={{ marginBottom: '8px' }} />
          <ShimmerBlock width="220px" height="38px" />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ShimmerBlock width="40px" height="40px" />
          <ShimmerBlock width="40px" height="40px" />
          <ShimmerBlock width="100px" height="40px" />
        </div>
      </div>

      {/* Bento Stats Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <ShimmerBlock height="80px" />
        <ShimmerBlock height="80px" />
        <ShimmerBlock height="80px" />
      </div>

      {/* Date Bar Skeleton */}
      <ShimmerBlock height="54px" style={{ marginBottom: '24px' }} />

      {/* 4 Category Rows Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((i) => (
          <ShimmerBlock key={i} height="120px" />
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div style={{ border: '3px solid var(--border)', padding: '16px', background: 'var(--card-bg)', marginBottom: '24px' }}>
      <ShimmerBlock width="200px" height="16px" style={{ marginBottom: '12px' }} />
      <ShimmerBlock height="150px" />
    </div>
  );
}

export function StatisticsSkeleton() {
  return (
    <div style={{ border: '3px solid var(--border)', padding: '16px', background: 'var(--card-bg)', marginBottom: '24px' }}>
      <ShimmerBlock width="220px" height="20px" style={{ marginBottom: '16px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <ShimmerBlock height="220px" />
        <ShimmerBlock height="220px" />
      </div>
    </div>
  );
}
