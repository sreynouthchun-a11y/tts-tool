// ============================================
// VoiceGen - Text to Speech JavaScript
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

    // Load Voices
    function loadVoices() {
        voices = speechSynthesis.getVoices();
        
        if (voices.length === 0) {
            // Some browsers load voices asynchronously
            speechSynthesis.onvoiceschanged = function() {
                voices = speechSynthesis.getVoices();
                populateVoiceSelect();
            };
        }
        
        populateVoiceSelect();
    }

    function populateVoiceSelect() {
        voiceSelect.innerHTML = '';
        
        // Sort voices: English first, then others alphabetically
        const sortedVoices = [...voices].sort(function(a, b) {
            const aEn = a.lang.startsWith('en') ? 0 : 1;
            const bEn = b.lang.startsWith('en') ? 0 : 1;
            if (aEn !== bEn) return aEn - bEn;
            return a.name.localeCompare(b.name);
        });

        sortedVoices.forEach(function(voice, index) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = voice.name + ' (' + voice.lang + ')';
            voiceSelect.appendChild(option);
        });

        // Select first English voice by default
        const englishVoice = sortedVoices.findIndex(function(v) {
            return v.lang.startsWith('en');
        });
        if (englishVoice !== -1) {
            voiceSelect.value = englishVoice;
        }
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

        // Cancel any existing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice
        const selectedVoiceIndex = parseInt(voiceSelect.value);
        if (voices[selectedVoiceIndex]) {
            utterance.voice = voices[selectedVoiceIndex];
        }

        // Set properties
        utterance.rate = parseFloat(rateSlider.value);
        utterance.pitch = parseFloat(pitchSlider.value);
        utterance.volume = parseFloat(volumeSlider.value);

        // Events
        utterance.onstart = function() {
            status.classList.remove('hidden');
            statusText.textContent = 'Speaking...';
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
                statusText.textContent = 'Error: ' + e.error;
                status.classList.remove('hidden');
            }
            speakBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            isPaused = false;
        };

        speechSynthesis.speak(utterance);
    });

    // Pause/Resume
    pauseBtn.addEventListener('click', function() {
        if (!isPaused) {
            speechSynthesis.pause();
            isPaused = true;
            this.textContent = '▶️ Resume';
            statusText.textContent = 'Paused...';
        } else {
            speechSynthesis.resume();
            isPaused = false;
            this.textContent = '⏸️ Pause';
            statusText.textContent = 'Speaking...';
        }
    });

    // Stop
    stopBtn.addEventListener('click', function() {
        speechSynthesis.cancel();
        status.classList.add('hidden');
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        isPaused = false;
        pauseBtn.textContent = '⏸️ Pause';
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
            
            // Close all
            document.querySelectorAll('.faq-item').forEach(function(i) {
                i.classList.remove('active');
            });
            
            // Open clicked if it wasn't active
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
