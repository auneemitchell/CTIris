import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { COLORS } from '../constants/themeColors';

function attackSampleData(
    id: string,
    name: string,
    description: string,
) {
    return { id, name, description };
}

const rows = [
    attackSampleData('T1566', 'Phishing', 'Initial access via phishing'),
    attackSampleData('T1059', 'Command Shell', 'Execute commands'),
    attackSampleData('T1003', 'Credential Dumping', 'Steal credentials'),
];

export default function TableSample() {
    return (
        <TableContainer sx={{ backgroundColor: COLORS.headerBackground, border: '2px solid rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <Table sx={{ minWidth: 400, maxHeight: 400, overflow: 'auto', backgroundColor: 'transparent', 
                '& .MuiTableCell-root': {borderBottom: '1px solid rgba(255,255,255,0.08)'}, }} size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ color: COLORS.textSecondary, fontWeight: 'bold', fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase' }}>Technique ID</TableCell>
                        <TableCell sx={{ color: COLORS.textSecondary, fontWeight: 'bold', fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase' }}>Name</TableCell>
                        <TableCell sx={{ color: COLORS.textSecondary, fontWeight: 'bold', fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase' }}>Description</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r) => (
                        <TableRow key={r.name} sx={{ '&:hover': {backgroundColor: 'rgba(0, 255, 255, 0.05)', cursor: 'pointer' }}}>
                            <TableCell sx={{ color: COLORS.textPrimary, fontSize: '12px' }}>{r.id}</TableCell>
                            <TableCell sx={{ color: COLORS.textPrimary, fontSize: '12px' }}>{r.name}</TableCell>
                            <TableCell sx={{ color: COLORS.textPrimary, fontSize: '12px' }}>{r.description}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
};