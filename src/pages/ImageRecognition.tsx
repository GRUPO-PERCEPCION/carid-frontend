
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image, Upload, Zap, Target } from "lucide-react";
import { Link } from "react-router-dom";

const ImageRecognition = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = () => {
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
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
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Reconocimiento por Imagen</h1>
            <p className="text-gray-300">Sube una imagen para detectar y reconocer matrículas vehiculares</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Subir Imagen</h3>
                
                {!preview ? (
                  <div className="border-2 border-dashed border-white/30 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-white mb-2">Arrastra tu imagen aquí o haz clic para seleccionar</p>
                    <p className="text-gray-400 text-sm mb-4">Formatos soportados: JPG, PNG, WEBP</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                        Seleccionar Imagen
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden">
                      <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                    <div className="flex space-x-4">
                      <Button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Procesar Imagen
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setPreview(null);
                          setSelectedFile(null);
                        }}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Cambiar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Resultados</h3>
                
                {!isProcessing && !preview ? (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Los resultados aparecerán aquí una vez que subas y proceses una imagen</p>
                  </div>
                ) : isProcessing ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-white mb-2">Procesando imagen...</p>
                    <p className="text-gray-400 text-sm">Detectando matrículas y reconociendo caracteres</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3">Matrículas Detectadas</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                          <span className="text-white font-mono text-lg">ABC-123</span>
                          <span className="text-green-400 text-sm">Confianza: 98.5%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3">Información del Procesamiento</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tiempo de detección:</span>
                          <span className="text-white">15ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tiempo de OCR:</span>
                          <span className="text-white">12ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tiempo total:</span>
                          <span className="text-green-400">27ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Región detectada:</span>
                          <span className="text-white">1</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Technical Info */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm mt-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Información Técnica</h3>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-blue-400 font-semibold">Modelo Detector</div>
                  <div className="text-gray-300">YOLOv8-L</div>
                </div>
                <div className="text-center">
                  <div className="text-green-400 font-semibold">Modelo OCR</div>
                  <div className="text-gray-300">YOLOv8-M</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-400 font-semibold">Clases</div>
                  <div className="text-gray-300">36 caracteres</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-400 font-semibold">Precisión</div>
                  <div className="text-gray-300">>95%</div>
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
