import { useEffect, useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps';
import { COLORS } from '../constants/themeColors';
import { api } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface CountryMap {
    [isoAlpha3: string]: {
        name: string;
        count: number;
    };
}

// Helper function to determine Heatmap color intensity
function getCountryColor(count: number, maxCount: number): string {
    if (!count || count === 0) return 'rgba(255, 255, 255, 0.04)';
    const intensity = count / maxCount;
    if (intensity < 0.2) return COLORS.heatmapLow;
    if (intensity < 0.5) return COLORS.heatmapMedium;
    if (intensity < 0.8) return COLORS.heatmapHigh;
    return COLORS.heatmapCritical;
}

// Helper to convert STIX 2-letter country codes (ISO alpha-2) to Map 3-letter codes (ISO alpha-3)
const ALPHA2_TO_ALPHA3: Record<string, string> = {
    US: 'USA', CN: 'CHN', RU: 'RUS', DE: 'DEU', BR: 'BRA',
    IN: 'IND', GB: 'GBR', IR: 'IRN', FR: 'FRA', CA: 'CAN'
};

// Heatmap component that visualizes the geographic distribution of ingested "location" STIX objects.
export default function Heatmap() {
    const [countryData, setCountryData] = useState<CountryMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        // Pulls raw objects matching type "location" from your live database
        api.stix('location', 1000, 0, controller.signal)
            .then((stixObjects) => {
                if (controller.signal.aborted) return;

                // Aggregate counts dynamically by country code from the STIX properties
                const aggregated: CountryMap = {};

                stixObjects.forEach((obj) => {
                    const props = obj.properties as { country?: string; name?: string };
                    if (!props.country) return;

                    // Normalize code to 3 letters for react-simple-maps match keys
                    const rawCode = props.country.toUpperCase();
                    const iso3 = rawCode.length === 2 ? (ALPHA2_TO_ALPHA3[rawCode] ?? rawCode) : rawCode;
                    const countryName = props.name ?? iso3;

                    if (!aggregated[iso3]) {
                        aggregated[iso3] = { name: countryName, count: 0 };
                    }
                    aggregated[iso3].count += 1;
                });

                setCountryData(aggregated);
            })
            .catch((e) => {
                if (!controller.signal.aborted) setError(String(e));
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, []);

    if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><LoadingSpinner /></Box>;
    if (error) return <ErrorDisplay message={error} />;

    // Calibrate map dynamic threshold curves based on highest count found
    const countValues = Object.values(countryData).map(c => c.count);
    const maxAttacks = countValues.length > 0 ? Math.max(1, ...countValues) : 1;

    return (
        <Box>
            {/* Container with dark background and border to help the map colors pop */}
            <Box sx={{
                bgcolor: COLORS.headerBackground,
                border: `1px solid ${COLORS.dataContainerBorder}`,
                borderRadius: 2,
                width: '100%',
                p: 2,
            }}>
                {/* Render the map */}
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 120, center: [0, 30] }}
                    style={{ width: "100%", height: "auto" }}
                >
                    <Sphere id="rsm-sphere" stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} fill="transparent" />
                    <Graticule stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />

                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const geoName = geo.properties.name;
                                const geoIsoA3 = geo.properties.ISO_A3;
                                const geoId = geo.id;

                                // Match map country against our aggregated live data keys
                                const match = countryData[geoIsoA3] || countryData[geoId];
                                const count = match ? match.count : 0;
                                const displayName = match ? match.name : geoName;

                                const geoFill = getCountryColor(count, maxAttacks);

                                return (
                                    <Tooltip
                                        key={geo.rsmKey}
                                        title={`${displayName || "Unknown"}: ${count.toLocaleString()} Ingested Locations`}
                                        arrow
                                    >
                                        <Geography
                                            geography={geo}
                                            style={{
                                                default: {
                                                    fill: geoFill,
                                                    stroke: COLORS.headerBackground ?? "#1e1e24",
                                                    strokeWidth: 0.5,
                                                    outline: "none"
                                                },
                                                hover: {
                                                    fill: COLORS.heatmapHover,
                                                    stroke: COLORS.border,
                                                    strokeWidth: 1,
                                                    outline: "none",
                                                    cursor: "pointer"
                                                },
                                                pressed: {
                                                    fill: COLORS.heatmapHover,
                                                    outline: "none"
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                );
                            })
                        }
                    </Geographies>
                </ComposableMap>
                {/* Legend Indicator Scale */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography sx={{ color: COLORS.textMuted, fontSize: '0.65rem', fontFamily: 'monospace' }}>
                        LOW
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[0.2, 0.45, 0.75, 1].map((opacity, i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: 14,
                                    height: 10,
                                    borderRadius: 0.25,
                                    bgcolor: `rgba(228, 39, 39, ${opacity})`,
                                    border: opacity < 0.3 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                }}
                            />
                        ))}
                    </Box>

                    <Typography sx={{ color: COLORS.textMuted, fontSize: '0.65rem', fontFamily: 'monospace' }}>
                        CRITICAL
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}