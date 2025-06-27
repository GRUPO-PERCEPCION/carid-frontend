import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Terminal,
    Trash2,
    Download,
    Play,
    Pause,
    Eye,
    EyeOff
} from "lucide-react";

interface DebugMessage {
    id: string;
    timestamp: string;
    type: 'info' | 'error' | 'warning' | 'success' | 'websocket' | 'api';
    category: string;
    message: string;
    data?: unknown;
}

interface StreamingDebugConsoleProps {
    isVisible: boolean;
    onToggleVisibility: () => void;
    className?: string;
}

// 🔧 DECLARACIÓN GLOBAL CORREGIDA
declare global {
    interface Window {
        streamingDebug?: {
            addMessage: (type: string, category: string, message: string, data?: unknown) => void;
            info: (category: string, message: string, data?: unknown) => void;
            error: (category: string, message: string, data?: unknown) => void;
            warning: (category: string, message: string, data?: unknown) => void;
            success: (category: string, message: string, data?: unknown) => void;
            websocket: (category: string, message: string, data?: unknown) => void;
            api: (category: string, message: string, data?: unknown) => void;
        };
    }
}

export const StreamingDebugConsole: React.FC<StreamingDebugConsoleProps> = ({
                                                                                isVisible,
                                                                                onToggleVisibility,
                                                                                className = ""
                                                                            }) => {
    const [messages, setMessages] = useState<DebugMessage[]>([]);
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 📝 AGREGAR MENSAJE DE DEBUG
    const addDebugMessage = (
        type: DebugMessage['type'],
        category: string,
        message: string,
        data?: unknown
    ) => {
        if (isPaused) return;

        const newMessage: DebugMessage = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toLocaleTimeString(),
            type,
            category,
            message,
            data
        };

        setMessages(prev => {
            const updated = [...prev, newMessage];
            return updated.slice(-200); // Mantener solo los últimos 200 mensajes
        });
    };

    // 🔄 AUTO-SCROLL
    useEffect(() => {
        if (isAutoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isAutoScroll]);

    // 🎨 OBTENER COLOR DEL TIPO DE MENSAJE
    const getMessageTypeColor = (type: DebugMessage['type']): string => {
        const colors: Record<DebugMessage['type'], string> = {
            info: 'text-blue-400',
            error: 'text-red-400',
            warning: 'text-yellow-400',
            success: 'text-green-400',
            websocket: 'text-purple-400',
            api: 'text-cyan-400'
        };
        return colors[type] || 'text-gray-400';
    };

    // 🎨 OBTENER BADGE DEL TIPO
    const getMessageTypeBadge = (type: DebugMessage['type']) => {
        const variantMap: Record<DebugMessage['type'], "default" | "destructive" | "outline" | "secondary"> = {
            info: 'default',
            error: 'destructive',
            warning: 'outline',
            success: 'default',
            websocket: 'secondary',
            api: 'outline'
        };

        return (
            <Badge variant={variantMap[type]} className="text-xs">
                {type.toUpperCase()}
            </Badge>
        );
    };

    // 🔍 FILTRAR MENSAJES
    const filteredMessages = messages.filter(msg => {
        if (filter === 'all') return true;
        return msg.type === filter;
    });

    // 🧹 LIMPIAR CONSOLA
    const clearMessages = () => {
        setMessages([]);
    };

    // 📥 DESCARGAR LOGS
    const downloadLogs = () => {
        const logData = messages.map(msg => ({
            timestamp: msg.timestamp,
            type: msg.type,
            category: msg.category,
            message: msg.message,
            data: msg.data
        }));

        const blob = new Blob([JSON.stringify(logData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `streaming_debug_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 🔧 EXPONER FUNCIÓN PARA AGREGAR MENSAJES GLOBALMENTE
    useEffect(() => {
        // Agregar al objeto window para uso global
        window.streamingDebug = {
            addMessage: addDebugMessage,
            info: (category: string, message: string, data?: unknown) =>
                addDebugMessage('info', category, message, data),
            error: (category: string, message: string, data?: unknown) =>
                addDebugMessage('error', category, message, data),
            warning: (category: string, message: string, data?: unknown) =>
                addDebugMessage('warning', category, message, data),
            success: (category: string, message: string, data?: unknown) =>
                addDebugMessage('success', category, message, data),
            websocket: (category: string, message: string, data?: unknown) =>
                addDebugMessage('websocket', category, message, data),
            api: (category: string, message: string, data?: unknown) =>
                addDebugMessage('api', category, message, data)
        };

        // Interceptar console methods
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.log = (...args: unknown[]) => {
            originalConsoleLog(...args);
            const firstArg = args[0];
            if (typeof firstArg === 'string' && firstArg.includes('[StreamingWebSocket]')) {
                addDebugMessage('websocket', 'WebSocket', args.join(' '));
            }
        };

        console.error = (...args: unknown[]) => {
            originalConsoleError(...args);
            const firstArg = args[0];
            if (typeof firstArg === 'string') {
                addDebugMessage('error', 'Console', args.join(' '));
            }
        };

        console.warn = (...args: unknown[]) => {
            originalConsoleWarn(...args);
            const firstArg = args[0];
            if (typeof firstArg === 'string') {
                addDebugMessage('warning', 'Console', args.join(' '));
            }
        };

        return () => {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
            delete window.streamingDebug;
        };
    }, [isPaused]);

    if (!isVisible) {
        return (
            <Button
                onClick={onToggleVisibility}
                className="fixed bottom-4 right-4 z-50 bg-black/80 hover:bg-black/90 text-white"
                size="sm"
            >
                <Terminal className="w-4 h-4 mr-2" />
                Debug Console
            </Button>
        );
    }

    return (
        <Card className={`${className} bg-black/95 border-gray-700 text-white`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center space-x-2">
                        <Terminal className="w-5 h-5" />
                        <span>Debug Console</span>
                        <Badge variant="outline" className="text-xs">
                            {messages.length} mensajes
                        </Badge>
                    </CardTitle>

                    <div className="flex items-center space-x-2">
                        {/* Filtros */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                        >
                            <option value="all">Todos</option>
                            <option value="info">Info</option>
                            <option value="error">Errores</option>
                            <option value="warning">Warnings</option>
                            <option value="success">Success</option>
                            <option value="websocket">WebSocket</option>
                            <option value="api">API</option>
                        </select>

                        {/* Controles */}
                        <Button
                            onClick={() => setIsPaused(!isPaused)}
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                        >
                            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </Button>

                        <Button
                            onClick={() => setIsAutoScroll(!isAutoScroll)}
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                        >
                            {isAutoScroll ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>

                        <Button
                            onClick={downloadLogs}
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                        >
                            <Download className="w-4 h-4" />
                        </Button>

                        <Button
                            onClick={clearMessages}
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>

                        <Button
                            onClick={onToggleVisibility}
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                        >
                            <EyeOff className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="h-80 overflow-y-auto bg-gray-900 font-mono text-xs border-t border-gray-700">
                    {filteredMessages.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            No hay mensajes de debug
                            {filter !== 'all' && ` para el filtro "${filter}"`}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="flex items-start space-x-2 py-1 px-2 hover:bg-gray-800/50 rounded group"
                                >
                  <span className="text-gray-500 w-20 flex-shrink-0">
                    {msg.timestamp}
                  </span>

                                    <div className="flex-shrink-0">
                                        {getMessageTypeBadge(msg.type)}
                                    </div>

                                    <span className="text-gray-400 w-24 flex-shrink-0 truncate">
                    [{msg.category}]
                  </span>

                                    <div className="flex-1 min-w-0">
                                        <div className={`${getMessageTypeColor(msg.type)} break-words`}>
                                            {msg.message}
                                        </div>

                                        {msg.data && (
                                            <details className="mt-1 group">
                                                <summary className="text-gray-500 cursor-pointer hover:text-gray-400 text-xs">
                                                    Ver datos adicionales
                                                </summary>
                                                <pre className="mt-1 p-2 bg-gray-800 rounded text-xs text-gray-300 overflow-x-auto">
                          {JSON.stringify(msg.data, null, 2)}
                        </pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Información de estado */}
                <div className="p-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                        <span>Mensajes: {filteredMessages.length}/{messages.length}</span>
                        <span className={isPaused ? 'text-yellow-400' : 'text-green-400'}>
              {isPaused ? 'Pausado' : 'Activo'}
            </span>
                        <span className={isAutoScroll ? 'text-green-400' : 'text-gray-400'}>
              Auto-scroll: {isAutoScroll ? 'ON' : 'OFF'}
            </span>
                    </div>

                    <div className="text-gray-600">
                        Streaming Debug Console v1.0
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};