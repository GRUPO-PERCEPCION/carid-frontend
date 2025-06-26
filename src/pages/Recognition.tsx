// src/pages/Recognition.tsx - Versión sin Streaming Live
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image, Video, Target } from "lucide-react";
import { Link } from "react-router-dom";

const Recognition = () => {
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <ArrowLeft className="w-5 h-5 text-white" />
                <span className="text-white">Volver al inicio</span>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">CARID</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Sistema de Reconocimiento
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Selecciona el método de entrada para procesar las matrículas vehiculares
            </p>
          </div>

          {/* Method Selection Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Image Upload */}
            <Link to="/recognition/image" className="group">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:from-blue-400 group-hover:to-blue-500 transition-all duration-300">
                    <Image className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Imagen</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Sube una imagen estática para detectar y reconocer matrículas vehiculares
                  </p>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Formatos: JPG, PNG, WEBP</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Procesamiento instantáneo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Video Upload */}
            <Link to="/recognition/video" className="group">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:from-green-400 group-hover:to-green-500 transition-all duration-300">
                    <Video className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Video</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Carga un archivo de video para análisis frame por frame de matrículas
                  </p>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Formatos: MP4, AVI, MOV</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Análisis completo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Real-time Streaming */}
            <Link to="/recognition/streaming" className="group">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl relative overflow-hidden">
                {/* Badge de "Tiempo Real" */}
                <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                  LIVE
                </div>

                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:from-purple-400 group-hover:to-purple-500 transition-all duration-300">
                    <Video className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Streaming</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Procesamiento en tiempo real con WebSocket y control interactivo
                  </p>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <span>WebSocket bidireccional</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span>Control en tiempo real</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Información adicional sobre streaming */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-8 backdrop-blur-sm border border-white/10 max-w-4xl mx-auto">
              <div className="flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-purple-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Streaming en Tiempo Real</h2>
              </div>
              <p className="text-gray-300 text-lg mb-6">
                Experimenta el sistema de streaming con WebSocket que permite monitoreo
                en vivo del procesamiento de video con control interactivo.
              </p>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Conexión Bidireccional</h3>
                  <p className="text-gray-400">WebSocket full-duplex para comunicación instantánea</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Video className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Video en Vivo</h3>
                  <p className="text-gray-400">Ve el procesamiento frame por frame en tiempo real</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Control Interactivo</h3>
                  <p className="text-gray-400">Pausa, reanuda y controla el procesamiento</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Recognition;