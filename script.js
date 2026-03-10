// ===============================
// MAP
// ===============================

var map = L.map('map').setView([-3.7585,102.2735],16);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{ attribution:'© OpenStreetMap'}
).addTo(map);


// ===============================
// BATAS UNIVERSITAS BENGKULU (PRESISI)
// ===============================

var batasUnib = L.polygon([

[-3.7546,102.2779],
[-3.7543,102.2773],
[-3.7541,102.2765],
[-3.7540,102.2756],
[-3.7540,102.2746],
[-3.7541,102.2736],
[-3.7543,102.2727],
[-3.7546,102.2717],
[-3.7549,102.2708],
[-3.7553,102.2699],
[-3.7558,102.2692],
[-3.7564,102.2686],
[-3.7571,102.2681],
[-3.7579,102.2677],
[-3.7588,102.2674],
[-3.7597,102.2672],
[-3.7606,102.2673],
[-3.7614,102.2677],
[-3.7620,102.2684],
[-3.7624,102.2693],
[-3.7626,102.2703],
[-3.7627,102.2714],
[-3.7626,102.2725],
[-3.7624,102.2736],
[-3.7621,102.2746],
[-3.7616,102.2755],
[-3.7610,102.2763],
[-3.7603,102.2770],
[-3.7594,102.2775],
[-3.7584,102.2779],
[-3.7574,102.2780],
[-3.7564,102.2780],
[-3.7554,102.2779]

],{

color:"#0044ff",
weight:3,
dashArray:"6",
fillColor:"#66a3ff",
fillOpacity:0.18

}).addTo(map);

batasUnib.bindPopup("Kawasan Universitas Bengkulu");

// ===============================
// DATA LOKASI UTBK
// ===============================

var lokasiUTBK={

1:{nama:"LPTIK",lat:-3.758386,lng:102.274915},
2:{nama:"Kedokteran",lat:-3.756357,lng:102.277506},
3:{nama:"FEB",lat:-3.761844,lng:102.268918},
4:{nama:"FISIPOL",lat:-3.759039,lng:102.274534},
5:{nama:"FKIP",lat:-3.758193,lng:102.275693},
6:{nama:"Lab SI",lat:-3.758557,lng:102.277458},
7:{nama:"Perpustakaan",lat:-3.756781,lng:102.274818},
8:{nama:"Hukum",lat:-3.760623,lng:102.268333}

};


// ===============================
// GPS USER
// ===============================

var userLocation=null;

map.locate({setView:true,maxZoom:17});

map.on("locationfound",function(e){

userLocation=e.latlng;

L.marker(userLocation)
.addTo(map)
.bindPopup("Lokasi Anda")
.openPopup();

});


// ===============================
// ROUTING
// ===============================

var warna="blue";

var routing=L.Routing.control({

waypoints:[],

lineOptions:{
styles:[{color:warna,weight:6}]
},

routeWhileDragging:false

}).addTo(map);


// ===============================
// PILIH GEDUNG
// ===============================

document.getElementById("pilihGedung")
.addEventListener("change",function(){

var id=this.value;

if(id==""||userLocation==null){

alert("Aktifkan GPS terlebih dahulu");

return;

}

var g=lokasiUTBK[id];

routing.setWaypoints([

userLocation,
L.latLng(g.lat,g.lng)

]);

map.setView([g.lat,g.lng],18);

});


// ===============================
// MODE TRANSPORTASI
// ===============================

document.getElementById("transport")
.addEventListener("change",function(){

var mode=this.value;

if(mode=="car"){
warna="red";
}

if(mode=="motor"){
warna="blue";
}

if(mode=="bike"){
warna="green";
}

if(mode=="foot"){
warna="purple";
}

routing.getPlan().setWaypoints(routing.getWaypoints());

});


// ===============================
// KOORDINAT MOUSE
// ===============================

map.on("mousemove",function(e){

document.getElementById("coords").innerHTML=

"Lat : "+e.latlng.lat.toFixed(6)+
" | Lng : "+e.latlng.lng.toFixed(6);

});


// ===============================
// SEARCH
// ===============================

L.Control.geocoder().addTo(map);


// ===============================
// MINI MAP
// ===============================

var osm2=L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
);

new L.Control.MiniMap(osm2,{
toggleDisplay:true,
position:'bottomright'
}).addTo(map);


// ===============================
// TOMBOL GPS
// ===============================

L.easyButton('fa-crosshairs',function(){

map.locate({setView:true,maxZoom:18});

}).addTo(map);


// ===============================
// RESET MAP
// ===============================

L.easyButton('fa-home',function(){

map.setView([-3.7585,102.2735],16);

}).addTo(map);