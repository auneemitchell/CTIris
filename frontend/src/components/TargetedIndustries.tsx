import { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import { COLORS } from '../constants/themeColors';
import { api } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import { PolarGrid, PolarAngleAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartDataType {
    id: string;
    value: number;
    label: string;
}

export default function TargetedIndustries() {
    const [data, setData] = useState<ChartDataType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        api.sectorTargeting(controller.signal)
            .then((results) => {
                const formattedData = results.map(({ sector_name, count }) => ({
                    id: sector_name,
                    value: count,
                    label: sector_name,
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
                    <RadarChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 60,
                            bottom: 10,
                            left: 60
                        }}
                    >
                        <PolarGrid stroke={COLORS.dataContainerBorder} />
                        <PolarAngleAxis dataKey='label' tick={{ fill: COLORS.textMuted, fontSize: 12 }} />
                        <Radar
                            name='Targeting relationships'
                            dataKey='value'
                            stroke={COLORS.chartColorOne}
                            fill={COLORS.chartColorOne}
                            fillOpacity={0.35}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: COLORS.headerBackground,
                                border: `1px solid ${COLORS.dataContainerBorder}`,
                                borderRadius: 4,
                                color: COLORS.textPrimary,
                                fontSize: 12,
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}
