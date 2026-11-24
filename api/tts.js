// ============================================
// Vercel Serverless Function - Edge TTS Proxy
// Free Microsoft Edge TTS (no API key needed)
// ============================================

const { randomUUID } = require('crypto');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { text, voice, rate, pitch, volume } = req.body;

        if (!text || !voice) {
            res.status(400).json({ error: 'Missing text or voice' });
            return;
        }

        // Limit text length
        const limitedText = text.substring(0, 5000);

        // Build SSML
        const ssml = buildSSML(limitedText, voice, rate, pitch, volume);

        // Connect to Edge TTS WebSocket
        const audioData = await edgeTTS(ssml);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioData.length);
        res.setHeader('Cache-Control', 'no-cache');
        res.status(200).send(audioData);

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'TTS generation failed: ' + error.message });
    }
}

function buildSSML(text, voice, rate, pitch, volume) {
    const rateStr = (parseFloat(rate) * 100 - 100) + '%';
    const pitchStr = (parseFloat(pitch) - 1) * 50 + 'Hz';
    const volStr = Math.round(parseFloat(volume) * 100);

    const lang = voice.split('-').slice(0, 2).join('-');

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
        <voice name="${voice}">
            <prosody rate="${rateStr}" pitch="${pitchStr}" volume="${volStr}">
                ${escapeXml(text)}
            </prosody>
        </voice>
    </speak>`;
}

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ============================================
// Edge TTS WebSocket Connection
// ============================================
async function edgeTTS(ssml) {
    const WebSocket = require('ws');
    
    return new Promise(function(resolve, reject) {
        const requestId = randomUUID();
        const audioChunks = [];
        let isComplete = false;

        const wsUrl = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(function() {
            if (!isComplete) {
                ws.close();
                reject(new Error('Connection timeout'));
            }
        }, 30000);

        ws.on('open', function() {
            // Send config
            const config = {
                context: {
                    synthesis: {
                        audio: {
                            autostop: true,
                            metadata: { category: 'conversation' }
                        }
                    }
                },
                configuration: {
                    request: {
                        task: 'speech synthesis',
                        format: 'audio-24khz-48kbitrate-mono-mp3'
                    }
                }
            };

            ws.send('X-Config: ' + JSON.stringify(config) + '\r\n\r\n');

            // Send SSML
            ws.send('SpeechSynthesisRequest: ' + ssml + '\r\n\r\n');

            // Send end
            ws.send('speech.synthesis.request\r\n\r\n');
        });

        ws.on('message', function(data) {
            const message = data.toString();
            
            if (message.indexOf('turn:audio') !== -1) {
                // Next message will be audio
            } else if (message.indexOf('turn:end') !== -1) {
                isComplete = true;
                clearTimeout(timeout);
                ws.close();
                
                if (audioChunks.length > 0) {
                    resolve(Buffer.concat(audioChunks));
                } else {
                    reject(new Error('No audio received'));
                }
            } else if (message.indexOf('audio') !== -1 && message.indexOf('turn:') === -1) {
                // Audio data in base64
                try {
                    const base64Data = message.replace('audio:', '').trim();
                    if (base64Data.length > 0) {
                        audioChunks.push(Buffer.from(base64Data, 'base64'));
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        });

        ws.on('binary', function(data) {
            audioChunks.push(Buffer.from(data));
        });

        ws.on('error', function(err) {
            clearTimeout(timeout);
            if (!isComplete) {
                reject(new Error('WebSocket error: ' + err.message));
            }
        });

        ws.on('close', function() {
            clearTimeout(timeout);
            if (!isComplete && audioChunks.length > 0) {
                isComplete = true;
                resolve(Buffer.concat(audioChunks));
            }
        });
    });
}
