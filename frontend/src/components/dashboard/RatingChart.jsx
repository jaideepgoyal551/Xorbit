import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import PLATFORM_CONFIG, { PlatformIcon, getCodeforcesMaxRank } from '../../utils/platformConfig';

const RatingChart = ({
  ratingHistory,
  allRatingHistory,
  selectedRatingPlatform,
  setSelectedRatingPlatform,
  platformStats,
  platformRatingColors,
  compact = false
}) => {
  const compactRatingColors = {
    leetcode: '#e7edf5',
    codeforces: '#bcc8d8',
    codechef: '#8795a8'
  };
  const currentRating = selectedRatingPlatform === 'all'
    ? (platformStats.leetcode?.rating || platformStats.codeforces?.rating || platformStats.codechef?.rating || 0)
    : (platformStats[selectedRatingPlatform]?.rating || 0);
  const maxRatingPlatform = selectedRatingPlatform === 'all' ? 'codeforces' : selectedRatingPlatform;
  const selectedStats = platformStats[maxRatingPlatform] || {};
  const maxRating = Number(selectedStats.maxRating || selectedStats.rating || 0);
  const codeforcesRank = getCodeforcesMaxRank(platformStats.codeforces);
  const maxRatingTitle = maxRatingPlatform === 'codeforces' ? codeforcesRank : null;

  return (
    <div className={`dashboard-card p-4 sm:p-5${compact ? ' dashboard-rating-chart-compact' : ''}`}>
      {/* Header with current rating */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{compact ? 'Rating history' : 'Rating'}</p>
          <p className={compact ? 'text-xl font-bold text-gray-900 dark:text-white' : 'text-xl sm:text-3xl font-bold text-gray-900 dark:text-white'}>
            {Number(currentRating).toLocaleString()}
          </p>
          {compact && maxRating > 0 && (
            <div className="dashboard-rating-peak">
              <span>Max {maxRating.toLocaleString()}</span>
              {maxRatingTitle && <strong>{maxRatingTitle}</strong>}
            </div>
          )}
        </div>
        {!compact && <div className="text-right text-sm text-gray-400">
          <p>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          <p className="text-xs">Latest Update</p>
        </div>}
      </div>

      {/* Platform Toggle Tabs */}
      <div className={`dashboard-rating-tabs flex items-center gap-2 mb-4 overflow-x-auto pb-2${compact ? ' is-compact' : ''}`}>
        <button
          onClick={() => setSelectedRatingPlatform('all')}
          title="All platforms"
          style={compact && selectedRatingPlatform === 'all' ? { backgroundColor: '#cbd5e1', color: '#111827' } : undefined}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            selectedRatingPlatform === 'all' 
              ? 'bg-[#22c55e] text-[#06100a]' 
              : 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252536] border border-gray-300 dark:border-gray-700 transition-colors'
          }`}
        >
          {compact ? 'All' : 'All Platforms'}
        </button>
        {['leetcode', 'codeforces', 'codechef'].map(platform => {
          const hasData = allRatingHistory.byPlatform?.[platform]?.length > 0;
          const platformName = PLATFORM_CONFIG[platform]?.name || platform;
          return (
            <button
              key={platform}
              onClick={() => setSelectedRatingPlatform(platform)}
              title={platformName}
              disabled={!hasData}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedRatingPlatform === platform 
                  ? 'bg-[#22c55e] text-[#06100a]' 
                  : hasData 
                    ? 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252536] border border-gray-300 dark:border-gray-700 transition-colors'
                    : 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50 transition-colors'
              }`}
              style={selectedRatingPlatform === platform ? {
                backgroundColor: compact ? '#cbd5e1' : platformRatingColors[platform],
                color: compact ? '#111827' : undefined
              } : {}}
            >
              <PlatformIcon platform={platform} className="w-4 h-4" /> {compact ? platformName.slice(0, 2).toUpperCase() : platformName}
            </button>
          );
        })}
      </div>

      {/* Legend for All Platforms view */}
      {!compact && selectedRatingPlatform === 'all' && allRatingHistory.platforms?.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-3">
          {allRatingHistory.platforms.map(platform => (
            <div key={platform} className="flex items-center gap-2">
              <PlatformIcon platform={platform} className="w-3.5 h-3.5" color={compact ? compactRatingColors[platform] : platformRatingColors[platform]} />
              <span className="text-xs text-gray-400">{PLATFORM_CONFIG[platform]?.name || platform}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className={compact ? 'h-[88px]' : 'h-52'}>
        {(allRatingHistory.chartData?.length || ratingHistory.length) ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart
            data={allRatingHistory.chartData?.length ? allRatingHistory.chartData : ratingHistory}
            margin={compact ? { top: 4, right: 4, left: -28, bottom: -16 } : undefined}
          >
            <defs>
              <linearGradient id="gradientLeetcode" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={compact ? compactRatingColors.leetcode : '#FFA116'} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={compact ? compactRatingColors.leetcode : '#FFA116'} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradientCodeforces" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={compact ? compactRatingColors.codeforces : '#1F8ACB'} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={compact ? compactRatingColors.codeforces : '#1F8ACB'} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradientCodechef" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={compact ? compactRatingColors.codechef : '#5B4638'} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={compact ? compactRatingColors.codechef : '#5B4638'} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradientDefault" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={compact ? '#e7edf5' : '#f59e0b'} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={compact ? '#e7edf5' : '#f59e0b'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            {!compact && <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-[#2a2a3e]" vertical={false} />}
            {!compact && <XAxis
              dataKey="date" 
              stroke="#666" 
              tick={{ fontSize: 10 }} 
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
              }}
            />}
            <YAxis hide={compact} width={compact ? 0 : 60} stroke="#666" tick={{ fontSize: 10 }} domain={['dataMin - 100', 'dataMax + 100']} />
            <Tooltip
              contentStyle={{ 
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1a1a2e' : '#ffffff', 
                border: document.documentElement.classList.contains('dark') ? '1px solid #333' : '1px solid #e5e7eb', 
                borderRadius: '8px',
                boxShadow: document.documentElement.classList.contains('dark') ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
              }}
              labelStyle={{ color: document.documentElement.classList.contains('dark') ? '#fff' : '#111827', fontWeight: 'bold', marginBottom: 4 }}
              formatter={(value, name) => {
                if (value === null) return ['-', PLATFORM_CONFIG[name]?.name || name];
                return [value, PLATFORM_CONFIG[name]?.name || name];
              }}
              labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { 
                day: 'numeric', month: 'short', year: 'numeric' 
              })}
            />
            
            {/* Render areas for each platform */}
            {selectedRatingPlatform === 'all' ? (
              (allRatingHistory.platforms || []).map(platform => (
                <Area 
                  key={platform}
                  type="natural" 
                  dataKey={platform}
                  name={platform}
                  stroke={compact ? compactRatingColors[platform] : platformRatingColors[platform]}
                  strokeWidth={2} 
                  fill={`url(#gradient${platform.charAt(0).toUpperCase() + platform.slice(1)})`}
                  style={compact ? { filter: `drop-shadow(0 0 4px ${compactRatingColors[platform]}99)` } : undefined}
                  dot={false}
                  activeDot={{ r: 4, fill: compact ? compactRatingColors[platform] : platformRatingColors[platform] }}
                  connectNulls
                />
              ))
            ) : allRatingHistory.byPlatform?.[selectedRatingPlatform]?.length > 0 ? (
              <Area 
                type="natural" 
                dataKey={selectedRatingPlatform}
                name={selectedRatingPlatform}
                stroke={compact ? compactRatingColors[selectedRatingPlatform] : platformRatingColors[selectedRatingPlatform]}
                strokeWidth={2.5} 
                fill={`url(#gradient${selectedRatingPlatform.charAt(0).toUpperCase() + selectedRatingPlatform.slice(1)})`}
                style={compact ? { filter: `drop-shadow(0 0 5px ${compactRatingColors[selectedRatingPlatform]}aa)` } : undefined}
                dot={false}
                activeDot={{ r: 5, fill: compact ? compactRatingColors[selectedRatingPlatform] : platformRatingColors[selectedRatingPlatform] }}
                connectNulls
              />
            ) : (
              <Area 
                type="natural" 
                dataKey="rating" 
                stroke={compact ? '#e7edf5' : '#f59e0b'}
                strokeWidth={2} 
                fill="url(#gradientDefault)"
                style={compact ? { filter: 'drop-shadow(0 0 4px #e7edf599)' } : undefined}
                dot={false}
                activeDot={{ r: 4, fill: compact ? '#e7edf5' : '#f59e0b' }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No rating data yet. Compete on linked platforms to see your history.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Current Ratings Summary */}
      {!compact && <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        {selectedRatingPlatform === 'all' ? (
          <>
            {platformStats.leetcode?.rating > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: platformRatingColors.leetcode }}>{platformStats.leetcode.rating}</div>
                <div className="text-xs text-gray-500"><PlatformIcon platform="leetcode" className="w-4 h-4 inline-block mr-2" />LeetCode</div>
              </div>
            )}
            {platformStats.codeforces?.rating > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: platformRatingColors.codeforces }}>{platformStats.codeforces.rating}</div>
                <div className="text-xs text-gray-500"><PlatformIcon platform="codeforces" className="w-4 h-4 inline-block mr-2" />Codeforces</div>
              </div>
            )}
            {platformStats.codechef?.rating > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: platformRatingColors.codechef }}>{platformStats.codechef.rating}</div>
                <div className="text-xs text-gray-500"><PlatformIcon platform="codechef" className="w-4 h-4 inline-block mr-2" />CodeChef</div>
              </div>
            )}
          </>
        ) : (
          (() => {
            const p = selectedRatingPlatform;
            const stats = platformStats[p];
            if (!stats || !stats.rating) return null;
            const label = PLATFORM_CONFIG[p]?.name || p;
            const color = platformRatingColors[p] || '#f59e0b';
            return (
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color }}>{stats.rating}</div>
                <div className="text-xs text-gray-500"><PlatformIcon platform={p} className="w-4 h-4 inline-block mr-2" />{label}</div>
              </div>
            );
          })()
        )}
      </div>}
    </div>
  );
};

export default RatingChart;