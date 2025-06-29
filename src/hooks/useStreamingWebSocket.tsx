// src/hooks/useStreamingWebSocket.tsx
// ✅ VERSIÓN CORREGIDA CON MANEJO CORRECTO DE PLACAS DETECTADAS

import { useState, useRef, useCallback, useEffect } from 'react';
import { streamingApi } from '../services/streamingApi';
import {
    StreamingFrame,
    PlateDetection,
    UniquePlate,
    StreamingProgress,
    StreamingState,
    StreamingStatus,
    StreamingOptions,
    UseStreamingWebSocketConfig,
    UseStreamingWebSocketReturn,
    MessageHandler,
    WebSocketMessage,
    isStreamingUpdateData,
} from '../types/streaming';

// ✅ INTERFACE EXTENDIDA PARA MANEJO COMPLETO DE PLACAS
interface ExtendedStreamingState extends StreamingState {
    allUniquePlates: UniquePlate[];
    spatialRegions: Record<string, number>;
    enhancementStats: {
        roi_processing: boolean;
        six_char_filter_active: boolean;
        auto_dash_formatting: boolean;
        total_six_char_detections: number;
        total_auto_formatted_detections: number;
        six_char_plates_found: number;
        auto_formatted_plates_found: number;
        six_char_detection_rate: number;
        auto_formatted_rate: number;
    } | null;
}

export function useStreamingWebSocket(config: UseStreamingWebSocketConfig): UseStreamingWebSocketReturn {
    // ✅ ESTADO EXTENDIDO CON INFORMACIÓN COMPLETA DE PLACAS
    const [state, setState] = useState<ExtendedStreamingState>({
        isConnected: false,
        isStreaming: false,
        isPaused: false,
        sessionId: '',
        status: 'disconnected' as StreamingStatus,
        error: null,
        currentFrame: null,
        detections: [],
        uniquePlates: [],
        progress: { processed: 0, total: 0, percent: 0 },
        processingSpeed: 0,
        // ✅ NUEVOS CAMPOS PARA MANEJO COMPLETO
        allUniquePlates: [],
        spatialRegions: {},
        enhancementStats: null
    });

    // Referencias
    const wsRef = useRef<WebSocket | null>(null);
    const messageHandlersRef = useRef<Map<string, MessageHandler[]>>(new Map());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);

    // ✅ REFERENCIAS PARA DEBUGGING Y CONTROL
    const messageCountRef = useRef(0);
    const frameUpdateCountRef = useRef(0);
    const lastFrameNumberRef = useRef(0);
    const plateUpdateCountRef = useRef(0);

    // Configuración
    const wsBaseUrl = config.wsBaseUrl || 'ws://localhost:8000';
    const reconnectInterval = config.reconnectInterval || 3000;
    const maxReconnectAttempts = config.maxReconnectAttempts || 5;

    // ✅ LOGGING MEJORADO con colores y timestamps
    const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: unknown) => {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const colors = {
            info: 'color: #3b82f6',
            warn: 'color: #f59e0b',
            error: 'color: #ef4444'
        };

        console.log(
            `%c[${timestamp}] [WebSocket] ${message}`,
            colors[level],
            data || ''
        );
    }, []);

    // Generar session ID único
    const generateSessionId = useCallback(() => {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // ✅ FUNCIÓN DE DEBUG MEJORADO PARA PLACAS
    const debugStreamingUpdate = useCallback((data: any, source: string = 'unknown') => {
        messageCountRef.current += 1;

        const debugInfo = {
            messageCount: messageCountRef.current,
            source: source,
            messageType: typeof data,
            hasFrameData: !!data?.frame_data,
            hasImageBase64: !!data?.frame_data?.image_base64,
            imageLength: data?.frame_data?.image_base64?.length || 0,
            hasFrameInfo: !!data?.frame_info,
            frameNumber: data?.frame_info?.frame_number,
            hasDetections: !!data?.current_detections,
            detectionsCount: Array.isArray(data?.current_detections) ? data.current_detections.length : 0,
            hasProgress: !!data?.progress,
            progressPercent: data?.progress?.progress_percent,
            // ✅ NUEVOS CAMPOS PARA PLACAS
            hasAllPlates: !!data?.all_plates_summary?.complete_list,
            allPlatesCount: Array.isArray(data?.all_plates_summary?.complete_list) ? data.all_plates_summary.complete_list.length : 0,
            hasSixCharStats: !!data?.enhancement_stats,
            sixCharPlatesFound: data?.enhancement_stats?.six_char_plates_found || 0,
            autoFormattedFound: data?.enhancement_stats?.auto_formatted_plates_found || 0,
            hasSpatialData: !!data?.spatial_analysis?.regions_found,
            spatialRegionsCount: data?.spatial_analysis?.regions_found ? Object.keys(data.spatial_analysis.regions_found).length : 0,
            allKeys: Object.keys(data || {}),
            timestamp: new Date().toISOString()
        };

        console.group(`%c🔍 STREAMING UPDATE #${messageCountRef.current}`, 'color: #8b5cf6; font-weight: bold');
        console.table(debugInfo);
        console.log('📦 Raw data:', data);
        console.groupEnd();

        return debugInfo;
    }, []);

    // ✅ FUNCIÓN COMPLETAMENTE REESCRITA PARA MANEJO DE PLACAS
    const handleStreamingUpdate = useCallback((data: unknown) => {
        const debugInfo = debugStreamingUpdate(data, 'handleStreamingUpdate');

        if (!data || typeof data !== 'object') {
            console.error('❌ Invalid data received:', data);
            return;
        }

        const updateData = data as any;

        setState(prev => {
            const newState = { ...prev };
            let frameUpdated = false;
            let detectionsUpdated = false;
            let progressUpdated = false;
            let platesUpdated = false;
            let enhancementUpdated = false;

            // ✅ 1. ACTUALIZAR FRAME (CRÍTICO PARA STREAMING CONTINUO)
            if (updateData.frame_data?.image_base64) {
                frameUpdateCountRef.current += 1;
                const frameNumber = updateData.frame_info?.frame_number || (lastFrameNumberRef.current + 1);
                lastFrameNumberRef.current = frameNumber;

                newState.currentFrame = {
                    image: `data:image/jpeg;base64,${updateData.frame_data.image_base64}`,
                    frameNumber: frameNumber,
                    timestamp: updateData.frame_info?.timestamp || Date.now(),
                    processingTime: updateData.frame_info?.processing_time || 0
                };

                frameUpdated = true;
                console.log(`%c🖼️ FRAME UPDATED #${frameUpdateCountRef.current}`, 'color: #10b981; font-weight: bold', {
                    frameNumber: frameNumber,
                    imageLength: updateData.frame_data.image_base64.length,
                    processingTime: newState.currentFrame.processingTime,
                    roiUsed: updateData.frame_info?.roi_used || false,
                    sixCharFilter: updateData.frame_info?.six_char_filter_applied || false
                });
            }
            // Fallback: actualizar metadata del frame sin cambiar imagen
            else if (updateData.frame_info && prev.currentFrame) {
                const frameNumber = updateData.frame_info.frame_number || prev.currentFrame.frameNumber;
                lastFrameNumberRef.current = frameNumber;

                newState.currentFrame = {
                    ...prev.currentFrame,
                    frameNumber: frameNumber,
                    timestamp: updateData.frame_info.timestamp || prev.currentFrame.timestamp,
                    processingTime: updateData.frame_info.processing_time || prev.currentFrame.processingTime
                };

                console.log(`%c📋 FRAME METADATA UPDATED`, 'color: #f59e0b', {
                    frameNumber: frameNumber,
                    keptPreviousImage: true
                });
            }

            // ✅ 2. ACTUALIZAR PROGRESO
            if (updateData.progress) {
                newState.progress = {
                    processed: Number(updateData.progress.processed_frames || prev.progress.processed),
                    total: Number(updateData.progress.total_frames || prev.progress.total),
                    percent: Number(updateData.progress.progress_percent || prev.progress.percent)
                };
                newState.processingSpeed = Number(updateData.progress.processing_speed || prev.processingSpeed);
                progressUpdated = true;

                console.log(`%c📊 PROGRESS UPDATED`, 'color: #3b82f6', {
                    processed: newState.progress.processed,
                    total: newState.progress.total,
                    percent: newState.progress.percent.toFixed(1) + '%'
                });
            }

            // ✅ 3. ACTUALIZAR DETECCIONES DEL FRAME ACTUAL
            if (updateData.hasOwnProperty('current_detections')) {
                newState.detections = Array.isArray(updateData.current_detections)
                    ? updateData.current_detections
                    : [];
                detectionsUpdated = true;

                console.log(`%c🎯 DETECTIONS UPDATED`, 'color: #ef4444', {
                    count: newState.detections.length,
                    frameNumber: updateData.frame_info?.frame_number || 'unknown',
                    sixCharDetections: newState.detections.filter(d => d.six_char_validated).length
                });
            }

            // ✅ 4. ACTUALIZAR TODAS LAS PLACAS ÚNICAS (PRIORIDAD ALTA)
            if (updateData.all_plates_summary?.complete_list) {
                plateUpdateCountRef.current += 1;
                const completeList = updateData.all_plates_summary.complete_list;

                newState.allUniquePlates = completeList;
                newState.uniquePlates = completeList.slice(0, 10); // Mantener compatibilidad con uniquePlates original
                platesUpdated = true;

                console.log(`%c🏆 ALL PLATES UPDATED #${plateUpdateCountRef.current}`, 'color: #8b5cf6; font-weight: bold', {
                    totalPlates: completeList.length,
                    sixCharPlates: completeList.filter(p => p.is_six_char_valid).length,
                    validPlates: completeList.filter(p => p.is_valid_format).length,
                    autoFormattedPlates: completeList.filter(p => (p as any).auto_formatted || (p as any).is_auto_formatted).length
                });
            }
            // Fallback: usar detection_summary si no hay all_plates_summary
            else if (updateData.detection_summary?.best_plates) {
                const bestPlates = updateData.detection_summary.best_plates;
                newState.uniquePlates = bestPlates;

                // Si no tenemos allUniquePlates, usar bestPlates como fallback
                if (newState.allUniquePlates.length === 0) {
                    newState.allUniquePlates = bestPlates;
                }

                platesUpdated = true;
                console.log(`%c🥈 FALLBACK PLATES UPDATED`, 'color: #f59e0b', {
                    bestPlates: bestPlates.length,
                    usingAsFallback: newState.allUniquePlates.length === bestPlates.length
                });
            }

            // ✅ 5. ACTUALIZAR INFORMACIÓN ESPACIAL
            if (updateData.spatial_analysis?.regions_found) {
                newState.spatialRegions = updateData.spatial_analysis.regions_found;
                console.log(`%c🗺️ SPATIAL DATA UPDATED`, 'color: #06b6d4', {
                    regionsCount: Object.keys(newState.spatialRegions).length,
                    regions: Object.keys(newState.spatialRegions)
                });
            }

            // ✅ 6. ACTUALIZAR ESTADÍSTICAS DE MEJORAS
            if (updateData.enhancement_stats) {
                newState.enhancementStats = {
                    roi_processing: updateData.enhancement_stats.roi_processing || false,
                    six_char_filter_active: updateData.enhancement_stats.six_char_filter_active || false,
                    auto_dash_formatting: updateData.enhancement_stats.auto_dash_formatting || false,
                    total_six_char_detections: updateData.enhancement_stats.total_six_char_detections || 0,
                    total_auto_formatted_detections: updateData.enhancement_stats.total_auto_formatted_detections || 0,
                    six_char_plates_found: updateData.enhancement_stats.six_char_plates_found || 0,
                    auto_formatted_plates_found: updateData.enhancement_stats.auto_formatted_plates_found || 0,
                    six_char_detection_rate: updateData.enhancement_stats.six_char_detection_rate || 0,
                    auto_formatted_rate: updateData.enhancement_stats.auto_formatted_rate || 0
                };
                enhancementUpdated = true;

                console.log(`%c⚡ ENHANCEMENT STATS UPDATED`, 'color: #8b5cf6', {
                    roiProcessing: newState.enhancementStats.roi_processing,
                    sixCharFilter: newState.enhancementStats.six_char_filter_active,
                    autoFormatting: newState.enhancementStats.auto_dash_formatting,
                    sixCharPlatesFound: newState.enhancementStats.six_char_plates_found,
                    autoFormattedFound: newState.enhancementStats.auto_formatted_plates_found,
                    sixCharRate: (newState.enhancementStats.six_char_detection_rate * 100).toFixed(1) + '%'
                });
            }

            // ✅ 7. LOG DEL RESULTADO FINAL COMPLETO
            console.log(`%c📈 STATE UPDATE SUMMARY`, 'color: #059669; font-weight: bold', {
                frameUpdated,
                detectionsUpdated,
                progressUpdated,
                platesUpdated,
                enhancementUpdated,
                currentFrameNumber: newState.currentFrame?.frameNumber || 'none',
                detectionsCount: newState.detections.length,
                uniquePlatesCount: newState.uniquePlates.length,
                allUniquePlatesCount: newState.allUniquePlates.length,
                spatialRegionsCount: Object.keys(newState.spatialRegions).length,
                enhancementStatsAvailable: !!newState.enhancementStats
            });

            return newState;
        });
    }, [debugStreamingUpdate]);

    // ✅ MANEJAR MENSAJES WEBSOCKET CON DEBUG EXTENDIDO
    const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
        const messageType = message.type || 'unknown';
        const data = message.data || {};

        console.log(`%c📨 WebSocket Message Received`, 'color: #6366f1; font-weight: bold', {
            type: messageType,
            hasData: !!data,
            dataKeys: Object.keys(data),
            timestamp: new Date().toISOString()
        });

        // Manejar handlers personalizados primero
        if (typeof data === 'object' && data !== null) {
            const handlers = messageHandlersRef.current.get(messageType) || [];
            handlers.forEach(handler => {
                try {
                    handler(data as Record<string, unknown>);
                } catch (error) {
                    log('error', `Error en handler para ${messageType}`, error);
                }
            });
        }

        // Manejar mensajes del sistema
        switch (messageType) {
            case 'connection_established':
                log('info', 'Conexión establecida confirmada');
                break;

            case 'streaming_started':
                setState(prev => ({
                    ...prev,
                    isStreaming: true,
                    status: 'processing',
                    error: null,
                    // ✅ LIMPIAR DATOS ANTERIORES AL INICIAR
                    allUniquePlates: [],
                    spatialRegions: {},
                    enhancementStats: null,
                    detections: [],
                    uniquePlates: []
                }));
                console.log(`%c🚀 STREAMING STARTED`, 'color: #10b981; font-weight: bold');
                break;

            case 'streaming_update':
            case 'frame_update':
            case 'detection_update':
            case 'progress_update':
                handleStreamingUpdate(data);
                break;

            case 'streaming_completed':
                setState(prev => {
                    console.log(
                        `%c✅ STREAMING COMPLETED`,
                        'color: #10b981; font-weight: bold',
                        {
                            finalPlatesCount: (prev as ExtendedStreamingState).allUniquePlates.length,
                            finalSixCharPlates: (prev as ExtendedStreamingState).allUniquePlates.filter(p => p.is_six_char_valid).length
                        }
                    );
                    return { ...prev, isStreaming: false, status: 'completed' };
                });
                break;

            case 'streaming_error':
                setState(prev => ({ ...prev, isStreaming: false, status: 'error', error: message.error || 'Error de streaming' }));
                console.log(`%c❌ STREAMING ERROR`, 'color: #ef4444; font-weight: bold', message.error);
                break;

            case 'processing_paused':
                setState(prev => ({ ...prev, isPaused: true, status: 'paused' }));
                break;

            case 'processing_resumed':
                setState(prev => ({ ...prev, isPaused: false, status: 'processing' }));
                break;

            case 'processing_stopped':
                setState(prev => ({ ...prev, isStreaming: false, isPaused: false, status: 'stopped' }));
                break;

            default:
                console.log(`%c⚠️ UNHANDLED MESSAGE TYPE: ${messageType}`, 'color: #f59e0b');
        }
    }, [log, handleStreamingUpdate]);

    // ✅ FUNCIONES DE CONEXIÓN Y CONTROL (SIN CAMBIOS PERO CON LIMPIEZA MEJORADA)
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            log('info', 'Ya conectado');
            return;
        }

        const sessionId = generateSessionId();
        const wsUrl = `${wsBaseUrl}/api/v1/streaming/ws/${sessionId}`;

        log('info', `Conectando a: ${wsUrl}`);

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                log('info', 'WebSocket conectado exitosamente');
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    sessionId,
                    status: 'connected',
                    error: null,
                    // ✅ LIMPIAR DATOS AL CONECTAR
                    allUniquePlates: [],
                    spatialRegions: {},
                    enhancementStats: null
                }));
                reconnectAttemptsRef.current = 0;

                // Reset debugging counters
                messageCountRef.current = 0;
                frameUpdateCountRef.current = 0;
                lastFrameNumberRef.current = 0;
                plateUpdateCountRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data) as WebSocketMessage;
                    handleWebSocketMessage(message);
                } catch (error) {
                    log('error', 'Error parseando mensaje WebSocket', error);
                }
            };

            ws.onclose = (event) => {
                log('warn', `WebSocket cerrado: ${event.code} - ${event.reason}`);
                setState(prev => ({ ...prev, isConnected: false, status: 'disconnected' }));
                if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    scheduleReconnect();
                }
            };

            ws.onerror = (error) => {
                log('error', 'Error en WebSocket', error);
                setState(prev => ({ ...prev, error: 'Error de conexión WebSocket', status: 'error' }));
            };

        } catch (error) {
            log('error', 'Error creando WebSocket', error);
            setState(prev => ({ ...prev, error: 'No se pudo crear la conexión WebSocket', status: 'error' }));
        }
    }, [wsBaseUrl, generateSessionId, maxReconnectAttempts, log, handleWebSocketMessage]);

    const scheduleReconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectAttemptsRef.current += 1;
        log('info', `Programando reconexión (intento ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = setTimeout(() => {
            if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                connect();
            } else {
                log('error', 'Máximo de intentos de reconexión alcanzado');
                setState(prev => ({ ...prev, error: 'No se pudo reconectar.' }));
            }
        }, reconnectInterval);
    }, [connect, reconnectInterval, maxReconnectAttempts, log]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        wsRef.current?.close(1000, 'Desconexión manual');
        wsRef.current = null;
        setState(prev => ({
            ...prev,
            isConnected: false,
            isStreaming: false,
            status: 'disconnected',
            sessionId: '',
            // ✅ LIMPIAR TODOS LOS DATOS AL DESCONECTAR
            allUniquePlates: [],
            spatialRegions: {},
            enhancementStats: null,
            detections: [],
            uniquePlates: [],
            currentFrame: null
        }));
        log('info', 'Desconectado y datos limpiados');
    }, [log]);

    const sendMessage = useCallback((message: Record<string, unknown>): boolean => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            log('warn', 'WebSocket no conectado, no se pudo enviar mensaje.');
            return false;
        }
        wsRef.current.send(JSON.stringify(message));
        return true;
    }, [log]);

    const onMessage = useCallback(<T = Record<string, unknown>>(messageType: string, handler: MessageHandler<T>) => {
        const handlers = messageHandlersRef.current.get(messageType) || [];
        handlers.push(handler as MessageHandler);
        messageHandlersRef.current.set(messageType, handlers);
        return () => {
            const currentHandlers = messageHandlersRef.current.get(messageType) || [];
            const index = currentHandlers.indexOf(handler as MessageHandler);
            if (index > -1) {
                currentHandlers.splice(index, 1);
                messageHandlersRef.current.set(messageType, currentHandlers);
            }
        };
    }, []);

    const startStreaming = useCallback(async (file: File, options?: StreamingOptions) => {
        if (!state.isConnected || !state.sessionId) {
            throw new Error('No hay conexión WebSocket activa para iniciar streaming');
        }

        // ✅ LIMPIAR DATOS ANTES DE INICIAR NUEVO STREAMING
        setState(prev => ({
            ...prev,
            status: 'uploading',
            error: null,
            allUniquePlates: [],
            spatialRegions: {},
            enhancementStats: null,
            detections: [],
            uniquePlates: [],
            currentFrame: null
        }));

        try {
            console.log('🚀 Starting enhanced streaming with ROI + 6 chars:', options);
            await streamingApi.uploadVideoForStreaming(state.sessionId, file, options);
            setState(prev => ({ ...prev, status: 'initializing' }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido al subir video';
            setState(prev => ({ ...prev, status: 'error', error: errorMessage, isStreaming: false }));
            throw error;
        }
    }, [state.isConnected, state.sessionId]);

    const pauseStreaming = useCallback(() => sendMessage({ type: 'pause_processing' }), [sendMessage]);
    const resumeStreaming = useCallback(() => sendMessage({ type: 'resume_processing' }), [sendMessage]);
    const stopStreaming = useCallback(() => sendMessage({ type: 'stop_processing' }), [sendMessage]);
    const requestStatus = useCallback(() => sendMessage({ type: 'get_status' }), [sendMessage]);

    const downloadResults = useCallback(async (format: 'json' | 'csv') => {
        if (!state.sessionId) throw new Error('No hay sesión activa para descargar resultados');
        await streamingApi.downloadResults(state.sessionId, format);
    }, [state.sessionId]);

    const clearError = useCallback(() => setState(prev => ({ ...prev, error: null })), []);

    // ✅ HELPERS DE ESTADO EXTENDIDOS
    const stateHelpers = {
        canStart: state.isConnected && !state.isStreaming,
        canControl: state.isConnected && state.isStreaming,
        hasResults: state.uniquePlates.length > 0 || (state as ExtendedStreamingState).allUniquePlates.length > 0,
        isUploading: state.status === 'uploading',
        isInitializing: state.status === 'initializing',
        isCompleted: state.status === 'completed',
        hasError: state.status === 'error' || !!state.error,
        // ✅ NUEVOS HELPERS PARA PLACAS
        hasSixCharPlates: (state as ExtendedStreamingState).allUniquePlates.some(p => p.is_six_char_valid),
        hasAutoFormattedPlates: (state as ExtendedStreamingState).allUniquePlates.some(p => (p as any).auto_formatted || (p as any).is_auto_formatted),
        totalPlatesCount: (state as ExtendedStreamingState).allUniquePlates.length,
        spatialRegionsCount: Object.keys((state as ExtendedStreamingState).spatialRegions).length
    };

    // Effects
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, []);

    // ✅ RETURN EXTENDIDO CON NUEVOS CAMPOS
    return {
        // Estados básicos
        ...state,
        connectionStatus: state.isConnected ? 'connected' : 'disconnected',

        // ✅ NUEVOS ESTADOS ESPECÍFICOS PARA PLACAS
        allUniquePlates: (state as ExtendedStreamingState).allUniquePlates,
        spatialRegions: (state as ExtendedStreamingState).spatialRegions,
        enhancementStats: (state as ExtendedStreamingState).enhancementStats,

        // Helpers de estado
        ...stateHelpers,

        // Acciones
        connect,
        disconnect,
        startStreaming,
        pauseStreaming,
        resumeStreaming,
        stopStreaming,
        requestStatus,
        downloadResults,
        sendMessage,
        onMessage,
        clearError,
    };
}