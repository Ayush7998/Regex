document.addEventListener('DOMContentLoaded', () => {
    const regexInput = document.getElementById('regex-input');
    const paletteBtns = document.querySelectorAll('.palette-btn');
    const visualizeBtn = document.getElementById('visualize-btn');
    const generateBtn = document.getElementById('generate-btn');
    
    // Palette Interaction
    paletteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            insertAtCursor(regexInput, val);
            regexInput.focus();
        });
    });

    function insertAtCursor(myField, myValue) {
        if (myField.selectionStart || myField.selectionStart === '0') {
            const startPos = myField.selectionStart;
            const endPos = myField.selectionEnd;
            myField.value = myField.value.substring(0, startPos) +
                myValue +
                myField.value.substring(endPos, myField.value.length);
            myField.selectionStart = startPos + myValue.length;
            myField.selectionEnd = startPos + myValue.length;
        } else {
            myField.value += myValue;
        }
    }

    const regexEngine = new RegexEngine();
    const visualizer = new Visualizer('nfa-canvas');
    let currentSteps = [];
    let currentStepIndex = -1;
    let playbackInterval = null;

    const playPauseBtn = document.getElementById('play-pause-btn');
    const stepNextBtn = document.getElementById('step-next-btn');
    const stepPrevBtn = document.getElementById('step-prev-btn');
    const speedSlider = document.getElementById('speed-slider');
    const verifyEquivalenceBtn = document.getElementById('verify-equivalence-btn');
    const regexCompareInput = document.getElementById('regex-compare-input');
    const equivalenceResult = document.getElementById('equivalence-result');
    const stringList = document.getElementById('string-list');
    const maxLengthInput = document.getElementById('max-length');
    const stepDescription = document.getElementById('step-description');

    function updateControls() {
        stepPrevBtn.disabled = currentStepIndex <= 0;
        stepNextBtn.disabled = currentStepIndex >= currentSteps.length - 1;
    }

    function renderStep(index) {
        if (index < 0 || index >= currentSteps.length) return;
        currentStepIndex = index;
        const step = currentSteps[index];
        
        visualizer.setStepData(step);
        stepDescription.textContent = `Step ${index + 1}/${currentSteps.length}: ${step.description}`;
        updateControls();
    }

    function togglePlayback() {
        if (playbackInterval) {
            clearInterval(playbackInterval);
            playbackInterval = null;
            playPauseBtn.textContent = '▶';
        } else {
            if (currentStepIndex >= currentSteps.length - 1) {
                currentStepIndex = -1; // reset if at end
            }
            playPauseBtn.textContent = '⏸';
            playbackInterval = setInterval(() => {
                if (currentStepIndex < currentSteps.length - 1) {
                    renderStep(currentStepIndex + 1);
                } else {
                    togglePlayback(); // Stop at end
                }
            }, 2100 - parseInt(speedSlider.value));
        }
    }

    playPauseBtn.addEventListener('click', togglePlayback);

    stepNextBtn.addEventListener('click', () => {
        if (playbackInterval) togglePlayback();
        if (currentStepIndex < currentSteps.length - 1) renderStep(currentStepIndex + 1);
    });

    stepPrevBtn.addEventListener('click', () => {
        if (playbackInterval) togglePlayback();
        if (currentStepIndex > 0) renderStep(currentStepIndex - 1);
    });

    speedSlider.addEventListener('input', () => {
        if (playbackInterval) {
            // Restart interval with new speed
            clearInterval(playbackInterval);
            playbackInterval = setInterval(() => {
                if (currentStepIndex < currentSteps.length - 1) {
                    renderStep(currentStepIndex + 1);
                } else {
                    togglePlayback();
                }
            }, 2100 - parseInt(speedSlider.value));
        }
    });

    visualizeBtn.addEventListener('click', () => {
        const regexStr = regexInput.value.trim();
        if (!regexStr) {
            alert("Please enter a regular expression.");
            return;
        }

        if (playbackInterval) togglePlayback();

        try {
            const nfaData = regexEngine.compile(regexStr);
            if (!nfaData || !nfaData.dfaSteps || nfaData.dfaSteps.length === 0) {
                throw new Error("Compilation failed or produced no steps.");
            }
            
            console.log("Compiled DFA Data:", nfaData);
            currentSteps = nfaData.dfaSteps;
            renderStep(0); // Show first step
            togglePlayback(); // Auto-play
        } catch (e) {
            alert("Error compiling regex: " + e.message);
            console.error(e);
        }
    });

    generateBtn.addEventListener('click', () => {
        const regexStr = regexInput.value.trim();
        if (!regexStr) {
            alert("Please enter a regular expression first.");
            return;
        }
        
        try {
            const nfaData = regexEngine.compile(regexStr, true);
            if (!nfaData) throw new Error("Invalid regular expression");
            
            const maxLength = parseInt(maxLengthInput.value);
            const strings = regexEngine.generateStrings(nfaData.startStateId, nfaData.endStateId, nfaData.states, maxLength);
            
            stringList.innerHTML = '';
            if (strings.length === 0) {
                stringList.innerHTML = '<li class="empty-state">No strings generated.</li>';
            } else {
                strings.forEach(str => {
                    const li = document.createElement('li');
                    li.textContent = str;
                    stringList.appendChild(li);
                });
            }
        } catch (e) {
            alert("Error generating strings: " + e.message);
        }
    });

    verifyEquivalenceBtn.addEventListener('click', () => {
        const r1 = regexInput.value.trim();
        const r2 = regexCompareInput.value.trim();
        
        if (!r1 || !r2) {
            alert("Please provide both regular expressions to compare.");
            return;
        }
        
        equivalenceResult.className = 'result-box'; // reset
        const isEquivalent = regexEngine.checkEquivalence(r1, r2);
        
        if (isEquivalent) {
            equivalenceResult.textContent = `The regular expressions "${r1}" and "${r2}" are EQUIVALENT (they generate the exact same language).`;
            equivalenceResult.classList.add('success');
        } else {
            equivalenceResult.textContent = `The regular expressions "${r1}" and "${r2}" are NOT EQUIVALENT.`;
            equivalenceResult.classList.add('error');
        }
    });
});
