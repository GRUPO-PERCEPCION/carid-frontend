// src/hooks/useStreamingWebSocket.ts - VERSIÓN CORREGIDA
import { useState, useRef, useCallback, useEffect } from 'react';
import { streamingApi } from '../services/streamingApi';
import type {
    StreamingState,
    StreamingFrame,
    PlateDetection,
    UniquePlate,
    StreamingProgress,
    StreamingStatus,
    StreamingOptions,
    UseStreamingWebSocketConfig,
    UseStreamingWebSocketReturn,
    MessageHandler
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

    // Configuración
    const wsBaseUrl = config.wsBaseUrl || 'ws://localhost:8000';
    const apiBaseUrl = config.apiBaseUrl || 'http://localhost:8000';
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
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    sessionId,
                    status: 'connected',
                    error: null
                }));
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (error) {
                    log('error', 'Error parseando mensaje WebSocket', error);
                }
            };

            ws.onclose = (event) => {
                log('warn', `WebSocket cerrado: ${event.code} - ${event.reason}`);
                setState(prev => ({
                    ...prev,
                    isConnected: false,
                    status: 'disconnected'
                }));

                // Intentar reconectar si no fue intencional
                if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    scheduleReconnect();
                }
            };

            ws.onerror = (error) => {
                log('error', 'Error en WebSocket', error);
                setState(prev => ({
                    ...prev,
                    error: 'Error de conexión WebSocket',
                    status: 'error'
                }));
            };

        } catch (error) {
            log('error', 'Error creando WebSocket', error);
            setState(prev => ({
                ...prev,
                error: 'No se pudo crear la conexión WebSocket',
                status: 'error'
            }));
        }
    }, [wsBaseUrl, generateSessionId, maxReconnectAttempts, log]);

    // Programar reconexión
    const scheduleReconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectAttemptsRef.current += 1;
        log('info', `Programando reconexión (intento ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = setTimeout(() => {
            if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                connect();
            } else {
                log('error', 'Máximo de intentos de reconexión alcanzado');
                setState(prev => ({
                    ...prev,
                    error: 'No se pudo reconectar después de múltiples intentos'
                }));
            }
        }, reconnectInterval);
    }, [connect, reconnectInterval, maxReconnectAttempts, log]);

    // Desconectar
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, 'Desconexión manual');
            wsRef.current = null;
        }

        setState(prev => ({
            ...prev,
            isConnected: false,
            isStreaming: false,
            status: 'disconnected',
            sessionId: '',
            error: null,
            currentFrame: null,
            detections: [],
            progress: { processed: 0, total: 0, percent: 0 }
        }));

        log('info', 'Desconectado exitosamente');
    }, [log]);

    // Manejar mensajes WebSocket
    const handleWebSocketMessage = useCallback((message: Record<string, unknown>) => {
        const messageType = String(message.type || 'unknown');
        const data = message.data as Record<string, unknown> | undefined;

        log('info', `Mensaje recibido: ${messageType}`, data);

        // Ejecutar handlers registrados
        const handlers = messageHandlersRef.current.get(messageType) || [];
        handlers.forEach(handler => {
            try {
                handler(data || {});
            } catch (error) {
                log('error', `Error en handler para ${messageType}`, error);
            }
        });

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
                    error: null
                }));
                break;

            case 'streaming_update':
                handleStreamingUpdate(data || {});
                break;

            case 'streaming_completed':
                setState(prev => ({
                    ...prev,
                    isStreaming: false,
                    status: 'completed'
                }));
                break;

            case 'streaming_error':
                setState(prev => ({
                    ...prev,
                    isStreaming: false,
                    status: 'error',
                    error: String(message.error || 'Error de streaming')
                }));
                break;

            case 'processing_paused':
                setState(prev => ({
                    ...prev,
                    isPaused: true,
                    status: 'paused'
                }));
                break;

            case 'processing_resumed':
                setState(prev => ({
                    ...prev,
                    isPaused: false,
                    status: 'processing'
                }));
                break;

            case 'processing_stopped':
                setState(prev => ({
                    ...prev,
                    isStreaming: false,
                    isPaused: false,
                    status: 'stopped'
                }));
                break;
        }
    }, [log]);

    // Manejar actualizaciones de streaming
    const handleStreamingUpdate = useCallback((data: Record<string, unknown>) => {
        try {
            // Actualizar progreso
            if (data.progress && typeof data.progress === 'object') {
                const progressData = data.progress as Record<string, unknown>;
                const progress: StreamingProgress = {
                    processed: Number(progressData.processed_frames || 0),
                    total: Number(progressData.total_frames || 0),
                    percent: Number(progressData.progress_percent || 0)
                };

                setState(prev => ({
                    ...prev,
                    progress,
                    processingSpeed: Number(progressData.processing_speed || 0)
                }));
            }

            // Actualizar frame actual
            if (data.frame_data && typeof data.frame_data === 'object') {
                const frameData = data.frame_data as Record<string, unknown>;
                const frameInfo = data.frame_info as Record<string, unknown> | undefined;

                if (frameData.image_base64 && typeof frameData.image_base64 === 'string') {
                    const currentFrame: StreamingFrame = {
                        image: `data:image/jpeg;base64,${frameData.image_base64}`,
                        frameNumber: Number(frameInfo?.frame_number || 0),
                        timestamp: Number(frameInfo?.timestamp || 0),
                        processingTime: Number(frameInfo?.processing_time || 0)
                    };

                    setState(prev => ({ ...prev, currentFrame }));
                }
            }

            // Actualizar detecciones actuales
            if (Array.isArray(data.current_detections)) {
                const detections = data.current_detections as PlateDetection[];
                setState(prev => ({ ...prev, detections }));
            }

            // Actualizar placas únicas
            if (data.detection_summary && typeof data.detection_summary === 'object') {
                const summary = data.detection_summary as Record<string, unknown>;
                if (Array.isArray(summary.best_plates)) {
                    const uniquePlates = summary.best_plates as UniquePlate[];
                    setState(prev => ({ ...prev, uniquePlates }));
                }
            }

        } catch (error) {
            log('error', 'Error procesando actualización de streaming', error);
        }
    }, [log]);

    // Enviar mensaje
    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            log('warn', 'WebSocket no está conectado');
            return false;
        }

        try {
            wsRef.current.send(JSON.stringify(message));
            log('info', 'Mensaje enviado', message);
            return true;
        } catch (error) {
            log('error', 'Error enviando mensaje', error);
            return false;
        }
    }, [log]);

    // Registrar handler de mensaje
    const onMessage = useCallback(<T = Record<string, unknown>>(
        messageType: string,
        handler: MessageHandler<T>
    ) => {
        const handlers = messageHandlersRef.current.get(messageType) || [];
        handlers.push(handler as MessageHandler);
        messageHandlersRef.current.set(messageType, handlers);

        // Retornar función de limpieza
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
            throw new Error('No hay conexión WebSocket activa');
        }

        try {
            setState(prev => ({ ...prev, status: 'uploading', error: null }));

            // Subir archivo
            await streamingApi.uploadVideoForStreaming(state.sessionId, file, options);

            setState(prev => ({ ...prev, status: 'initializing' }));

            // El procesamiento se iniciará automáticamente desde el backend
            log('info', 'Streaming iniciado exitosamente');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setState(prev => ({
                ...prev,
                status: 'error',
                error: errorMessage,
                isStreaming: false
            }));
            throw error;
        }
    }, [state.isConnected, state.sessionId, log]);

    // Controles de streaming
    const pauseStreaming = useCallback(() => {
        sendMessage({ type: 'pause_processing' });
    }, [sendMessage]);

    const resumeStreaming = useCallback(() => {
        sendMessage({ type: 'resume_processing' });
    }, [sendMessage]);

    const stopStreaming = useCallback(() => {
        sendMessage({ type: 'stop_processing' });
    }, [sendMessage]);

    const requestStatus = useCallback(() => {
        sendMessage({ type: 'get_status' });
    }, [sendMessage]);

    // Descargar resultados
    const downloadResults = useCallback(async (format: 'json' | 'csv') => {
        if (!state.sessionId) {
            throw new Error('No hay sesión activa');
        }

        try {
            await streamingApi.downloadResults(state.sessionId, format);
        } catch (error) {
            log('error', 'Error descargando resultados', error);
            throw error;
        }
    }, [state.sessionId, log]);

    // Limpiar error
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Helpers de estado
    const canStart = state.isConnected && !state.isStreaming;
    const canControl = state.isConnected && state.isStreaming;
    const hasResults = state.uniquePlates.length > 0;
    const isUploading = state.status === 'uploading';
    const isInitializing = state.status === 'initializing';
    const isCompleted = state.status === 'completed';
    const hasError = state.status === 'error' || !!state.error;

    // Conectar automáticamente al montar
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // Limpiar timeouts al desmontar
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    return {
        // Estado
        ...state,
        connectionStatus: state.isConnected ? 'connected' : 'disconnected',

        // Helpers
        canStart,
        canControl,
        hasResults,
        isUploading,
        isInitializing,
        isCompleted,
        hasError,

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
        clearError
    };
}