# Regex Visualizer 🎨

A powerful, interactive web application for visualizing, minimizing, and testing Regular Expressions. The project converts regular expressions into Non-deterministic Finite Automata (NFA) using Thompson's construction and then into optimized Deterministic Finite Automata (DFA) using Subset Construction, completely rendered dynamically in the browser.

## ✨ Features

### 1. Core Visualization & Construction
* **Regex to DFA Compilation:** Transforms regular expressions into NFA and subsequently into optimized DFA.
* **Step-by-step Canvas:** Visually renders the step-by-step construction of the DFA on an interactive HTML canvas.
* **Animation Controls:** Play, pause, step forward, backward, and adjust the animation speed.
* **DFA Minimization:** Integrates Moore's Algorithm to minimize the constructed DFA, reducing redundant states.
* **Advanced Render Physics:** Dynamic self-loop positioning and curved bidirectional arrows for enhanced spatial clarity.

### 2. String Generation & Simulation
* **Bounded String Generation:** Generate valid strings from the user's regular expression based on max string length.
* **Interactive String Tracing:** Click on any generated string to trigger a complete visual simulation tracing the path taken through the DFA.

### 3. DFA Equivalence Checker
* **Side-by-side Verification:** Input a second regular expression to verify if it generates the exact same language.
* **Dual Canvas Display:** Renders both generated DFAs side-by-side for clear visual comparison.

### 4. User Interface & Experience
* **Professional SPA UX:** Custom single-page application routing with a top-level navigation bar (Home, String Generation, Equivalence Checker, Know More).
* **Quick Input Palette:** UI buttons to quickly insert operands and regex operators.
* **Inline Error Reporting:** Robust, styled inline UI error reporting.
* **Educational Section ('Know More'):** An informational module breaking down core regex operations and compiler logic.
* **Premium 'Aurora Sunset' Theme:** Beautiful dark-mode aesthetic utilizing vibrant contrasting colors for a premium feel.

## 🚀 Getting Started

1. Clone the repository
2. Open `index.html` in your web browser. No local development server or compilation tools required!

## 🛠️ Technology Stack
- **Frontend Core:** Vanilla JavaScript, HTML5, CSS3 
- **Rendering:** HTML Canvas API
- **Fonts & Styling:** Custom "Aurora Sunset" Theme with Google Fonts (Inter)
