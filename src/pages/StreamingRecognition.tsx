// src/pages/StreamingRecognition.tsx
// ✅ VERSIÓN CORREGIDA CON LISTADO CORRECTO DE PLACAS DETECTADAS

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Video, Settings, Wifi, WifiOff, Upload,
  Play, Pause, Square, Download, Eye, AlertCircle, CheckCircle,
  Activity, Target, Zap, RefreshCw, Monitor, Clock, Terminal, Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStreamingWebSocket } from "../hooks/useStreamingWebSocket";
import {
  isUploadProgressData,
  isSystemMessageData,
  type PlateDetection,
  type UniquePlate,
  type StreamingStatus
} from "../types/streaming";
import { streamingApi } from "../services/streamingApi";
import { StreamingDebugConsole } from "../components/StreamingDebugConsole";
import PlatesSummaryCard from "../components/PlatesSummaryCard.tsx";

// ✅ INTERFACES CORREGIDAS Y ESPECÍFICAS
interface StatusInfo {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  bgColor: string;
}

interface ServerHealth {
  status: 'healthy' | 'warning' | 'error';
  timestamp: number;
  service: string;
  version: string;
  issues: string[];
  sessions: {
    active: number;
    max: number;
    capacity_usage: number;
  };
  models: {
    loaded: boolean;
    device: string;
  };
  capabilities: {
    websocket_streaming: boolean;
    real_time_processing: boolean;
    video_upload: boolean;
    session_management: boolean;
  };
}

interface ActiveSession {
  session_id: string;
  status: string;
  created_at: number;
  uptime: number;
  is_processing: boolean;
  has_video: boolean;
}

interface StreamingSettings {
  confidence_threshold: number;
  frame_skip: number;
  adaptive_quality: boolean;
  enable_thumbnails: boolean;
  max_duration: number;
}

// ✅ INTERFACE CORREGIDA PARA DATOS WEBSOCKET
interface StreamingUpdateData {
  frame_info?: {
    frame_number?: number;
    timestamp?: number;
    processing_time?: number;
    success?: boolean;
    roi_used?: boolean;
    six_char_filter_applied?: boolean;
    six_char_detections_in_frame?: number;
    auto_formatted_detections_in_frame?: number;
  };
  progress?: {
    processed_frames?: number;
    total_frames?: number;
    progress_percent?: number;
    processing_speed?: number;
  };
  current_detections?: PlateDetection[];
  detection_summary?: {
    total_detections?: number;
    unique_plates_count?: number;
    valid_plates_count?: number;
    six_char_plates_count?: number;
    auto_formatted_plates_count?: number;
    frames_with_detections?: number;
    best_plates?: UniquePlate[];
    best_six_char_plates?: UniquePlate[];
    best_auto_formatted_plates?: UniquePlate[];
    latest_detections?: PlateDetection[];
    detection_density?: number;
    six_char_detection_rate?: number;
    auto_formatted_rate?: number;
    session_id?: string;
    // ✅ NUEVO: Información completa de placas
    all_unique_plates?: UniquePlate[];
  };
  // ✅ NUEVO: Resumen completo de placas
  all_plates_summary?: {
    complete_list?: UniquePlate[];
    count_by_confidence?: {
      high: number;
      medium: number;
      low: number;
    };
    spatial_coverage?: {
      regions_active: number;
      distribution: Record<string, number>;
    };
    detection_metrics?: {
      total_unique_plates: number;
      plates_per_region: number;
      avg_confidence: number;
    };
  };
  timing?: {
    elapsed_time?: number;
    estimated_remaining?: number;
  };
  enhancement_stats?: {
    roi_processing?: boolean;
    six_char_filter_active?: boolean;
    auto_dash_formatting?: boolean;
    total_six_char_detections?: number;
    total_auto_formatted_detections?: number;
    six_char_plates_found?: number;
    auto_formatted_plates_found?: number;
    six_char_detection_rate?: number;
    auto_formatted_rate?: number;
  };
  frame_data?: {
    image_base64?: string;
    thumbnail_base64?: string;
    original_size?: [number, number];
    compressed_size?: number;
    quality_used?: number;
  };
  quality_info?: {
    current_quality?: number;
    recommended_frame_skip?: number;
    adaptive_enabled?: boolean;
  };
  // ✅ NUEVO: Análisis espacial
  spatial_analysis?: {
    regions_found?: Record<string, number>;
    region_count?: number;
  };
}

// ✅ INTERFACE CORREGIDA PARA ESTADÍSTICAS DE MEJORAS
interface EnhancementStats {
  roi_processing: boolean;
  six_char_filter_active: boolean;
  auto_dash_formatting: boolean;
  total_six_char_detections: number;
  total_auto_formatted_detections: number;
  six_char_plates_found: number;
  auto_formatted_plates_found: number;
  six_char_detection_rate: number;
  auto_formatted_rate: number;
}

// ✅ INTERFACE PARA EL RESUMEN DE TODAS LAS PLACAS
interface AllPlatesSummary {
  complete_list: UniquePlate[];
  count_by_confidence: {
    high: number;
    medium: number;
    low: number;
  };
  spatial_coverage: {
    regions_active: number;
    distribution: Record<string, number>;
  };
  detection_metrics: {
    total_unique_plates: number;
    plates_per_region: number;
    avg_confidence: number;
  };
}

const StreamingRecognition: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado local
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDebugConsole, setShowDebugConsole] = useState<boolean>(true);
  const [streamingSettings, setStreamingSettings] = useState<StreamingSettings>({
    confidence_threshold: 0.3,
    frame_skip: 2,
    adaptive_quality: true,
    enable_thumbnails: true,
    max_duration: 600
  });

  // ✅ ESTADOS CORREGIDOS PARA PLACAS Y ESTADÍSTICAS
  const [enhancementStats, setEnhancementStats] = useState<EnhancementStats | null>(null);
  const [allPlatesSummary, setAllPlatesSummary] = useState<AllPlatesSummary | null>(null);
  const [allUniquePlates, setAllUniquePlates] = useState<UniquePlate[]>([]);
  const [spatialRegions, setSpatialRegions] = useState<Record<string, number>>({});

  // Hook de WebSocket
  const {
    // Estado
    isConnected,
    isStreaming,
    isPaused,
    sessionId,
    status,
    error,
    currentFrame,
    detections,
    uniquePlates,
    progress,
    processingSpeed,

    // Helpers de estado
    canStart,
    canControl,
    hasResults,
    isUploading,
    isInitializing,

    // Acciones
    startStreaming,
    pauseStreaming,
    resumeStreaming,
    stopStreaming,
    requestStatus,
    downloadResults,
    clearError,
    onMessage,
    connect,
    disconnect
  } = useStreamingWebSocket({
    wsBaseUrl: streamingApi.wsBaseUrl,
    apiBaseUrl: streamingApi.baseUrl,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5
  });

  // Función de debug helper
  const debugLog = useCallback((type: string, category: string, message: string, data?: unknown) => {
    const windowWithDebug = window as typeof window & {
      streamingDebug?: {
        [key: string]: (category: string, message: string, data?: string) => void;
      };
    };

    if (windowWithDebug.streamingDebug && windowWithDebug.streamingDebug[type]) {
      const debugFunction = windowWithDebug.streamingDebug[type];
      if (typeof debugFunction === 'function') {
        debugFunction(category, message, JSON.stringify(data));
      }
    }
  }, []);

  // ✅ FUNCIÓN CORREGIDA PARA OBTENER INFORMACIÓN VISUAL DEL ESTADO
  const getStatusInfo = useCallback((currentStatus: StreamingStatus): StatusInfo => {
    const statusMap: Record<StreamingStatus, StatusInfo> = {
      connected: {
        color: 'text-green-400',
        icon: Wifi,
        text: 'Conectado',
        bgColor: 'bg-green-500/10 border-green-500/20'
      },
      processing: {
        color: 'text-blue-400',
        icon: Activity,
        text: 'Procesando',
        bgColor: 'bg-blue-500/10 border-blue-500/20'
      },
      paused: {
        color: 'text-yellow-400',
        icon: Pause,
        text: 'Pausado',
        bgColor: 'bg-yellow-500/10 border-yellow-500/20'
      },
      completed: {
        color: 'text-green-400',
        icon: CheckCircle,
        text: 'Completado',
        bgColor: 'bg-green-500/10 border-green-500/20'
      },
      error: {
        color: 'text-red-400',
        icon: AlertCircle,
        text: 'Error',
        bgColor: 'bg-red-500/10 border-red-500/20'
      },
      uploading: {
        color: 'text-purple-400',
        icon: Upload,
        text: 'Subiendo',
        bgColor: 'bg-purple-500/10 border-purple-500/20'
      },
      initializing: {
        color: 'text-blue-400',
        icon: Activity,
        text: 'Inicializando',
        bgColor: 'bg-blue-500/10 border-blue-500/20'
      },
      stopped: {
        color: 'text-gray-400',
        icon: Square,
        text: 'Detenido',
        bgColor: 'bg-gray-500/10 border-gray-500/20'
      },
      disconnected: {
        color: 'text-gray-400',
        icon: WifiOff,
        text: 'Desconectado',
        bgColor: 'bg-gray-500/10 border-gray-500/20'
      }
    };

    return statusMap[currentStatus] || statusMap.disconnected;
  }, []);

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  // ✅ FUNCIONES HELPER CORREGIDAS PARA PLACAS
  const getSixCharPlates = useCallback((): UniquePlate[] => {
    return allUniquePlates.filter((plate: UniquePlate) => plate.is_six_char_valid === true);
  }, [allUniquePlates]);

  const getValidPlates = useCallback((): UniquePlate[] => {
    return allUniquePlates.filter((plate: UniquePlate) => plate.is_valid_format === true);
  }, [allUniquePlates]);

  const getAutoFormattedPlates = useCallback((): UniquePlate[] => {
    return allUniquePlates.filter((plate: UniquePlate) =>
        (plate as any).auto_formatted === true ||
        (plate as any).is_auto_formatted === true
    );
  }, [allUniquePlates]);

  const getSixCharDetections = useCallback((): PlateDetection[] => {
    return detections.filter((detection: PlateDetection) => detection.six_char_validated === true);
  }, [detections]);

  const getConfidenceColor = useCallback((confidence: number): string => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  }, []);

  const getConfidenceLabel = useCallback((confidence: number): string => {
    if (confidence >= 0.8) return "Alta";
    if (confidence >= 0.6) return "Media";
    return "Baja";
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

  const getAutoFormattedIndicator = useCallback((plate: any): JSX.Element | null => {
    const isAutoFormatted = plate.auto_formatted === true || plate.is_auto_formatted === true;
    if (isAutoFormatted) {
      return (
          <div className="flex items-center space-x-1 text-blue-400">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-semibold">AUTO</span>
          </div>
      );
    }
    return null;
  }, []);

  // Cargar información del servidor
  const loadServerInfo = useCallback(async () => {
    try {
      debugLog('info', 'API', 'Cargando información del servidor');

      const [healthData, sessionsData] = await Promise.all([
        streamingApi.getStreamingHealth(),
        streamingApi.getActiveSessions()
      ]);

      setServerHealth(healthData);
      setActiveSessions(sessionsData.sessions || []);

      debugLog('success', 'API', 'Información del servidor cargada', {
        health: healthData.status,
        sessions: sessionsData.sessions?.length || 0
      });
    } catch (err) {
      debugLog('error', 'API', 'Error cargando info del servidor', err);
      console.error('Error cargando info del servidor:', err);
    }
  }, [debugLog]);

  // Manejar selección de archivo
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    debugLog('info', 'Upload', `Archivo seleccionado: ${file.name}`, {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validaciones
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      debugLog('error', 'Upload', `Formato no soportado: ${file.type}`);
      toast.error('Formato no soportado', {
        description: 'Use MP4, AVI, MOV, MKV o WebM'
      });
      return;
    }

    const maxSizeBytes = 150 * 1024 * 1024; // 150MB
    if (file.size > maxSizeBytes) {
      debugLog('error', 'Upload', `Archivo muy grande: ${file.size} bytes`);
      toast.error('Archivo muy grande', {
        description: 'Máximo 150MB permitido'
      });
      return;
    }

    // Limpiar estados anteriores
    setAllUniquePlates([]);
    setAllPlatesSummary(null);
    setEnhancementStats(null);
    setSpatialRegions({});

    // Iniciar streaming
    try {
      clearError();
      setUploadProgress(0);

      debugLog('info', 'Upload', 'Iniciando proceso de streaming mejorado (ROI + 6 chars)');

      toast.info('Iniciando streaming mejorado', {
        description: `Subiendo ${file.name} con ROI central y filtro 6 caracteres...`
      });

      await startStreaming(file, streamingSettings);

      debugLog('success', 'Upload', 'Video cargado exitosamente para procesamiento mejorado');
      toast.success('Video cargado exitosamente', {
        description: 'El procesamiento con ROI y filtro 6 caracteres comenzará en breve'
      });

    } catch (err) {
      debugLog('error', 'Upload', 'Error iniciando streaming', err);
      console.error('Error iniciando streaming:', err);
      toast.error('Error al iniciar streaming', {
        description: err instanceof Error ? err.message : 'Error desconocido'
      });
    }
  };

  // Manejar descarga
  const handleDownload = async (format: 'json' | 'csv') => {
    try {
      debugLog('info', 'Download', `Iniciando descarga ${format.toUpperCase()}`);
      await downloadResults(format);
      debugLog('success', 'Download', `Descarga ${format.toUpperCase()} completada`);
      toast.success(`Descarga ${format.toUpperCase()} completada`);
    } catch (err) {
      debugLog('error', 'Download', `Error descargando ${format.toUpperCase()}`, err);
      console.error(`Error descargando ${format}:`, err);
      toast.error(`Error descargando ${format.toUpperCase()}`);
    }
  };

  // Manejar configuración
  const handleSettingsChange = (key: keyof StreamingSettings, value: boolean | number) => {
    setStreamingSettings(prev => ({
      ...prev,
      [key]: value
    }));
    debugLog('info', 'Settings', `Configuración actualizada: ${key} = ${value}`);
  };

  // Refrescar conexión
  const handleReconnect = () => {
    debugLog('info', 'Connection', 'Iniciando reconexión manual');
    disconnect();
    setTimeout(() => {
      connect();
      toast.info('Reconectando...', {
        description: 'Intentando restablecer la conexión'
      });
    }, 1000);
  };

  // Limpiar sesión
  const handleClearSession = async () => {
    try {
      debugLog('info', 'Session', 'Limpiando sesión actual');
      if (sessionId) {
        await streamingApi.disconnectSession(sessionId);
      }
      disconnect();

      // Limpiar todos los estados
      setAllUniquePlates([]);
      setAllPlatesSummary(null);
      setEnhancementStats(null);
      setSpatialRegions({});

      toast.success('Sesión limpiada');
      debugLog('success', 'Session', 'Sesión limpiada exitosamente');
    } catch (err) {
      debugLog('error', 'Session', 'Error limpiando sesión', err);
      console.error('Error limpiando sesión:', err);
    }
  };

  // ✅ CONFIGURAR HANDLERS DE MENSAJES CORREGIDOS
  useEffect(() => {
    // Handler para updates de progreso de subida
    const unsubscribeUpload = onMessage('upload_progress', (data: unknown) => {
      if (isUploadProgressData(data)) {
        setUploadProgress(data.progress);
        debugLog('info', 'Upload Progress', `Progreso: ${data.progress}%`);
      }
    });

    // Handler para mensajes de sistema
    const unsubscribeSystem = onMessage('system_message', (data: unknown) => {
      if (isSystemMessageData(data)) {
        debugLog('websocket', 'System Message', data.message, data);
        if (data.type === 'info') {
          toast.info(data.title || 'Info', {
            description: data.message
          });
        } else if (data.type === 'warning') {
          toast.warning(data.title || 'Advertencia', {
            description: data.message
          });
        }
      }
    });

    // ✅ HANDLER CORREGIDO PARA ACTUALIZACIONES DE STREAMING
    const unsubscribeStreaming = onMessage('streaming_update', (data: unknown) => {
      const streamingData = data as StreamingUpdateData;

      debugLog('websocket', 'Streaming Update', 'Actualización recibida', {
        frame: streamingData?.frame_info?.frame_number || 0,
        detections: Array.isArray(streamingData?.current_detections) ? streamingData.current_detections.length : 0,
        progress: streamingData?.progress?.progress_percent || 0,
        six_char_detections: streamingData?.frame_info?.six_char_detections_in_frame || 0,
        auto_formatted_detections: streamingData?.frame_info?.auto_formatted_detections_in_frame || 0,
        roi_used: streamingData?.frame_info?.roi_used || false
      });

      // ✅ ACTUALIZAR ESTADÍSTICAS DE MEJORAS
      if (streamingData?.enhancement_stats) {
        const stats: EnhancementStats = {
          roi_processing: streamingData.enhancement_stats.roi_processing || false,
          six_char_filter_active: streamingData.enhancement_stats.six_char_filter_active || false,
          auto_dash_formatting: streamingData.enhancement_stats.auto_dash_formatting || false,
          total_six_char_detections: streamingData.enhancement_stats.total_six_char_detections || 0,
          total_auto_formatted_detections: streamingData.enhancement_stats.total_auto_formatted_detections || 0,
          six_char_plates_found: streamingData.enhancement_stats.six_char_plates_found || 0,
          auto_formatted_plates_found: streamingData.enhancement_stats.auto_formatted_plates_found || 0,
          six_char_detection_rate: streamingData.enhancement_stats.six_char_detection_rate || 0,
          auto_formatted_rate: streamingData.enhancement_stats.auto_formatted_rate || 0
        };
        setEnhancementStats(stats);
      }

      // ✅ ACTUALIZAR TODAS LAS PLACAS ÚNICAS
      if (streamingData?.all_plates_summary?.complete_list) {
        const completeList = streamingData.all_plates_summary.complete_list;
        setAllUniquePlates(completeList);

        // Adaptar el objeto para cumplir con AllPlatesSummary (campos obligatorios)
        const summary: AllPlatesSummary = {
          complete_list: completeList,
          count_by_confidence: streamingData.all_plates_summary.count_by_confidence ?? { high: 0, medium: 0, low: 0 },
          spatial_coverage: streamingData.all_plates_summary.spatial_coverage ?? { regions_active: 0, distribution: {} },
          detection_metrics: streamingData.all_plates_summary.detection_metrics ?? { total_unique_plates: 0, plates_per_region: 0, avg_confidence: 0 }
        };
        setAllPlatesSummary(summary);

        debugLog('websocket', 'All Plates Update', `Todas las placas actualizadas: ${completeList.length}`, {
          total: completeList.length,
          sixChar: completeList.filter(p => p.is_six_char_valid).length,
          valid: completeList.filter(p => p.is_valid_format).length
        });
      }

      // ✅ ACTUALIZAR INFORMACIÓN ESPACIAL
      if (streamingData?.spatial_analysis?.regions_found) {
        setSpatialRegions(streamingData.spatial_analysis.regions_found);
      }

      // ✅ FALLBACK: Si no hay all_plates_summary, usar detection_summary
      if (!streamingData?.all_plates_summary?.complete_list && streamingData?.detection_summary?.best_plates) {
        setAllUniquePlates(streamingData.detection_summary.best_plates);
        debugLog('websocket', 'Fallback Plates Update', `Fallback placas: ${streamingData.detection_summary.best_plates.length}`);
      }
    });

    return () => {
      unsubscribeUpload();
      unsubscribeSystem();
      unsubscribeStreaming();
    };
  }, [onMessage, debugLog]);

  // Cargar info inicial
  useEffect(() => {
    loadServerInfo();
    debugLog('info', 'App', 'Aplicación de streaming mejorado inicializada');

    const interval = setInterval(loadServerInfo, 30000);
    return () => clearInterval(interval);
  }, [loadServerInfo, debugLog]);

  // Logging de cambios de estado
  useEffect(() => {
    debugLog('info', 'State', `Estado cambiado a: ${status}`, {
      isConnected,
      isStreaming,
      sessionId,
      detections: detections.length,
      uniquePlates: uniquePlates.length,
      allUniquePlates: allUniquePlates.length,
      sixCharPlates: getSixCharPlates().length,
      autoFormattedPlates: getAutoFormattedPlates().length
    });
  }, [status, isConnected, isStreaming, sessionId, detections.length, uniquePlates.length, allUniquePlates.length, getSixCharPlates, getAutoFormattedPlates, debugLog]);

  // Formatear tiempo
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calcular tiempo estimado
  const getEstimatedTimeRemaining = useCallback((): string => {
    if (!progress || progress.percent <= 0 || processingSpeed <= 0) return '...';

    const remaining = (progress.total - progress.processed) / processingSpeed;
    return formatDuration(remaining);
  }, [progress, processingSpeed, formatDuration]);

  // ✅ CALCULAR ESTADÍSTICAS DINÁMICAS
  const dynamicStats = {
    totalPlates: allUniquePlates.length,
    sixCharPlates: getSixCharPlates().length,
    validPlates: getValidPlates().length,
    autoFormattedPlates: getAutoFormattedPlates().length,
    spatialRegionsCount: Object.keys(spatialRegions).length,
    highConfidencePlates: allUniquePlates.filter(p => p.best_confidence >= 0.8).length,
    mediumConfidencePlates: allUniquePlates.filter(p => p.best_confidence >= 0.6 && p.best_confidence < 0.8).length,
    lowConfidencePlates: allUniquePlates.filter(p => p.best_confidence < 0.6).length
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Debug Console */}
        <div className="fixed top-20 right-4 w-96 z-40">
          <StreamingDebugConsole
              isVisible={showDebugConsole}
              onToggleVisibility={() => setShowDebugConsole(!showDebugConsole)}
          />
        </div>

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

                {/* ✅ INDICADOR MEJORADO DE MEJORAS EN HEADER */}
                {enhancementStats && (
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-purple-400">ROI + 6 CHARS</span>
                      </div>
                      {dynamicStats.totalPlates > 0 && (
                          <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-1">
                            <Target className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400">{dynamicStats.totalPlates} placas</span>
                          </div>
                      )}
                    </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {/* Debug Console Toggle */}
                <Button
                    onClick={() => setShowDebugConsole(!showDebugConsole)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                >
                  <Terminal className="w-4 h-4" />
                </Button>

                {/* Estado de conexión */}
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${statusInfo.bgColor} border`}>
                  <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                  <span className={`text-sm ${statusInfo.color}`}>{statusInfo.text}</span>
                  {serverHealth && (
                      <div className={`w-2 h-2 rounded-full ${
                          serverHealth.status === 'healthy' ? 'bg-green-400' :
                              serverHealth.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                  )}
                </div>

                {/* Session ID y controles */}
                {sessionId && (
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded">
                        {sessionId.slice(-8)}
                      </div>
                      <Button
                          onClick={handleReconnect}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Streaming en Tiempo Real</h1>
              <p className="text-gray-300">
                Procesamiento con ROI central (10%) y filtro de 6 caracteres para placas peruanas
              </p>

              {/* ✅ ESTADO DEL SERVIDOR MEJORADO CON INFO DE PLACAS */}
              {serverHealth && (
                  <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-400">
                    Sesiones: {serverHealth.sessions?.active || 0}/{serverHealth.sessions?.max || 0}
                  </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-green-400" />
                      <span className="text-gray-400">
                    Modelos: {serverHealth.models?.loaded ? 'Cargados' : 'No cargados'}
                  </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-400">
                    GPU: {serverHealth.models?.device || 'CPU'}
                  </span>
                    </div>
                    {enhancementStats && dynamicStats.totalPlates > 0 && (
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-400">
                      Placas: {dynamicStats.totalPlates} ({dynamicStats.sixCharPlates} con 6 chars)
                    </span>
                        </div>
                    )}
                  </div>
              )}
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <span className="text-red-400 font-medium">Error de Streaming</span>
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  </div>
                  <Button
                      onClick={clearError}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                  >
                    Cerrar
                  </Button>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Panel de Control */}
              <div className="space-y-6">
                {/* Upload & Control */}
                <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Control de Streaming</h3>
                      <div className="flex items-center space-x-2">
                        <Button
                            onClick={() => setShowSettings(!showSettings)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        {/* Indicador de mejoras en control */}
                        {enhancementStats?.roi_processing && (
                            <div className="flex items-center space-x-1 bg-purple-500/20 border border-purple-500/30 rounded px-2 py-1">
                              <Shield className="w-3 h-3 text-purple-400" />
                              <span className="text-xs text-purple-400">ROI</span>
                            </div>
                        )}
                      </div>
                    </div>

                    {!isStreaming ? (
                        <div className="space-y-4">
                          <Button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={!canStart}
                              className={`
                          w-full bg-gradient-to-r from-purple-600 to-blue-600 
                          hover:from-purple-700 hover:to-blue-700 
                          disabled:opacity-50 disabled:cursor-not-allowed 
                          text-white px-6 py-4 rounded-lg flex items-center 
                          justify-center space-x-3 transition-all
                          ${!isConnected ? 'animate-pulse' : ''}
                        `}
                          >
                            <Upload className="w-6 h-6" />
                            <span className="text-lg">
                          {isUploading ? 'Subiendo Video...' :
                              isInitializing ? 'Inicializando ROI + 6 chars...' :
                                  !isConnected ? 'Conectando...' :
                                      'Seleccionar Video (ROI + 6 chars)'}
                        </span>
                          </Button>

                          {/* Progreso de subida */}
                          {isUploading && uploadProgress > 0 && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Subiendo</span>
                                  <span className="text-white">{uploadProgress.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                  <div
                                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                                      style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                              </div>
                          )}

                          <div className="text-center text-sm text-gray-400">
                            <p>MP4, AVI, MOV, MKV, WebM (máx. 150MB)</p>
                            <p className="text-purple-400 text-xs mt-1">
                              ✨ Con ROI central y filtro de 6 caracteres
                            </p>
                          </div>

                          {!isConnected && (
                              <div className="text-center text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                <div className="flex items-center justify-center space-x-2 text-yellow-400">
                                  <Activity className="w-4 h-4 animate-pulse" />
                                  <span>Estableciendo conexión WebSocket...</span>
                                </div>
                              </div>
                          )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {!isPaused ? (
                                <Button
                                    onClick={pauseStreaming}
                                    disabled={!canControl}
                                    className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                                >
                                  <Pause className="w-5 h-5" />
                                  <span>Pausar</span>
                                </Button>
                            ) : (
                                <Button
                                    onClick={resumeStreaming}
                                    disabled={!isConnected}
                                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                                >
                                  <Play className="w-5 h-5" />
                                  <span>Continuar</span>
                                </Button>
                            )}

                            <Button
                                onClick={stopStreaming}
                                disabled={!isConnected}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                            >
                              <Square className="w-5 h-5" />
                              <span>Detener</span>
                            </Button>
                          </div>

                          <Button
                              onClick={requestStatus}
                              disabled={!isConnected}
                              className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Actualizar Estado
                          </Button>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                  </CardContent>
                </Card>

                {/* Configuración */}
                {showSettings && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Configuración Mejorada</h3>

                        <div className="space-y-4">
                          <div>
                            <label className="text-gray-400 text-sm">Confianza mínima</label>
                            <input
                                type="range"
                                min="0.1"
                                max="0.9"
                                step="0.1"
                                value={streamingSettings.confidence_threshold}
                                onChange={(e) => handleSettingsChange('confidence_threshold', parseFloat(e.target.value))}
                                className="w-full mt-2"
                            />
                            <span className="text-white text-sm">{streamingSettings.confidence_threshold}</span>
                          </div>

                          <div>
                            <label className="text-gray-400 text-sm">Salto de frames</label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={streamingSettings.frame_skip}
                                onChange={(e) => handleSettingsChange('frame_skip', parseInt(e.target.value))}
                                className="w-full mt-2"
                            />
                            <span className="text-white text-sm">{streamingSettings.frame_skip}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Calidad adaptiva</span>
                            <input
                                type="checkbox"
                                checked={streamingSettings.adaptive_quality}
                                onChange={(e) => handleSettingsChange('adaptive_quality', e.target.checked)}
                                className="rounded"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Miniaturas</span>
                            <input
                                type="checkbox"
                                checked={streamingSettings.enable_thumbnails}
                                onChange={(e) => handleSettingsChange('enable_thumbnails', e.target.checked)}
                                className="rounded"
                            />
                          </div>

                          {/* Info de mejoras en configuración */}
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                            <div className="text-sm text-purple-400">
                              <p className="font-semibold mb-1">Mejoras activas:</p>
                              <div className="space-y-1 text-xs">
                                <div>• ROI central (10% de la imagen)</div>
                                <div>• Filtro de 6 caracteres exactos</div>
                                <div>• Validación de formato peruano</div>
                                <div>• Formato automático con guión</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                )}

                {/* ✅ PROGRESO MEJORADO CON STATS DE 6 CHARS Y PLACAS TOTALES */}
                {isStreaming && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Progreso de Procesamiento</h3>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">Frames procesados</span>
                              <span className="text-white">{progress.processed} / {progress.total}</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-3">
                              <div
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(progress.percent, 100)}%` }}
                              />
                            </div>
                            <div className="text-center text-sm text-gray-300 mt-2">
                              {progress.percent.toFixed(1)}% completado
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Velocidad:</span>
                              <span className="text-white">{processingSpeed.toFixed(1)} fps</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-400">Restante:</span>
                              <span className="text-white">{getEstimatedTimeRemaining()}</span>
                            </div>
                          </div>

                          {/* ✅ ESTADÍSTICAS COMPLETAS DE PLACAS DETECTADAS */}
                          {dynamicStats.totalPlates > 0 && (
                              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                <div className="text-sm space-y-2">
                                  <div className="flex justify-between text-green-400">
                                    <span className="font-semibold">Placas detectadas:</span>
                                    <span className="font-bold">{dynamicStats.totalPlates}</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">6 caracteres:</span>
                                      <span className="text-green-400 font-semibold">{dynamicStats.sixCharPlates}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Válidas:</span>
                                      <span className="text-yellow-400">{dynamicStats.validPlates}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Auto-format:</span>
                                      <span className="text-blue-400">{dynamicStats.autoFormattedPlates}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Regiones:</span>
                                      <span className="text-purple-400">{dynamicStats.spatialRegionsCount}</span>
                                    </div>
                                  </div>

                                  {/* Distribución por confianza */}
                                  <div className="border-t border-green-500/20 pt-2 mt-2">
                                    <div className="text-xs text-gray-400 mb-1">Distribución por confianza:</div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-green-400">Alta: {dynamicStats.highConfidencePlates}</span>
                                      <span className="text-yellow-400">Media: {dynamicStats.mediumConfidencePlates}</span>
                                      <span className="text-red-400">Baja: {dynamicStats.lowConfidencePlates}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                          )}

                          {/* Estadísticas de 6 caracteres */}
                          {enhancementStats && (
                              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                <div className="text-sm text-purple-400 space-y-1">
                                  <div className="flex justify-between">
                                    <span>Placas 6 chars:</span>
                                    <span className="text-green-400 font-semibold">
                                {enhancementStats.six_char_plates_found}
                              </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Detecciones 6 chars:</span>
                                    <span className="text-white">
                                {enhancementStats.total_six_char_detections}
                              </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Auto-formateadas:</span>
                                    <span className="text-blue-400">
                                {enhancementStats.auto_formatted_plates_found}
                              </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Tasa éxito 6 chars:</span>
                                    <span className="text-yellow-400">
                                {(enhancementStats.six_char_detection_rate * 100).toFixed(1)}%
                              </span>
                                  </div>
                                </div>
                              </div>
                          )}

                          {/* Indicador de detecciones actuales mejorado */}
                          {detections.length > 0 && (
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <div className="flex items-center space-x-2 text-blue-400">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm">
                              {detections.length} detección{detections.length !== 1 ? 'es' : ''} en frame actual
                            </span>
                                </div>
                                {getSixCharDetections().length > 0 && (
                                    <div className="flex items-center space-x-2 text-purple-400 mt-1">
                                      <Shield className="w-4 h-4" />
                                      <span className="text-sm">
                                {getSixCharDetections().length} con 6 caracteres válidos
                              </span>
                                    </div>
                                )}
                              </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                )}

                {/* ✅ DESCARGAR RESULTADOS MEJORADO CON INFO COMPLETA */}
                {dynamicStats.totalPlates > 0 && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">
                          Exportar Resultados
                          <span className="text-sm text-gray-400 ml-2">
                        ({dynamicStats.totalPlates} placas, {dynamicStats.sixCharPlates} con 6 chars)
                      </span>
                        </h3>

                        <div className="space-y-3">
                          <Button
                              onClick={() => handleDownload('json')}
                              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                          >
                            <Download className="w-5 h-5" />
                            <span>Descargar JSON</span>
                          </Button>

                          <Button
                              onClick={() => handleDownload('csv')}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                          >
                            <Download className="w-5 h-5" />
                            <span>Descargar CSV</span>
                          </Button>

                          <Button
                              onClick={handleClearSession}
                              variant="outline"
                              className="w-full text-gray-400 border-gray-600 hover:text-white hover:border-gray-400"
                          >
                            Limpiar Sesión
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                )}
              </div>

              {/* Video y Detecciones */}
              <div className="lg:col-span-2 space-y-6">
                {/* Video en Tiempo Real */}
                <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Video en Tiempo Real</h3>
                      <div className="flex items-center space-x-4">
                        {currentFrame && (
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{currentFrame.processingTime.toFixed(1)}ms</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Monitor className="w-4 h-4" />
                                <span>Frame {currentFrame.frameNumber}</span>
                              </div>
                            </div>
                        )}
                        {/* Indicador de ROI en video */}
                        {enhancementStats?.roi_processing && (
                            <div className="flex items-center space-x-2 bg-purple-500/20 border border-purple-500/30 rounded px-2 py-1">
                              <Shield className="w-3 h-3 text-purple-400" />
                              <span className="text-xs text-purple-400">ROI 10%</span>
                            </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-black rounded-lg aspect-video relative overflow-hidden">
                      {currentFrame ? (
                          <div className="relative w-full h-full">
                            <img
                                src={currentFrame.image}
                                alt="Frame actual del video procesado"
                                className="w-full h-full object-contain"
                            />

                            {/* Overlay con información del frame */}
                            <div className="absolute top-2 right-2 bg-black/80 rounded px-3 py-1 text-xs text-white">
                              Frame: {currentFrame.frameNumber} | {currentFrame.processingTime.toFixed(1)}ms
                            </div>

                            {/* Indicador de transmisión en vivo */}
                            <div className="absolute top-2 left-2 bg-red-600/90 rounded px-3 py-1 text-xs text-white flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                              <span>EN VIVO</span>
                            </div>

                            {/* Contador de detecciones con info de 6 chars */}
                            {detections.length > 0 && (
                                <div className="absolute bottom-2 left-2 space-y-1">
                                  <div className="bg-green-600/90 rounded px-3 py-1 text-xs text-white flex items-center space-x-2">
                                    <Target className="w-3 h-3" />
                                    <span>{detections.length} detección{detections.length !== 1 ? 'es' : ''}</span>
                                  </div>
                                  {getSixCharDetections().length > 0 && (
                                      <div className="bg-purple-600/90 rounded px-3 py-1 text-xs text-white flex items-center space-x-2">
                                        <Shield className="w-3 h-3" />
                                        <span>{getSixCharDetections().length} con 6 chars</span>
                                      </div>
                                  )}
                                </div>
                            )}

                            {/* ✅ NUEVO: Contador de placas totales detectadas */}
                            {dynamicStats.totalPlates > 0 && (
                                <div className="absolute bottom-2 right-2 bg-blue-600/90 rounded px-3 py-1 text-xs text-white flex items-center space-x-2">
                                  <Target className="w-3 h-3" />
                                  <span>Total: {dynamicStats.totalPlates}</span>
                                </div>
                            )}
                          </div>
                      ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-400 text-lg">
                                {isStreaming ? 'Procesando frames con ROI...' :
                                    isUploading ? 'Subiendo video...' :
                                        isInitializing ? 'Inicializando ROI + 6 chars...' :
                                            !isConnected ? 'Conectando al servidor...' :
                                                'Selecciona un video para comenzar'}
                              </p>
                              {(isStreaming || isUploading || isInitializing) && (
                                  <div className="mt-4">
                                    <div className="inline-flex items-center space-x-2 text-blue-400">
                                      <Activity className="w-5 h-5 animate-pulse" />
                                      <span>
                                  {isUploading ? 'Subiendo archivo...' :
                                      isInitializing ? 'Preparando análisis ROI + 6 chars...' :
                                          'Analizando video con mejoras...'}
                                </span>
                                    </div>
                                  </div>
                              )}
                            </div>
                          </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* ✅ DETECCIONES DEL FRAME ACTUAL MEJORADAS */}
                {detections.length > 0 && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">
                          Detecciones en Frame Actual ({detections.length})
                        </h3>

                        <div className="space-y-3">
                          {detections.slice(0, 5).map((detection, index) => (
                              <div key={`${detection.detection_id}-${index}`} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-white font-mono text-lg">{detection.plate_text}</span>
                                    <div className="flex items-center space-x-2">
                                      {detection.six_char_validated && (
                                          <div className="flex items-center space-x-1 text-green-400">
                                            <Shield className="w-4 h-4" />
                                            <span className="text-xs font-semibold">6 CHARS</span>
                                          </div>
                                      )}
                                      {detection.is_valid_plate && (
                                          <CheckCircle className="w-4 h-4 text-yellow-400" />
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-sm font-semibold ${getConfidenceColor(detection.overall_confidence)}`}>
                              {(detection.overall_confidence * 100).toFixed(1)}%
                            </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2">
                                  <span>Placa: {(detection.plate_confidence * 100).toFixed(0)}%</span>
                                  <span>OCR: {(detection.char_confidence * 100).toFixed(0)}%</span>
                                  <span>Chars: {detection.char_count}</span>
                                </div>

                                <div className="w-full bg-white/10 rounded-full h-2">
                                  <div
                                      className={`h-2 rounded-full transition-all ${
                                          detection.six_char_validated
                                              ? 'bg-gradient-to-r from-green-500 to-green-400'
                                              : 'bg-gradient-to-r from-blue-500 to-blue-400'
                                      }`}
                                      style={{ width: `${Math.min(detection.overall_confidence * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                          ))}

                          {detections.length > 5 && (
                              <div className="text-center text-sm text-gray-400">
                                ... y {detections.length - 5} detecciones más
                              </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                )}

                {/* ✅ PLACAS ÚNICAS ACUMULADAS - USANDO COMPONENTE MEJORADO */}
                {allUniquePlates.length > 0 && (
                    <PlatesSummaryCard
                        allUniquePlates={allUniquePlates}
                        spatialRegions={spatialRegions}
                        enhancementStats={enhancementStats}
                        isStreaming={isStreaming}
                        onExportData={handleDownload}
                    />
                )}

                {/* ✅ MENSAJE CUANDO NO HAY DETECCIONES - MEJORADO */}
                {isStreaming && detections.length === 0 && allUniquePlates.length === 0 && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="text-center py-8">
                          <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-400">Analizando frames en busca de placas...</p>
                          <p className="text-gray-500 text-sm mt-1">
                            Las detecciones aparecerán aquí cuando se encuentren matrículas
                          </p>
                          <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
                            <span>Frame: {currentFrame?.frameNumber || 0}</span>
                            <span>•</span>
                            <span>Velocidad: {processingSpeed.toFixed(1)} fps</span>
                            <span>•</span>
                            <span>ROI: {enhancementStats?.roi_processing ? 'Activo' : 'Inactivo'}</span>
                          </div>
                          {enhancementStats && (
                              <div className="mt-3 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs">
                                <div className="text-purple-400">
                                  <p>Sistema de mejoras activo:</p>
                                  <div className="flex justify-center space-x-4 mt-1">
                                    <span>• ROI central (10%)</span>
                                    <span>• Filtro 6 caracteres</span>
                                    <span>• Auto-formateo</span>
                                  </div>
                                </div>
                              </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                )}

                {/* ✅ MENSAJE DE ESTADO CUANDO NO HAY STREAMING */}
                {!isStreaming && !isUploading && !isInitializing && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="text-center py-12">
                          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white mb-2">
                            Sistema de Streaming Mejorado Listo
                          </h3>
                          <p className="text-gray-400 mb-4">
                            Selecciona un video para comenzar el procesamiento con ROI central y filtro de 6 caracteres
                          </p>
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                            <div className="text-sm text-purple-400">
                              <p className="font-semibold mb-2">Características del sistema mejorado:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center space-x-2">
                                  <Shield className="w-3 h-3" />
                                  <span>ROI central (10% de la imagen)</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Target className="w-3 h-3" />
                                  <span>Filtro de 6 caracteres exactos</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Zap className="w-3 h-3" />
                                  <span>Auto-formateo con guión</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Validación formato peruano</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default StreamingRecognition;