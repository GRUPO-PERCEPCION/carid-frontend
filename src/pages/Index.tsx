
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Clock, Target, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ALPR-Perú</span>
            </div>
            <Link to="/recognition">
              <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white border-0">
                Iniciar Sistema
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Reconocimiento Automático de
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent block">
              Matrículas Peruanas
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Sistema de Deep Learning basado en YOLOv8 para la detección y reconocimiento
            de matrículas vehiculares en tiempo real con alta precisión.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/recognition">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white border-0 px-8 py-3">
                Comenzar Ahora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Ver Documentación
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">≈30ms</h3>
              <p className="text-gray-300">Tiempo de inferencia por imagen</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">YOLOv8</h3>
              <p className="text-gray-300">Modelo de detección avanzado</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Tiempo Real</h3>
              <p className="text-gray-300">Procesamiento instantáneo</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Características Principales
          </h2>
          <p className="text-xl text-gray-300">
            Tecnología de vanguardia para el reconocimiento de matrículas
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Detección Precisa</h3>
                <p className="text-gray-300">YOLOv8-L optimizado para detectar regiones de matrículas peruanas con alta precisión.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Reconocimiento de Caracteres</h3>
                <p className="text-gray-300">CNN especializada para identificar cada carácter (36 clases) en formatos ABC-123 y A1B-456.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Múltiples Entradas</h3>
                <p className="text-gray-300">Procesamiento de imágenes estáticas, videos y streaming en tiempo real.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Adaptable a Condiciones</h3>
                <p className="text-gray-300">Funciona eficazmente en diferentes condiciones de iluminación y ángulos.</p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 rounded-2xl p-8 backdrop-blur-sm border border-white/10">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <span className="text-white font-medium">Detector de Placas</span>
                  <span className="text-green-400 font-semibold">YOLOv8-L</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <span className="text-white font-medium">Reconocedor OCR</span>
                  <span className="text-blue-400 font-semibold">YOLOv8-M</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <span className="text-white font-medium">Clases de Caracteres</span>
                  <span className="text-yellow-400 font-semibold">36</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <span className="text-white font-medium">Inferencia</span>
                  <span className="text-green-400 font-semibold">~30ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center bg-gradient-to-r from-blue-600/20 to-green-600/20 rounded-2xl p-12 backdrop-blur-sm border border-white/10">
          <h2 className="text-4xl font-bold text-white mb-4">
            ¿Listo para automatizar tu sistema?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Implementa reconocimiento automático de matrículas en tu parqueo, peaje o control de flotas.
          </p>
          <Link to="/recognition">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white border-0 px-12 py-4 text-lg">
              Iniciar Sistema ALPR
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/20 border-t border-white/10 py-8">
        <div className="container mx-auto px-6 text-center text-gray-400">
          <p>&copy; 2024 ALPR-Perú. Sistema de reconocimiento automático de matrículas.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
