import React from 'react';
import { Box, Link } from '@mui/material';
import { COLORS } from '../constants/themeColors';

interface StixDescriptionProps {
    text: string;
}


function renderDescriptionText(text: string) {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        const [, linkText, url] = match;
        const matchIndex = match.index;
        if (matchIndex > lastIndex) elements.push(text.substring(lastIndex, matchIndex));

        elements.push(
            <Link
                key={url + matchIndex}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{
                    color: COLORS.textTertiary ?? '#4fc3f7',
                    textDecoration: 'underline',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': { color: '#ffffff' }
                }}
            >
                {linkText}
            </Link>
        );
        lastIndex = linkRegex.lastIndex;
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