<style>
        :root {
            --primary-color: #4e73df;
            --secondary-color: #f8f9fc;
            --accent-color: #2e59d9;
            --text-color: #5a5c69;
        }
        
        body {
            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8f9fc;
            color: var(--text-color);
        }
        
        .quiz-container {
            max-width: 800px;
            margin: 2rem auto;
            border-radius: 0.35rem;
            background: white;
            overflow: hidden;
        }
        
        .quiz-header {
            background: var(--primary-color);
            color: white;
            padding: 1.5rem;
        }
        
        .quiz-header h2 {
            font-weight: 600;
            margin-bottom: 0;
        }
        
        .quiz-body {
            padding: 2rem;
        }
        
        .question-card {
            margin-bottom: 2rem;
            border-left: 0.25rem solid var(--primary-color);
            border-radius: 0.25rem;
            transition: transform 0.2s;
        }
        
        .question-card:hover {
            transform: translateY(-2px);
        }
        
        .question-card .card-header {
            background-color: var(--secondary-color);
            font-weight: 600;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .question-card .card-body {
            padding: 1.5rem;
        }
        
        .option-item {
            margin-bottom: 0.75rem;
            padding: 0.75rem;
            border-radius: 0.25rem;
            background-color: var(--secondary-color);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .option-item:hover {
            background-color: #e2e6ea;
        }
        
        .option-item.selected {
            background-color: var(--primary-color);
            color: white;
        }
        
        .option-item input[type="radio"], 
        .option-item input[type="checkbox"] {
            margin-right: 0.75rem;
        }
        
        .btn-submit {
            background-color: var(--primary-color);
            border: none;
            padding: 0.75rem 2rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            font-size: 0.85rem;
        }
        
        .btn-submit:hover {
            background-color: var(--accent-color);
        }
        
        .results-container {
            display: none;
            text-align: center;
            padding: 2rem;
        }
        
        .results-icon {
            font-size: 4rem;
            color: var(--primary-color);
            margin-bottom: 1rem;
        }
        
        .progress {
            height: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1.5rem;
        }
        
        .progress-bar {
            background-color: var(--primary-color);
        }
        
        .answer-feedback {
            margin-top: 2rem;
            text-align: left;
        }
        
        .feedback-item {
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 0.25rem;
            background-color: var(--secondary-color);
        }
        
        .feedback-item.correct {
            border-left: 4px solid #1cc88a;
        }
        
        .feedback-item.incorrect {
            border-left: 4px solid #e74a3b;
        }
    </style>
    <div>
        <button onclick="history.back()" class="btn btn-dark rounded-pill">Back</button>

    </div>
 <div class="quiz-container">
        <div class="quiz-header bg-primary">
            <h2 class="text-white text-center" ><?= $lesson_file_data['title'] ?></h2>
            <p><?= $lesson_file_data['summary'] ?></p>
        </div>
        
        <div class="quiz-body" id="questions-section">
            <form id="quiz-form">
                <!-- Questions will be dynamically inserted here -->
            </form>
            
            <div class="d-grid mt-4">
                <button type="button" class="btn btn-primary btn-lg" id="submit-quiz">Submit Answers</button>
            </div>
        </div>
        
        <div class="results-container" id="results-section">
            <div class="results-icon">
                <i class="bi bi-trophy"></i>
            </div>
            <h3>Quiz Results</h3>
            <p id="score-display">You scored 0 out of 0 (0%)</p>
            
            <div class="progress">
                <div class="progress-bar" id="score-progress" role="progressbar" style="width: 0%"></div>
            </div>
            
            <div class="answer-feedback" id="answer-feedback">
                <!-- Feedback will be inserted here -->
            </div>
            
            <button type="button" class="btn btn-outline-primary mt-3" id="retake-quiz">
                <i class="bi bi-arrow-repeat"></i> Retake Quiz
            </button>
        </div>
    </div>
<script>
        // Get quiz data from PHP
        const quizData = <?= json_encode(['list_items' => $list_items]) ?>;
        
        // Process the quiz data to ensure proper formatting
        function processQuizData(data) {
            if (!data || !data.list_items) return;
            
            data.list_items.forEach(item => {
                // Parse answers if they're in string format
                if (typeof item.answers === 'string') {
                    try {
                        item.answers = JSON.parse(item.answers);
                    } catch (e) {
                        console.error('Error parsing answers:', e);
                        item.answers = [];
                    }
                }
                
                // Parse answer_ids if they're in string format
                if (typeof item.answer_ids === 'string') {
                    try {
                        item.answer_ids = JSON.parse(item.answer_ids);
                    } catch (e) {
                        console.error('Error parsing answer_ids:', e);
                        item.answer_ids = [];
                    }
                }
                
                // Convert answer_id to number if it's a string
                if (item.answer_id !== null && typeof item.answer_id === 'string') {
                    item.answer_id = parseInt(item.answer_id, 10);
                }
            });
            
            return data;
        }

        // Render questions
        function renderQuestions() {
            const processedData = processQuizData(quizData);
            if (!processedData || !processedData.list_items || processedData.list_items.length === 0) {
                document.getElementById('quiz-form').innerHTML = '<div class="alert alert-warning">No quiz questions available.</div>';
                document.getElementById('submit-quiz').style.display = 'none';
                return;
            }
            
            const form = document.getElementById('quiz-form');
            form.innerHTML = '';
            
            processedData.list_items.forEach((item, index) => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-card card mb-4';
                
                const questionHeader = document.createElement('div');
                questionHeader.className = 'card-header';
                questionHeader.textContent = `Question ${index + 1}`;
                
                const questionBody = document.createElement('div');
                questionBody.className = 'card-body';
                
                const questionText = document.createElement('h5');
                questionText.className = 'card-title mb-4';
                questionText.textContent = item.question;
                
                questionBody.appendChild(questionText);
                
                // Render options based on question type
                if (item.question_type === 0 || item.question_type === '0') { // MCQ
                    item.answers.forEach((answer, ansIndex) => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item d-flex align-items-center';
                        
                        const radioInput = document.createElement('input');
                        radioInput.type = 'radio';
                        radioInput.name = `question-${item.id}`;
                        radioInput.id = `question-${item.id}-option-${ansIndex}`;
                        radioInput.value = ansIndex;
                        radioInput.className = 'form-check-input';
                        
                        const label = document.createElement('label');
                        label.htmlFor = `question-${item.id}-option-${ansIndex}`;
                        label.className = 'form-check-label ms-2';
                        label.textContent = answer;
                        
                        optionDiv.appendChild(radioInput);
                        optionDiv.appendChild(label);
                        
                        // Add click handler to style the selected option
                        optionDiv.addEventListener('click', function() {
                            const options = document.querySelectorAll(`input[name="question-${item.id}"]`);
                            options.forEach(opt => {
                                opt.parentElement.classList.remove('selected');
                            });
                            this.classList.add('selected');
                            radioInput.checked = true;
                        });
                        
                        questionBody.appendChild(optionDiv);
                    });
                } else { // MSQ
                    item.answers.forEach((answer, ansIndex) => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item d-flex align-items-center';
                        
                        const checkboxInput = document.createElement('input');
                        checkboxInput.type = 'checkbox';
                        checkboxInput.name = `question-${item.id}[]`;
                        checkboxInput.id = `question-${item.id}-option-${ansIndex}`;
                        checkboxInput.value = ansIndex;
                        checkboxInput.className = 'form-check-input';
                        
                        const label = document.createElement('label');
                        label.htmlFor = `question-${item.id}-option-${ansIndex}`;
                        label.className = 'form-check-label ms-2';
                        label.textContent = answer;
                        
                        optionDiv.appendChild(checkboxInput);
                        optionDiv.appendChild(label);
                        
                        // Add click handler to style the selected option
                        optionDiv.addEventListener('click', function(e) {
                            // Don't toggle if clicking directly on the checkbox
                            if (e.target !== checkboxInput) {
                                checkboxInput.checked = !checkboxInput.checked;
                            }
                            this.classList.toggle('selected', checkboxInput.checked);
                        });
                        
                        questionBody.appendChild(optionDiv);
                    });
                }
                
                questionDiv.appendChild(questionHeader);
                questionDiv.appendChild(questionBody);
                form.appendChild(questionDiv);
            });
        }

        // Calculate score and show results
        function calculateScore() {
            const processedData = processQuizData(quizData);
            let score = 0;
            const feedbackContainer = document.getElementById('answer-feedback');
            feedbackContainer.innerHTML = '';
            
            processedData.list_items.forEach((item, index) => {
                const feedbackItem = document.createElement('div');
                feedbackItem.className = 'feedback-item';
                
                const questionText = document.createElement('h6');
                questionText.textContent = `Q${index + 1}: ${item.question}`;
                
                feedbackItem.appendChild(questionText);
                
                if (item.question_type === 0 || item.question_type === '0') { // MCQ
                    const selectedOption = document.querySelector(`input[name="question-${item.id}"]:checked`);
                    
                    if (selectedOption && parseInt(selectedOption.value) === item.answer_id) {
                        score++;
                        feedbackItem.classList.add('correct');
                        feedbackItem.innerHTML += `<p class="text-success mb-1"><i class="bi bi-check-circle-fill"></i> Correct! The right answer is: ${item.answers[item.answer_id]}</p>`;
                    } else {
                        feedbackItem.classList.add('incorrect');
                        const userAnswer = selectedOption ? item.answers[selectedOption.value] : "No answer selected";
                        feedbackItem.innerHTML += `
                            <p class="text-danger mb-1"><i class="bi bi-x-circle-fill"></i> Incorrect. Your answer: ${userAnswer}</p>
                            <p class="text-success mb-0">Correct answer: ${item.answers[item.answer_id]}</p>
                        `;
                    }
                } else { // MSQ
                    const selectedOptions = document.querySelectorAll(`input[name="question-${item.id}[]"]:checked`);
                    const selectedValues = Array.from(selectedOptions).map(opt => opt.value);
                    
                    // Ensure answer_ids is an array of strings for comparison
                    const correctIds = Array.isArray(item.answer_ids) ? item.answer_ids : [];
                    
                    // Check if all correct answers are selected and no incorrect ones
                    const isCorrect = selectedValues.length === correctIds.length && 
                                    correctIds.every(id => selectedValues.includes(id.toString()));
                    
                    if (isCorrect) {
                        score++;
                        feedbackItem.classList.add('correct');
                        feedbackItem.innerHTML += `<p class="text-success mb-1"><i class="bi bi-check-circle-fill"></i> Correct! The right answers are: ${correctIds.map(id => item.answers[id]).join(', ')}</p>`;
                    } else {
                        feedbackItem.classList.add('incorrect');
                        const userAnswers = selectedOptions.length > 0 
                            ? selectedValues.map(val => item.answers[val]).join(', ')
                            : "No answers selected";
                        feedbackItem.innerHTML += `
                            <p class="text-danger mb-1"><i class="bi bi-x-circle-fill"></i> Incorrect. Your answers: ${userAnswers}</p>
                            <p class="text-success mb-0">Correct answers: ${correctIds.map(id => item.answers[id]).join(', ')}</p>
                        `;
                    }
                }
                
                feedbackContainer.appendChild(feedbackItem);
            });
            
            return score;
        }

        // Show results
        function showResults() {
            const totalQuestions = quizData.list_items.length;
            const correctAnswers = calculateScore();
            const percentage = Math.round((correctAnswers / totalQuestions) * 100);
            
            document.getElementById('score-display').textContent = 
                `You scored ${correctAnswers} out of ${totalQuestions} (${percentage}%)`;
            document.getElementById('score-progress').style.width = `${percentage}%`;
            
            document.getElementById('questions-section').style.display = 'none';
            document.getElementById('results-section').style.display = 'block';
        }

        // Event listeners
        document.getElementById('submit-quiz').addEventListener('click', showResults);
        
        document.getElementById('retake-quiz').addEventListener('click', function() {
            document.getElementById('questions-section').style.display = 'block';
            document.getElementById('results-section').style.display = 'none';
            renderQuestions();
        });

        // Initialize
        document.addEventListener('DOMContentLoaded', renderQuestions);
    </script>