import React from 'react';
import { motion } from 'framer-motion';

// size defaults to 220 — all geometry scales proportionally from that baseline.
const CircularTracker = ({ letter, daysData, size = 220 }) => {
  const center      = size / 2;
  const radius      = Math.round(size * 0.386);   // 85 / 220
  const strokeWidth = Math.round(size * 0.10);    // 22 / 220
  const dayFontSize = Math.max(5, Math.round(size * 0.032)); // 7 / 220, min 5px
  const letterSize  = Math.round(size * 0.218);   // ~48px at 220

  const totalDays = daysData.length || 31;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 overflow-visible"
      >
        {daysData.map((status, i) => {
          const anglePerSegment = 360 / totalDays;
          const startAngle = i * anglePerSegment;
          const endAngle   = (i + 1) * anglePerSegment - 1.5;

          const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
          const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
          const x2 = center + radius * Math.cos((Math.PI * endAngle)   / 180);
          const y2 = center + radius * Math.sin((Math.PI * endAngle)   / 180);

          let color = '#E2E8F0'; // none / neutral
          if (status === 'success') color = '#22C55E';
          if (status === 'fail')    color = '#EF4444';

          const textAngle = startAngle + anglePerSegment / 2;
          const textX = center + radius * Math.cos((Math.PI * textAngle) / 180);
          const textY = center + radius * Math.sin((Math.PI * textAngle) / 180);

          return (
            <motion.g
              key={`${i}-${totalDays}`}
              whileHover={{ scale: 1.1, filter: 'brightness(1.1)' }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="cursor-pointer"
            >
              <path
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                className="transition-all duration-300"
              />
              <text
                x={textX}
                y={textY}
                fill={status === 'none' ? '#94a3b8' : 'white'}
                fontSize={`${dayFontSize}px`}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
                transform={`rotate(90, ${textX}, ${textY})`}
                className="pointer-events-none"
              >
                {i + 1}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Centre letter */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          style={{ fontSize: letterSize }}
          className="font-black text-slate-700 leading-none"
        >
          {letter}
        </span>
      </div>
    </div>
  );
};

export default CircularTracker;
