<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QUIZ APP</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .poppins-font {
            font-family: 'Poppins', sans-serif;
        }
        .correct-answer {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
        }
        .question-card {
            margin-bottom: 1.5rem;
            border: 1px solid #dee2e6;
            border-radius: 0.375rem;
        }
        .option-label {
            width: 30px;
            display: inline-block;
            font-weight: bold;
        }
        .custom-gradient {
          background: linear-gradient(45deg, #286937, #0c9c3c,#42ff6e);
        }
        /* Option States */
        .option {
            cursor: pointer;
            transition: all 0.2s ease;
            background-color: #f8f9fa;
        }
        .option:hover {
            background-color: #e9ecef;
        }
        .option.selected {
            background-color: #e9ecef;
            border-left: 4px solid #6c757d;
        }
        .option.correct-answer {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
        }
        .option.incorrect-answer {
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
        }
        .option.disabled {
            pointer-events: none;
            opacity: 0.7;
        }
        
        /* Feedback Text */
        .feedback-correct {
            color: #28a745;
        }
        .feedback-incorrect {
            color: #dc3545;
        }
        
        /* Timer styling */
         .shake {
            animation: shake-animation 3s forwards;
            
        }

        @keyframes shake-animation {
            0% { transform: translateX(0); color:orange;}
            25% { transform: translateX(-5px) rotate(-5deg); color:red; }
            50% { transform: translateX(5px) rotate(5deg); color:red; }
            75% { transform: translateX(-5px) rotate(-5deg); color:black; }
            100% { transform: translateX(0); }
        }
        
        .timer-container {
          font-size: 1.5rem;
          font-weight: bold;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 5px;
          text-align: center;
          margin-bottom: 20px;
        }
        
        /* Time warning states */
        .timer-warning {
          color: #ff9800; /* Orange */
        }
        
        .timer-danger {
          color: #f44336; /* Red */
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        /* Popup styling */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.7);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .popup-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          text-align: center;
          max-width: 400px;
        }
        
       .slide-right-once {
            animation: slideRightCenter 0.5s ease-out forwards; /* Adjust duration as needed */
        }
        
        @keyframes slideRightCenter {
            0% { transform: translate(-50%, -50%) translateX(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) translateX(50px); opacity: 1; } /* Adjust the distance */
        }
        
    </style>
</head>

<body class="poppins-font">
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card shadow main-div">
                    <div class="custom-gradient card-header bg-primary text-white">
                        <h3 class="my-4 text-center"><span class="fw-bold">GEN AI</span> QUIZ APP</h3>
                    </div>
                    <div class="card-body">
                        <form id="mcqForm">
                            <div class="mb-3">
                                <label for="course" class="form-label">Course</label>
                                <select class="form-select" id="course" required>
                                    <option value="" selected disabled>Select Course</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Electrical Engineering">Electrical Engineering</option>
                                    <option value="Medicine">Medicine</option>
                                    <option value="Business Administration">Business Administration</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="subject" class="form-label">Subject</label>
                                <select class="form-select" id="subject" required>
                                    <option value="" selected disabled>Select Subject</option>
                                    <!-- Subjects will be populated via JavaScript -->
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="numQuestions" class="form-label">Number of Questions</label>
                                <input type="number" class="form-control" id="numQuestions" min="1" max="20" value="5" required>
                            </div>
                            
                            <button type="submit" class="custom-gradient btn w-100">
                                <span id="submitText" class="text-light fw-bold text-uppercase rounded-pill" style="letter-spacing: 0.05em;">Generate MCQs</span>
                                <div id="spinner" class="spinner-border spinner-border-sm d-none text-light" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </button>
                        </form>
                    </div>
                </div>
                
                <!-- Results Section -->
                <div id="results" class="mt-4 d-none">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>Generated Questions</h4>
                        <!--<button id="copyBtn" class="btn btn-sm btn-outline-secondary">-->
                        <!--    <i class="bi bi-clipboard"></i> Copy All-->
                        <!--</button>-->
                        <!-- Timer display -->
                        <div class="timer-container">
                          <span id="timer">START</span>
                        </div>
                    </div>
                    <div id="questionsContainer"></div>
                    <div id="questionsContainer"></div>
                        <button id="exportButton" class="btn btn-success w-100 mt-3 fw-bold rounded-pill border-0">Export to PDF</button>
                        <button id="submitQuizBtn" class="btn btn-danger w-100 mt-3 fw-bold rounded-pill border-0">Quit Quiz</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="modal fade" id="resultsModal" tabindex="-1" aria-labelledby="timeUpModalLabel" aria-hidden="true"  data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header custom-gradient bg-primary text-white text-center position-relative">
                    <i class="bi bi-clock d-block fs-3 ms-2 shake"></i>
                    <div class="fs-2 text-uppercase poppins-font fst-italic slide-right-once position-absolute top-50 start-50 translate-middle">The time is up!</div>
                    <br>
                </div>
                <div class="modal-body text-center poppins-font">
                    <div class="fs-2 fw-bold mb-2">Your Score</div>
                    <div id="finalScore" class="fs-1 text-success fw-bold"></div>
                    <div id="correctAnswers" class="mt-2"></div>
                    <div id="incorrectAnswers"></div>
                </div>
                
                <div class="modal-footer justify-content-center">
                    <button type="button" class="btn custom-gradient px-4 text-white fw-bold rounded-pill border-0" id="returnToQuizForm">New Quiz</button>
                    <button type="button" class="btn custom-gradient px-4 text-white fw-bold rounded-pill border-0" data-bs-dismiss="modal" aria-label="Close">View Results</button>

                </div>
            </div>
        </div>
    </div>

    <script>
        // SUBJECT MAPPING: CREATE A VARIABLE, ASSIGN OBJECT HAVING KEY=COURSE_NAME & VALUE=SUBJECTS
        const subjectMap = {
            "Computer Science": ["Data Structures", "Algorithms", "Database Systems", "Operating Systems"],
            "Electrical Engineering": ["Circuit Theory", "Electromagnetics", "Power Systems", "Control Systems"],
            "Medicine": ["Anatomy", "Physiology", "Pharmacology", "Pathology"],
            "Business Administration": ["Marketing", "Finance", "Operations", "Human Resources"]
        };

        // Dynamic subject dropdown
        // CHANGE ADDEVENT LISTENER
        document.getElementById('course').addEventListener('change', function() {
            const subjectSelect = document.getElementById('subject');
            subjectSelect.innerHTML = '<option value="" selected disabled>Select Subject</option>';
            
            if (this.value) {
                subjectMap[this.value].forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                });
            }
        });
        // ... (your subjectMap and event listener for course dropdown) ...

        // Global Declaration
        let correctAnsCount = 0;
        let incorrectAnsCount = 0;
        let totalQuestions = 0; // To store the total number of questions
        let timerInterval; // Declare timerInterval outside functions
        const timerDisplay = document.getElementById('timer');

        // Form submission
        document.getElementById('mcqForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.querySelector('#mcqForm button');
            const submitText = document.getElementById('submitText');
            const spinner = document.getElementById('spinner');

            submitBtn.disabled = true;
            submitText.textContent = 'Generating...';
            spinner.classList.remove('d-none');

            try {
                const response = await fetch('<?= base_url('VK_quiz/generate') ?>', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: new URLSearchParams({
                        course: document.getElementById('course').value,
                        subject: document.getElementById('subject').value,
                        numQuestions: document.getElementById('numQuestions').value
                    })
                });

                const data = await response.json();

                if (!response.ok || data.status === 'error') {
                    throw new Error(data.message || 'Failed to generate questions');
                }

                // Reset counters for a new quiz
                correctAnsCount = 0;
                incorrectAnsCount = 0;
                totalQuestions = data.questions ? data.questions.length : 0; // Set total questions
                
                //calculate time based on criterias
                const secondsForEachQuestion = 60;
                const questionBasedTime = totalQuestions*secondsForEachQuestion;
                
                document.getElementById('results').classList.remove('d-none');
                renderQuestions(data.questions || []);
                startTimer(questionBasedTime); // Start the timer after questions are rendered

            } catch (error) {
                alert('Error: ' + error.message);
                console.error(error);
            } finally {
                submitBtn.disabled = false;
                submitText.textContent = 'Generate MCQs';
                spinner.classList.add('d-none');
            }
        });

        

        // Store the original click handler so we can remove it later
        const handleOptionClick = function() {
            const isCorrect = this.dataset.isCorrect === 'true';
            const questionIndex = this.dataset.questionIndex;
            const optionsContainer = document.getElementById(`options-${questionIndex}`);

            if (optionsContainer.dataset.answered === "true") return;

            optionsContainer.dataset.answered = "true";

            // Clear previous selections
            document.querySelectorAll(`#options-${questionIndex} .option`).forEach(opt => {
                opt.classList.remove('selected', 'correct-answer', 'incorrect-answer');
            });

            // Mark selected option
            this.classList.add('selected');

            // Apply correctness classes and update counters
            if (isCorrect) {
                correctAnsCount++;
                this.classList.add('correct-answer');
                document.getElementById(`feedback-${questionIndex}`).innerHTML =
                    '<span class="feedback-correct">Correct!</span>';
            } else {
                incorrectAnsCount++;
                this.classList.add('incorrect-answer');
                const correctOption = document.querySelector(
                    `#options-${questionIndex} .option[data-is-correct="true"]`
                );
                correctOption.classList.add('correct-answer');

                document.getElementById(`feedback-${questionIndex}`).innerHTML = `
                    <span class="feedback-incorrect">
                        Incorrect! The correct answer is ${correctOption.querySelector('.option-label').textContent}
                    </span>
                `;
            }

            document.getElementById(`feedback-${questionIndex}`).classList.remove('d-none');

            // Disable all options for the answered question
            document.querySelectorAll(`#options-${questionIndex} .option`).forEach(opt => {
                opt.classList.add('disabled');
            });
            // Remove the click listener after an answer is selected (optional, but prevents double clicks)
            this.removeEventListener('click', handleOptionClick);
        };

        // Attach the event listener to options after they are rendered
        function attachOptionListeners() {
            document.querySelectorAll('.option').forEach(option => {
                option.addEventListener('click', handleOptionClick);
            });
        }

        // TIMER
        function startTimer(duration) {
            let timeLeft = duration;

            timerInterval = setInterval(function() {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;

                timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                if (--timeLeft < 0) {
                    clearInterval(timerInterval);
                    timerDisplay.textContent = "Time's up!";
                    disableOptionClicks();
                    showResultsModal(); // Show results when timer ends
                }
            }, 1000);
        }
        
        function disableOptionClicks() {
            document.querySelectorAll('.option').forEach(option => {
                option.classList.add('disabled');
                option.removeEventListener('click', handleOptionClick);
            });
        }
        
        function showResultsModal() {
            const resultsModalElement = document.getElementById('resultsModal');
            if (resultsModalElement) {
                const resultsModal = new bootstrap.Modal(resultsModalElement, {
                    backdrop: 'static',
                    keyboard: false
                });
                showFinalResults(); // Calculate and display results
                resultsModal.show(); // Show the results modal
            } else {
                console.error("Error: The modal element with ID 'resultsModal' was not found.");
            }
        }

        document.getElementById('submitQuizBtn').addEventListener('click', () => {
                        console.log('Quit Quiz button clicked!'); // Add this line

            clearInterval(timerInterval); // Stop the timer if it's running
            timerDisplay.textContent = "Quiz Ended";
            disableOptionClicks();
            showResultsModal(); // Show the results modal
        });
        
        // function disableQuiz() {
        //     document.querySelectorAll('.option').forEach(option => {
        //         option.classList.add('disabled');
        //         option.removeEventListener('click', handleOptionClick);
        //     });

        //     clearInterval(timerInterval); // Stop the timer when it ends
        //     timerDisplay.textContent = "Time's up!";
        //     showFinalResults(); // Calculate and display results
        //     const timeUpModalElement = document.getElementById('timeUpModal');
        //     if (timeUpModalElement) {
        //         const timeUpModal = new bootstrap.Modal(timeUpModalElement);
        //         timeUpModal.show(); // Show the results in the existing modal
        //     } else {
        //         console.error("Error: The modal element with ID 'timeUpModal' was not found.");
        //     }
        // }

        document.getElementById('returnToQuizForm').addEventListener('click', () => {
            const resultsDiv = document.getElementById('results');
            const mainDiv = document.querySelector('.main-div');
            const resultsModalElement = document.getElementById('resultsModal');
            const resultsModal = bootstrap.Modal.getInstance(resultsModalElement);

            if (resultsDiv) {
                resultsDiv.classList.add('d-none');
            }
            if (mainDiv) {
                mainDiv.classList.remove('d-none');
            }
            if (resultsModal) {
                resultsModal.hide();
            }
            const timerDisplay = document.getElementById('timer');
            if (timerDisplay) {
                timerDisplay.textContent = 'START';
            }
            const questionsContainer = document.getElementById('questionsContainer');
            if (questionsContainer) {
                questionsContainer.innerHTML = '';
                questionsContainer.dataset.questions = '';
            }
            correctAnsCount = 0;
            incorrectAnsCount = 0;
            totalQuestions = 0;
        });

        function showFinalResults() {
            const finalScoreElement = document.getElementById('finalScore');
            const correctAnswersElement = document.getElementById('correctAnswers');
            const incorrectAnswersElement = document.getElementById('incorrectAnswers');

            finalScoreElement.textContent = `${correctAnsCount} / ${totalQuestions}`;
            correctAnswersElement.textContent = `Correct Answers: ${correctAnsCount}`;
            incorrectAnswersElement.textContent = `Incorrect Answers: ${incorrectAnsCount}`;
            incorrectAnswersElement.textContent += ` / Total Questions: ${totalQuestions}`;
        }

        document.addEventListener('DOMContentLoaded', function() {
            const returnButton = document.getElementById('returnToQuizForm');
            if (returnButton) {
                returnButton.addEventListener('click', function() {
                    const resultsDiv = document.getElementById('results');
                    const mainDiv = document.querySelector('.main-div');
                    const timeUpModalElement = document.getElementById('timeUpModal');
                    const timeUpModal = bootstrap.Modal.getInstance(timeUpModalElement);

                    if (resultsDiv) {
                        resultsDiv.classList.add('d-none'); // Hide the results section
                    }
                    if (mainDiv) {
                        mainDiv.classList.remove('d-none'); // Show the initial form
                    }
                    if (timeUpModal) {
                        timeUpModal.hide(); // Hide the modal
                    }
                    // Optionally reset the timer display
                    const timerDisplay = document.getElementById('timer');
                    if (timerDisplay) {
                        timerDisplay.textContent = '10:00'; // Or your initial time
                    }
                });
            } else {
                console.error("Error: The 'Return Back' button element with ID 'returnToQuizForm' was not found.");
            }
        });

        // Attach the event listener to options after they are rendered
        function attachOptionListeners() {
            document.querySelectorAll('.option').forEach(option => {
                option.addEventListener('click', handleOptionClick);
            });
        }

        // Modify renderQuestions to call attachOptionListeners
        function renderQuestions(questions) {
            const container = document.getElementById('questionsContainer');
            container.innerHTML = '';

            if (questions.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">No questions generated.</div>';
                return;
            }

            questions.forEach((q, qIndex) => {
                const card = document.createElement('div');
                card.className = 'question-card card mb-3';

                card.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Q${qIndex + 1}: ${q.question}</h5>
                        <div class="options mt-3" id="options-${qIndex}">
                            ${q.options.map((option, oIndex) => `
                                <div class="option py-2 ps-3 mb-2 rounded"
                                    data-question-index="${qIndex}"
                                    data-option-index="${oIndex}"
                                    data-is-correct="${oIndex === q.correct_answer}">
                                    <span class="option-label">${String.fromCharCode(65 + oIndex)}.</span>
                                    ${option}
                                </div>
                            `).join('')}
                        </div>
                        <div class="feedback mt-2 d-none" id="feedback-${qIndex}"></div>
                    </div>
                `;

                container.appendChild(card);
            });

            attachOptionListeners(); // Attach listeners after rendering
        }
        
        

        // Copy functionality
        // document.getElementById('copyBtn')?.addEventListener('click', () => {
        //     const questions = document.getElementById('questionsContainer').innerText;
        //     navigator.clipboard.writeText(questions)
        //         .then(() => alert('Copied to clipboard!'))
        //         .catch(err => console.error('Failed to copy:', err));
        // });
        

    </script>
    <!--<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>-->
    <script>
        document.getElementById('exportButton').addEventListener('click', function() {
            const element = document.getElementById('questionsContainer');
            const exportBtn = document.getElementById('exportButton');
            
            // Temporarily hide the export button
            exportBtn.style.display = 'none';

            // Configure PDF options
            const opt = {
                margin: 0.5,
                filename: 'quiz.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            // Generate and save PDF
            html2pdf()
                .set(opt)
                .from(element)
                .save()
                .then(() => {
                    // Show button again after PDF is generated
                    exportBtn.style.display = 'inline-block';
                })
                .catch((error) => {
                    console.error('PDF generation failed:', error);
                    exportBtn.style.display = 'inline-block';
                });
        });
    </script>
</body>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

</html>