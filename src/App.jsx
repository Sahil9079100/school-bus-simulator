import Map from './components/Map'
import './index.css' // Or '../dist/output.css' if still using it

function App() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-600 text-center p-4">
        School Bus Simulator
        {/* S.B.S */}
      </h1>
      <div className="flex-1">
        <Map />
      </div>
    </div>
  )
}

export default App