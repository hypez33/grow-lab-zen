import { Territory } from '@/store/territoryStore';
import { motion } from 'framer-motion';
import { Crown, Users, Flame } from 'lucide-react';

interface TerritoryMapProps {
  territories: Territory[];
  onSelectTerritory: (territory: Territory) => void;
}

const getControlColor = (control: number) => {
  if (control >= 100) return { fill: '#f59e0b', stroke: '#fbbf24', glow: 'rgba(245, 158, 11, 0.4)' };
  if (control >= 75) return { fill: '#10b981', stroke: '#34d399', glow: 'rgba(16, 185, 129, 0.3)' };
  if (control >= 50) return { fill: '#8b5cf6', stroke: '#a78bfa', glow: 'rgba(139, 92, 246, 0.3)' };
  if (control >= 25) return { fill: '#f97316', stroke: '#fb923c', glow: 'rgba(249, 115, 22, 0.3)' };
  return { fill: '#374151', stroke: '#4b5563', glow: 'transparent' };
};

// Hexagon positions for map layout
const TERRITORY_POSITIONS: Record<string, { x: number; y: number; neighbors: string[] }> = {
  university: { x: 0, y: 0, neighbors: ['downtown', 'suburbs'] },
  downtown: { x: 1, y: 0.5, neighbors: ['university', 'nightlife', 'docks'] },
  suburbs: { x: -1, y: 0.5, neighbors: ['university', 'industrial'] },
  nightlife: { x: 2, y: 0, neighbors: ['downtown', 'docks'] },
  industrial: { x: 0, y: 1.2, neighbors: ['suburbs', 'docks', 'downtown'] },
  docks: { x: 1, y: 1.5, neighbors: ['industrial', 'downtown', 'nightlife'] },
};

const HEX_SIZE = 38;
const HEX_GAP = 6;

const getHexPoints = (size: number) => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push(`${Math.cos(angle) * size},${Math.sin(angle) * size}`);
  }
  return points.join(' ');
};

export const TerritoryMap = ({ territories, onSelectTerritory }: TerritoryMapProps) => {
  const centerX = 160;
  const centerY = 95;
  const hexWidth = HEX_SIZE * 1.7 + HEX_GAP;
  const hexHeight = HEX_SIZE * 1.4 + HEX_GAP;

  return (
    <div className="p-3">
      <div className="relative w-full overflow-hidden rounded-lg bg-gradient-to-br from-muted/10 to-muted/5">
        <svg 
          viewBox="0 0 320 200" 
          className="w-full h-auto"
          style={{ minHeight: '160px', maxHeight: '180px' }}
        >
          {/* Background grid pattern */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" strokeOpacity="0.3"/>
            </pattern>
            {/* Glow filters */}
            {territories.map(t => {
              const colors = getControlColor(t.control);
              return (
                <filter key={`glow-${t.id}`} id={`glow-${t.id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feFlood floodColor={colors.glow}/>
                  <feComposite in2="blur" operator="in"/>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              );
            })}
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
          
          {/* Connection lines between neighbors */}
          {territories.map(territory => {
            const pos = TERRITORY_POSITIONS[territory.id];
            if (!pos) return null;
            const x = centerX + pos.x * hexWidth;
            const y = centerY + pos.y * hexHeight;
            
            return pos.neighbors.map(neighborId => {
              const neighborPos = TERRITORY_POSITIONS[neighborId];
              if (!neighborPos) return null;
              const nx = centerX + neighborPos.x * hexWidth;
              const ny = centerY + neighborPos.y * hexHeight;
              
              // Only draw line if this territory's id is less than neighbor's to avoid duplicates
              if (territory.id > neighborId) return null;
              
              return (
                <line
                  key={`${territory.id}-${neighborId}`}
                  x1={x}
                  y1={y}
                  x2={nx}
                  y2={ny}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                  strokeDasharray="4 2"
                />
              );
            });
          })}

          {/* Territory hexagons */}
          {territories.map((territory, index) => {
            const pos = TERRITORY_POSITIONS[territory.id];
            if (!pos) return null;
            
            const x = centerX + pos.x * hexWidth;
            const y = centerY + pos.y * hexHeight;
            const colors = getControlColor(territory.control);
            const hasContest = territory.nextContestAt > 0;
            const isFullControl = territory.control >= 100;

            return (
              <motion.g
                key={territory.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTerritory(territory)}
              >
                {/* Glow effect for controlled territories */}
                {territory.control >= 25 && (
                  <polygon
                    points={getHexPoints(HEX_SIZE + 4)}
                    transform={`translate(${x}, ${y})`}
                    fill={colors.glow}
                    filter={`url(#glow-${territory.id})`}
                  />
                )}
                
                {/* Main hexagon */}
                <motion.polygon
                  points={getHexPoints(HEX_SIZE)}
                  transform={`translate(${x}, ${y})`}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="2"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ filter: isFullControl ? 'brightness(1.1)' : undefined }}
                />

                {/* Inner hexagon for depth */}
                <polygon
                  points={getHexPoints(HEX_SIZE - 8)}
                  transform={`translate(${x}, ${y})`}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />

                {/* Territory icon */}
                <text
                  x={x}
                  y={y - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="20"
                  className="pointer-events-none select-none"
                >
                  {territory.icon}
                </text>

                {/* Control percentage */}
                <text
                  x={x}
                  y={y + 18}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="white"
                  className="pointer-events-none select-none"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {Math.round(territory.control)}%
                </text>

                {/* Status indicators */}
                {isFullControl && (
                  <g transform={`translate(${x + 22}, ${y - 25})`}>
                    <circle r="8" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1" />
                    <Crown size={10} x={-5} y={-5} className="text-white" />
                  </g>
                )}

                {territory.assignedDealerIds.length > 0 && (
                  <g transform={`translate(${x - 26}, ${y - 25})`}>
                    <circle r="8" fill="hsl(var(--primary))" />
                    <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" fontWeight="bold">
                      {territory.assignedDealerIds.length}
                    </text>
                  </g>
                )}

                {hasContest && (
                  <motion.g 
                    transform={`translate(${x + 26}, ${y + 20})`}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <circle r="8" fill="#ef4444" />
                    <Flame size={10} x={-5} y={-5} className="text-white" />
                  </motion.g>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
