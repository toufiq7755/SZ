var l8_ai = ee.FeatureCollection(ROI);
var l8_aiaoi = l8_ai;


var date1 = '2021-01-01';

var date2 = '2021-12-31';

Map.addLayer(l8_aiaoi, {}, 'l8_ai');

Map.centerObject(l8_aiaoi);

var CHIRPS = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")

var current = CHIRPS.filterDate(date1, date2).select('precipitation').sum().clip(l8_aiaoi);

Map.addLayer(current, {}, 'Annual Rain', 0);

var R = ee.Image(current.multiply(0.363).add(79)).rename('R');

Map.addLayer(R, {min: 300, max: 900, palette: ['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']}, 'R Factor Map', 0);

var l8_aisoil = ee.Image("OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02");

l8_aisoil = l8_aisoil.select('b0').clip(l8_aiaoi).rename('soil');

Map.addLayer(l8_aisoil, {min: 0, max: 100, palette: ['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']}, 'Soil', 0);

var K = l8_aisoil.expression(
   "(b('soil') > 11) ? 0.0053" +
   ": (b('soil') > 10) ? 0.0170" +
   ": (b('soil') > 9) ? 0.045" +
   ": (b('soil') > 8) ? 0.050" +
   ": (b('soil') > 7) ? 0.0499" +
   ": (b('soil') > 6) ? 0.0394" +
   ": (b('soil') > 5) ? 0.0264" +
   ": (b('soil') > 4) ? 0.0423" +
   ": (b('soil') > 3) ? 0.0394" +
   ": (b('soil') > 2) ? 0.036" +
   ": (b('soil') > 1) ? 0.0341" +
   ": (b('soil') > 0) ? 0.0288" +
   ": 0")
   .rename('K').clip(l8_aiaoi);

Map.addLayer(K, {min: 0, max: 0.06, palette: ['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']}, 'KFactor Map', 0);

var DEM = ee.Image("USGS/SRTMGL1_003");

var elevation = DEM.select('elevation');

var slope1 = ee.Terrain.slope(elevation).clip(l8_aiaoi);

var slope = slope1.divide(180).multiply(Math.PI).tan().multiply(100);

Map.addLayer(slope, {min: 0, max: 15, palette: ['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']}, 'slope in %', 0);

var LS4 = Math.sqrt(500/100);

var LS3 = ee.Image(slope.multiply(0.53));

var LS2 = ee.Image(slope).multiply(ee.Image(slope).multiply(0.076));
var LS1 = ee.Image(LS3).add(LS2).add(0.76);

var LS = ee.Image(LS1).multiply(LS4).rename("LS");

Map.addLayer(LS, {min: 0, max: 90, palette: ['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']}, 'LS Factor Map', 0);

var commonBands = ['B2', 'B3', 'B4', 'B8']; // Selecting only relevant bands for NDVI calculation

var s2 = ee.ImageCollection("COPERNICUS/S2")
          .filterDate(date1, date2)
          .select(commonBands)  // Ensure consistent band selection
          .median()
          .clip(l8_aiaoi);


var image_ndvi = s2.normalizedDifference(['B8','B4']).rename("NDVI");

Map.addLayer(image_ndvi, {min: 0, max: 0.85, palette: ['FFFFFF','CC9966','CC9900', '996600', '33CC00', '009900','006600','000000']}, 'NDVI', 0);

var alpha = ee.Number(-2);

var beta = ee.Number(1);

var C1 = image_ndvi.multiply(alpha);

var oneImage = ee.Image(1).clip(l8_aiaoi);

var C2 = oneImage.subtract(image_ndvi);

var C3 = C1.divide(C2).rename('C3');

var C4 = C3.exp();

var maxC4 = C4.reduceRegion({

 geometry: l8_aiaoi,

 reducer: ee.Reducer.max(),

 scale: 3000,

 maxPixels: 475160679

});


var C5 = maxC4.toImage().clip(l8_aiaoi);

var minC4 = C4.reduceRegion({

 geometry: l8_aiaoi,

 reducer: ee.Reducer.min(),

 scale: 3000,

 maxPixels: 475160679

});

var C6 = minC4.toImage().clip(l8_aiaoi);

var C7 = C4.subtract(C6);

var C8 = C5.subtract(C6);

var C = C7.divide(C8).rename('C');

Map.addLayer(C, {min: 0, max: 1, palette: ['FFFFFF','CC9966','CC9900', '996600', '33CC00', '009900','006600','000000']}, 'C Map', 0);

var modis = ee.ImageCollection("MODIS/061/MCD12Q1");

var lulc = modis.filterDate(date1, date2).select('LC_Type1').first().clip(l8_aiaoi).rename('lulc');

Map.addLayer(lulc, {}, 'lulc', 0);
// Combined LULC & slope in single image
var lulc_slope = lulc.addBands(slope);

// Create P Factor map using an expression
var P = lulc_slope.expression(
 "(b('lulc') < 11) ? 0.8" +
 ": (b('lulc') == 11) ? 1" +
 ": (b('lulc') == 13) ? 1" +
 ": (b('lulc') > 14) ? 1" +
 ": (b('slope') < 2) and((b('lulc')==12) or (b('lulc')==14)) ? 0.6" +
 ": (b('slope') < 5) and((b('lulc')==12) or (b('lulc')==14)) ? 0.5" +
 ": (b('slope') < 8) and((b('lulc')==12) or (b('lulc')==14)) ? 0.5" +
 ": (b('slope') < 12) and((b('lulc')==12) or (b('lulc')==14)) ? 0.6" +
 ": (b('slope') < 16) and((b('lulc')==12) or (b('lulc')==14)) ? 0.7" +
 ": (b('slope') < 20) and((b('lulc')==12) or (b('lulc')==14)) ? 0.8" +
 ": (b('slope') > 20) and((b('lulc')==12) or (b('lulc')==14)) ? 0.9" +
 ": 1"
).rename('P').clip(l8_aiaoi);

Map.addLayer(P, {}, 'P Factor', 0);

var soil_loss = ee.Image(R.multiply(K).multiply(LS).multiply(C).multiply(P)).rename("Soil Loss");

var style = ['490eff','12f4ff','12ff50','e5ff12','ff4812'];

Map.addLayer(soil_loss, {min: 0, max: 10, palette: style}, 'Soil Loss', 0);

var SL_class = soil_loss.expression(
 "(b('Soil Loss') < 5) ? 1" +
 ": (b('Soil Loss') < 10) ? 2" +
 ": (b('Soil Loss') < 20) ? 3"+
 ": (b('Soil Loss') < 40) ? 4"+
 ": 5")
 .rename('SL_class').clip(l8_aiaoi); 

Map.addLayer(SL_class, {min: 0, max: 5, palette: style}, 'Soil Loss Class');

var SL_mean = soil_loss.reduceRegion({
 geometry: l8_aiaoi, 
 reducer: ee.Reducer.mean(), 
 scale: 500,
 maxPixels: 475160679
})

print ("Mean Soil Loss",SL_mean.get("Soil Loss"))

// Add reducer output to the Features in the collection.
var maineMeansFeatures = soil_loss.reduceRegions({
 collection: l8_aiaoi,
 reducer: ee.Reducer.mean(),
 scale: 500,
});

print ("Mean Soil Loss of Each Subbasins",maineMeansFeatures)

//Calculating Area
var areaImage = ee.Image.pixelArea().addBands(SL_class)
var areas = areaImage.reduceRegion({
 reducer: ee.Reducer.sum().group({
 groupField: 1,
 groupName: 'class',
}),
 geometry: l8_aiaoi.geometry(),
 scale: 500,
 maxPixels: 1e10
}); 

var classAreas = ee.List(areas.get('groups'))

var className = classAreas.map(function(item) {
 var areaDict = ee.Dictionary(item)
 var classNumber = ee.Number(areaDict.get('class')).format()
 return ee.List(classNumber) 
})

var Area = classAreas.map(function(item) {
 var areaDict = ee.Dictionary(item)
 var area = ee.Number(
 areaDict.get('sum')).divide(1e6).round()
 return ee.List(area) 
})

var className2 = ee.List(["Slight (<10)","Moderate (10-20)","High (20-30)","Very high (30-40)","Severe (>40)"])

print(ui.Chart.array.values(Area, 0, className2)
   .setChartType('PieChart')
   .setOptions({pointSize: 2, title: 'Soil Loss',}));

var calculateClassArea = function(feature) {
 var areas = ee.Image.pixelArea().addBands(SL_class)
 .reduceRegion({
   reducer: ee.Reducer.sum().group({
   groupField: 1,
   groupName: 'class',
 }),
 geometry: feature.geometry(),
 scale: 500,
 maxPixels: 1e10
})

var classAreas = ee.List(areas.get('groups'))

var classAreaLists = classAreas.map(function(item) {
 var areaDict = ee.Dictionary(item)
 var classNumber = ee.Number(
   areaDict.get('class')).format()
 var area = ee.Number(
   areaDict.get('sum')).round()
 return ee.List([classNumber, area])
})

var result = ee.Dictionary(classAreaLists.flatten())

var district = feature.get('HYBAS_ID')

return ee.Feature(
 feature.geometry(),
 result.set('district', district))
}

var districtAreas = l8_aiaoi.map(calculateClassArea);

print('Length of className2:', className2.length());

print('Length of Area:', Area.length());

var classes = ee.List.sequence(1, 5)
var outputFields = ee.List(
 ['district']).cat(classes).getInfo()

Export.table.toDrive({
 collection: districtAreas,
 description: 'class_area_by_subbasin',
 folder: 'earthengine',
 fileNamePrefix: 'class_area_by_subbasin',
 fileFormat: 'CSV',
 selectors: outputFields
})

//Legend Panel

// set position of panel
var legend = ui.Panel({
 style: {
   position: 'bottom-left',
   padding: '8px 15px'
 }
});

// Create legend title
var legendTitle = ui.Label({
 value: 'Soil Loss (t/hac/year)',
 style: {
   fontWeight: 'bold',
   fontSize: '18px',
   margin: '0 0 4px 0',
   padding: '0'
   }
});



// Add the title to the panel
legend.add(legendTitle);

var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });

  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

var legendColors = ['490eff','12f4ff','12ff50','e5ff12','ff4812'];
var legendNames = ['Slight (<10)', 'Moderate (10-20)', 'High (20-30)', 'Very high (30-40)', 'Severe (>40)'];

for (var i = 0; i < legendColors.length; i++) {
  legend.add(makeRow(legendColors[i], legendNames[i]));
}

Map.add(legend);
Export.image.toDrive({
  image: soil_loss,  // The soil loss image
  description: 'Soil_Loss_Map',
  folder: 'earthengine',  // Your Google Drive folder
  fileNamePrefix: 'Soil_Loss_Map_2021',
  region: l8_aiaoi.geometry(),  // The ROI geometry
  scale: 30,  // Adjust to your desired resolution (e.g., Landsat = 30m, Sentinel = 10m)
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});
