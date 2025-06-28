import { useState, useRef, useCallback, useEffect } from 'react';
import { streamingApi } from '../services/streamingApi';

// ✅ INTERFACES ESPECÍFICAS PARA EVITAR 'any'
interface StreamingFrame {
    image: string;
    frameNumber: number;
    timestamp: number;
    processingTime: number;
}

interface PlateDetection {
    detection_id: string;
    frame_num: number;
    timestamp: number;
    plate_text: string;
    plate_confidence: number;
    char_confidence: number;
    overall_confidence: number;
    plate_bbox: [number, number, number, number];
    is_valid_plate: boolean;
    six_char_validated?: boolean; // ✅ NUEVO
    validation_info?: Record<string, unknown>; // ✅ NUEVO
    char_count: number;
    bbox_area: number;
    processing_method?: string;
}

interface UniquePlate {
    plate_text: string;
    first_seen_frame: number;
    first_seen_timestamp: number;
    last_seen_frame: number;
    last_seen_timestamp: number;
    detection_count: number;
    best_confidence: number;
    best_frame: number;
    best_timestamp: number;
    avg_confidence: number;
    total_confidence: number;
    is_valid_format: boolean;
    is_six_char_valid?: boolean; // ✅ NUEVO
    six_char_detection_count?: number; // ✅ NUEVO
    frame_history: number[];
    confidence_trend: number[];
    status: string;
}

interface StreamingProgress {
    processed: number;
    total: number;
    percent: number;
}

interface StreamingState {
    isConnected: boolean;
    isStreaming: boolean;
    isPaused: boolean;
    sessionId: string;
    status: StreamingStatus;
    error: string | null;
    currentFrame: StreamingFrame | null;
    detections: PlateDetection[];
    uniquePlates: UniquePlate[];
    progress: StreamingProgress;
    processingSpeed: number;
}

type StreamingStatus =
    | 'disconnected'
    | 'connected'
    | 'initializing'
    | 'uploading'
    | 'processing'
    | 'paused'
    | 'completed'
    | 'stopped'
    | 'error';

interface StreamingOptions {
    confidence_threshold?: number;
    iou_threshold?: number;
    frame_skip?: number;
    max_duration?: number;
    send_all_frames?: boolean;
    adaptive_quality?: boolean;
    enable_thumbnails?: boolean;
}

interface UseStreamingWebSocketConfig {
    wsBaseUrl?: string;
    apiBaseUrl?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

// ✅ TIPOS PARA MENSAJES WEBSOCKET ESPECÍFICOS
interface WebSocketMessageData {
    type?: string;
    data?: Record<string, unknown>;
    error?: string;
    timestamp?: number;
    session_id?: string;
    message?: string;
    server_info?: Record<string, unknown>;
}

interface StreamingUpdateData {
    frame_info?: {
        frame_number?: number;
        timestamp?: number;
        processing_time?: number;
        success?: boolean;
        roi_used?: boolean; // ✅ NUEVO
        six_char_filter_applied?: boolean; // ✅ NUEVO
        six_char_detections_in_frame?: number; // ✅ NUEVO
    };
    progress?: {
        processed_frames?: number;
        total_frames?: number;
        progress_percent?: number;
        processing_speed?: number;
    };
    current_detections?: PlateDetection[];
    detection_summary?: {
        total_detections?: number;
        unique_plates_count?: number;
        valid_plates_count?: number;
        six_char_plates_count?: number; // ✅ NUEVO
        frames_with_detections?: number;
        best_plates?: UniquePlate[];
        best_six_char_plates?: UniquePlate[]; // ✅ NUEVO
        latest_detections?: PlateDetection[];
        detection_density?: number;
        six_char_detection_rate?: number; // ✅ NUEVO
        session_id?: string;
    };
    timing?: {
        elapsed_time?: number;
        estimated_remaining?: number;
    };
    enhancement_stats?: { // ✅ NUEVO
        roi_processing?: boolean;
        six_char_filter_active?: boolean;
        total_six_char_detections?: number;
        six_char_plates_found?: number;
        six_char_detection_rate?: number;
    };
    frame_data?: {
        image_base64?: string;
        thumbnail_base64?: string;
        original_size?: [number, number];
        compressed_size?: number;
        quality_used?: number;
    };
    quality_info?: {
        current_quality?: number;
        recommended_frame_skip?: number;
        adaptive_enabled?: boolean;
    };
}

type MessageHandler<T = Record<string, unknown>> = (data: T) => void;

interface UseStreamingWebSocketReturn extends StreamingState {
    // Helpers de estado
    canStart: boolean;
    canControl: boolean;
    hasResults: boolean;
    isUploading: boolean;
    isInitializing: boolean;
    isCompleted: boolean;
    hasError: boolean;
    connectionStatus: 'connected' | 'disconnected';

    // Acciones
    connect: () => void;
    disconnect: () => void;
    startStreaming: (file: File, options?: StreamingOptions) => Promise<void>;
    pauseStreaming: () => void;
    resumeStreaming: () => void;
    stopStreaming: () => void;
    requestStatus: () => void;
    downloadResults: (format: 'json' | 'csv') => Promise<void>;
    sendMessage: (message: Record<string, unknown>) => boolean;
    onMessage: <T = Record<string, unknown>>(messageType: string, handler: MessageHandler<T>) => () => void;
    clearError: () => void;
}

// ✅ TYPE GUARDS PARA VALIDACIÓN SEGURA
function isWebSocketMessageData(data: unknown): data is WebSocketMessageData {
    return typeof data === 'object' && data !== null;
}

function isStreamingUpdateData(data: unknown): data is StreamingUpdateData {
    return typeof data === 'object' && data !== null;
}

function isUploadProgressData(data: unknown): data is { progress: number } {
    return typeof data === 'object' &&
        data !== null &&
        'progress' in data &&
        typeof (data as { progress: number }).progress === 'number';
}

function isSystemMessageData(data: unknown): data is { type: string; title?: string; message: string } {
    return typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as { message: string }).message === 'string';
}

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
                    const message = JSON.parse(event.data) as WebSocketMessageData;
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
    const handleWebSocketMessage = useCallback((message: WebSocketMessageData) => {
        const messageType = message.type || 'unknown';
        const data = message.data || {};

        log('info', `Mensaje recibido: ${messageType}`, data);

        // Ejecutar handlers registrados
        const handlers = messageHandlersRef.current.get(messageType) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
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
                handleStreamingUpdate(data);
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
                    error: message.error || 'Error de streaming'
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

    // ✅ MANEJAR ACTUALIZACIONES DE STREAMING CON MEJORAS
    const handleStreamingUpdate = useCallback((data: Record<string, unknown>) => {
        try {
            if (!isStreamingUpdateData(data)) return;

            // Actualizar progreso
            if (data.progress) {
                const progressData = data.progress;
                const progress = {
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
            if (data.frame_data && data.frame_info) {
                const frameData = data.frame_data;
                const frameInfo = data.frame_info;

                if (frameData.image_base64 && typeof frameData.image_base64 === 'string') {
                    const currentFrame: StreamingFrame = {
                        image: `data:image/jpeg;base64,${frameData.image_base64}`,
                        frameNumber: Number(frameInfo.frame_number || 0),
                        timestamp: Number(frameInfo.timestamp || 0),
                        processingTime: Number(frameInfo.processing_time || 0)
                    };

                    setState(prev => ({ ...prev, currentFrame }));
                }
            }

            // ✅ ACTUALIZAR DETECCIONES CON CAMPOS DE 6 CARACTERES
            if (Array.isArray(data.current_detections)) {
                const detections = data.current_detections as PlateDetection[];
                setState(prev => ({ ...prev, detections }));
            }

            // ✅ ACTUALIZAR PLACAS ÚNICAS CON CAMPOS DE 6 CARACTERES
            if (data.detection_summary && typeof data.detection_summary === 'object') {
                const summary = data.detection_summary;
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
    const sendMessage = useCallback((message: Record<string, unknown>): boolean => {
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

// ✅ EXPORTAR TYPE GUARDS PARA USO EN COMPONENTES
export {
    isWebSocketMessageData,
    isStreamingUpdateData,
    isUploadProgressData,
    isSystemMessageData
};

// ✅ EXPORTAR TIPOS PARA USO EN COMPONENTES
export type {
    StreamingFrame,
    PlateDetection,
    UniquePlate,
    StreamingProgress,
    StreamingState,
    StreamingStatus,
    StreamingOptions,
    UseStreamingWebSocketConfig,
    UseStreamingWebSocketReturn,
    MessageHandler
};