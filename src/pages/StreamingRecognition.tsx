// src/pages/StreamingRecognition.tsx - Versión con WebSocket conectado
import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, VideoOff, Settings, Wifi, WifiOff, Upload, Play, Pause, Square, Download, Eye, AlertCircle, CheckCircle, Activity, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useStreamingWebSocket } from "../hooks/useStreamingWebSocket";
import type { StreamingStatus } from "../types/streaming";

interface StatusInfo {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

const StreamingRecognition: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔌 USAR HOOK DE WEBSOCKET TIPADO
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
    clearError
  } = useStreamingWebSocket();

  // 📁 MANEJAR SELECCIÓN DE ARCHIVO
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validaciones tipadas
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      alert('Formato de video no soportado. Use MP4, AVI, MOV, MKV o WebM');
      return;
    }

    const maxSizeBytes = 150 * 1024 * 1024; // 150MB
    if (file.size > maxSizeBytes) {
      alert('Archivo muy grande. Máximo 150MB permitido');
      return;
    }

    // Iniciar streaming automáticamente
    try {
      clearError();
      await startStreaming(file, {
        confidence_threshold: 0.3,
        frame_skip: 2,
        adaptive_quality: true,
        enable_thumbnails: true
      });
    } catch (err) {
      console.error('Error iniciando streaming:', err);
    }
  };

  // 🎨 OBTENER ESTADO VISUAL TIPADO
  const getStatusInfo = (currentStatus: StreamingStatus): StatusInfo => {
    const statusMap: Record<StreamingStatus, StatusInfo> = {
      connected: { color: 'text-green-400', icon: Wifi, text: 'Conectado' },
      processing: { color: 'text-blue-400', icon: Activity, text: 'Procesando' },
      paused: { color: 'text-yellow-400', icon: Pause, text: 'Pausado' },
      completed: { color: 'text-green-400', icon: CheckCircle, text: 'Completado' },
      error: { color: 'text-red-400', icon: AlertCircle, text: 'Error' },
      uploading: { color: 'text-purple-400', icon: Upload, text: 'Subiendo' },
      initializing: { color: 'text-blue-400', icon: Activity, text: 'Inicializando' },
      stopped: { color: 'text-gray-400', icon: Square, text: 'Detenido' },
      disconnected: { color: 'text-gray-400', icon: WifiOff, text: 'Desconectado' }
    };

    return statusMap[currentStatus] || statusMap.disconnected;
  };

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  // 📥 MANEJAR DESCARGA DE RESULTADOS
  const handleDownload = async (format: 'json' | 'csv') => {
    try {
      await downloadResults(format);
    } catch (err) {
      console.error(`Error descargando ${format}:`, err);
      alert(`Error descargando archivo ${format.toUpperCase()}`);
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

              <div className="flex items-center space-x-4">
                {/* Estado de conexión */}
                <div className={`flex items-center space-x-2 ${statusInfo.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span className="text-sm">{statusInfo.text}</span>
                </div>

                {/* Session ID corto */}
                {sessionId && (
                    <div className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded">
                      {sessionId.slice(-8)}
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
              <p className="text-gray-300">Conecta una cámara IP o webcam para reconocimiento continuo de matrículas</p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">{error}</span>
                  </div>
                  <button
                      onClick={clearError}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                      type="button"
                  >
                    Cerrar
                  </button>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Panel de Control */}
              <div className="space-y-6">
                {/* Upload & Control */}
                <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Control de Streaming</h3>

                    {!isStreaming ? (
                        <div className="space-y-4">
                          <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={!canStart}
                              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg flex items-center justify-center space-x-3 transition-all"
                              type="button"
                          >
                            <Upload className="w-6 h-6" />
                            <span className="text-lg">
                          {isUploading ? 'Subiendo...' : isInitializing ? 'Inicializando...' : 'Seleccionar Video y Comenzar'}
                        </span>
                          </button>

                          <div className="text-center text-sm text-gray-400">
                            MP4, AVI, MOV, MKV, WebM (máx. 150MB)
                          </div>

                          {!isConnected && (
                              <div className="text-center text-sm text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">
                                Conectando al servidor...
                              </div>
                          )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {!isPaused ? (
                                <button
                                    onClick={pauseStreaming}
                                    disabled={!canControl}
                                    className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                                    type="button"
                                >
                                  <Pause className="w-5 h-5" />
                                  <span>Pausar</span>
                                </button>
                            ) : (
                                <button
                                    onClick={resumeStreaming}
                                    disabled={!isConnected}
                                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                                    type="button"
                                >
                                  <Play className="w-5 h-5" />
                                  <span>Continuar</span>
                                </button>
                            )}

                            <button
                                onClick={stopStreaming}
                                disabled={!isConnected}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                                type="button"
                            >
                              <Square className="w-5 h-5" />
                              <span>Detener</span>
                            </button>
                          </div>

                          <button
                              onClick={requestStatus}
                              disabled={!isConnected}
                              className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                              type="button"
                          >
                            Actualizar Estado
                          </button>
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

                {/* Progreso */}
                {isStreaming && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Progreso</h3>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">Frames</span>
                              <span className="text-white">{progress.processed} / {progress.total}</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-3">
                              <div
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(progress.percent, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-center text-sm text-gray-300 mt-2">
                              {progress.percent.toFixed(1)}%
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Velocidad:</span>
                            <span className="text-white">{processingSpeed.toFixed(1)} fps</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                )}

                {/* Descargar Resultados */}
                {hasResults && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Resultados</h3>

                        <div className="space-y-3">
                          <button
                              onClick={() => handleDownload('json')}
                              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                              type="button"
                          >
                            <Download className="w-5 h-5" />
                            <span>Descargar JSON</span>
                          </button>

                          <button
                              onClick={() => handleDownload('csv')}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                              type="button"
                          >
                            <Download className="w-5 h-5" />
                            <span>Descargar CSV</span>
                          </button>
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
                    <h3 className="text-lg font-bold text-white mb-4">Video en Tiempo Real</h3>

                    <div className="bg-black rounded-lg aspect-video relative overflow-hidden">
                      {currentFrame ? (
                          <div className="relative w-full h-full">
                            <img
                                src={currentFrame.image}
                                alt="Frame actual del video procesado"
                                className="w-full h-full object-contain"
                            />

                            {/* Información del frame */}
                            <div className="absolute top-2 right-2 bg-black/80 rounded px-3 py-1 text-xs text-white">
                              Frame: {currentFrame.frameNumber} | {currentFrame.processingTime.toFixed(1)}ms
                            </div>

                            {/* Indicador de transmisión en vivo */}
                            <div className="absolute top-2 left-2 bg-red-600/90 rounded px-3 py-1 text-xs text-white flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                              <span>EN VIVO</span>
                            </div>
                          </div>
                      ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-400 text-lg">
                                {isStreaming ? 'Procesando frames...' : 'Selecciona un video para comenzar'}
                              </p>
                              {isStreaming && (
                                  <div className="mt-4">
                                    <div className="inline-flex items-center space-x-2 text-blue-400">
                                      <Activity className="w-5 h-5 animate-pulse" />
                                      <span>Analizando video</span>
                                    </div>
                                  </div>
                              )}
                            </div>
                          </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Detecciones Actuales */}
                {detections.length > 0 && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">
                          Detecciones en Este Frame ({detections.length})
                        </h3>

                        <div className="space-y-3">
                          {detections.map((detection, index) => (
                              <div key={`${detection.detection_id}-${index}`} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-white font-mono text-lg">{detection.plate_text}</span>
                                    {detection.is_valid_plate && (
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                    )}
                                  </div>
                                  <span className="text-green-400 text-sm font-semibold">
                              {(detection.overall_confidence * 100).toFixed(1)}%
                            </span>
                                </div>

                                <div className="w-full bg-white/10 rounded-full h-2">
                                  <div
                                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                                      style={{ width: `${Math.min(detection.overall_confidence * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                )}

                {/* Placas Únicas Acumuladas */}
                {uniquePlates.length > 0 && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">
                          Placas Únicas Detectadas ({uniquePlates.length})
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4">
                          {uniquePlates.slice(0, 8).map((plate, index) => (
                              <div key={`${plate.plate_text}-${index}`} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-white font-mono text-lg">{plate.plate_text}</span>
                                    {plate.is_valid_format && (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    )}
                                  </div>
                                  <span className="text-green-400 text-sm">
                              {(plate.best_confidence * 100).toFixed(1)}%
                            </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  <span>Detecciones: {plate.detection_count}</span>
                                  <span>Frames: {plate.first_seen_frame}-{plate.last_seen_frame}</span>
                                </div>
                              </div>
                          ))}
                        </div>

                        {uniquePlates.length > 8 && (
                            <div className="mt-4 text-center text-sm text-gray-400">
                              ... y {uniquePlates.length - 8} placas más
                            </div>
                        )}
                      </CardContent>
                    </Card>
                )}

                {/* Mensaje cuando no hay detecciones */}
                {isStreaming && detections.length === 0 && uniquePlates.length === 0 && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="text-center py-8">
                          <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-400">Analizando frames...</p>
                          <p className="text-gray-500 text-sm mt-1">
                            Las detecciones aparecerán aquí cuando se encuentren placas
                          </p>
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