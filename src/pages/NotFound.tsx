import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Target, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

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
      <div className="container mx-auto px-6 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md bg-black/30 border-white/10 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center">
              {/* License Plate 404 */}
              <div className="w-64 h-32 bg-white rounded-md border-4 border-gray-800 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-6 bg-blue-600"></div>
                <div className="absolute bottom-0 left-0 w-full h-6 bg-blue-600"></div>
                <div className="flex items-center justify-center h-full">
                  <span className="text-5xl font-bold tracking-widest text-gray-800">404</span>
                </div>
                <div className="absolute top-1 left-0 w-full text-center">
                  <span className="text-xs font-bold text-white">CARID SYSTEM</span>
                </div>
                <div className="absolute bottom-1 left-0 w-full text-center">
                  <span className="text-xs font-bold text-white">NOT FOUND</span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 mr-2" />
                  <h2 className="text-2xl font-bold text-white">Placa no reconocida</h2>
                </div>
                <p className="text-gray-300 mb-6">La ruta que intentas acceder no ha sido detectada por nuestro sistema de reconocimiento.</p>
                
                <Link to="/">
                  <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white border-0">
                    Volver al sistema principal
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
