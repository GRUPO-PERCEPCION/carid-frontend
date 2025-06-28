export class StreamingApiService {
    private baseUrl: string;
    private wsBaseUrl: string;

    constructor(
        baseUrl: string = 'http://localhost:8000',
        wsBaseUrl: string = 'ws://localhost:8000'
    ) {
        this.baseUrl = baseUrl;
        this.wsBaseUrl = wsBaseUrl;
    }

    // 🔌 CREAR WEBSOCKET CONNECTION
    createWebSocket(sessionId: string): WebSocket {
        const wsUrl = `${this.wsBaseUrl}/api/v1/streaming/ws/${sessionId}`;
        console.log('🔌 Conectando a:', wsUrl);
        return new WebSocket(wsUrl);
    }

    // 📤 SUBIR VIDEO PARA STREAMING
    async uploadVideoForStreaming(sessionId: string, file: File, options: StreamingOptions = {}): Promise<StreamingStartResponse> {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('file', file);

        // Agregar opciones de procesamiento
        const defaultOptions: Required<StreamingOptions> = {
            confidence_threshold: 0.3,
            iou_threshold: 0.4,
            frame_skip: 2,
            max_duration: 600,
            send_all_frames: false,
            adaptive_quality: true,
            enable_thumbnails: true
        };

        const finalOptions = { ...defaultOptions, ...options };

        Object.entries(finalOptions).forEach(([key, value]) => {
            formData.append(key, value.toString());
        });

        const response = await fetch(`${this.baseUrl}/api/v1/streaming/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail?.message || errorData.message || 'Error subiendo video');
        }

        return response.json();
    }

    // 📋 OBTENER SESIONES ACTIVAS
    async getActiveSessions(): Promise<SessionListResponse> {
        const response = await fetch(`${this.baseUrl}/api/v1/streaming/sessions`);

        if (!response.ok) {
            throw new Error('Error obteniendo sesiones activas');
        }

        return response.json();
    }

    // 📄 OBTENER INFO DE SESIÓN ESPECÍFICA
    async getSessionInfo(sessionId: string): Promise<SessionInfoResponse> {
        const response = await fetch(`${this.baseUrl}/api/v1/streaming/sessions/${sessionId}`);

        if (!response.ok) {
            throw new Error(`Error obteniendo info de sesión ${sessionId}`);
        }

        return response.json();
    }

    // 🗑️ CERRAR SESIÓN
    async disconnectSession(sessionId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/v1/streaming/sessions/${sessionId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Error cerrando sesión ${sessionId}`);
        }
    }

    // 🏥 HEALTH CHECK
    async getStreamingHealth(): Promise<HealthResponse> {
        const response = await fetch(`${this.baseUrl}/api/v1/streaming/health`);

        if (!response.ok) {
            throw new Error('Error en health check de streaming');
        }

        return response.json();
    }

    // 📥 DESCARGAR RESULTADOS
    async downloadResults(sessionId: string, format: 'json' | 'csv' = 'json'): Promise<void> {
        const url = `${this.baseUrl}/api/v1/streaming/sessions/${sessionId}/download?format=${format}&include_timeline=true`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Error descargando resultados');
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `streaming_results_${sessionId}_${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }

    // 🧪 TEST DE CONECTIVIDAD
    async testConnection(): Promise<ConnectionTestResponse> {
        const response = await fetch(`${this.baseUrl}/api/v1/streaming/test-connection`);

        if (!response.ok) {
            throw new Error('Error en test de conexión');
        }

        return response.json();
    }
}

// 🌐 INSTANCIA GLOBAL
export const streamingApi = new StreamingApiService();

// 📡 TIPOS PARA RESPUESTAS DE LA API
interface StreamingStartResponse {
    success: boolean;
    message: string;
    session_id: string;
    file_info: {
        filename: string;
        size_mb: number;
        file_type: string;
        dimensions?: { width: number; height: number };
    };
    next_steps: string[];
}

interface SessionListResponse {
    success: boolean;
    total_sessions: number;
    sessions: Array<{
        session_id: string;
        status: string;
        created_at: number;
        uptime: number;
        is_processing: boolean;
        has_video: boolean;
    }>;
    server_capacity: {
        max_connections: number;
        current_connections: number;
        available_slots: number;
    };
}

interface SessionInfoResponse {
    success: boolean;
    session: {
        session_id: string;
        status: string;
        created_at: number;
        uptime: number;
        last_activity: number;
        is_processing: boolean;
        video_path: string | null;
        has_video: boolean;
    };
}

interface HealthResponse {
    status: 'healthy' | 'warning' | 'error';
    timestamp: number;
    service: string;
    version: string;
    issues: string[];
    sessions: {
        active: number;
        max: number;
        capacity_usage: number;
    };
    models: {
        loaded: boolean;
        device: string;
    };
    capabilities: {
        websocket_streaming: boolean;
        real_time_processing: boolean;
        video_upload: boolean;
        session_management: boolean;
    };
}

interface ConnectionTestResponse {
    success: boolean;
    message: string;
    endpoints: Record<string, string>;
    example_usage: Record<string, string>;
    timestamp: number;
}

// Importar tipos de streaming existentes
import type {
    StreamingOptions,
    StreamingFrame,
    PlateDetection,
    UniquePlate,
    StreamingProgress,
    StreamingStatus
} from '../types/streaming';