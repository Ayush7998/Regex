document.addEventListener('DOMContentLoaded', () => {
    const regexInput = document.getElementById('regex-input');
    const paletteBtns = document.querySelectorAll('.palette-btn');
    const visualizeBtn = document.getElementById('visualize-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
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
    let currentUnminimizedDfa = null;

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
        const errorMsg = document.getElementById('home-error');
        errorMsg.style.display = 'none';

        if (!regexStr) {
            errorMsg.textContent = "Please input a regular expression.";
            errorMsg.style.display = 'block';
            return;
        }

        if (playbackInterval) togglePlayback();

        try {
            const nfaData = regexEngine.compile(regexStr, false, false);
            if (!nfaData || !nfaData.dfaSteps || nfaData.dfaSteps.length === 0) {
                throw new Error("Compilation failed or produced no steps.");
            }
            
            console.log("Compiled DFA Data:", nfaData);
            currentUnminimizedDfa = nfaData.lastDfa;
            currentSteps = nfaData.dfaSteps;
            minimizeBtn.style.display = 'inline-block';
            
            renderStep(0); // Show first step
            togglePlayback(); // Auto-play
        } catch (e) {
            errorMsg.textContent = e.message;
            errorMsg.style.display = 'block';
            console.error(e);
        }
    });

    minimizeBtn.addEventListener('click', () => {
        if (!currentUnminimizedDfa) return;
        
        if (playbackInterval) togglePlayback();
        
        if (currentStepIndex < currentSteps.length - 1) {
            renderStep(currentSteps.length - 1);
        }
        
        try {
            regexEngine.minimizeDfa(currentUnminimizedDfa, false);
            currentSteps = regexEngine.dfaSteps;
            minimizeBtn.style.display = 'none';
            currentUnminimizedDfa = null;
            
            renderStep(currentSteps.length - 1);
        } catch (e) {
            console.error("Minimization failed", e);
        }
    });

    generateBtn.addEventListener('click', () => {
        const regexStr = regexInput.value.trim();
        const errorMsg = document.getElementById('string-gen-error');
        errorMsg.style.display = 'none';

        if (!regexStr) {
            errorMsg.textContent = "Please input a regular expression.";
            errorMsg.style.display = 'block';
            return;
        }
        
        try {
            const nfaData = regexEngine.compile(regexStr, true);
            if (!nfaData) throw new Error("Invalid regular expression syntax.");
            
            const maxLength = parseInt(maxLengthInput.value);
            const strings = regexEngine.generateStrings(nfaData.startStateId, nfaData.endStateId, nfaData.states, maxLength);
            
            stringList.innerHTML = '';
            if (strings.length === 0) {
                stringList.innerHTML = '<li class="empty-state">No strings generated.</li>';
            } else {
                strings.forEach(str => {
                    const li = document.createElement('li');
                    li.textContent = str;
                    li.title = "Click to simulate this string on the DFA";
                    li.addEventListener('click', () => {
                        simulateStringOnDfa(str, regexStr);
                    });
                    stringList.appendChild(li);
                });
            }
        } catch (e) {
            errorMsg.textContent = e.message;
            errorMsg.style.display = 'block';
        }
    });

    const visualizerStrgen = new Visualizer('nfa-canvas-strgen');
    let currentStepsStrgen = [];
    let currentStepIndexStrgen = -1;
    let playbackIntervalStrgen = null;

    const playPauseBtnStrgen = document.getElementById('play-pause-btn-strgen');
    const stepNextBtnStrgen = document.getElementById('step-next-btn-strgen');
    const stepPrevBtnStrgen = document.getElementById('step-prev-btn-strgen');
    const speedSliderStrgen = document.getElementById('speed-slider-strgen');
    const stepDescriptionStrgen = document.getElementById('step-description-strgen');
    const strgenVisualizationModule = document.getElementById('strgen-visualization-module');

    function updateControlsStrgen() {
        stepPrevBtnStrgen.disabled = currentStepIndexStrgen <= 0;
        stepNextBtnStrgen.disabled = currentStepIndexStrgen >= currentStepsStrgen.length - 1;
    }

    function renderStepStrgen(index) {
        if (index < 0 || index >= currentStepsStrgen.length) return;
        currentStepIndexStrgen = index;
        const step = currentStepsStrgen[index];
        
        visualizerStrgen.setStepData(step);
        stepDescriptionStrgen.textContent = `Step ${index + 1}/${currentStepsStrgen.length}: ${step.description}`;
        updateControlsStrgen();
    }

    function togglePlaybackStrgen() {
        if (playbackIntervalStrgen) {
            clearInterval(playbackIntervalStrgen);
            playbackIntervalStrgen = null;
            playPauseBtnStrgen.textContent = '▶';
        } else {
            if (currentStepIndexStrgen >= currentStepsStrgen.length - 1) {
                currentStepIndexStrgen = -1;
            }
            playPauseBtnStrgen.textContent = '⏸';
            playbackIntervalStrgen = setInterval(() => {
                if (currentStepIndexStrgen < currentStepsStrgen.length - 1) {
                    renderStepStrgen(currentStepIndexStrgen + 1);
                } else {
                    togglePlaybackStrgen();
                }
            }, 2100 - parseInt(speedSliderStrgen.value));
        }
    }

    playPauseBtnStrgen.addEventListener('click', togglePlaybackStrgen);

    stepNextBtnStrgen.addEventListener('click', () => {
        if (playbackIntervalStrgen) togglePlaybackStrgen();
        if (currentStepIndexStrgen < currentStepsStrgen.length - 1) renderStepStrgen(currentStepIndexStrgen + 1);
    });

    stepPrevBtnStrgen.addEventListener('click', () => {
        if (playbackIntervalStrgen) togglePlaybackStrgen();
        if (currentStepIndexStrgen > 0) renderStepStrgen(currentStepIndexStrgen - 1);
    });

    speedSliderStrgen.addEventListener('input', () => {
        if (playbackIntervalStrgen) {
            clearInterval(playbackIntervalStrgen);
            playbackIntervalStrgen = setInterval(() => {
                if (currentStepIndexStrgen < currentStepsStrgen.length - 1) {
                    renderStepStrgen(currentStepIndexStrgen + 1);
                } else {
                    togglePlaybackStrgen();
                }
            }, 2100 - parseInt(speedSliderStrgen.value));
        }
    });

    let currentSimStr = null;
    let currentSimRegex = null;

    function simulateStringOnDfa(str, regexStr, doMinimize = false) {
        if (playbackIntervalStrgen) togglePlaybackStrgen();
        
        currentSimStr = str;
        currentSimRegex = regexStr;
        
        const minimizeBtnStrgen = document.getElementById('minimize-btn-strgen');
        if (minimizeBtnStrgen) {
            minimizeBtnStrgen.style.display = doMinimize ? 'none' : 'inline-block';
        }

        try {
            const nfaData = regexEngine.compile(regexStr, false, doMinimize); 
            if (!nfaData || !nfaData.dfaSteps || nfaData.dfaSteps.length === 0) {
                throw new Error("Could not retrieve DFA data for simulation.");
            }
            
            const finalDfaStep = nfaData.dfaSteps[nfaData.dfaSteps.length - 1];
            const simSteps = [];
            
            const actualStr = (str === "ε (Empty String)") ? "" : str;
            let currentStateId = 0; 
            
            simSteps.push({
                description: `Start simulating string "${actualStr}". Initial state ${currentStateId}.`,
                states: finalDfaStep.states,
                activeStates: [currentStateId]
            });
            
            for (let i = 0; i < actualStr.length; i++) {
                const char = actualStr[i];
                const stateObj = finalDfaStep.states[currentStateId];
                
                if (stateObj && stateObj.transitions[char] && stateObj.transitions[char].length > 0) {
                    currentStateId = stateObj.transitions[char][0];
                } else {
                    currentStateId = -1;
                    break;
                }
                
                simSteps.push({
                    description: `Consumed '${char}', moved to state ${currentStateId}.`,
                    states: finalDfaStep.states,
                    activeStates: [currentStateId]
                });
            }
            
            if (currentStateId !== -1) {
                const isAccepted = finalDfaStep.states[currentStateId].isEnd;
                simSteps.push({
                    description: `Finished simulating "${actualStr}". String is ${isAccepted ? 'ACCEPTED' : 'REJECTED'}.`,
                    states: finalDfaStep.states,
                    activeStates: [currentStateId]
                });
            } else {
                simSteps.push({
                    description: `DFA crashed while traversing. String is REJECTED.`,
                    states: finalDfaStep.states,
                    activeStates: []
                });
            }
            
            currentStepsStrgen = simSteps;
            strgenVisualizationModule.style.display = 'block';
            renderStepStrgen(0);
            togglePlaybackStrgen();
            
            strgenVisualizationModule.scrollIntoView({ behavior: 'smooth' });
        } catch (e) {
            alert("Error simulating string: " + e.message);
            console.error(e);
        }
    }

    const minimizeBtnStrgen = document.getElementById('minimize-btn-strgen');
    if (minimizeBtnStrgen) {
        minimizeBtnStrgen.addEventListener('click', () => {
            if (currentSimStr !== null && currentSimRegex) {
                simulateStringOnDfa(currentSimStr, currentSimRegex, true);
            }
        });
    }

    verifyEquivalenceBtn.addEventListener('click', () => {
        const r1 = regexInput.value.trim();
        const r2 = regexCompareInput.value.trim();
        
        equivalenceResult.className = 'result-box'; // reset

        if (!r1 || !r2) {
            equivalenceResult.textContent = "Please provide both regular expressions to compare.";
            equivalenceResult.classList.add('error');
            const dcc = document.getElementById('dual-canvas-container');
            if (dcc) dcc.style.display = 'none';
            return;
        }
        
        const isEquivalent = regexEngine.checkEquivalence(r1, r2);
        
        if (isEquivalent) {
            equivalenceResult.textContent = `The regular expressions "${r1}" and "${r2}" are EQUIVALENT (they generate the exact same language).`;
            equivalenceResult.classList.add('success');
        } else {
            equivalenceResult.textContent = `The regular expressions "${r1}" and "${r2}" are NOT EQUIVALENT.`;
            equivalenceResult.classList.add('error');
        }

        const dualCanvasContainer = document.getElementById('dual-canvas-container');
        document.getElementById('eq-title-1').textContent = `Regex 1: ${r1}`;
        document.getElementById('eq-title-2').textContent = `Regex 2: ${r2}`;

        try {
            const data1 = regexEngine.compile(r1, false, true); 
            const data2 = regexEngine.compile(r2, false, true);
            
            if (data1 && data2 && data1.dfaSteps && data2.dfaSteps) {
                const vis1 = new Visualizer('nfa-canvas-eq1');
                const vis2 = new Visualizer('nfa-canvas-eq2');
                
                vis1.setStepData(data1.dfaSteps[data1.dfaSteps.length - 1]);
                vis2.setStepData(data2.dfaSteps[data2.dfaSteps.length - 1]);
                
                dualCanvasContainer.style.display = 'flex';
            } else {
                dualCanvasContainer.style.display = 'none';
            }
        } catch (e) {
            console.error("Could not visualize DFAs for equivalence", e);
            dualCanvasContainer.style.display = 'none';
        }
    });

    // Navigation Logic
    const navBtns = document.querySelectorAll('.nav-btn');
    const pagePanes = document.querySelectorAll('.page-pane');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            pagePanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
});
