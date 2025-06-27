const express = require('express');
const GitHubWebhookHandler = require('../utils/githubWebhook');

class WebhookServer {
    constructor() {
        this.app = express();
        this.port = process.env.WEBHOOK_PORT || 3000;
        this.githubHandler = new GitHubWebhookHandler();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Parse JSON with raw body for signature verification
        this.app.use('/webhook/github', express.raw({ type: 'application/json' }));
        this.app.use(express.json());
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                service: 'Purple Bot Webhook Server'
            });
        });

        // GitHub webhook endpoint
        this.app.post('/webhook/github', async (req, res) => {
            try {
                const signature = req.get('X-Hub-Signature-256');
                const event = req.get('X-GitHub-Event');
                const payload = req.body;

                console.log(`📡 Received GitHub ${event} webhook`);

                // Verify signature if secret is set
                if (!this.githubHandler.verifySignature(payload, signature)) {
                    console.log('❌ Invalid webhook signature');
                    return res.status(401).json({ error: 'Invalid signature' });
                }

                // Parse JSON payload
                const data = JSON.parse(payload.toString());

                // Handle different GitHub events
                switch (event) {
                    case 'push':
                        await this.githubHandler.handlePushEvent(data);
                        break;
                    case 'ping':
                        console.log('🏓 GitHub webhook ping received');
                        break;
                    default:
                        await this.githubHandler.handleOtherEvent(event, data);
                        break;
                }

                res.status(200).json({ success: true, event });

            } catch (error) {
                console.error('❌ Webhook error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Catch-all for unknown routes
        this.app.use('*', (req, res) => {
            res.status(404).json({ 
                error: 'Not found',
                message: 'Purple Bot Webhook Server - Unknown endpoint'
            });
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    console.log(`🚀 Webhook server running on port ${this.port}`);
                    console.log(`📡 GitHub webhook endpoint: http://localhost:${this.port}/webhook/github`);
                    resolve(this.server);
                });

                this.server.on('error', (error) => {
                    console.error('❌ Webhook server error:', error);
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 Webhook server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = WebhookServer;
