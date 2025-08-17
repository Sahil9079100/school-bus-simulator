import polyline from '@mapbox/polyline'
import { readFileSync, writeFileSync } from 'fs'

try {
  // Read ORS response
  const orsResponse = JSON.parse(readFileSync('./ors_response.json', 'utf8'))
  console.log('ORS Response:', JSON.stringify(orsResponse.routes[0].summary, null, 2))

  // Check if routes exist
  if (!orsResponse.routes || !orsResponse.routes[0] || !orsResponse.routes[0].geometry) {
    throw new Error('Invalid ORS response: routes or geometry missing')
  }

  // Extract encoded polyline
  const encodedPolyline = orsResponse.routes[0].geometry
  console.log('Encoded Polyline:', encodedPolyline)

  // Decode polyline to [latitude, longitude] array
  const decodedCoords = polyline.decode(encodedPolyline, 5) // Use precision 5
  console.log('First few decoded coords:', decodedCoords.slice(0, 5))

  // Verify coordinates are in expected range (Hyderabad: lat ~17.3-17.5, lon ~78.3-78.5)
  const firstCoord = decodedCoords[0]
  if (firstCoord[0] < 17 || firstCoord[0] > 18 || firstCoord[1] < 78 || firstCoord[1] > 79) {
    console.warn('Warning: Decoded coordinates seem incorrect for Hyderabad')
    console.log('Expected lat ~17.4486, lon ~78.3914, got:', firstCoord)
  }

  // Add timestamps (5 seconds apart, starting from 2024-07-20T10:00:00Z)
  const startTime = new Date('2024-07-20T10:00:00Z')
  const routeData = decodedCoords.map((coord, index) => ({
    latitude: coord[0],
    longitude: coord[1],
    timestamp: new Date(startTime.getTime() + index * 5000).toISOString()
  }))

  // Save to dummy-route.json
  writeFileSync('./public/dummy-route.json', JSON.stringify(routeData, null, 2))
  console.log('Generated dummy-route.json with', routeData.length, 'points')
  console.log('First few route points:', routeData.slice(0, 5))
} catch (error) {
  console.error('Error generating route:', error.message)
}