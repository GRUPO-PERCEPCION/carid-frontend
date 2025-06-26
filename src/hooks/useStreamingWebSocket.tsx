// src/hooks/useStreamingWebSocket.ts - Hook mejorado sin 'any'
import { useState, useEffect, useRef, useCallback } from 'react';
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
    UseStreamingWebSocketReturn,
    StreamingStartResponse
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

    // Estado principal
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

    // Referencias tipadas
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef<number>(0);
    const messageHandlersRef = useRef<Map<string, MessageHandler>>(new Map());

    // 🔌 CONECTAR WEBSOCKET
    const connect = useCallback(() => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            const wsUrl = `${finalConfig.wsBaseUrl}/api/v1/streaming/ws/${sessionId}`;
            console.log('🔌 Conectando WebSocket:', wsUrl);

            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('✅ WebSocket conectado');
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    sessionId,
                    status: 'connected',
                    error: null
                }));

                reconnectAttemptsRef.current = 0;

                // Limpiar timeout de reconexión
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
                    console.error('❌ Error parseando mensaje:', err);
                }
            };

            wsRef.current.onclose = (event: CloseEvent) => {
                console.log('🔌 WebSocket cerrado:', event.code, event.reason);
                setState(prev => ({
                    ...prev,
                    isConnected: false,
                    status: 'disconnected'
                }));

                // Reconexión automática
                if (event.code !== 1000 && reconnectAttemptsRef.current < finalConfig.maxReconnectAttempts) {
                    reconnectAttemptsRef.current++;
                    console.log(`🔄 Reintento de conexión ${reconnectAttemptsRef.current}/${finalConfig.maxReconnectAttempts}`);

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
    }, [finalConfig.wsBaseUrl, finalConfig.reconnectInterval, finalConfig.maxReconnectAttempts]);

    // 📨 MANEJAR MENSAJES
    const handleMessage = useCallback((message: WebSocketMessage) => {
        console.log('📨 Mensaje recibido:', message.type);

        // Ejecutar handlers personalizados
        const handler = messageHandlersRef.current.get(message.type);
        if (handler && message.data) {
            handler(message.data);
        }

        // Manejo por defecto
        switch (message.type) {
            case 'connection_established':
                console.log('✅ Conexión establecida');
                break;

            case 'session_accepted':
                setState(prev => ({ ...prev, status: 'initializing' }));
                break;

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
                setState(prev => ({
                    ...prev,
                    isStreaming: false,
                    status: 'completed'
                }));
                break;

            case 'streaming_error':
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

            default:
                console.log('📨 Tipo de mensaje no manejado:', message.type);
        }
    }, []);

    // 📊 ACTUALIZAR STREAMING
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

            // Actualizar detecciones
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

    // 📤 ENVIAR MENSAJE
    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
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

            const formData = new FormData();
            formData.append('session_id', state.sessionId);
            formData.append('file', file);

            // Parámetros por defecto
            const defaultOptions: Required<StreamingOptions> = {
                confidence_threshold: 0.3,
                iou_threshold: 0.4,
                frame_skip: 2,
                max_duration: 600,
                send_all_frames: false,
                adaptive_quality: true,
                enable_thumbnails: true
            };

            // Combinar opciones
            const finalOptions = { ...defaultOptions, ...options };

            // Agregar opciones al FormData
            Object.entries(finalOptions).forEach(([key, value]) => {
                formData.append(key, value.toString());
            });

            const response = await fetch(`${finalConfig.apiBaseUrl}/api/v1/streaming/start-session`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.detail?.message || errorData.message || 'Error iniciando streaming';
                throw new Error(errorMessage);
            }

            const result: StreamingStartResponse = await response.json();
            console.log('🎬 Streaming iniciado:', result);

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
    }, [state.isConnected, state.sessionId, finalConfig.apiBaseUrl]);

    // ⏸️ CONTROLES
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

    // 🎯 REGISTRAR HANDLER PERSONALIZADO
    const onMessage = useCallback(<T = unknown>(
        messageType: string,
        handler: MessageHandler<T>
    ) => {
        messageHandlersRef.current.set(messageType, handler as MessageHandler);

        // Retornar función de limpieza
        return () => {
            messageHandlersRef.current.delete(messageType);
        };
    }, []);

    // 🔌 DESCONECTAR
    const disconnect = useCallback(() => {
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
            const url = `${finalConfig.apiBaseUrl}/api/v1/streaming/sessions/${state.sessionId}/download?format=${format}&include_timeline=true`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Error descargando resultados');
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `streaming_results_${state.sessionId}_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('❌ Error descargando:', err);
            throw err;
        }
    }, [state.sessionId, finalConfig.apiBaseUrl]);

    // 🔄 EFECTO DE INICIALIZACIÓN
    useEffect(() => {
        connect();

        return () => {
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

    // 🧹 LIMPIAR ERROR
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        // Estado
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
        isUploading: state.status === 'uploading',
        isInitializing: state.status === 'initializing',
        isCompleted: state.status === 'completed',
        hasError: state.status === 'error',
        canStart: state.isConnected && !state.isStreaming,
        canControl: state.isStreaming && state.status === 'processing',
        hasResults: state.uniquePlates.length > 0 || state.status === 'completed'
    };
};