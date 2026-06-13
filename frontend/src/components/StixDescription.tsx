import React from 'react';
import { Box, Link } from '@mui/material';
import { COLORS } from '../constants/themeColors';

interface StixDescriptionProps {
    text: string;
}


function renderDescriptionText(text: string) {
    const tokenRegex = /<code>(.*?)<\/code>|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gs;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
        const matchIndex = match.index;
        if (matchIndex > lastIndex) elements.push(text.substring(lastIndex, matchIndex));

        if (match[1] !== undefined) {
            elements.push(
                <Box
                    key={matchIndex}
                    component="code"
                    sx={{
                        fontFamily: 'monospace',
                        backgroundColor: COLORS.iconHoverFooter,
                        borderRadius: '3px',
                        padding: '1px 5px',
                        fontSize: '0.875em',
                        color: COLORS.textPrimary,
                    }}
                >
                    {match[1]}
                </Box>
            );
        } else {
            const linkText = match[2];
            const url = match[3];
            elements.push(
                <Link
                    key={url + matchIndex}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                        color: COLORS.textTertiary,
                        textDecoration: 'underline',
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': { color: COLORS.textPrimary }
                    }}
                >
                    {linkText}
                </Link>
            );
        }
        lastIndex = tokenRegex.lastIndex;
    }
    if (lastIndex < text.length) elements.push(text.substring(lastIndex));
    return elements;
}

// Strip out the citations entirely
function stripCitations(text: string): string {
    const citationRegex = /\(Citation:\s*([^)]+)\)/g;
    return text.replace(citationRegex, '').replace(/\s+/g, ' ').trim();
}

export default function StixDescription({ text }: StixDescriptionProps) {
    const cleanedText = stripCitations(text);

    return (
        <Box>
            {renderDescriptionText(cleanedText)}
        </Box>
    );
}