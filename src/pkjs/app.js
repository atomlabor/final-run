var Clay = require('pebble-clay');
var clayConfig = require('./ClaySettings');
var clay = new Clay(clayConfig);

var target = { name: "Suche...", lat: 51.2798, lon: 7.1103 }; 
var path = [], laps = [];
var totalDistance = 0, totalTimeSec = 0, lastLapDist = 0, lastLapTime = 0;
var lastPos = null, hasArrived = false, isPaused = true, manualPause = true;

var lastDisplayText = "Warte auf GPS...";

function updateTarget(settings) {
  if (!settings) return;
  var name = settings.CONFIG_TARGET_NAME || settings['10'];
  var lat = settings.CONFIG_TARGET_LAT || settings['11'];
  var lon = settings.CONFIG_TARGET_LON || settings['12'];
  if (name) {
    target.name = (typeof name === 'object') ? name.value : name;
    target.lat  = parseFloat((typeof lat === 'object') ? lat.value : lat);
    target.lon  = parseFloat((typeof lon === 'object') ? lon.value : lon);
  }
}

setInterval(function() { if (!isPaused) totalTimeSec++; }, 1000);

Pebble.addEventListener('ready', function(e) {
  var clayData = localStorage.getItem('clay_settings');
  if (clayData) updateTarget(JSON.parse(clayData));
  Pebble.sendAppMessage({ 'id_data': "Bereit...\nZiel: " + target.name });
});

Pebble.addEventListener('webviewclosed', function(e) {
  if (e && e.response && e.response !== 'CANCELLED') {
    try {
      var settings = JSON.parse(decodeURIComponent(e.response));
      updateTarget(settings);
      hasArrived = false; // Ziel-Status zurücksetzen bei neuem Ziel
      Pebble.sendAppMessage({ 'id_data': "Ziel aktiv:\n" + target.name });
    } catch (err) {}
  }
});

Pebble.addEventListener('appmessage', function(e) {
  if (e.payload.id_button === 0) { // SELECT: Reset
    path = []; laps = []; totalDistance = 0; totalTimeSec = 0; lastLapDist = 0;
    lastPos = null; hasArrived = false; isPaused = true; manualPause = true;
    Pebble.sendAppMessage({ 'id_data': "RESET\nZiel: " + target.name });
  } else if (e.payload.id_button === 1) { // UP: Start/Stop
    manualPause = !manualPause;
    isPaused = manualPause;
    Pebble.sendAppMessage({ 'id_data': (manualPause ? "STOP\n" : "START\n") + lastDisplayText });
  } else if (e.payload.id_button === 2) { // DOWN: Laps
    var lapStr = "LAPS (km):";
    for(var i=0; i < Math.min(laps.length, 3); i++) {
      lapStr += "\n" + (i+1) + ". " + formatPace(laps[i]);
    }
    Pebble.sendAppMessage({ 'id_data': (laps.length === 0 ? "Keine Laps" : lapStr) });
  }
});

function formatPace(p) { if (!p || p <= 0 || p > 60) return "--:--"; var m = Math.floor(p); var s = Math.floor((p - m) * 60); return m + ":" + (s < 10 ? "0" : "") + s; }
function calculateDistance(lat1, lon1, lat2, lon2) { 
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  var R = 6371; 
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); 
}

navigator.geolocation.watchPosition(function(pos) {
  var cur = { lat: pos.coords.latitude, lon: pos.coords.longitude };
  var speed = pos.coords.speed || 0;
  
  if (!manualPause) isPaused = (speed <= 0.3);

  if (!isPaused && lastPos) {
    var step = calculateDistance(lastPos.lat, lastPos.lon, cur.lat, cur.lon);
    if (step > 0.005) { 
      totalDistance += step;
      path.push(cur);
      if (path.length > 30) path.shift();
      if (totalDistance - lastLapDist >= 1.0) {
        laps.unshift((totalTimeSec - lastLapTime) / 60);
        lastLapDist = totalDistance; lastLapTime = totalTimeSec;
      }
    }
  }
  lastPos = cur;
  
  var distToTarget = calculateDistance(cur.lat, cur.lon, target.lat, target.lon);
  var avgPaceMin = (totalDistance > 0.01) ? ((totalTimeSec / 60) / totalDistance) : 0;
  
  lastDisplayText = distToTarget.toFixed(2) + "km\n" +
                    "Run:  " + totalDistance.toFixed(2) + "km\n" +
                    "Ø km: " + formatPace(avgPaceMin);

  var status = manualPause ? "STOP - " : (isPaused ? "AUTO-P - " : "");
  if (hasArrived) status = "ZIEL! - ";

  var pathBytes = [];
  for (var i = 0; i < path.length; i++) {
    var dx = Math.round((path[i].lon - cur.lon) * 40000) + 60; 
    var dy = Math.round((cur.lat - path[i].lat) * 40000) + 35; 
    pathBytes.push(Math.max(0, Math.min(120, dx)));
    pathBytes.push(Math.max(0, Math.min(70, dy)));
  }

  var msg = { 'id_data': status + lastDisplayText, 'id_path_data': pathBytes };

  if (distToTarget < 0.07 && !hasArrived) { 
    msg.id_vibe = 1; 
    hasArrived = true; 
  }
  
  Pebble.sendAppMessage(msg);
}, null, { enableHighAccuracy: true });
