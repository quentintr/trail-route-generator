-- PostGIS Initialization Script for Trail Route Generator
-- Run this script after creating the database to enable PostGIS support

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Create spatial reference system if needed (WGS84 - SRID 4326)
-- This is usually already available, but we ensure it exists
INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext)
SELECT 4326, 'EPSG', 4326, 
'+proj=longlat +datum=WGS84 +no_defs',
'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]'
WHERE NOT EXISTS (SELECT 1 FROM spatial_ref_sys WHERE srid = 4326);

-- Create indexes for better geographic query performance
-- These will be created automatically by Prisma, but we can add custom ones here

-- Example: Create a spatial index on routes geometry (if table exists)
-- CREATE INDEX IF NOT EXISTS idx_routes_geometry ON routes USING GIST (geometry);

-- Example: Create a spatial index on segments geometry (if table exists)  
-- CREATE INDEX IF NOT EXISTS idx_segments_geometry ON segments USING GIST (geometry);

-- Verify the setup
SELECT 
    'PostGIS Extension' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
        THEN 'Enabled' 
        ELSE 'Not Found' 
    END as status;

SELECT 
    'Spatial Reference System 4326' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM spatial_ref_sys WHERE srid = 4326) 
        THEN 'Available' 
        ELSE 'Not Found' 
    END as status;


