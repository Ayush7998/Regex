class Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.nodes = {}; // id -> {x, y, vx, vy, id, active}
        this.edges = []; // {source, target, label}
        
        this.animationId = null;
        this.isRunning = false;
        
        // Physics constants
        this.repulsion = 4000;
        this.springLength = 120;
        this.springK = 0.15;
        this.damping = 0.4; // Very high friction to settle instantly
        
        this.startLoop();
    }

    setStepData(stepData) {
        // Keep existing nodes to maintain positions
        const newNodes = {};
        for (let id in stepData.states) {
            if (this.nodes[id]) {
                newNodes[id] = this.nodes[id];
                newNodes[id].active = stepData.activeStates.includes(parseInt(id));
                newNodes[id].isEnd = stepData.states[id].isEnd || false;
            } else {
                // Initialize new node near center but slightly random
                newNodes[id] = {
                    id: parseInt(id),
                    x: this.width / 2 + (Math.random() - 0.5) * 50,
                    y: this.height / 2 + (Math.random() - 0.5) * 50,
                    vx: 0,
                    vy: 0,
                    active: stepData.activeStates.includes(parseInt(id)),
                    isEnd: stepData.states[id].isEnd || false
                };
            }
        }
        this.nodes = newNodes;

        // Rebuild edges
        this.edges = [];
        for (let id in stepData.states) {
            const state = stepData.states[id];
            for (let char in state.transitions) {
                const targetIds = state.transitions[char];
                targetIds.forEach(targetId => {
                    this.edges.push({
                        source: parseInt(id),
                        target: targetId,
                        label: char
                    });
                });
            }
        }
    }

    clear() {
        this.nodes = {};
        this.edges = [];
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    startLoop() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.loop();
        }
    }

    stopLoop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    loop() {
        if (!this.isRunning) return;
        
        this.updatePhysics();
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    updatePhysics() {
        const nodeIds = Object.keys(this.nodes);
        if (nodeIds.length === 0) return;

        // Apply Repulsion
        for (let i = 0; i < nodeIds.length; i++) {
            const n1 = this.nodes[nodeIds[i]];
            for (let j = i + 1; j < nodeIds.length; j++) {
                const n2 = this.nodes[nodeIds[j]];
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                let distSq = dx * dx + dy * dy;
                if (distSq === 0) distSq = 0.1;

                const force = this.repulsion / distSq;
                const dist = Math.sqrt(distSq);
                
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                n1.vx += fx;
                n1.vy += fy;
                n2.vx -= fx;
                n2.vy -= fy;
            }
        }

        // Apply Spring Forces (Edges)
        this.edges.forEach(edge => {
            const n1 = this.nodes[edge.source];
            const n2 = this.nodes[edge.target];
            if (!n1 || !n2) return;

            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            
            const force = (dist - this.springLength) * this.springK;
            
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            n1.vx += fx;
            n1.vy += fy;
            n2.vx -= fx;
            n2.vy -= fy;
        });

        // Apply Centering force
        const minId = Math.min(...nodeIds.map(id => parseInt(id)));
        const maxId = Math.max(...nodeIds.map(id => parseInt(id)));
        const idRange = Math.max(1, maxId - minId);

        for (let i = 0; i < nodeIds.length; i++) {
            const n = this.nodes[nodeIds[i]];
            
            // Centering Y strongly to form a linear horizontal pipeline
            const dyCenter = (this.height / 2) - n.y;
            n.vy += dyCenter * 0.1; // Strong pull to center line

            // Strong pull X toward a linear progression based on ID
            const targetX = 100 + ((n.id - minId) / idRange) * (this.width - 200);
            const dxCenter = targetX - n.x;
            n.vx += dxCenter * 0.05;

            // Velocity integration
            n.vx *= this.damping;
            n.vy *= this.damping;
            n.x += n.vx;
            n.y += n.vy;

            // Constrain to bounds
            n.x = Math.max(30, Math.min(this.width - 30, n.x));
            n.y = Math.max(30, Math.min(this.height - 30, n.y));
        }
    }

    drawArrow(fromx, fromy, tox, toy, radius) {
        const headlen = 10;
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        
        const startX = fromx + radius * Math.cos(angle);
        const startY = fromy + radius * Math.sin(angle);
        const endX = tox - radius * Math.cos(angle);
        const endY = toy - radius * Math.sin(angle);

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.fill();

        return { startX, startY, endX, endY, dx: endX - startX, dy: endY - startY };
    }

    drawSelfArrow(x, y, radius) {
        this.ctx.beginPath();
        this.ctx.arc(x, y - radius * 1.5, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        const endX = x + radius * 0.5;
        const endY = y - radius;
        const headlen = 10;
        const angle = 0;
        
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.fill();
        
        return { textX: x, textY: y - radius * 3 };
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        const nodeRadius = 20;

        const edgePairs = {};
        this.edges.forEach(edge => {
            const key = edge.source < edge.target ? `${edge.source}-${edge.target}` : `${edge.target}-${edge.source}`;
            if (!edgePairs[key]) edgePairs[key] = [];
            edgePairs[key].push(edge);
        });

        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let activeNodesExist = Object.values(this.nodes).some(n => n.active);

        Object.values(edgePairs).forEach(pairEdges => {
            const directions = {};
            pairEdges.forEach(e => {
                const dirKey = `${e.source}->${e.target}`;
                if (!directions[dirKey]) directions[dirKey] = [];
                directions[dirKey].push(e.label);
            });

            for (let dirKey in directions) {
                const labels = Array.from(new Set(directions[dirKey])).join(',');
                const [sourceStr, targetStr] = dirKey.split('->');
                const src = this.nodes[sourceStr];
                const tgt = this.nodes[targetStr];

                if (!src || !tgt) continue;

                const isEdgeActive = src.active && tgt.active;

                this.ctx.fillStyle = isEdgeActive ? '#fca5a5' : '#a1a1aa'; // Rose-300 / muted
                this.ctx.strokeStyle = isEdgeActive ? '#f43f5e' : '#52525b'; // Rose-500 / dark border
                this.ctx.lineWidth = isEdgeActive ? 3 : 2;

                if (src.id === tgt.id) {
                    const pos = this.drawSelfArrow(src.x, src.y, nodeRadius);
                    this.ctx.fillStyle = isEdgeActive ? '#ffe4e6' : '#a1a1aa';
                    this.ctx.fillText(labels, pos.textX, pos.textY);
                } else {
                    const pos = this.drawArrow(src.x, src.y, tgt.x, tgt.y, nodeRadius);
                    
                    const midX = src.x + (tgt.x - src.x) / 2;
                    const midY = src.y + (tgt.y - src.y) / 2;
                    
                    const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
                    const offsetX = Math.cos(angle - Math.PI/2) * 15;
                    const offsetY = Math.sin(angle - Math.PI/2) * 15;
                    
                    this.ctx.fillStyle = isEdgeActive ? '#ffe4e6' : '#a1a1aa';
                    this.ctx.fillText(labels, midX + offsetX, midY + offsetY);
                }
            }
        });

        // Draw nodes
        Object.values(this.nodes).forEach(node => {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
            
            if (node.active) {
                this.ctx.fillStyle = 'rgba(245, 158, 11, 0.25)'; // Amber fill
                this.ctx.fill();
                this.ctx.lineWidth = 3;
                this.ctx.strokeStyle = '#fbbf24'; // Amber light border
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#f59e0b'; // Amber glow
            } else {
                this.ctx.fillStyle = '#2d0615'; // Dark rose tint node
                this.ctx.fill();
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = '#881337'; // Rose darker border
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.stroke();

            if (node.isEnd) {
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, nodeRadius - 5, 0, Math.PI * 2);
                this.ctx.strokeStyle = node.active ? '#fde047' : '#f43f5e'; // Yellow inner ring if active, Rose if not
                this.ctx.stroke();
            }

            // ID
            this.ctx.shadowBlur = 0; // reset shadow for text
            this.ctx.fillStyle = node.active ? '#ffffff' : '#a1a1aa';
            this.ctx.font = 'bold 12px Inter';
            this.ctx.fillText(node.id.toString(), node.x, node.y);
        });
    }
}
