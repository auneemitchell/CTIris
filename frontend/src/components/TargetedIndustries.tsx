import { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { COLORS } from '../constants/themeColors';
import { api } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

interface SectorDatum {
    name: string;
    size: number;
    [key: string]: unknown;
}

const CELL_COLORS = [
    '#A78BFA', // lavender purple
    '#22d3ee', // cyan
    '#f837ab', // neon pink
    '#0088FE', // electric blue
    '#00C49F', // cyber teal
    '#ff6b6b', // coral red
];

function wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        const w = word.length > maxChars ? word.slice(0, maxChars - 1) + '…' : word;
        if (!current) {
            current = w;
        } else if ((current + ' ' + w).length <= maxChars) {
            current += ' ' + w;
        } else {
            lines.push(current);
            current = w;
        }
    }
    if (current) lines.push(current);
    return lines;
}

const TreemapCell = (props: {
    x?: number; y?: number; width?: number; height?: number;
    name?: string; size?: number; index?: number; depth?: number;
}) => {
    const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, index = 0, depth = 0 } = props;
    if (depth === 0) return <g />;
    const fill = CELL_COLORS[index % CELL_COLORS.length];
    const clipId = `tc-${index}`;

    return (
        <g>
            <defs>
                <clipPath id={clipId}>
                    <rect x={x + 2} y={y + 2} width={width - 4} height={height - 4} />
                </clipPath>
            </defs>
            {/* glow layer */}
            <rect
                x={x + 1}
                y={y + 1}
                width={width - 2}
                height={height - 2}
                fill="none"
                stroke={fill}
                strokeWidth={4}
                strokeOpacity={0.35}
                style={{ filter: 'blur(4px)' }}
            />
            {/* cell */}
            <rect
                x={x + 1}
                y={y + 1}
                width={width - 2}
                height={height - 2}
                fill={fill}
                fillOpacity={0.08}
                stroke={fill}
                strokeWidth={1}
                strokeOpacity={1}
            />
            {width > 48 && height > 24 && (() => {
                const fontSize = Math.min(12, width / 8);
                const charsPerLine = Math.floor((width - 8) / (fontSize * 0.6));
                const lines = wrapText(name, charsPerLine);
                const lineHeight = fontSize + 3;
                const showCount = height > 44;
                const blockHeight = lines.length * lineHeight;
                const startY = y + height / 2 - blockHeight / 2 + lineHeight / 2 - (showCount ? 8 : 0);
                return (
                    <>
                        {lines.map((line, i) => (
                            <text
                                key={i}
                                x={x + width / 2}
                                y={startY + i * lineHeight}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={COLORS.textPrimary}
                                fontSize={fontSize}
                                clipPath={`url(#${clipId})`}
                                style={{ pointerEvents: 'none' }}
                            >
                                {line}
                            </text>
                        ))}
                        {showCount && (
                            <text
                                x={x + width / 2}
                                y={startY + lines.length * lineHeight + 4}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={COLORS.textMuted}
                                fontSize={Math.min(11, width / 9)}
                                clipPath={`url(#${clipId})`}
                                style={{ pointerEvents: 'none' }}
                            >
                                {size}
                            </text>
                        )}
                    </>
                );
            })()}
        </g>
    );
};

export default function TargetedIndustries() {
    const [data, setData] = useState<SectorDatum[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        api.sectorTargeting(controller.signal)
            .then((results) => {
                const formattedData = results.map(({ sector_name, count }) => ({
                    name: sector_name.replace(/ Sector$/i, ''),
                    size: count,
                }));
                setData(formattedData);
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    console.error('Error fetching sector targeting data:', err);
                }
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, []);

    if (loading) return <LoadingSpinner />;

    if (!data.length) return (
        <Paper
            sx={{
                p: 1,
                bgcolor: COLORS.headerBackground,
                borderRadius: 2,
                border: `1px solid ${COLORS.dataContainerBorder}`,
                height: '32vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Typography sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                No sector targeting data available
            </Typography>
        </Paper>
    );

    return (
        <Paper
            sx={{
                p: 1,
                bgcolor: COLORS.headerBackground,
                borderRadius: 2,
                border: `1px solid ${COLORS.dataContainerBorder}`
            }}
        >
            <Box sx={{ width: '100%', height: '32vh' }}>
                <ResponsiveContainer width='100%' height='100%'>
                    <Treemap
                        data={data}
                        dataKey="size"
                        nameKey="name"
                        content={<TreemapCell />}
                    >
                        <Tooltip
                            content={({ payload }) => {
                                if (!payload?.length) return null;
                                const item = payload[0].payload as SectorDatum;
                                return (
                                    <Box sx={{
                                        bgcolor: COLORS.headerBackground,
                                        border: `1px solid ${COLORS.dataContainerBorder}`,
                                        borderRadius: 1,
                                        px: 1.5,
                                        py: 1,
                                        fontSize: 12,
                                        color: COLORS.textPrimary,
                                    }}>
                                        <div>{item.name}</div>
                                        <div style={{ color: COLORS.textMuted }}>{item.size} relationship{item.size !== 1 ? 's' : ''}</div>
                                    </Box>
                                );
                            }}
                        />
                    </Treemap>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}
