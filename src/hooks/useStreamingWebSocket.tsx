// ARCHIVO: src/hooks/useStreamingWebSocket.tsx
// ✅ VERSIÓN CON DEBUGGING EXTENSIVO PARA IDENTIFICAR EL PROBLEMA

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

export function useStreamingWebSocket(config: UseStreamingWebSocketConfig): UseStreamingWebSocketReturn {
    // Estado principal
    const [state, setState] = useState<StreamingState>({
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
        processingSpeed: 0
    });

    // Referencias
    const wsRef = useRef<WebSocket | null>(null);
    const messageHandlersRef = useRef<Map<string, MessageHandler[]>>(new Map());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);

    // ✅ NUEVO: Referencias para debugging
    const messageCountRef = useRef(0);
    const frameUpdateCountRef = useRef(0);
    const lastFrameNumberRef = useRef(0);

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

    // ✅ FUNCIÓN DE DEBUG DETALLADO
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
            allKeys: Object.keys(data || {}),
            timestamp: new Date().toISOString()
        };

        console.group(`%c🔍 STREAMING UPDATE #${messageCountRef.current}`, 'color: #8b5cf6; font-weight: bold');
        console.table(debugInfo);
        console.log('📦 Raw data:', data);
        console.groupEnd();

        return debugInfo;
    }, []);

    // ✅ FUNCIÓN CORREGIDA CON MÚLTIPLES ESTRATEGIAS
    const handleStreamingUpdate = useCallback((data: unknown) => {
        // ✅ 1. Debug completo de entrada
        const debugInfo = debugStreamingUpdate(data, 'handleStreamingUpdate');

        // ✅ 2. Validación de datos básica
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

            // ✅ 3. ESTRATEGIA 1: Actualizar frame si hay imagen
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
                    processingTime: newState.currentFrame.processingTime
                });
            }

            // ✅ 4. ESTRATEGIA 2: Si no hay imagen pero hay frame_info, mantener imagen anterior
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

            // ✅ 5. Actualizar progreso
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

            // ✅ 6. Actualizar detecciones
            if (updateData.hasOwnProperty('current_detections')) {
                newState.detections = Array.isArray(updateData.current_detections)
                    ? updateData.current_detections
                    : [];
                detectionsUpdated = true;

                console.log(`%c🎯 DETECTIONS UPDATED`, 'color: #ef4444', {
                    count: newState.detections.length,
                    frameNumber: updateData.frame_info?.frame_number || 'unknown'
                });
            }

            // ✅ 7. Actualizar placas únicas
            if (updateData.detection_summary?.best_plates) {
                newState.uniquePlates = updateData.detection_summary.best_plates;
                console.log(`%c🏆 UNIQUE PLATES UPDATED`, 'color: #8b5cf6', {
                    count: newState.uniquePlates.length
                });
            }

            // ✅ 8. Log del resultado final
            console.log(`%c📈 STATE UPDATE SUMMARY`, 'color: #059669; font-weight: bold', {
                frameUpdated,
                detectionsUpdated,
                progressUpdated,
                currentFrameNumber: newState.currentFrame?.frameNumber || 'none',
                detectionsCount: newState.detections.length,
                uniquePlatesCount: newState.uniquePlates.length
            });

            return newState;
        });
    }, [debugStreamingUpdate]);

    // ✅ MANEJAR MENSAJES WEBSOCKET CON DEBUG
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
                setState(prev => ({ ...prev, isStreaming: true, status: 'processing', error: null }));
                console.log(`%c🚀 STREAMING STARTED`, 'color: #10b981; font-weight: bold');
                break;

            case 'streaming_update':
            case 'frame_update':
            case 'detection_update':
            case 'progress_update':
                handleStreamingUpdate(data);
                break;

            case 'streaming_completed':
                setState(prev => ({ ...prev, isStreaming: false, status: 'completed' }));
                console.log(`%c✅ STREAMING COMPLETED`, 'color: #10b981; font-weight: bold');
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

    // ✅ RESTO DE FUNCIONES SIN CAMBIOS (conectar, desconectar, etc.)
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
                setState(prev => ({ ...prev, isConnected: true, sessionId, status: 'connected', error: null }));
                reconnectAttemptsRef.current = 0;

                // Reset debugging counters
                messageCountRef.current = 0;
                frameUpdateCountRef.current = 0;
                lastFrameNumberRef.current = 0;
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
        setState(prev => ({ ...prev, isConnected: false, isStreaming: false, status: 'disconnected', sessionId: '' }));
        log('info', 'Desconectado');
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
        setState(prev => ({ ...prev, status: 'uploading', error: null }));
        try {
            console.log('🚀 Starting streaming with options:', options);
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

    return {
        ...state,
        connectionStatus: state.isConnected ? 'connected' : 'disconnected',
        canStart: state.isConnected && !state.isStreaming,
        canControl: state.isConnected && state.isStreaming,
        hasResults: state.uniquePlates.length > 0,
        isUploading: state.status === 'uploading',
        isInitializing: state.status === 'initializing',
        isCompleted: state.status === 'completed',
        hasError: state.status === 'error' || !!state.error,
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