const lokasiUTBK = {
    1: { nama: "LPTIK", lat: -3.758386, lng: 102.274915 },
    2: { nama: "Kedokteran", lat: -3.756357, lng: 102.277506 },
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

const transportSpeeds = {
    motor: 40,
    car: 30,
    bike: 15,
    foot: 5
};

const transportIcons = {
    motor: '🏍️',
    car: '🚗',
    bike: '🚲',
    foot: '🚶'
};

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('app-container').classList.add('visible');
    initMap();
    setupEventListeners();
});

function initMap() {
    map = L.map('map').setView([-3.7585, 102.2735], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const batasUnib = L.polygon([
        [-3.7546,102.2779], [-3.7543,102.2773], [-3.7541,102.2765],
        [-3.7540,102.2756], [-3.7540,102.2746], [-3.7541,102.2736],
        [-3.7543,102.2727], [-3.7546,102.2717], [-3.7549,102.2708],
        [-3.7553,102.2699], [-3.7558,102.2692], [-3.7564,102.2686],
        [-3.7571,102.2681], [-3.7579,102.2677], [-3.7588,102.2674],
        [-3.7597,102.2672], [-3.7606,102.2673], [-3.7614,102.2677],
        [-3.7620,102.2684], [-3.7624,102.2693], [-3.7626,102.2703],
        [-3.7627,102.2714], [-3.7626,102.2725], [-3.7624,102.2736],
        [-3.7621,102.2746], [-3.7616,102.2755], [-3.7610,102.2763],
        [-3.7603,102.2770], [-3.7594,102.2775], [-3.7584,102.2779],
        [-3.7574,102.2780], [-3.7564,102.2780], [-3.7554,102.2779]
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
        showAlternatives: true,
        fitSelectedRoutes: true,
        createMarker: function() { return null; }
    }).addTo(map);

    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        
        document.getElementById('routeDistance').textContent = (summary.totalDistance / 1000).toFixed(2) + ' km';
        document.getElementById('routeDuration').textContent = Math.round(summary.totalTime / 60) + ' mnt';
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

function selectUtbkLocation(id) {
    document.getElementById('pilihGedung').value = id;
    updateRoute();

    document.querySelectorAll('.utbk-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.utbk-item[data-id="${id}"]`).classList.add('active');
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
    document.querySelectorAll('.utbk-item').forEach(item => {
        item.classList.remove('active');
    });
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