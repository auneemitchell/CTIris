import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { Box, Typography } from '@mui/material';
import { api, type StixObject } from '../api/client';
import { COLORS } from '../constants/themeColors';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Approximate centroids for countries commonly referenced in CTI data (ISO alpha-2 → [lat, lon])
const CENTROIDS: Record<string, [number, number]> = {
  AF: [33.94, 67.71],  AU: [-25.27, 133.78], AT: [47.52, 14.55],
  BD: [23.68,  90.36], BE: [50.50,    4.47],  BR: [-14.24, -51.93],
  CA: [56.13, -106.35],CN: [35.86,  104.20],  CZ: [49.82,  15.47],
  DK: [56.26,   9.50], EG: [26.00,   30.00],  FI: [61.92,  25.75],
  FR: [46.23,   2.21], DE: [51.17,   10.45],  GH: [ 7.95,   1.02],
  HU: [47.16,  19.50], IN: [20.59,   78.96],  ID: [-0.79, 113.92],
  IR: [32.43,  53.69], IQ: [33.22,   43.68],  IL: [31.05,  34.85],
  IT: [41.87,  12.57], JP: [36.20,  138.25],  KZ: [48.02,  66.92],
  KE: [-0.02,  37.91], KP: [40.34,  127.51],  KR: [35.91, 127.77],
  LY: [26.34,  17.23], MY: [ 4.21,  101.98],  MX: [23.63, -102.55],
  MA: [31.79,  -7.09], MM: [21.92,   95.96],  NP: [28.39,  84.12],
  NL: [52.13,   5.29], NG: [ 9.08,    8.68],  NO: [60.47,   8.47],
  PK: [30.38,  69.35], PH: [12.88,  121.77],  PL: [51.92,  19.15],
  RO: [45.94,  24.97], RU: [61.52,  105.32],  SA: [23.89,  45.08],
  SG: [ 1.35, 103.82], ZA: [-30.56,  22.94],  ES: [40.46,  -3.75],
  SE: [60.13,  18.64], CH: [46.82,    8.23],  SY: [34.80,  38.10],
  TW: [23.70, 121.00], TH: [15.87,  100.99],  TN: [33.89,   9.54],
  TR: [38.96,  35.24], UA: [48.38,   31.17],  GB: [55.38,  -3.44],
  US: [37.09, -95.71], UZ: [41.30,   64.59],  VN: [14.06, 108.28],
  YE: [15.55,  48.52],
};

interface PlotPoint {
  stix_id: string;
  name: string;
  lon: number;
  lat: number;
  /** true = real coordinates, false = country centroid approximation */
  exact: boolean;
}

function toPlotPoint(obj: StixObject): PlotPoint | null {
  const p = obj.properties;
  const name = typeof p.name === 'string' ? p.name : obj.stix_id;
  const lat = p.latitude;
  const lon = p.longitude;
  if (typeof lat === 'number' && typeof lon === 'number') {
    return { stix_id: obj.stix_id, name, lat, lon, exact: true };
  }
  const code = typeof p.country === 'string' ? p.country.toUpperCase() : null;
  if (code && CENTROIDS[code]) {
    const [clat, clon] = CENTROIDS[code];
    return { stix_id: obj.stix_id, name, lat: clat, lon: clon, exact: false };
  }
  return null;
}

export default function LocationMap() {
  const [points, setPoints] = useState<PlotPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stix('location', 1000)
      .then(objs => {
        setTotal(objs.length);
        setPoints(objs.flatMap(o => { const p = toPlotPoint(o); return p ? [p] : []; }));
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const exactCount = points.filter(p => p.exact).length;
  const centroidCount = points.filter(p => !p.exact).length;
  const unresolved = total - points.length;

  return (
    <Box>
      {error && <ErrorDisplay message={error} />}
      <Typography variant="body2" sx={{ color: COLORS.textMuted, fontFamily: 'monospace', mb: 1 }}>
        {exactCount} exact &nbsp;·&nbsp; {centroidCount} country-level &nbsp;·&nbsp; {unresolved} unresolved
      </Typography>

      <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', bgcolor: '#090B0E' }}>
        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: 147 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1a1a2e"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={0.5}
                  style={{ outline: 'none', default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                />
              ))
            }
          </Geographies>

          {points.map(p => (
            <Marker key={p.stix_id} coordinates={[p.lon, p.lat]}>
              <title>{p.name}</title>
              {p.exact ? (
                <circle r={4} fill={COLORS.accentSecondary} fillOpacity={0.85} />
              ) : (
                <circle r={5} fill="none" stroke={COLORS.accentSecondary} strokeWidth={1.5} opacity={0.65} />
              )}
            </Marker>
          ))}
        </ComposableMap>
      </Box>

      {/* ── LEGEND ───────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2.5, mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <svg width={12} height={12}>
            <circle cx={6} cy={6} r={4} fill={COLORS.accentSecondary} fillOpacity={0.85} />
          </svg>
          <Typography variant="caption" sx={{ color: COLORS.textMuted, fontFamily: 'monospace' }}>
            exact coordinates
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <svg width={12} height={12}>
            <circle cx={6} cy={6} r={4} fill="none" stroke={COLORS.accentSecondary} strokeWidth={1.5} opacity={0.65} />
          </svg>
          <Typography variant="caption" sx={{ color: COLORS.textMuted, fontFamily: 'monospace' }}>
            country-level
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
