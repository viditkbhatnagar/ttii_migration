<?php 
    if(isset($attempt) && isset($user_answers)){
    
    // Explode the duration into hours, minutes, and seconds
    list($hours, $minutes, $seconds) = explode(':', $attempt['time_taken']);
    
    // Format the duration
    $formattedTime = '';
    
    // Remove leading zero from hours if present
    $hours = ltrim($hours, '0');
    
    if ($hours > 0) {
        $formattedTime .= $hours . ' Hr ';
    }
    
    if ($minutes > 0) {
        $formattedTime .= $minutes . ' Min ';
    }
    
    if ($seconds > 0) {
        $formattedTime .= $seconds . ' Sec';
    }
?>
    <div id="practice_ui_outer">
        <div id="practice_ui_container">
            <div id="practice_ui_result">
                <section id="test_result_summary">
                    <div class="exam_title">
                        Practice Result
                    </div>
                    <div id="practice_result_meta">
                        <b>No of Questions: </b> <?=$attempt['question_no']?><br>
                        <b>Time Taken: </b> <?=$formattedTime?><br>
                    </div>
                    <div class="row">
                        <div class="col col-6 practice_score_outer_item">
                            <div class="practice_score_outer">
                                <div class="practice_score">
                                    <h3 class="text-success"><?=$attempt['correct'] ?? 0?></h3>
                                    <span >Correct</span>
                                </div>
                            </div>
                        </div>
                        <div class="col col-6 practice_score_outer_item">
                            <div class="practice_score_outer">
                                <div class="practice_score">
                                    <h3 class="text-danger"><?=$attempt['incorrect'] ?? 0?></h3>
                                    <span >Incorrect</span>
                                </div>
                            </div>
                        </div>
                        <div class="col col-6 practice_score_outer_item">
                            <div class="practice_score_outer">
                                <div class="practice_score">
                                    <h3 class="text-info"><?=$attempt['skip'] ?? 0?></h3>
                                    <span >Unattempted</span>
                                </div>
                            </div>
                        </div>
                        <div class="col col-6 practice_score_outer_item">
                            <div class="practice_score_outer">
                                <div class="practice_score">
                                    <h3 class="text-primary"><?=$attempt['score'] ?? 0?></h3>
                                    <span >Score</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>
                <button id="show_answers_btn" class="btn btn-primary" onclick="show_answers();">Show Answers</button>
                <section id="practice_solutions"  class="hide_section">
                    <hr>
                    <h2 class="exam_title">
                        Questions & Answers
                    </h2>
                    <div id="questions_list">
                        <?php
                        foreach($user_answers as $q_no => $question){
                            if($user_id == 1121){
                                $question_no = $question['question_id'];
                            }else{
                                $question_no = $q_no+1;
                            }
                            ?>
                            <div class="practice_question_single_outer" id="question_<?=$question['question_id']?>">
                                <div class="single_question">
                                    <span class="text-muted single_question_no">Question: <?=$question_no?></span>
                                    <div class="question_title <?=$question['is_equation']!=1 ? 'question_title_container' : 'equation_container'?>" id="question_show_<?=$question['question_id']?>">
                                        <?php
                                        if($question['is_equation']==1){
                                            echo print_equation($question['title']);
                                        }else{
                                            echo html_entity_decode($question['title']);

                                            if(is_file('uploads/question_bank/'.$question['title_file'])){
                                                ?>
                                                <img src="<?=base_url('uploads/question_bank/'.$question['title_file'])?>" style="width: 100%" alt="Question could not be loaded!">
                                                <?php
                                            }
                                        }
                                        ?>
                                    </div>
                                    <div class="answer_status">
                                        <?php
                                            if($question['answer_status']==1){
                                                echo "<div class=\"text-success\">Your Answer is Correct</div>";
                                            }elseif($question['answer_status']==2){
                                                echo "<div class=\"text-danger\">Your Answer is Incorrect</div>";
                                            }elseif($question['answer_status']==3){
                                                echo "<div class=\"text-info\">Skipped Question</div>";
                                            }
                                        ?>
                                    </div>

                                    <div class="text-center">
                                        <?php
                                        $options = json_decode($question['options'], true);
                                        $correct_answers    = json_decode($question['correct_answers'], true);
                                        $answer_submitted   = json_decode($question['answer_submitted'], true);

                                        foreach($options as $op_key => $option) {
                                            $op_id = $op_key + 1;
                                            if(in_array($op_id, $correct_answers)){
                                                ?>
                                                <div class="answer_show correct_answer">
                                                    <fieldset>
                                                        <legend>CORRECT ANSWER</legend>
                                                        <?=html_entity_decode($option)?>
                                                    </fieldset>
                                                </div>
                                                <?php
                                            }
                                        }
                                        ?>
                                        <?php
                                        if($question['answer_status'] == '2'){
                                            foreach($options as $op_key => $option) {
                                                $op_id = $op_key + 1;
                                                if(in_array($op_id, $answer_submitted)){
                                                    ?>
                                                    <div class="answer_show wrong_answer" >
                                                        <fieldset>
                                                            <legend>YOUR ANSWER</legend>
                                                            <?=html_entity_decode($option)?>
                                                        </fieldset>
                                                    </div>
                                                    <?php
                                                }
                                            }
                                        }
                                        ?>
                                        
                                        <?php
                                        if($question['answer_status'] == '3'){
                                            foreach($options as $op_key => $option) {
                                                $op_id = $op_key + 1;
                                                if(in_array($op_id, $answer_submitted)){
                                                    ?>
                                                    <div class="answer_show skipped_answer" >
                                                        <fieldset>
                                                            <legend>YOUR ANSWER</legend>
                                                            <?=html_entity_decode($option)?>
                                                        </fieldset>
                                                    </div>
                                                    <?php
                                                }
                                            }
                                        }
                                        ?>
                                    </div>
                                    <div class="solution_title">
                                        Solution:
                                    </div>
                                    <div class="question_hint" >
                                        <div class="<?=$question['is_equation_solution']!=1 ? '' : 'equation_container'?>" id="solution_show_<?=$question['question_id']?>">

                                            <?php
                                            if($question['is_equation_solution']==1){
                                                echo print_equation($question['solution']);
                                            }else {
                                                echo html_entity_decode($question['solution']);
                                            }
                                            ?>
                                        </div>
                                        <?php
                                        $solution_file = 'uploads/question_bank/'.$question['solution_file'];
                                        if(is_file($solution_file)){
                                            ?>
                                            <img src="<?=base_url($solution_file)?>" style="width:100%;height:auto;">
                                            <?php
                                        }
                                        ?>
                                    </div>
                                </div>
                            </div>
                            <hr>
                            <?php
                        }
                        ?>
                    </div>
                </section>

            </div>
        </div>
    </div>


    <script type="text/javascript">

        //hide practice & results on load
        let practice_solutions = $('#practice_solutions');

        function show_answers(){
            show_loading();
            practice_solutions.show();
            show_equation();
            $('#show_answers_btn').hide();
            hide_loading();
            document.getElementById('practice_solutions').scrollIntoView({behavior: "smooth"});
        }

        /**
         SCRIPT MATHPIX
         */
        let script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/mathpix-markdown-it@1.0.40/es5/bundle.js";
        document.head.append(script);

        script.onload = function() {
            const isLoaded = window.loadMathJax();
            if (isLoaded) {
                // show_equation();
                // hide_loading();
            }
        }

        /**
         * PRINT QUESTION
         */

        function show_equation(){
            const elements = document.querySelectorAll('.equation_container');
            Array.from(elements).forEach((element, index) => {
                // conditional logic here.. access element
                // console.log(element.id);
                const text = document.getElementById(element.id).innerText;
                const el = window.document.getElementById(element.id);
                if (el) {
                    const options = {
                        htmlTags: true,
                        outMath: { //You can set which formats should be included into html result
                            include_mathml: true,
                            include_asciimath: true,
                            include_latex: true,
                            include_svg: true, // sets in default
                            include_tsv: true,
                            include_table_html: true, // sets in default
                        }
                    };
                    // const html = window.render(text, options);
                    const html = window.markdownToHTML(text, options);
                    // html.replace(/(\\r)|(\\n)/g,"<br>");
                    el.innerHTML = html;
                }
            });
        }

    </script>
    <?php
}
?>
