<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Exams</title>
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
      integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA=="
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
    />
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
      rel="stylesheet"
      integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
      crossorigin="anonymous"
    />

    <style>
      * {
        padding: 0;
        margin: 0;
      }
      body {
        background-color: #830abe;
        margin-top: 2em;
      }
      main {
        max-width: 500px;
        margin-inline: auto;
      }
      .my-minheight {
        min-height: fit-content;
      }
      
      .correct-answer {
        background-color: #1EC297 !important;
        color: #fff;
        position: relative;
      }

      .wrong-answer {
        background-color: #F2443E !important;
        color: #fff;
        position: relative;
      }

      .correct-answer::after, .wrong-answer::after {
        font-family: "Font Awesome 6 Free";
        font-weight: 900;
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
      }

      .correct-answer::after {
        content: "\f00c"; /* Font Awesome tick icon */
      }

      .wrong-answer::after {
        content: "\f00d"; /* Font Awesome cross icon */
      }

      @keyframes progress {
        0% { --percentage: 0; }
        /*100% { --percentage: var(--value); }*/
      }

      .progress-bar-custom {
        --percentage: var(--value);
        --primary: #01DCD2;
        --secondary: #fff;
        --size: 150px; /* Smaller size */
        animation: progress 2s 0.5s forwards;
        width: var(--size);
        aspect-ratio: 2 / 1;
        border-radius: 50% / 100% 100% 0 0;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        color: var(--secondary); /* Text color */
         
        font-size: 20px; /* Font size adjusted */
      }

      .progress-bar-custom::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: conic-gradient(from 0.75turn at 50% 100%, var(--primary) calc(var(--percentage) * 1% / 2), var(--secondary) calc(var(--percentage) * 1% / 2 + 0.1%));
        mask: radial-gradient(at 50% 100%, white 55%, transparent 55.5%);
        mask-mode: alpha;
        -webkit-mask: radial-gradient(at 50% 100%, #0000 55%, #000 55.5%);
        -webkit-mask-mode: alpha;
      }
      
      .progress-bar-custom span {
          position: absolute;
          bottom: -10px; /* Adjust the position */
          font-size: 2.8rem; /* Font size adjusted */
        }

      .progress-bar-custom::after {
        counter-reset: percentage var(--value);
        content: counter(percentage) ' s';
        font-family: Helvetica, Arial, sans-serif;
        font-size: 1.8rem; /* Font size adjusted */
        color: var(--secondary);
        position: absolute;
        bottom: -8px; /* Moved text downwards */
        content: none; /* Remove the counter display */
      }

      
      .option {
        transition: all 0.3s ease;
        cursor: pointer;
        background-color: #fff;
        position: relative;
        overflow: hidden;
        border-radius: 8px; /* Smooth rounded corners */
        z-index: 1;
      }
    
      .option span {
        position: relative;
        z-index: 1;
      }
      
      .bg-mylight{
        background-color: #ebebeb;
      }

      a{
        text-decoration: none;
        color: #000;
      }
      
      /*#options-container{*/
      /*    padding-bottom: 2%;*/
      /*}*/
      
      .option-font{
           font-size: 20px !important;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="container pt-5">
        <div class="question-progress-section">
          <div class="row">
            <div class="col-1" style="margin-right:11px">
              <span id="question-progress" class="text-white">1/5</span>
            </div>
            
            <div class="col-10">
              <div class="progress mt-2" role="progressbar" style="height: 12px">
                <div id="progress-bar" class="progress-bar bg-warning" style="width: 0%"></div>
              </div>
            </div>
            <!--<div class="col-2">-->
            <!--  <img src="<?=base_url(get_file('uploads/quiz/cross_icon.png'))?>" class="img-fluid w-50" alt="" />-->
            <!--</div>-->
          </div>
        </div>

        <div class="time-progress d-flex justify-content-center mt-4" style="margin-bottom : 50px">
          <!--<div class="progress-bar-custom" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="--value: 100"></div>-->
          <div id="timer" role="progressbar" aria-valuenow="80" aria-valuemin="0" aria-valuemax="100" style="--value: 80" class="progress-bar-custom"></div>
        </div>

        <div class="mt-2 mb-2">
          <div class="bg-mylight my-minheight rounded-4 px-3 pt-4 pb-3">
            <div class="question-number">
              <span id="question-number" class="fs-1 text-muted fw-bold" style="font-size:17px !important">Q.1</span>
            </div>
            <div class="question mt-3 mb-5">
              <span id="question-text" class="fs-4 fw-bold" style="font-size:20px !important">Question Text</span>
            </div>
            <div class="options-div" id="options-container">
              <!-- Options will be dynamically inserted here -->
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script>
        // Pass the PHP array to JavaScript
        const questions = <?php echo json_encode($exam['questions']); ?>;
        let currentQuestionIndex = 0;
        let totalQuestions = questions.length;
        let timerInterval;
        
        // Create an object to store user answers
        let userAnswers = {};
        
        // Function to decode HTML entities in the question/option text
        function decodeHTML(html) {
          var txt = document.createElement("textarea");
          txt.innerHTML = html;
          return txt.value;
        }
        
        // Initialize the first question
        function loadQuestion(index) {
          const questionData = questions[index];
          
          // Decode and set question text
          const questionTitle = decodeHTML(questionData.question);
          document.getElementById('question-number').textContent = `Q.${index + 1}`;
          document.getElementById('question-text').innerHTML = questionTitle;
          document.getElementById('question-progress').textContent = `${index + 1}/${totalQuestions}`;
          
          // Update progress bar based on question index
          const progressBarWidth = ((index + 1) / totalQuestions) * 100;
          document.getElementById('progress-bar').style.width = `${progressBarWidth}%`;
        
          // Display options
          const optionsContainer = document.getElementById('options-container');
          optionsContainer.innerHTML = ''; // Clear previous options
        
          // Loop through the options and decode them
          const options = JSON.parse(questionData.options);
          options.forEach((option, i) => {
            // const optionDiv = document.createElement('div');
            // optionDiv.className = 'option rounded-4 px-4 pt-4 pb-3 py-md-4 my-3 fs-8 option-font';
            // optionDiv.innerHTML = decodeHTML(option);
            // optionDiv.onclick = () => handleAnswer(i);
            // optionsContainer.appendChild(optionDiv);
            
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option rounded-4 px-4 pt-4 pb-3 py-md-4 my-3 fs-8 option-font';
        
            // Decode HTML and remove specific tags (like <strong>)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = decodeHTML(option);
        
            // Remove <strong> tags while keeping other tags like <p>
            tempDiv.querySelectorAll('strong, ol, li').forEach(strongTag => strongTag.replaceWith(strongTag.textContent));
        
            optionDiv.innerHTML = tempDiv.innerHTML; // Set sanitized HTML
            optionDiv.onclick = () => handleAnswer(i);
            optionsContainer.appendChild(optionDiv);
          });
        
          // Reset timer for the question
          resetAndStartTimer(30);  // Set duration to 30 seconds
        }
        

        // Handle the user's answer
        function handleAnswer(selectedOption) {
            clearInterval(timerInterval); // Stop current timer
        
            const questionData = questions[currentQuestionIndex];
            
            // Get correct answer based on question type
            let correctOptionIndex = NaN;
            if (questionData.question_type == 0) {
                // Single answer question
                correctOptionIndex = parseInt(questionData.answer_id, 10);
            } else {
                // Multiple answer question - for display purposes, show first correct answer
                try {
                    const parsedAnswers = JSON.parse(questionData.answer_ids);
                    if (Array.isArray(parsedAnswers) && parsedAnswers.length > 0) {
                        correctOptionIndex = parseInt(parsedAnswers[0], 10);
                    }
                } catch (e) {
                    console.error("Error parsing answer_ids:", e);
                }
            }
        
            // Check if options exist
            const options = document.querySelectorAll('.option');
    
            // Check if selected option and correct option exist
            if (!isNaN(correctOptionIndex) && options.length > 0) {
                // If selectedOption is -1, it means time ran out without user selection
                if (selectedOption === -1) {
                    // Highlight the correct answer only
                    options[correctOptionIndex].classList.add('correct-answer');
                } else {
                    // Highlight the selected option
                    if (selectedOption === correctOptionIndex) {
                        options[selectedOption].classList.add('correct-answer');
                    } else {
                        options[selectedOption].classList.add('wrong-answer');
                        options[correctOptionIndex].classList.add('correct-answer'); // Highlight the correct option
                    }
    
                    // Save the user answer in the required format
                    userAnswers[questionData.id] = [selectedOption]; // Store as array for consistency
                }
    
                // Move to the next question after a short delay (e.g., 1 seconds)
                setTimeout(() => {
                    currentQuestionIndex++;
                    if (currentQuestionIndex < totalQuestions) {
                        loadQuestion(currentQuestionIndex);
                    } else {
                        submitQuizResults(); // Call function to submit results
                    }
                }, 1000); // Delay for 1 seconds before moving to the next question
            } else {
                console.error("Invalid selected option or correct answer index.");
            }
        }

        // Function to submit quiz results
        // function submitQuizResults() {
        //     console.log('exam_id : ', <?php echo $exam_id; ?>); // Debugging
        //     console.log('user_id : ', <?php echo $user_id; ?>); // Debugging
        //     console.log('attempt_id : ', <?php echo $attempt_id; ?>); // Debugging
        //     console.log('user_answers : ', userAnswers); // Debugging
        //     fetch('<?php echo base_url('quiz/save_exam_result/'); ?>', {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json',  // Ensure proper header is sent
        //         },
        //         body: JSON.stringify({
        //             exam_id: <?php echo $exam_id; ?>,
        //             user_id: <?php echo $user_id; ?>,
        //             attempt_id: <?php echo $attempt_id; ?>,
        //             user_answers: userAnswers // Ensure userAnswers is properly structured
        //         }),
        //     })
        //     .then(response => response.json())
        //     .then(data => {
        //         console.log('Success:', data); // Debugging response
        //         alert('Quiz results submitted successfully!');
        //     })
        //     .catch((error) => {
        //         console.error('Error:', error);
        //     });
        // }

        function submitQuizResults() {
            var user_id = <?=$user_id?>;
            var exam_id = <?=$exam_id?>;
            var attempt_id = <?=$attempt_id?>;
        
            $.ajax({
                type: 'POST',
                url: "<?=base_url('quiz/save_quiz_result'); ?>",
                data: {
                    user_id: user_id,
                    exam_id: exam_id,
                    attempt_id: attempt_id,
                    user_answers: userAnswers // Assuming `userAnswers` is a JavaScript object
                },
                dataType: "json",  // Expecting JSON response from the server
                success: function(data) {
                    if (data.status === 1) {
                        // Redirect to show_quiz_result with parameters
                        window.location.href = "<?=base_url('quiz/show_quiz_result'); ?>/" + data.user_id + "/" + data.exam_id + "/" + data.attempt_id;
                    } else {
                        alert('Error submitting quiz: ' + data.message);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('Error submitting quiz:', textStatus, errorThrown); // Handle error
                }
            });
        }


        // Timer function for each question
        function resetAndStartTimer(duration) {
          clearInterval(timerInterval); // Clear previous interval
          let timeLeft = duration;
        
          // Update timer display immediately
          updateTimerDisplay(timeLeft);
        
          // Set the timer interval
          timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay(timeLeft);
        
            // If time runs out, automatically move to the next question
            if (timeLeft <= 0) {
              clearInterval(timerInterval);
              handleAnswer(-1); // Automatically move to next question if time runs out
            }
          }, 1000);
        }
        
        // Update the timer display
        function updateTimerDisplay(timeLeft) {
          const timerElement = document.getElementById('timer');
          const totalDuration = 30; // Total duration of the timer in seconds
          const percentage = Math.round((timeLeft / totalDuration) * 100);
        //   console.log(percentage);
        
          // Update the CSS variable and aria-valuenow attribute
          timerElement.style.setProperty('--value', percentage);
          timerElement.setAttribute('aria-valuenow', percentage);
        
          // Update the text content of the timer
          timerElement.textContent = `${timeLeft}s`;
        }

        
        // Load the first question when the page loads
        window.onload = function() {
          loadQuestion(0);
        };

    </script>

  </body>
</html>
