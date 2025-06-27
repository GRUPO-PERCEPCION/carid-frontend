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
    const debugRef = useRef<boolean>(true);

    // 🔍 FUNCIÓN DE DEBUG
    const debug = useCallback((message: string, data?: unknown) => {
        if (debugRef.current) {
            console.log(`🔧 [StreamingWebSocket] ${message}`, data || '');
        }
    }, []);

    // 🔌 CONECTAR WEBSOCKET
    const connect = useCallback(() => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            debug('Iniciando conexión WebSocket...', { sessionId });

            // Cerrar conexión anterior si existe
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            // Crear WebSocket usando el servicio API
            wsRef.current = apiServiceRef.current.createWebSocket(sessionId);

            wsRef.current.onopen = () => {
                debug('✅ WebSocket conectado exitosamente');
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

            wsRef.current.onmessage = (event: MessageEvent<string>) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    debug('📨 Mensaje WebSocket recibido', { type: message.type, data: message.data });
                    handleMessage(message);
                } catch (err) {
                    debug('❌ Error parseando mensaje WebSocket', err);
                }
            };

            wsRef.current.onclose = (event: CloseEvent) => {
                debug('🔌 WebSocket cerrado', { code: event.code, reason: event.reason });
                setState(prev => ({
                    ...prev,
                    isConnected: false,
                    status: prev.status === 'processing' ? prev.status : 'disconnected'
                }));

                // Auto-reconexión si no fue cierre manual
                if (event.code !== 1000 && reconnectAttemptsRef.current < finalConfig.maxReconnectAttempts) {
                    reconnectAttemptsRef.current++;
                    debug(`🔄 Reintentando conexión ${reconnectAttemptsRef.current}/${finalConfig.maxReconnectAttempts}`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, finalConfig.reconnectInterval);
                }
            };

            wsRef.current.onerror = (error: Event) => {
                debug('❌ Error WebSocket', error);
                setState(prev => ({
                    ...prev,
                    error: 'Error de conexión WebSocket',
                    status: 'error'
                }));
            };

        } catch (err) {
            debug('❌ Error creando WebSocket', err);
            setState(prev => ({
                ...prev,
                error: 'No se pudo crear la conexión WebSocket'
            }));
        }
    }, [finalConfig.maxReconnectAttempts, finalConfig.reconnectInterval, debug]);

    // 📨 MANEJAR MENSAJES WEBSOCKET
    const handleMessage = useCallback((message: WebSocketMessage) => {
        debug(`📥 Procesando mensaje: ${message.type}`);

        // Ejecutar handlers personalizados
        const handler = messageHandlersRef.current.get(message.type);
        if (handler && message.data) {
            try {
                handler(message.data);
            } catch (err) {
                debug('❌ Error en handler personalizado', err);
            }
        }

        // Manejo de mensajes por defecto
        switch (message.type) {
            case 'connection_established':
                debug('✅ Conexión WebSocket establecida', message.data);
                break;

            case 'video_uploaded':
                debug('📹 Video subido exitosamente', message.data);
                setState(prev => ({
                    ...prev,
                    status: 'initializing',
                    error: null
                }));
                break;

            case 'streaming_started':
                debug('🎬 Streaming iniciado', message.data);
                setState(prev => ({
                    ...prev,
                    isStreaming: true,
                    status: 'processing',
                    error: null
                }));
                break;

            case 'streaming_update':
                debug('📊 Actualización de streaming', message.data);
                if (message.data) {
                    handleStreamingUpdate(message.data as StreamingUpdateData);
                }
                break;

            case 'streaming_completed':
            case 'processing_completed':
                debug('✅ Streaming completado', message.data);
                setState(prev => ({
                    ...prev,
                    isStreaming: false,
                    status: 'completed'
                }));
                break;

            case 'streaming_error':
            case 'processing_error':
                debug('❌ Error de streaming', message);
                setState(prev => ({
                    ...prev,
                    error: message.error || 'Error de streaming',
                    isStreaming: false,
                    status: 'error'
                }));
                break;

            case 'processing_paused':
                debug('⏸️ Procesamiento pausado');
                setState(prev => ({
                    ...prev,
                    isPaused: true,
                    status: 'paused'
                }));
                break;

            case 'processing_resumed':
                debug('▶️ Procesamiento reanudado');
                setState(prev => ({
                    ...prev,
                    isPaused: false,
                    status: 'processing'
                }));
                break;

            case 'processing_stopped':
                debug('⏹️ Procesamiento detenido');
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
                debug('🏓 Pong recibido');
                break;

            default:
                debug(`❓ Tipo de mensaje no manejado: ${message.type}`, message);
        }
    }, [debug]);

    // 📊 ACTUALIZAR DATOS DE STREAMING
    const handleStreamingUpdate = useCallback((data: StreamingUpdateData) => {
        debug('🔄 Actualizando estado de streaming', {
            hasProgress: !!data.progress,
            hasFrame: !!data.frame_data,
            hasDetections: !!data.current_detections,
            hasUniquePlates: !!data.detection_summary?.best_plates
        });

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
                debug('📈 Progreso actualizado', newState.progress);
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
                debug('🖼️ Frame actualizado', { frameNumber: newFrame.frameNumber });
            }

            // Actualizar detecciones actuales
            if (data.current_detections) {
                newState.detections = data.current_detections;
                debug('🎯 Detecciones actualizadas', { count: data.current_detections.length });
            }

            // Actualizar placas únicas
            if (data.detection_summary?.best_plates) {
                newState.uniquePlates = data.detection_summary.best_plates;
                debug('🏆 Placas únicas actualizadas', { count: data.detection_summary.best_plates.length });
            }

            return newState;
        });
    }, [debug]);

    // 📤 ENVIAR MENSAJE WEBSOCKET
    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const messageStr = JSON.stringify(message);
            wsRef.current.send(messageStr);
            debug('📤 Mensaje enviado', message);
        } else {
            debug('⚠️ WebSocket no está conectado', { readyState: wsRef.current?.readyState });
        }
    }, [debug]);

    // 🚀 INICIAR STREAMING
    const startStreaming = useCallback(async (file: File, options: StreamingOptions = {}) => {
        if (!file || !state.isConnected) {
            const error = !file ? 'Archivo no proporcionado' : 'WebSocket no conectado';
            debug('❌ Error iniciando streaming', { error, file: !!file, connected: state.isConnected });
            throw new Error(error);
        }

        try {
            setState(prev => ({ ...prev, error: null, status: 'uploading' }));
            debug('📤 Iniciando subida de video', {
                filename: file.name,
                size: file.size,
                sessionId: state.sessionId
            });

            // Usar el servicio API para subir el video
            const result = await apiServiceRef.current.uploadVideoForStreaming(
                state.sessionId,
                file,
                options
            );

            debug('✅ Video subido exitosamente', result);

            // Enviar mensaje para iniciar procesamiento
            setTimeout(() => {
                debug('🎬 Enviando comando para iniciar procesamiento');
                sendMessage({
                    type: 'start_processing',
                    data: {
                        filename: file.name,
                        options: options
                    }
                });
            }, 1000);

        } catch (err) {
            debug('❌ Error iniciando streaming', err);
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setState(prev => ({
                ...prev,
                error: errorMessage,
                status: 'error'
            }));
            throw err;
        }
    }, [state.isConnected, state.sessionId, debug, sendMessage]);

    // ⏸️ CONTROLES DE STREAMING
    const pauseStreaming = useCallback(() => {
        debug('⏸️ Pausando streaming...');
        sendMessage({ type: 'stop_processing' });
    }, [sendMessage, debug]);

    const resumeStreaming = useCallback(() => {
        debug('▶️ Reanudando streaming...');
        sendMessage({ type: 'start_processing' });
    }, [sendMessage, debug]);

    const stopStreaming = useCallback(() => {
        debug('⏹️ Deteniendo streaming...');
        sendMessage({ type: 'stop_processing' });
    }, [sendMessage, debug]);

    const requestStatus = useCallback(() => {
        debug('📊 Solicitando estado...');
        sendMessage({ type: 'get_status' });
    }, [sendMessage, debug]);

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
        debug('🔌 Desconectando WebSocket...');

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
    }, [debug]);

    // 💾 DESCARGAR RESULTADOS
    const downloadResults = useCallback(async (format: 'json' | 'csv' = 'json') => {
        if (!state.sessionId) {
            throw new Error('No hay sesión activa');
        }

        try {
            debug(`📥 Descargando resultados en formato ${format}...`);
            await apiServiceRef.current.downloadResults(state.sessionId, format);
            debug('✅ Descarga completada');
        } catch (err) {
            debug('❌ Error descargando', err);
            throw err;
        }
    }, [state.sessionId, debug]);

    // 🧹 LIMPIAR ERROR
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // 🔄 EFECTO DE INICIALIZACIÓN
    useEffect(() => {
        debug('🔄 Inicializando hook de streaming...');
        connect();

        return () => {
            debug('🧹 Limpiando hook de streaming...');
            disconnect();
        };
    }, []); // Remover dependencias para evitar re-conexiones

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
    const canControl = state.isStreaming && (state.status === 'processing' || state.status === 'paused');
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