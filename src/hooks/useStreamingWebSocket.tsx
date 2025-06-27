// src/hooks/useStreamingWebSocket.tsx - Hook mejorado con integración de API
import { useState, useEffect, useRef, useCallback } from 'react';
import { streamingApi } from '../services/streamingApi';
import type {
    StreamingState,
    StreamingStatus,
    WebSocketMessage,
    StreamingUpdateData,
    PlateDetection,
    UniquePlate,
    StreamingFrame,
    StreamingOptions,
    MessageHandler,
    UseStreamingWebSocketConfig,
    UseStreamingWebSocketReturn
} from '../types/streaming';

const defaultConfig: Required<UseStreamingWebSocketConfig> = {
    wsBaseUrl: 'ws://localhost:8000',
    apiBaseUrl: 'http://localhost:8000',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5
};

export const useStreamingWebSocket = (
    config: UseStreamingWebSocketConfig = {}
): UseStreamingWebSocketReturn => {
    const finalConfig = { ...defaultConfig, ...config };

    // 🎯 ESTADO PRINCIPAL
    const [state, setState] = useState<StreamingState>({
        isConnected: false,
        isStreaming: false,
        isPaused: false,
        sessionId: '',
        status: 'disconnected',
        error: null,
        currentFrame: null,
        detections: [],
        uniquePlates: [],
        progress: { processed: 0, total: 0, percent: 0 },
        processingSpeed: 0
    });

    // 📱 REFERENCIAS
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef<number>(0);
    const messageHandlersRef = useRef<Map<string, MessageHandler>>(new Map());
    const apiServiceRef = useRef(streamingApi);

    // 🔌 CONECTAR WEBSOCKET
    const connect = useCallback(() => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            console.log('🔌 Iniciando conexión WebSocket...');

            // Crear WebSocket usando el servicio API
            wsRef.current = apiServiceRef.current.createWebSocket(sessionId);

            wsRef.current.onopen = () => {
                console.log('✅ WebSocket conectado exitosamente');
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    sessionId,
                    status: 'connected',
                    error: null
                }));

                reconnectAttemptsRef.current = 0;

                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            };

            wsRef.current.onmessage = (event: MessageEvent) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    handleMessage(message);
                } catch (err) {
                    console.error('❌ Error parseando mensaje WebSocket:', err);
                }
            };

            wsRef.current.onclose = (event: CloseEvent) => {
                console.log('🔌 WebSocket cerrado:', event.code, event.reason);
                setState(prev => ({
                    ...prev,
                    isConnected: false,
                    status: 'disconnected'
                }));

                // Auto-reconexión si no fue cierre manual
                if (event.code !== 1000 && reconnectAttemptsRef.current < finalConfig.maxReconnectAttempts) {
                    reconnectAttemptsRef.current++;
                    console.log(`🔄 Reintentando conexión ${reconnectAttemptsRef.current}/${finalConfig.maxReconnectAttempts}`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, finalConfig.reconnectInterval);
                }
            };

            wsRef.current.onerror = (error: Event) => {
                console.error('❌ Error WebSocket:', error);
                setState(prev => ({
                    ...prev,
                    error: 'Error de conexión WebSocket',
                    isConnected: false,
                    status: 'error'
                }));
            };

        } catch (err) {
            console.error('❌ Error creando WebSocket:', err);
            setState(prev => ({
                ...prev,
                error: 'No se pudo crear la conexión WebSocket'
            }));
        }
    }, [finalConfig.maxReconnectAttempts, finalConfig.reconnectInterval]);

    // 📨 MANEJAR MENSAJES WEBSOCKET
    const handleMessage = useCallback((message: WebSocketMessage) => {
        console.log('📨 Mensaje WebSocket recibido:', message.type);

        // Ejecutar handlers personalizados
        const handler = messageHandlersRef.current.get(message.type);
        if (handler && message.data) {
            handler(message.data);
        }

        // Manejo de mensajes por defecto
        switch (message.type) {
            case 'connection_established':
                console.log('✅ Conexión WebSocket establecida');
                break;

            case 'session_accepted':
                setState(prev => ({ ...prev, status: 'initializing' }));
                break;

            case 'video_uploaded':
                console.log('📹 Video subido exitosamente');
                if (message.data) {
                    setState(prev => ({ ...prev, status: 'initializing' }));
                }
                break;

            case 'processing_started':
            case 'streaming_started':
                setState(prev => ({
                    ...prev,
                    isStreaming: true,
                    status: 'processing'
                }));
                break;

            case 'streaming_update':
                if (message.data) {
                    handleStreamingUpdate(message.data as StreamingUpdateData);
                }
                break;

            case 'streaming_completed':
            case 'processing_completed':
                setState(prev => ({
                    ...prev,
                    isStreaming: false,
                    status: 'completed'
                }));
                break;

            case 'streaming_error':
            case 'processing_error':
                setState(prev => ({
                    ...prev,
                    error: message.error || 'Error de streaming',
                    isStreaming: false,
                    status: 'error'
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
                    status: 'stopped'
                }));
                break;

            case 'ping':
                sendMessage({ type: 'pong', timestamp: Date.now() });
                break;

            case 'pong':
                // Respuesta a nuestro ping
                break;

            default:
                console.log('📨 Tipo de mensaje no manejado:', message.type);
        }
    }, []);

    // 📊 ACTUALIZAR DATOS DE STREAMING
    const handleStreamingUpdate = useCallback((data: StreamingUpdateData) => {
        setState(prev => {
            const newState = { ...prev };

            // Actualizar progreso
            if (data.progress) {
                newState.progress = {
                    processed: data.progress.processed_frames || 0,
                    total: data.progress.total_frames || 0,
                    percent: data.progress.progress_percent || 0
                };
                newState.processingSpeed = data.progress.processing_speed || 0;
            }

            // Actualizar frame actual
            if (data.frame_data?.image_base64) {
                const newFrame: StreamingFrame = {
                    image: `data:image/jpeg;base64,${data.frame_data.image_base64}`,
                    frameNumber: data.frame_info?.frame_number || 0,
                    timestamp: data.frame_info?.timestamp || 0,
                    processingTime: data.frame_info?.processing_time || 0
                };
                newState.currentFrame = newFrame;
            }

            // Actualizar detecciones actuales
            if (data.current_detections) {
                newState.detections = data.current_detections;
            }

            // Actualizar placas únicas
            if (data.detection_summary?.best_plates) {
                newState.uniquePlates = data.detection_summary.best_plates;
            }

            return newState;
        });
    }, []);

    // 📤 ENVIAR MENSAJE WEBSOCKET
    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
            console.log('📤 Mensaje enviado:', message.type);
        } else {
            console.warn('⚠️ WebSocket no está conectado');
        }
    }, []);

    // 🚀 INICIAR STREAMING
    const startStreaming = useCallback(async (file: File, options: StreamingOptions = {}) => {
        if (!file || !state.isConnected) {
            throw new Error('Archivo o conexión no disponible');
        }

        try {
            setState(prev => ({ ...prev, error: null, status: 'uploading' }));

            console.log('📤 Subiendo video para streaming...');

            // Usar el servicio API para subir el video
            const result = await apiServiceRef.current.uploadVideoForStreaming(
                state.sessionId,
                file,
                options
            );

            console.log('✅ Video subido exitosamente:', result);

            // El backend automáticamente iniciará el streaming via WebSocket

        } catch (err) {
            console.error('❌ Error iniciando streaming:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setState(prev => ({
                ...prev,
                error: errorMessage,
                status: 'error'
            }));
            throw err;
        }
    }, [state.isConnected, state.sessionId]);

    // ⏸️ CONTROLES DE STREAMING
    const pauseStreaming = useCallback(() => {
        console.log('⏸️ Pausando streaming...');
        sendMessage({ type: 'pause_processing' });
    }, [sendMessage]);

    const resumeStreaming = useCallback(() => {
        console.log('▶️ Reanudando streaming...');
        sendMessage({ type: 'resume_processing' });
    }, [sendMessage]);

    const stopStreaming = useCallback(() => {
        console.log('⏹️ Deteniendo streaming...');
        sendMessage({ type: 'stop_processing' });
    }, [sendMessage]);

    const requestStatus = useCallback(() => {
        console.log('📊 Solicitando estado...');
        sendMessage({ type: 'get_status' });
    }, [sendMessage]);

    // 🎯 REGISTRAR HANDLER PERSONALIZADO
    const onMessage = useCallback(<T = unknown>(
        messageType: string,
        handler: MessageHandler<T>
    ) => {
        messageHandlersRef.current.set(messageType, handler as MessageHandler);

        return () => {
            messageHandlersRef.current.delete(messageType);
        };
    }, []);

    // 🔌 DESCONECTAR
    const disconnect = useCallback(() => {
        console.log('🔌 Desconectando WebSocket...');

        if (wsRef.current) {
            wsRef.current.close(1000, 'Desconexión manual');
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setState(prev => ({
            ...prev,
            isConnected: false,
            isStreaming: false,
            status: 'disconnected'
        }));
    }, []);

    // 💾 DESCARGAR RESULTADOS
    const downloadResults = useCallback(async (format: 'json' | 'csv' = 'json') => {
        if (!state.sessionId) {
            throw new Error('No hay sesión activa');
        }

        try {
            console.log(`📥 Descargando resultados en formato ${format}...`);
            await apiServiceRef.current.downloadResults(state.sessionId, format);
            console.log('✅ Descarga completada');
        } catch (err) {
            console.error('❌ Error descargando:', err);
            throw err;
        }
    }, [state.sessionId]);

    // 🧹 LIMPIAR ERROR
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // 🔄 EFECTO DE INICIALIZACIÓN
    useEffect(() => {
        console.log('🔄 Inicializando hook de streaming...');
        connect();

        return () => {
            console.log('🧹 Limpiando hook de streaming...');
            disconnect();
        };
    }, [connect, disconnect]);

    // 🔄 LIMPIAR AL DESMONTAR
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // 📊 HELPERS DE ESTADO
    const canStart = state.isConnected && !state.isStreaming;
    const canControl = state.isStreaming && state.status === 'processing';
    const hasResults = state.uniquePlates.length > 0 || state.status === 'completed';
    const isUploading = state.status === 'uploading';
    const isInitializing = state.status === 'initializing';
    const isCompleted = state.status === 'completed';
    const hasError = state.status === 'error';

    return {
        // Estado principal
        ...state,

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

        // Utilidades
        onMessage,
        clearError,

        // Estado de conexión
        connectionStatus: state.isConnected ? 'connected' : 'disconnected',

        // Helpers de estado
        canStart,
        canControl,
        hasResults,
        isUploading,
        isInitializing,
        isCompleted,
        hasError
    };
};