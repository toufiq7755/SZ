var dataset = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
              .filterDate('2022-03-01','2022-12-01')



// Applies scaling factors.
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

//cloud mask
function L2SR(col){
  var cloudShadowBitMask = (1<<3);
  var cloudsBitMask = (1<<5);
  var qa = col.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
  .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return col.updateMask(mask);
}

var image = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2022-03-01','2022-12-01')
    .filterBounds(ROI)
    .map(applyScaleFactors)
    .map(L2SR)
    .median()
    .clip(ROI);
    
var visualization = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0.0,
  max: 0.3,
};

Map.setCenter(90.3563, 23.6850, 8);

Map.addLayer(image, visualization, 'True Color (432)',false);

//NDVI

var ndvi = image.normalizedDifference(['SR_B5','SR_B4']).rename('NDVI')
Map.addLayer(ndvi, {min:-1, max:1, palette: ['blue', 'white', 'green']},'ndvi',false)


Export.image.toDrive({
  image:ndvi, 
  description:'Dhaka_2022_NDVI', 
  region:ROI,
  scale:30,
  maxPixels:1e13,
  crs:'EPSG:4326'
});

