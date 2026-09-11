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

//ndvi statistics

var ndvi_min= ee.Number(ndvi.reduceRegion({
  reducer: ee.Reducer.min(),
  geometry: ROI,
  scale: 30,
  maxPixels: 1e9
}).values().get(0))

var ndvi_max= ee.Number(ndvi.reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: ROI,
  scale: 30,
  maxPixels: 1e9
}).values().get(0))

//Fraction of Vegetation
var fv = (ndvi.subtract(ndvi_min).divide(ndvi_max.subtract(ndvi_min))).pow(ee.Number(2))
        .rename('FV')
        
var em = fv.multiply(ee.Number(0.004)).add(ee.Number(0.986)).rename('EM')

var thermal= image.select('ST_B10').rename('thermal')

var lst= thermal.expression(
  '(tb/(1+(0.00115*(tb/0.48359547432))*log(em)))-273.15',
  {'tb':thermal.select('thermal'),
  'em':em}).rename('LST')
  
var lst_vis = {
  min: 20,
  max: 40,
  palette: [
    '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
    '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
    '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f', 
    'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
    'ff0000', 'de0101', 'c21301', 'a71001', '911003']
}

Map.addLayer(lst, lst_vis, 'LST ROI')
Map.centerObject(ROI, 10)

//Urban Heat Island
//Normalized UHI
var lst_mean= ee.Number(lst.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: ROI,
  scale: 30,
  maxPixels: 1e9
}).values().get(0))

var lst_std= ee.Number(lst.reduceRegion({
  reducer: ee.Reducer.stdDev(),
  geometry: ROI,
  scale: 30,
  maxPixels: 1e9
}).values().get(0)) 

print('Mean LST in ROI', lst_mean)
print('STD LST in ROI', lst_std)

var uhi= lst.subtract(lst_mean).divide(lst_std).rename('UHI')

var uhi_vis={
  min: -.4,
  max: .2,
  palette: ['313695', '74add1', 'fed976', 'feb24c', 'fd8d3c', 'fc4e2a', 'e31a1c',
    'b10026']
}
Map.addLayer(uhi, uhi_vis, 'UHI ROI')


Export.image.toDrive({
  image:uhi, 
  description:'Dhaka_2022_UHI', 
  region:ROI,
  scale:30,
  maxPixels:1e13,
  crs:'EPSG:4326'
});


