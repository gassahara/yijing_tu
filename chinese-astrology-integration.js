/**
 * Chinese Astrology Integration Module v4.0
 * 
 * This module integrates the Chinese astrology client with the main Yi Jing application.
 * 
 * Usage:
 * 1. Include chinese-astrology-client.js and chinese-astrology.css
 * 2. Call initializeChineseAstrology() after DOM is ready
 * 3. The astrology data will be displayed in the container element
 */

// Configuration
const ASTROLOGY_CONFIG = {
    // Supabase function endpoint
    apiUrl: 'https://vflkhntzwfovnuyccxow.supabase.co/functions/v1/bazi-astrol/chinese-astrology',
    
    // Default location (New York) - will use browser geolocation if available
    defaultLocation: { latitude: 40.7128, longitude: -74.0060 },
    
    // Enable/disable features
    features: {
        ayanamsa: true,
        bazi: true,
        bagua: true,
        hetu: true,
        luoshu: true,
        lunarMansion: true,
        taiSui: true,
        qiMen: false, // Disabled by default (heavy calculation)
        comparison: true // Compare birth chart with current sky
    }
};

/**
 * Initialize Chinese astrology display
 * @param {string} containerId - ID of container element
 * @param {Object} options - Optional settings
 * @param {Date} options.birthDate - Birth date for comparison
 * @param {Object} options.birthLocation - Birth location {latitude, longitude}
 */
async function initializeChineseAstrology(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found`);
        return;
    }
    
    // Show loading state
    container.innerHTML = '<div class="loading">Calculating Chinese Astrology... 🐉</div>';
    
    try {
        // Get current location if not specified
        const location = await getLocation(options.location);
        
        // Build request
        const request = {
            date: new Date().toISOString(),
            location: location,
            includeQiMen: ASTROLOGY_CONFIG.features.qiMen,
            includeLunar: ASTROLOGY_CONFIG.features.lunarMansion,
            includeTaiSui: ASTROLOGY_CONFIG.features.taiSui
        };
        
        // Add birth date if provided
        if (options.birthDate) {
            request.birthDate = options.birthDate.toISOString();
            request.birthLocation = options.birthLocation || location;
        }
        
        // Fetch data with fallback
        let data;
        try {
            const response = await fetch(ASTROLOGY_CONFIG.apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            data = await response.json();
        } catch (error) {
            console.warn('API failed, using local calculation:', error);
            data = CHINESE_ASTROLOGY_API.calculateLocal(request);
        }
        
        // Render results
        ChineseAstrologyDisplay.render(data, container);
        
        return data;
        
    } catch (error) {
        console.error('Failed to load Chinese astrology:', error);
        container.innerHTML = `
            <div class="error">
                <h3>Error Loading Astrology Data</h3>
                <p>${error.message}</p>
                <button onclick="initializeChineseAstrology('${containerId}', ${JSON.stringify(options).replace(/"/g, '&quot;')})">Retry</button>
            </div>
        `;
    }
}

/**
 * Get user's location with fallback
 */
async function getLocation(overrideLocation) {
    if (overrideLocation) return overrideLocation;
    
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                }),
                () => resolve(ASTROLOGY_CONFIG.defaultLocation),
                { timeout: 5000 }
            );
        } else {
            resolve(ASTROLOGY_CONFIG.defaultLocation);
        }
    });
}

/**
 * Quick function to show current sky influence
 * @param {string} containerId - Target container
 */
async function showCurrentSky(containerId) {
    return initializeChineseAstrology(containerId);
}

/**
 * Compare birth chart with current sky
 * @param {string} containerId - Target container
 * @param {Date} birthDate - Birth date
 * @param {Object} birthLocation - Birth location {latitude, longitude}
 */
async function showBirthComparison(containerId, birthDate, birthLocation) {
    return initializeChineseAstrology(containerId, {
        birthDate: birthDate,
        birthLocation: birthLocation
    });
}

// Auto-initialize if container exists on page load
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('chinese-astrology-container');
    if (container) {
        initializeChineseAstrology('chinese-astrology-container');
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeChineseAstrology,
        showCurrentSky,
        showBirthComparison,
        ASTROLOGY_CONFIG
    };
}
