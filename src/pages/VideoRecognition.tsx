import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, Upload, Play, Pause, Target, Download, AlertCircle, CheckCircle, Zap, Eye, Clock, Film } from "lucide-react";
import { Link } from "react-router-dom";

// Interfaces para tipado
interface UniquePlate {
  plate_text: string;
  detection_count: number;
  best_confidence: number;
  is_valid_format: boolean;
  frame_numbers: number[];
  first_detection_time: number;
  last_detection_time: number;
}

interface VideoDetectionResponse {
  success: boolean;
  message: string;
  data?: {
    success: boolean;
    unique_plates: UniquePlate[];
    best_plate?: UniquePlate;
    processing_time: number;
    processing_summary: {
      frames_processed: number;
      frames_with_detections: number;
      total_detections: number;
      unique_plates_found: number;
    };
    video_info: {
      duration_seconds: number;
      frame_count: number;
      fps: number;
      resolution: string;
    };
    result_urls?: {
      annotated_video_url?: string;
      best_frames_urls?: string[];
    };
  };
  timestamp?: number;
}

interface QuickVideoResponse {
  success: boolean;
  unique_plates_count: number;
  best_plate_text: string;
  best_confidence: number;
  detection_count: number;
  is_valid_format: boolean;
  processing_time: number;
  frames_processed: number;
  message?: string;
}

const VideoRecognition = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UniquePlate[]>([]);
  const [processingStats, setProcessingStats] = useState<any>(null);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [annotatedVideoUrl, setAnnotatedVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Configuración de la API
  const API_BASE_URL = "http://localhost:8000"; // Ajusta según tu configuración

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea un archivo de video
      const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        setError('Formato de video no soportado. Use MP4, AVI, MOV, MKV o WebM');
        return;
      }

      // Validar tamaño (máximo 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        setError('El archivo es muy grande. Máximo 500MB permitido');
        return;
      }

      setSelectedFile(file);
      setSelectedVideo(URL.createObjectURL(file));
      setResults([]);
      setError(null);
      setProgress(0);
      setProcessingStats(null);
      setVideoInfo(null);
      setAnnotatedVideoUrl(null);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    event.target.value = '';
  };

  const simulateProgress = (targetProgress: number, duration: number) => {
    const steps = 50;
    const increment = targetProgress / steps;
    const interval = duration / steps;

    let currentStep = 0;

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      currentStep++;
      setProgress(prev => Math.min(prev + increment, targetProgress));

      if (currentStep >= steps) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
    }, interval);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setProgress(0);

    try {
      // Simular progreso inicial
      simulateProgress(20, 1000);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('confidence_threshold', '0.4');
      formData.append('iou_threshold', '0.4');
      formData.append('frame_skip', '3');
      formData.append('max_duration', '300');
      formData.append('save_results', 'true');
      formData.append('save_best_frames', 'true');
      formData.append('create_annotated_video', 'true');
      formData.append('min_detection_frames', '2');

      // Simular progreso de procesamiento
      simulateProgress(80, 2000);

      const response = await fetch(`${API_BASE_URL}/api/v1/video/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: VideoDetectionResponse = await response.json();

      // Completar progreso
      setProgress(100);

      if (data.success && data.data) {
        setResults(data.data.unique_plates || []);
        setProcessingStats(data.data.processing_summary);
        setVideoInfo(data.data.video_info);

        // Si hay video anotado, mostrarlo
        if (data.data.result_urls?.annotated_video_url) {
          setAnnotatedVideoUrl(`${API_BASE_URL}${data.data.result_urls.annotated_video_url}`);
        }
      } else {
        setError(data.message || 'Error desconocido en el procesamiento');
      }

    } catch (err) {
      console.error('Error al procesar video:', err);
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor');
    } finally {
      setIsProcessing(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  };

  const handleQuickProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setProgress(0);

    try {
      // Progreso más rápido para detección rápida
      simulateProgress(100, 3000);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('confidence_threshold', '0.5');
      formData.append('frame_skip', '5');
      formData.append('max_duration', '60');

      const response = await fetch(`${API_BASE_URL}/api/v1/video/detect/quick`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: QuickVideoResponse = await response.json();

      if (data.success && data.best_plate_text) {
        // Convertir respuesta rápida a formato estándar
        const quickResult: UniquePlate = {
          plate_text: data.best_plate_text,
          detection_count: data.detection_count,
          best_confidence: data.best_confidence,
          is_valid_format: data.is_valid_format,
          frame_numbers: [],
          first_detection_time: 0,
          last_detection_time: 0
        };
        setResults([quickResult]);
        setProcessingStats({
          frames_processed: data.frames_processed,
          unique_plates_found: data.unique_plates_count,
          total_detections: data.detection_count,
          frames_with_detections: data.detection_count > 0 ? 1 : 0
        });
      } else {
        setError(data.message || 'No se detectaron placas en el video');
      }

    } catch (err) {
      console.error('Error en detección rápida:', err);
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      video_info: videoInfo,
      processing_stats: processingStats,
      unique_plates: results,
      total_unique_plates: results.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video_detecciones_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const getDetectionCountColor = (count: number) => {
    if (count >= 10) return "bg-green-500/20 border-green-500/30 text-green-400";
    if (count >= 5) return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400";
    return "bg-blue-500/20 border-blue-500/30 text-blue-400";
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
              <p className="text-gray-300">Carga un archivo de video para análisis frame por frame con tracking inteligente</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">{error}</span>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Upload Section */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Subir Video</h3>

                  {!selectedFile ? (
                      <div
                          className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
                          onClick={() => document.getElementById('video-input')?.click()}
                      >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-white mb-1 text-sm">Selecciona tu video</p>
                        <p className="text-gray-400 text-xs mb-3">MP4, AVI, MOV, MKV, WebM (máx. 500MB)</p>
                        <input
                            type="file"
                            accept="video/mp4,video/avi,video/mov,video/mkv,video/webm"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="video-input"
                        />
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white pointer-events-none"
                            type="button"
                        >
                          Seleccionar
                        </Button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <Video className="w-8 h-8 text-green-400" />
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">{selectedFile.name}</p>
                              <p className="text-gray-400 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                              onClick={handleProcess}
                              disabled={isProcessing}
                              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                          >
                            {isProcessing ? (
                                <>
                                  <Film className="w-4 h-4 mr-2 animate-spin" />
                                  Procesando...
                                </>
                            ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Análisis Completo
                                </>
                            )}
                          </Button>

                          <Button
                              onClick={handleQuickProcess}
                              disabled={isProcessing}
                              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                          >
                            {isProcessing ? (
                                <>
                                  <Zap className="w-4 h-4 mr-2 animate-spin" />
                                  Procesando...
                                </>
                            ) : (
                                <>
                                  <Zap className="w-4 h-4 mr-2" />
                                  Detección Rápida
                                </>
                            )}
                          </Button>
                        </div>

                        <Button
                            onClick={() => {
                              setSelectedFile(null);
                              setSelectedVideo(null);
                              setResults([]);
                              setProgress(0);
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full border-white/20 text-white hover:bg-white/10"
                        >
                          Cambiar Video
                        </Button>
                      </div>
                  )}

                  {isProcessing && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progreso</span>
                          <span className="text-white">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-gray-400 text-xs mt-2">
                          {progress < 30 ? "Preparando video..." :
                              progress < 80 ? "Analizando frames..." :
                                  "Finalizando procesamiento..."}
                        </p>
                      </div>
                  )}

                  <div className="mt-6 bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 text-sm">Características</h4>
                    <div className="space-y-1 text-xs text-gray-400">
                      <div>• Tracking inteligente de placas</div>
                      <div>• Detección frame por frame</div>
                      <div>• Eliminación de duplicados</div>
                      <div>• Máximo 5 minutos (configurable)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Video Preview */}
              <Card className="lg:col-span-2 bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Preview y Control</h3>

                  {!selectedVideo ? (
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
                              ref={videoRef}
                              className="w-full h-full object-cover"
                              src={annotatedVideoUrl || selectedVideo}
                              onTimeUpdate={handleVideoTimeUpdate}
                              onPlay={() => setIsPlaying(true)}
                              onPause={() => setIsPlaying(false)}
                              controls
                          />
                          {annotatedVideoUrl && (
                              <div className="absolute top-2 right-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
                                Video Anotado
                              </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-4">
                          <Button
                              onClick={handlePlayPause}
                              size="sm"
                              className="bg-white/10 hover:bg-white/20 text-white"
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-400 text-sm">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                        </div>
                      </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            {(isProcessing || results.length > 0) && (
                <Card className="bg-white/10 border-white/20 backdrop-blur-sm mt-8">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Resultados del Análisis</h3>
                      {processingStats && (
                          <span className="text-sm text-gray-400">
                      {processingStats.frames_processed} frames procesados
                    </span>
                      )}
                    </div>

                    {progress < 100 && isProcessing ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                          <p className="text-white">Analizando frames del video...</p>
                          <p className="text-gray-400 text-sm">
                            {progress < 30 ? "Inicializando..." :
                                progress < 80 ? `Procesando frame ${Math.floor(progress * 2)}...` :
                                    "Generando resultados..."}
                          </p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-6">
                          {/* Estadísticas Generales */}
                          {processingStats && (
                              <div className="grid md:grid-cols-4 gap-4">
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Target className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{results.length}</p>
                                  <p className="text-gray-400 text-sm">Placas Únicas</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Film className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{processingStats.frames_processed}</p>
                                  <p className="text-gray-400 text-sm">Frames Procesados</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Eye className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{processingStats.total_detections}</p>
                                  <p className="text-gray-400 text-sm">Total Detecciones</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">
                                    {videoInfo ? `${videoInfo.duration_seconds.toFixed(1)}s` : '-'}
                                  </p>
                                  <p className="text-gray-400 text-sm">Duración</p>
                                </div>
                              </div>
                          )}

                          {/* Lista de Placas Detectadas */}
                          <div className="space-y-4">
                            <h4 className="text-white font-semibold">Matrículas Detectadas</h4>
                            {results.map((result, index) => (
                                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <span className="text-white font-mono text-xl">{result.plate_text}</span>
                                      {result.is_valid_format && (
                                          <CheckCircle className="w-5 h-5 text-green-400" />
                                      )}
                                    </div>
                                    <span className={`text-sm font-semibold ${getConfidenceColor(result.best_confidence)}`}>
                              {(result.best_confidence * 100).toFixed(1)}% máx
                            </span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Detecciones:</span>
                                      <span className={`px-2 py-1 rounded text-xs ${getDetectionCountColor(result.detection_count)}`}>
                                {result.detection_count} frames
                              </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Formato válido:</span>
                                      <span className={result.is_valid_format ? "text-green-400" : "text-red-400"}>
                                {result.is_valid_format ? "Sí" : "No"}
                              </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Confianza:</span>
                                      <span className="text-white">
                                {(result.best_confidence * 100).toFixed(1)}%
                              </span>
                                    </div>
                                  </div>

                                  <div className="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${result.best_confidence * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                            ))}
                          </div>

                          {/* Botón de Exportar */}
                          <div className="mt-6 p-4 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-lg border border-white/10">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-white font-semibold">Resumen del Análisis</h4>
                                <p className="text-gray-400 text-sm">
                                  {results.length} matrícula{results.length !== 1 ? 's' : ''} única{results.length !== 1 ? 's' : ''} detectada{results.length !== 1 ? 's' : ''}
                                  {results.filter(r => r.is_valid_format).length > 0 && (
                                      <span className="text-green-400 ml-2">
                                ({results.filter(r => r.is_valid_format).length} válida{results.filter(r => r.is_valid_format).length !== 1 ? 's' : ''})
                              </span>
                                  )}
                                </p>
                              </div>
                              <Button
                                  onClick={exportResults}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar
                              </Button>
                            </div>
                          </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400 mb-2">No se detectaron placas</p>
                          <p className="text-gray-500 text-sm">Intenta con un video diferente o ajusta la configuración</p>
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