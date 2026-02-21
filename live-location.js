// live-location.js: Live tracking + Nearby places for Ride & Roam
(function() {
  // UI Elements
  const startBtn = document.getElementById('start-tracking');
  const stopBtn = document.getElementById('stop-tracking');
  const statusBadge = document.getElementById('tracking-status');
  const infoDiv = document.getElementById('live-location-info');
  const errorDiv = document.getElementById('live-location-error');
  const mapDiv = document.getElementById('live-map');
  const backBtn = document.getElementById('back-dashboard');
  const backBtnBottom = document.getElementById('back-dashboard-bottom');
  const nearbyBtns = document.querySelectorAll('.nearby-btn');
  const nearbyLoading = document.getElementById('nearby-loading');
  const nearbyError = document.getElementById('nearby-error');
  const nearbyResults = document.getElementById('nearby-results');

  let map, marker, accuracyCircle, watchId = null, lastCoords = null, firstFix = true;
  let nearbyMarkers = [];

  // Helper: Format time
  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  }

  // Helper: Show status
  function setStatus(on) {
    statusBadge.textContent = on ? 'Tracking ON' : 'Tracking OFF';
    statusBadge.classList.toggle('on', on);
    statusBadge.classList.toggle('off', !on);
  }

  // Helper: Show info
  function showInfo(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    infoDiv.innerHTML =
      `Lat: <b>${latitude.toFixed(6)}</b><br>` +
      `Lng: <b>${longitude.toFixed(6)}</b><br>` +
      `Accuracy: <b>${Math.round(accuracy)}m</b><br>` +
      `Updated: <b>${formatTime(pos.timestamp)}</b>`;
  }

  // Helper: Show error
  function showError(msg) {
    errorDiv.textContent = msg;
  }
  function clearError() {
    errorDiv.textContent = '';
  }

  // Helper: Show/hide loading
  function showNearbyLoading(msg) {
    nearbyLoading.textContent = msg || 'Loading...';
    nearbyLoading.style.display = 'block';
  }
  function hideNearbyLoading() {
    nearbyLoading.style.display = 'none';
  }
  function showNearbyError(msg) {
    nearbyError.textContent = msg;
    nearbyError.style.display = 'block';
  }
  function hideNearbyError() {
    nearbyError.textContent = '';
    nearbyError.style.display = 'none';
  }

  // Helper: Haversine distance (meters)
  function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Helper: Place type to Overpass query
  function getOverpassQuery(type, lat, lng) {
    let query = '';
    let radius = 4000;
    if (type === 'hospital') {
      query = `node["amenity"="hospital"](around:${radius},${lat},${lng});`;
    } else if (type === 'police') {
      query = `node["amenity"="police"](around:${radius},${lat},${lng});`;
    } else if (type === 'charging') {
      query = `node["amenity"="charging_station"](around:${radius},${lat},${lng});`;
    }
    return `[out:json][timeout:25];(${query});out body;`;
  }

  // Helper: Marker icon by type
  function getMarkerOptions(type) {
    const color = {
      hospital: '#e53935',
      police: '#1976d2',
      charging: '#43a047'
    }[type] || '#0288d1';
    return {
      icon: L.divIcon({
        className: 'nearby-marker-icon',
        html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:2px solid #fff;"></div>`
      })
    };
  }

  // Helper: Add nearby marker
  function addNearbyMarker(place, type) {
    const marker = L.marker([place.lat, place.lon], getMarkerOptions(type)).addTo(map);
    marker.bindPopup(`<b>${place.name || 'Unnamed'}</b><br>${place.address || ''}<br>${place.distance}m away`);
    marker.placeId = place.id;
    nearbyMarkers.push(marker);
    return marker;
  }

  // Helper: Add result card
  function addNearbyCard(place, marker, type) {
    const card = document.createElement('div');
    card.className = 'nearby-result-card';
    card.innerHTML = `
      <div class="nearby-result-title">${place.name || 'Unnamed'}</div>
      <div class="nearby-result-type">${type.replace(/^[a-z]/, c => c.toUpperCase())}</div>
      <div class="nearby-result-distance">${place.distance} meters away</div>
      <div class="nearby-result-address">${place.address || ''}</div>
      <a class="nearby-result-link" href="https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}" target="_blank">Open in Google Maps</a>
    `;
    card.addEventListener('click', function() {
      marker.openPopup();
      map.setView([place.lat, place.lon], 17);
    });
    nearbyResults.appendChild(card);
  }

  // Helper: Clear nearby markers/results
  function clearNearby() {
    nearbyMarkers.forEach(m => map.removeLayer(m));
    nearbyMarkers = [];
    nearbyResults.innerHTML = '';
  }

  // Fetch nearby places
  function fetchNearby(type, lat, lng) {
    showNearbyLoading('Searching nearby...');
    hideNearbyError();
    clearNearby();
    // Overpass API
    const query = getOverpassQuery(type, lat, lng);
    fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'data=' + encodeURIComponent(query)
    })
    .then(res => res.json())
    .then(data => {
      hideNearbyLoading();
      if (!data.elements || !data.elements.length) {
        showNearbyError('No results found nearby.');
        return;
      }
      // Process
      let results = data.elements.map(el => {
        let address = '';
        if (el.tags) {
          address = [el.tags['addr:street'], el.tags['addr:place'], el.tags['addr:city'], el.tags['addr:state']].filter(Boolean).join(', ');
        }
        return {
          id: el.id,
          name: el.tags && (el.tags.name || el.tags.operator || el.tags.brand) || '',
          lat: el.lat,
          lon: el.lon,
          address,
          distance: Math.round(getDistance(lat, lng, el.lat, el.lon))
        };
      });
      results.sort((a,b) => a.distance-b.distance);
      results = results.slice(0, 25);
      results.forEach(place => {
        const marker = addNearbyMarker(place, type);
        addNearbyCard(place, marker, type);
      });
    })
    .catch(err => {
      hideNearbyLoading();
      showNearbyError('Network error or Overpass rate limit. Try again.');
    });
  }

  // Geolocation success
  function onPosition(pos) {
    clearError();
    showInfo(pos);
    const { latitude, longitude, accuracy } = pos.coords;
    lastCoords = {lat: latitude, lng: longitude, accuracy, timestamp: pos.timestamp};
    if (!map) {
      map = L.map(mapDiv).setView([latitude, longitude], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);
      marker = L.marker([latitude, longitude]).addTo(map);
      accuracyCircle = L.circle([latitude, longitude], {radius: accuracy, color: '#1976d2', fillOpacity: 0.15}).addTo(map);
      firstFix = false;
    } else {
      marker.setLatLng([latitude, longitude]);
      accuracyCircle.setLatLng([latitude, longitude]);
      accuracyCircle.setRadius(accuracy);
    }
  }

  // Geolocation error
  function onError(err) {
    let msg = '';
    switch (err.code) {
      case 1: msg = 'Permission denied. Please allow location access.'; break;
      case 2: msg = 'Position unavailable. Try again later.'; break;
      case 3: msg = 'Location request timed out.'; break;
      default: msg = 'Unknown error.';
    }
    showError(msg);
  }

  // Start tracking
  function startTracking() {
    if (!('geolocation' in navigator)) {
      showError('Geolocation not supported by your browser.');
      return;
    }
    clearError();
    setStatus(true);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000
    });
  }

  // Stop tracking
  function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    setStatus(false);
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  // Event listeners
  startBtn.addEventListener('click', startTracking);
  stopBtn.addEventListener('click', stopTracking);
  backBtn.addEventListener('click', function() {
    window.location.href = 'dashboard.html';
  });
  if (backBtnBottom) {
    backBtnBottom.addEventListener('click', function() {
      window.location.href = 'dashboard.html';
    });
  }
  nearbyBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      if (!lastCoords) {
        showNearbyError('Location not available. Start tracking first.');
        return;
      }
      fetchNearby(btn.dataset.type, lastCoords.lat, lastCoords.lng);
    });
  });

  // Initial state
  setStatus(false);
  infoDiv.innerHTML = '';
  errorDiv.textContent = '';
  hideNearbyLoading();
  hideNearbyError();
  clearNearby();

  // Responsive map container
  function resizeMap() {
    if (mapDiv) {
      mapDiv.style.height = (window.innerWidth < 600 ? '200px' : '320px');
      if (map) map.invalidateSize();
    }
  }
  window.addEventListener('resize', resizeMap);
  resizeMap();
})();
