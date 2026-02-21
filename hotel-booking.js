// hotel-booking.js: Nearby hotels map using Leaflet + Overpass API + Nominatim
// No API keys required. Free and open-source.
// Please respect Nominatim usage: set a User-Agent header if possible (see comments).

(function() {
  // UI Elements
  const input = document.getElementById('hotel-search-input');
  const searchBtn = document.getElementById('hotel-search-btn');
  const locationBtn = document.getElementById('hotel-location-btn');
  const mapDiv = document.getElementById('hotel-map');
  const resultsDiv = document.getElementById('hotel-results');
  const loadingDiv = document.getElementById('hotel-booking-loading');
  const errorDiv = document.getElementById('hotel-booking-error');
  const typeSelect = document.getElementById('hotel-type-filter');
  const radiusSelect = document.getElementById('hotel-radius-filter');

  let map, markersLayer, centerCoords = null;

  // Helper: Show loading
  function showLoading(msg) {
    loadingDiv.textContent = msg || 'Loading...';
    loadingDiv.style.display = 'block';
  }
  function hideLoading() {
    loadingDiv.style.display = 'none';
  }

  // Helper: Show error
  function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
  }
  function hideError() {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  }

  // Helper: Clear results
  function clearResults() {
    resultsDiv.innerHTML = '';
  }

  // Helper: Haversine distance (meters)
  function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Helper: Center map
  function centerMap(lat, lng) {
    if (!map) {
      map = L.map(mapDiv).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);
    } else {
      map.setView([lat, lng], 14);
      markersLayer.clearLayers();
    }
  }

  // Helper: Add hotel marker
  function addHotelMarker(hotel, center) {
    const lat = hotel.lat, lng = hotel.lon;
    const marker = L.marker([lat, lng]).addTo(markersLayer);
    marker.bindPopup(`<b>${hotel.name || 'Unnamed'}</b><br>${hotel.type}<br>${hotel.distance}m away`);
    marker.hotelId = hotel.id;
    return marker;
  }

  // Helper: Add hotel card
  function addHotelCard(hotel, marker) {
    const card = document.createElement('div');
    card.className = 'hotel-result-card';
    card.innerHTML = `
      <div class="hotel-result-title">${hotel.name || 'Unnamed'}</div>
      <div class="hotel-result-type">${hotel.type}</div>
      <div class="hotel-result-distance">${hotel.distance} meters away</div>
      <button class="btn action hotel-book-now-btn" style="margin-top:12px;width:100%;">Book Now</button>
    `;
    card.addEventListener('click', function(e) {
      if (e.target.classList.contains('hotel-book-now-btn')) {
        // Redirect to hotel-details.html with hotel info
        const params = new URLSearchParams({
          name: hotel.name || 'Unnamed',
          type: hotel.type,
          lat: hotel.lat,
          lon: hotel.lon,
          distance: hotel.distance
        });
        window.location.href = 'hotel-details.html?' + params.toString();
        return;
      }
      marker.openPopup();
      map.setView([hotel.lat, hotel.lon], 17);
    });
    resultsDiv.appendChild(card);
  }

  // Helper: Fetch hotels from Overpass API
  function fetchHotels(lat, lng, type, radius) {
    showLoading('Searching for hotels...');
    hideError();
    clearResults();
    markersLayer.clearLayers();
    // Overpass QL query
    let types = [];
    if (type === 'all') {
      types = ['hotel','guest_house','hostel','resort'];
    } else {
      types = [type];
    }
    const typeQuery = types.map(t => `node["tourism"="${t}"](around:${radius},${lat},${lng});`).join('');
    const query = `[out:json][timeout:25];(${typeQuery});out body;`;
    // Overpass API endpoint
    const url = 'https://overpass-api.de/api/interpreter';
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'data=' + encodeURIComponent(query)
    })
    .then(res => res.json())
    .then(data => {
      hideLoading();
      if (!data.elements || !data.elements.length) {
        showError('No hotels found nearby.');
        return;
      }
      // Process results
      let hotels = data.elements.map((el, i) => {
        return {
          id: el.id,
          name: el.tags.name || '',
          type: el.tags.tourism || 'hotel',
          lat: el.lat,
          lon: el.lon,
          distance: Math.round(getDistance(lat, lng, el.lat, el.lon))
        };
      });
      hotels.sort((a,b) => a.distance-b.distance);
      hotels = hotels.slice(0, 30);
      hotels.forEach(hotel => {
        const marker = addHotelMarker(hotel, {lat, lng});
        addHotelCard(hotel, marker);
      });
    })
    .catch(err => {
      hideLoading();
      showError('Network error. Please try again.');
    });
  }

  // Helper: Geocode place name using Nominatim
  function geocodePlace(place) {
    showLoading('Locating place...');
    hideError();
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`, {
      headers: {
        // Nominatim usage policy: set User-Agent if possible
        // 'User-Agent': 'RideAndRoam/1.0 (your@email.com)'
      }
    })
    .then(res => res.json())
    .then(data => {
      hideLoading();
      if (!data.length) {
        showError('Place not found. Try another search.');
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      centerCoords = {lat, lng};
      centerMap(lat, lng);
      fetchHotels(lat, lng, typeSelect.value, radiusSelect.value);
    })
    .catch(err => {
      hideLoading();
      showError('Network error. Please try again.');
    });
  }

  // Helper: Use current location
  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      showError('Geolocation not supported by your browser.');
      return;
    }
    showLoading('Getting your location...');
    hideError();
    navigator.geolocation.getCurrentPosition(function(pos) {
      hideLoading();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      centerCoords = {lat, lng};
      centerMap(lat, lng);
      fetchHotels(lat, lng, typeSelect.value, radiusSelect.value);
    }, function(err) {
      hideLoading();
      showError('Unable to get your location.');
    }, {
      enableHighAccuracy: true,
      timeout: 15000
    });
  }

  // Event listeners
  searchBtn.addEventListener('click', function() {
    const place = input.value.trim();
    if (!place) {
      showError('Please enter a place to search.');
      return;
    }
    geocodePlace(place);
  });
  locationBtn.addEventListener('click', useMyLocation);
  typeSelect.addEventListener('change', function() {
    if (centerCoords) fetchHotels(centerCoords.lat, centerCoords.lng, typeSelect.value, radiusSelect.value);
  });
  radiusSelect.addEventListener('change', function() {
    if (centerCoords) fetchHotels(centerCoords.lat, centerCoords.lng, typeSelect.value, radiusSelect.value);
  });

  // Initial state
  hideLoading();
  hideError();
  clearResults();

  // Responsive map container
  function resizeMap() {
    if (mapDiv) {
      mapDiv.style.height = (window.innerWidth < 600 ? '220px' : '320px');
      if (map) map.invalidateSize();
    }
  }
  window.addEventListener('resize', resizeMap);
  resizeMap();
})();
