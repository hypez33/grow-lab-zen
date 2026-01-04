import { Territory } from '@/store/territoryStore';
import { motion } from 'framer-motion';

interface TerritoryMapProps {
  territories: Territory[];
  onSelectTerritory: (territory: Territory) => void;
}

const getControlColor = (control: number) => {
  if (control >= 100) return { fill: 'rgba(245, 158, 11, 0.6)', stroke: '#fbbf24', glow: 'rgba(245, 158, 11, 0.3)' };
  if (control >= 75) return { fill: 'rgba(16, 185, 129, 0.5)', stroke: '#34d399', glow: 'rgba(16, 185, 129, 0.25)' };
  if (control >= 50) return { fill: 'rgba(139, 92, 246, 0.5)', stroke: '#a78bfa', glow: 'rgba(139, 92, 246, 0.25)' };
  if (control >= 25) return { fill: 'rgba(249, 115, 22, 0.4)', stroke: '#fb923c', glow: 'rgba(249, 115, 22, 0.2)' };
  return { fill: 'rgba(55, 65, 81, 0.3)', stroke: '#4b5563', glow: 'transparent' };
};

// City district layouts with building shapes
const TERRITORY_LAYOUTS: Record<string, {
  x: number;
  y: number;
  width: number;
  height: number;
  buildings: { x: number; y: number; w: number; h: number; type: 'tall' | 'medium' | 'small' | 'wide' }[];
  label: string;
}> = {
  university: {
    x: 20, y: 20, width: 120, height: 80,
    buildings: [
      { x: 15, y: 10, w: 30, h: 25, type: 'wide' },
      { x: 55, y: 8, w: 20, h: 35, type: 'tall' },
      { x: 85, y: 20, w: 25, h: 20, type: 'medium' },
      { x: 15, y: 45, w: 25, h: 18, type: 'small' },
      { x: 50, y: 50, w: 35, h: 15, type: 'wide' },
    ],
    label: 'University'
  },
  downtown: {
    x: 160, y: 15, width: 130, height: 90,
    buildings: [
      { x: 10, y: 5, w: 18, h: 50, type: 'tall' },
      { x: 35, y: 10, w: 22, h: 45, type: 'tall' },
      { x: 65, y: 8, w: 20, h: 55, type: 'tall' },
      { x: 95, y: 15, w: 25, h: 40, type: 'tall' },
      { x: 15, y: 60, w: 30, h: 20, type: 'medium' },
      { x: 55, y: 68, w: 40, h: 15, type: 'wide' },
    ],
    label: 'Downtown'
  },
  suburbs: {
    x: 15, y: 115, width: 110, height: 75,
    buildings: [
      { x: 10, y: 10, w: 18, h: 14, type: 'small' },
      { x: 35, y: 8, w: 16, h: 12, type: 'small' },
      { x: 60, y: 12, w: 20, h: 15, type: 'small' },
      { x: 85, y: 10, w: 18, h: 14, type: 'small' },
      { x: 15, y: 35, w: 22, h: 16, type: 'small' },
      { x: 45, y: 38, w: 18, h: 14, type: 'small' },
      { x: 75, y: 35, w: 20, h: 15, type: 'small' },
      { x: 25, y: 55, w: 25, h: 12, type: 'small' },
      { x: 60, y: 55, w: 22, h: 14, type: 'small' },
    ],
    label: 'Suburbs'
  },
  nightlife: {
    x: 310, y: 20, width: 100, height: 85,
    buildings: [
      { x: 10, y: 10, w: 25, h: 22, type: 'medium' },
      { x: 45, y: 8, w: 20, h: 28, type: 'medium' },
      { x: 70, y: 15, w: 22, h: 25, type: 'medium' },
      { x: 15, y: 40, w: 30, h: 18, type: 'wide' },
      { x: 55, y: 45, w: 35, h: 15, type: 'wide' },
      { x: 20, y: 62, w: 25, h: 16, type: 'medium' },
      { x: 55, y: 65, w: 30, h: 14, type: 'wide' },
    ],
    label: 'Nightlife'
  },
  industrial: {
    x: 140, y: 120, width: 130, height: 80,
    buildings: [
      { x: 10, y: 10, w: 40, h: 25, type: 'wide' },
      { x: 60, y: 8, w: 35, h: 30, type: 'wide' },
      { x: 100, y: 15, w: 22, h: 35, type: 'tall' },
      { x: 15, y: 45, w: 50, h: 20, type: 'wide' },
      { x: 75, y: 50, w: 40, h: 22, type: 'wide' },
    ],
    label: 'Industrial'
  },
  docks: {
    x: 290, y: 115, width: 120, height: 85,
    buildings: [
      { x: 10, y: 12, w: 35, h: 18, type: 'wide' },
      { x: 55, y: 10, w: 30, h: 22, type: 'wide' },
      { x: 95, y: 15, w: 18, h: 25, type: 'medium' },
      { x: 15, y: 40, w: 25, h: 20, type: 'medium' },
      { x: 50, y: 38, w: 40, h: 15, type: 'wide' },
      { x: 10, y: 65, w: 100, h: 12, type: 'wide' },
    ],
    label: 'Docks'
  },
};

// Street paths connecting districts
const STREETS = [
  'M 140 60 L 160 60',
  'M 140 80 L 140 115',
  'M 125 100 L 160 115',
  'M 290 60 L 310 60',
  'M 270 105 L 290 120',
  'M 290 160 L 310 160',
  'M 160 160 L 290 160',
];

export const TerritoryMap = ({ territories, onSelectTerritory }: TerritoryMapProps) => {
  const getTerritory = (id: string) => territories.find(t => t.id === id);

  return (
    <div className="p-2">
      <div className="relative w-full overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)' }}>
        <svg 
          viewBox="0 0 430 220" 
          className="w-full h-auto"
          style={{ minHeight: '180px' }}
        >
          {/* Background pattern - city grid */}
          <defs>
            <pattern id="cityGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(100, 116, 139, 0.15)" strokeWidth="0.5"/>
            </pattern>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="1" dy="2" stdDeviation="1" floodOpacity="0.3"/>
            </filter>
          </defs>

          <rect width="100%" height="100%" fill="url(#cityGrid)"/>

          {/* Water area for docks */}
          <path
            d="M 400 100 Q 430 130 430 220 L 430 220 L 280 220 Q 300 180 320 150 Q 380 100 400 100"
            fill="rgba(59, 130, 246, 0.15)"
            stroke="rgba(59, 130, 246, 0.3)"
            strokeWidth="1"
          />

          {/* Streets */}
          {STREETS.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="rgba(148, 163, 184, 0.25)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* Main roads */}
          <path d="M 0 100 L 430 100" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="8" />
          <path d="M 200 0 L 200 220" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="8" />

          {/* Territory Districts */}
          {Object.entries(TERRITORY_LAYOUTS).map(([id, layout]) => {
            const territory = getTerritory(id);
            if (!territory) return null;
            
            const colors = getControlColor(territory.control);
            const isFullControl = territory.control >= 100;
            const hasContest = territory.nextContestAt > 0;

            return (
              <motion.g
                key={id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTerritory(territory)}
              >
                {/* District background with glow */}
                <motion.rect
                  x={layout.x}
                  y={layout.y}
                  width={layout.width}
                  height={layout.height}
                  rx="6"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="2"
                  filter={territory.control >= 25 ? "url(#glow)" : undefined}
                  whileHover={{ 
                    scale: 1.02,
                    filter: "brightness(1.2)"
                  }}
                  whileTap={{ scale: 0.98 }}
                />

                {/* Buildings */}
                {layout.buildings.map((building, bi) => {
                  const buildingColors = {
                    tall: { fill: 'rgba(71, 85, 105, 0.8)', window: 'rgba(251, 191, 36, 0.6)' },
                    medium: { fill: 'rgba(100, 116, 139, 0.7)', window: 'rgba(251, 191, 36, 0.5)' },
                    small: { fill: 'rgba(148, 163, 184, 0.6)', window: 'rgba(251, 191, 36, 0.4)' },
                    wide: { fill: 'rgba(71, 85, 105, 0.75)', window: 'rgba(251, 191, 36, 0.5)' },
                  };
                  const bc = buildingColors[building.type];

                  return (
                    <g key={bi}>
                      {/* Building body */}
                      <rect
                        x={layout.x + building.x}
                        y={layout.y + building.y}
                        width={building.w}
                        height={building.h}
                        rx="1"
                        fill={bc.fill}
                        filter="url(#shadow)"
                      />
                      {/* Windows - simple dots */}
                      {building.h > 15 && (
                        <>
                          <circle cx={layout.x + building.x + building.w * 0.3} cy={layout.y + building.y + 5} r="1.5" fill={bc.window} />
                          <circle cx={layout.x + building.x + building.w * 0.7} cy={layout.y + building.y + 5} r="1.5" fill={bc.window} />
                          {building.h > 25 && (
                            <>
                              <circle cx={layout.x + building.x + building.w * 0.3} cy={layout.y + building.y + 12} r="1.5" fill={bc.window} />
                              <circle cx={layout.x + building.x + building.w * 0.7} cy={layout.y + building.y + 12} r="1.5" fill={bc.window} />
                            </>
                          )}
                          {building.h > 40 && (
                            <>
                              <circle cx={layout.x + building.x + building.w * 0.3} cy={layout.y + building.y + 20} r="1.5" fill={bc.window} />
                              <circle cx={layout.x + building.x + building.w * 0.7} cy={layout.y + building.y + 20} r="1.5" fill={bc.window} />
                            </>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}

                {/* District label */}
                <text
                  x={layout.x + layout.width / 2}
                  y={layout.y + layout.height - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="white"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                  className="pointer-events-none select-none uppercase tracking-wider"
                >
                  {layout.label}
                </text>

                {/* Territory icon */}
                <text
                  x={layout.x + layout.width / 2}
                  y={layout.y + 16}
                  textAnchor="middle"
                  fontSize="16"
                  className="pointer-events-none select-none"
                >
                  {territory.icon}
                </text>

                {/* Control percentage badge */}
                <g transform={`translate(${layout.x + layout.width - 20}, ${layout.y + 8})`}>
                  <rect
                    x="-12"
                    y="-6"
                    width="24"
                    height="12"
                    rx="3"
                    fill="rgba(0,0,0,0.6)"
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="7"
                    fontWeight="bold"
                    fill={isFullControl ? '#fbbf24' : territory.control >= 50 ? '#a78bfa' : '#94a3b8'}
                    className="pointer-events-none select-none"
                  >
                    {Math.round(territory.control)}%
                  </text>
                </g>

                {/* Full control crown */}
                {isFullControl && (
                  <g transform={`translate(${layout.x + 12}, ${layout.y + 8})`}>
                    <circle r="8" fill="rgba(245, 158, 11, 0.9)" />
                    <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fontSize="10">👑</text>
                  </g>
                )}

                {/* Dealer count */}
                {territory.assignedDealerIds.length > 0 && (
                  <g transform={`translate(${layout.x + 12}, ${layout.y + layout.height - 15})`}>
                    <circle r="8" fill="rgba(139, 92, 246, 0.9)" />
                    <text 
                      x="0" 
                      y="1" 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fontSize="8" 
                      fill="white" 
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {territory.assignedDealerIds.length}
                    </text>
                  </g>
                )}

                {/* Contest warning */}
                {hasContest && (
                  <motion.g 
                    transform={`translate(${layout.x + layout.width - 12}, ${layout.y + layout.height - 15})`}
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <circle r="8" fill="rgba(239, 68, 68, 0.9)" />
                    <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fontSize="10">⚔️</text>
                  </motion.g>
                )}
              </motion.g>
            );
          })}

          {/* Map Legend */}
          <g transform="translate(10, 205)">
            <rect x="0" y="0" width="180" height="12" rx="3" fill="rgba(0,0,0,0.5)" />
            <circle cx="12" cy="6" r="3" fill="#f59e0b" />
            <text x="20" y="8" fontSize="6" fill="#94a3b8">Full</text>
            <circle cx="48" cy="6" r="3" fill="#10b981" />
            <text x="56" y="8" fontSize="6" fill="#94a3b8">75%+</text>
            <circle cx="88" cy="6" r="3" fill="#8b5cf6" />
            <text x="96" y="8" fontSize="6" fill="#94a3b8">50%+</text>
            <circle cx="128" cy="6" r="3" fill="#f97316" />
            <text x="136" y="8" fontSize="6" fill="#94a3b8">25%+</text>
            <circle cx="168" cy="6" r="3" fill="#374151" />
          </g>
        </svg>
      </div>
    </div>
  );
};