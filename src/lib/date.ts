export function toStockholmDate(date: Date = new Date()): Date {
    // Convert a date object to Stockholm timezone representation
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Stockholm',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const y = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const mo = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const d = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const mi = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const s = parseInt(parts.find(p => p.type === 'second')?.value || '0');
    return new Date(y, mo, d, h, mi, s);
}

export function getStockholmDate(dateStr: string, timeStr: string): Date {
    const targetStr = `${dateStr}T${timeStr}:00`;
    let utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
    for (let i = 0; i < 3; i++) {
        const formatter = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Europe/Stockholm',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(utcDate);
        const y = parts.find(p => p.type === 'year')?.value;
        const mo = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        const h = parts.find(p => p.type === 'hour')?.value;
        const mi = parts.find(p => p.type === 'minute')?.value;
        const s = parts.find(p => p.type === 'second')?.value;
        
        const currentStockholmStr = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
        const diffMs = new Date(`${targetStr}Z`).getTime() - new Date(`${currentStockholmStr}Z`).getTime();
        if (diffMs === 0) break;
        utcDate = new Date(utcDate.getTime() + diffMs);
    }
    return utcDate;
}

