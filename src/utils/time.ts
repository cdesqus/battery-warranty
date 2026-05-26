export const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    try {
        // Parse date. PostgreSQL strings like "2026-05-26 09:21:25.123+00" parse cleanly
        const cleanStr = dateStr.includes(' ') && !dateStr.includes('T')
            ? dateStr.replace(' ', 'T').replace(/\.\d+/, '') // Format to ISO format if plain Postgres representation
            : dateStr;
            
        const d = new Date(cleanStr);
        if (isNaN(d.getTime())) return 'Just now';
        
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        
        // Handle negative differences (clock drift) or extremely small margins
        if (diffSec < 5) return 'Just now';
        if (diffSec < 60) return `${diffSec}s ago`;
        
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        
        const diffDays = Math.floor(diffHr / 24);
        return `${diffDays}d ago`;
    } catch (e) {
        return 'Just now';
    }
};
