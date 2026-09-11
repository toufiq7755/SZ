var L8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

var image = L8.filterBounds(ROI)
              .filterDate('2022-01-01','2022-12-31')
              .filterMetadata('CLOUD_COVER','less_than',1)
              .median()
              .clip(ROI)
//print(image.size())
print(image)

Map.addLayer(image, imageVisParam, 'True color')
Map.centerObject(ROI,10)

var training = Water.merge(Buildup).merge(Vegetation).merge(Bareland)
print(training)

var bands = ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7']

var input = image.select(bands)

var trainImage = input.sampleRegions({
  collection: training,
  properties: ['Class'],
  scale:30})
  
  print(trainImage)
  
var trainData = trainImage.randomColumn()
var trainSet = trainData.filter(ee.Filter.gt('random',0.8))
var testSet = trainData.filter(ee.Filter.lte('random',0.8))

var classifier = ee.Classifier.smileCart(150).train({
  features: trainSet,
  classProperty: 'Class',
  inputProperties: bands})

var LULC = image.select(bands).classify(classifier)

Map.addLayer(LULC, {min:0, max:3, palette:['blue','red','green','yellow']})

var confusion_Matrix = ee.ConfusionMatrix(testSet.classify(classifier)
   .errorMatrix({
     actual: 'Class',
     predicted:'classification'}))
     
var LULC_mean= ee.Number(LULC.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: ROI,
  scale: 30,
  maxPixels: 1e9
}).values().get(0))

print('Mean LULC in ROI', LULC_mean)

     
print(confusion_Matrix)

print(confusion_Matrix.accuracy())
print(confusion_Matrix.kappa())
print(confusion_Matrix.producersAccuracy())
print(confusion_Matrix.consumersAccuracy())


Export.image.toDrive({
  image: LULC,
  description: 'LULC_2022',
  folder: 'Classroom',
  region: ROI,
  scale: 30,
  maxPixels:1e9,
  crs:'EPSG:4326'
});
