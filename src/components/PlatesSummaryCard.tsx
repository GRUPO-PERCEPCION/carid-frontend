// src/components/PlatesSummaryCard.tsx
// ✅ COMPONENTE PARA MOSTRAR RESUMEN COMPLETO DE TODAS LAS PLACAS DETECTADAS
// Versión sin modificaciones para evitar errores

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Target, Shield, CheckCircle, Zap, Eye, EyeOff, Filter,
    TrendingUp, TrendingDown, BarChart3, MapPin, Clock,
    Download, Search, SortAsc, SortDesc
} from "lucide-react";
import { UniquePlate, EnhancementStats } from '../types/streaming';
import {
    filterSixCharPlates,
    filterValidPlates,
    filterAutoFormattedPlates,
    groupPlatesByConfidence,
    sortPlatesByPriority,
    calculateDetectionStats,
    formatConfidence,
    formatFrameRange,
    getConfidenceColor,
    getConfidenceLabel
} from '../types/streaming';

interface PlatesSummaryCardProps {
    allUniquePlates: UniquePlate[];
    spatialRegions: Record<string, number>;
    enhancementStats: EnhancementStats | null;
    isStreaming: boolean;
    onExportData?: (format: 'json' | 'csv') => void;
}

type FilterType = 'all' | 'six_char' | 'valid' | 'auto_formatted' | 'high_confidence';
type SortType = 'confidence' | 'detection_count' | 'frame_range' | 'alphabetical';

const PlatesSummaryCard: React.FC<PlatesSummaryCardProps> = ({
                                                                 allUniquePlates,
                                                                 spatialRegions,
                                                                 enhancementStats,
                                                                 isStreaming,
                                                                 onExportData
                                                             }) => {
    // Estados para filtros y visualización
    const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
    const [currentSort, setCurrentSort] = useState<SortType>('confidence');
    const [sortDescending, setSortDescending] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPlateIndex, setExpandedPlateIndex] = useState<number | null>(null);

    // ✅ CÁLCULOS MEMOIZADOS PARA RENDIMIENTO
    const stats = useMemo(() => calculateDetectionStats(allUniquePlates), [allUniquePlates]);

    const filteredPlates = useMemo(() => {
        let plates = [...allUniquePlates];

        // Aplicar filtro de búsqueda
        if (searchTerm) {
            plates = plates.filter(plate =>
                plate.plate_text.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Aplicar filtro por tipo
        switch (currentFilter) {
            case 'six_char':
                plates = filterSixCharPlates(plates);
                break;
            case 'valid':
                plates = filterValidPlates(plates);
                break;
            case 'auto_formatted':
                plates = filterAutoFormattedPlates(plates);
                break;
            case 'high_confidence':
                plates = plates.filter(p => p.best_confidence >= 0.8);
                break;
            default:
                break;
        }

        // Aplicar ordenamiento
        switch (currentSort) {
            case 'confidence':
                plates.sort((a, b) => sortDescending ?
                    b.best_confidence - a.best_confidence :
                    a.best_confidence - b.best_confidence
                );
                break;
            case 'detection_count':
                plates.sort((a, b) => sortDescending ?
                    b.detection_count - a.detection_count :
                    a.detection_count - b.detection_count
                );
                break;
            case 'frame_range':
                plates.sort((a, b) => sortDescending ?
                    b.first_seen_frame - a.first_seen_frame :
                    a.first_seen_frame - b.first_seen_frame
                );
                break;
            case 'alphabetical':
                plates.sort((a, b) => sortDescending ?
                    b.plate_text.localeCompare(a.plate_text) :
                    a.plate_text.localeCompare(b.plate_text)
                );
                break;
        }

        return plates;
    }, [allUniquePlates, currentFilter, currentSort, sortDescending, searchTerm]);

    const confidenceBreakdown = useMemo(() =>
        groupPlatesByConfidence(allUniquePlates), [allUniquePlates]
    );

    // ✅ FUNCIONES HELPER
    const getFilterCount = (filter: FilterType): number => {
        switch (filter) {
            case 'six_char': return stats.sixCharPlates;
            case 'valid': return stats.validPlates;
            case 'auto_formatted': return stats.autoFormattedPlates;
            case 'high_confidence': return confidenceBreakdown.high.length;
            default: return stats.totalPlates;
        }
    };

    const getPlateIndicators = (plate: UniquePlate) => {
        const indicators = [];

        if (plate.is_six_char_valid) {
            indicators.push(
                <div key="six_char" className="flex items-center space-x-1 text-green-400">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-semibold">6 CHARS</span>
                </div>
            );
        }

        if (plate.auto_formatted || plate.is_auto_formatted) {
            indicators.push(
                <div key="auto" className="flex items-center space-x-1 text-blue-400">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-semibold">AUTO</span>
                </div>
            );
        }

        if (plate.is_valid_format && !plate.is_six_char_valid) {
            indicators.push(
                <CheckCircle key="valid" className="w-4 h-4 text-yellow-400" />
            );
        }

        return indicators;
    };

    const handleExport = (format: 'json' | 'csv') => {
        if (onExportData) {
            onExportData(format);
        } else {
            // Exportación local como fallback
            const exportData = {
                timestamp: new Date().toISOString(),
                summary: stats,
                enhancement_stats: enhancementStats,
                spatial_regions: spatialRegions,
                all_plates: allUniquePlates,
                filtered_plates: filteredPlates,
                confidence_breakdown: confidenceBreakdown
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `placas_streaming_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    if (allUniquePlates.length === 0) {
        return (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="text-center py-8">
                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-400">
                            {isStreaming ? 'Esperando detecciones...' : 'No hay placas detectadas'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            Las placas aparecerán aquí cuando sean detectadas
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
                {/* Header con estadísticas generales */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">
                            Resumen de Placas Detectadas ({stats.totalPlates})
                        </h3>
                        <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-400">
                ✅ {stats.sixCharPlates} con 6 caracteres
              </span>
                            <span className="text-yellow-400">
                ✓ {stats.validPlates} válidas
              </span>
                            <span className="text-blue-400">
                ⚡ {stats.autoFormattedPlates} auto-formateadas
              </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={() => setShowDetails(!showDetails)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                        >
                            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>

                        <Button
                            onClick={() => handleExport('json')}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Estadísticas detalladas */}
                {showDetails && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                            <div className="text-green-400 font-bold text-xl">{confidenceBreakdown.high.length}</div>
                            <div className="text-xs text-gray-400">Alta Confianza</div>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                            <div className="text-yellow-400 font-bold text-xl">{confidenceBreakdown.medium.length}</div>
                            <div className="text-xs text-gray-400">Media Confianza</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                            <div className="text-red-400 font-bold text-xl">{confidenceBreakdown.low.length}</div>
                            <div className="text-xs text-gray-400">Baja Confianza</div>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
                            <div className="text-purple-400 font-bold text-xl">{Object.keys(spatialRegions).length}</div>
                            <div className="text-xs text-gray-400">Regiones</div>
                        </div>
                    </div>
                )}

                {/* Controles de filtro y búsqueda */}
                <div className="flex items-center space-x-4 mb-4">
                    {/* Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar placa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                        />
                    </div>

                    {/* Filtros */}
                    <div className="flex items-center space-x-2">
                        {(['all', 'six_char', 'valid', 'auto_formatted', 'high_confidence'] as FilterType[]).map((filter) => (
                            <Button
                                key={filter}
                                onClick={() => setCurrentFilter(filter)}
                                variant={currentFilter === filter ? "default" : "ghost"}
                                size="sm"
                                className={`
                  ${currentFilter === filter
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }
                `}
                            >
                                <Filter className="w-3 h-3 mr-1" />
                                {filter === 'all' ? 'Todas' :
                                    filter === 'six_char' ? '6 Chars' :
                                        filter === 'valid' ? 'Válidas' :
                                            filter === 'auto_formatted' ? 'Auto' :
                                                'Alta Conf.'}
                                <span className="ml-1 text-xs">({getFilterCount(filter)})</span>
                            </Button>
                        ))}
                    </div>

                    {/* Ordenamiento */}
                    <div className="flex items-center space-x-2">
                        <select
                            value={currentSort}
                            onChange={(e) => setCurrentSort(e.target.value as SortType)}
                            className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
                        >
                            <option value="confidence">Confianza</option>
                            <option value="detection_count">Detecciones</option>
                            <option value="frame_range">Frame</option>
                            <option value="alphabetical">A-Z</option>
                        </select>

                        <Button
                            onClick={() => setSortDescending(!sortDescending)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                        >
                            {sortDescending ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Lista de placas filtradas */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredPlates.map((plate, index) => {
                        const isExpanded = expandedPlateIndex === index;
                        const plateNumber = allUniquePlates.findIndex(p => p.plate_text === plate.plate_text) + 1;

                        return (
                            <div
                                key={`${plate.plate_text}-${index}`}
                                className={`
                  bg-white/5 rounded-lg border transition-all hover:bg-white/10 cursor-pointer
                  ${plate.is_six_char_valid
                                    ? 'border-green-500/30 bg-green-500/5'
                                    : plate.is_valid_format
                                        ? 'border-yellow-500/20 bg-yellow-500/5'
                                        : 'border-white/10'
                                }
                `}
                                onClick={() => setExpandedPlateIndex(isExpanded ? null : index)}
                            >
                                <div className="p-4">
                                    {/* Información principal */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                            {/* Número de placa */}
                                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                                {plateNumber}
                                            </div>

                                            {/* Texto de la placa */}
                                            <span className="text-white font-mono text-lg">{plate.plate_text}</span>

                                            {/* Indicadores */}
                                            <div className="flex items-center space-x-2">
                                                {getPlateIndicators(plate)}
                                            </div>
                                        </div>

                                        {/* Confianza */}
                                        <div className="text-right">
                      <span className={`text-lg font-semibold ${getConfidenceColor(plate.best_confidence)}`}>
                        {formatConfidence(plate.best_confidence)}
                      </span>
                                            <div className="text-xs text-gray-400">
                                                {getConfidenceLabel(plate.best_confidence)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Información resumida */}
                                    <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                                        <div className="text-center">
                                            <div className="text-white font-semibold">{plate.detection_count}</div>
                                            <div className="text-xs text-gray-400">Detecciones</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-white font-semibold">
                                                {formatFrameRange(plate.first_seen_frame, plate.last_seen_frame)}
                                            </div>
                                            <div className="text-xs text-gray-400">Frames</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-white font-semibold">
                                                {formatConfidence(plate.avg_confidence)}
                                            </div>
                                            <div className="text-xs text-gray-400">Promedio</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-white font-semibold">
                                                {plate.last_seen_frame - plate.first_seen_frame + 1}
                                            </div>
                                            <div className="text-xs text-gray-400">Duración</div>
                                        </div>
                                    </div>

                                    {/* Barra de progreso */}
                                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${
                                                plate.is_six_char_valid
                                                    ? 'bg-gradient-to-r from-green-500 to-green-400'
                                                    : (plate.auto_formatted || plate.is_auto_formatted)
                                                        ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                                                        : plate.is_valid_format
                                                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                                                            : 'bg-gradient-to-r from-gray-500 to-gray-400'
                                            }`}
                                            style={{ width: `${plate.best_confidence * 100}%` }}
                                        />
                                    </div>

                                    {/* Información expandida */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                            {/* Texto original si es diferente */}
                                            {plate.raw_plate_text && plate.raw_plate_text !== plate.plate_text && (
                                                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                                                    <div className="flex items-center space-x-2 text-blue-400 text-sm">
                                                        <Zap className="w-4 h-4" />
                                                        <span className="font-semibold">Texto original:</span>
                                                        <span className="font-mono">{plate.raw_plate_text}</span>
                                                        <span>→</span>
                                                        <span className="font-mono">{plate.plate_text}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Detalles técnicos */}
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <div className="text-gray-400 mb-2">Información temporal</div>
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Mejor frame:</span>
                                                            <span className="text-white">{plate.best_frame}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Duración:</span>
                                                            <span className="text-white">{plate.duration_frames || 'N/A'} frames</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Estabilidad:</span>
                                                            <span className="text-white">
                                {plate.stability_score ? `${(plate.stability_score * 100).toFixed(0)}%` : 'N/A'}
                              </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-gray-400 mb-2">Información espacial</div>
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Región:</span>
                                                            <span className="text-white">{plate.spatial_region || plate.spatial_key || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Caracteres:</span>
                                                            <span className="text-white">{plate.char_count || plate.plate_text.replace(/[-\s]/g, '').length}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Método:</span>
                                                            <span className="text-purple-400 text-xs">
                                {plate.processing_method === "roi_enhanced" ? "ROI+6C" :
                                    plate.processing_method === "spatial_tracking_multiple_plates" ? "MULTI" :
                                        plate.processing_method || "STD"}
                              </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tendencia de confianza */}
                                            {plate.confidence_trend && plate.confidence_trend.length > 1 && (
                                                <div>
                                                    <div className="text-gray-400 mb-2 text-sm">Tendencia de confianza</div>
                                                    <div className="flex items-center space-x-2">
                                                        {plate.confidence_trend.slice(-10).map((conf, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="w-2 bg-white/20 rounded-full flex-shrink-0"
                                                                style={{
                                                                    height: `${Math.max(4, conf * 20)}px`,
                                                                    backgroundColor: conf >= 0.8 ? '#10b981' : conf >= 0.6 ? '#f59e0b' : '#ef4444'
                                                                }}
                                                            />
                                                        ))}
                                                        <div className="flex items-center space-x-1 text-xs">
                                                            {plate.confidence_trend[plate.confidence_trend.length - 1] >= plate.confidence_trend[0] ? (
                                                                <TrendingUp className="w-3 h-3 text-green-400" />
                                                            ) : (
                                                                <TrendingDown className="w-3 h-3 text-red-400" />
                                                            )}
                                                            <span className="text-gray-400">
                                {plate.confidence_trend.length} mediciones
                              </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Información especial para placas de 6 caracteres */}
                                            {plate.is_six_char_valid && (
                                                <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                                                    <div className="flex items-center space-x-2 text-green-400 text-sm">
                                                        <Shield className="w-4 h-4" />
                                                        <span className="font-semibold">Placa validada con 6 caracteres exactos</span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-green-300">
                                                        Cumple con el formato peruano estándar ABC-123
                                                    </div>
                                                </div>
                                            )}

                                            {/* Información especial para placas auto-formateadas */}
                                            {(plate.auto_formatted || plate.is_auto_formatted) && (
                                                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                                                    <div className="flex items-center space-x-2 text-blue-400 text-sm">
                                                        <Zap className="w-4 h-4" />
                                                        <span className="font-semibold">Placa formateada automáticamente</span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-blue-300">
                                                        Se agregó el guión automáticamente para formato estándar
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Información de filtros aplicados */}
                {(currentFilter !== 'all' || searchTerm) && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                            <div className="text-blue-400">
                                Mostrando {filteredPlates.length} de {allUniquePlates.length} placas
                                {searchTerm && ` · Búsqueda: "${searchTerm}"`}
                                {currentFilter !== 'all' && ` · Filtro: ${currentFilter}`}
                            </div>
                            <Button
                                onClick={() => {
                                    setCurrentFilter('all');
                                    setSearchTerm('');
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300"
                            >
                                Limpiar filtros
                            </Button>
                        </div>
                    </div>
                )}

                {/* Información de estado de streaming */}
                {isStreaming && (
                    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center space-x-2 text-purple-400 text-sm">
                            <BarChart3 className="w-4 h-4 animate-pulse" />
                            <span>Streaming activo - Las placas se actualizan en tiempo real</span>
                        </div>
                    </div>
                )}

                {/* Información de mejoras si está disponible */}
                {enhancementStats && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="text-sm text-green-400">
                            <div className="font-semibold mb-1">Sistema de mejoras activo:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>ROI: {enhancementStats.roi_processing ? '✅ Activo' : '❌ Inactivo'}</div>
                                <div>Filtro 6 chars: {enhancementStats.six_char_filter_active ? '✅ Activo' : '❌ Inactivo'}</div>
                                <div>Auto-formato: {enhancementStats.auto_dash_formatting ? '✅ Activo' : '❌ Inactivo'}</div>
                                <div>Tasa éxito: {(enhancementStats.six_char_detection_rate * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Botones de exportación */}
                <div className="mt-4 flex items-center justify-center space-x-3">
                    <Button
                        onClick={() => handleExport('json')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar JSON
                    </Button>
                    <Button
                        onClick={() => handleExport('csv')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default PlatesSummaryCard;