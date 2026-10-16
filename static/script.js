

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const taskType = $("taskType");
    const problemInput = $("problemInput");
    const submitBtn = $("submitBtn");
    const submitText = $("submitText");
    const submitIcon = $("submitIcon");
    const clearBtn = $("clearBtn");
    const copyBtn = $("copyBtn");
    const healthBtn = $("healthBtn");
    const answerOutput = $("answerOutput");
    const emptyState = $("emptyState");
    const characterCount = $("characterCount");
    const toast = $("toast");

    // Check that the HTML IDs match the JavaScript.
    const required = {
        taskType, problemInput, submitBtn, submitText, submitIcon,
        clearBtn, copyBtn, healthBtn, answerOutput, emptyState,
        characterCount, toast
    };

    const missing = Object.entries(required)
        .filter(([, element]) => !element)
        .map(([id]) => id);

    if (missing.length) {
        console.error("FixTrail missing HTML elements:", missing);
        return;
    }

    let lastAnswer = "";
    let toastTimer;

    const taskNames = {
        generate: "Write a new Python program",
        debug: "Debug existing Python code",
        explain: "Explain Python code or a concept",
        review: "Review existing Python code"
    };

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(
            () => toast.classList.remove("show"), 3500
        );
    }

    function setConnection(state, title, message) {
        const dot = $("connectionDot");
        const heading = $("connectionTitle");
        const description = $("connectionText");

        if (dot) dot.className = "status-dot " + state;
        if (heading) heading.textContent = title;
        if (description) description.textContent = message;
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function renderAnswer(text) {
        const codeBlocks = [];

        let html = escapeHTML(text).replace(
            /```([a-zA-Z0-9_+-]*)[ \t]*\n?([\s\S]*?)```/g,
            (_, language, code) => {
                const index = codeBlocks.length;
                codeBlocks.push(
                    `<pre><code>${code.trimEnd()}</code></pre>`
                );
                return `@@FIXTRAIL_CODE_${index}@@`;
            }
        );

        html = html
            .replace(/`([^`\n]+)`/g, "<code>$1</code>")
            .replace(/^### (.+)$/gm,
                '<div class="answer-heading">$1</div>')
            .replace(/^## (.+)$/gm,
                '<div class="answer-heading">$1</div>')
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

        html = html.split(/\n{2,}/).map(block => {
            const part = block.trim();
            if (!part) return "";

            if (
                /^@@FIXTRAIL_CODE_\d+@@$/.test(part) ||
                part.startsWith("<pre>") ||
                part.startsWith('<div class="answer-heading">')
            ) {
                return part;
            }

            const lines = part.split("\n");

            if (lines.every(line => /^\s*[-*] /.test(line))) {
                return "<ul>" + lines.map(line =>
                    `<li>${line.replace(/^\s*[-*] /, "")}</li>`
                ).join("") + "</ul>";
            }

            return `<p>${part.replace(/\n/g, "<br>")}</p>`;
        }).join("");

        return html.replace(
            /@@FIXTRAIL_CODE_(\d+)@@/g,
            (_, index) => codeBlocks[Number(index)] || ""
        );
    }

    function displayAnswer(answer, isError = false) {
        lastAnswer = answer;
        emptyState.classList.add("hidden");
        answerOutput.classList.remove("hidden");

        answerOutput.innerHTML = isError
            ? `<div class="error-message">${escapeHTML(answer)}</div>`
            : renderAnswer(answer);

        copyBtn.disabled = !answer;
    }

    function setCheck(name, status, message, label) {
        const text = $(name + "Text");
        const state = $(name + "State");
        const icon = $(name + "Icon");
        const row = text?.closest(".check-row");

        if (!text || !state || !icon || !row) return;

        row.classList.remove("passed", "failed");
        if (status === "passed") row.classList.add("passed");
        if (status === "failed") row.classList.add("failed");

        text.textContent = message;
        state.textContent = label;
        icon.textContent =
            status === "passed" ? "✓" :
            status === "failed" ? "!" : "⌁";
    }

    function resetVerification() {
        const badge = $("verificationBadge");

        if (badge) {
            badge.textContent = "Not connected";
            badge.className = "status-pill status-pending";
        }

        setCheck("syntax", "pending",
            "Waiting for verification engine", "Pending");
        setCheck("analysis", "pending",
            "Static analysis not connected", "Pending");
        setCheck("tests", "pending",
            "No test results available", "Pending");

        const note = $("verificationNote");
        if (note) {
            note.textContent =
                "Verification is not connected yet. AI-generated code is not automatically considered correct.";
        }
    }

    function applyVerification(verification) {
        if (!verification || typeof verification !== "object") {
            resetVerification();
            return;
        }

        const checks = [
            ["syntax", verification.syntax],
            ["analysis", verification.analysis],
            ["tests", verification.tests]
        ];

        let hasResults = false;
        let hasFailure = false;
        let allPassed = true;

        for (const [name, result] of checks) {
            if (!result || typeof result !== "object") {
                setCheck(name, "pending",
                    "No result supplied by backend", "Pending");
                allPassed = false;
                continue;
            }

            const rawStatus = String(result.status || "").toLowerCase();
            const status = ["passed", "failed"].includes(rawStatus)
                ? rawStatus : "pending";

            const message = typeof result.message === "string"
                ? result.message : "No details provided";

            const label = status === "passed" ? "Passed"
                : status === "failed" ? "Failed" : "Pending";

            setCheck(name, status, message, label);

            if (status !== "pending") hasResults = true;
            if (status === "failed") hasFailure = true;
            if (status !== "passed") allPassed = false;
        }

        const badge = $("verificationBadge");
        if (!badge) return;

        if (!hasResults) {
            badge.textContent = "Pending";
            badge.className = "status-pill status-pending";
        } else if (hasFailure) {
            badge.textContent = "Issues found";
            badge.className = "status-pill status-failed";
        } else if (allPassed) {
            badge.textContent = "Checks passed";
            badge.className = "status-pill status-passed";
        } else {
            badge.textContent = "Partially checked";
            badge.className = "status-pill status-pending";
        }
    }

    async function checkHealth(showMessage = false) {
        setConnection("", "Checking local AI...",
            "Checking Ollama and Gemma");

        try {
            const response = await fetch("/api/health", {
                headers: { "Accept": "application/json" },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Health check HTTP " + response.status);
            }

            const data = await response.json();
            const ollama = data.ollama?.available === true;
            const model = data.model?.available === true;

            if (ollama && model) {
                setConnection("online", "Local Gemma connected",
                    data.model.message || "Gemma is ready");
                if (showMessage) showToast("Local Gemma is ready.");
            } else if (ollama) {
                setConnection("offline", "Gemma unavailable",
                    data.model?.message || "Install the Gemma model first.");
                if (showMessage) showToast(
                    data.model?.message || "Gemma is unavailable.");
            } else {
                setConnection("offline", "Ollama unavailable",
                    data.ollama?.message || "Start the Ollama app.");
                if (showMessage) showToast(
                    data.ollama?.message || "Ollama is unavailable.");
            }
        } catch (error) {
            console.error("FixTrail health check:", error);
            setConnection("offline", "Backend unavailable",
                "Open FixTrail through the Flask server.");
            if (showMessage) showToast(
                "Cannot reach Flask. Check the terminal.");
        }
    }

    async function submitTask() {
        console.log("FixTrail: Find a Solution clicked");

        const requestText = problemInput.value.trim();

        if (!requestText) {
            showToast("Please describe your Python task first.");
            problemInput.focus();
            return;
        }

        const selectedTask =
            taskNames[taskType.value] || taskNames.generate;

        const combinedProblem =
            `Task type: ${selectedTask}.\n` +
            "Follow the requested task. Do not invent errors in code that was not supplied.\n\n" +
            `User's request:\n${requestText}`;

        submitBtn.disabled = true;
        submitText.textContent = "Working...";
        submitIcon.textContent = "◌";

        resetVerification();
        emptyState.classList.add("hidden");
        answerOutput.classList.remove("hidden");
        answerOutput.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <div>
                    <strong>FixTrail is thinking...</strong>
                    <div class="privacy-note">
                        Waiting for local Gemma. No internet connection is needed.
                    </div>
                </div>
            </div>`;

        copyBtn.disabled = true;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(
                () => controller.abort(), 200000);

            let response;

            try {
                response = await fetch("/api/troubleshoot", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ problem: combinedProblem }),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeout);
            }

            const raw = await response.text();
            let data;

            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                throw new Error(
                    `Server returned an invalid response (HTTP ${response.status}). Check the Flask terminal.`
                );
            }

            if (!response.ok) {
                throw new Error(data.error ||
                    `Request failed (HTTP ${response.status}).`);
            }

            if (typeof data.answer !== "string" ||
                !data.answer.trim()) {
                console.error("Unexpected API response:", data);
                throw new Error(
                    "The server returned no answer. Check model.py and the Flask terminal."
                );
            }

            displayAnswer(data.answer);
            applyVerification(data.verification);
            showToast("Solution received.");

        } catch (error) {
            console.error("FixTrail solution request failed:", error);

            const message = error.name === "AbortError"
                ? "Gemma took too long to respond. Make sure Ollama is running."
                : error.message ||
                  "Request failed. Check the Flask terminal.";

            displayAnswer(message, true);
            resetVerification();
            showToast(message);

        } finally {
            submitBtn.disabled = false;
            submitText.textContent = "Ask FixTrail AI";
            submitIcon.textContent = "✦";
        }
    }

    problemInput.addEventListener("input", () => {
        characterCount.textContent =
            `${problemInput.value.length.toLocaleString()} characters`;
    });

    submitBtn.addEventListener("click", submitTask);

    problemInput.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            submitTask();
        }
    });

    clearBtn.addEventListener("click", () => {
        problemInput.value = "";
        characterCount.textContent = "0 characters";
        lastAnswer = "";

        answerOutput.classList.add("hidden");
        answerOutput.textContent = "";
        emptyState.classList.remove("hidden");
        copyBtn.disabled = true;

        resetVerification();
        problemInput.focus();
    });

    copyBtn.addEventListener("click", async () => {
        if (!lastAnswer) return;

        try {
            await navigator.clipboard.writeText(lastAnswer);
            showToast("Response copied.");
        } catch {
            showToast("Clipboard unavailable. Copy the answer manually.");
        }
    });

    healthBtn.addEventListener("click", () => checkHealth(true));

    $("newTaskBtn")?.addEventListener("click", () => {
        clearBtn.click();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("focusEditorBtn")?.addEventListener("click", () => {
        $("editorPanel")?.scrollIntoView({
            behavior: "smooth", block: "start"
        });
        problemInput.focus({ preventScroll: true });
    });

    $("focusResultsBtn")?.addEventListener("click", () => {
        $("verificationPanel")?.scrollIntoView({
            behavior: "smooth", block: "center"
        });
    });

    document.querySelectorAll(".example-prompt").forEach(button => {
        button.addEventListener("click", () => {
            problemInput.value = button.dataset.prompt || "";

            if (taskType) {
                taskType.value = button.dataset.type || "generate";
            }

            characterCount.textContent =
                `${problemInput.value.length.toLocaleString()} characters`;

            problemInput.focus();
            $("editorPanel")?.scrollIntoView({
                behavior: "smooth", block: "start"
            });
        });
    });

    resetVerification();
    checkHealth();
});
