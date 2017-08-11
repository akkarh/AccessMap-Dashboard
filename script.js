var spd_endpoint = "https://data.seattle.gov/resource/policereport.json?";
var api_token = "LGR70k7tHk8BqntKzzDsELIOs";

var xhr = new XMLHttpRequest();

function filterByYear(year) {
  var request = spd_endpoint + "year=" + year;
  // console.log(request);
  xhr.open("GET", request , false, api_token);
  xhr.send();
  document.getElementById('year').textContent = year;
  // Convert response from String to JSON to GEOJSON
  let response_parsed = JSON.parse("[" + xhr.response + "]");
  response_parsed = response_parsed[0];
  response_parsed = GeoJSON.parse(response_parsed, {Point: ['latitude', 'longitude']});
  return response_parsed;
}

var response_parsed = filterByYear(2017);

var draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true,
  }
});

map.addControl(draw);

map.on('load', function() {
  map.addControl(new mapboxgl.NavigationControl()); // Yes or no?

  map.addSource('pedestrian', {
    type: 'vector',
    tiles: ['http://localhost:8000/pedestrian/{z}/{x}/{y}.pbf'],
  });

  map.addSource('response', {
    type: 'geojson',
    data: response_parsed
  });

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
      "circle-radius": 10,
      "circle-opacity": 0.5
    }
  });

  map.addLayer({
    "id": "sidewalks",
    "type": "line",
    "source": 'pedestrian',
    "source-layer": 'sidewalks',
    'paint': {
      'line-color': '#B1C27A',
      'line-width': 3
    }
  });

  // Draw a polygon
  var data;
  var submitButton = document.getElementById('submit');
  submitButton.onclick = function () {
    data = draw.getAll();
    console.log(data);
    // var coords = turf.getCoords(data);
    // console.log(coords);
  };

  document.getElementById('slider').addEventListener('input', function(e) {
    var year = parseInt(e.target.value, 10);
    // console.log("Slider input: " + year);
    map.getSource('response').setData(filterByYear(year));
  });
});
