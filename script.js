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

let map;
let routingControl;
let userLocation = null;
let currentLocationMarker = null;
let currentTransportMode = 'motor';
let routeColors = {
    car: '#ff4444',
    motor: '#4444ff',
    bike: '#44aa44',
    foot: '#aa44aa'
};

setTimeout(()=>{
map.invalidateSize();
},200);

const transportSpeeds = {
    motor: 40,
    car: 30,
    bike: 15,
    foot: 5
};

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('app-container').classList.add('visible');
    initMap();
    setupEventListeners();
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
        fitSelectedRoutes: true
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

        document.getElementById('routeInfo').style.display = 'block';

    });
    const osm2 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    new L.Control.MiniMap(osm2, {
        toggleDisplay: true,
        position: 'bottomright'
    }).addTo(map);

    L.Control.geocoder({
        defaultMarkGeocode: false
    }).on('markgeocode', function(e) {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
            bbox.getSouthEast(),
            bbox.getNorthEast(),
            bbox.getNorthWest(),
            bbox.getSouthWest()
        ]).addTo(map);
        map.fitBounds(poly.getBounds());
    }).addTo(map);

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

function locateUser() {
    showLoading(true);
    
    if (!navigator.geolocation) {
        showNotification('Browser Anda tidak mendukung geolokasi', true);
        showLoading(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setCurrentLocation(lat, lng);
            showNotification('Lokasi berhasil dideteksi!');
            showLoading(false);
        },
        function(error) {
            showNotification('Gagal mendeteksi lokasi. Aktifkan GPS!', true);
            showLoading(false);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
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
    if (currentLocationMarker) {
        map.removeLayer(currentLocationMarker);
        currentLocationMarker = null;
    }
    userLocation = null;
    document.getElementById('currentLocationInput').value = '';
    document.getElementById('latValue').textContent = '-';
    document.getElementById('lngValue').textContent = '-';
    routingControl.setWaypoints([]);
    document.getElementById('routeInfo').style.display = 'none';
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
        document.getElementById('routeInfo').style.display = 'none';
        return;
    }

    const destination = lokasiUTBK[destinationId];
    routingControl.setWaypoints([
        userLocation,
        L.latLng(destination.lat, destination.lng)
    ]);

    map.setView([destination.lat, destination.lng], 17);
    showNotification(`Rute ke ${destination.nama} dihitung!`);
}

function updateRouteColor() {
    const newColor = routeColors[currentTransportMode];
    routingControl.options.lineOptions.styles = [{ color: newColor, weight: 6 }];
}

function resetMap() {
    map.setView([-3.7585, 102.2735], 16);
    routingControl.setWaypoints([]);
    document.getElementById('pilihGedung').value = "";
    document.getElementById('routeInfo').style.display = 'none';
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
