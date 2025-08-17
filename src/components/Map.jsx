import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet'
import L from 'leaflet'
import { gsap } from 'gsap'

function Map() {
    const [routeData, setRouteData] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const center = [17.4486, 78.3914] // First point of route
    const zoom = 20 // Adjusted for longer route
    const mapRef = useRef(null)
    const markerRef = useRef(null)
    const polylineRef = useRef(null)
    const positionRef = useRef({ lat: center[0], lng: center[1] })

    // Fetch dummy-route.json
    useEffect(() => {
        fetch('/dummy-route.json')
            .then(response => response.json())
            .then(data => {
                console.log('Route data loaded:', data)
                setRouteData(data)
            })
            .catch(error => console.error('Error fetching route data:', error))
    }, [])

    // Simulate movement with setInterval
    useEffect(() => {
        if (isPlaying && routeData.length > 0 && currentIndex < routeData.length - 1) {
            const interval = setInterval(() => {
                console.log(`Current index: ${currentIndex}, Total points: ${routeData.length}`)
                setCurrentIndex(prev => {
                    if (prev + 1 >= routeData.length) {
                        setIsPlaying(false)
                        console.log('Reached end, stopping')
                        return prev
                    }
                    return prev + 1
                })
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [isPlaying, routeData, currentIndex])

    // GSAP animation for bus and polyline
    useEffect(() => {
        if (routeData.length > 0 && currentIndex < routeData.length && markerRef.current && polylineRef.current) {
            const target = routeData[currentIndex]
            const prevIndex = Math.max(0, currentIndex - 1)
            const prevPoint = routeData[prevIndex]

            // GSAP animation for bus position
            gsap.to(positionRef.current, {
                lat: target.latitude,
                lng: target.longitude,
                duration: 1,
                ease: 'linear',
                onUpdate: () => {
                    // Update bus position
                    if (markerRef.current) {
                        markerRef.current.setLatLng([positionRef.current.lat, positionRef.current.lng])
                    }
                    if (mapRef.current) {
                        mapRef.current.setView([positionRef.current.lat, positionRef.current.lng])
                    }

                    // Animate polyline to grow to current point
                    const progress = gsap.getProperty(positionRef.current, 'progress') || 0
                    const interpolatedPoints = routeData
                        .slice(0, currentIndex)
                        .map(point => [point.latitude, point.longitude])
                    if (currentIndex > 0) {
                        const subProgress = progress
                        const lat = prevPoint.latitude + subProgress * (target.latitude - prevPoint.latitude)
                        const lng = prevPoint.longitude + subProgress * (target.longitude - prevPoint.longitude)
                        interpolatedPoints.push([lat, lng])
                    }
                    polylineRef.current.setLatLngs(interpolatedPoints)
                }
            })

            // Animate progress for polyline interpolation
            gsap.to(positionRef.current, {
                progress: 1,
                duration: 1,
                ease: 'linear',
                onComplete: () => {
                    positionRef.current.progress = 0 // Reset for next segment
                }
            })
        }
    }, [currentIndex, routeData])

    // Calculate speed
    const calculateSpeed = () => {
        if (currentIndex === 0 || !routeData[currentIndex] || !routeData[currentIndex - 1]) {
            return 0
        }
        const currentPoint = routeData[currentIndex]
        const prevPoint = routeData[currentIndex - 1]
        const toRad = (deg) => deg * Math.PI / 180
        const R = 6371
        const dLat = toRad(currentPoint.latitude - prevPoint.latitude)
        const dLon = toRad(currentPoint.longitude - prevPoint.longitude)
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(prevPoint.latitude)) * Math.cos(toRad(currentPoint.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c
        const timeDiff = (new Date(currentPoint.timestamp) - new Date(prevPoint.timestamp)) / 1000 / 3600
        return timeDiff > 0 ? (distance / timeDiff).toFixed(2) : 0
    }

    // Calculate bearing for rotation
    const calculateBearing = () => {
        if (currentIndex === 0 || !routeData[currentIndex] || !routeData[currentIndex - 1]) {
            return 0
        }
        const currentPoint = routeData[currentIndex]
        const prevPoint = routeData[currentIndex - 1]
        const toRad = (deg) => deg * Math.PI / 180
        const dLon = toRad(currentPoint.longitude - prevPoint.longitude)
        const y = Math.sin(dLon) * Math.cos(toRad(currentPoint.latitude))
        const x =
            Math.cos(toRad(prevPoint.latitude)) * Math.sin(toRad(currentPoint.latitude)) -
            Math.sin(toRad(prevPoint.latitude)) * Math.cos(toRad(currentPoint.latitude)) * Math.cos(dLon)
        const bearing = Math.atan2(y, x) * 180 / Math.PI
        return (bearing + 360) % 360
    }

    // Current metadata
    const currentMetadata = routeData[currentIndex]
        ? {
            latitude: positionRef.current.lat.toFixed(6),
            longitude: positionRef.current.lng.toFixed(6),
            timestamp: routeData[currentIndex].timestamp,
            speed: calculateSpeed()
        }
        : { latitude: 'N/A', longitude: 'N/A', timestamp: 'N/A', speed: 0 }

    // Handle slider change
    const handleSliderChange = (e) => {
        const newIndex = parseInt(e.target.value)
        setCurrentIndex(newIndex)
        setIsPlaying(false)
        if (routeData[newIndex]) {
            positionRef.current.lat = routeData[newIndex].latitude
            positionRef.current.lng = routeData[newIndex].longitude
            if (markerRef.current) {
                markerRef.current.setLatLng([routeData[newIndex].latitude, routeData[newIndex].longitude])
            }
            if (mapRef.current) {
                mapRef.current.setView([routeData[newIndex].latitude, routeData[newIndex].longitude], zoom)
            }
        }
    }

    // Custom bus icon with rotation
    const busIcon = L.divIcon({
        html: `<img src="/assets/bus2.png" style="transform: rotate(${calculateBearing()}deg); width: 32px; height: 32px;" />`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
        className: ''
    })

    return (
        <div className="h-full w-full relative">
            <div className="absolute top-2 left-16 bg-white/50 p-4 rounded-lg shadow-lg z-10 flex flex-col gap-2">
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={() => {
                        console.log('Play/Pause clicked, isPlaying:', !isPlaying)
                        setIsPlaying(!isPlaying)
                    }}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
                {routeData.length > 0 && (
                    <div className="text-sm text-gray-700">
                        <p><strong>Latitude:</strong> {currentMetadata.latitude}</p>
                        <p><strong>Longitude:</strong> {currentMetadata.longitude}</p>
                        <p><strong>Timestamp:</strong> {currentMetadata.timestamp}</p>
                        <p><strong>Speed:</strong> {currentMetadata.speed} km/h</p>
                    </div>
                )}
                {routeData.length > 0 && (
                    <div className="mt-2">
                        <input
                            type="range"
                            min="0"
                            max={routeData.length - 1}
                            value={currentIndex}
                            onChange={handleSliderChange}
                            className="w-full"
                        />
                        <p className="text-sm text-gray-700 mt-1">
                            Point: {currentIndex + 1} / {routeData.length}
                        </p>
                    </div>
                )}
            </div>
            <MapContainer
                center={center}
                zoom={zoom}
                className="h-full w-full z-0"
                scrollWheelZoom={false}
                ref={mapRef}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {routeData.length > 0 && (
                    <Polyline
                        positions={[]}
                        color="blue"
                        weight={4}
                        ref={polylineRef}
                    />
                )}
                {routeData.length > 0 && (
                    <Marker
                        position={[positionRef.current.lat, positionRef.current.lng]}
                        icon={busIcon}
                        ref={markerRef}
                    />
                )}
            </MapContainer>
        </div>
    )
}

export default Map