import { WebSocketServer } from 'ws';

class ApiService {
    constructor() {
        this.wsServer = null;
        this.clients = new Set();
        this.currentLyrics = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.mainWindow = null;
    }
    init(mainWindow) {
        this.mainWindow = mainWindow;
    }
    // Start WebSocket server
    start() {
        if (this.wsServer) return; 
        this.wsServer = new WebSocketServer({ port: 6520 });
        this.wsServer.on('connection', (ws) => {
            this.clients.add(ws);
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'welcome',
                data: '感谢接入Muses，文档地址：https://music.moekoe.cn/'
            }));

            // Send current lyrics
            if (this.currentLyrics) {
                ws.send(JSON.stringify({
                    type: 'lyrics',
                    data: this.currentLyrics
                }));
            }

            // Send current playback state
            ws.send(JSON.stringify({
                type: 'playerState',
                data: {
                    isPlaying: this.isPlaying,
                    currentTime: this.currentTime
                }
            }));

            // Handle messages from clients
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    console.log(data);
                    if (data.type === 'control') {
                        this.handleControlCommand(data.data);
                    }
                } catch (e) {
                    console.error('无效的 WebSocket 消息', e);
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('WebSocket 客户端已断开连接');
            });
        });

        console.log('WebSocket server running at ws://127.0.0.1:6520');
    }

    stop() {
        if (this.wsServer) {
            for (const client of this.clients) {
                client.close();
            }
            this.clients.clear();
            this.wsServer.close();
            this.wsServer = null;
            console.log('WebSocket 服务器已停止');
        }
    }
    
    // Broadcast to all clients
    broadcastToClients(data) {
        if(!this.wsServer) return;
        const message = JSON.stringify(data);
        for (const client of this.clients) {
            if (client.readyState === 1) {
                client.send(message);
            }
        }
    }

    handleControlCommand(data) {
        if (!this.mainWindow) return;
        switch (data.command) {
            case 'toggle': // Toggle playback
                this.mainWindow.webContents.send('toggle-play-pause');
                break;
            case 'next': // Next track
                this.mainWindow.webContents.send('play-next-track');
                break;
            case 'prev': // Previous track
                this.mainWindow.webContents.send('play-previous-track');
                break;
        }
    }
    
    // Update lyrics data
    updateLyrics(lyricsData) {
        this.currentLyrics = lyricsData;
        this.broadcastToClients({
            type: 'lyrics',
            data: lyricsData
        });
    }
    
    // Update playback state
    updatePlayerState(state) {
        this.isPlaying = state.isPlaying;
        this.currentTime = state.currentTime;
        this.broadcastToClients({
            type: 'playerState',
            data: state
        });
    }
}

const apiService = new ApiService();
export default apiService; 