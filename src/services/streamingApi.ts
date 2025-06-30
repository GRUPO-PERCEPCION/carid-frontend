export class StreamingApiService {
    private _baseUrl: string;
    private _wsBaseUrl: string;

    constructor(baseUrl?: string, wsBaseUrl?: string) {
        // URL que te dio ngrok para el puerto 8000
        this._baseUrl = " https://8140-2001-1388-24ae-3d01-4d1d-c72a-9e7f-d1b3.ngrok-free.app";

        // Usa la misma URL pero con el protocolo wss:// para WebSockets
        this._wsBaseUrl = "wss://8140-2001-1388-24ae-3d01-4d1d-c72a-9e7f-d1b3.ngrok-free.app";

        console.log('🌐 API Base URL:', this._baseUrl);
        console.log('🔌 WebSocket URL:', this._wsBaseUrl);
    }

    // 🔓 GETTERS PÚBLICOS para que los componentes puedan acceder
    get baseUrl(): string {
        return this._baseUrl;
    }

    get wsBaseUrl(): string {
        return this._wsBaseUrl;
    }

    // 🎯 MÉTODO PARA DETECTAR URL AUTOMÁTICAMENTE
    private getApiBaseUrl(customUrl?: string): string {
        if (customUrl) return customUrl;

        // Si estamos en ngrok (no localhost)
        if (window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1') {
            return `${window.location.protocol}//${window.location.hostname}`;
        }

        // Desarrollo local
        return 'http://localhost:8000';
    }

    private getWsBaseUrl(customUrl?: string): string {
        if (customUrl) return customUrl;

        // Si estamos en ngrok
        if (window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1') {
            // Ngrok usa wss:// para HTTPS
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.hostname}`;
        }

        // Desarrollo local
        return 'ws://localhost:8000';
    }

    // 🧪 MÉTODO DE PRUEBA PARA NGROK
    async testNgrok(): Promise<any> {
        try {
            const response = await this.makeApiRequest('/api/v1/test-ngrok');
            console.log('✅ Test ngrok exitoso:', response);
            return response;
        } catch (error) {
            console.error('❌ Test ngrok falló:', error);
            throw error;
        }
    }

    // 🔄 MÉTODO AUXILIAR PARA REQUESTS CON HEADERS NGROK
    private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
        const url = `${this._baseUrl}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        };

        const finalOptions: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail?.message || errorData.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // 🔌 CREAR WEBSOCKET CONNECTION
    createWebSocket(sessionId: string): WebSocket {
        const wsUrl = `${this._wsBaseUrl}/api/v1/streaming/ws/${sessionId}`;
        console.log('🔌 Conectando a:', wsUrl);
        return new WebSocket(wsUrl);
    }

    // 📤 SUBIR VIDEO PARA STREAMING
    async uploadVideoForStreaming(sessionId: string, file: File, options: StreamingOptions = {}): Promise<StreamingStartResponse> {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('file', file);

        const defaultOptions: Required<StreamingOptions> = {
            confidence_threshold: 0.3,
            iou_threshold: 0.4,
            frame_skip: 2,
            max_duration: 600,
            send_all_frames: false,
            adaptive_quality: true,
            enable_thumbnails: true,
            roi_enabled: false,
            six_char_filter: false,
            auto_dash_formatting: false,
            roi_percentage: 0,
            min_detection_frames: 0
        };

        const finalOptions = { ...defaultOptions, ...options };

        Object.entries(finalOptions).forEach(([key, value]) => {
            formData.append(key, value.toString());
        });

        const response = await fetch(`${this.baseUrl}/api/v1/streaming/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail?.message || errorData.message || 'Error subiendo video');
        }

        return response.json();
    }

    // 📋 OBTENER SESIONES ACTIVAS
    async getActiveSessions(): Promise<SessionListResponse> {
        return this.makeApiRequest('/api/v1/streaming/sessions');
    }

    // 📄 OBTENER INFO DE SESIÓN ESPECÍFICA
    async getSessionInfo(sessionId: string): Promise<SessionInfoResponse> {
        return this.makeApiRequest(`/api/v1/streaming/sessions/${sessionId}`);
    }

    // 🗑️ CERRAR SESIÓN
    async disconnectSession(sessionId: string): Promise<void> {
        await this.makeApiRequest(`/api/v1/streaming/sessions/${sessionId}`, {
            method: 'DELETE'
        });
    }

    // 🏥 HEALTH CHECK
    async getStreamingHealth(): Promise<HealthResponse> {
        return this.makeApiRequest('/api/v1/streaming/health');
    }

    // 📥 DESCARGAR RESULTADOS
    async downloadResults(sessionId: string, format: 'json' | 'csv' = 'json'): Promise<void> {
        const url = `${this._baseUrl}/api/v1/streaming/sessions/${sessionId}/download?format=${format}&include_timeline=true`;

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
        return this.makeApiRequest('/api/v1/streaming/test-connection');
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