import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Image as ImageIcon, Upload, Target, Download,
  AlertCircle, CheckCircle, Zap, Eye, Clock, Shield, FileText
} from "lucide-react";
import { Link } from "react-router-dom";

// Tipos TypeScript para evitar any
interface PlateDetection {
  plate_text: string;
  overall_confidence: number;
  is_valid_plate: boolean;
  is_six_char_valid?: boolean;
  char_count?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  plate_region_confidence?: number;
  text_confidence?: number;
  character_confidences?: number[];
}

interface ProcessingSummary {
  total_detections: number;
  valid_detections: number;
  processing_steps: string[];
  enhancement_applied?: boolean;
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

interface ImageDetectionResponse {
  success: boolean;
  message: string;
  data?: {
    success: boolean;
    best_result: PlateDetection | null;
    final_results: PlateDetection[];
    plates_processed: number;
    processing_time: number;
    processing_summary: ProcessingSummary;
    file_info: FileInfo;
    result_urls?: {
      annotated_image_url?: string;
      cropped_plates_urls?: string[];
      original?: string;
    };
  };
  timestamp?: string;
}

interface QuickDetectionResponse {
  success: boolean;
  plate_text: string;
  confidence: number;
  is_valid_format: boolean;
  processing_time: number;
  message?: string;
}

const ImageRecognition: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<PlateDetection[]>([]);
  const [bestResult, setBestResult] = useState<PlateDetection | null>(null);
  const [processingStats, setProcessingStats] = useState<ProcessingSummary | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = "http://localhost:8000";

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Formato de imagen no soportado. Use JPG, PNG o WEBP');
        return;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError('El archivo es muy grande. Máximo 50MB permitido');
        return;
      }

      setSelectedFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setResults([]);
      setBestResult(null);
      setError(null);
      setProcessingStats(null);
      setFileInfo(null);
      setAnnotatedImageUrl(null);
      setProcessingTime(0);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo
    if (event.target) {
      event.target.value = '';
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setBestResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('confidence_threshold', '0.5');
      formData.append('iou_threshold', '0.4');
      formData.append('max_detections', '5');
      formData.append('enhance_image', 'true');
      formData.append('return_visualization', 'true');
      formData.append('save_results', 'true');

      const response = await fetch(`${API_BASE_URL}/api/v1/detect/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: ImageDetectionResponse = await response.json();

      if (data.success && data.data) {
        const { final_results, best_result, processing_summary, file_info, result_urls, processing_time } = data.data;

        setResults(final_results || []);
        setBestResult(best_result);
        setProcessingStats(processing_summary);
        setFileInfo(file_info);
        setProcessingTime(processing_time);

        if (result_urls?.annotated_image_url) {
          setAnnotatedImageUrl(`${API_BASE_URL}${result_urls.annotated_image_url}`);
        }

        const validPlates = final_results?.filter(p => p.is_valid_plate) || [];
        const sixCharPlates = final_results?.filter(p => p.is_six_char_valid) || [];

        toast.success('Análisis completado', {
          description: `${final_results?.length || 0} placas detectadas${sixCharPlates.length > 0 ? ` (${sixCharPlates.length} de 6 caracteres)` : ''}`
        });
      } else {
        setError(data.message || 'Error desconocido en el procesamiento');
        toast.error('Error en el procesamiento', {
          description: data.message || 'No se pudo procesar la imagen'
        });
      }

    } catch (err) {
      console.error('Error al procesar imagen:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión con el servidor';
      setError(errorMessage);
      toast.error('Error de conexión', {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile]);

  const handleQuickProcess = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setBestResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('confidence_threshold', '0.6');

      const response = await fetch(`${API_BASE_URL}/api/v1/detect/image/quick`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: QuickDetectionResponse = await response.json();

      if (data.success && data.plate_text) {
        const quickResult: PlateDetection = {
          plate_text: data.plate_text,
          overall_confidence: data.confidence,
          is_valid_plate: data.is_valid_format,
          is_six_char_valid: false,
          char_count: data.plate_text.replace(/[-\s]/g, '').length
        };

        setResults([quickResult]);
        setBestResult(quickResult);
        setProcessingTime(data.processing_time);

        toast.success('Detección rápida completada', {
          description: `Placa encontrada: ${data.plate_text}`
        });
      } else {
        setError(data.message || 'No se detectaron placas en la imagen');
        toast.warning('Sin resultados', {
          description: 'No se detectaron placas válidas'
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
  }, [selectedFile]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setSelectedImage(null);
    setResults([]);
    setBestResult(null);
    setError(null);
    setProcessingStats(null);
    setFileInfo(null);
    setAnnotatedImageUrl(null);
    setProcessingTime(0);
  }, []);

  const exportResults = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      file_info: fileInfo,
      processing_stats: processingStats,
      processing_time: processingTime,
      best_result: bestResult,
      all_results: results,
      total_plates: results.length,
      valid_plates: results.filter(p => p.is_valid_plate).length,
      six_char_plates: results.filter(p => p.is_six_char_valid).length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imagen_detecciones_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fileInfo, processingStats, processingTime, bestResult, results]);

  // Helper functions
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return "Alta";
    if (confidence >= 0.6) return "Media";
    return "Baja";
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
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
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Reconocimiento por Imagen</span>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Reconocimiento por Imagen</h1>
              <p className="text-gray-300">
                Sube una imagen para detectar y reconocer placas vehiculares con IA
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
                  <h3 className="text-lg font-bold text-white mb-4">Subir Imagen</h3>

                  {!selectedFile ? (
                      <div
                          className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                          onClick={triggerFileSelect}
                      >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-white mb-1 text-sm">Selecciona tu imagen</p>
                        <p className="text-gray-400 text-xs mb-3">JPG, PNG, WEBP (máx. 50MB)</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white pointer-events-none"
                            type="button"
                        >
                          Seleccionar
                        </Button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <ImageIcon className="w-8 h-8 text-blue-400" />
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
                              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                          >
                            {isProcessing ? (
                                <>
                                  <Target className="w-4 h-4 mr-2 animate-spin" />
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
                              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
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
                          Cambiar Imagen
                        </Button>
                      </div>
                  )}

                  {/* Características */}
                  <div className="mt-6 bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 text-sm">Características</h4>
                    <div className="space-y-1 text-xs text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Target className="w-3 h-3 text-blue-400" />
                        <span>Detección de regiones de placa</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-3 h-3 text-green-400" />
                        <span>Reconocimiento OCR avanzado</span>
                      </div>
                      <div>• Validación formato peruano</div>
                      <div>• Mejoras de imagen automáticas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Image Preview */}
              <Card className="lg:col-span-2 bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Preview de Imagen</h3>

                  {!selectedImage ? (
                      <div className="bg-black/30 rounded-lg aspect-video flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400">La imagen aparecerá aquí</p>
                        </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        <div className="bg-black rounded-lg overflow-hidden relative">
                          <img
                              src={annotatedImageUrl || selectedImage}
                              alt="Preview"
                              className="w-full h-auto max-h-96 object-contain mx-auto"
                          />
                          {annotatedImageUrl && (
                              <div className="absolute top-2 right-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
                                Imagen Anotada
                              </div>
                          )}
                          {isProcessing && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                                  <p className="text-white">Analizando imagen...</p>
                                </div>
                              </div>
                          )}
                        </div>

                        {fileInfo && (
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Archivo:</span>
                                  <span className="text-white">{fileInfo.filename}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Tamaño:</span>
                                  <span className="text-white">{fileInfo.size_mb.toFixed(2)} MB</span>
                                </div>
                                {fileInfo.dimensions && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Ancho:</span>
                                        <span className="text-white">{fileInfo.dimensions.width}px</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Alto:</span>
                                        <span className="text-white">{fileInfo.dimensions.height}px</span>
                                      </div>
                                    </>
                                )}
                              </div>
                            </div>
                        )}
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
                      {processingTime > 0 && (
                          <span className="text-sm text-gray-400">
                      Procesado en {processingTime.toFixed(2)}s
                    </span>
                      )}
                    </div>

                    {isProcessing ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                          <p className="text-white">Analizando imagen...</p>
                          <p className="text-gray-400 text-sm">Detectando placas y reconociendo texto...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-6">
                          {/* Estadísticas */}
                          {processingStats && (
                              <div className="grid md:grid-cols-4 gap-4">
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Target className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{results.length}</p>
                                  <p className="text-gray-400 text-sm">Placas Detectadas</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">
                                    {results.filter(p => p.is_valid_plate).length}
                                  </p>
                                  <p className="text-gray-400 text-sm">Válidas</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Shield className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">
                                    {results.filter(p => p.is_six_char_valid).length}
                                  </p>
                                  <p className="text-gray-400 text-sm">6 Caracteres</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                  <Clock className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                                  <p className="text-2xl font-bold text-white">{processingTime.toFixed(1)}s</p>
                                  <p className="text-gray-400 text-sm">Tiempo</p>
                                </div>
                              </div>
                          )}

                          {/* Mejor resultado */}
                          {bestResult && (
                              <div className="bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-lg border border-green-500/20 p-6">
                                <h4 className="text-white font-semibold mb-3 flex items-center">
                                  <Target className="w-5 h-5 mr-2 text-green-400" />
                                  Mejor Resultado
                                </h4>
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-white font-mono text-2xl">{bestResult.plate_text}</span>
                                  <div className="flex items-center space-x-3">
                                    {bestResult.is_six_char_valid && (
                                        <div className="flex items-center space-x-1 text-green-400">
                                          <Shield className="w-4 h-4" />
                                          <span className="text-xs font-semibold">6 CHARS</span>
                                        </div>
                                    )}
                                    {bestResult.is_valid_plate && (
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                    )}
                                    <span className={`text-lg font-semibold ${getConfidenceColor(bestResult.overall_confidence)}`}>
                              {(bestResult.overall_confidence * 100).toFixed(1)}%
                            </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Confianza:</span>
                                    <span className={getConfidenceColor(bestResult.overall_confidence)}>
                              {getConfidenceLabel(bestResult.overall_confidence)}
                            </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Caracteres:</span>
                                    <span className="text-white">{bestResult.char_count || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Formato:</span>
                                    <span className={bestResult.is_valid_plate ? "text-green-400" : "text-red-400"}>
                              {bestResult.is_valid_plate ? "Válido" : "Inválido"}
                            </span>
                                  </div>
                                </div>
                              </div>
                          )}

                          {/* Lista de todas las placas */}
                          {results.length > 1 && (
                              <div>
                                <h4 className="text-white font-semibold mb-3">Todas las Detecciones</h4>
                                <div className="space-y-3">
                                  {results
                                      .sort((a, b) => b.overall_confidence - a.overall_confidence)
                                      .map((result, index) => (
                                          <div
                                              key={`${result.plate_text}-${index}`}
                                              className={`
                                  bg-white/5 rounded-lg p-4 border transition-all
                                  ${result.is_six_char_valid
                                                  ? 'border-green-500/30 bg-green-500/5'
                                                  : result.is_valid_plate
                                                      ? 'border-yellow-500/20 bg-yellow-500/5'
                                                      : 'border-white/10'
                                              }
                                `}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center space-x-3">
                                                <span className="text-white font-mono text-lg">{result.plate_text}</span>
                                                <div className="flex items-center space-x-2">
                                                  {result.is_six_char_valid && (
                                                      <div className="flex items-center space-x-1 text-green-400">
                                                        <Shield className="w-4 h-4" />
                                                        <span className="text-xs font-semibold">6 CHARS</span>
                                                      </div>
                                                  )}
                                                  {result.is_valid_plate && !result.is_six_char_valid && (
                                                      <CheckCircle className="w-4 h-4 text-yellow-400" />
                                                  )}
                                                </div>
                                              </div>
                                              <span className={`text-sm font-semibold ${getConfidenceColor(result.overall_confidence)}`}>
                                    {(result.overall_confidence * 100).toFixed(1)}%
                                  </span>
                                            </div>
                                          </div>
                                      ))}
                                </div>
                              </div>
                          )}

                          {/* Resumen y exportar */}
                          <div className="mt-6 p-4 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-lg border border-white/10">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-white font-semibold">Resumen del Análisis</h4>
                                <div className="text-gray-400 text-sm space-y-1">
                                  <p>{results.length} placa{results.length !== 1 ? 's' : ''} detectada{results.length !== 1 ? 's' : ''}</p>
                                  <p>✅ {results.filter(p => p.is_valid_plate).length} con formato válido</p>
                                  <p>🛡️ {results.filter(p => p.is_six_char_valid).length} con 6 caracteres</p>
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
                            Intenta con una imagen diferente o verifica que contenga placas vehiculares claras
                          </p>
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

export default ImageRecognition;