import { useEffect, useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps';
import { COLORS } from '../constants/themeColors';
import { api } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';

/** TopoJSON world atlas served via CDN — react-simple-maps renders this but does not bundle any map data itself. */
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';


/** Aggregated relationship data for one country. */
interface CountryEntry {
    /** Display name shown in the tooltip (e.g. "United States"). */
    name: string;
    /** Total relationships pointing at this country across all relationship types. */
    count: number;
    /** Per-relationship-type breakdown, e.g. { targets: 3 }. Supports future multi-type maps. */
    breakdown: Record<string, number>;
}

/**
 * The central data bucket for the heatmap, keyed by ISO 3166-1 alpha-3 (e.g. "USA").
 * Alpha-3 is the shared key that connects two sources:
 *   - API rows (which use alpha-2 country codes) converted via ALPHA2_TO_ALPHA3
 *   - TopoJSON geography names converted via COUNTRY_NAME_TO_ALPHA3
 * Both sides write/read the same bucket, so the map can color each country correctly.
 */
interface CountryMap {
    [isoAlpha3: string]: CountryEntry;
}

// ISO 3166-1 alpha-2 → alpha-3 (STIX location objects use alpha-2 in `country`)
const ALPHA2_TO_ALPHA3: Record<string, string> = {
    AF: 'AFG', AL: 'ALB', DZ: 'DZA', AD: 'AND', AO: 'AGO', AR: 'ARG', AM: 'ARM',
    AU: 'AUS', AT: 'AUT', AZ: 'AZE', BH: 'BHR', BD: 'BGD', BY: 'BLR', BE: 'BEL',
    BJ: 'BEN', BT: 'BTN', BO: 'BOL', BA: 'BIH', BW: 'BWA', BR: 'BRA', BN: 'BRN',
    BG: 'BGR', BF: 'BFA', BI: 'BDI', CV: 'CPV', KH: 'KHM', CM: 'CMR', CA: 'CAN',
    CF: 'CAF', TD: 'TCD', CL: 'CHL', CN: 'CHN', CO: 'COL', KM: 'COM', CD: 'COD',
    CG: 'COG', CR: 'CRI', HR: 'HRV', CU: 'CUB', CY: 'CYP', CZ: 'CZE', DK: 'DNK',
    DJ: 'DJI', DO: 'DOM', EC: 'ECU', EG: 'EGY', SV: 'SLV', GQ: 'GNQ', ER: 'ERI',
    EE: 'EST', SZ: 'SWZ', ET: 'ETH', FJ: 'FJI', FI: 'FIN', FR: 'FRA', GA: 'GAB',
    GM: 'GMB', GE: 'GEO', DE: 'DEU', GH: 'GHA', GR: 'GRC', GT: 'GTM', GN: 'GIN',
    GW: 'GNB', GY: 'GUY', HT: 'HTI', HN: 'HND', HU: 'HUN', IS: 'ISL', IN: 'IND',
    ID: 'IDN', IR: 'IRN', IQ: 'IRQ', IE: 'IRL', IL: 'ISR', IT: 'ITA', JM: 'JAM',
    JP: 'JPN', JO: 'JOR', KZ: 'KAZ', KE: 'KEN', KP: 'PRK', KR: 'KOR', KW: 'KWT',
    KG: 'KGZ', LA: 'LAO', LV: 'LVA', LB: 'LBN', LS: 'LSO', LR: 'LBR', LY: 'LBY',
    LI: 'LIE', LT: 'LTU', LU: 'LUX', MG: 'MDG', MW: 'MWI', MY: 'MYS', MV: 'MDV',
    ML: 'MLI', MT: 'MLT', MR: 'MRT', MU: 'MUS', MX: 'MEX', MD: 'MDA', MC: 'MCO',
    MN: 'MNG', ME: 'MNE', MA: 'MAR', MZ: 'MOZ', MM: 'MMR', NA: 'NAM', NP: 'NPL',
    NL: 'NLD', NZ: 'NZL', NI: 'NIC', NE: 'NER', NG: 'NGA', MK: 'MKD', NO: 'NOR',
    OM: 'OMN', PK: 'PAK', PA: 'PAN', PG: 'PNG', PY: 'PRY', PE: 'PER', PH: 'PHL',
    PL: 'POL', PT: 'PRT', QA: 'QAT', RO: 'ROU', RU: 'RUS', RW: 'RWA', SA: 'SAU',
    SN: 'SEN', RS: 'SRB', SL: 'SLE', SG: 'SGP', SK: 'SVK', SI: 'SVN', SO: 'SOM',
    ZA: 'ZAF', SS: 'SSD', ES: 'ESP', LK: 'LKA', SD: 'SDN', SR: 'SUR', SE: 'SWE',
    CH: 'CHE', SY: 'SYR', TW: 'TWN', TJ: 'TJK', TZ: 'TZA', TH: 'THA', TL: 'TLS',
    TG: 'TGO', TT: 'TTO', TN: 'TUN', TR: 'TUR', TM: 'TKM', UG: 'UGA', UA: 'UKR',
    AE: 'ARE', GB: 'GBR', US: 'USA', UY: 'URY', UZ: 'UZB', VE: 'VEN', VN: 'VNM',
    YE: 'YEM', ZM: 'ZMB', ZW: 'ZWE',
};

// Fallback: match topojson geography names → alpha-3 when a location has no `country` field
// Matches topojson geography names → alpha-3. Includes Natural Earth variants
// (e.g. "United States of America") alongside common short names.
const COUNTRY_NAME_TO_ALPHA3: Record<string, string> = {
    'united states': 'USA', 'united states of america': 'USA',
    'russia': 'RUS', 'russian federation': 'RUS',
    'china': 'CHN',
    'iran': 'IRN', 'india': 'IND',
    'germany': 'DEU', 'france': 'FRA', 'israel': 'ISR',
    'australia': 'AUS', 'ukraine': 'UKR',
    'united kingdom': 'GBR', 'great britain': 'GBR',
    'canada': 'CAN', 'brazil': 'BRA', 'japan': 'JPN',
    'south korea': 'KOR', 'republic of korea': 'KOR',
    'north korea': 'PRK', 'dem. rep. korea': 'PRK',
    'pakistan': 'PAK', 'turkey': 'TUR',
    'saudi arabia': 'SAU', 'vietnam': 'VNM', 'indonesia': 'IDN',
    'thailand': 'THA', 'taiwan': 'TWN', 'bangladesh': 'BGD',
    'nigeria': 'NGA', 'south africa': 'ZAF', 'mexico': 'MEX',
    'philippines': 'PHL', 'poland': 'POL', 'netherlands': 'NLD',
    'sweden': 'SWE', 'switzerland': 'CHE', 'spain': 'ESP',
    'italy': 'ITA', 'belgium': 'BEL', 'austria': 'AUT',
    'singapore': 'SGP', 'malaysia': 'MYS', 'egypt': 'EGY',
    'afghanistan': 'AFG', 'iraq': 'IRQ', 'syria': 'SYR',
    'kazakhstan': 'KAZ', 'georgia': 'GEO', 'belarus': 'BLR',
    'romania': 'ROU', 'czech republic': 'CZE', 'czechia': 'CZE', 'hungary': 'HUN',
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
    'bosnia': 'BIH', 'bosnia and herzegovina': 'BIH', 'montenegro': 'MNE',
    'cuba': 'CUB', 'ecuador': 'ECU', 'bolivia': 'BOL', 'paraguay': 'PRY',
    'uruguay': 'URY', 'costa rica': 'CRI', 'guatemala': 'GTM',
    'honduras': 'HND', 'nicaragua': 'NIC', 'panama': 'PAN',
    'dominican republic': 'DOM', 'jamaica': 'JAM', 'haiti': 'HTI',
    'zambia': 'ZMB', 'zimbabwe': 'ZWE', 'mozambique': 'MOZ',
    'angola': 'AGO', 'cameroon': 'CMR', 'senegal': 'SEN',
    'ivory coast': 'CIV', "côte d'ivoire": 'CIV', 'uganda': 'UGA', 'rwanda': 'RWA',
    'dr congo': 'COD', 'democratic republic of the congo': 'COD',
    'republic of the congo': 'COG',
};

const ALPHA3_TO_DISPLAY_NAME: Record<string, string> = Object.fromEntries(
    Object.entries(COUNTRY_NAME_TO_ALPHA3).map(([name, iso3]) => [
        iso3,
        name.replace(/\b\w/g, (c) => c.toUpperCase()),
    ])
);

/** Returns a heatmap fill color scaled relative to the highest count across all countries. */
function getCountryColor(count: number, maxCount: number): string {
    if (!count || count === 0) return COLORS.heatmapBase;
    const intensity = count / maxCount;
    if (intensity < 0.2) return COLORS.heatmapLow;
    if (intensity < 0.5) return COLORS.heatmapMedium;
    if (intensity < 0.8) return COLORS.heatmapHigh;
    return COLORS.heatmapCritical;
}

/** Formats the hover tooltip string for a country that has relationship data. */
function buildTooltipLabel(displayName: string, count: number): string {
    return `${displayName}: ${count} target relationship${count !== 1 ? 's' : ''}`;
}

export default function Heatmap() {
    const [countryData, setCountryData] = useState<CountryMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // AbortController lets us cancel the fetch if the component unmounts mid-request,
        // preventing state updates on an unmounted component.
        const controller = new AbortController();

        api.geoHeatmap('targets', controller.signal)
            .then((rows) => {
                // The .then callback may still fire even after abort — bail out early.
                if (controller.signal.aborted) return;

                const aggregated: CountryMap = {};

                rows.forEach(({ country, location_name, relationship_type, count }) => {
                    // Primary: use the alpha-2 country code from the STIX location object.
                    // Fallback: match by location name for objects that omit the country field.
                    let iso3: string | undefined;
                    if (country) iso3 = ALPHA2_TO_ALPHA3[country.toUpperCase()];
                    if (!iso3 && location_name) iso3 = COUNTRY_NAME_TO_ALPHA3[location_name.toLowerCase()];
                    if (!iso3) return; // skip rows we can't place on the map

                    if (!aggregated[iso3]) {
                        // Prefer the canonical display name from our lookup; fall back to
                        // the location's own name, then the alpha-3 code as a last resort.
                        aggregated[iso3] = {
                            name: ALPHA3_TO_DISPLAY_NAME[iso3] || location_name || iso3,
                            count: 0,
                            breakdown: {},
                        };
                    }
                    aggregated[iso3].count += count;
                    aggregated[iso3].breakdown[relationship_type] =
                        (aggregated[iso3].breakdown[relationship_type] ?? 0) + count;
                });

                setCountryData(aggregated);
            })
            .catch((e) => {
                if (!controller.signal.aborted) setError(String(e));
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        // Cancel the in-flight request when the component unmounts.
        return () => controller.abort();
    }, []);

    if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><LoadingSpinner /></Box>;
    if (error) return <ErrorDisplay message={error} />;

    const countValues = Object.values(countryData).map((c) => c.count);
    const maxCount = countValues.length > 0 ? Math.max(1, ...countValues) : 1;

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
                                const matchedIso3 = COUNTRY_NAME_TO_ALPHA3[geoName.toLowerCase()];
                                const entry = matchedIso3 ? countryData[matchedIso3] : null;
                                const count = entry ? entry.count : 0;
                                const displayName = entry ? entry.name : geoName;
                                const tooltipLabel = entry
                                    ? buildTooltipLabel(displayName, entry.count)
                                    : `${displayName}: no location relationships`;

                                return (
                                    <Tooltip key={geo.rsmKey} title={tooltipLabel} arrow>
                                        <Geography
                                            geography={geo}
                                            style={{
                                                default: {
                                                    fill: getCountryColor(count, maxCount),
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
                        HIGH
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
