class Astrology {
    static getLunarMansion(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const springEquinoxDay = 79;
        let sunLongitude = ((dayOfYear - springEquinoxDay) / 365.25) * 360;
        if (sunLongitude < 0) sunLongitude += 360;

        for (let mansion of LUNAR_MANSIONS) {
            if (sunLongitude >= mansion.startDeg && sunLongitude < mansion.endDeg) {
                return mansion;
            }
        }
        return LUNAR_MANSIONS[0];
    }

    static getMoonPhase(date) {
        const lunarCycle = 29.53058867;
        const known = new Date('2000-01-06');
        const diff = (date - known) / (1000 * 60 * 60 * 24);
        const phase = (diff % lunarCycle) / lunarCycle;

        if (phase < 0.0625 || phase >= 0.9375) return { icon: '\u25CF', name: { en: 'New Moon', es: 'Luna Nueva', it: 'Luna Nuova', zh: '新月' } };
        if (phase < 0.1875) return { icon: '\u263D', name: { en: 'Waxing Crescent', es: 'Creciente', it: 'Crescente', zh: '眉月' } };
        if (phase < 0.3125) return { icon: '\u25D0', name: { en: 'First Quarter', es: 'Cuarto Creciente', it: 'Primo Quarto', zh: '上弦月' } };
        if (phase < 0.4375) return { icon: '\u25D1', name: { en: 'Waxing Gibbous', es: 'Gibosa Creciente', it: 'Gibbosa Crescente', zh: '盈凸月' } };
        if (phase < 0.5625) return { icon: '\u25CB', name: { en: 'Full Moon', es: 'Luna Llena', it: 'Luna Piena', zh: '满月' } };
        if (phase < 0.6875) return { icon: '\u25D1', name: { en: 'Waning Gibbous', es: 'Gibosa Menguante', it: 'Gibbosa Calante', zh: '亏凸月' } };
        if (phase < 0.8125) return { icon: '\u25D0', name: { en: 'Last Quarter', es: 'Cuarto Menguante', it: 'Ultimo Quarto', zh: '下弦月' } };
        return { icon: '\u263E', name: { en: 'Waning Crescent', es: 'Menguante', it: 'Calante', zh: '残月' } };
    }

    static getLunarDate(gregorianDate) {
        const year = gregorianDate.getFullYear();
        const lunarNewYearDates = {
            2024: { month: 2, day: 10 },
            2025: { month: 1, day: 29 },
            2026: { month: 2, day: 17 }
        };
        const lny = lunarNewYearDates[year] || { month: 1, day: 1 };
        const lnyDate = new Date(year, lny.month - 1, lny.day);
        const daysSince = Math.floor((gregorianDate - lnyDate) / (1000 * 60 * 60 * 24));

        if (daysSince < 0) {
            return { year: year - 1, month: 12, day: 30 + daysSince };
        }

        const lunarMonth = Math.floor(daysSince / 29.5) + 1;
        const lunarDay = Math.floor(daysSince % 29.5) + 1;

        return { year, month: Math.min(lunarMonth, 12), day: Math.min(lunarDay, 30) };
    }

    static getHourBranch(hour, minute, ziMethod = 'early') {
        if (ziMethod === 'early') {
            if (hour === 23) return { branch: 12, dayChange: 0 };
        } else {
            if (hour === 23) return { branch: 1, dayChange: 1 };
        }
        const hourBranches = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12];
        return { branch: hourBranches[hour] || 1, dayChange: 0 };
    }

    static calculateLifePalace(month, hour) {
        let result = (month - hour) % 12;
        if (result <= 0) result += 12;
        return result;
    }

    static calculateBodyPalace(lifePalace, hour) {
        let result = (lifePalace + hour) % 12;
        if (result === 0) result = 12;
        return result;
    }

    static getDayStem(year, month, day) {
        const c = Math.floor(year / 100);
        const y = year % 100;
        const m = month;
        const d = day;
        let g = 4 * c + Math.floor(c / 4) + 5 * y + Math.floor(y / 4) + Math.floor(3 * (m + 1) / 5) + d - 3;
        if (m % 2 === 0) g += 6;
        let stem = (g % 10);
        if (stem === 0) stem = 10;
        return stem;
    }

    static calculateHourStem(dayStemNum, hourBranchNum) {
        let result = (dayStemNum * 2 + hourBranchNum - 2) % 10;
        if (result === 0) result = 10;
        if (result < 0) result += 10;
        return result;
    }
}