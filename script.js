var spd_endpoint = "https://data.seattle.gov/resource/y7pv-r3kh.geojson?";
var api_token = "LGR70k7tHk8BqntKzzDsELIOs";
var response;

function filterByYear(year) {
  var request = spd_endpoint + "year=" + year;
  // console.log(request);
  $.ajax({
    url: request,
    type: "GET",
    data: {
      "$limit" : 5000,
      "$$app_token": api_token
    }
  }).done(function(data) {
    response = data;
  })
}

filterByYear(2017); // to get results for 2017

var draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true,
  }
});

map.addControl(draw);

// AccessMap API
$.get("https://www.accessmap.io/api/v2/sidewalks.geojson?").done(function(data) {
    console.log("Ignore this: " + data);
});

var a; // for debugging; delete later
map.on('load', function() {
  map.addSource('response', {
    type: 'geojson',
    data: response
  });

  // Custom rolled vector tiles
  map.addSource('pedestrian', {
    type: 'vector',
    tiles: ['http://localhost:8002/pedestrian/{z}/{x}/{y}.pbf'],
  });

  // Sidewalks
  map.addLayer({
    id : 'sidewalks',
    type: 'line',
    source: 'pedestrian',
    'source-layer': 'sidewalks',
    'layout': {
      'visibility': 'visible',
      'line-join': 'round',
      'line-cap': 'round'
    },
    'paint': {
      'line-color': '#B1C27A', // Add slope information
      'line-width': 3
    }
  });

  // Crossings
  map.addLayer({
    id: 'crossings',
    type: 'line',
    source: 'pedestrian',
    'source-layer': 'crossings',
    layout: {
      visibility: 'visible',
      'line-join': 'round',
      'line-cap': 'round'
    },
    'paint': {
      'line-color': '#FF7F50',
      'line-width': 3
    },
  });

  // Incidents
  map.addLayer({
    "id": "incidents",
    "type": "circle",
    "source": 'response',
    "paint": {
      "circle-color": {
        "property": "offense_code",
        "type": "categorical",
        "stops": [ // Add more stop values
          ["1201", "#9c3848"],
          ["1313", "#47a8bd"],
          ["5213", "#ffad69"],
          ["5499", "#1e3888"]
        ],
        "default": "#9c3848",
      },
      "circle-radius": 5,
      "circle-opacity": 0.5
    }
  });

  // To draw a polygon
  var submitButton = document.getElementById('submit');
  submitButton.onclick = function () { // gets the coordinates for the box
    let data = draw.getAll();
    let polygon = data["features"][0]["geometry"];
    let area = turf.area(polygon);
    // Convert to line string
    var line = turf.polygonToLineString(polygon);
    let center = turf.center(line);
    center = center.geometry["coordinates"]; // flatten
    let lat = center[1];
    let long = center[0];
    getCrimeInfo(lat, long, area);
  };

  // Figure out how to output the year!
  document.getElementById('slider').addEventListener('input', function(e) {
    var year = parseInt(e.target.value, 10);
    // console.log("Slider input: " + year);
    filterByYear(year);
    map.getSource('response').setData(response);
  });
});

// Get crime info for highlighted area
function getCrimeInfo(lat, long, area) {
  let catalog = new Set(new Array("assault", "theft", "robbery", "weapon", "traffic", "pickpocket", "purse snatch", "public nuisance", "dui")); // Set of crimes that affect pedestrians
  let year = (new Date()).getFullYear(); // Current year
  let location = "year=" + year + "&$where=within_circle(location, " + lat + ", " + long + ", " + area + ")&";
  let crime = "$group=summarized_offense_description&$select=summarized_offense_description,count(*)&$order=count desc";
  let link = spd_endpoint + location + crime;
  var counts = new Map(new Array());// relevant counts
  console.log(link); // Comment out
  $.ajax({
    url: link,
    type: "GET",
    data: {
      "$$app_token": api_token
    }
  }).done(function(data) {
    data = data.features;
    for (let i = 0; i < data.length; i++) {
      let obj = data[i];
      var offense = obj.properties["summarized_offense_description"];
      if (catalog.has(offense.toLowerCase())) {
        counts.set(offense, obj.properties['count']);
      }
    }
    drawChart(counts);
  })
}

// Draw a simple bar chart
function drawChart(counts) {
    var keys = Array.from(counts.keys());
    var values = Array.from(counts.values());
    values = values.map(Number);
    var data = [
      {
        x: keys,
        y: values,
        type: 'bar'
      }
    ];
    Plotly.newPlot('chart', data);
    document.getElementById('close').style.display = "inline";
    document.getElementById('close').addEventListener('click', function() {
      var elem = document.getElementById('chart');
      elem.parentNode.removeChild(elem);
      document.getElementById('close').style.display = "none"
    });
}
