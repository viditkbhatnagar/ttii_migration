<style>
   .main__container {
     width: 100%;
     max-width: 500px;
     min-height: 100vh;
     margin: 0 auto;
     border-radius: 10px;
     display: flex;
     flex-direction: column;
     justify-content: center;
     align-items: center;
    }
    .top-section{
        width:100%;
    }
    .bottom-section {
        flex:1;
     }
     .timing_counter i{
         color:#0797ce;
         display: flex;
         justify-content: center;
         align-items: center;
         margin-right:5px;
     }
     
     @media(max-width:680px){
     .arrow-section span{
        display:none;    
     }
     .quiz_attend-arrow i{
        display:none;
     }
     .quiz_attend_top_section{
         margin-top:20px;
     }
     .quiz-attend_time{
         margin-top:30px;
         margin-bottom:20px;
     }
     /*.quiz_attent_number_cercle{*/
     /*    margin-bottom:20px;*/
     /*}*/
}

.quiz_attend_top_design{
        background-color: #ff9800;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 90px;
        max-width: 500px;
        margin-inline: auto;
        border-bottom-left-radius: 30px;
        border-bottom-right-radius: 30px;
    }
    .quiz_attend_top_design .quiz_row{
        width: 100%;
        height: 100%;
    
        display: flex;
        align-items: center;
        
    }
    .quiz_attend_top_design .quiz_row .quiz_col{
        height: 100%;
        /*background-color: green;*/
        display: flex;
        align-items: end;
        justify-content: center;
        padding: 1em;
        font-size: 0.9rem;
        color: white;
        width: 33.33%;
    }
    
    /*.quiz_attend_top_design .quiz_row .col_2 .clock_image img{*/
    /*    position:relative;*/
    /*    z-index: 10;*/
    /*}*/
    .quiz_attend_top_design .quiz_row .col_2 .clock_image{
        background-color: white;
        padding: 5px;
        border-radius: 30px;
        position: relative;
        bottom: -37px;
    }
    
    .quiz_attend_top_design .quiz_row .col_2 .clock_image::before {
        content: '';
        position: absolute;
        left: -14px;
        bottom: 40%;
        height: 12px;
        width: 15px;
        border-bottom-right-radius: 30px;
        box-shadow: 5px 5px 0 0 white;
        background-color: #ff9800; 
        display: inline-block; 
    
    
    }
    .quiz_attend_top_design .quiz_row .col_2 .clock_image::after {
        content: '';
        position: absolute; 
        right: -14px; 
        bottom: 40%; 
        height: 12px;
        width: 15px;
        border-bottom-left-radius: 30px;
        box-shadow: -5px 5px 0 0 white;
        background-color: #ff9800; 
        display: inline-block; 
    }
    
    .timing_counter{
            position: relative;
        z-index: 1;
    }
    
    .quiz_ui_attend_section {
       height: 100vh;
    }
    
    .quiz_attend_bottom_design{
        background-color: #E1E8F0;
        height: 10vh;
        width: 100%;
        max-width: 500px;
        position: absolute;
        bottom: 0;
        left: 0;
        right:0;
         margin-inline: auto;
        border-top-left-radius: 50%;
        border-top-right-radius: 50%;
        padding-inline: 15px;
    }
</style>

<section class="section-area">
    <div class="main__container">
        <div class="top-section">
          <div class="arrow-section">
            <span ><i class="fa-solid fa-arrow-left" style="cursor: pointer; font-size: 13px" onclick="goBackhandlere()"></i></span>
          </div>
          <div class="image-section">
            <h1>Exam Questions</h1>
            <img src="<?=base_url('assets/practice/eds.png')?>" alt="" />
          </div>
          <div class="card-section-area">
            <div class="small-cards">
              <p><?=$quiz_details['questions_count']?></p>
              <p>Questions</p>
            </div>
            <div class="small-cards">
              <p><?=$quiz_details['quiz_marks']?></p>
              <p>Mark</p>
            </div>
            <div class="small-cards">
                
              <p><?=$quiz_details['total_time']?></p>
              <p>Duration</p>
            </div>
          </div>
        </div>
        <div class="bottom-section">
          <div id="quiz_description">
            <div class="quiz-description-header">
              <h5><b>Instructions</b></h5>
            </div>

             <!-- <?//php echo html_entity_decode($quiz_details['description']);?>
                    <?//php if(empty($quiz_details['description'])){ ?> -->
                    <ul>
                        <li>The examination is of 75 minutes duration. There are a total of 100 questions carrying 100 marks.</li>
                        <li> Each MCQ type question has four choices out of which only one choice is the correct answer.</li>
                        <li>Each correct answer carries 1 mark and for each wrong answer 1/3 mark will be deducted. No negative mark for unattended questions.</li>
                        <li> You are only allowed to take the exam once; once you have taken it, you are not permitted to take it again for whatever reason.</li>
                        <li>After the test, Your performance will be reviewed, a thorough evaluation report will be provided, and the questions and their detailed solution will also be provided</li>
                        <li>The answer keys are challengeable and we will update in the telegram group if there are any changes.</li>
                    </ul>
                    <!-- <?//php } ?> -->

            <div class="quiz-desciption-btn">
                
              
                <?php
                    if($quiz_details['is_attempted']==1){
                ?>
                 
                        <div style='text-align:center;'>
                            <h5 style='margin-bottom:18px;'>Already attempted. Check your result.</h5>
                            <a style="padding:10px 15px; font-size:12px;  margin-top: 20px; border-radius: 5px; border: none; outline: none; background: #0797ce; color: white; font-weight: 500; cursor: pointer;text-decoration: none;" href="<?=base_url('exam/exam_show_result/'.$user_id.'/'.$exam_id.'/')?>"  
                             class="attemTed" >View Result</a>  
                        </div>
                        <?php
                    }else{
                        if($quiz_details['time']>0){
                ?>
                          <button >
                                 Exam Starts On: <br>
                                <span style="font-size: 10px;">
                                    <?= DateTime::createFromFormat('Y-m-d H:i:s', $quiz_details['from_date'].' '.$quiz_details['from_time'])->format('d-m-Y g:i A')?>
                                </span>
                            </button>

                            <?php
                        }else{
                            ?>
                            <?php if($quiz_details['questions_count']>0) { ?>
                                <button id="startTestButton" style="font-size: 13px;">Start Exam</button>
                            <?php } else { ?>
                                <button class="btn-btn-danger" style="font-size: 13px; width:150px; background:red; color:#fff">Add questions to exam</button>
                            <?php } ?>
                            <?php
                        }
                    }
                ?>
                <!--<button id="startTestButton">Start Test</button>-->

            </div>
          </div>
        </div>
    </div>

      <!-- next section -->

    <div class="quiz_ui_attend_section hidden">
        <div class="quiz_attend_top_design">
            <div class="quiz_row">
                <div class="quiz_col col_1">
                    <!--Attented: 2-->
                </div>
                <div class="quiz_col col_2">
                    <div class="clock_image"><img src="<?=base_url('assets/practice/clcok.png')?>"  alt=""  /></div>
                </div>
                <div class="quiz_col col_3">
                    <!--Total Que: 4-->
                </div>
            </div>
        </div>
        
        <div class="quiz_attend_top_section">
            <div class="quiz_attend-arrow">
                <span>
                    <i class="fa-solid fa-arrow-left" onclick="goBackFun()"></i>
                </span>
                <span class="text-dark">1/10</span>
            </div>
            <div> 
                
                <div class="quiz-attend_time">
                    <div id="timer" class="timing_counter"><i class="fa-solid fa-clock"></i> 1:00</div>
                </div>
            
            </div>
            <div class="quiz_attent_number_cercle">
                <div  class="text-dark cercle_wrapper" id="cercle_wrapper"></div>
            </div>
        </div>
        
        <div class="quiz_attend_bottom_section">
            <h1>1.</h1>
            <p>Which of the following elements is a noble gas?</p>
        
            <div class="option_card_wraper">
            <!--data-->
            </div>
        
            <div class="selected_option">
            <!--data-->
            </div>
           

        <!-- next section -->
        
            <div class="submit__ui hidden">
                <div class="submit-item-box">
                    <div class="center-item">
                        <div class="success_message_actions">
                            <img src="<?=base_url()?>assets/success.png" alt="" />
                        </div>
                        <h1>Successfully Submitted</h1>
                        <div class="success_btn">
                            <button>View Result</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
            
        <div class="quiz_attend_bottom_design">
             <div class="next-btn-section">
                <button id="previousBtn" class="priv opacity_on">
                    <img src="<?=base_url('assets/practice/vector6.png')?>" alt="" />
                </button>
                <button style="background-color: #FABA3D; margin-top: -10px;">
                        <img src="<?=base_url('assets/practice/Vector8.png')?>" style="width: 50%; height: 50%;" alt="" />
                    </button>
                <button id="nextBtn">
                    <img src="<?=base_url('assets/practice/vector4.png')?>" alt="" />
                </button>
            <!-- id="nextBtn" -->
            </div>
        </div>
                
    </div>
    
    <div id="timeout_ui" class="time_out_ui hidden">
        <div class="top-section">
          <div class="arrow-section">
            <span ><i class="fa-solid fa-arrow-left" style="cursor: pointer; font-size: 13px" onclick="goBackhandlere()"></i></span>
          </div>
        </div>
        <div class="timeout_wrapper">
            <div class="time_out_section">
                <h1>Time is up!</h1>
            
                <div class="time_out_btn">
                    <button onclick="navigatBack()" id="goBack">Go Back</button>
                </div>
            </div>
        </div>
    </div> 
</section>

        
<!-- Popup HTML -->
<div id="popup" class="popup hidden">
    <div class="popup_bottom_section">
        <div class="attemted_wraper">
            <div class="attemted_left">
                <h3>3</h3>
                <p>Attempted</p>
            </div>
            <div class="attemted_right">
                <h3>3</h3>
                <p>Unattempted</p>
            </div>
        </div>
        
        <div class="attemted_count_popup"></div>
        
        
        <div class="popup_submit">
            <div class="left-btn">
                <button id="closePopupBtn">Cancel</button>
            </div>
            <div class="right-btn">
                <button>Submit</button>
            </div>
        </div>
    </div>
</div>

<script>
      document.addEventListener("DOMContentLoaded", () => {
        const mainContainer = document.querySelector(".main__container");
        const quizAttendSection = document.querySelector(".quiz_ui_attend_section");
        const startTestButton = document.getElementById("startTestButton");
        const nextButton = document.getElementById("nextBtn");
        const previousBtn = document.getElementById("previousBtn");
        const popup = document.getElementById("popup");
        const closePopupBtn = document.getElementById("closePopupBtn");
        const submitButton = document.querySelector(".popup_submit .right-btn button");
        const submitUI = document.querySelector(".submit__ui");
        const timeoutUI = document.getElementById("timeout_ui");
        const timerElement = document.getElementById("timer");

       
        
        const questions = <?php echo json_encode($questions); ?>;
        
        console.log(questions)
        var user_id = <?=$user_id?>;
        var exam_id = <?=$exam_id?>;
        var attempt_id = 0;
        
        // start here
        let currentQuestion = 0;
        const totalQuestions = questions.length;

        const selectedOptions = Array(totalQuestions).fill(null);
        const answeredQuestions = [];

        let timer;
        let timeLimit = <?=$quiz_details['total_seconds']?>;
        // Function to update the timer display
        function updateTimer() {
          const minutes = Math.floor(timeLimit / 60);
          let seconds = timeLimit % 60;
          seconds = seconds < 10 ? "0" + seconds : seconds;
          timerElement.textContent = `${minutes}:${seconds}`;
        }

        // Function to start the timer
        function startTimer() {
          updateTimer(); // Update the timer initially

          // Update the timer every second
          timer = setInterval(() => {
            timeLimit--;
            updateTimer();

            // Check if the time is up
            if (timeLimit <= 0) {
              clearInterval(timer);
              timerElement.textContent = "00:00"; // Display 00:00 when time is up
              showTimeoutUI();
            }
          }, 1000);
        }

        // Function to show the timeout UI
        function showTimeoutUI(){
          quizAttendSection.classList.add("hidden");
          timeoutUI.classList.remove("hidden");
        }
       

        startTestButton.addEventListener("click", () => {
          mainContainer.classList.add("hidden");
          quizAttendSection.classList.remove("hidden");
          updateQuestionUI(); // Update the UI with the first question
          save_test_start()
          startTimer();
        });

        previousBtn.addEventListener("click", () => {
          if (currentQuestion > 0) {
            currentQuestion--;
            updateQuestionUI();
          } else {
            previousBtn.classList.add("opacity_on");
          }
        });
        
        
       
        let selectedOptionData={
            qId:null,
            aId:null
        }
        let qIdArray=[]

        nextButton.addEventListener("click", () => {
          const selectedOption = selectedOptions[currentQuestion];
      
        if (selectedOptionData !== null) {
            const QuestianId = questions[currentQuestion]?.id;
            const { qId, aId } = selectedOptionData;
            
            // set to push all questians id oush
           if (!qIdArray.includes(QuestianId)) {
               qIdArray.push(QuestianId);
            }
            // Find the index of the existing answer in the answeredQuestions array
            const existingAnswerIndex = answeredQuestions.findIndex(answer => answer.qId === qId);
    
            if (existingAnswerIndex !== -1) {
                // Update the existing answer's aId
                answeredQuestions[existingAnswerIndex].aId = aId;
            } else {
                // Add new answer to answeredQuestions
                answeredQuestions.push({ qId, aId });
            }
        }

    
          
          if (currentQuestion >= 0) {
            previousBtn.classList.remove("opacity_on");
          } else {
            previousBtn.classList.add("opacity_on");
          }
          

          if (currentQuestion < totalQuestions - 1) {
            currentQuestion++;
            updateQuestionUI();
          } else {
            showPopup();
            const attemptedCountPopup = document.querySelector(".attemted_count_popup");
            const circleItems = attemptedCountPopup.querySelectorAll("span");

            const attemptedLeft = document.querySelector(".attemted_left h3");
            const unattemptedRight =
              document.querySelector(".attemted_right h3");

            function countAnsweredQuestions() {
              return answeredQuestions.filter(
                (answer) => answer.aId !== null
              ).length;
            }

            // Function to count the number of unanswered questions
            function countUnansweredQuestions() {
              return totalQuestions - countAnsweredQuestions();
            }

            const answeredCount = countAnsweredQuestions();
            const unansweredCount = countUnansweredQuestions();

            attemptedLeft.textContent = answeredCount;
            unattemptedRight.textContent = unansweredCount;
            

            circleItems.forEach((item, index) => {
               const { qId, aId } = selectedOptionData;
   
              if (selectedOptions[index] !== null) {
                  
                const isAnswered = answeredQuestions.some(
                  (answer) => answer.qId !=null && answer.aId !=null
                );

                if (isAnswered) {
                  item.classList.add("attendedClass"); // Add 'attendedClass' class if the question is answered
                  item.classList.remove("unAttended"); // Remove 'unAttended' class
                } else {
                  item.classList.remove("attendedClass"); // Remove 'attendedClass' class
                  item.classList.add("unAttended"); // Add 'unAttended' class if the question is not answered
                }
              } else {
                item.classList.remove("attendedClass"); // Remove 'attendedClass' class
                item.classList.add("unAttended"); // Add 'unAttended' class if there is no selected answer
              }
            });
          }
        });

        function updateAttemptedCountPopup() {
          const attemptedCountPopup = document.querySelector(
            ".attemted_count_popup"
          );
          attemptedCountPopup.innerHTML = ""; // Clear the existing content

          // Loop through the number of questions and create span elements
          for (let i = 0; i < totalQuestions; i++) {
            const span = document.createElement("span");
            span.textContent = i + 1; // Set the text content to the question number
            span.addEventListener("click", () => {
              hidePopup(); // Close the popup
              navigateToQuestion(i + 1); // Navigate to the corresponding question
            });
            attemptedCountPopup.appendChild(span); // Append the span to the attemptedCountPopup
          }
        }

        // Call the function to initialize the attempted count popup UI
        updateAttemptedCountPopup();

        closePopupBtn.addEventListener("click", () => {
          hidePopup();
        });
        
        
         function save_test_start(){
            var user_id = <?=$user_id?>;
            var exam_id = <?=$exam_id?>;

            $.ajax({
                type: 'POST',
                url: "<?=base_url('exam/exam_save_start'); ?>",
                data: {
                    'user_id' : user_id,
                    'exam_id' : exam_id
                },
                dataType: "json",
                success: function(data) {
                    console.log(data);
                    attempt_id = data.attempt_id;
                    
                }
            });
        }
       
    // data submit section
        submitButton.addEventListener("click", () => {
           clearInterval(timer); // Stop the timer
            const updatedAnsweredQuestions = [];

            qIdArray.forEach(qId => {
              const foundQuestion = answeredQuestions.find(question => question.qId === qId);
              
              if (foundQuestion) {
                  const aIdArray = foundQuestion.aId ? [String(foundQuestion.aId)] : [''];
                  updatedAnsweredQuestions.push({ 'question_id':qId, 'answer': aIdArray });
              } else {
                  updatedAnsweredQuestions.push({ 'question_id':qId, 'answer': [''] });
              }
            });
            

              var formData = new FormData();
                formData.append('user_id', user_id);
                formData.append('attempt_id', attempt_id);
                formData.append('time_taken', timeLimit);
                
                // Append user_answers to formData
                updatedAnsweredQuestions.forEach(function(question) {
                    formData.append('user_answers[' + question.question_id + '][question_id]', question.question_id);
                    formData.append('user_answers[' + question.question_id + '][answer]', question.answer);
                });
                
                console.log('success data',formData); 
                $.ajax({
                    type: 'POST',
                    url: "<?= base_url('exam/exam_save_result'); ?>",
                    data: formData,
                    contentType: false, // To prevent jQuery from setting the content type
                    processData: false, // To prevent jQuery from processing the data
                    dataType: "json",
                    success: function(data) {
                        console.log('success data',data);
                        window.location.replace("<?=base_url('exam/exam_show_result/'.$user_id.'/'.$exam_id)?>");

                    }
                });

           hidePopup();
        });
        

        document.querySelectorAll(".option_card").forEach((card, index) => {
          card.addEventListener("click", function () {
            document.querySelectorAll(".option_card")
              .forEach((c) => c.classList.remove("active-item"));
            this.classList.add("active-item");

            // Save the selected option index
            selectedOptions[currentQuestion] = index;
            
           // Add active-item class to the corresponding selected option
            document.querySelectorAll(".selected_option span")
              .forEach((span) => span.classList.remove("active-item"));
            document.querySelectorAll(".selected_option span")
              [index].classList.add("active-item");
         
          });
        });

        // Function to navigate to a specific question
        function navigateToQuestion(questionNumber) {
          // Find the index of the question with the given number
          const index = questionNumber - 1; 
          if (index >= 0 && index < totalQuestions) {
            currentQuestion = index;
            updateQuestionUI(); // Update the UI to show the selected question
          }
        }

        // Update cercleWrapper creation to assign the click event to each span
        function updateCercleWrapper() {
          const cercleWrapper = document.getElementById("cercle_wrapper");
          cercleWrapper.innerHTML = ""; // Clear the existing content

          for (let i = 0; i < totalQuestions; i++) {
            const span = document.createElement("span");
            span.classList.add("cercle_item");
            span.textContent = i + 1; // Set the text content to the question number
            span.dataset.questionNumber = i + 1; // Set the data attribute for question number
            cercleWrapper.appendChild(span); // Append the span to the cercleWrapper

            // Add event listener to each span
            span.addEventListener("click", () => {
              const questionNumber = parseInt(span.dataset.questionNumber);
              navigateToQuestion(questionNumber);
            });
          }
        }
       updateCercleWrapper();
       
       function updateQuestionUI() {
          const current = questions[currentQuestion];
          document.querySelector(".quiz_attend-arrow span:nth-child(2)").textContent = `${currentQuestion + 1}/${totalQuestions}`;
          document.querySelector(".quiz_attend_bottom_section h1").textContent = `${currentQuestion + 1}.`;
          
          const titleString = questions[currentQuestion].title;
          const decodedTitle = decodeURIComponent(titleString.replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
          const titleWithoutPTags = decodedTitle.replace(/<p>/g, '').replace(/<\/p>/g, '');
          document.querySelector(".quiz_attend_bottom_section p").textContent = titleWithoutPTags;
          
          const decodedOptions = JSON.parse(questions[currentQuestion]?.options).map(option => {
            const textWithoutTags = option.replace(/<[^>]*>/g, '');
            return textWithoutTags.trim(); 
          });
        
          // Clear existing option cards
          const optionCardWrapper = document.querySelector('.option_card_wraper');
          optionCardWrapper.innerHTML = '';
        
          // Create option cards dynamically
          decodedOptions.forEach((option, index) => {
            const optionCard = document.createElement('div');
            optionCard.classList.add('option_card');
        
            const singleOption = document.createElement('div');
            singleOption.classList.add('single_option');
        
            const label = document.createElement('label');
            label.classList.add('option_label');
            label.style.cursor = 'pointer';
            label.style.display = 'block';
            label.style.padding = '10px';
            label.style.borderRadius = '5px';
            label.style.width = '100%';
        
            const h1 = document.createElement('h1');
            h1.classList.add('option_title');
            h1.textContent = option;
        
            label.appendChild(h1);
            singleOption.appendChild(label);
            optionCard.appendChild(singleOption);
            optionCardWrapper.appendChild(optionCard);
        
            // Add click event listener to each option card
            
            optionCard.addEventListener('click', () => {
              handleOptionClick(index,questions[currentQuestion]?.id);
            });
            
             const selectedOptionWrapper = document.querySelector('.selected_option');
             selectedOptionWrapper.innerHTML = ''; // Clear existing spans

             decodedOptions.forEach((option, index) => {
             const span = document.createElement('span');
             span.textContent = String.fromCharCode(65 + index); // A, B, C, D, etc.
             selectedOptionWrapper.appendChild(span);
             
             
             });
             
          });
          
            const selectedOptionWrapper = document.querySelector('.selected_option');
             selectedOptionWrapper.innerHTML = ''; // Clear existing spans

             decodedOptions.forEach((option, index) => {
             const span = document.createElement('span');
            //  span.textContent = String.fromCharCode(65 + index); // A, B, C, D, etc.
            //  selectedOptionWrapper.appendChild(span);
             
               span.addEventListener('click', () => {
                   handleOptionClick(index,questions[currentQuestion]?.id);
               });
             });
          
     
           const circleItems = document.querySelectorAll(".cercle_item");
           circleItems.forEach((item, index) => {
               const { qId, aId } = selectedOptionData;
   
              if (selectedOptions[index] !== null) {
              

                const isAnswered = answeredQuestions.some(
                  (answer) => answer.qId !=null && answer.aId !=null
                );

                if (isAnswered) {
                  item.classList.add("answered"); // Add 'attendedClass' class if the question is answered
                  item.classList.remove("dd"); // Remove 'unAttended' class
                } else {
                  item.classList.remove("answered"); // Remove 'attendedClass' class
                  item.classList.add("dd"); // Add 'unAttended' class if the question is not answered
                }
              } else {
                item.classList.remove("answered"); // Remove 'attendedClass' class
                item.classList.add("dd"); // Add 'unAttended' class if there is no selected answer
              }
            });
        
          // Remove active-item class from all option cards and selected options
          document.querySelectorAll(".option_card").forEach((card) => card.classList.remove("active-item"));
        //   document.querySelectorAll(".selected_option span").forEach((span) => span.classList.remove("active-item"));
        
          // Add active-item class to the selected option if any
          if (selectedOptions[currentQuestion] !== null) {
            document.querySelectorAll(".option_card")[selectedOptions[currentQuestion]].classList.add("active-item");
            // document.querySelectorAll(".selected_option span")[selectedOptions[currentQuestion]].classList.add("active-item");
          }
    }


       // Function to handle option click
        function handleOptionClick(index,questianId) {
          selectedOptions[currentQuestion] = index;
          
         selectedOptionData={
            qId:questianId,
            aId:index+1
        }
          updateQuestionUI();
        }


        // popup section logic
        function showPopup() {
          popup.classList.remove("hidden");
          setTimeout(() => {
            popup.classList.add("visible");
          }, 10); // Slight delay to ensure the transition works
        }

        function hidePopup() {
          popup.classList.remove("visible");
          setTimeout(() => {
            popup.classList.add("hidden");
          }, 300); // Match this delay with the transition duration
        }

        function showSubmitUI() {
          quizAttendSection.classList.add("hidden");
          submitUI.classList.remove("hidden");
        }
      });
      
      
      function navigatBack() {
        window.location.href =  "<?=base_url('exam/exam_web_view/'.$exam_id.'/'.$user_id)?>";
      }

      function goBackhandlere() {
        window.location.href = "<?=base_url('exam/exam_web_view/'.$exam_id.'/'.$user_id)?>";
      }
      function goBackFun() {
        window.location.href = "<?=base_url('exam/exam_web_view/'.$exam_id.'/'.$user_id)?>";
      }
     
</script>
