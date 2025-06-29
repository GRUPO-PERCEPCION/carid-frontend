// src/types/streaming.ts
// ✅ INTERFACES COMPLETAMENTE ACTUALIZADAS CON SOPORTE COMPLETO PARA PLACAS DE 6 CARACTERES

export interface StreamingFrame {
    image: string;
    frameNumber: number;
    timestamp: number;
    processingTime: number;
}

// ✅ INTERFACE CORREGIDA: PlateDetection con todas las propiedades de 6 chars
export interface PlateDetection {
    detection_id: string;
    frame_num: number;
    timestamp: number;
    plate_text: string;
    raw_plate_text?: string;
    plate_confidence: number;
    char_confidence: number;
    overall_confidence: number;
    plate_bbox: [number, number, number, number];
    is_valid_plate: boolean;
    char_count: number;
    bbox_area: number;
    // ✅ PROPIEDADES COMPLETAS PARA 6 CARACTERES Y AUTO-FORMATEO
    six_char_validated?: boolean;
    is_six_char_format?: boolean;
    six_char_confidence?: number;
    auto_formatted?: boolean;
    is_auto_formatted?: boolean;
    validation_info?: Record<string, any>;
    processing_method?: string;
}

// ✅ INTERFACE CORREGIDA: UniquePlate con todas las propiedades de 6 chars
export interface UniquePlate {
    plate_text: string;
    raw_plate_text?: string;
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
    status?: string;
    // ✅ PROPIEDADES COMPLETAS PARA 6 CARACTERES Y AUTO-FORMATEO
    is_six_char_valid?: boolean;
    six_char_detection_count?: number;
    best_six_char_confidence?: number;
    six_char_validation_score?: number;
    auto_formatted?: boolean;
    is_auto_formatted?: boolean;
    // ✅ PROPIEDADES ADICIONALES PARA TRACKING ESPACIAL
    spatial_key?: string;
    spatial_region?: string;
    avg_bbox?: [number, number, number, number];
    region_rank?: number;
    char_count?: number;
    stability_score?: number;
    duration_frames?: number;
    processing_method?: string;
}

export interface StreamingProgress {
    processed: number;
    total: number;
    percent: number;
}

// ✅ INTERFACE EXTENDIDA: StreamingState con información completa de placas
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
    // ✅ NUEVOS CAMPOS PARA MANEJO COMPLETO DE PLACAS
    allUniquePlates?: UniquePlate[];
    spatialRegions?: Record<string, number>;
    enhancementStats?: EnhancementStats | null;
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

// ✅ NUEVA INTERFACE: Estadísticas de mejoras completas
export interface EnhancementStats {
    roi_processing: boolean;
    six_char_filter_active: boolean;
    auto_dash_formatting: boolean;
    total_six_char_detections: number;
    total_auto_formatted_detections: number;
    six_char_plates_found: number;
    auto_formatted_plates_found: number;
    six_char_detection_rate: number;
    auto_formatted_rate: number;
}

// ✅ NUEVA INTERFACE: Resumen completo de todas las placas
export interface AllPlatesSummary {
    complete_list: UniquePlate[];
    count_by_confidence: {
        high: number;
        medium: number;
        low: number;
    };
    spatial_coverage: {
        regions_active: number;
        distribution: Record<string, number>;
    };
    detection_metrics: {
        total_unique_plates: number;
        plates_per_region: number;
        avg_confidence: number;
    };
}

// ✅ NUEVA INTERFACE: Análisis espacial
export interface SpatialAnalysis {
    regions_found: Record<string, number>;
    region_count: number;
    plates_by_region: Record<string, UniquePlate[]>;
}

// 🔧 INTERFACES PARA MENSAJES WEBSOCKET ACTUALIZADAS
export interface WebSocketMessage {
    type: string;
    data?: StreamingUpdateData | SessionData | ErrorData | Record<string, unknown>;
    error?: string;
    timestamp?: number;
}

// ✅ INTERFACE COMPLETAMENTE ACTUALIZADA: StreamingUpdateData
export interface StreamingUpdateData {
    frame_info?: {
        frame_number: number;
        timestamp: number;
        processing_time: number;
        success: boolean;
        // ✅ INFORMACIÓN COMPLETA DE MEJORAS POR FRAME
        roi_used?: boolean;
        six_char_filter_applied?: boolean;
        six_char_detections_in_frame?: number;
        auto_formatted_detections_in_frame?: number;
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
        // ✅ ESTADÍSTICAS COMPLETAS DE 6 CHARS Y AUTO-FORMATEO
        six_char_plates_count?: number;
        auto_formatted_plates_count?: number;
        best_six_char_plates?: UniquePlate[];
        best_auto_formatted_plates?: UniquePlate[];
        detection_density?: number;
        six_char_detection_rate?: number;
        auto_formatted_rate?: number;
        session_id?: string;
        // ✅ INFORMACIÓN ESPACIAL
        spatial_regions_count?: number;
        spatial_distribution?: Record<string, number>;
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
    // ✅ ESTADÍSTICAS COMPLETAS DE MEJORAS
    enhancement_stats?: {
        roi_processing?: boolean;
        six_char_filter_active?: boolean;
        auto_dash_formatting?: boolean;
        total_six_char_detections?: number;
        total_auto_formatted_detections?: number;
        six_char_plates_found?: number;
        auto_formatted_plates_found?: number;
        six_char_detection_rate?: number;
        auto_formatted_rate?: number;
    };
    // ✅ NUEVA SECCIÓN: Resumen completo de todas las placas
    all_plates_summary?: {
        complete_list?: UniquePlate[];
        count_by_confidence?: {
            high: number;
            medium: number;
            low: number;
        };
        spatial_coverage?: {
            regions_active: number;
            distribution: Record<string, number>;
        };
        detection_metrics?: {
            total_unique_plates: number;
            plates_per_region: number;
            avg_confidence: number;
        };
    };
    // ✅ NUEVA SECCIÓN: Análisis espacial detallado
    spatial_analysis?: {
        regions_found?: Record<string, number>;
        region_count?: number;
        plates_by_region?: Record<string, UniquePlate[]>;
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

// ✅ INTERFACE ACTUALIZADA: ProcessingParams con nuevas opciones
export interface ProcessingParams {
    confidence_threshold: number;
    iou_threshold: number;
    frame_skip: number;
    max_duration: number;
    send_all_frames: boolean;
    adaptive_quality: boolean;
    enable_thumbnails: boolean;
    // ✅ NUEVOS PARÁMETROS PARA MEJORAS
    roi_enabled?: boolean;
    six_char_filter?: boolean;
    auto_dash_formatting?: boolean;
    roi_percentage?: number;
    min_detection_frames?: number;
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

// ✅ INTERFACE ACTUALIZADA: StreamingOptions con nuevos parámetros
export interface StreamingOptions {
    confidence_threshold?: number;
    iou_threshold?: number;
    frame_skip?: number;
    max_duration?: number;
    send_all_frames?: boolean;
    adaptive_quality?: boolean;
    enable_thumbnails?: boolean;
    // ✅ NUEVAS OPCIONES PARA MEJORAS
    roi_enabled?: boolean;
    six_char_filter?: boolean;
    auto_dash_formatting?: boolean;
    roi_percentage?: number;
    min_detection_frames?: number;
}

// 🔧 TIPO PARA MESSAGE HANDLER
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
        // ✅ INFORMACIÓN DE MEJORAS
        enhancement_info?: {
            roi_enabled: boolean;
            six_char_filter: boolean;
            auto_dash_formatting: boolean;
            roi_percentage: number;
        };
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

// ✅ HELPERS DE ESTADO EXTENDIDOS
export interface StreamingStateHelpers {
    canStart: boolean;
    canControl: boolean;
    hasResults: boolean;
    isUploading: boolean;
    isInitializing: boolean;
    isCompleted: boolean;
    hasError: boolean;
    // ✅ NUEVOS HELPERS PARA PLACAS
    hasSixCharPlates?: boolean;
    hasAutoFormattedPlates?: boolean;
    totalPlatesCount?: number;
    spatialRegionsCount?: number;
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

// ✅ TIPO PRINCIPAL DEL HOOK EXTENDIDO
export interface UseStreamingWebSocketReturn extends StreamingState, StreamingStateHelpers, StreamingActions {
    connectionStatus: 'connected' | 'disconnected';
    // ✅ CAMPOS EXTENDIDOS PARA MANEJO COMPLETO DE PLACAS
    allUniquePlates: UniquePlate[];
    spatialRegions: Record<string, number>;
    enhancementStats: EnhancementStats | null;
}

// 🔧 TIPOS PARA DATOS ESPECÍFICOS DE WEBSOCKET
export interface UploadProgressData {
    progress: number;
}

export interface SystemMessageData {
    type: 'info' | 'warning' | 'error';
    title?: string;
    message: string;
}

// ✅ NUEVA INTERFACE: Datos completos de frame
export interface FrameData {
    image_base64: string;
    thumbnail_base64?: string;
    original_size: [number, number];
    compressed_size: number;
    quality_used: number;
}

// ✅ NUEVA INTERFACE: Información completa de frame con mejoras
export interface EnhancedFrameInfo {
    frame_number: number;
    timestamp: number;
    processing_time: number;
    success: boolean;
    roi_used: boolean;
    six_char_filter_applied: boolean;
    six_char_detections_in_frame: number;
    auto_formatted_detections_in_frame: number;
}

// ✅ NUEVA INTERFACE: Métricas de calidad
export interface QualityMetrics {
    current_quality: number;
    recommended_frame_skip: number;
    adaptive_enabled: boolean;
    avg_processing_time: number;
    frame_rate: number;
}

// ✅ NUEVA INTERFACE: Estadísticas de detección por confianza
export interface ConfidenceBreakdown {
    high: UniquePlate[];
    medium: UniquePlate[];
    low: UniquePlate[];
}

// ✅ NUEVA INTERFACE: Distribución temporal de detecciones
export interface TemporalDistribution {
    frames_with_detections: number[];
    detection_timeline: Array<{
        frame: number;
        timestamp: number;
        detections_count: number;
        six_char_count: number;
        auto_formatted_count: number;
    }>;
}

// 🔧 TYPE GUARDS PARA VALIDACIÓN SEGURA
export function isStreamingUpdateData(data: unknown): data is StreamingUpdateData {
    return typeof data === 'object' && data !== null;
}

export function isUploadProgressData(data: unknown): data is UploadProgressData {
    return typeof data === 'object' &&
        data !== null &&
        'progress' in data &&
        typeof (data as UploadProgressData).progress === 'number';
}

export function isSystemMessageData(data: unknown): data is SystemMessageData {
    return typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as SystemMessageData).message === 'string';
}

export function isEnhancementStats(data: unknown): data is EnhancementStats {
    return typeof data === 'object' &&
        data !== null &&
        'roi_processing' in data &&
        'six_char_filter_active' in data;
}

export function isAllPlatesSummary(data: unknown): data is AllPlatesSummary {
    return typeof data === 'object' &&
        data !== null &&
        'complete_list' in data &&
        Array.isArray((data as AllPlatesSummary).complete_list);
}

export function isUniquePlate(data: unknown): data is UniquePlate {
    return typeof data === 'object' &&
        data !== null &&
        'plate_text' in data &&
        'best_confidence' in data &&
        typeof (data as UniquePlate).plate_text === 'string';
}

export function isPlateDetection(data: unknown): data is PlateDetection {
    return typeof data === 'object' &&
        data !== null &&
        'detection_id' in data &&
        'plate_text' in data &&
        typeof (data as PlateDetection).detection_id === 'string';
}

// ✅ HELPER FUNCTIONS PARA FILTRADO DE PLACAS
export function filterSixCharPlates(plates: UniquePlate[]): UniquePlate[] {
    return plates.filter(plate => plate.is_six_char_valid === true);
}

export function filterValidPlates(plates: UniquePlate[]): UniquePlate[] {
    return plates.filter(plate => plate.is_valid_format === true);
}

export function filterAutoFormattedPlates(plates: UniquePlate[]): UniquePlate[] {
    return plates.filter(plate =>
        plate.auto_formatted === true ||
        plate.is_auto_formatted === true
    );
}

export function filterPlatesByConfidence(
    plates: UniquePlate[],
    minConfidence: number = 0.6
): UniquePlate[] {
    return plates.filter(plate => plate.best_confidence >= minConfidence);
}

export function groupPlatesByConfidence(plates: UniquePlate[]): ConfidenceBreakdown {
    return {
        high: plates.filter(p => p.best_confidence >= 0.8),
        medium: plates.filter(p => p.best_confidence >= 0.6 && p.best_confidence < 0.8),
        low: plates.filter(p => p.best_confidence < 0.6)
    };
}

export function sortPlatesByPriority(plates: UniquePlate[]): UniquePlate[] {
    return plates.sort((a, b) => {
        // Prioridad 1: Placas de 6 caracteres válidos
        if (a.is_six_char_valid && !b.is_six_char_valid) return -1;
        if (!a.is_six_char_valid && b.is_six_char_valid) return 1;

        // Prioridad 2: Placas auto-formateadas
        const aAutoFormatted = a.auto_formatted || a.is_auto_formatted;
        const bAutoFormatted = b.auto_formatted || b.is_auto_formatted;
        if (aAutoFormatted && !bAutoFormatted) return -1;
        if (!aAutoFormatted && bAutoFormatted) return 1;

        // Prioridad 3: Placas válidas
        if (a.is_valid_format && !b.is_valid_format) return -1;
        if (!a.is_valid_format && b.is_valid_format) return 1;

        // Prioridad 4: Mayor confianza
        return b.best_confidence - a.best_confidence;
    });
}

// ✅ HELPER FUNCTIONS PARA ESTADÍSTICAS
export function calculateDetectionStats(plates: UniquePlate[]): {
    totalPlates: number;
    sixCharPlates: number;
    validPlates: number;
    autoFormattedPlates: number;
    avgConfidence: number;
    avgDetectionCount: number;
} {
    if (plates.length === 0) {
        return {
            totalPlates: 0,
            sixCharPlates: 0,
            validPlates: 0,
            autoFormattedPlates: 0,
            avgConfidence: 0,
            avgDetectionCount: 0
        };
    }

    return {
        totalPlates: plates.length,
        sixCharPlates: filterSixCharPlates(plates).length,
        validPlates: filterValidPlates(plates).length,
        autoFormattedPlates: filterAutoFormattedPlates(plates).length,
        avgConfidence: plates.reduce((sum, p) => sum + p.best_confidence, 0) / plates.length,
        avgDetectionCount: plates.reduce((sum, p) => sum + p.detection_count, 0) / plates.length
    };
}

export function calculateSpatialStats(spatialRegions: Record<string, number>): {
    totalRegions: number;
    avgPlatesPerRegion: number;
    mostActiveRegion: string | null;
    maxPlatesInRegion: number;
} {
    const regions = Object.entries(spatialRegions);

    if (regions.length === 0) {
        return {
            totalRegions: 0,
            avgPlatesPerRegion: 0,
            mostActiveRegion: null,
            maxPlatesInRegion: 0
        };
    }

    const totalPlates = regions.reduce((sum, [, count]) => sum + count, 0);
    const maxEntry = regions.reduce((max, current) =>
        current[1] > max[1] ? current : max
    );

    return {
        totalRegions: regions.length,
        avgPlatesPerRegion: totalPlates / regions.length,
        mostActiveRegion: maxEntry[0],
        maxPlatesInRegion: maxEntry[1]
    };
}

// ✅ HELPER FUNCTIONS PARA FORMATEO
export function formatConfidence(confidence: number): string {
    return `${(confidence * 100).toFixed(1)}%`;
}

export function formatProcessingTime(timeMs: number): string {
    if (timeMs < 1000) {
        return `${timeMs.toFixed(1)}ms`;
    }
    return `${(timeMs / 1000).toFixed(2)}s`;
}

export function formatFrameRange(startFrame: number, endFrame: number): string {
    if (startFrame === endFrame) {
        return `Frame ${startFrame}`;
    }
    return `Frames ${startFrame}-${endFrame}`;
}

export function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
}

export function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.6) return 'Media';
    return 'Baja';
}

// ✅ CONSTANTES PARA CONFIGURACIÓN
export const STREAMING_CONSTANTS = {
    DEFAULT_CONFIDENCE_THRESHOLD: 0.3,
    DEFAULT_FRAME_SKIP: 2,
    DEFAULT_MAX_DURATION: 600,
    DEFAULT_ROI_PERCENTAGE: 10,
    DEFAULT_MIN_DETECTION_FRAMES: 2,

    CONFIDENCE_THRESHOLDS: {
        HIGH: 0.8,
        MEDIUM: 0.6,
        LOW: 0.4
    },

    QUALITY_SETTINGS: {
        MIN_QUALITY: 25,
        MAX_QUALITY: 85,
        DEFAULT_QUALITY: 70
    },

    SPATIAL_GRID: {
        DEFAULT_REGION_WIDTH: 400,
        DEFAULT_REGION_HEIGHT: 300,
        DEFAULT_GRID_SIZE: 5
    },

    PLATE_VALIDATION: {
        MIN_CHARS: 4,
        EXPECTED_CHARS: 6,
        REQUIRED_PATTERN: /^[A-Z0-9]{3}-[A-Z0-9]{3}$/
    }
} as const;

// ✅ TIPOS PARA EVENTOS PERSONALIZADOS
export interface StreamingEvent {
    type: 'plate_detected' | 'six_char_found' | 'auto_formatted' | 'progress_update' | 'error' | 'completed';
    data: any;
    timestamp: number;
}

export type StreamingEventHandler = (event: StreamingEvent) => void;

// ✅ INTERFACE PARA CONFIGURACIÓN AVANZADA
export interface AdvancedStreamingConfig {
    processing: {
        confidence_threshold: number;
        iou_threshold: number;
        frame_skip: number;
        max_duration: number;
        adaptive_quality: boolean;
    };
    enhancement: {
        roi_enabled: boolean;
        roi_percentage: number;
        six_char_filter: boolean;
        auto_dash_formatting: boolean;
        min_detection_frames: number;
    };
    quality: {
        min_quality: number;
        max_quality: number;
        adaptive_enabled: boolean;
        quality_adjustment_rate: number;
    };
    spatial: {
        region_width: number;
        region_height: number;
        grid_size: number;
        enable_spatial_tracking: boolean;
    };
    debug: {
        enable_console_logs: boolean;
        enable_frame_logging: boolean;
        enable_detection_logging: boolean;
        log_level: 'info' | 'warn' | 'error' | 'debug';
    };
}

// ✅ CONFIGURACIÓN POR DEFECTO
export const DEFAULT_ADVANCED_CONFIG: AdvancedStreamingConfig = {
    processing: {
        confidence_threshold: STREAMING_CONSTANTS.DEFAULT_CONFIDENCE_THRESHOLD,
        iou_threshold: 0.4,
        frame_skip: STREAMING_CONSTANTS.DEFAULT_FRAME_SKIP,
        max_duration: STREAMING_CONSTANTS.DEFAULT_MAX_DURATION,
        adaptive_quality: true
    },
    enhancement: {
        roi_enabled: true,
        roi_percentage: STREAMING_CONSTANTS.DEFAULT_ROI_PERCENTAGE,
        six_char_filter: true,
        auto_dash_formatting: true,
        min_detection_frames: STREAMING_CONSTANTS.DEFAULT_MIN_DETECTION_FRAMES
    },
    quality: {
        min_quality: STREAMING_CONSTANTS.QUALITY_SETTINGS.MIN_QUALITY,
        max_quality: STREAMING_CONSTANTS.QUALITY_SETTINGS.MAX_QUALITY,
        adaptive_enabled: true,
        quality_adjustment_rate: 5
    },
    spatial: {
        region_width: STREAMING_CONSTANTS.SPATIAL_GRID.DEFAULT_REGION_WIDTH,
        region_height: STREAMING_CONSTANTS.SPATIAL_GRID.DEFAULT_REGION_HEIGHT,
        grid_size: STREAMING_CONSTANTS.SPATIAL_GRID.DEFAULT_GRID_SIZE,
        enable_spatial_tracking: true
    },
    debug: {
        enable_console_logs: true,
        enable_frame_logging: false,
        enable_detection_logging: true,
        log_level: 'info'
    }
};