/* ====================================
   Peta UTBK - Universitas Bengkulu
   Theme: Dark Blue (#003f87) & Gold (#FFD700)
   ==================================== */

// UTBK Locations Database
const lokasiUTBK = {
    1: { nama: "LPTIK", lat: -3.758386, lng: 102.274915 },
    2: { nama: "Kedokteran", lat: -3.754998, lng: 102.277983 },
    3: { nama: "FEB", lat: -3.761844, lng: 102.268918 },
    4: { nama: "FISIPOL", lat: -3.759039, lng: 102.274534 },
    5: { nama: "FKIP", lat: -3.758193, lng: 102.275693 },
    6: { nama: "Lab SI", lat: -3.758557, lng: 102.277458 },
    7: { nama: "Perpustakaan", lat: -3.756781, lng: 102.274818 },
    8: { nama: "Hukum", lat: -3.760623, lng: 102.268333 }
};

// Global Variables
let map;
let routingControl;
let userLocation = null;
let currentLocationMarker = null;
let currentTransportMode = 'motor';
let voiceEnabled = false;
let locationWatchId = null;
let osmb = null;
let voiceLang = 'id-ID'; // Default language to Indonesian

// Route Colors - Updated for new theme
let routeColors = {
    car: '#003f87',
    motor: '#0052ad',
    bike: '#FFD700',
    foot: '#003f87'
};

// Transport Speeds (km/hour)
const transportSpeeds = {
    motor: 40,
    car: 30,
    bike: 15,
    foot: 5
};

// ====================================
// INITIALIZATION & SETUP
// ====================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize map jika di dalam app-container
    if (document.getElementById('app-container').classList.contains('visible')) {
        initMap();
        setupEventListeners();
    } else {
        // Setup map untuk di-initialize nanti saat startApp() dipanggil
        // Tambahkan listener untuk menginit map jika landing ditutup
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (document.getElementById('app-container').classList.contains('visible')) {
                    initMap();
                    setupEventListeners();
                    observer.disconnect();
                }
            });
        });
        observer.observe(document.getElementById('app-container'), {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

function initMap() {
    map = L.map('map',{
    zoomControl:false
    }).setView([-3.7585, 102.2735],16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // L.control.zoom({
    // position:'bottomright'
    // }).addTo(map);

    L.control.zoom({
    position: 'topleft'
    }).addTo(map);

    // (OSMBuildings removed due to 403 Forbidden error on anonymous API)

    const batasUnib = L.polygon([
 // Dimulai dari selatan (bawah) mengikuti garis merah
    [-3.76490, 102.27010], // Titik awal (selatan)
    
    // Naik ke timur laut mengikuti garis merah
    [-3.76430, 102.27150], 
    [-3.76340, 102.27330], 
    [-3.76230, 102.27520], 
    [-3.76120, 102.27690], 
    [-3.76000, 102.27850], // Titik di timur (dekat tulisan "UNIB formjand"?)
    
    // Garis merah melengkung ke utara
    [-3.75870, 102.27960], 
    [-3.75720, 102.28020], // Titik paling timur laut
    [-3.75560, 102.28010], 
    
    // Garis merah ke barat melintasi utara
    [-3.75420, 102.27930], 
    [-3.75320, 102.27800], 
    [-3.75260, 102.27650], // Area utara tengah
    [-3.75240, 102.27480], 
    
    // Garis merah turun ke barat daya
    [-3.75260, 102.27300], 
    [-3.75310, 102.27140], 
    [-3.75380, 102.27000], 
    
    // Garis merah ke barat (sisi Kandang Limun)
    [-3.75460, 102.26880], 
    [-3.75580, 102.26790], 
    [-3.75720, 102.26730], 
    [-3.75870, 102.26700], // Titik paling barat
    [-3.76020, 102.26690], 
    
    // Garis merah kembali ke selatan
    [-3.76160, 102.26720], 
    [-3.76290, 102.26780], 
    [-3.76380, 102.26860], 
    [-3.76440, 102.26940], 
    
    // Kembali ke titik awal
    [-3.76490, 102.27010]
        ], {
        color: "#0044ff",
        weight: 3,
        dashArray: "6",
        fillColor: "#66a3ff",
        fillOpacity: 0.18
    }).addTo(map).bindPopup("Kawasan Universitas Bengkulu");

    for (let id in lokasiUTBK) {
        const location = lokasiUTBK[id];
        const marker = L.marker([location.lat, location.lng]).addTo(map);
        marker.bindPopup(`
            <div class="popup-header">UTBK ${id} - ${location.nama}</div>
            <div class="popup-body">
                <p><strong>Lokasi Ujian</strong></p>
                <p>Lat: ${location.lat.toFixed(6)}</p>
                <p>Lng: ${location.lng.toFixed(6)}</p>
            </div>
        `);
    }
    routingControl = L.Routing.control({
        waypoints: [],
        lineOptions: {
            styles: [{ color: routeColors[currentTransportMode], weight: 6 }]
        },
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        show: false,
        collapsedClassName: 'leaflet-routing-collapsed',
        expandedClassName: 'leaflet-routing-expanded',
        waypointNameFallback: function(index) {
            return 'Waypoint ' + (index + 1);
        },
        reverseWaypoints: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        lineOptions: {
            styles: [{ color: routeColors[currentTransportMode], weight: 6, opacity: 0.8 }],
            extendToWaypoints: true,
            missingRouteTolerance: 2
        },
        altLineOptions: {
            styles: [{ color: '#ccc', weight: 5, opacity: 0.5, dashArray: '5, 10' }]
        }
    }).addTo(map);
    routingControl.on('routesfound', function(e) {

        const routes = e.routes;
        const summary = routes[0].summary;

        const distanceKm = summary.totalDistance / 1000;

        // ambil kecepatan berdasarkan transportasi
        const speed = transportSpeeds[currentTransportMode];

        // hitung waktu
        const estimatedTime = (distanceKm / speed) * 60;

        document.getElementById('routeDistance').textContent =
            distanceKm.toFixed(2) + ' km';

        document.getElementById('routeDuration').textContent =
            Math.round(estimatedTime) + ' mnt';

        document.getElementById('routeInfo').classList.add('visible');
        
        // Show routing instructions
        const instructions = routes[0].instructions;
        displayRouteInstructions(instructions);
        
        if (voiceEnabled && instructions && instructions.length > 0) {
            // Read out first instruction
            speakInstruction(`Rute ke tujuan ditemukan. ${instructions[0].text}`);
        }

        // Collapse sidebar on mobile to show map & instructions clearly
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.remove('active');
        }

    });
    const osm2 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    new L.Control.MiniMap(osm2, {
        toggleDisplay: true,
        position: 'bottomright'
    }).addTo(map);

    // Native Leaflet Compass
    map.addControl(new L.Control.Compass({
        position: 'topright',
        autoActive: true,
        showDigit: true
    }));

    // Map Legend
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<div class="legend-item"><span class="legend-dot unib-area"></span><span>Kawasan UNIB</span></div>';
        div.innerHTML += '<div class="legend-item"><span class="legend-dot route-car"></span><span>Rute (Mobil/Jalan/Kaki)</span></div>';
        div.innerHTML += '<div class="legend-item"><span class="legend-dot route-bike"></span><span>Rute (Sepeda)</span></div>';
        div.innerHTML += '<div class="legend-item"><span class="legend-dot utbk-spot"></span><span>Lokasi Ujian</span></div>';
        return div;
    };
    legend.addTo(map);

    locateUser();

    map.on('mousemove', function(e) {
        document.getElementById('coords').innerHTML = 
            'Lat: ' + e.latlng.lat.toFixed(6) + ' | Lng: ' + e.latlng.lng.toFixed(6);
    });

    document.getElementById('currentLocationInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLocation();
        }
    });

    // Ensure map size is correct
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

const currentLocationIcon = L.divIcon({
    className: 'current-location-marker',
    html: `<div style="
        width: 20px;
        height: 20px;
        background: #4285f4;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
    "></div>
    <style>
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
    </style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// ====================================
// LOCATION MANAGEMENT FUNCTIONS
// ====================================

function locateUser() {
    showLoading(true);
    
    if (!navigator.geolocation) {
        showNotification('Browser Anda tidak mendukung geolokasi', true);
        showLoading(false);
        return;
    }

    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
    }

    // Hindari loading tanpa henti jika sinyal GPS lemah
    const loadingTimeout = setTimeout(() => {
        showLoading(false);
        if (!userLocation) {
            showNotification('Sinyal GPS lambat. Silakan telusuri peta manual.', true);
        }
    }, 8000);

    locationWatchId = navigator.geolocation.watchPosition(
        function(position) {
            clearTimeout(loadingTimeout);
            showLoading(false); // Selalu sembunyikan loading setelah berhasil dapat lokasi
            
            // Only use highly accurate GPS points (< 50m)
            if (position.coords.accuracy > 50) {
                console.log("Accuracy too low:", position.coords.accuracy);
                // If it's the first time detecting, let's just use it anyway, but wait for better
                if (!userLocation) {
                    showNotification('Mendapatkan lokasi awal (akurasi rendah)...');
                } else {
                    return; // Skip inaccurate updates
                }
            }
            
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setCurrentLocation(lat, lng);
            
            if (position.coords.accuracy <= 50) {
                showNotification(`Lokasi akurat ditemukan (${Math.round(position.coords.accuracy)}m)`);
            }
        },
        function(error) {
            clearTimeout(loadingTimeout);
            showLoading(false);
            showNotification('Gagal mendeteksi lokasi. Aktifkan GPS dan izinkan lokasi!', true);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
}

function setCurrentLocation(lat, lng) {
    userLocation = L.latLng(lat, lng);

    if (currentLocationMarker) {
        map.removeLayer(currentLocationMarker);
    }

    currentLocationMarker = L.marker([lat, lng], {
        icon: currentLocationIcon,
        draggable: true
    }).addTo(map);

    currentLocationMarker.on('drag', function(e) {
        const newPos = e.target.getLatLng();
        userLocation = newPos;
        updateLocationDisplay();
        updateRoute();
    });

    currentLocationMarker.on('dragend', function(e) {
        const newPos = e.target.getLatLng();
        userLocation = newPos;
        updateLocationDisplay();
        updateRoute();
    });

    currentLocationMarker.bindPopup(`
        <div class="popup-header">Lokasi Anda</div>
        <div class="popup-body">
            <p>Geser marker untuk mengubah lokasi</p>
            <p style="font-size: 0.8rem; margin-top: 5px;">
                Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}
            </p>
        </div>
    `);

    map.setView([lat, lng], 17);
    document.getElementById('currentLocationInput').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    updateLocationDisplay();
    updateRoute();
}

function clearLocation() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    if (currentLocationMarker) {
        map.removeLayer(currentLocationMarker);
        currentLocationMarker = null;
    }
    userLocation = null;
    document.getElementById('currentLocationInput').value = '';
    document.getElementById('latValue').textContent = '-';
    document.getElementById('lngValue').textContent = '-';
    routingControl.setWaypoints([]);
    document.getElementById('routeInfo').classList.remove('visible');
    document.getElementById('routeInstructions').classList.remove('visible');
    
    // Matikan suara sementara saat lokasi direset
    window.speechSynthesis.cancel();
    
    showNotification('Lokasi direset');
}

function updateLocationDisplay() {
    if (userLocation) {
        document.getElementById('latValue').textContent = userLocation.lat.toFixed(6);
        document.getElementById('lngValue').textContent = userLocation.lng.toFixed(6);
    }
}

async function searchLocation() {
    const query = document.getElementById('currentLocationInput').value.trim();
    if (!query) {
        showNotification('Masukkan nama lokasi atau alamat', true);
        return;
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Bengkulu, Indonesia')}&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            setCurrentLocation(lat, lng);
            document.getElementById('currentLocationInput').value = result.display_name;
            showNotification('Lokasi ditemukan!');
        } else {
            showNotification('Lokasi tidak ditemukan', true);
        }
    } catch (error) {
        console.error(error);
        showNotification('Gagal mencari lokasi', true);
    }
}

// ====================================
// ROUTING & NAVIGATION FUNCTIONS
// ====================================

function setupEventListeners() {
    document.getElementById('pilihGedung').addEventListener('change', function() {
        updateRoute();
    });

    document.querySelectorAll('.transport-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.transport-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            currentTransportMode = this.dataset.mode;
            updateRouteColor();
            updateRoute();        

            if (routingControl.getWaypoints().length > 0) {
                routingControl.setWaypoints(routingControl.getWaypoints());
            }
        });
    });
}

function updateRoute() {
    const destinationId = document.getElementById('pilihGedung').value;

    if (!userLocation || !destinationId) {
        routingControl.setWaypoints([]);
        document.getElementById('routeInfo').classList.remove('visible');
        document.getElementById('routeInstructions').classList.remove('visible');
        return;
    }

    const destination = lokasiUTBK[destinationId];
    
    // Update destination header dengan nama gedung
    const destinationName = document.querySelector(`#pilihGedung option[value="${destinationId}"]`).textContent;
    const routeHeader = document.querySelector('#routeInfo h3');
    if (routeHeader) {
        routeHeader.innerHTML = `<i class="ri-route-line"></i> Rute ke ${destinationName}`;
    }
    
    // Sembunyikan instruksi lama sebelum yang baru muncul
    document.getElementById('routeInstructions').classList.remove('visible');
    
    routingControl.setWaypoints([
        userLocation,
        L.latLng(destination.lat, destination.lng)
    ]);

    // Fit bounds dengan padding untuk menampilkan rute keseluruhan
    setTimeout(() => {
        try {
            const bounds = L.latLngBounds([
                userLocation,
                L.latLng(destination.lat, destination.lng)
            ]);
            map.fitBounds(bounds, { padding: [100, 100] });
        } catch (e) {
            map.setView([destination.lat, destination.lng], 16);
        }
    }, 200);
    
    showNotification(`Rute ke ${destination.nama} dihitung!`);
}

function displayRouteInstructions(instructions) {
    const instructionsContainer = document.getElementById('routeInstructions');
    const instructionsList = document.getElementById('instructionsList');
    if (!instructionsContainer || !instructionsList) return;
    
    if (!instructions || instructions.length === 0) {
        instructionsContainer.classList.remove('visible');
        return;
    }
    
    let instructionsHTML = '';
    
    instructions.forEach((instruction, index) => {
        const iconMap = {
            'Head': 'ri-compass-line',
            'TurnAhead': 'ri-arrow-right-line',
            'TurnLeft': 'ri-arrow-left-line',
            'TurnRight': 'ri-arrow-right-line',
            'TurnSharpLeft': 'ri-corner-down-left-line',
            'TurnSharpRight': 'ri-corner-down-right-line',
            'Continue': 'ri-arrow-down-line',
            'ArrivesAt': 'ri-map-pin-2-line'
        };
        
        let translatedText = instruction.text || 'Lanjutkan';
        
        // Translation and icon matching logic
        if (voiceLang === 'id-ID') {
            // First pass for matching exact phrases
            if (translatedText.match(/Make a U-turn/ig)) {
                translatedText = 'Putar balik';
                instruction.type = 'Head'; // fallback trick, but map custom icon below
            } else if (translatedText.match(/Turn sharp right/ig)) {
                translatedText = 'Belok tajam ke kanan';
                instruction.type = 'TurnSharpRight';
            } else if (translatedText.match(/Turn sharp left/ig)) {
                translatedText = 'Belok tajam ke kiri';
                instruction.type = 'TurnSharpLeft';
            } else if (translatedText.match(/Turn slight right/ig)) {
                translatedText = 'Belok serong kanan';
                instruction.type = 'TurnRight';
            } else if (translatedText.match(/Turn slight left/ig)) {
                translatedText = 'Belok serong kiri';
                instruction.type = 'TurnLeft';
            } else if (translatedText.match(/Turn right/ig)) {
                translatedText = 'Belok kanan';
                instruction.type = 'TurnRight';
            } else if (translatedText.match(/Turn left/ig)) {
                translatedText = 'Belok kiri';
                instruction.type = 'TurnLeft';
            } else if (translatedText.match(/Head/ig)) {
                translatedText = translatedText.replace(/Head/ig, 'Menuju');
                instruction.type = 'Head';
            } else if (translatedText.match(/Continue/ig)) {
                translatedText = 'Lanjutkan lurus';
                instruction.type = 'Continue';
            } else if (translatedText.match(/You have arrived at your destination/ig)) {
                translatedText = 'Anda telah tiba di tujuan';
                instruction.type = 'ArrivesAt';
            }
            // General replacements
            translatedText = translatedText.replace(/on the left/ig, 'di sebelah kiri');
            translatedText = translatedText.replace(/on the right/ig, 'di sebelah kanan');
            translatedText = translatedText.replace(/straight/ig, 'lurus');
            translatedText = translatedText.replace(/onto/ig, 'ke jalan');
            translatedText = translatedText.replace(/and/ig, 'dan');
            translatedText = translatedText.replace(/destination/ig, 'Tujuan');
            translatedText = translatedText.replace(/at the roundabout/ig, 'di bundaran');
            translatedText = translatedText.replace(/take the/ig, 'ambil');
            translatedText = translatedText.replace(/exit/ig, 'keluar');
        }
        
        let icon = iconMap[instruction.type] || 'ri-arrow-down-line';
        if (translatedText.toLowerCase().includes('putar balik')) {
            icon = 'ri-arrow-go-back-line';
        } else if (translatedText.toLowerCase().includes('belok kanan') || translatedText.toLowerCase().includes('serong kanan') || translatedText.toLowerCase().includes('tajam ke kanan')) {
            icon = 'ri-arrow-right-line';
        } else if (translatedText.toLowerCase().includes('belok kiri') || translatedText.toLowerCase().includes('serong kiri') || translatedText.toLowerCase().includes('tajam ke kiri')) {
            icon = 'ri-arrow-left-line';
        } else if (translatedText.toLowerCase().includes('tiba') || translatedText.toLowerCase().includes('tujuan')) {
            icon = 'ri-map-pin-2-line';
        } else if (translatedText.toLowerCase().includes('lurus') || translatedText.toLowerCase().includes('menuju')) {
            icon = 'ri-arrow-up-line';
        }
        const distance = instruction.distance ? (instruction.distance / 1000).toFixed(2) : '0.00';
        
        // Escape quotes to prevent breaking HTML onClick
        const safeSpeakText = translatedText.replace(/'/g, "\\'");

        instructionsHTML += `
            <div class="instruction-item" onclick="speakInstruction('${safeSpeakText}')" style="cursor: pointer;" title="Klik untuk mendengar instruksi">
                <div class="instruction-icon"><i class="${icon}"></i></div>
                <div class="instruction-text">
                    <p>${translatedText}</p>
                    <span class="instruction-distance">${distance} km</span>
                </div>
                <div class="instruction-voice-icon" style="color: var(--primary-color); opacity: ${voiceEnabled ? '0.8' : '0.3'};">
                    <i class="ri-volume-up-line"></i>
                </div>
            </div>
        `;
    });
    
    instructionsList.innerHTML = instructionsHTML;
    instructionsContainer.classList.add('visible');
    
    // Hide the toggle button if the popup is visible
    const btnToggle = document.getElementById('btnToggleInstructions');
    if (btnToggle) btnToggle.style.display = 'none';
}

function toggleRouteInstructions() {
    const container = document.getElementById('routeInstructions');
    const btnToggle = document.getElementById('btnToggleInstructions');
    
    if (container.classList.contains('visible')) {
        container.classList.remove('visible');
        if (btnToggle) btnToggle.style.display = 'flex';
    } else {
        container.classList.add('visible');
        if (btnToggle) btnToggle.style.display = 'none';
    }
}

function updateRouteColor() {
    const newColor = routeColors[currentTransportMode];
    routingControl.options.lineOptions.styles = [{ color: newColor, weight: 6 }];
}

function resetMap() {
    map.setView([-3.7585, 102.2735], 16);
    routingControl.setWaypoints([]);
    document.getElementById('pilihGedung').value = "";
    document.getElementById('routeInfo').classList.remove('visible');
    document.getElementById('routeInstructions').classList.remove('visible');
    
    const btnToggle = document.getElementById('btnToggleInstructions');
    if (btnToggle) btnToggle.style.display = 'none';
    
    showNotification('Peta direset ke posisi awal');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show' + (isError ? ' error' : '');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ====================================
// TTS / VOICE FUNCTIONS
// ====================================
function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const btn = document.getElementById('btnVoice');
    const icon = document.getElementById('voiceIcon');
    const text = document.getElementById('voiceText');

    if (voiceEnabled) {
        btn.style.background = 'var(--success-color)';
        btn.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.4)';
        icon.className = 'ri-volume-up-line';
        text.textContent = 'Suara Aktif';
        showNotification('Navigasi Suara Diaktifkan');
        // Initialize speech synthesis (triggers permission on some browsers)
        speakInstruction('Suara sistem navigasi aktif');
    } else {
        btn.style.background = 'var(--primary-light)';
        btn.style.boxShadow = 'none';
        icon.className = 'ri-volume-mute-line';
        text.textContent = 'Suara Nonaktif';
        window.speechSynthesis.cancel();
        showNotification('Navigasi Suara Dinonaktifkan', true);
    }
}

function speakInstruction(text) {
    if (!voiceEnabled || !window.speechSynthesis) return;

    // Clean text (remove any HTML tags if present, or translation fixes)
    const cleanText = text.replace(/<(?:.|\n)*?>/gm, '');

    window.speechSynthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = voiceLang; 
    
    // Find matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.includes(voiceLang.split('-')[0]));
    if (targetVoice) utterance.voice = targetVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
}

function toggleLanguage() {
    if (voiceLang === 'id-ID') {
        voiceLang = 'en-US';
        showNotification('Bahasa Suara: Inggris (English)');
        document.getElementById('langText').textContent = 'ENG';
        if(voiceEnabled) speakInstruction('Voice navigation is now set to English');
    } else {
        voiceLang = 'id-ID';
        showNotification('Bahasa Suara: Indonesia');
        document.getElementById('langText').textContent = 'IND';
        if(voiceEnabled) speakInstruction('Suara sistem navigasi bahasa Indonesia');
    }
}

// Initialize voices eagerly if possible
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function() {
        window.speechSynthesis.getVoices();
    };
}

// ====================================
// LANDING PAGE FUNCTIONS
// ====================================

function startApp() {
    const landingPage = document.getElementById('landingPage');
    const appContainer = document.getElementById('app-container');
    
    if (landingPage) {
        landingPage.style.display = 'none';
    }
    if (appContainer) {
        appContainer.classList.add('visible');
    }
    
    // Auto-enable voice when user starts app (requires this user interaction to work in browsers)
    if (!voiceEnabled) {
        toggleVoice(); 
    }
}

function resetMapBearing() {
    if (map) {
        map.setView([-3.7585, 102.2735], 16);
        showNotification('Peta dikembalikan ke posisi awal');
    }
}
