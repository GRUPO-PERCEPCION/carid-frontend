
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, Upload, Play, Pause, Target } from "lucide-react";
import { Link } from "react-router-dom";

const VideoRecognition = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleProcess = () => {
    setIsProcessing(true);
    setProgress(0);
    
    // Simulate processing with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
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
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Reconocimiento por Video</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Reconocimiento por Video</h1>
            <p className="text-gray-300">Carga un archivo de video para análisis frame por frame</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Upload Section */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Subir Video</h3>
                
                {!selectedFile ? (
                  <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-white mb-1 text-sm">Selecciona tu video</p>
                    <p className="text-gray-400 text-xs mb-3">MP4, AVI, MOV</p>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="video-input"
                    />
                    <label htmlFor="video-input">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                        Seleccionar
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Video className="w-8 h-8 text-green-400" />
                        <div>
                          <p className="text-white font-medium text-sm">{selectedFile.name}</p>
                          <p className="text-gray-400 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                      >
                        {isProcessing ? "Procesando..." : "Analizar Video"}
                      </Button>
                      <Button
                        onClick={() => setSelectedFile(null)}
                        variant="outline"
                        size="sm"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        Cambiar Video
                      </Button>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Progreso</span>
                      <span className="text-white">{progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Preview */}
            <Card className="lg:col-span-2 bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Preview y Control</h3>
                
                {!selectedFile ? (
                  <div className="bg-black/30 rounded-lg aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">El video aparecerá aquí</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-black rounded-lg aspect-video relative overflow-hidden">
                      <video
                        className="w-full h-full object-cover"
                        controls
                        src={selectedFile ? URL.createObjectURL(selectedFile) : undefined}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Button
                        onClick={() => setIsPlaying(!isPlaying)}
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full w-1/3"></div>
                      </div>
                      <span className="text-gray-400 text-sm">02:30 / 07:45</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          {(isProcessing || progress === 100) && (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm mt-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Resultados del Análisis</h3>
                
                {progress < 100 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                    <p className="text-white">Analizando frames del video...</p>
                    <p className="text-gray-400 text-sm">Frame {Math.floor(progress * 2.3)} de 230</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3">Matrículas Detectadas</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-green-500/20 rounded border border-green-500/30">
                          <span className="text-white font-mono">ABC-123</span>
                          <span className="text-green-400 text-xs">15 frames</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-blue-500/20 rounded border border-blue-500/30">
                          <span className="text-white font-mono">XYZ-789</span>
                          <span className="text-blue-400 text-xs">8 frames</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-yellow-500/20 rounded border border-yellow-500/30">
                          <span className="text-white font-mono">DEF-456</span>
                          <span className="text-yellow-400 text-xs">3 frames</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3">Estadísticas</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Frames procesados:</span>
                          <span className="text-white">230</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Matrículas únicas:</span>
                          <span className="text-white">3</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tiempo de procesamiento:</span>
                          <span className="text-white">5.2s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">FPS promedio:</span>
                          <span className="text-green-400">44.2</span>
                        </div>
                      </div>
                    </div>
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

export default VideoRecognition;
