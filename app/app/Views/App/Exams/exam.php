<style>
    /* General Styles */
    .body {
        font-family: Arial, sans-serif;
        background-color: #f8f9fa;
        margin: 0;
        padding: 0;
    }

    /* Instruction Container */
    #instruction-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 80vh;
    }

    .mymymycard {
        background: white;
        padding: 30px;
        border-radius: 15px;
        /*box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);*/
        text-align: center;
    }

    .mymymybtn {
        background-color: #FC7024;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: 0.3s;
    }

    .mymymybtn:hover {
        background-color: #e6601c;
    }

    /* Quiz Container */
    .quiz-container {
        display: none;
        gap: 20px;
        background: white;
        padding: 20px;
        border-radius: 10px;
        /*box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);*/
         height: 80vh;
    }

    .quiz-left {
        flex: 1;
        border-right: 2px solid #ddd;
        padding-right: 15px;
    }

    .quiz-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 16px;
        margin-bottom: 10px;
    }

    .question-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-bottom: 15px;
    }

    .question-list button {
        background: #eee;
        border: none;
        padding: 8px;
        cursor: pointer;
        border-radius: 5px;
        font-size: 14px;
    }

    .question-list button.active {
        background: #FC7024;
        color: white;
    }

    .question-content h3 {
        margin-bottom: 5px;
    }

    /* Quiz Right */
    .quiz-right {
        flex: 1;
        padding-left: 15px;
    }

    .options-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 5px;
        cursor: pointer;
    }

    .option:hover {
        background: #f1f1f1;
    }

    /* Navigation Buttons */
    .navigation-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 15px;
    }
</style>
<div class="body">
    <!-- Instructions Section -->
    <div id="instruction-container">
        <div class="card mymymycard">
            <div class="text-center">
                <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/examicon.png" 
                     alt="Exam Icon" style="width: 80px; margin-bottom: 10px;">
                <h4 class="fw-bold">Instructions</h4>
            </div>
            <ul class="list-unstyled mt-3 text-start">
                <li><i class="ri-checkbox-circle-fill text-primary"></i> 4 marks for correct answers, -1 for incorrect ones.</li>
                <li><i class="ri-checkbox-circle-fill text-primary"></i> You can skip questions.</li>
                <li><i class="ri-checkbox-circle-fill text-primary"></i> Finish quiz after confirmation.</li>
                <li><i class="ri-checkbox-circle-fill text-primary"></i> Auto-submit on time expiry.</li>
            </ul>
            <div class="text-center mt-3">
                <button class="btn mymymybtn" id="start-quiz">Start Exam</button>
            </div>
        </div>
    </div>

    <!-- Quiz Container -->
    <div id="quiz-container" class="quiz-container">
        <div class="quiz-left">
            <div class="quiz-header">
                <span>Que: <strong id="question-number">1/10</strong></span>
                <div class="time-indicator">⏳ <span id="timer">10:00</span> mins</div>
            </div>
            <div id="question-list" class="question-list"></div>
            <div class="question-content">
                <h3><strong id="question-title"></strong></h3>
                <p id="question-text"></p>
            </div>
        </div>
        <div class="quiz-right">
            <h3>Choose Options</h3>
            <div id="options-container" class="options-container"></div>
            <div class="navigation-buttons">
                <button id="prev-btn" class="btn mymymybtn" disabled>&lt; Prev</button>
                <button id="next-btn" class="btn mymymybtn">Next &gt;</button>
            </div>
        </div>
    </div>

    <!-- Bootstrap 5 Modal -->
    <div class="modal fade" id="completion-modal" tabindex="-1" aria-labelledby="completionModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content p-4 text-center">
                <div class="modal-header border-0">
                    <h2 class="modal-title fw-bold" id="completionModalLabel">Quiz Completed!</h2>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Click below to return to the dashboard.</p>
                    <a href="<?= base_url('app/dashboard/index') ?>" class="btn mymymybtn">Go to Dashboard</a>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    const questions = [
        { title: "Que 1", text: "What is 2 + 2?", options: ["2", "4", "5", "3"], answer: "4" },
        { title: "Que 2", text: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Venus", "Jupiter"], answer: "Mars" },
        { title: "Que 3", text: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Lisbon"], answer: "Paris" }
    ];

    let currentQuestionIndex = 0;

    document.getElementById("start-quiz").addEventListener("click", function() {
        document.getElementById("instruction-container").style.display = "none";
        document.getElementById("quiz-container").style.display = "flex";
        loadQuestion();
    });

    document.getElementById("next-btn").addEventListener("click", function() {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            loadQuestion();
        } else {
            var completionModal = new bootstrap.Modal(document.getElementById('completion-modal'));
            completionModal.show();
        }
    });

    document.getElementById("prev-btn").addEventListener("click", function() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion();
        }
    });

    function loadQuestion() {
        const questionData = questions[currentQuestionIndex];
        document.getElementById("question-number").textContent = `${currentQuestionIndex + 1}/${questions.length}`;
        document.getElementById("question-title").textContent = questionData.title;
        document.getElementById("question-text").textContent = questionData.text;

        const optionsContainer = document.getElementById("options-container");
        optionsContainer.innerHTML = "";

        questionData.options.forEach((option, index) => {
            optionsContainer.innerHTML += `<label class="option"><input type="radio" name="question">${option}</label>`;
        });

        // Enable or disable Previous button based on the question index
        document.getElementById("prev-btn").disabled = currentQuestionIndex === 0;
        document.getElementById("next-btn").textContent = (currentQuestionIndex === questions.length - 1) ? "Finish" : "Next >";
    }
</script>