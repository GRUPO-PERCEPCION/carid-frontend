// RUTA: src/hooks/useStreamingWebSocket.tsx

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
    isStreamingUpdateData, // Importante: Se usa el type guard
} from '../types/streaming'; // Se usan los tipos desde el archivo de definiciones

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

    // Configuración
    const wsBaseUrl = config.wsBaseUrl || 'ws://localhost:8000';
    const reconnectInterval = config.reconnectInterval || 3000;
    const maxReconnectAttempts = config.maxReconnectAttempts || 5;

    // Logging helper
    const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: unknown) => {
        console[level](`[WebSocket] ${message}`, data || '');
    }, []);

    // Generar session ID único
    const generateSessionId = useCallback(() => {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // ✅ FUNCIÓN CORREGIDA: Manejar actualizaciones de streaming
    const handleStreamingUpdate = useCallback((data: unknown) => {
        // ✅ Agregar logging detallado para debugging
        console.log('🔄 Streaming update received:', {
            hasImage: !!(data as any)?.frame_data?.image_base64,
            hasFrameInfo: !!(data as any)?.frame_info,
            hasDetections: !!(data as any)?.current_detections,
            detectionsCount: Array.isArray((data as any)?.current_detections) ? (data as any).current_detections.length : 0,
            frameNumber: (data as any)?.frame_info?.frame_number || 'N/A',
            timestamp: new Date().toISOString()
        });

        // ✅ Aplicar el type guard para validar la estructura
        if (!isStreamingUpdateData(data)) {
            log('warn', 'Formato de datos de streaming inesperado', data);
            return;
        }

        // A partir de aquí, TypeScript sabe que 'data' tiene el tipo 'StreamingUpdateData'
        setState(prev => {
            const newState = { ...prev };

            // 1. ✅ SIEMPRE actualizar progreso si está disponible
            if (data.progress) {
                newState.progress = {
                    processed: Number(data.progress.processed_frames || prev.progress.processed),
                    total: Number(data.progress.total_frames || prev.progress.total),
                    percent: Number(data.progress.progress_percent || prev.progress.percent)
                };
                newState.processingSpeed = Number(data.progress.processing_speed || prev.processingSpeed);

                console.log('📊 Progress updated:', {
                    processed: newState.progress.processed,
                    total: newState.progress.total,
                    percent: newState.progress.percent,
                    speed: newState.processingSpeed
                });
            }

            // 2. ✅ CORRECCIÓN PRINCIPAL: Actualizar frame de forma más flexible
            if (data.frame_data?.image_base64) {
                const frameNumber = data.frame_info?.frame_number ||
                    (prev.currentFrame?.frameNumber || 0) + 1;

                newState.currentFrame = {
                    image: `data:image/jpeg;base64,${data.frame_data.image_base64}`,
                    frameNumber: frameNumber,
                    timestamp: data.frame_info?.timestamp || Date.now(),
                    processingTime: data.frame_info?.processing_time || 0
                };

                console.log('🖼️ Frame updated:', {
                    frameNumber: frameNumber,
                    hasImage: true,
                    processingTime: newState.currentFrame.processingTime
                });
            }
            // ✅ NUEVA LÓGICA: Si solo hay frame_info sin image_base64, mantener imagen anterior pero actualizar metadatos
            else if (data.frame_info && prev.currentFrame) {
                newState.currentFrame = {
                    ...prev.currentFrame, // Mantener la imagen anterior
                    frameNumber: Number(data.frame_info.frame_number || prev.currentFrame.frameNumber),
                    timestamp: Number(data.frame_info.timestamp || prev.currentFrame.timestamp),
                    processingTime: Number(data.frame_info.processing_time || prev.currentFrame.processingTime)
                };

                console.log('📋 Frame metadata updated:', {
                    frameNumber: newState.currentFrame.frameNumber,
                    hasImage: false,
                    keptPreviousImage: true
                });
            }

            // 3. ✅ Actualizar detecciones (pueden estar vacías)
            if (data.hasOwnProperty('current_detections')) {
                newState.detections = Array.isArray(data.current_detections)
                    ? data.current_detections
                    : [];

                console.log('🎯 Detections updated:', {
                    count: newState.detections.length,
                    frameNumber: data.frame_info?.frame_number || 'N/A'
                });
            }
            // ✅ NUEVA LÓGICA: Limpiar detecciones si el frame no tiene detecciones pero hay frame_info
            else if (data.frame_info && !data.current_detections) {
                newState.detections = []; // Limpiar detecciones para frames sin placas
                console.log('🧹 Detections cleared for frame:', data.frame_info.frame_number);
            }

            // 4. ✅ Actualizar placas únicas solo cuando hay datos
            if (data.detection_summary?.best_plates) {
                newState.uniquePlates = data.detection_summary.best_plates;
                console.log('🏆 Unique plates updated:', {
                    count: newState.uniquePlates.length
                });
            }

            return newState;
        });
    }, [log]);

    // Manejar mensajes WebSocket
    const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
        const messageType = message.type || 'unknown';
        const data = message.data || {};

        log('info', `Mensaje recibido: ${messageType}`, data);

        // ✅ Manejar handlers personalizados primero
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
                break;
            case 'streaming_update':
                handleStreamingUpdate(data);
                break;
            case 'frame_update':
                // ✅ NUEVO: Manejar updates solo de frame
                handleStreamingUpdate(data);
                break;
            case 'detection_update':
                // ✅ NUEVO: Manejar updates solo de detecciones
                handleStreamingUpdate(data);
                break;
            case 'progress_update':
                // ✅ NUEVO: Manejar updates solo de progreso
                handleStreamingUpdate(data);
                break;
            case 'streaming_completed':
                setState(prev => ({ ...prev, isStreaming: false, status: 'completed' }));
                break;
            case 'streaming_error':
                setState(prev => ({ ...prev, isStreaming: false, status: 'error', error: message.error || 'Error de streaming' }));
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
        }
    }, [log, handleStreamingUpdate]);

    // Conectar WebSocket
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

    // Programar reconexión
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

    // Desconectar
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        wsRef.current?.close(1000, 'Desconexión manual');
        wsRef.current = null;
        setState(prev => ({ ...prev, isConnected: false, isStreaming: false, status: 'disconnected', sessionId: '' }));
        log('info', 'Desconectado');
    }, [log]);

    // Enviar mensaje
    const sendMessage = useCallback((message: Record<string, unknown>): boolean => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            log('warn', 'WebSocket no conectado, no se pudo enviar mensaje.');
            return false;
        }
        wsRef.current.send(JSON.stringify(message));
        return true;
    }, [log]);

    // Registrar handler de mensaje
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

    // Iniciar streaming
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

    // ✅ LOGGING de estado para debugging
    useEffect(() => {
        console.log('🔄 WebSocket State Changed:', {
            isConnected: state.isConnected,
            isStreaming: state.isStreaming,
            status: state.status,
            sessionId: state.sessionId,
            frameNumber: state.currentFrame?.frameNumber || 'N/A',
            detectionsCount: state.detections.length,
            uniquePlatesCount: state.uniquePlates.length,
            progressPercent: state.progress.percent
        });
    }, [state.isConnected, state.isStreaming, state.status, state.currentFrame?.frameNumber, state.detections.length, state.uniquePlates.length, state.progress.percent]);

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