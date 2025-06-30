import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Video, Upload, Play, Pause, Target, Download,
  AlertCircle, CheckCircle, Zap, Eye, Clock, Film, Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import {streamingApi} from "@/services/streamingApi.ts";

// Interfaces TypeScript bien definidas
interface UniquePlate {
  plate_text: string;
  detection_count: number;
  best_confidence: number;
  is_valid_format: boolean;
  is_six_char_valid?: boolean;
  frame_numbers?: number[];
  first_detection_time?: number;
  last_detection_time?: number;
  first_seen_frame?: number;
  last_seen_frame?: number;
  best_frame?: number;
  avg_confidence?: number;
  stability_score?: number;
  duration_frames?: number;
  char_count?: number;
  processing_method?: string;
}

interface ProcessingSummary {
  frames_processed: number;
  frames_with_detections: number;
  total_detections: number;
  unique_plates_found: number;
  valid_plates?: number;
  six_char_plates?: number;
}

interface VideoInfo {
  duration_seconds: number;
  frame_count: number;
  fps: number;
  resolution?: string;
  width?: number;
  height?: number;
  frames_to_process?: number;
  file_size_mb?: number;
}

interface EnhancementInfo {
  roi_enabled: boolean;
  six_char_filter: boolean;
  roi_percentage: number;
}

interface FileInfo {
  filename: string;
  size_mb: number;
  dimensions?: {
    width: number;
    height: number;
  };
  format?: string;
}

interface ResultUrls {
  annotated_video_url?: string;
  best_frames_urls?: string[];
  original?: string;
}

interface VideoDetectionResponse {
  success: boolean;
  message: string;
  data?: {
    success: boolean;
    unique_plates: UniquePlate[];
    best_plate?: UniquePlate;
    processing_time: number;
    processing_summary: ProcessingSummary;
    video_info: VideoInfo;
    file_info: FileInfo;
    result_urls?: ResultUrls;
    enhancement_info?: EnhancementInfo;
  };
  // Campos de compatibilidad para respuestas directas
  unique_plates?: UniquePlate[];
  processing_summary?: ProcessingSummary;
  video_info?: VideoInfo;
  result_urls?: ResultUrls;
  enhancement_info?: EnhancementInfo;
  timestamp?: string;
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

const VideoRecognition: React.FC = () => {
  // Estados con tipos explícitos
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<UniquePlate[]>([]);
  const [processingStats, setProcessingStats] = useState<ProcessingSummary | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [annotatedVideoUrl, setAnnotatedVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [enhancementInfo, setEnhancementInfo] = useState<EnhancementInfo | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = streamingApi.baseUrl;

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        setError('Formato de video no soportado. Use MP4, AVI, MOV, MKV o WebM');
        return;
      }

      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        setError('El archivo es muy grande. Máximo 500MB permitido');
        return;
      }

      setSelectedFile(file);
      setSelectedVideo(URL.createObjectURL(file));
      resetResults();
    }
    // Limpiar input
    if (event.target) {
      event.target.value = '';
    }
  }, []);

  const resetResults = useCallback(() => {
    setResults([]);
    setError(null);
    setProgress(0);
    setProcessingStats(null);
    setVideoInfo(null);
    setAnnotatedVideoUrl(null);
    setEnhancementInfo(null);
    setProcessingTime(0);
  }, []);

  const simulateProgress = useCallback((targetProgress: number, duration: number) => {
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

      if (currentStep >= steps && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }, interval);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    resetResults();

    try {
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

      simulateProgress(80, 2000);

      const response = await fetch(`${API_BASE_URL}/api/v1/video/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: VideoDetectionResponse = await response.json();
      setProgress(100);

      if (data.success) {
        // Manejo robusto de respuesta anidada o directa
        const uniquePlates = data.data?.unique_plates || data.unique_plates || [];
        const processingSummary = data.data?.processing_summary || data.processing_summary;
        const videoInfoData = data.data?.video_info || data.video_info;
        const resultUrls = data.data?.result_urls || data.result_urls;
        const enhancementData = data.data?.enhancement_info || data.enhancement_info;
        const processingTimeData = data.data?.processing_time || 0;

        setResults(uniquePlates);
        setProcessingStats(processingSummary || null);
        setVideoInfo(videoInfoData || null);
        setEnhancementInfo(enhancementData || null);
        setProcessingTime(processingTimeData);

        if (resultUrls?.annotated_video_url) {
          setAnnotatedVideoUrl(`${API_BASE_URL}${resultUrls.annotated_video_url}`);
        }

        const sixCharCount = uniquePlates.filter(p => p.is_six_char_valid).length;
        toast.success('Análisis completado', {
          description: `${uniquePlates.length} placas detectadas${sixCharCount > 0 ? ` (${sixCharCount} con 6 caracteres válidos)` : ''}`
        });
      } else {
        setError(data.message || 'Error desconocido en el procesamiento');
        toast.error('Error en el procesamiento', {
          description: data.message || 'No se pudo procesar el video'
        });
      }

    } catch (err) {
      console.error('Error al procesar video:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión con el servidor';
      setError(errorMessage);
      toast.error('Error de conexión', {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  }, [selectedFile, resetResults, simulateProgress]);

  const handleQuickProcess = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    resetResults();

    try {
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
        const quickResult: UniquePlate = {
          plate_text: data.best_plate_text,
          detection_count: data.detection_count,
          best_confidence: data.best_confidence,
          is_valid_format: data.is_valid_format,
          is_six_char_valid: false,
          char_count: data.best_plate_text.replace(/[-\s]/g, '').length,
          processing_method: "quick"
        };

        setResults([quickResult]);
        setProcessingStats({
          frames_processed: data.frames_processed,
          unique_plates_found: data.unique_plates_count,
          total_detections: data.detection_count,
          frames_with_detections: data.detection_count > 0 ? 1 : 0,
          valid_plates: data.is_valid_format ? 1 : 0,
          six_char_plates: 0
        });
        setProcessingTime(data.processing_time);

        toast.success('Detección rápida completada', {
          description: data.best_plate_text ? `Placa encontrada: ${data.best_plate_text}` : 'No se detectaron placas'
        });
      } else {
        setError(data.message || 'No se detectaron placas en el video');
        toast.warning('Sin resultados', {
          description: 'No se detectaron placas válidas en el video'
        });
      }

    } catch (err) {
      console.error('Error en detección rápida:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión con el servidor';
      setError(errorMessage);
      toast.error('Error en detección rápida', {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, resetResults, simulateProgress]);

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setSelectedVideo(null);
    resetResults();
  }, [resetResults]);

  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const exportResults = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      video_info: videoInfo,
      processing_stats: processingStats,
      enhancement_info: enhancementInfo,
      processing_time: processingTime,
      unique_plates: results,
      total_unique_plates: results.length,
      six_char_plates: results.filter(p => p.is_six_char_valid).length,
      valid_plates: results.filter(p => p.is_valid_format).length
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
  }, [videoInfo, processingStats, enhancementInfo, processingTime, results]);

  // Helper functions con tipos explícitos
  const getConfidenceColor = useCallback((confidence: number): string => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  }, []);

  const getDetectionCountColor = useCallback((count: number): string => {
    if (count >= 10) return "bg-green-500/20 border-green-500/30 text-green-400";
    if (count >= 5) return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400";
    return "bg-blue-500/20 border-blue-500/30 text-blue-400";
  }, []);

  const getSixCharIndicator = useCallback((plate: UniquePlate): JSX.Element | null => {
    if (plate.is_six_char_valid) {
      return (
          <div className="flex items-center space-x-1 text-green-400">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-semibold">6 CHARS</span>
          </div>
      );
    }
    return null;
  }, []);

  const getProgressMessage = useCallback((progress: number): string => {
    if (progress < 30) return "Preparando video con ROI...";
    if (progress < 80) return "Analizando frames (ROI + 6 chars)...";
    return "Finalizando procesamiento...";
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }, []);

  // Filtros calculados
  const validPlates = results.filter(p => p.is_valid_format);
  const sixCharPlates = results.filter(p => p.is_six_char_valid);

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
                {enhancementInfo && (
                    <div className="flex items-center space-x-2 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-purple-400">ROI + 6 CHARS</span>
                    </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Reconocimiento por Video</h1>
              <p className="text-gray-300">
                Análisis con ROI central (10%) y filtro de 6 caracteres para placas peruanas
              </p>
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
                          onClick={triggerFileSelect}
                      >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-white mb-1 text-sm">Selecciona tu video</p>
                        <p className="text-gray-400 text-xs mb-3">MP4, AVI, MOV, MKV, WebM (máx. 500MB)</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/avi,video/mov,video/mkv,video/webm"
                            onChange={handleFileSelect}
                            className="hidden"
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
                            <div className="flex-1 min-w-0">
                              <p
                                  className="text-white font-medium text-sm truncate"
                                  title={selectedFile.name}
                                  style={{ maxWidth: "180px" }}
                              >
                                {selectedFile.name}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {formatFileSize(selectedFile.size)}
                              </p>
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
                                  Análisis ROI
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
                            onClick={resetForm}
                            size="sm"
                            className="w-full bg-white/10 text-white border border-white/30 hover:bg-blue-600/70 hover:text-white hover:border-blue-400"
                        >
                          Cambiar Video
                        </Button>
                      </div>
                  )}

                  {/* Progreso */}
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
                          />
                        </div>
                        <p className="text-gray-400 text-xs mt-2">
                          {getProgressMessage(progress)}
                        </p>
                      </div>
                  )}

                  {/* Características */}
                  <div className="mt-6 bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 text-sm">Características Mejoradas</h4>
                    <div className="space-y-1 text-xs text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-3 h-3 text-purple-400" />
                        <span>ROI central (10% de la imagen)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Target className="w-3 h-3 text-green-400" />
                        <span>Filtro de 6 caracteres exactos</span>
                      </div>
                      <div>• Tracking inteligente de placas</div>
                      <div>• Eliminación de duplicados</div>
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
                              tabIndex={0}
                          />
                          {annotatedVideoUrl && (
                              <div className="absolute top-2 right-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
                                Video Anotado
                              </div>
                          )}
                          {enhancementInfo?.roi_enabled && (
                              <div className="absolute top-2 left-2 bg-purple-600/80 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                                <Shield className="w-3 h-3" />
                                <span>ROI {enhancementInfo.roi_percentage}%</span>
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
                            />
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
                      <div className="flex items-center space-x-4">
                        {processingStats && (
                            <span className="text-sm text-gray-400">
                        {processingStats.frames_processed} frames procesados
                      </span>
                        )}
                        {enhancementInfo && (
                            <div className="flex items-center space-x-2 bg-purple-500/20 border border-purple-500/30 rounded px-2 py-1">
                              <Shield className="w-3 h-3 text-purple-400" />
                              <span className="text-xs text-purple-400">
                          ROI {enhancementInfo.roi_percentage}% + 6 chars
                        </span>
                            </div>
                        )}
                      </div>
                    </div>

                    {progress < 100 && isProcessing ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                          <p className="text-white">Analizando frames del video...</p>
                          <p className="text-gray-400 text-sm">
                            {getProgressMessage(progress)}
                          </p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-6">
                          {/* Estadísticas */}
                          {processingStats && (
                              <div className="grid md:grid-cols-5 gap-4">
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Target className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{results.length}</p>
                                  <p className="text-gray-400 text-sm">Placas Únicas</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Shield className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{sixCharPlates.length}</p>
                                  <p className="text-gray-400 text-sm">6 Caracteres</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <CheckCircle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{validPlates.length}</p>
                                  <p className="text-gray-400 text-sm">Válidas</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Film className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{processingStats.frames_processed}</p>
                                  <p className="text-gray-400 text-sm">Frames</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Clock className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">
                                    {videoInfo ? `${videoInfo.duration_seconds.toFixed(1)}s` : '-'}
                                  </p>
                                  <p className="text-gray-400 text-sm">Duración</p>
                                </div>
                              </div>
                          )}

                          {/* Filtros */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-semibold">Matrículas Detectadas</h4>
                            <div className="flex items-center space-x-3 text-sm">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                <span className="text-gray-400">6 caracteres ({sixCharPlates.length})</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                                <span className="text-gray-400">Válidas ({validPlates.length})</span>
                              </div>
                            </div>
                          </div>

                          {/* Lista de placas */}
                          <div className="space-y-4">
                            {results
                                .sort((a, b) => {
                                  // Priorizar placas de 6 caracteres, luego por confianza
                                  if (a.is_six_char_valid && !b.is_six_char_valid) return -1;
                                  if (!a.is_six_char_valid && b.is_six_char_valid) return 1;
                                  return b.best_confidence - a.best_confidence;
                                })
                                .map((result, index) => (
                                    <div
                                        key={`${result.plate_text}-${index}`}
                                        className={`
                              bg-white/5 rounded-lg p-4 border transition-all
                              ${result.is_six_char_valid
                                            ? 'border-green-500/30 bg-green-500/5'
                                            : result.is_valid_format
                                                ? 'border-yellow-500/20 bg-yellow-500/5'
                                                : 'border-white/10'
                                        }
                            `}
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                          <span className="text-white font-mono text-xl">{result.plate_text}</span>

                                          {/* Indicadores */}
                                          <div className="flex items-center space-x-2">
                                            {getSixCharIndicator(result)}
                                            {result.is_valid_format && !result.is_six_char_valid && (
                                                <CheckCircle className="w-4 h-4 text-yellow-400" />
                                            )}
                                          </div>

                                          {/* Info de caracteres */}
                                          <div className="bg-white/10 rounded px-2 py-1">
                                  <span className="text-xs text-gray-300">
                                    {result.char_count || result.plate_text.replace(/[-\s]/g, '').length} chars
                                  </span>
                                          </div>
                                        </div>

                                        <span className={`text-sm font-semibold ${getConfidenceColor(result.best_confidence)}`}>
                                {(result.best_confidence * 100).toFixed(1)}% máx
                              </span>
                                      </div>

                                      <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Detecciones:</span>
                                          <span className={`px-2 py-1 rounded text-xs ${getDetectionCountColor(result.detection_count)}`}>
                                  {result.detection_count} frames
                                </span>
                                        </div>

                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Estabilidad:</span>
                                          <span className="text-white">
                                  {result.stability_score ? `${(result.stability_score * 100).toFixed(0)}%` : 'N/A'}
                                </span>
                                        </div>

                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Duración:</span>
                                          <span className="text-white">
                                  {result.duration_frames || 'N/A'} frames
                                </span>
                                        </div>

                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Método:</span>
                                          <span className="text-purple-400 text-xs">
                                  {result.processing_method === "roi_enhanced" ? "ROI+6C" :
                                      result.processing_method === "quick" ? "RÁPIDO" : "NORMAL"}
                                </span>
                                        </div>
                                      </div>

                                      {/* Barra de progreso */}
                                      <div className="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${
                                                result.is_six_char_valid
                                                    ? 'bg-gradient-to-r from-green-500 to-green-400'
                                                    : result.is_valid_format
                                                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                                                        : 'bg-gradient-to-r from-blue-500 to-blue-400'
                                            }`}
                                            style={{ width: `${result.best_confidence * 100}%` }}
                                        />
                                      </div>

                                      {/* Info adicional para placas de 6 caracteres */}
                                      {result.is_six_char_valid && (
                                          <div className="mt-2 bg-green-500/10 border border-green-500/20 rounded p-2">
                                            <div className="flex items-center space-x-2 text-green-400 text-xs">
                                              <Shield className="w-3 h-3" />
                                              <span className="font-semibold">Placa validada con 6 caracteres exactos</span>
                                            </div>
                                          </div>
                                      )}
                                    </div>
                                ))}
                          </div>

                          {/* Resumen y exportar */}
                          <div className="mt-6 p-4 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-lg border border-white/10">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-white font-semibold">Resumen del Análisis Mejorado</h4>
                                <div className="text-gray-400 text-sm space-y-1">
                                  <p>
                                    {results.length} matrícula{results.length !== 1 ? 's' : ''} única{results.length !== 1 ? 's' : ''} detectada{results.length !== 1 ? 's' : ''}
                                  </p>
                                  {sixCharPlates.length > 0 && (
                                      <p className="text-green-400">
                                        ✅ {sixCharPlates.length} con 6 caracteres válidos
                                      </p>
                                  )}
                                  {validPlates.length > 0 && (
                                      <p className="text-yellow-400">
                                        ✓ {validPlates.length} con formato válido
                                      </p>
                                  )}
                                  {enhancementInfo && (
                                      <p className="text-purple-400">
                                        🎯 Procesado con ROI central ({enhancementInfo.roi_percentage}%) y filtro de 6 caracteres
                                      </p>
                                  )}
                                  {processingTime > 0 && (
                                      <p className="text-blue-400">
                                        ⏱️ Tiempo de procesamiento: {processingTime.toFixed(2)}s
                                      </p>
                                  )}
                                </div>
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
                          <p className="text-gray-500 text-sm">
                            {enhancementInfo?.six_char_filter
                                ? "Ninguna placa cumplió con el filtro de 6 caracteres exactos"
                                : "Intenta con un video diferente o ajusta la configuración"
                            }
                          </p>
                          {enhancementInfo && (
                              <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                <div className="text-sm text-purple-400">
                                  <p>Configuración utilizada:</p>
                                  <p>• ROI central: {enhancementInfo.roi_percentage}%</p>
                                  <p>• Filtro de 6 caracteres: {enhancementInfo.six_char_filter ? 'Activo' : 'Inactivo'}</p>
                                </div>
                              </div>
                          )}
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