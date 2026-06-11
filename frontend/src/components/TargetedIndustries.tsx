import { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import { COLORS } from '../constants/themeColors';
import { api, type StixObject } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import { PolarGrid, PolarAngleAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';


const INDUSTRY_KEYWORDS: Record<string, string[]> = {
    'Consumer & Social': ['retail', 'hospitality-leisure', 'entertainment'],
    'Financial': ['financial-services', 'insurance'],
    'Government': ['government-national', 'government-regional', 'government-local', 'government-public-services'],
    'Healthcare': ['healthcare', 'pharmaceutical'],
    'Energy': ['energy', 'utilities'],
    'Technology': ['communications', 'technology', 'telecommunications'],
    'Natural Resources': ['agriculture', 'mining'],
    'Transportation': ['transportation'],
    'Industrial': ['manufacturing', 'construction', 'aerospace', 'automotive', 'defense'],
    'Education': ['education'],
    'Non-Profit': ['non-profit'],
    'Infrastructure': ['infrastructure'],
};

interface ChartDataType {
    id: string;
    value: number;
    label: string;
}

interface StixProperties {
    description?: string;
    aliases?: string[];
    x_mitre_aliases?: string[];
}

/**
 * Functional component that shows a Radar Chart of targeted industries based on keyword matches in intrusion set STIX objects.
 * @returns a radar chart showing industry distributions
 */
export default function TargetedIndustries() {
    const [data, setData] = useState<ChartDataType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        api.stix('intrusion-set', 1000, 0, controller.signal)
            .then((results: StixObject[]) => {
                const counts: Record<string, number> = {};

                Object.keys(INDUSTRY_KEYWORDS).forEach(key => counts[key] = 0);


                results.forEach((obj) => {
                    const props = (obj.properties ?? obj) as StixProperties;
                    const text = [
                        props.description ?? '',
                        (props.aliases ?? []).join(' '),
                        (props.x_mitre_aliases ?? []).join(' ')
                    ].join(' ').toLowerCase();

                    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
                        if (keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(text))) {
                            counts[industry]++;
                        }
                    }

                });

                const formattedData = Object.entries(counts)
                    .filter(([, entry]) => entry > 0)
                    .map(([name, value]) => ({
                        id: name,
                        value,
                        label: name
                    }));

                setData(formattedData);
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    console.error('Error fetching intrusion sets:', err);
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
                            name='Intrusion Sets'
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
