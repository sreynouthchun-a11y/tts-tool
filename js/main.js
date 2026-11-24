// ============================================
// VoiceGen - Text to Speech JavaScript
// Uses Microsoft Edge TTS for Khmer (free, no API key)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    
    // Elements
    const ttsText = document.getElementById('ttsText');
    const voiceSelect = document.getElementById('voiceSelect');
    const rateSlider = document.getElementById('rateSlider');
    const pitchSlider = document.getElementById('pitchSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    const rateValue = document.getElementById('rateValue');
    const pitchValue = document.getElementById('pitchValue');
    const volumeValue = document.getElementById('volumeValue');
    const speakBtn = document.getElementById('speakBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const charCount = document.getElementById('charCount');
    const backToTop = document.getElementById('backToTop');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');

    let voices = [];
    let isPaused = false;
    let currentAudio = null;
    let isUsingEdgeTTS = false;
    let isSpeaking = false;

    // Microsoft Edge TTS Voices (free, no API key)
    const edgeVoices = [
        { id: 'km-KH-SreymomNeural', name: '🇰🇭 Sreymom (Female) - Khmer', lang: 'km-KH' },
        { id: 'km-KH-PisethNeural', name: '🇰🇭 Piseth (Male) - Khmer', lang: 'km-KH' },
        { id: 'en-US-AriaNeural', name: '🇺🇸 Aria (Female) - English US', lang: 'en-US' },
        { id: 'en-US-GuyNeural', name: '🇺🇸 Guy (Male) - English US', lang: 'en-US' },
        { id: 'en-GB-SoniaNeural', name: '🇬🇧 Sonia (Female) - English UK', lang: 'en-GB' },
        { id: 'th-TH-PremwadeeNeural', name: '🇹🇭 Premwadee (Female) - Thai', lang: 'th-TH' },
        { id: 'vi-VN-HoaiMyNeural', name: '🇻🇳 HoaiMy (Female) - Vietnamese', lang: 'vi-VN' },
        { id: 'zh-CN-XiaoxiaoNeural', name: '🇨🇳 Xiaoxiao (Female) - Chinese', lang: 'zh-CN' },
        { id: 'ja-JP-NanamiNeural', name: '🇯🇵 Nanami (Female) - Japanese', lang: 'ja-JP' },
        { id: 'ko-KR-SunHiNeural', name: '🇰🇷 SunHi (Female) - Korean', lang: 'ko-KR' },
        { id: 'id-ID-ArdiNeural', name: '🇮🇩 Ardi (Male) - Indonesian', lang: 'id-ID' },
        { id: 'fr-FR-DeniseNeural', name: '🇫🇷 Denise (Female) - French', lang: 'fr-FR' },
    ];

    // Load Browser Voices
    function loadVoices() {
        voices = speechSynthesis.getVoices();
        
        if (voices.length === 0) {
            speechSynthesis.onvoiceschanged = function() {
                voices = speechSynthesis.getVoices();
                populateVoiceSelect();
            };
        }
        
        populateVoiceSelect();
    }

    function populateVoiceSelect() {
        voiceSelect.innerHTML = '';
        
        // Add Microsoft Edge TTS option
        const msHeader = document.createElement('option');
        msHeader.disabled = true;
        msHeader.textContent = '── 🇲🇸 Microsoft Edge TTS (Best Quality) ──';
        voiceSelect.appendChild(msHeader);

        edgeVoices.forEach(function(v) {
            const option = document.createElement('option');
            option.value = 'edge-' + v.id;
            option.textContent = v.name;
            voiceSelect.appendChild(option);
        });

        // Add Browser Voices
        const browserHeader = document.createElement('option');
        browserHeader.disabled = true;
        browserHeader.textContent = '── Browser Voices ──';
        voiceSelect.appendChild(browserHeader);

        const sortedVoices = [...voices].sort(function(a, b) {
            const aEn = a.lang.startsWith('en') ? 0 : 1;
            const bEn = b.lang.startsWith('en') ? 0 : 1;
            if (aEn !== bEn) return aEn - bEn;
            return a.name.localeCompare(b.name);
        });

        sortedVoices.forEach(function(voice, index) {
            const option = document.createElement('option');
            option.value = 'browser-' + index;
            option.textContent = voice.name + ' (' + voice.lang + ')';
            voiceSelect.appendChild(option);
        });

        // Select Khmer Sreymom by default
        voiceSelect.value = 'edge-km-KH-SreymomNeural';
    }

    // ============================================
    // Microsoft Edge TTS (Free, No API Key)
    // Uses WebSocket to connect to Edge's TTS service
    // ============================================
    function speakWithEdgeTTS(text, voiceId) {
        return new Promise(function(resolve, reject) {
            const wsUrl = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC=V%2F0w39R0%2Fq0l%2FQm%2FfW%2F0m%2F0m%2F0m&Sec-MS-GEC-Version=1-0.1';
            
            let ws;
            let audioChunks = [];
            let audioBlob = null;
            let isComplete = false;

            try {
                ws = new WebSocket(wsUrl);
            } catch (e) {
                reject(new Error('WebSocket connection failed'));
                return;
            }

            const timeout = setTimeout(function() {
                if (!isComplete) {
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 30000);

            ws.onopen = function() {
                // Send config
                const config = {
                    context: {
                        synthesis: {
                            audio: {
                                autostop: true,
                                rate: rateSlider.value + '%',
                                pitch: pitchSlider.value + 'Hz',
                                volume: Math.round(volumeSlider.value * 100) + '%'
                            }
                        }
                    },
                    configuration: {
                        request: {
                            task: 'speech synthesis',
                            format: 'audio-24khz-48kbitrate-mono-mp3'
                        },
                        context: {
                            synthesis: {
                                audio: {
                                    metadata: {
                                        category: 'conversation'
                                    }
                                }
                            }
                        }
                    }
                };

                const configMsg = 'X-Config: ' + JSON.stringify(config) + '\r\n\r\n';
                ws.send(configMsg);

                // Send text
                const ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + getLangFromVoice(voiceId) + '"><voice name="' + voiceId + '">' + escapeXml(text) + '</voice></speak>';
                const textMsg = 'SpeechSynthesisRequest: ' + ssml + '\r\n\r\n';
                ws.send(textMsg);

                // Send end
                ws.send('speech.synthesis.request\r\n\r\n');
            };

            ws.onmessage = function(event) {
                if (typeof event.data === 'string') {
                    if (event.data.indexOf('turn:audio') !== -1) {
                        // Audio data follows
                    } else if (event.data.indexOf('turn:end') !== -1) {
                        isComplete = true;
                        clearTimeout(timeout);
                        ws.close();
                        
                        if (audioChunks.length > 0) {
                            audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                            playAudioBlob(audioBlob, resolve, reject);
                        } else {
                            reject(new Error('No audio received'));
                        }
                    }
                } else if (event.data instanceof ArrayBuffer) {
                    audioChunks.push(new Blob([event.data]));
                }
            };

            ws.onerror = function() {
                clearTimeout(timeout);
                if (!isComplete) {
                    reject(new Error('WebSocket error'));
                }
            };

            ws.onclose = function() {
                clearTimeout(timeout);
                if (!isComplete && audioChunks.length > 0) {
                    isComplete = true;
                    audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    playAudioBlob(audioBlob, resolve, reject);
                }
            };
        });
    }

    function getLangFromVoice(voiceId) {
        const v = edgeVoices.find(function(v) { return v.id === voiceId; });
        return v ? v.lang : 'en-US';
    }

    function escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function playAudioBlob(blob, resolve, reject) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudio = audio;

        audio.onplay = function() {
            status.classList.remove('hidden');
            statusText.textContent = '🔊 Playing...';
            isSpeaking = true;
        };

        audio.onended = function() {
            URL.revokeObjectURL(url);
            currentAudio = null;
            isSpeaking = false;
            resolve();
        };

        audio.onerror = function() {
            URL.revokeObjectURL(url);
            currentAudio = null;
            isSpeaking = false;
            reject(new Error('Audio playback error'));
        };

        audio.play().catch(reject);
    }

    // Initialize
    loadVoices();
    
    // Character count
    ttsText.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });

    // Slider updates
    rateSlider.addEventListener('input', function() {
        rateValue.textContent = parseFloat(this.value).toFixed(1);
    });

    pitchSlider.addEventListener('input', function() {
        pitchValue.textContent = parseFloat(this.value).toFixed(1);
    });

    volumeSlider.addEventListener('input', function() {
        volumeValue.textContent = Math.round(this.value * 100);
    });

    // Speak
    speakBtn.addEventListener('click', function() {
        const text = ttsText.value.trim();
        
        if (!text) {
            alert('Please enter some text first!');
            return;
        }

        // Stop any existing speech
        stopAllSpeech();

        const selectedVoice = voiceSelect.value;

        // Check if using Microsoft Edge TTS
        if (selectedVoice.startsWith('edge-')) {
            const voiceId = selectedVoice.replace('edge-', '');
            isUsingEdgeTTS = true;
            speakBtn.disabled = true;
            stopBtn.disabled = false;
            pauseBtn.disabled = true;
            status.classList.remove('hidden');
            statusText.textContent = '⏳ Connecting to Microsoft TTS...';
            
            speakWithEdgeTTS(text, voiceId)
                .then(function() {
                    status.classList.add('hidden');
                    speakBtn.disabled = false;
                    stopBtn.disabled = true;
                    isUsingEdgeTTS = false;
                })
                .catch(function(err) {
                    statusText.textContent = '⚠️ Error: ' + err.message + '. Try again or use a browser voice.';
                    status.classList.remove('hidden');
                    speakBtn.disabled = false;
                    stopBtn.disabled = true;
                    isUsingEdgeTTS = false;
                });
            return;
        }

        // Use browser Web Speech API
        isUsingEdgeTTS = false;
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice
        if (selectedVoice.startsWith('browser-')) {
            const voiceIndex = parseInt(selectedVoice.replace('browser-', ''));
            if (voices[voiceIndex]) {
                utterance.voice = voices[voiceIndex];
            }
        }

        // Set properties
        utterance.rate = parseFloat(rateSlider.value);
        utterance.pitch = parseFloat(pitchSlider.value);
        utterance.volume = parseFloat(volumeSlider.value);

        // Events
        utterance.onstart = function() {
            status.classList.remove('hidden');
            statusText.textContent = '🔊 Speaking...';
            speakBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            isPaused = false;
        };

        utterance.onend = function() {
            status.classList.add('hidden');
            speakBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            isPaused = false;
            pauseBtn.textContent = '⏸️ Pause';
        };

        utterance.onerror = function(e) {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                statusText.textContent = '⚠️ Error: ' + e.error;
                status.classList.remove('hidden');
            }
            speakBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            isPaused = false;
        };

        speechSynthesis.speak(utterance);
    });

    function stopAllSpeech() {
        speechSynthesis.cancel();
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }
        isPaused = false;
        isSpeaking = false;
        pauseBtn.textContent = '⏸️ Pause';
    }

    // Pause/Resume
    pauseBtn.addEventListener('click', function() {
        if (isUsingEdgeTTS) {
            alert('⚠️ Pause is not supported for Microsoft TTS. Please stop and restart.');
            return;
        }
        
        if (!isPaused) {
            speechSynthesis.pause();
            isPaused = true;
            this.textContent = '▶️ Resume';
            statusText.textContent = '⏸️ Paused...';
        } else {
            speechSynthesis.resume();
            isPaused = false;
            this.textContent = '⏸️ Pause';
            statusText.textContent = '🔊 Speaking...';
        }
    });

    // Stop
    stopBtn.addEventListener('click', function() {
        stopAllSpeech();
        status.classList.add('hidden');
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        isUsingEdgeTTS = false;
    });

    // Back to Top
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Mobile Menu
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('active');
                }
            }
        });
    });

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const item = this.parentElement;
            const isActive = item.classList.contains('active');
            
            document.querySelectorAll('.faq-item').forEach(function(i) {
                i.classList.remove('active');
            });
            
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Scroll reveal
    const revealElements = document.querySelectorAll('.feature-card, .tool-card, .faq-item');
    
    const revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        revealObserver.observe(el);
    });

});
