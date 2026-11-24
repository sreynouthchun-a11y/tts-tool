// ============================================
// VoiceGen - Text to Speech JavaScript
// Uses Vercel Serverless Function for Microsoft Edge TTS
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
    let isUsingServerTTS = false;

    // Microsoft Edge TTS Voices (via serverless function)
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
        msHeader.textContent = '── 🇲🇸 Microsoft Neural Voices (Best Quality) ──';
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
    // Server-side TTS (via Vercel serverless function)
    // ============================================
    function speakWithServerTTS(text, voiceId) {
        return new Promise(function(resolve, reject) {
            statusText.textContent = '⏳ Generating audio...';
            
            // Send request to serverless function
            fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: voiceId,
                    rate: rateSlider.value,
                    pitch: pitchSlider.value,
                    volume: volumeSlider.value
                })
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Server error: ' + response.status);
                }
                return response.blob();
            })
            .then(function(blob) {
                if (blob.size === 0) {
                    throw new Error('Empty audio response');
                }
                
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                currentAudio = audio;

                audio.onplay = function() {
                    status.classList.remove('hidden');
                    statusText.textContent = '🔊 Playing...';
                };

                audio.onended = function() {
                    URL.revokeObjectURL(url);
                    currentAudio = null;
                    resolve();
                };

                audio.onerror = function() {
                    URL.revokeObjectURL(url);
                    currentAudio = null;
                    reject(new Error('Audio playback error'));
                };

                audio.play().catch(reject);
            })
            .catch(function(err) {
                reject(err);
            });
        });
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

        // Check if using Server TTS
        if (selectedVoice.startsWith('edge-')) {
            const voiceId = selectedVoice.replace('edge-', '');
            isUsingServerTTS = true;
            speakBtn.disabled = true;
            stopBtn.disabled = false;
            pauseBtn.disabled = true;
            status.classList.remove('hidden');
            statusText.textContent = '⏳ Generating audio...';
            
            speakWithServerTTS(text, voiceId)
                .then(function() {
                    status.classList.add('hidden');
                    speakBtn.disabled = false;
                    stopBtn.disabled = true;
                    isUsingServerTTS = false;
                })
                .catch(function(err) {
                    statusText.textContent = '⚠️ Error: ' + err.message;
                    status.classList.remove('hidden');
                    speakBtn.disabled = false;
                    stopBtn.disabled = true;
                    isUsingServerTTS = false;
                });
            return;
        }

        // Use browser Web Speech API
        isUsingServerTTS = false;
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
        pauseBtn.textContent = '⏸️ Pause';
    }

    // Pause/Resume
    pauseBtn.addEventListener('click', function() {
        if (isUsingServerTTS) {
            alert('⚠️ Pause is not supported for server TTS. Please stop and restart.');
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
        isUsingServerTTS = false;
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
