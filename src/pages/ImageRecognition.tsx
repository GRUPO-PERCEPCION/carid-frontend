
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Image, Zap, Eye, Download } from "lucide-react";
import { Link } from "react-router-dom";

const ImageRecognition = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Array<{plate: string, confidence: number, bbox: number[]}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setResults([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedImage) return;
    
    setIsProcessing(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate detection results
    const mockResults = [
      { plate: "ABC-123", confidence: 97.8, bbox: [150, 200, 300, 250] },
      { plate: "XYZ-789", confidence: 95.2, bbox: [400, 180, 550, 230] }
    ];
    
    setResults(mockResults);
    setIsProcessing(false);
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
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
          setResults([]);
        };
        reader.readAsDataURL(file);
      }
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
                        src={selectedImage}
                        alt="Imagen cargada"
                        className="w-full h-64 object-contain"
                      />
                      {results.map((result, index) => (
                        <div
                          key={index}
                          className="absolute border-2 border-green-400 bg-green-400/20"
                          style={{
                            left: `${(result.bbox[0] / 800) * 100}%`,
                            top: `${(result.bbox[1] / 600) * 100}%`,
                            width: `${((result.bbox[2] - result.bbox[0]) / 800) * 100}%`,
                            height: `${((result.bbox[3] - result.bbox[1]) / 600) * 100}%`
                          }}
                        >
                          <div className="absolute -top-6 left-0 bg-green-400 text-black px-2 py-1 text-xs rounded">
                            {result.plate} ({result.confidence.toFixed(1)}%)
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                      >
                        {isProcessing ? (
                          <>
                            <Zap className="w-4 h-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Procesar Imagen
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
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
                    {['JPG', 'PNG', 'WEBP', 'BMP', 'TIFF'].map((format) => (
                      <span key={format} className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Resultados de Detección</h3>
                
                {results.length === 0 ? (
                  <div className="text-center py-12">
                    <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No hay resultados aún</p>
                    <p className="text-gray-500 text-sm">Sube una imagen y presiona "Procesar" para ver los resultados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-mono text-xl">{result.plate}</span>
                          <span className="text-green-400 text-sm font-semibold">
                            {result.confidence.toFixed(1)}% confianza
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Coordenadas:</span>
                            <span className="text-white font-mono">
                              [{result.bbox.join(', ')}]
                            </span>
                          </div>
                          
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${result.confidence}%` }}
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
                            </p>
                          </div>
                          <Button
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

          {/* Technical Info */}
          <Card className="bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-2xl backdrop-blur-sm border border-white/10 mt-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 text-center">Información Técnica</h3>
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-blue-400 font-semibold text-sm">Modelo</div>
                  <div className="text-white">YOLOv8-L</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-green-400 font-semibold text-sm">Inferencia</div>
                  <div className="text-white">≈30ms</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-purple-400 font-semibold text-sm">Precisión</div>
                  <div className="text-white">96.8%</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-yellow-400 font-semibold text-sm">Clases</div>
                  <div className="text-white">36</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImageRecognition;
