import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Image, Zap, Eye, Download, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

// Interfaces para tipado
interface PlateDetection {
  plate_text: string;
  overall_confidence: number;
  is_valid_plate: boolean;
  bbox?: number[];
  detection_confidence?: number;
  ocr_confidence?: number;
}

interface DetectionResponse {
  success: boolean;
  message: string;
  data?: {
    success: boolean;
    best_result?: PlateDetection;
    final_results: PlateDetection[];
    processing_time: number;
    plates_processed: number;
    result_urls?: {
      visualization_url?: string;
      original_url?: string;
    };
  };
  timestamp?: number;
}

interface QuickDetectionResponse {
  success: boolean;
  plate_text: string;
  confidence: number;
  is_valid_format: boolean;
  processing_time: number;
  message?: string;
}

const ImageRecognition = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<PlateDetection[]>([]);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [visualizationUrl, setVisualizationUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuración de la API
  const API_BASE_URL = "http://localhost:8000"; // Ajusta según tu configuración

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setResults([]);
        setError(null);
        setVisualizationUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);

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

      const data: DetectionResponse = await response.json();

      if (data.success && data.data) {
        setResults(data.data.final_results || []);
        setProcessingTime(data.data.processing_time || 0);

        // Si hay URL de visualización, mostrarla
        if (data.data.result_urls?.visualization_url) {
          setVisualizationUrl(`${API_BASE_URL}${data.data.result_urls.visualization_url}`);
        }
      } else {
        setError(data.message || 'Error desconocido en el procesamiento');
      }

    } catch (err) {
      console.error('Error al procesar imagen:', err);
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickDetection = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);

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
        // Convertir respuesta rápida a formato estándar
        const quickResult: PlateDetection = {
          plate_text: data.plate_text,
          overall_confidence: data.confidence,
          is_valid_plate: data.is_valid_format
        };
        setResults([quickResult]);
        setProcessingTime(data.processing_time);
      } else {
        setError(data.message || 'No se detectaron placas en la imagen');
      }

    } catch (err) {
      console.error('Error en detección rápida:', err);
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
          setResults([]);
          setError(null);
          setVisualizationUrl(null);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      processing_time: processingTime,
      results: results,
      total_detections: results.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detecciones_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                  <Image className="w-5 h-5 text-white" />
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
              <p className="text-gray-300">Sube una imagen para detectar y reconocer matrículas vehiculares</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">{error}</span>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Upload Section */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Subir Imagen</h3>

                  {!selectedImage ? (
                      <div
                          className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-white/50 transition-colors cursor-pointer"
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-white mb-2">Arrastra y suelta una imagen aquí</p>
                        <p className="text-gray-400 text-sm mb-4">o haz clic para seleccionar</p>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          Seleccionar Archivo
                        </Button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        <div className="relative bg-black rounded-lg overflow-hidden">
                          <img
                              src={visualizationUrl || selectedImage}
                              alt="Imagen cargada"
                              className="w-full h-64 object-contain"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                              onClick={handleProcess}
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
                                  <Eye className="w-4 h-4 mr-2" />
                                  Detectar Completo
                                </>
                            )}
                          </Button>

                          <Button
                              onClick={handleQuickDetection}
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
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                              w-full flex items-center justify-center
                              bg-white/10 text-white border border-white/30
                              transition
                              hover:bg-blue-600/70 hover:text-white hover:border-blue-400
                              active:scale-95
                              font-semibold
                              shadow-md
                              duration-200
                            `}
                            style={{ minHeight: "44px" }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Cambiar Imagen
                        </Button>
                      </div>
                  )}

                  <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                  />

                  <div className="mt-6 bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 text-sm">Formatos Soportados</h4>
                    <div className="flex flex-wrap gap-2">
                      {['JPG', 'JPEG', 'PNG', 'WEBP', 'BMP'].map((format) => (
                          <span key={format} className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                        {format}
                      </span>
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs mt-2">Tamaño máximo: 50MB</p>
                  </div>
                </CardContent>
              </Card>

              {/* Results Section */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Resultados de Detección</h3>
                    {processingTime > 0 && (
                        <span className="text-sm text-gray-400">
                      Procesado en {processingTime.toFixed(2)}s
                    </span>
                    )}
                  </div>

                  {results.length === 0 ? (
                      <div className="text-center py-12">
                        <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">No hay resultados aún</p>
                        <p className="text-gray-500 text-sm">Sube una imagen y presiona "Detectar" para ver los resultados</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        {results.map((result, index) => (
                            <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <span className="text-white font-mono text-xl">{result.plate_text}</span>
                                  {result.is_valid_plate && (
                                      <CheckCircle className="w-5 h-5 text-green-400" />
                                  )}
                                </div>
                                <span className="text-green-400 text-sm font-semibold">
                            {(result.overall_confidence * 100).toFixed(1)}%
                          </span>
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Formato válido:</span>
                                  <span className={result.is_valid_plate ? "text-green-400" : "text-red-400"}>
                              {result.is_valid_plate ? "Sí" : "No"}
                            </span>
                                </div>

                                {result.detection_confidence && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Confianza detección:</span>
                                      <span className="text-white">
                                {(result.detection_confidence * 100).toFixed(1)}%
                              </span>
                                    </div>
                                )}

                                {result.ocr_confidence && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Confianza OCR:</span>
                                      <span className="text-white">
                                {(result.ocr_confidence * 100).toFixed(1)}%
                              </span>
                                    </div>
                                )}

                                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                  <div
                                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${result.overall_confidence * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                        ))}

                        {results.length > 0 && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-lg border border-white/10">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-white font-semibold">Resumen del Análisis</h4>
                                  <p className="text-gray-400 text-sm">
                                    {results.length} matrícula{results.length !== 1 ? 's' : ''} detectada{results.length !== 1 ? 's' : ''}
                                    {results.filter(r => r.is_valid_plate).length > 0 && (
                                        <span className="text-green-400 ml-2">
                                  ({results.filter(r => r.is_valid_plate).length} válida{results.filter(r => r.is_valid_plate).length !== 1 ? 's' : ''})
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
                        )}
                      </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
  );
};

export default ImageRecognition;