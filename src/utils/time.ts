export const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            
            if (diffSec < 5) return 'Just now';
            if (diffSec < 60) return `${diffSec}s ago`;
            
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr}h ago`;
            
            const diffDays = Math.floor(diffHr / 24);
            return `${diffDays}d ago`;
        }

        // Fallback for odd PostgreSQL strings like "2026-05-26 09:21:25.123+00"
        let cleanStr = dateStr.replace(' ', 'T');
        if (/[+-]\d{2}$/.test(cleanStr)) {
            cleanStr = cleanStr + ':00';
        }
        const dFallback = new Date(cleanStr);
        if (!isNaN(dFallback.getTime())) {
            const now = new Date();
            const diffMs = now.getTime() - dFallback.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            
            if (diffSec < 5) return 'Just now';
            if (diffSec < 60) return `${diffSec}s ago`;
            
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr}h ago`;
            
            const diffDays = Math.floor(diffHr / 24);
            return `${diffDays}d ago`;
        }

        return 'Just now';
    } catch (e) {
        return 'Just now';
    }
};
