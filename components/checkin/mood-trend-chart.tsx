"use client";

import { useEffect, useRef, useState } from "react";
import { format, isToday } from "date-fns";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { paletteForMember } from "@/lib/member-colors";
import type { TrendSeries } from "@/components/checkin/helpers";
import { moodFaces } from "@/components/checkin/helpers";

interface MoodTrendChartProps {
  days: Date[];
  series: TrendSeries[];
}

const HEIGHT = 200;
const PAD = { top: 14, right: 14, bottom: 30, left: 34 };

export function MoodTrendChart({ days, series }: MoodTrendChartProps) {
  const { members } = useFamilyMembers();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const innerWidth = Math.max(0, width - PAD.left - PAD.right);
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const stepX = days.length > 1 ? innerWidth / (days.length - 1) : 0;
  const x = (index: number) => PAD.left + index * stepX;
  const y = (mood: number) => PAD.top + innerHeight - ((mood - 1) / 4) * innerHeight;

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 ? (
        <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label="Mood over the last two weeks" className="block overflow-visible">
          {[1, 2, 3, 4, 5].map((level) => (
            <g key={level}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(level)} y2={y(level)} className="stroke-border" strokeDasharray={level === 3 ? undefined : "3 4"} strokeWidth={level === 3 ? 1.25 : 1} />
              <text x={PAD.left - 10} y={y(level) + 5} textAnchor="end" fontSize={14}>
                {moodFaces[level - 1]}
              </text>
            </g>
          ))}
          {days.map((day, index) =>
            index % 2 === 0 || isToday(day) ? (
              <text key={day.toISOString()} x={x(index)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} className={isToday(day) ? "fill-foreground font-semibold" : "fill-muted-foreground"}>
                {isToday(day) ? "Today" : format(day, "M/d")}
              </text>
            ) : null
          )}
          {series.map(({ member, moods }) => {
            const palette = paletteForMember(member, members);
            const segments: string[] = [];
            let current: string[] = [];
            moods.forEach((mood, index) => {
              if (mood === null) {
                if (current.length > 1) segments.push(current.join(" "));
                current = [];
                return;
              }
              current.push(`${x(index)},${y(mood)}`);
            });
            if (current.length > 1) segments.push(current.join(" "));
            return (
              <g key={member.id}>
                {segments.map((points, index) => (
                  <polyline key={index} points={points} fill="none" stroke={palette.solid} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                ))}
                {moods.map((mood, index) =>
                  mood === null ? null : (
                    <circle key={index} cx={x(index)} cy={y(mood)} r={isToday(days[index]) ? 5.5 : 4} fill={palette.solid} className="stroke-card" strokeWidth={2}>
                      <title>
                        {member.display_name.split(" ")[0]} · {format(days[index], "EEE, MMM d")} · mood {mood}
                      </title>
                    </circle>
                  )
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}
    </div>
  );
}
