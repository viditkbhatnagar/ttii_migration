<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .main__container {
            width: 100%;
            max-width: 400px;
            min-height: 100vh;
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #4A90E2 100%);
            border-radius: 20px;
            overflow: scroll;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }

        .quiz_ui_attend_section {
            height: 90vh;
            display: flex;
            flex-direction: column;
            padding: 15px;
            color: white;
            font-size: 14px;
        }

        .header-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .back-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 12px;
            padding: 12px;
            color: white;
            cursor: pointer;
            backdrop-filter: blur(10px);
            display: none;
        }

        .subject-info {
            flex: 1;
            text-align: center;
        }

        .subject-title {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 2px;
        }

        .subject-name {
            font-size: 16px;
            font-weight: bold;
        }

        .menu-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 12px;
            padding: 12px;
            color: white;
            cursor: pointer;
            backdrop-filter: blur(10px);
            display: none;
        }

        .progress-section {
            background: rgba(255,255,255,0.15);
            border-radius: 20px;
            padding: 15px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
        }

        .lesson-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
        }

        .lesson-title {
            font-size: 14px;
            opacity: 0.9;
        }

        .timer {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
        }

        .progress-bar {
            background: rgba(255,255,255,0.2);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .progress-fill {
            background: #FFD700;
            height: 100%;
            width: 10%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .question-counter {
            text-align: center;
            font-size: 14px;
            opacity: 0.9;
        }

        .question-section {
            flex: 1;
            background: white;
            border-radius: 25px 25px 0 0;
            margin-top: 20px;
            padding: 30px 25px;
            color: #333;
            position: relative;
        }

        .question-number {
            color: #FF6B35;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .question-text {
            font-size: 14px;
            font-weight: 600;
            line-height: 1.5;
            margin-bottom: 25px;
            color: #2c3e50;
        }

        .options-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 80px;
        }

        .option-card {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 15px 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .option-card:hover {
            background: #e3f2fd;
            border-color: #2196f3;
            transform: translateY(-2px);
        }

        .option-card.active-item {
            background: #e8f5e8;
            border-color: #4caf50;
            transform: translateY(-2px);
        }

        .option-text {
            font-size: 14px;
            font-weight: 500;
            color: #2c3e50;
        }

        .option-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }

        .option-card.active-item .option-icon {
            background: #4caf50;
            border-color: #4caf50;
            color: white;
        }

        /* Multiple select specific styles */
        .option-card.multiple-select {
            border-left: 4px solid #2196f3;
        }

        .option-card.multiple-select.active-item {
            background: #e8f5e8;
            border-color: #4caf50;
            border-left-color: #4caf50;
        }

        .option-card.multiple-select .option-icon {
            border-radius: 4px;
            border: 2px solid #ddd;
        }

        .option-card.multiple-select.active-item .option-icon {
            background: #4caf50;
            border-color: #4caf50;
            color: white;
        }

        .navigation-section {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            padding: 20px 25px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: center;
        }

        .next-btn {
            background: #FF6B35;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 40px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 120px;
        }

        .next-btn:hover {
            background: #e55a2b;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 107, 53, 0.3);
        }

        .next-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        /* Popup Styles */
        .popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .popup.visible {
            opacity: 1;
            visibility: visible;
        }

        .popup-content {
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 350px;
            width: 90%;
            text-align: center;
            transform: scale(0.8);
            transition: transform 0.3s ease;
        }

        .popup.visible .popup-content {
            transform: scale(1);
        }

        .popup-header {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #333;
        }

        .stats-container {
            display: flex;
            justify-content: space-around;
            margin: 25px 0;
        }

        .stat-item {
            text-align: center;
        }

        .stat-circle {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            color: white;
            font-weight: bold;
        }

        .stat-circle.attempted {
            background: #4caf50;
        }

        .stat-circle.unattempted {
            background: #ff9800;
        }

        .stat-label {
            font-size: 14px;
            color: #666;
        }

        .popup-buttons {
            display: flex;
            gap: 15px;
            margin-top: 25px;
        }

        .popup-btn {
            flex: 1;
            padding: 12px 20px;
            border-radius: 25px;
            border: none;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .popup-btn.cancel {
            background: #f5f5f5;
            color: #666;
        }

        .popup-btn.submit {
            background: #FF6B35;
            color: white;
        }

        .popup-btn:hover {
            transform: translateY(-2px);
        }

        .hidden {
            display: none !important;
        }

        /* Mobile Responsiveness */
        @media (max-width: 480px) {
            .main__container {
                max-width: 100%;
                border-radius: 0;
                height: 100vh;
            }
            
            .question-section {
                margin-top: 10px;
                padding: 25px 20px;
            }
            
            .navigation-section {
                padding: 15px 20px;
            }
        }

        @media (max-width: 680px) {
            .back-btn i {
                opacity: 0;
            }
        }

        /* Additional UI Elements */
        .submit-ui {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 40px;
            background: white;
        }

        .submit-ui h2 {
            color: #4caf50;
            font-size: 24px;
            margin-bottom: 20px;
        }

        .submit-ui p {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
        }

        .result-btn {
            background: #4caf50;
            color: white;
            border: none;
            border-radius: 25px;
            padding: 15px 30px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .result-btn:hover {
            background: #45a049;
            transform: translateY(-2px);
        }

        #timeout_ui {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 40px;
            background: white;
        }

        #timeout_ui h2 {
            color: #f44336;
            font-size: 24px;
            margin-bottom: 20px;
        }

        #timeout_ui p {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
        }
    </style>
<body>
    <div class="main__container">
        <!-- Quiz Interface -->
        <section class="quiz_ui_attend_section">
            <!-- Header -->
            <div class="header-section">
                <button class="back-btn" onclick="goBackFun()">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div class="subject-info">
                    <div class="subject-title"><?= $practice_details['lesson_name']?></div>
                    <div class="subject-name">Quiz Assessment</div>
                </div>
                <button class="menu-btn">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>

            <!-- Progress Section -->
            <div class="progress-section">
                <div class="lesson-info">
                    <!-- </?php log_message('error', print_r($practice_details, true));?> -->
                    <div class="lesson-title"><?= $practice_details['lesson_name']?></div>
                    <div class="timer" id="timer">
                        <i class="fa-solid fa-clock"></i>
                        <span>1:00</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="question-counter">
                    <span class="current-question">1</span> / <span class="total-questions">10</span>
                </div>
            </div>

            <!-- Question Section -->
            <div class="question-section">
                <div class="question-number">Question 1/10</div>
                <div class="question-text">Which of the following elements is a noble gas?</div>
                
                <div class="options-container">
                    <!-- Options will be populated by JavaScript -->
                </div>

                <!-- Navigation -->
                <div class="navigation-section">
                    <button class="next-btn" id="nextBtn">Next</button>
                </div>
            </div>
        </section>

        <!-- Submit UI -->
        <div class="submit-ui submit__ui hidden">
            <h2>Quiz Completed!</h2>
            <p>Your responses have been submitted successfully.</p>
            <button class="result-btn" onclick="goToResult()">View Results</button>
        </div>

        <!-- Timeout UI -->
        <div id="timeout_ui" class="hidden">
            <h2>Time's Up!</h2>
            <p>The quiz time has expired. Your answers have been automatically submitted.</p>
            <button class="result-btn" onclick="goToResult()">View Results</button>
        </div>
    </div>

    <!-- Popup -->
    <div id="popup" class="popup hidden">
        <div class="popup-content">
            <div class="popup-header">
                Are you sure you want to submit?
            </div>
            
            <div class="stats-container">
                <div class="stat-item">
                    <div class="stat-circle attempted">3</div>
                    <div class="stat-label">Attempted</div>
                </div>
                <div class="stat-item">
                    <div class="stat-circle unattempted">3</div>
                    <div class="stat-label">Unattempted</div>
                </div>
            </div>

            <div class="popup-buttons">
                <button class="popup-btn cancel" id="closePopupBtn">Cancel</button>
                <button class="popup-btn submit">Submit</button>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", () => {
            const quizAttendSection = document.querySelector(".quiz_ui_attend_section");
            const nextButton = document.getElementById("nextBtn");
            const popup = document.getElementById("popup");
            const closePopupBtn = document.getElementById("closePopupBtn");
            const submitButton = document.querySelector(".popup-btn.submit");
            const submitUI = document.querySelector(".submit__ui");
            const timeoutUI = document.getElementById("timeout_ui");
            const timerElement = document.getElementById("timer");

            // PHP Data Integration
            const questions = <?php echo json_encode($questions ?? []); ?>;
            const user_id = <?=$user_id ?>;
            const quiz_id = <?=$quiz_id ?>;
            const attempt_id = <?=$attempt_id ?>;
            const course_id = <?=$course_id?>;

            console.log('Questions:', questions);

            let currentQuestion = 0;
            const totalQuestions = questions.length;
            const selectedOptions = Array(totalQuestions).fill(null);
            const answeredQuestions = [];

            let timer;
            let timeLimit = <?=$practice_details['practice_time'] ?? 5?> * 60;

            let selectedOptionData = {
                qId: null,
                aId: null,
                isMultiple: false
            };
            let qIdArray = [];

            // Timer functions
            function updateTimer() {
                const minutes = Math.floor(timeLimit / 60);
                let seconds = timeLimit % 60;
                seconds = seconds < 10 ? "0" + seconds : seconds;
                timerElement.querySelector('span').textContent = `${minutes}:${seconds}`;
            }

            function startTimer() {
                updateTimer();
                timer = setInterval(() => {
                    timeLimit--;
                    updateTimer();
                    if (timeLimit <= 0) {
                        clearInterval(timer);
                        showTimeoutUI();
                    }
                }, 1000);
            }

            function showTimeoutUI() {
                quizAttendSection.classList.add("hidden");
                timeoutUI.classList.remove("hidden");
            }

            // Quiz navigation
            function updateQuestionUI() {
                if (questions.length === 0) {
                    console.error('No questions available');
                    return;
                }

                const current = questions[currentQuestion];
                
                // Check if this is a multiple select question
                const isMultipleSelect = current.question_type == 1;
                selectedOptionData.isMultiple = isMultipleSelect;
                
                // Update question counter
                document.querySelector('.current-question').textContent = currentQuestion + 1;
                document.querySelector('.total-questions').textContent = totalQuestions;
                
                // Update progress bar
                const progressFill = document.querySelector('.progress-fill');
                const progressPercent = ((currentQuestion + 1) / totalQuestions) * 100;
                progressFill.style.width = progressPercent + '%';
                
                // Update question content
                document.querySelector('.question-number').textContent = `Question ${currentQuestion + 1}/${totalQuestions}`;
                
                // Decode and clean question title
                const titleString = current.question || '';
                const decodedTitle = decodeURIComponent(titleString.replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
                const titleWithoutPTags = decodedTitle.replace(/<p>/g, '').replace(/<\/p>/g, '');
                
                // Add multiple select indicator
                const questionTextElement = document.querySelector('.question-text');
                if (isMultipleSelect) {
                    const selectedCount = selectedOptions[currentQuestion] && Array.isArray(selectedOptions[currentQuestion]) 
                        ? selectedOptions[currentQuestion].length 
                        : 0;
                    questionTextElement.innerHTML = `
                        <div style="background: #e3f2fd; color: #1976d2; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; font-weight: 600;">
                            <i class="fa-solid fa-check-double" style="margin-right: 8px;"></i>
                            Multiple Choice - Select all correct answers
                            <span id="selection-counter" style="float: right; background: rgba(25, 118, 210, 0.2); padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                                ${selectedCount} selected
                            </span>
                        </div>
                        ${titleWithoutPTags}
                    `;
                } else {
                    questionTextElement.textContent = titleWithoutPTags;
                }
                
                // Process options
                let decodedOptions = [];
                if (current.answers) {
                    if (typeof current.answers === 'string') {
                        try {
                            decodedOptions = JSON.parse(current.answers);
                        } catch (e) {
                            console.error('Error parsing options:', e);
                            decodedOptions = [current.answers];
                        }
                    } else if (Array.isArray(current.answers)) {
                        decodedOptions = current.answers;
                    }
                    
                    // Clean HTML tags from options
                    decodedOptions = decodedOptions.map(option => {
                        const textWithoutTags = option.replace(/<[^>]*>/g, '');
                        return textWithoutTags.trim();
                    });
                }
                
                // Create option cards
                const optionsContainer = document.querySelector('.options-container');
                optionsContainer.innerHTML = '';
                
                decodedOptions.forEach((option, index) => {
                    const optionCard = document.createElement('div');
                    optionCard.classList.add('option-card');
                    if (isMultipleSelect) {
                        optionCard.classList.add('multiple-select');
                    }
                    optionCard.setAttribute('data-index', index);
                    
                    optionCard.innerHTML = `
                        <span class="option-text">${option}</span>
                        <div class="option-icon">
                            <i class="fa-solid fa-check"></i>
                        </div>
                    `;
                    
                    optionCard.addEventListener('click', () => {
                        handleOptionClick(index, current.id, isMultipleSelect);
                    });
                    
                    optionsContainer.appendChild(optionCard);
                });
                
                // Restore previous selection
                if (selectedOptions[currentQuestion] !== null) {
                    if (isMultipleSelect && Array.isArray(selectedOptions[currentQuestion])) {
                        // Multiple select - restore all selected options
                        selectedOptions[currentQuestion].forEach(selectedIndex => {
                            const selectedCard = optionsContainer.children[selectedIndex];
                            if (selectedCard) {
                                selectedCard.classList.add('active-item');
                            }
                        });
                    } else if (!isMultipleSelect && typeof selectedOptions[currentQuestion] === 'number') {
                        // Single select - restore single selected option
                        const selectedCard = optionsContainer.children[selectedOptions[currentQuestion]];
                        if (selectedCard) {
                            selectedCard.classList.add('active-item');
                        }
                    }
                }
                
                // Update next button text
                nextButton.textContent = currentQuestion === totalQuestions - 1 ? 'Submit' : 'Next';
            }

            // Option selection
            function handleOptionClick(index, questionId, isMultipleSelect) {
                if (isMultipleSelect) {
                    // Multiple select logic
                    if (selectedOptions[currentQuestion] === null) {
                        selectedOptions[currentQuestion] = [];
                    }
                    
                    const currentSelections = selectedOptions[currentQuestion];
                    const optionIndex = currentSelections.indexOf(index);
                    
                    if (optionIndex > -1) {
                        // Option already selected, remove it
                        currentSelections.splice(optionIndex, 1);
                        document.querySelectorAll('.option-card')[index].classList.remove('active-item');
                    } else {
                        // Option not selected, add it
                        currentSelections.push(index);
                        document.querySelectorAll('.option-card')[index].classList.add('active-item');
                    }
                    
                    selectedOptionData = {
                        qId: questionId,
                        aId: currentSelections,
                        isMultiple: true
                    };
                    
                    // Update selection counter
                    updateSelectionCounter(currentSelections.length);
                } else {
                    // Single select logic
                    selectedOptions[currentQuestion] = index;
                    selectedOptionData = {
                        qId: questionId,
                        aId: index,
                        isMultiple: false
                    };
                    
                    // Update UI - remove all selections first
                    document.querySelectorAll('.option-card').forEach(card => {
                        card.classList.remove('active-item');
                    });
                    // Add selection to clicked option
                    document.querySelectorAll('.option-card')[index].classList.add('active-item');
                }
            }

            // Update selection counter for multiple select questions
            function updateSelectionCounter(count) {
                const counter = document.getElementById('selection-counter');
                if (counter) {
                    counter.textContent = `${count} selected`;
                }
            }

            // Next button logic
            nextButton.addEventListener("click", () => {
                if (selectedOptionData.qId !== null) {
                    const questionId = questions[currentQuestion]?.id;
                    const { qId, aId, isMultiple } = selectedOptionData;
                    
                    if (!qIdArray.includes(questionId)) {
                        qIdArray.push(questionId);
                    }
                    
                    const existingAnswerIndex = answeredQuestions.findIndex(answer => answer.qId === qId);
                    if (existingAnswerIndex !== -1) {
                        answeredQuestions[existingAnswerIndex].aId = aId;
                        answeredQuestions[existingAnswerIndex].isMultiple = isMultiple;
                    } else {
                        answeredQuestions.push({ qId, aId, isMultiple });
                    }
                }

                if (currentQuestion < totalQuestions - 1) {
                    currentQuestion++;
                    updateQuestionUI();
                } else {
                    showPopup();
                    updatePopupStats();
                }
            });

            // Popup functions
            function showPopup() {
                popup.classList.remove("hidden");
                setTimeout(() => {
                    popup.classList.add("visible");
                }, 10);
            }

            function hidePopup() {
                popup.classList.remove("visible");
                setTimeout(() => {
                    popup.classList.add("hidden");
                }, 300);
            }

            function updatePopupStats() {
                const answeredCount = answeredQuestions.filter(answer => answer.aId !== null).length;
                const unansweredCount = totalQuestions - answeredCount;
                
                document.querySelector('.stat-circle.attempted').textContent = answeredCount;
                document.querySelector('.stat-circle.unattempted').textContent = unansweredCount;
            }

            function showSubmitUI() {
                quizAttendSection.classList.add("hidden");
                submitUI.classList.remove("hidden");
            }

            // Popup event listeners
            closePopupBtn.addEventListener("click", hidePopup);
            
            submitButton.addEventListener("click", () => {
            clearInterval(timer);
            
            // Convert answers into the expected backend structure
            const updatedAnsweredQuestions = [];
            qIdArray.forEach(qId => {
                const foundQuestion = answeredQuestions.find(question => question.qId === qId);
                if (foundQuestion) {
                    if (foundQuestion.isMultiple && Array.isArray(foundQuestion.aId)) {
                        // Multiple select - send array of answers
                        updatedAnsweredQuestions.push({
                            question_id: qId,
                            answer: foundQuestion.aId.map(String)
                        });
                    } else {
                        // Single select - send single answer
                        updatedAnsweredQuestions.push({
                            question_id: qId,
                            answer: String(foundQuestion.aId)
                        });
                    }
                } else {
                    // No answer found
                    updatedAnsweredQuestions.push({
                        question_id: qId,
                        answer: ''
                    });
                }
            });

            // Send clean JSON
            $.ajax({
                type: 'POST',
                url: "<?= base_url('exam/save_practice_result'); ?>",
                data: {
                    user_id: user_id,
                    attempt_id: attempt_id,
                    user_answers: updatedAnsweredQuestions
                },
                dataType: "json",
                success: function(data) {
                    console.log('Success:', data);
                    showSubmitUI();
                    hidePopup();
                },
                error: function(xhr, status, error) {
                    console.error('Error:', error);
                    showSubmitUI();
                    hidePopup();
                }
            });
        });


            // Initialize quiz if questions exist
            if (questions.length > 0) {
                updateQuestionUI();
                startTimer();
            } else {
                console.error('No questions found');
                document.querySelector('.question-text').textContent = 'No questions available for this quiz.';
            }
        });

        // Navigation functions
        function goBackFun() {
            window.location.href = "<?=base_url('exam/practice_web_view_new/'.$user_id.'/'.$course_id)?>";
        }

        function goToResult() {
            window.location.href = "<?=base_url('exam/show_practice_result/'.$user_id.'/'.$attempt_id)?>";
        }
    </script>
</body>
</html>