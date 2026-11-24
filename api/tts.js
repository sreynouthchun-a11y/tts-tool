// ============================================
// Vercel Serverless Function - Edge TTS Proxy
// Free Microsoft Edge TTS (no API key needed)
// ============================================

const crypto = require('crypto');
const WebSocket = require('ws');

const EDGE_TTS_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { text, voice, rate, pitch, volume } = req.body || {};

    if (!text || !voice) {
      res.status(400).json({ error: 'Missing text or voice' });
      return;
    }

    // Limit text length
    const limitedText = text.substring(0, 5000);

    // Build SSML
    const ssml = buildSSML(limitedText, voice, rate, pitch, volume);

    // Generate audio via Edge TTS WebSocket
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
  // rate: 0.5 - 2.0 (1.0 = normal)
  const ratePct = Math.round((parseFloat(rate) * 100 - 100)) + '%';
  // pitch: 0 - 2 (1.0 = normal) -> Hz offset
  const pitchHz = Math.round((parseFloat(pitch) - 1) * 50) + 'Hz';
  // volume: 0 - 1 -> percent
  const volPct = Math.round(parseFloat(volume) * 100);

  const lang = voice.split('-').slice(0, 2).join('-');

  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">` +
    `<voice name="${voice}">` +
    `<prosody rate="${ratePct}" pitch="${pitchHz}" volume="${volPct}">` +
    escapeXml(text) +
    `</prosody></voice></speak>`
  );
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
// Edge TTS WebSocket Connection (correct protocol)
// ============================================
function edgeTTS(ssml) {
  return new Promise(function (resolve, reject) {
    const requestId = crypto.randomUUID();
    const audioChunks = [];
    let isComplete = false;
    let settled = false;

    const ws = new WebSocket(EDGE_TTS_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Sec-WebSocket-Protocol': 'Sec-MS-Protocol-Version=1.0',
      },
    });

    const timeout = setTimeout(function () {
      if (!settled) {
        settled = true;
        try { ws.close(); } catch (e) {}
        reject(new Error('Connection timeout'));
      }
    }, 30000);

    function finish(err, data) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch (e) {}
      if (err) reject(err);
      else resolve(data);
    }

    ws.on('open', function () {
      // 1) Send configuration
      const config = {
        context: {
          synthesis: {
            audio: {
              metadata: { category: 'conversation' },
              autostop: true,
              pitch: '0Hz',
              rate: '0%',
              volume: '100%',
            },
          },
        },
        configuration: {
          request: {
            task: 'speech synthesis',
            format: 'audio-24khz-48kbitrate-mono-mp3',
          },
          context: { language: 'en-US' },
        },
      };
      ws.send('X-Config: ' + JSON.stringify(config) + '\r\n\r\n');

      // 2) Send SSML
      ws.send('SpeechSynthesisRequest: ' + ssml + '\r\n\r\n');
    });

    ws.on('message', function (data, isBinary) {
      if (isBinary) {
        // Binary frames are raw MP3 audio
        audioChunks.push(Buffer.from(data));
        return;
      }

      const message = data.toString();

      if (message.indexOf('turn:start') !== -1) {
        // synthesis started
      } else if (message.indexOf('turn:audio') !== -1) {
        // audio frames will follow as binary
      } else if (message.indexOf('turn:end') !== -1) {
        if (audioChunks.length > 0) {
          finish(null, Buffer.concat(audioChunks));
        } else {
          finish(new Error('No audio received'));
        }
      } else if (message.indexOf('response.error') !== -1) {
        finish(new Error('Edge TTS error: ' + message));
      }
    });

    ws.on('error', function (err) {
      finish(new Error('WebSocket error: ' + err.message));
    });

    ws.on('close', function () {
      if (!settled) {
        if (audioChunks.length > 0) {
          finish(null, Buffer.concat(audioChunks));
        } else {
          finish(new Error('Connection closed before audio completed'));
        }
      }
    });
  });
}
