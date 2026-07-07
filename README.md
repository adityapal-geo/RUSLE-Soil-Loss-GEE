# RUSLE-Soil-Loss-GEE

# RUSLE Soil Loss Estimation using Google Earth Engine

A Google Earth Engine implementation of the Revised Universal Soil Loss Equation (RUSLE) for estimating annual soil erosion.

## Overview

This repository estimates annual soil loss using

Soil Loss = R × K × LS × C × P

where

- R = Rainfall erosivity
- K = Soil erodibility
- LS = Slope length and steepness
- C = Cover management
- P = Support practice

## Data Sources

| Dataset | Source |
|----------|--------|
| CHIRPS Rainfall | UCSB-CHG/CHIRPS |
| Soil Texture | OpenLandMap |
| DEM | SRTM 30 m |
| Sentinel-2 | Copernicus |
| Dynamic World | Google Dynamic World |

## Outputs

- Annual rainfall
- R factor
- K factor
- LS factor
- NDVI
- C factor
- Dynamic World LULC
- P factor
- Soil Loss (t/ha/year)
- Soil Loss Classification
- Area statistics
- CSV summary


## Study Area

Replace the asset path with your own FeatureCollection.

```javascript
var aoi = ee.FeatureCollection("YOUR_ASSET");
```

## How to Run

1. Open Google Earth Engine Code Editor.
2. Copy the script.
3. Replace the asset path.
4. Click Run.
5. Export outputs to Google Drive.

## Citation

If you use this code in your research, please cite the repository.

## Author

**Aditya Pal**

Department of Geography
VISVA-BHARATI
