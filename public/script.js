// Loader
const loader = document.getElementsByClassName('loader-container')[0];

// Main Engine
const selections = document.querySelectorAll('select');
let choice1 = document.getElementById('choice1'), 
		choice2 = document.getElementById('choice2');

let requestBin = {}

var featurelayer;
var graphic;

let data;

const parse = res => res.json();

var comp1 = "Confirmed Cases";
var comp2 = "CO";
document.getElementsByTagName('select')[0].value = comp1;
document.getElementsByTagName('select')[1].value = comp2;

choice1.innerHTML = "more " + comp1;
choice2.innerHTML = "more " + comp2;


let elementsnums;
let covidUpdates;
let updateRenames;

function changeComp(value, num){
	if (num == 1) comp1 = value;
	else comp2 = value;

	let elem1 = elementsnums[comp1.toLowerCase()];
	let elem2 = elementsnums[comp2.toLowerCase()];

	choice1.innerHTML = elem1.prefix + " " + comp1;
	choice2.innerHTML = elem2.prefix + " " + comp2;

	generateGraphics();
}

require([
	"esri/Map",
	"esri/views/MapView",
	"esri/Graphic",
	"esri/layers/GraphicsLayer",
	"esri/layers/FeatureLayer",
	"esri/widgets/Search"
	], (Map, MapView, Graphic, GraphicsLayer, FeatureLayer, Search) => {
	let map = new Map({
		basemap: "topo-vector",
	});

	let viewOptions = {
		container: 'viewDiv',
		map: map,
		//lat, long
		center: [-98.5795, 39.8283],
		zoom: 5.3
	} 

	var view = new MapView(viewOptions);
	const searchWidget = new Search({view});

	view.ui.add(searchWidget, {
	  	position: "top-left",
  		index: 2
	});

	view.ui.move("zoom", "top-right");
	
	featurelayer = FeatureLayer;
	graphic = Graphic;

	graphicslayer = new GraphicsLayer();
	map.add(graphicslayer);
	
	fetch_airquality();

	setTimeout(() => {
		loader.remove()
	}, 1000)

});

function createPin(lat, long, red, blue, {attributes, popupTemplate}) {
	let pin = new graphic({
    	geometry: {
			type: "point",
			longitude: long,
			latitude: lat
    	},
    	symbol: {
			type: "simple-marker",
       		color: [red, 0, blue, 0.6],
			style: 'circle',
        	outline: {
        		color: [255, 255, 255],
        		width: 1
        	},
			size: '20px'
    	}, 
		attributes,
		popupTemplate
  	});
	return pin
}

async function makeGraphic(country, city, coords, text1, text2){

	let lat = coords.lat;
	let long = coords.lng;

	let elem1 = elementsnums[comp1.toLowerCase()], elem2 = elementsnums[comp2.toLowerCase()];
	var num1 = 255 * text1/elem1.max;
	var num2 = 255 * text2/elem2.max;
	
	
	let c = createPin(lat, long, num1, num2, {
		popupTemplate: {
			title: `${city}, ${country}`,
			content: `${comp1}: ${text1 + elem1.unit}, ${comp2}: ${text2 + elem2.unit}`
		}
	});
	
	graphicslayer.add(c);
}

function createP (text) {
	let p = document.createElement('p')
	p.innerHTML = text
	return p
}

const save_fetch = (url, json) => {
	if(requestBin.hasOwnProperty('url')) {
		return new Promise(resolve => {
			resolve(requestBin[url])
		})
	}
	else {
		return fetch(url, json || {method: 'GET'}).then(parse);
	}
} 
async function fetch_airquality() {

	elementsnums = await fetch('elements.json').then(parse);
	covidUpdates = await fetch('states_covid.json').then(parse);
	updateRenames = await fetch('rename.json').then(parse);


	save_fetch("airQualityUS.json")
	.then(json => {
		data = json;
		requestBin['airQualityUS.json'] = json;
		generateGraphics();
	})
	 
}
function generateGraphics(){
	graphicslayer.removeAll();

	var axes = [];

	for (let city of Object.keys(data)){
			if (!(comp2.toLowerCase() in data[city]) && !(comp2 in updateRenames)) continue;
			if (covidUpdates[data[city].state][updateRenames[comp1]] == "") continue;

			let latest;

			if (comp2 in updateRenames){
				latest = data[city][updateRenames[comp2]];
				
				if (typeof latest != 'number'){
					latest = Object.values(latest);
					latest = latest[latest.length - 1].median;
				}		
			}
			else {
				let dates = Object.values(data[city][comp2.toLowerCase()]);
				latest = dates[dates.length - 1].median;
			}

			let covidNum = covidUpdates[data[city].state][updateRenames[comp1]];

			if (covidNum == 99999 || latest == 99999) continue;
			
			axes.push({x: latest, y: covidNum})

			makeGraphic('US', city, data[city].coords, covidNum, latest);
	}

	prune(axes);
	drawGraph(axes);
}

function prune(axes){
	let maxx = axes[0].x, minx = axes[0].x, maxx2 = axes[1].x, minx2 = axes[0].x,
			maxxind = 0, maxx2ind = 0, minxind = 0
		  maxy = axes[0].y, miny = axes[0].y, maxy2 = axes[1].y, miny2 = axes[0].y,
			maxyind = 0, maxy2ind = 0, minyind = 0;
	
	let meanx = 0, meany = 0;
	
	for (let i = 0; i < axes.length; i++){
		meanx += axes[i].x;
		meany += axes[i].y;
		if (axes[i].x > maxx){
			maxx2 = maxx;
			maxx = axes[i].x;
			maxxind = i;
		}
		if (axes[i].x < minx){
			minx2 = minx;
			minx = axes[i].x
			minxind = i;
		}
		if (axes[i].y > maxy){
			maxy2 = maxy;
			maxy = axes[i].y;
			maxyind = i;
		}
		if (axes[i].y < miny){
			miny2 = miny;
			miny = axes[i].y
			minyind = i;
		}
	}

	meanx /= axes.length;
	meany /= axes.length;

	if (maxx - maxx2 > 2*(maxx2 - meanx)) delete axes[maxxind];
	if (minx2 - minx > 2*(meanx-minx2)) delete axes[minxind];
	if (maxy - maxy2 > 2*(maxy2 - meany)) delete axes[maxyind];
	if (miny2 - miny > 2*(meany-miny2)) delete axes[minyind];
}

function shiftGraphs(){

	let outer = document.getElementById('charts-container');
	let graphs = document.getElementsByClassName('graph');
	if (graphs.length == 10) outer.removeChild(graphs[1].parentNode);

	let container = document.createElement('div');
	container.classList.toggle('chart-container');
	let canvas = document.createElement('canvas');
	canvas.name = `${comp1} vs ${comp2}`;
	canvas.classList.add('graph');
	container.appendChild(canvas);
	outer.prepend(container);
}

function shiftGraphTop(element){
	let outer = document.getElementById('charts-container');
	outer.removeChild(element);
	outer.prepend(element);
}

function drawGraph(axes){

	var graphs = document.getElementsByClassName('graph');	

	for (var i = 0; i < graphs.length; i++){
		if (graphs[i].name == `${comp1} vs ${comp2}`){
			shiftGraphTop(graphs[i].parentNode);
			return;
		}
	}
	
	shiftGraphs();
	
	var ctx = graphs[0].getContext('2d');
	
	let elem1 = elementsnums[comp1.toLowerCase()];
	let elem2 = elementsnums[comp2.toLowerCase()];
	
	var scatterChart = new Chart(ctx, {
		type: 'scatter',
		data: {
				datasets: [{
						label: `${comp1} vs ${comp2}`,
						backgroundColor: function(context) {
							if (context.dataIndex in context.dataset.data){
								let nums = context.dataset.data[context.dataIndex];
								var num1 = 255 * nums.y/elem1.max;
								var num2 = 255 * nums.x/elem2.max;
								return `rgba(${num1}, 0, ${num2}, 0.5)`;
							}
							else return 'rgba(100, 100, 100, 0.5)';
						},
						data: axes
				}]
		},
		options: {
			responsive: true,
    		maintainAspectRatio: false,
			legend: {
             	labels: {
            		boxWidth: 0,
             	}
			},
			scales: {
					xAxes: [{
						type: 'linear',
						position: 'bottom',
						scaleLabel: {
							display: true,
							labelString: comp2 + ' (' + elem2.unit.trim() + ')'
						}
					}],
					yAxes: [{
						scaleLabel: {
							display: true,
							labelString: comp1 + ' (' + elem1.unit.trim() + ')'
						}
					}]
			},
			
		}
	});
}
