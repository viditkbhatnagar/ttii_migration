<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Results</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==" crossorigin="anonymous" referrerpolicy="no-referrer"/>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap" rel="stylesheet">
        
        <style>
            * {
                padding: 0;
                margin: 0;
            }
            
            body{
                background-color: #830ABE;
            }
            main{
                background-image: url(<?=base_url(get_file('uploads/quiz/Result_bg.jpg'))?>);
                background-repeat: no-repeat;
                background-size: cover;
                min-height: 100vh;
                max-width: 500px;
            }
        
            .congratspara{
                font-weight: 100;
            }
        
            .result-content{
                min-height: 50vh;
                
            }
        
            .btn-myprimary, .btn-myprimary:hover, .btn-outline-myprimary:hover{
                background-color: #830ABE;
                border-color: #830ABE;
                color: #fff;
            }
            .btn-outline-myprimary{
                border-color: #830ABE;
                color: #830ABE;
            }
        
            .bg-success-mysubtle{
                background-color: #1EC2970D;
            }
            .bg-danger-mysubtle{
                background-color: #F2443E0D;
                ;
            }
            .bg-mymuted{
                background-color: #F4F4F4;
                ;
            }
        
            .my-my5{
                margin-bottom: 2em;
            }
        
            .py-py5{
                padding-block: 2em;
            }
            
            .w-55{
                width:55%;
            }
        
            @media screen and (max-width: 400px) {
                .myminicardcontent{
                    font-size: 0.7rem;
                }
                .my-my5{
                    margin-bottom: 0em;
                }
        
                
            }
            
            .img-fluid{
                margin-right: 2px;
            }
            
            .card-message {
                position: relative;
                width: 100%;
                opacity: 1; /* Ensure the text is fully visible */
                overflow: hidden; /* Hide overflow to ensure text stays within the boundaries */
                white-space: nowrap; /* Ensure the text remains in a single line */
            } 
            
            .moving-text {
                font-size: 17px;
                font-family: "Kay Pho Du", serif;
                font-weight: 550;
                font-style: normal;
                display: inline-block;
                opacity: 1; /* Ensure the text is fully visible */
                animation: slide-in 1s ease forwards, marquee 20s linear infinite 1s; /* Slide in first, then move */
            }
            
            /* Keyframe for sliding in from the left */
            @keyframes slide-in {
                100% {
                    transform: translateX(0); /* Move to its original position */
                }
            }
            
            /* Keyframe for scrolling across the box */
            @keyframes marquee {
                0% {
                    transform: translateX(0); /* Start at the original position */
                }
                100% {
                    transform: translateX(-100%); /* Move text to the left end */
                }
            }
            
            .exam_title{
                text-align:center;
                font-size:20px;
                background-color: #ffffff !important;
                padding:20px 10px; margin: 0;
                font-weight: 600!important;
            }
            
            /* Question */
            #questions_list{margin-bottom:70px;}
            .quiz_question_single_outer{padding:25px 5px 5px 5px;}
            .quiz_question_single{background-color: #ffffff;padding:5px;}
            .question_type{border-right:1px solid #b0b0b0 !important;}
            .question_meta{padding:5px; border-bottom: 1px solid #e1d9d9 !important; font-size:12px;}
            .single_question_no{font-weight: 600!important}
            .question_hint{padding:5px 5px;line-height: 1.7em;color:#444;overflow-x: scroll;text-align: left!important}
            .solution_title{
                border-top: 1px solid #efe7e7 !important;
                margin-top: 25px!important;
                padding-top: 8px!important;
                margin-bottom: 8px!important;
                font-weight: 600!important;
                text-align: left!important;
            }
            .single_option_outer{padding:2px;}
            
            .question_container{
                padding:8px!important;
                padding-top: 3px!important;
            }
            .answer_status{
                padding:5px !important;
                background-color: #ededed!important;
            }
            .question_options{
                text-align:center!important;
                padding:40px 10px;
            }
            .question_number{font-weight:bold!important;}
            .question_title_container{
                margin-bottom: 10px;
                max-width: 500px!important;
                line-height: 35px!important;
            }
            
            .single_option label{
                cursor: pointer;
                color: rgba(35, 34, 34, 0.78);
                text-align: center;
                border:2px solid #176486 !important;
                border-radius: 5px;
                padding:5px 5px!important;
                width:100%;
                background-color: #ffffff;
                transition: 0.8s;
                display: block;
            }
            .single_option label:hover{
                /*background: linear-gradient(to right, rgba(23, 100, 134, 0.78), rgba(31, 128, 171, 0.75))!important;*/
                /*border:2px solid rgba(23, 100, 134, 0.78) !important;*/
                /*color: #ffffff;*/
            }
            
            .single_option input[type=radio]{
                display: none;
            }
            .single_option input[type=radio]:checked+.option_label{
                background: linear-gradient(to right,#176486, #176486)!important;
                border:2px solid #176486!important;
                color:#ffffff;
            }
            .single_option input[type=checkbox]{
                display: none;
            }
            .single_option input[type=checkbox]:checked+.option_label{
                background: linear-gradient(to right,#176486, #176486)!important;
                border:2px solid #176486!important;
                color:#ffffff;
            }
            
            .single_option_result label{
                border: 1px solid #4da5cc !important;
                margin-bottom:5px;
                overflow-x: scroll!important;
                /*text-align:left !important;*/
                /*background-color: #ebf3fc;*/
            }
            .single_option_result label:hover{
                border: 1px solid #4da5cc !important;
                margin-bottom:5px;
                background: transparent !important;
                color:rgba(35, 34, 34, 0.78)!important;
            
            }
            
            .answer_status_correct img{width: 140px;height: 140px;}
            .answer_status_wrong img{width: 80px;height: 80px;margin-top:20px;}
            .answer_status_skipped img{width: 80px;height: 80px;margin-top:20px;margin-bottom:20px}
            
            .answer_show{margin-top:10px;text-align: center!important;}
            .answer_show fieldset{
                font-weight:600;
                font-size: 16px;
                width:90%;
                margin:auto;
                padding:2px 5px 5px;
                color:#555555;
                border-radius:7px;
                overflow-x: scroll!important;
            }
            .answer_show fieldset legend{
                float: none!important;
                font-weight:500;
                border-radius:12px;
                color: #ffffff;
                width: 130px;
                padding: 2px 4px;
                font-size: 12px;
            
            }
            
            .correct_answer fieldset{
                border: 2px #18A558 solid;
            }
            .correct_answer fieldset legend{
                border: 1px #18A558 solid;
                background-color:#18A558;
            }
            .wrong_answer fieldset{
                border: 2px #E43D40 solid;
            }
            .wrong_answer fieldset legend{
                border: 1px #E43D40 solid;
                background-color:#E43D40;
            }
            .skipped_answer fieldset{
                border: 2px #145DA0 solid;
            }
            .skipped_answer fieldset legend{
                border: 1px #145DA0 solid;
                background-color:#145DA0;
            }
            
            
          .option {
            transition: all 0.3s ease;
            cursor: pointer;
            border: 2px #ebebeb solid;
            position: relative;
            overflow: hidden;
            border-radius: 8px; /* Smooth rounded corners */
            z-index: 1;
            display : flex;
            align-items : center;
            justify-content : center;
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
          
          #options-container{
              padding-bottom: 2%;
          }
          
          .answer_status_correct span, .answer_status_wrong span{font-weight: 400;font-size:19px}
            
        .btn-outline-info:hover{
            color:#fff !important;
        }
        
        #scorediv{
            padding-top: 2rem !important;
            padding-bottom: 3rem !important;
        }
    </style>
</head>
    
    <body>
        <main class="mx-auto">
            <div class="text-white">
                <div class="py-py5">
                    <h3 class="h4   text-center">Quiz Result</h3>
                </div>
                <div>
                    <h3 class="h2 text-center  m-0">Congratulations!</h3>
                    <p class="fs-6 text-center congratspara">You have completed the quiz</p>
                </div>
            </div>
            <div class="text-center">
                <img src="<?=base_url(get_file('uploads/quiz/trophy.png'))?>" class="mx-auto" alt="">
            </div>
            <div class="bg-white result-content mx-3 mb-1 rounded-4">
                <div class="container-fluid">
                    <div class="result-card-section">
                        <div class="row pt-4 mt-1 px-2">
                            <div class="col-2"> <!--empty div placed here for design purpose--> </div>
                            <div class="col-8"><h3 class="h5 text-center fw-bold my-2">Here's your Result</h3></div>
                            <!--<div class="col-2"><img src="<?=base_url(get_file('uploads/quiz/results_share.png'))?>" alt="cross"></div>-->
                        </div>
                        <div class="row mb-4">
                            <div class="col-12 d-flex align-items-center justify-content-center">
                                <div class="myminicard bg-mymuted w-55 text-center py-1 px-2 rounded-pill"><span class="text-muted">Time Taken: </span><?=get_time($attempt['time_taken'])?></div>
                            </div>
                        </div>
                        <?php 
                            $percentage = ($attempt['correct']/$attempt['question_no'])*100; 
                            if($percentage > 79){
                                $color = '#30c06a';
                            }else{
                                $color = '#dc3545';
                            }
                        ?>
                        <div class="row result-data my-my5"> 
                            <div class="col-1 py-2"></div>
                            <div class="col-10 py-2">
                                <div class="mycard border rounded-3 py-3 px-1" id="scorediv">
                                    <div class="d-flex align-items-center justify-content-center mb-2"> 
                                        <div class="px-4" style="white-space: nowrap;">  
                                            <span class="fs-12 fw-bold" style="color:<?=$color?>; font-size:30px"><?=round($percentage)?>%</span> <span> Score</span>
                                        </div>
                                    </div>
                                    <div class="d-flex align-items-center justify-content-center">
                                        <span class="myminicardcontent fs-6" style="display: block;">
                                            You attempted 
                                            <span class="fw-bold" style="color:#4e90c3; font-size:20px"><?=$attempt['question_no']?> questions </span> 
                                            and
                                        </span>
                                    </div>
                                    
                                    <div class="d-flex align-items-center justify-content-center">
                                        <span class="myminicardcontent fs-6" style="display: block;">
                                            From that 
                                            <span class="fw-bold" style="color:#30c06a; font-size:20px"><?=$attempt['correct']?> answer</span> 
                                             is correct
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-1 py-2"></div>
    
                            <!--<div class="col-4 py-2 d-flex align-items-center justify-content-center">-->
                            <!--    <div class="mycard border border-success bg-success-mysubtle rounded-3 py-3 px-1">-->
                            <!--        <div class="d-flex align-items-center justify-content-center mb-2"> -->
                            <!--            <div class="px-4" style="white-space: nowrap;">-->
                            <!--                <img class="img-fluid mb-1" src="<?=base_url(get_file('uploads/quiz/results_check.png'))?>" alt=""> -->
                            <!--                <span class="fs-5 fw-bold"><?=$attempt['correct']?></span>-->
                            <!--            </div>-->
                            <!--        </div>-->
                            <!--        <div class="d-flex align-items-center justify-content-center">-->
                            <!--            <span class="myminicardcontent" style="white-space: nowrap;">Correct Answer</span>-->
                            <!--        </div>-->
                            <!--    </div>-->
                            <!--</div>-->
                            <!--<div class="col-4 py-2 d-flex align-items-center justify-content-center">-->
                            <!--    <div class="mycard border border-danger bg-danger-mysubtle rounded-3 py-3 px-1">-->
                            <!--        <div class="d-flex align-items-center justify-content-center mb-2"> -->
                            <!--            <div class="px-4" style="white-space: nowrap;">-->
                            <!--                <img class="img-fluid mb-1" src="<?=base_url(get_file('uploads/quiz/results_cross.png'))?>" alt=""> -->
                            <!--                <span class="fs-5 fw-bold"><?=$attempt['incorrect']?></span>-->
                            <!--            </div>-->
                            <!--        </div>-->
                            <!--        <div class="d-flex align-items-center justify-content-center">-->
                            <!--            <span class="myminicardcontent" style="white-space: nowrap;">Wrong Answer</span>-->
                            <!--        </div>-->
                            <!--    </div>-->
                            <!--</div>-->
                        </div>
                        
                        <?//php if($percentage < 80) { ?>
                            <div class="row d-none">
                                <div class="col-12 py-2">
                                    <div class="mycard border border-primary rounded-3 py-3 px-1 overflow-hidden card-message">
                                        <div class="d-flex align-items-center justify-content-start p-2">
                                            <span class="moving-text">&nbsp; 100% of students are more successful when they re-watch the lesson a 2nd time...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?//php } ?>
                    </div>
                    
                    
                    <div class="btn-section py-3">
                        
                        <?//php if($percentage < 80 ) { ?>
                            <div class="row d-none">
                                <div class="col-4">
                                    <button id="show_answers_btn"  class="w-100 my-2 btn btn-outline-myprimary" onclick="show_answers();">View <br> Answers</button>
                                    <button id="hide_answers_btn" style="display:none"  class="w-100 my-2 btn btn-outline-myprimary" onclick="hide_answers();">Hide <br> Answers</button>
                                </div>
                                
                                <div class="col-4">
                                    <a href="<?=base_url('quiz/index/'.$user_id.'/'.$exam_id)?>" class="w-100 my-2 btn btn-outline-info">Re-Attempt Quiz</a>
                                </div>
                                
                                <div class="col-4">
                                        <a class="w-100 my-2 btn btn-primary" onclick="Back.postMessage(1);">Re-Watch Lesson</a>
                                </div>
                            </div>
                            <a class="w-100 my-2 btn btn-myprimary d-none" onclick="Back.postMessage(1);">Back to Home</a>
                        <?//php } else {?>
                            <div class="row">
                                <div class="col-6">
                                    <button id="show_answers_btn"  class="w-100 my-2 btn btn-outline-myprimary" onclick="show_answers();">View <br> Answers</button>
                                    <button id="hide_answers_btn" style="display:none"  class="w-100 my-2 btn btn-outline-myprimary" onclick="hide_answers();">Hide <br> Answers</button>
                                </div>
                                
                                <div class="col-6">
                                    <a class="w-100 my-2 btn btn-myprimary" onclick="Back.postMessage(1);">Back to <br> Home</a>
                                </div>
                            </div>
                        <?//php } ?>
                    </div>
                </div>
                
                <hr>
                
                <section class="bg-white result-content mx-3 mb-1 rounded-4 p-3" id="quiz_solutions" style="display: none;">
                    <h2 class="exam_title text-center">Questions & Answers</h2>
                    <div id="questions_list">
                        <?php
                                                                  
                        foreach($user_answers as $q_no => $question){
                            $question_no = ($user_id == 1121) ? $question['question_id'] : $q_no + 1;
                            $options = json_decode($question['options'], true);
                            // Get correct answers based on question type
                            if($question['question_type'] == 0) {
                                $correct_answers = [$question['answer_id']];
                            } else {
                                $correct_answers = json_decode($question['answer_ids'], true);
                            }
                            $answer_submitted = json_decode($question['answer_submitted'], true);
                        ?>
                            <div class="quiz_question_single_outer mb-3" id="question_<?=$question['id']?>">
                                <div class="single_question border rounded-4 p-3" style="background: radial-gradient(circle, #dff4ea 0%, #f7f7f7 90%);">
                                    <div class="d-flex justify-content-between align-items-center p-2">
                                        <span class="fs-5 text-muted">Question <?=$question_no?></span>
                                    </div>
                
                                    <div class="question_title question_title_container mt-2 mb-3" id="question_show_<?=$question['question_id']?>">
                                        <p class="fs-5 fw-bold"><?= strip_tags(html_entity_decode($question['title'])) ?></p>
                                    </div>
                
                                    <div class="options-list">
                                        <?php
                                        
                                        // Use the question_type from the quiz table
                                        $question_type = $question['question_type'];
                                        foreach ($options as $op_key => $option) {
                                            $op_id = $op_key + 1;
                                            $is_correct = in_array($op_id, $correct_answers);
                                            $is_selected = in_array($op_id, $answer_submitted);
                
                                            $option_class = 'option rounded-4 p-2 mb-2';
                                            $option_class .= $is_correct ? ' bg-success text-white' : ($is_selected ? ' bg-danger text-white' : ' bg-light');
                                        ?>
                                            <div class="<?=$option_class?>">
                                                <?php if ($question_type == 1): ?>
                                                    <p class="m-0"><?=html_entity_decode($option)?></p>
                                                <?php else: ?>
                                                    <img src="<?=base_url('uploads/question_bank/'.$option)?>" style="height:65px;width: auto" alt="Option image">
                                                <?php endif; ?>
                                            </div>
                                        <?php } ?>
                                    </div>
                
                                    <div class="answer_status text-center mt-3">
                                        <?php
                                        if ($question['answer_status'] == 1) {
                                            echo '<div class="text-success">Your Answer is Correct</div>';
                                        } elseif ($question['answer_status'] == 2) {
                                            echo '<div class="text-danger">Your Answer is Incorrect</div>';
                                        } elseif ($question['answer_status'] == 3) {
                                            echo '<div class="text-info">Skipped Question</div>';
                                        }
                                        ?>
                                    </div>
                
                                    <?php if (!empty($question['solution']) || !empty($question['solution_file'])): ?>
                                        <div class="solution mt-3">
                                            <h5>Solution:</h5>
                                            <div class="<?=$question['is_equation_solution'] != 1 ? '' : 'equation_container'?>" id="solution_show_<?=$question['question_id']?>">
                                                <?php
                                                if ($question['is_equation_solution'] == 1) {
                                                    echo print_equation($question['solution']);
                                                } else {
                                                    echo html_entity_decode($question['solution']);
                                                }
                
                                                if (is_file('uploads/question_bank/'.$question['solution_file'])) {
                                                    echo '<img src="'.base_url('uploads/question_bank/'.$question['solution_file']).'" class="w-100 mt-2" alt="Solution image">';
                                                }
                                                ?>
                                            </div>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                        <?php } ?>
                    </div>
                </section>

            </div> 
            
        </main>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script>
            function show_answers(){
                $('#show_answers_btn').hide();
                $('#hide_answers_btn').show();
                // $('#show_answers_btn_loading').show();
                $('#quiz_solutions').show();
                // show_equation();
    
                // setTimeout(function() {
                //     document.getElementById('quiz_solutions').scrollIntoView({behavior: "smooth"});
                //
                //     $('#show_answers_btn_loading').hide();
                // }, 3000);
    
            }
            
            function hide_answers(){
                $('#show_answers_btn').show();
                $('#hide_answers_btn').hide();
                // $('#show_answers_btn_loading').show();
                $('#quiz_solutions').hide();
                // show_equation();
    
                // setTimeout(function() {
                //     document.getElementById('quiz_solutions').scrollIntoView({behavior: "smooth"});
                //
                //     $('#show_answers_btn_loading').hide();
                // }, 3000);
    
            }
        </script>
    </body>
</html>
