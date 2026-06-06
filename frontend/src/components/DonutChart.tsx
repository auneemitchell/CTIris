import { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import { PieChart } from '@mui/x-charts';
import { COLORS } from '../constants/themeColors';
import { api, type StixObject } from '../api/client';
import LoadingSpinner from './LoadingSpinner';


const INDUSTRY_KEYWORDS: Record<string, string[]> = {
    'Financial': ['bank', 'banks', 'banking', 'financial', 'finance','insurance', 'crypto', 'crytocurrency', 'fintech', 'investment', 'investments'],
    'Government': ['government', 'governmental', 'military', 'diplomatic', 'ministry', 'public sector', 'federal', 'state agency'],
    'Healthcare': ['healthcare', 'hospital', 'hospitals', 'medical', 'medicine', 'pharma', 'pharmaceutical', 'biotech'],
    'Energy': ['energy', 'utility', 'utilities', 'electric', 'power grid', 'oil', 'gas', 'petroleum'],
    'Technology': ['software', 'telecom', 'telecommunication', 'telecommunications', 'technology', 'semiconductor', 'it services', 'cloud'],
    'Defense': ['defense', 'aerospace', 'aviation', 'weapon', 'weapons'],
    'Education': ['university', 'universities', 'academic', 'research', 'education', 'school', 'college']
};

const CHART_COLORS = [
    COLORS.chartColorOne, 
    COLORS.chartColorTwo, 
    COLORS.chartColorThree, 
    COLORS.chartColorFour, 
    COLORS.chartColorFive, 
    COLORS.chartColorSix, 
    COLORS.chartColorSeven, 
    COLORS.chartColorEight
];

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
 * Functional component that shows a Donut Chart of targeted industries based on keyword matches in intrusion set STIX objects.
 * @returns a donut chart showing industry distributions
 */
export default function DonutChart() {
    const [data, setData] = useState<ChartDataType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        
        api.stix('intrusion-set', 1000, 0, controller.signal)
            .then((results: StixObject[]) => {
                const counts: Record<string, number> = {};
                
                Object.keys(INDUSTRY_KEYWORDS).forEach(key => counts[key] = 0);
                counts['Other'] = 0;

                results.forEach((obj) => {
                    const props = (obj.properties ?? obj) as StixProperties;
                    const text = [
                        props.description ?? '',
                        (props.aliases ?? []).join(' '),
                        (props.x_mitre_aliases ?? []).join(' ')
                    ].join(' ').toLowerCase();

                    let matched = false;
                    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
                        if (keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(text))) {
                            counts[industry]++;
                            matched = true;
                        }
                    }
                    if (!matched) counts['Other']++;
                });

                const formattedData = Object.entries(counts)
                    .filter((entry) => entry[1] > 0)
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
                p: 2, 
                bgcolor: COLORS.headerBackground, 
                borderRadius: 2, 
                border: `1px solid ${COLORS.dataContainerBorder}` 
            }}
        >
            <Box sx={{ width: '100%', height: 300 }}>
                <PieChart
                    colors={CHART_COLORS}
                    series={[
                        {
                            data: data,
                            innerRadius: 50,
                            outerRadius: 80,
                            paddingAngle: 2,
                            cornerRadius: 2,
                            cx: '45%'
                        },
                    ]}
                    slotProps={{
                        legend: {
                            direction: 'column',
                            position: { vertical: 'middle', horizontal: 'right'},
                            padding: 0,
                            labelStyle: {
                                fill: COLORS.textPrimary,
                                fontSize: 12,
                            },
                        },
                    }}
                />
            </Box>
        </Paper>
    );
}
