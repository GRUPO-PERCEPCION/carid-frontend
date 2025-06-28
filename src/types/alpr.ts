export interface PlateDetection {
    plate_text: string;
    overall_confidence: number;
    is_valid_plate: boolean;
    is_six_char_valid?: boolean;
    char_count?: number;
    bbox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    plate_region_confidence?: number;
    text_confidence?: number;
    character_confidences?: number[];
    processing_method?: string;
}

export interface UniquePlate extends PlateDetection {
    detection_count: number;
    best_confidence: number;
    frame_numbers?: number[];
    first_detection_time?: number;
    last_detection_time?: number;
    first_seen_frame?: number;
    last_seen_frame?: number;
    best_frame?: number;
    avg_confidence?: number;
    stability_score?: number;
    duration_frames?: number;
}

export interface ProcessingSummary {
    frames_processed?: number;
    frames_with_detections?: number;
    total_detections: number;
    unique_plates_found?: number;
    valid_detections?: number;
    valid_plates?: number;
    six_char_plates?: number;
    processing_steps?: string[];
    enhancement_applied?: boolean;
}

export interface VideoInfo {
    duration_seconds: number;
    frame_count: number;
    fps: number;
    resolution?: string;
    width?: number;
    height?: number;
    frames_to_process?: number;
    file_size_mb?: number;
}

export interface EnhancementInfo {
    roi_enabled: boolean;
    six_char_filter: boolean;
    roi_percentage: number;
}

export interface FileInfo {
    filename: string;
    size_mb: number;
    dimensions?: {
        width: number;
        height: number;
    };
    format?: string;
}

export interface ResultUrls {
    annotated_image_url?: string;
    annotated_video_url?: string;
    cropped_plates_urls?: string[];
    best_frames_urls?: string[];
    original?: string;
}

// Respuestas de la API
export interface BaseApiResponse {
    success: boolean;
    message: string;
    timestamp?: string;
}

export interface ImageDetectionResponse extends BaseApiResponse {
    data?: {
        success: boolean;
        best_result: PlateDetection | null;
        final_results: PlateDetection[];
        plates_processed: number;
        processing_time: number;
        processing_summary: ProcessingSummary;
        file_info: FileInfo;
        result_urls?: ResultUrls;
    };
}

export interface VideoDetectionResponse extends BaseApiResponse {
    data?: {
        success: boolean;
        unique_plates: UniquePlate[];
        best_plate?: UniquePlate;
        processing_time: number;
        processing_summary: ProcessingSummary;
        video_info: VideoInfo;
        file_info: FileInfo;
        result_urls?: ResultUrls;
        enhancement_info?: EnhancementInfo;
    };
    // Campos de compatibilidad para respuestas directas
    unique_plates?: UniquePlate[];
    processing_summary?: ProcessingSummary;
    video_info?: VideoInfo;
    result_urls?: ResultUrls;
    enhancement_info?: EnhancementInfo;
}

export interface QuickDetectionResponse extends BaseApiResponse {
    plate_text: string;
    confidence: number;
    is_valid_format: boolean;
    processing_time: number;
}

export interface QuickVideoResponse extends BaseApiResponse {
    unique_plates_count: number;
    best_plate_text: string;
    best_confidence: number;
    detection_count: number;
    is_valid_format: boolean;
    processing_time: number;
    frames_processed: number;
}

// Tipos para hooks y utilidades
export interface ConfidenceLevel {
    value: number;
    label: string;
    color: string;
}

export interface FileValidation {
    isValid: boolean;
    error?: string;
    maxSize: number;
    validTypes: string[];
}

export interface ProcessingConfig {
    confidence_threshold: number;
    iou_threshold: number;
    max_detections?: number;
    enhance_image?: boolean;
    return_visualization?: boolean;
    save_results?: boolean;
    frame_skip?: number;
    max_duration?: number;
    min_detection_frames?: number;
    create_annotated_video?: boolean;
}

// Constantes de configuración
export const CONFIDENCE_LEVELS: Record<string, ConfidenceLevel> = {
    HIGH: { value: 0.8, label: 'Alta', color: 'text-green-400' },
    MEDIUM: { value: 0.6, label: 'Media', color: 'text-yellow-400' },
    LOW: { value: 0.0, label: 'Baja', color: 'text-red-400' }
};

export const FILE_VALIDATION: Record<string, FileValidation> = {
    IMAGE: {
        isValid: true,
        maxSize: 50 * 1024 * 1024, // 50MB
        validTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    },
    VIDEO: {
        isValid: true,
        maxSize: 500 * 1024 * 1024, // 500MB
        validTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm']
    }
};

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
    confidence_threshold: 0.5,
    iou_threshold: 0.4,
    max_detections: 5,
    enhance_image: true,
    return_visualization: true,
    save_results: true,
    frame_skip: 3,
    max_duration: 300,
    min_detection_frames: 2,
    create_annotated_video: true
};