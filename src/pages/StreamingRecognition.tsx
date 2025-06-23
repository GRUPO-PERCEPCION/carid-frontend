import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, VideoOff, Settings, Wifi } from "lucide-react";
import { Link } from "react-router-dom";

const StreamingRecognition = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [detections, setDetections] = useState<Array<{plate: string, confidence: number, time: string}>>([]);

  const handleStartStreaming = () => {
    setIsStreaming(true);
    setIsConnected(true);
    
    // Simulate real-time detections
    const interval = setInterval(() => {
      const plates = ['ABC-123', 'XYZ-789', 'DEF-456', 'GHI-101', 'JKL-202'];
      const randomPlate = plates[Math.floor(Math.random() * plates.length)];
      const confidence = Math.random() * 20 + 80; // 80-100%
      const time = new Date().toLocaleTimeString();
      
      setDetections(prev => [
        { plate: randomPlate, confidence, time },
        ...prev.slice(0, 9) // Keep only last 10 detections
      ]);
    }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds

    // Store interval ID to clear later
    (window as any).detectionInterval = interval;
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    setIsConnected(false);
    if ((window as any).detectionInterval) {
      clearInterval((window as any).detectionInterval);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/recognition" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 text-white" />
              <span className="text-white">Volver a métodos</span>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Streaming en Tiempo Real</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Streaming en Tiempo Real</h1>
            <p className="text-gray-300">Conecta una cámara IP o webcam para reconocimiento continuo</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Stream Controls */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Control de Stream</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-white text-sm">
                      {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {!isStreaming ? (
                      <Button
                        onClick={handleStartStreaming}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Iniciar Stream
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStopStreaming}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        <VideoOff className="w-4 h-4 mr-2" />
                        Detener Stream
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configuración
                    </Button>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 text-sm">Configuración Actual</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fuente:</span>
                        <span className="text-white">Webcam</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Resolución:</span>
                        <span className="text-white">1920x1080</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">FPS:</span>
                        <span className="text-white">30</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Feed */}
            <Card className="lg:col-span-2 bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Feed en Vivo</h3>
                  {isStreaming && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-400 text-sm">EN VIVO</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-black rounded-lg aspect-video relative overflow-hidden">
                  {!isStreaming ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <VideoOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Stream desactivado</p>
                        <p className="text-gray-500 text-sm">Presiona "Iniciar Stream" para comenzar</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Simulated video feed background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
                      
                      {/* Simulated detection boxes */}
                      <div className="absolute top-1/3 left-1/4 w-32 h-16 border-2 border-green-400 rounded">
                        <div className="absolute -top-6 left-0 bg-green-400 text-black px-2 py-1 text-xs rounded">
                          ABC-123 (97%)
                        </div>
                      </div>
                      
                      {/* Stream info overlay */}
                      <div className="absolute top-4 left-4 bg-black/70 rounded px-3 py-2">
                        <div className="flex items-center space-x-2 text-xs">
                          <Wifi className="w-3 h-3 text-green-400" />
                          <span className="text-white">30 FPS</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-white">27ms</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {isStreaming && (
                  <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">
                    <div className="bg-white/5 rounded p-3">
                      <div className="text-green-400 font-semibold">Detecciones</div>
                      <div className="text-white">{detections.length}</div>
                    </div>
                    <div className="bg-white/5 rounded p-3">
                      <div className="text-blue-400 font-semibold">FPS</div>
                      <div className="text-white">30.2</div>
                    </div>
                    <div className="bg-white/5 rounded p-3">
                      <div className="text-purple-400 font-semibold">Latencia</div>
                      <div className="text-white">25ms</div>
                    </div>
                    <div className="bg-white/5 rounded p-3">
                      <div className="text-yellow-400 font-semibold">Precisión</div>
                      <div className="text-white">96.8%</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Real-time Detections */}
          {isStreaming && (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm mt-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Detecciones en Tiempo Real</h3>
                
                {detections.length === 0 ? (
                  <div className="text-center py-8">
                    <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">Esperando detecciones...</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detections.map((detection, index) => (
                      <div
                        key={index}
                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-mono text-lg">{detection.plate}</span>
                          <span className="text-xs text-gray-400">{detection.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Confianza:</span>
                          <span className="text-green-400 text-sm">{detection.confidence.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-1 rounded-full"
                            style={{ width: `${detection.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreamingRecognition;
