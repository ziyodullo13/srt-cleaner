// SubClean Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const selectBtn = document.getElementById('select-btn');
    const fileInfo = document.getElementById('file-info');
    const fileNameLabel = document.getElementById('file-name-label');
    const clearFileBtn = document.getElementById('clear-file-btn');
    const songGapInput = document.getElementById('song-gap');
    const gapValLabel = document.getElementById('gap-val');
    const cleanBtn = document.getElementById('clean-btn');
    
    // Stats Elements
    const statsPanel = document.getElementById('stats-panel');
    const statTotal = document.getElementById('stat-total');
    const statKept = document.getElementById('stat-kept');
    const statRemoved = document.getElementById('stat-removed');
    const statPct = document.getElementById('stat-pct');
    const downloadBtn = document.getElementById('download-btn');
    
    // Preview Elements
    const previewSection = document.getElementById('preview-section');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    const textareaOriginal = document.getElementById('original-textarea');
    const textareaCleaned = document.getElementById('cleaned-textarea');
    const textareaOriginalFull = document.getElementById('original-textarea-full');
    const textareaCleanedFull = document.getElementById('cleaned-textarea-full');

    let selectedFile = null;
    let cleanedFileContent = null;
    let cleanedFileName = '';

    // ── Slider Sync ──────────────────────────────────────────
    songGapInput.addEventListener('input', (e) => {
        gapValLabel.textContent = parseFloat(e.target.value).toFixed(1) + ' s';
    });

    // ── Drag & Drop Handlers ─────────────────────────────────
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    clearFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileState();
    });

    function handleFile(file) {
        if (!file.name.endsWith('.srt')) {
            alert('Faqat .srt kengaytmali fayllar qabul qilinadi.');
            return;
        }
        selectedFile = file;
        fileNameLabel.textContent = file.name;
        document.querySelector('.dropzone-content').style.display = 'none';
        fileInfo.style.display = 'flex';
        cleanBtn.removeAttribute('disabled');
    }

    function resetFileState() {
        selectedFile = null;
        fileInput.value = '';
        document.querySelector('.dropzone-content').style.display = 'flex';
        fileInfo.style.display = 'none';
        cleanBtn.setAttribute('disabled', 'true');
        
        // Hide panels
        statsPanel.style.display = 'none';
        previewSection.style.display = 'none';
        cleanedFileContent = null;
    }

    // ── Clean Subtitles API Call ─────────────────────────────
    cleanBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        const originalText = cleanBtn.innerHTML;
        cleanBtn.disabled = true;
        cleanBtn.innerHTML = '<span class="spinner"></span> Tozalanmoqda...';

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('song_gap', songGapInput.value);

        try {
            const response = await fetch('/api/clean', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.ok) {
                // Save state
                cleanedFileContent = data.cleaned_content;
                cleanedFileName = data.filename.replace('.srt', '_cleaned.srt');

                // Fill previews
                textareaOriginal.value = data.original_content;
                textareaCleaned.value = data.cleaned_content;
                textareaOriginalFull.value = data.original_content;
                textareaCleanedFull.value = data.cleaned_content;

                // Sync scrolls
                syncScrolls(textareaOriginal, textareaCleaned);

                // Show panels
                statsPanel.style.display = 'block';
                previewSection.style.display = 'block';

                // Animate stats
                animateCount(statTotal, data.total_count);
                animateCount(statKept, data.kept_count);
                animateCount(statRemoved, data.removed_count);
                const pct = data.total_count > 0 ? Math.round((data.removed_count / data.total_count) * 100) : 0;
                animateCount(statPct, pct, '%');

                // Smooth scroll to results
                statsPanel.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Tozalashda xatolik yuz berdi: ' + (data.detail || 'Noma\'lum xato'));
            }
        } catch (error) {
            console.error(error);
            alert('Tarmoq xatoligi yuz berdi. Iltimos qayta urining.');
        } finally {
            cleanBtn.disabled = false;
            cleanBtn.innerHTML = originalText;
        }
    });

    // ── Stats Count Animation ────────────────────────────────
    function animateCount(element, targetValue, suffix = '') {
        let startTimestamp = null;
        const duration = 1200; // ms
        
        function step(timestamp) {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = Math.floor(progress * targetValue);
            element.textContent = currentValue + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                element.textContent = targetValue + suffix;
            }
        }
        
        window.requestAnimationFrame(step);
    }

    // ── Synchronized Scrolling for Side-by-Side View ─────────
    function syncScrolls(el1, el2) {
        let isSyncingEl1Scroll = false;
        let isSyncingEl2Scroll = false;

        el1.onscroll = function() {
            if (!isSyncingEl1Scroll) {
                isSyncingEl2Scroll = true;
                el2.scrollTop = this.scrollTop;
                el2.scrollLeft = this.scrollLeft;
            }
            isSyncingEl1Scroll = false;
        };

        el2.onscroll = function() {
            if (!isSyncingEl2Scroll) {
                isSyncingEl1Scroll = true;
                el1.scrollTop = this.scrollTop;
                el1.scrollLeft = this.scrollLeft;
            }
            isSyncingEl2Scroll = false;
        };
    }

    // ── Tabs Functionality ───────────────────────────────────
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Toggle active btn
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle tab pane
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                }
            });
        });
    });

    // ── Download cleaned SRT file ────────────────────────────
    downloadBtn.addEventListener('click', () => {
        if (!cleanedFileContent) return;

        const blob = new Blob([cleanedFileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanedFileName;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
