// ARCHIVO: src/types/streaming.ts
// ✅ INTERFACES ACTUALIZADAS CON PROPIEDADES DE 6 CARACTERES

export interface StreamingFrame {
    image: string;
    frameNumber: number;
    timestamp: number;
    processingTime: number;
}

// ✅ INTERFACE ACTUALIZADA: PlateDetection con propiedades de 6 chars
export interface PlateDetection {
    detection_id: string;
    frame_num: number;
    timestamp: number;
    plate_text: string;
    plate_confidence: number;
    char_confidence: number;
    overall_confidence: number;
    plate_bbox: [number, number, number, number];
    is_valid_plate: boolean;
    char_count: number;
    bbox_area: number;
    // ✅ NUEVAS PROPIEDADES PARA 6 CARACTERES
    six_char_validated?: boolean;        // Agregada
    is_six_char_format?: boolean;        // Agregada
    six_char_confidence?: number;        // Agregada
}

// ✅ INTERFACE ACTUALIZADA: UniquePlate con propiedades de 6 chars
export interface UniquePlate {
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
    frame_history: number[];
    confidence_trend: number[];
    status: string;
    // ✅ NUEVAS PROPIEDADES PARA 6 CARACTERES
    is_six_char_valid?: boolean;         // Agregada
    six_char_detection_count?: number;   // Agregada
    best_six_char_confidence?: number;   // Agregada
    six_char_validation_score?: number;  // Agregada
}

export interface StreamingProgress {
    processed: number;
    total: number;
    percent: number;
}

export interface StreamingState {
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

export type StreamingStatus =
    | 'disconnected'
    | 'connected'
    | 'initializing'
    | 'uploading'
    | 'processing'
    | 'paused'
    | 'completed'
    | 'stopped'
    | 'error';

// 🔧 INTERFACES CORREGIDAS PARA MENSAJES WEBSOCKET
export interface WebSocketMessage {
    type: string;
    data?: StreamingUpdateData | SessionData | ErrorData | Record<string, unknown>;
    error?: string;
    timestamp?: number;
}

// ✅ INTERFACE ACTUALIZADA: StreamingUpdateData con propiedades de 6 chars
export interface StreamingUpdateData {
    frame_info?: {
        frame_number: number;
        timestamp: number;
        processing_time: number;
        success: boolean;
        // ✅ NUEVAS PROPIEDADES DE 6 CHARS EN FRAME INFO
        roi_used?: boolean;
        six_char_filter_applied?: boolean;
        six_char_detections_in_frame?: number;
    };
    progress?: {
        processed_frames: number;
        total_frames: number;
        progress_percent: number;
        processing_speed: number;
    };
    current_detections?: PlateDetection[];
    detection_summary?: {
        total_detections: number;
        unique_plates_count: number;
        valid_plates_count: number;
        frames_with_detections: number;
        best_plates: UniquePlate[];
        latest_detections: PlateDetection[];
        // ✅ NUEVAS PROPIEDADES DE 6 CHARS EN DETECTION SUMMARY
        six_char_plates_count?: number;
        best_six_char_plates?: UniquePlate[];
        detection_density?: number;
        six_char_detection_rate?: number;
        session_id?: string;
    };
    frame_data?: {
        image_base64: string;
        thumbnail_base64?: string;
        original_size: [number, number];
        compressed_size: number;
        quality_used: number;
    };
    timing?: {
        elapsed_time: number;
        estimated_remaining: number;
    };
    quality_info?: {
        current_quality: number;
        recommended_frame_skip: number;
        adaptive_enabled: boolean;
    };
    // ✅ NUEVA SECCIÓN: Enhancement stats para ROI y 6 chars
    enhancement_stats?: {
        roi_processing?: boolean;
        six_char_filter_active?: boolean;
        total_six_char_detections?: number;
        six_char_plates_found?: number;
        six_char_detection_rate?: number;
    };
}

export interface SessionData {
    session_id: string;
    file_info: FileInfo;
    processing_params: ProcessingParams;
    streaming_config: StreamingConfig;
    estimated_duration?: EstimatedDuration;
}

export interface ErrorData {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface FileInfo {
    filename: string;
    original_filename: string;
    content_type: string;
    size_bytes: number;
    size_mb: number;
    dimensions?: {
        width: number;
        height: number;
    };
    file_type: 'image' | 'video';
}

export interface ProcessingParams {
    confidence_threshold: number;
    iou_threshold: number;
    frame_skip: number;
    max_duration: number;
    send_all_frames: boolean;
    adaptive_quality: boolean;
    enable_thumbnails: boolean;
}

export interface StreamingConfig {
    wsBaseUrl?: string;
    apiBaseUrl?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export interface EstimatedDuration {
    estimated_seconds: number;
    estimated_minutes: number;
    frames_to_process: number;
    factors: {
        resolution: number;
        device: number;
        frame_skip: number;
    };
}

export interface StreamingOptions {
    confidence_threshold?: number;
    iou_threshold?: number;
    frame_skip?: number;
    max_duration?: number;
    send_all_frames?: boolean;
    adaptive_quality?: boolean;
    enable_thumbnails?: boolean;
}

// 🔧 TIPO CORREGIDO PARA MESSAGE HANDLER
export type MessageHandler<T = Record<string, unknown>> = (data: T) => void;

// Tipos para respuestas del servidor
export interface StreamingStartResponse {
    success: boolean;
    message: string;
    data: {
        session_id: string;
        file_info: FileInfo;
        processing_params: ProcessingParams;
        websocket_status: string;
        streaming_status: string;
    };
    timestamp: number;
}

export interface DownloadResponse {
    url: string;
    filename: string;
    size: number;
}

// Configuración del hook
export interface UseStreamingWebSocketConfig {
    wsBaseUrl?: string;
    apiBaseUrl?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

// Helpers de estado para el hook
export interface StreamingStateHelpers {
    canStart: boolean;
    canControl: boolean;
    hasResults: boolean;
    isUploading: boolean;
    isInitializing: boolean;
    isCompleted: boolean;
    hasError: boolean;
}

// Acciones del hook
export interface StreamingActions {
    connect: () => void;
    disconnect: () => void;
    startStreaming: (file: File, options?: StreamingOptions) => Promise<void>;
    pauseStreaming: () => void;
    resumeStreaming: () => void;
    stopStreaming: () => void;
    requestStatus: () => void;
    downloadResults: (format: 'json' | 'csv') => Promise<void>;
    sendMessage: (message: Record<string, unknown>) => void;
    onMessage: <T = Record<string, unknown>>(messageType: string, handler: MessageHandler<T>) => () => void;
    clearError: () => void;
}

// Tipo principal del hook
export interface UseStreamingWebSocketReturn extends StreamingState, StreamingStateHelpers, StreamingActions {
    connectionStatus: 'connected' | 'disconnected';
}

// 🔧 TIPOS ADICIONALES PARA RESOLVER ERRORES ESPECÍFICOS
export interface UploadProgressData {
    progress: number;
}

export interface SystemMessageData {
    type: 'info' | 'warning' | 'error';
    title?: string;
    message: string;
}

// 🔧 HELPER TYPES PARA CASTING SEGURO
export interface GenericWebSocketData {
    frame_info?: {
        frame_number?: number;
        timestamp?: number;
        processing_time?: number;
        success?: boolean;
    };
    current_detections?: unknown[];
    progress?: {
        progress_percent?: number;
        processed_frames?: number;
        total_frames?: number;
        processing_speed?: number;
    };
    detection_summary?: {
        best_plates?: unknown[];
    };
}

// 🔧 TYPE GUARDS PARA VALIDACIÓN SEGURA - EXPORTAR COMO FUNCIONES
export function isStreamingUpdateData(data: unknown): data is StreamingUpdateData {
    return typeof data === 'object' && data !== null;
}

export function isUploadProgressData(data: unknown): data is UploadProgressData {
    return typeof data === 'object' && data !== null && 'progress' in data && typeof (data as UploadProgressData).progress === 'number';
}

export function isSystemMessageData(data: unknown): data is SystemMessageData {
    return typeof data === 'object' && data !== null && 'message' in data && typeof (data as SystemMessageData).message === 'string';
}