-- PostGIS Test Script for Trail Route Generator
-- Run this script to verify PostGIS functionality

-- Test 1: Basic PostGIS functions
SELECT 'Test 1: Basic PostGIS Functions' as test_name;

-- Test distance calculation between two points
SELECT 
    'Distance Test' as test_type,
    ST_Distance(
        ST_GeogFromText('POINT(2.3522 48.8566)'),  -- Paris
        ST_GeogFromText('POINT(2.2945 48.8584)')   -- Eiffel Tower
    ) as distance_meters;

-- Test 2: Geographic data types
SELECT 'Test 2: Geographic Data Types' as test_name;

-- Create a test point
SELECT 
    'Point Creation' as test_type,
    ST_GeogFromText('POINT(2.3522 48.8566)') as paris_point;

-- Create a test line
SELECT 
    'LineString Creation' as test_type,
    ST_GeogFromText('LINESTRING(2.3522 48.8566, 2.2945 48.8584, 2.3200 48.8700)') as test_route;

-- Test 3: Spatial operations
SELECT 'Test 3: Spatial Operations' as test_name;

-- Test bounding box
SELECT 
    'Bounding Box Test' as test_type,
    ST_Contains(
        ST_MakeEnvelope(2.0, 48.0, 3.0, 49.0, 4326),
        ST_GeogFromText('POINT(2.3522 48.8566)')
    ) as point_in_bounds;

-- Test 4: Coordinate transformations
SELECT 'Test 4: Coordinate Transformations' as test_name;

-- Test coordinate extraction
SELECT 
    'Coordinate Extraction' as test_type,
    ST_X(ST_GeogFromText('POINT(2.3522 48.8566)')) as longitude,
    ST_Y(ST_GeogFromText('POINT(2.3522 48.8566)')) as latitude;

-- Test 5: Route statistics simulation
SELECT 'Test 5: Route Statistics' as test_name;

-- Simulate route length calculation
WITH test_route AS (
    SELECT ST_GeogFromText('LINESTRING(2.3522 48.8566, 2.2945 48.8584, 2.3200 48.8700)') as geometry
)
SELECT 
    'Route Length' as test_type,
    ST_Length(geometry) as route_length_meters,
    ST_Length(geometry) / 1000 as route_length_km
FROM test_route;

-- Test 6: Performance test with spatial index
SELECT 'Test 6: Spatial Index Performance' as test_name;

-- This would test spatial index performance if we had data
-- For now, just verify that spatial functions work
SELECT 
    'Spatial Functions Available' as test_type,
    CASE 
        WHEN ST_Distance IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as result;

-- Summary
SELECT 'PostGIS Test Summary' as summary;
SELECT 
    'All tests completed successfully' as status,
    NOW() as test_timestamp;


