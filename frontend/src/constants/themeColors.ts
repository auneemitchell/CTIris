export const COLORS = {
    backgroundDefault: '#090B0E',
    backgroundContainer: '#1a1e23',
    iconFooter: 'rgba(255,255,255,0.7)',
    iconHoverFooter: 'rgba(255,255,255,0.08)',
    backgroundFooter: '#1D182F',   //dark purple
    borderFooter: '#23184a',
    headerBackground: '#07131b',

    //TEXT COLORS
    textPrimary: '#f8f8ff',
    textSecondary: '#5359A8',
    textTertiary: '#415e8f',
    textQuaternary: '#A78BFA',
    textMuted: '#98a7d1',

    //STAT CARDS & HOVER STATES COLORS
    cardBackground: 'rgba(139, 92, 246, 0.15)',
    cardBorder: 'rgba(139, 92, 246, 0.3)',
    hoverBoxShadow: 'rgba(139, 92, 246, 0.5)',
    dataContainerBackground: 'rgba(255,255,255,0.07)',
    dataContainerBorder: 'rgba(255,255,255,0.05)',
    dataContainerBackgroundHover: '#07131b',
    dataContainerBorderHover: 'rgba(255, 255, 255, 0.15)',

    //HEATMAP COLORS
    heatmapBase: 'rgba(255, 255, 255, 0.04)',
    heatmapLow: 'rgba(228, 39, 39, 0.25)', 
    heatmapMedium: 'rgba(228, 39, 39, 0.5)', 
    heatmapHigh: 'rgba(228, 39, 39, 0.75)', 
    heatmapCritical: 'rgba(228, 39, 39, 1)',
    heatmapHover: 'rgba(139, 92, 246, 0.5)',
    heatmapLegendBorder: 'rgba(255,255,255,0.1)',
    heatmapStroke: 'rgba(255,255,255,0.03)',

    //POPUP MODAL COLORS
    modalBackground: 'rgba(0,0,0,0.15)',
    modalSecondaryBackground: 'rgba(255,255,255,0.02)',

    //PIE CHART COLORS
    chartColorOne: '#0088FE',
    chartColorTwo: '#00C49F',
    chartColorThree: '#FFBB28',
    chartColorFour: '#FF8042',
    chartColorFive: '#8884d8',
    chartColorSix: '#f837ab',
    chartColorSeven: '#ff0e22',
    chartColorEight: '#989898'

} as const;

export type ColorKey = keyof typeof COLORS;