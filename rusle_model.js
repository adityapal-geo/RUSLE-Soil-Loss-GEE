

var CHIRPS = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD"),
    soil = ee.Image("OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02"),
    DEM = ee.Image("USGS/SRTMGL1_003"),
    s2 = ee.ImageCollection("COPERNICUS/S2");



var aoi = ee.FeatureCollection(
    "projects/promising-idea-432505-i4/assets/Narmada"
);

Map.centerObject(aoi, 9);
Map.addLayer(aoi, {color:'black'}, "Study Area");



var date1 = '2025-01-01';
var date2 = '2026-01-01';


//                     R FACTOR


var current = CHIRPS
    .filterDate(date1, date2)
    .select('precipitation')
    .sum()
    .clip(aoi);

Map.addLayer(current, {}, 'Annual Rain', false);

var R = current.multiply(0.363)
               .add(79)
               .rename('R');

Map.addLayer(
R,
{
min:300,
max:900,
palette:['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']
},
'R Factor',
false
);


//                     K FACTOR


soil = soil.select('b0')
           .clip(aoi)
           .rename('soil');

Map.addLayer(
soil,
{
min:0,
max:100,
palette:['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']
},
'Soil',
false
);

var K = soil.expression(

"(b('soil') > 11) ? 0.0053" +
": (b('soil') > 10) ? 0.0170" +
": (b('soil') > 9) ? 0.0450" +
": (b('soil') > 8) ? 0.0500" +
": (b('soil') > 7) ? 0.0499" +
": (b('soil') > 6) ? 0.0394" +
": (b('soil') > 5) ? 0.0264" +
": (b('soil') > 4) ? 0.0423" +
": (b('soil') > 3) ? 0.0394" +
": (b('soil') > 2) ? 0.0360" +
": (b('soil') > 1) ? 0.0341" +
": (b('soil') > 0) ? 0.0288" +
": 0"

).rename('K').clip(aoi);

Map.addLayer(
K,
{
min:0,
max:0.06,
palette:['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']
},
'K Factor',
false
);


//                     LS FACTOR


var elevation = DEM.select('elevation');

var slope1 = ee.Terrain.slope(elevation).clip(aoi);

// Degree to Percent

var slope = slope1
    .divide(180)
    .multiply(Math.PI)
    .tan()
    .multiply(100);

Map.addLayer(
slope,
{
min:0,
max:15,
palette:['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']
},
'Slope (%)',
false
);

var LS4 = Math.sqrt(500/100);

var LS3 = slope.multiply(0.53);

var LS2 = slope.multiply(
            slope.multiply(0.076)
          );

var LS1 = LS3.add(LS2).add(0.76);

var LS = LS1.multiply(LS4).rename("LS");

Map.addLayer(
LS,
{
min:0,
max:90,
palette:['a52508','ff3818','fbff18','25cdff','2f35ff','0b2dab']
},
'LS Factor',
false
);


//                     C FACTOR


var s2_filtered = s2
    .filterBounds(aoi)
    .filterDate(date1, date2)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
    .select(['B8','B4'])
    .median()
    .clip(aoi);

// NDVI

var NDVI = s2_filtered
    .normalizedDifference(['B8','B4'])
    .rename('NDVI');

Map.addLayer(
NDVI,
{
min:-1,
max:1,
palette:['white','yellow','green','darkgreen']
},
'NDVI'
);

var alpha = 2; 
var beta = 1;

var C_uncapped = NDVI.expression(
  'exp(-alpha * (NDVI / (beta - NDVI)))',
  {
    'NDVI': NDVI,
    'alpha': alpha,
    'beta': beta
  }
);


var C = C_uncapped.clamp(0.0, 1.0).rename('C');

Map.addLayer(
  C,
  {
    min: 0,
    max: 1,
    palette: ['green', 'yellow', 'orange', 'red'] 
     },
  'C Factor'
);



//                 P FACTOR (Dynamic World)


var dw = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterBounds(aoi)
    .filterDate(date1, date2)
    .select('label')
    .mode()
    .clip(aoi)
    .rename('lulc');

// Dynamic World Visualization

var dwPalette = [
  '419BDF', // Water
  '397D49', // Trees
  '88B053', // Grass
  '7A87C6', // Flooded Vegetation
  'E49635', // Crops
  'DFC35A', // Shrub & Scrub
  'C4281B', // Built Area
  'A59B8F', // Bare Ground
  'B39FE1'  // Snow & Ice
];

Map.addLayer(
dw,
{
min:0,
max:8,
palette:dwPalette
},
'Dynamic World LULC'
);


//                    P FACTOR


var P = dw.expression(

"(b('lulc') == 0) ? 0.0" +   // Water
": (b('lulc') == 1) ? 0.6" + // Trees
": (b('lulc') == 2) ? 0.6" + // Grass
": (b('lulc') == 3) ? 0.4" + // Flooded Vegetation
": (b('lulc') == 4) ? 0.5" + // Cropland
": (b('lulc') == 5) ? 0.7" + // Shrub & Scrub
": (b('lulc') == 6) ? 0.9" + // Built-up
": (b('lulc') == 7) ? 1.0" + // Bare Ground
": (b('lulc') == 8) ? 1.0" + // Snow & Ice
": 1"

).rename('P').clip(aoi);

Map.addLayer(
P,
{
min:0,
max:1,
palette:['green','yellow','red']
},
'P Factor'
);


//                SOIL LOSS (RUSLE)


var soil_loss = R
    .multiply(K)
    .multiply(LS)
    .multiply(C)
    .multiply(P)
    .rename("Soil Loss");

var style = [
'490eff',
'12f4ff',
'12ff50',
'e5ff12',
'ff4812'
];

Map.addLayer(
soil_loss,
{
min:0,
max:10,
palette:style
},
'Soil Loss',
false
);


//             SOIL LOSS CLASSIFICATION


var SL_class = soil_loss.expression(

"(b('Soil Loss') < 5) ? 1" +
": (b('Soil Loss') < 10) ? 2" +
": (b('Soil Loss') < 20) ? 3" +
": (b('Soil Loss') < 40) ? 4" +
": 5"

).rename('SL_class').clip(aoi);

Map.addLayer(
SL_class,
{
min:1,
max:5,
palette:style
},
"Soil Loss Class"
);


//                  STATISTICS


var SL_mean = soil_loss.reduceRegion({
  geometry:aoi,
  reducer:ee.Reducer.mean(),
  scale:500,
  maxPixels:1e13
});

print("Mean Soil Loss", SL_mean.get("Soil Loss"));

var maineMeansFeatures = soil_loss.reduceRegions({
  collection:aoi,
  reducer:ee.Reducer.mean(),
  scale:500
});

print("Mean Soil Loss of Each Subbasins", maineMeansFeatures);


//                AREA CALCULATION


var areaImage = ee.Image.pixelArea().addBands(SL_class);

var areas = areaImage.reduceRegion({

  reducer: ee.Reducer.sum().group({
      groupField:1,
      groupName:'class'
  }),

  geometry:aoi.geometry(),
  scale:500,
  maxPixels:1e13

});

var classAreas = ee.List(areas.get('groups'));

var Area = classAreas.map(function(item){

  var areaDict = ee.Dictionary(item);

  return ee.Number(areaDict.get('sum'))
          .divide(1e6)
          .round();

});

var className2 = ee.List([
"Slight (<10)",
"Moderate (10-20)",
"High (20-30)",
"Very High (30-40)",
"Severe (>40)"
]);

print(

ui.Chart.array.values(
Area,
0,
className2
)

.setChartType('PieChart')

.setOptions({

title:'Soil Loss',
pointSize:2

})

);


//        AREA OF EACH CLASS FOR EACH SUB-BASIN


var calculateClassArea = function(feature){

var areas = ee.Image.pixelArea()

.addBands(SL_class)

.reduceRegion({

reducer: ee.Reducer.sum().group({

groupField:1,
groupName:'class'

}),

geometry:feature.geometry(),
scale:500,
maxPixels:1e13

});

var classAreas = ee.List(areas.get('groups'));

var classAreaLists = classAreas.map(function(item){

var areaDict = ee.Dictionary(item);

return ee.List([

ee.Number(areaDict.get('class')).format(),

ee.Number(areaDict.get('sum')).round()

]);

});

var result = ee.Dictionary(classAreaLists.flatten());

return feature.set(result);

};

var districtAreas = aoi.map(calculateClassArea);




//               EXPORT TABLE (CSV)


var classes = ee.List.sequence(1,5);

var outputFields = ee.List(['district'])
    .cat(classes)
    .getInfo();

Export.table.toDrive({
  collection: districtAreas,
  description: 'class_area_by_subbasin',
  folder: 'earthengine',
  fileNamePrefix: 'class_area_by_subbasin',
  fileFormat: 'CSV',
  selectors: outputFields
});


//          EXPORT SOIL LOSS CLASS


Export.image.toDrive({
  image: SL_class,
  description: 'Export_Soil_Loss_Class_Map',
  folder: 'earthengine',
  fileNamePrefix: 'Soil_Loss_Class_Map',
  region: aoi.geometry(),
  scale: 500,
  maxPixels: 1e13
});


//                 EXPORT R FACTOR


Export.image.toDrive({
  image: R,
  description: 'Export_R_Factor',
  folder: 'earthengine',
  fileNamePrefix: 'R_Factor_2024',
  region: aoi.geometry(),
  scale: 500,
  maxPixels: 1e13
});


//                 EXPORT K FACTOR


Export.image.toDrive({
  image: K,
  description: 'Export_K_Factor',
  folder: 'earthengine',
  fileNamePrefix: 'K_Factor',
  region: aoi.geometry(),
  scale: 500,
  maxPixels: 1e13
});


//                 EXPORT LS FACTOR


Export.image.toDrive({
  image: LS,
  description: 'Export_LS_Factor',
  folder: 'earthengine',
  fileNamePrefix: 'LS_Factor',
  region: aoi.geometry(),
  scale: 500,
  maxPixels: 1e13
});


//                 EXPORT C FACTOR

Export.image.toDrive({
  image: C,
  description: 'Export_C_Factor',
  folder: 'earthengine',
  fileNamePrefix: 'C_Factor',
  region: aoi.geometry(),
  scale: 500,
  maxPixels: 1e13
});


//                 EXPORT P FACTOR


Export.image.toDrive({
  image: P,
  description: 'Export_P_Factor',
  folder: 'earthengine',
  fileNamePrefix: 'P_Factor_DynamicWorld',
  region: aoi.geometry(),
  scale: 500,
  maxPixels: 1e13
});


//          EXPORT DYNAMIC WORLD LULC


Export.image.toDrive({
  image: dw,
  description: 'Export_DynamicWorld_LULC',
  folder: 'earthengine',
  fileNamePrefix: 'DynamicWorld_LULC',
  region: aoi.geometry(),
  scale: 10,
  maxPixels: 1e13
});


//             EXPORT SOIL LOSS


Export.image.toDrive({
  image: soil_loss,
  description: 'Export_Soil_Loss',
  folder: 'earthengine',
  fileNamePrefix: 'Soil_Loss_ton_ha',
  region: aoi.geometry(),
  scale: 500,
  maxPixels: 1e13
});


//                    LEGEND PANEL


var legend = ui.Panel({
  style:{
    position:'bottom-left',
    padding:'8px 15px'
  }
});

var legendTitle = ui.Label({
  value:'Soil Loss (t/ha/year)',
  style:{
    fontWeight:'bold',
    fontSize:'18px',
    margin:'0 0 4px 0',
    padding:'0'
  }
});

legend.add(legendTitle);

var makeRow = function(color,name){

  var colorBox = ui.Label({
    style:{
      backgroundColor:'#'+color,
      padding:'8px',
      margin:'0 0 4px 0'
    }
  });

  var description = ui.Label({
    value:name,
    style:{margin:'0 0 4px 6px'}
  });

  return ui.Panel({
    widgets:[colorBox,description],
    layout:ui.Panel.Layout.Flow('horizontal')
  });
};

var palette = style;

var names = [
"Slight (<10)",
"Moderate (10-20)",
"High (20-30)",
"Very High (30-40)",
"Severe (>40)"
];

for(var i=0;i<5;i++){
  legend.add(makeRow(palette[i],names[i]));
}

Map.add(legend);
