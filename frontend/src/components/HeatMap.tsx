import { useEffect, useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps';
import { COLORS } from '../constants/themeColors';
import { api } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';

// public CDN source URL for world topojson data
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface CountryMap {
    [isoAlpha3: string]: {
        name: string;
        count: number;
    };
}

interface ExternalReference {
    description?: string;
}

interface StixProperties {
    description?: string;
    aliases?: string[];
    x_mitre_aliases?: string[];
    external_references?: ExternalReference[];
}

interface StixRawObject {
    properties?: StixProperties;
    description?: string;
    aliases?: string[];
    x_mitre_aliases?: string[];
    external_references?: ExternalReference[];
}

/**
 * Function that displays a heatmap color based relative to the frequency of the country.
 * @param count - Number of occurences for a country
 * @param maxCount  - Maximum occurences across dataset
 * @returns HEX color string representing the intensity (Red)
 */
function getCountryColor(count: number, maxCount: number): string {
    if (!count || count === 0) return COLORS.heatmapBase;
    const intensity = count / maxCount;
    if (intensity < 0.2) return COLORS.heatmapLow;
    if (intensity < 0.5) return COLORS.heatmapMedium;
    if (intensity < 0.8) return COLORS.heatmapHigh;
    return COLORS.heatmapCritical;
}

/**
 * Helper function to cross-reference country mentions in text to ISO3 codes
 */
const COUNTRY_NAME_TO_ALPHA3: Record<string, string> = {
    'united states': 'USA', 'russia': 'RUS', 'china': 'CHN',
    'iran': 'IRN', 'north korea': 'PRK', 'india': 'IND',
    'germany': 'DEU', 'france': 'FRA', 'israel': 'ISR',
    'australia': 'AUS', 'ukraine': 'UKR', 'united kingdom': 'GBR',
    'canada': 'CAN', 'brazil': 'BRA', 'japan': 'JPN',
    'south korea': 'KOR', 'pakistan': 'PAK', 'turkey': 'TUR',
    'saudi arabia': 'SAU', 'vietnam': 'VNM', 'indonesia': 'IDN',
    'thailand': 'THA', 'taiwan': 'TWN', 'bangladesh': 'BGD',
    'nigeria': 'NGA', 'south africa': 'ZAF', 'mexico': 'MEX',
    'philippines': 'PHL', 'poland': 'POL', 'netherlands': 'NLD',
    'sweden': 'SWE', 'switzerland': 'CHE', 'spain': 'ESP',
    'italy': 'ITA', 'belgium': 'BEL', 'austria': 'AUT',
    'singapore': 'SGP', 'malaysia': 'MYS', 'egypt': 'EGY',
    'afghanistan': 'AFG', 'iraq': 'IRQ', 'syria': 'SYR',
    'kazakhstan': 'KAZ', 'georgia': 'GEO', 'belarus': 'BLR',
    'romania': 'ROU', 'czech republic': 'CZE', 'hungary': 'HUN',
    'portugal': 'PRT', 'greece': 'GRC', 'finland': 'FIN',
    'norway': 'NOR', 'denmark': 'DNK', 'new zealand': 'NZL',
    'argentina': 'ARG', 'chile': 'CHL', 'colombia': 'COL',
    'peru': 'PER', 'venezuela': 'VEN', 'ethiopia': 'ETH',
    'kenya': 'KEN', 'tanzania': 'TZA', 'ghana': 'GHA',
    'morocco': 'MAR', 'algeria': 'DZA', 'tunisia': 'TUN',
    'libya': 'LBY', 'sudan': 'SDN', 'somalia': 'SOM',
    'myanmar': 'MMR', 'cambodia': 'KHM', 'laos': 'LAO',
    'nepal': 'NPL', 'sri lanka': 'LKA', 'qatar': 'QAT',
    'kuwait': 'KWT', 'bahrain': 'BHR', 'jordan': 'JOR',
    'lebanon': 'LBN', 'yemen': 'YEM', 'oman': 'OMN',
    'azerbaijan': 'AZE', 'armenia': 'ARM', 'uzbekistan': 'UZB',
    'turkmenistan': 'TKM', 'tajikistan': 'TJK', 'kyrgyzstan': 'KGZ',
    'mongolia': 'MNG', 'serbia': 'SRB', 'croatia': 'HRV',
    'slovakia': 'SVK', 'slovenia': 'SVN', 'bulgaria': 'BGR',
    'estonia': 'EST', 'latvia': 'LVA', 'lithuania': 'LTU',
    'moldova': 'MDA', 'albania': 'ALB', 'north macedonia': 'MKD',
    'bosnia': 'BIH', 'montenegro': 'MNE', 'cuba': 'CUB',
    'ecuador': 'ECU', 'bolivia': 'BOL', 'paraguay': 'PRY',
    'uruguay': 'URY', 'costa rica': 'CRI', 'guatemala': 'GTM',
    'honduras': 'HND', 'nicaragua': 'NIC', 'panama': 'PAN',
    'dominican republic': 'DOM', 'jamaica': 'JAM', 'haiti': 'HTI',
    'zambia': 'ZMB', 'zimbabwe': 'ZWE', 'mozambique': 'MOZ',
    'angola': 'AGO', 'cameroon': 'CMR', 'senegal': 'SEN',
    'ivory coast': 'CIV', 'uganda': 'UGA', 'rwanda': 'RWA',
};

/**
 * Reverse mapping from ISO3 codes to display names
 */
const ALPHA3_TO_DISPLAY_NAME: Record<string, string> = Object.fromEntries(
    Object.entries(COUNTRY_NAME_TO_ALPHA3).map(([name, iso3]) => [
        iso3,
        name.replace(/\b\w/g, (c) => c.toUpperCase()),
    ])
);

/**
 * Functional component that displays the geographic distribution of the country mention frequency in the STIX data.
 * @returns full interactive world map with color coded frequency of threat intensity by countries
 */
export default function Heatmap() {
    const [countryData, setCountryData] = useState<CountryMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

useEffect(() => {
        const controller = new AbortController();
        // Fetch STIX objects of country mentions across multiple types to get a more comprehensive heatmap
        const typesToFetch = ['intrusion-set', 'malware', 'campaign', 'threat-actor'];

        
        Promise.all(
            // For each type, fetch up to 1000 objects to get a good sample size for the heatmap
            typesToFetch.map((type) =>
                // Fetch up to 1000 objects per type to get a good sample size for the heatmap
                api.stix(type, 1000, 0, controller.signal).catch(() => [])
            )
        )
            .then((results) => {
                if (controller.signal.aborted) return;

                const aggregated: CountryMap = {};
                const allObjects = results.flat() as StixRawObject[];

                // For each object, check if any country names are mentioned in its description, aliases, or external references
                allObjects.forEach((obj) => {
                    const props: StixProperties = obj.properties ?? obj;

                    // Combine relevant text fields to search for country mentions
                    const text = [
                        props.description ?? '',
                        (props.aliases ?? []).join(' '),
                        (props.x_mitre_aliases ?? []).join(' '),
                        (props.external_references ?? [])
                            .map((r: ExternalReference) => r.description ?? '')
                            .join(' '),
                    ]
                        .join(' ')
                        .toLowerCase();

                        // Check if any country names are mentioned in the combined text
                        Object.entries(COUNTRY_NAME_TO_ALPHA3).forEach(([countryName, iso3]) => {
                        if (text.includes(countryName)) {
                            // If this country hasn't been seen before, initialize it in the map
                            if (!aggregated[iso3]) {
                                aggregated[iso3] = {
                                    name: ALPHA3_TO_DISPLAY_NAME[iso3] ?? iso3,
                                    count: 0,
                                };
                            }
                            // Increment the count for this country if mentioned in the text
                            aggregated[iso3].count += 1;
                        }
                    });
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

    const countValues = Object.values(countryData).map((c) => c.count);
    const maxAttacks = countValues.length > 0 ? Math.max(1, ...countValues) : 1;

    return (
        <Box>
            <Box
                sx={{
                    bgcolor: COLORS.headerBackground,
                    border: `1px solid ${COLORS.dataContainerBorder}`,
                    borderRadius: 2,
                    width: '100%',
                    p: 2,
                }}
            >
                
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 120, center: [0, 30] }}
                    style={{ width: '100%', height: 'auto' }}
                >
                    <Sphere id="rsm-sphere" stroke={COLORS.heatmapStroke} strokeWidth={0.5} fill="transparent" />
                    <Graticule stroke={COLORS.heatmapStroke} strokeWidth={0.5} />

                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const geoName = geo.properties.name || '';
                                const normalizedGeoName = geoName.toLowerCase();

                                // Cross-reference the geography name to our country map using the normalized name
                                const matchedIso3 = COUNTRY_NAME_TO_ALPHA3[normalizedGeoName];
                                const match = matchedIso3 ? countryData[matchedIso3] : null;
                                const count = match ? match.count : 0;
                                const displayName = match ? match.name : geoName;
                                const geoFill = getCountryColor(count, maxAttacks);

                                return (
                                    <Tooltip
                                        key={geo.rsmKey}
                                        title={`${displayName || 'Unknown'}: ${count.toLocaleString()} ATT&CK References`}
                                        arrow
                                    >
                                        <Geography
                                            geography={geo}
                                            style={{
                                                default: {
                                                    fill: geoFill,
                                                    stroke: COLORS.headerBackground ?? '#1e1e24',
                                                    strokeWidth: 0.5,
                                                    outline: 'none',
                                                    transition: 'fill 0.2s ease',
                                                },
                                                hover: {
                                                    fill: COLORS.heatmapHover,
                                                    stroke: COLORS.backgroundDefault,
                                                    strokeWidth: 1,
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                },
                                                pressed: {
                                                    fill: COLORS.heatmapHover,
                                                    outline: 'none',
                                                },
                                            }}
                                        />
                                    </Tooltip>
                                );
                            })
                        }
                    </Geographies>
                </ComposableMap>

                {/* Map Legend */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography sx={{ color: COLORS.textMuted, fontSize: '0.65rem', fontFamily: 'monospace' }}>
                        LOW
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[0.2, 0.45, 0.75, 1].map((opacity, i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: 16,
                                    height: 12,
                                    borderRadius: 0.25,
                                    bgcolor: `rgba(228, 39, 39, ${opacity})`,
                                    border: opacity < 0.3 ? `1px solid ${COLORS.heatmapLegendBorder}` : 'none',
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
