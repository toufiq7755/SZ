var ROI = ee.FeatureCollection("FAO/GAUL/2015/level0")
             .filter(ee.Filter.eq('ADM0_NAME', 'Bangladesh'));

// Load DMSP-OLS Nighttime Lights
var dataset = ee.ImageCollection("NOAA/DMSP-OLS/NIGHTTIME_LIGHTS")
              .select('stable_lights')
              .map(function(image) {
                return image.set('year', image.date().get('year'));
              });

// Create median composite clipped to ROI
var medianImage = dataset.median().clip(ROI);
print('Median Composite Image:', medianImage);

// Add median composite to the map
Map.addLayer(medianImage, {
  min: 0,
  max: 63,
  palette: ['black', 'white', 'orange', 'yellow', 'red']
}, 'Median Nighttime Lights');
Map.centerObject(ROI, 7);

// Specific years to display
var years = [1992, 2000, 2008, 2013];

years.forEach(function(year) {
  var yearImage = dataset
    .filter(ee.Filter.eq('year', year))
    .median()
    .clip(ROI); // Clip to ROI

  var style = {
    bands: ['stable_lights'],
    min: 0,
    max: 63,
    palette: ['black', 'white', 'orange', 'yellow', 'red']
  };

  Map.addLayer(yearImage, style, 'Night Lights ' + year, false);
});

// Export the median image to Google Drive
Export.image.toDrive({
  image: medianImage, 
  description: 'Bangladesh_Nightlight_Median', 
  folder: 'EarthEngineExports', // Optional: specify your Drive folder
  region: ROI.geometry(), 
  scale: 1000,  // DMSP-OLS has a coarse resolution (~1km)
  maxPixels: 1e13,
  crs: 'EPSG:4326'
});
