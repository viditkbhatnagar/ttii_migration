<style>
    @media(max-width:680px){
       .back_icon i{
           opacity:0;
       } 
    }
</style>
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

        .result-container {
            width: 100%;
            max-width: 400px;
            min-height: 100vh;
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #4A90E2 100%);
            border-radius: 20px;
            overflow: scroll;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
        }

        .header-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 25px;
            color: white;
        }

        .back-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 12px;
            padding: 12px;
            color: white;
            cursor: pointer;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            display: none;
        }

        .back-btn:hover {
            background: rgba(255,255,255,0.3);
        }

        .header-title {
            flex: 1;
            text-align: center;
        }

        .subject-title {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 2px;
        }

        .page-title {
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

        .result-subtitle {
            text-align: center;
            color: white;
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 30px;
            padding: 0 25px;
        }

        .result-card {
            flex: 1;
            background: white;
            border-radius: 25px 25px 0 0;
            margin: 0 20px 0 20px;
            padding: 40px 30px 30px;
            text-align: center;
            position: relative;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.1);
        }

        .result-header {
            margin-bottom: 30px;
        }

        .result-title {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .result-title.success {
            color: #4caf50;
        }

        .result-title.needs-improvement {
            color: #ff9800;
        }

        .result-subtitle-text {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }

        .score-display {
            font-size: 48px;
            font-weight: bold;
            margin: 20px 0;
        }

        .score-display.success {
            color: #4caf50;
        }

        .score-display.needs-improvement {
            color: #ff9800;
        }

        .score-out-of {
            font-size: 14px;
            color: #666;
            margin-bottom: 30px;
        }

        .result-icon {
            width: 120px;
            height: 120px;
            margin: 20px auto 30px;
            position: relative;
        }

        .trophy-icon {
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, #FFD700, #FFA500);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
        }

        .trophy-icon i {
            font-size: 50px;
            color: white;
        }

        .sad-icon {
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, #ffeb3b, #ffc107);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            box-shadow: 0 10px 30px rgba(255, 193, 7, 0.3);
        }

        .confetti {
            position: absolute;
            width: 8px;
            height: 8px;
            background: #4caf50;
            border-radius: 50%;
        }

        .confetti:nth-child(1) {
            background: #4caf50;
            top: -10px;
            left: 20px;
            animation: confetti-fall 2s infinite ease-in-out;
        }

        .confetti:nth-child(2) {
            background: #2196f3;
            top: -5px;
            right: 30px;
            animation: confetti-fall 2s infinite ease-in-out 0.5s;
        }

        .confetti:nth-child(3) {
            background: #ff9800;
            bottom: -10px;
            left: 30px;
            animation: confetti-fall 2s infinite ease-in-out 1s;
        }

        .confetti:nth-child(4) {
            background: #e91e63;
            bottom: -5px;
            right: 20px;
            animation: confetti-fall 2s infinite ease-in-out 1.5s;
        }

        @keyframes confetti-fall {
            0%, 100% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            50% {
                transform: translateY(10px) rotate(180deg);
                opacity: 0.7;
            }
        }

        .encouragement-text {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }

        .encouragement-text.success {
            background: #e8f5e8;
            color: #2e7d32;
        }

        .encouragement-text.needs-improvement {
            background: #fff3e0;
            color: #f57c00;
        }

        .action-buttons {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            padding: 20px 30px 30px;
            border-top: 1px solid #eee;
        }

        .button-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
        }

        .action-btn {
            flex: 1;
            padding: 15px 20px;
            border-radius: 25px;
            border: none;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .primary-btn {
            background: #4A90E2;
            color: white;
        }

        .primary-btn:hover {
            background: #357abd;
            transform: translateY(-2px);
        }

        .secondary-btn {
            background: #FF6B35;
            color: white;
        }

        .secondary-btn:hover {
            background: #e55a2b;
            transform: translateY(-2px);
        }

        .tertiary-btn {
            background: #f5f5f5;
            color: #666;
            width: 100%;
        }

        .tertiary-btn:hover {
            background: #e0e0e0;
            transform: translateY(-2px);
        }

        /* Mobile Responsiveness */
        @media (max-width: 480px) {
            .result-container {
                max-width: 100%;
                border-radius: 0;
                height: 100vh;
            }
            
            .result-card {
                margin: 0 15px 0 15px;
                padding: 30px 20px 20px;
            }
            
            .action-buttons {
                padding: 15px 20px 20px;
            }
            
            .back-btn i {
                opacity: 0;
            }
        }

        @media (max-width: 680px) {
            .back-btn i {
                opacity: 0;
            }
        }

        /* Success/Failure specific styles */
        .result-container.success {
            background: linear-gradient(135deg, #4caf50 0%, #8bc34a 50%, #4A90E2 100%);
        }

        .result-container.needs-improvement {
            background: linear-gradient(135deg, #ff9800 0%, #ffc107 50%, #4A90E2 100%);
        }
    </style>

     <div class="result-container" id="resultContainer">
        <!-- Header -->
        <div class="header-section">
            <button class="back-btn" onclick="navigatBack()">
                <i class="fa-solid fa-arrow-left"></i>
            </button>
            <div class="header-title">
                <div class="subject-title">Quiz</div>
                <div class="page-title">Result</div>
            </div>
            <button class="menu-btn">
                <i class="fa-solid fa-bars"></i>
            </button>
        </div>

        <div class="result-subtitle">Result Of Your Practice Test</div>
        
        <!-- Result Card -->
        <div class="result-card">
            <div class="result-header">
                <div class="result-title" id="resultTitle">Congratulations!</div>
                <div class="result-subtitle-text">You have scored</div>
                <div class="score-display" id="scoreDisplay">85%</div>
                <div class="score-out-of" id="scoreOutOf">8 Out of 10</div>
            </div>

            <div class="result-icon" id="resultIcon">
                <div class="trophy-icon">
                    <i class="fa-solid fa-trophy"></i>
                    <div class="confetti"></div>
                    <div class="confetti"></div>
                    <div class="confetti"></div>
                    <div class="confetti"></div>
                </div>
            </div>

            <div class="encouragement-text" id="encouragementText">
                Great job! You've mastered this topic well. Keep up the excellent work!
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons" style="display: none;">
                <div class="button-row">
                    <button class="action-btn primary-btn" onclick="reviewAnswers()">Review</button>
                    <!-- <button class="action-btn secondary-btn" onclick="attemptAgain()">Try Again</button> -->
                </div>
                <button class="action-btn tertiary-btn" onclick="navigatBack()">Done</button>
            </div>
        </div>
    </div>

   <script>
    // Pass PHP data safely to JS
    const quizScore = <?= json_encode($quiz_score) ?>;
    const userData  = <?= json_encode($user_data) ?>;


    function initializeResult() {
        const resultContainer = document.getElementById('resultContainer');
        const resultTitle = document.getElementById('resultTitle');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const scoreOutOf = document.getElementById('scoreOutOf');
        const resultIcon = document.getElementById('resultIcon');
        const encouragementText = document.getElementById('encouragementText');

        const percentage = Math.round(quizScore.percentage || 0);
        const totalQuestions = quizScore.questions || 0;
        const correctAnswers = quizScore.correct || 0;
        const isSuccess = percentage >= 70; // success threshold

        // Update content dynamically
        if (isSuccess) {
            resultContainer.classList.add('success');
            resultTitle.textContent = 'Congratulations!';
            scoreDisplay.textContent = percentage + '%';
            scoreOutOf.textContent = `${correctAnswers} Out of ${totalQuestions}`;
            encouragementText.textContent = `Great job, ${userData.name || 'Student'}! Keep up the excellent work!`;

            resultIcon.innerHTML = `
                <div class="trophy-icon">
                    <i class="fa-solid fa-trophy"></i>
                    <div class="confetti"></div>
                    <div class="confetti"></div>
                    <div class="confetti"></div>
                    <div class="confetti"></div>
                </div>
            `;
        } else {
            resultContainer.classList.add('needs-improvement');
            resultTitle.textContent = 'Keep Going!';
            scoreDisplay.textContent = percentage + '%';
            scoreOutOf.textContent = `${correctAnswers} Out of ${totalQuestions}`;
            encouragementText.textContent = 'Mistakes are part of learning!  try again!';

            resultIcon.innerHTML = `<div class="sad-icon">😔</div>`;
        }
    }

    function navigatBack() {
        // Redirect to review page
    window.location.href = "<?= base_url('exam/practice_web_view_new/' . urlencode($user_id) . '/' . urlencode($user_data['course_id'])) ?>";
    }

    function attemptAgain() {
        navigatBack();
    }

    function reviewAnswers() {
        alert('Review answers functionality coming soon!');
    }

    document.addEventListener('DOMContentLoaded', initializeResult);
</script>
