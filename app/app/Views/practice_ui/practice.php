<?php
if(isset($questions) && isset($practice_details)){
    ?>
    <div id="practice_ui_outer">
        <div id="practice_ui_container">
            <div id="practice_ui_start" class="show_section">
                <h2 id="practice_title">Practice Questions</h2>
                <span id="practice_question_count">No of Questions: <?=$practice_details['questions_count'] ?? 0?></span>
                <span id="practice_question_count">Duration: <?=$practice_details['questions_count'] ?? 00?> Minutes</span>
                <div id="practice_description">
                    <b>Instructions</b>
                    <ul>
                        <li>4 marks for each correct answer and negative 1 for each incorrect answer.</li>
                        <li>You can skip questions if you do not want to attend.</li>
                        <li>In last question you can finish practice after confirmation.</li>
                        <li>If time expired the practice will get automatically submitted without confirmation.</li>
                    </ul>
                </div>
                <?php if($practice_details['questions_count'] > 0) { ?>
                    <button id="practice_start" class="btn btn-primary" onclick="start_practice()">Continue</button>
                <?php } else{ ?>
                    <button class="btn btn-danger" desabled>Please add questions to exam</button>
                <?php } ?>
            </div>
            <div id="practice_ui_attend" class="hide_section ">
                <div class="row text-center" id="practice_top_bar">
                    <div class="col-3" id="questions_count">
                        <small class="d-block text-muted">Question</small>
                        <span id="current_question_number">1</span>/<?=$practice_details['questions_count']?>
                    </div>
                    <div class="col-6">
                        <div id="timer_circle_outer">
                            <div id="timer_circle">Start</div>
                        </div>
                    </div>
                    <div class="col-3" id="attended_count">
                        <small class="d-block text-muted">Attended</small>
                        <span id="attended_question_count">0</span>/<?=$practice_details['questions_count']?>
                    </div>
                    <div class="col-12">
                        <hr>
                    </div>
                </div>
                <div class="row" id="question_box">
                    <?php
                        foreach($questions as $key => $question){
                            $question_no = $key+1;
                    ?>
                        <div class="question_container card-body" id="question_<?=$question['id']?>">
                            <div class="question_number">Question: <?=$question_no?></div>
                            <div class="question_title <?=$question['is_equation']!=1 ? 'question_title_container' : 'equation_container'?>" id="question_title_<?=$question['id']?>">
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
                            <div class="options">
                                <div class="d-grid gap-2 mx-auto">
                                <?php
                                    $options = json_decode($question['options'], true);

                                    foreach($options as $op_key => $option) {
                                        $op_id = $op_key + 1;
                                        if(!empty($option)){
                                            ?>
                                            <div class="single_option_outer">
                                                <div class="single_option">
                                                    
                                                    <input type="radio" id="<?=$question['id'].'-'.$op_id.'-radio'?>"
                                                           name="answer-<?=$question['id']?>" onclick="answer_question(<?=$question['id']?>, <?=$op_id?>)"
                                                           class="radio-custom checkbox_<?=$question['id']?>">
                                                    <label for="<?=$question['id'].'-'.$op_id.'-radio'?>" id="<?=$question['id'].'-'.$op_id.'-label'?>" class="option_label">
                                                        <?=html_entity_decode($option)?>
                                                    </label>
                                                </div>
                                            </div>
                                            <?php
                                        }
                                    }

                                ?>
                                </div>
                            </div>
                        </div>
                        <?php
                    }

                    ?>
                    <div id="practice_navigation_content" class="">
                        <div class="modal fade" id="practice_navigation_content_modal" tabindex="-1" role="dialog"
                             aria-labelledby="practice_navigation_content_modal" aria-hidden="true">
                            <div class="modal-dialog" role="document">
                                <div class="modal-content">
                                    <div class="modal-body">
                                        <div class="row text-center" id="practice_navigation_stat_box">
                                            <div class="col col-6 practice_navigation_stat_box_single" style="background-color: #aee6fd">
                                                <span id="attempted_count">0</span>
                                                Attempted
                                            </div>
                                            <div class="col col-6 practice_navigation_stat_box_single" style="background-color: #fdeaea">
                                                <span id="un_attempted_count"><?=$test_details['questions_count'] ?? 0?></span>
                                                Unattempted
                                            </div>
                                        </div>
                                        <div class="row" id="question_navigation_item_container">
                                            <?php
                                                foreach ($questions as $key => $question){
                                            ?>
                                                <div class="col col-2 question_navigation_item_outer">
                                                    <span class="question_navigation_item" id="navigation_item_<?=$question['id']?>"
                                                          onclick="navigate_question_model(<?=$question['id']?>)">
                                                        <?=$key+1?>
                                                    </span>
                                                </div>
                                            <?php
                                                }
                                            ?>
                                        </div>
                                        <div class="row text-center" id="question_navigation_footer">
                                            <div class="col col-6">
                                                <button class="" onclick="$('#practice_navigation_content_modal').modal('toggle')"
                                                style="background-color:#f6a1a3!important;color:#ffffff!important">CANCEL</button>
                                            </div>
                                            <div class="col col-6">
                                                <button class="" onclick="submit_practice()" style="background-color: #17a885;color:#ffffff;">SUBMIT </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row" id="practice_bottom_bar">

                        <div class="col-12 navigation_container">
                            <button class="btn btn-primary navigation_btn" id="finish_practice_btn" onclick="show_practice_navigation()">
                                Finish & Submit
                            </button>
                        </div>
                        <div class="col-4 navigation_container">
                            <button class="btn btn-primary navigation_btn" id="prev_question_btn" onclick="prev_question()" style="border-radius:10% !important">
                                <i class="fas fa-angle-left"></i> Prev
                            </button>
                        </div>
                        <!--<div class="col-4 navigation_container">-->
                        <!--    <button class="btn btn-primary navigation_btn" id="skip_question_btn" onclick="skip_question()">-->
                        <!--        Skip-->
                        <!--    </button>-->
                        <!--</div>-->
                        <div class="col-4 navigation_container">
                            <button class="btn btn-info navigation_btn" id="navigate_question_btn" onclick="show_practice_navigation()" style="border-radius:10% !important; padding: 13px !important;">
                                <i class="fa fa-th" aria-hidden="true" style="color:#ffff !important;"></i>
                            </button>
                        </div>
                        <div class="col-4 navigation_container">
                            <button class="btn btn-primary navigation_btn" id="next_question_btn" onclick="next_question()" style="border-radius:10% !important">
                                Next <i class="fas fa-angle-right"></i> 
                            </button>
                        </div>

                    </div>
                </div>

            </div>
            <div id="practice_ui_submit" class="hide_section">
                <img src="<?=base_url('assets/practice_ui/ans_correct.gif')?>">
                <div style="padding:20px;">
                    <h5>Answers Submitted Successfully!</h5>
                </div>
                <div style="padding:20px;color: #ee634a">
                    <a href="<?=base_url('exam/show_practice_result/'.$user_id.'/'.$attempt_id.'/')?>"
                    class="btn btn-primary" id="practice_start" >View Result</a>
                </div>
            </div>

        </div>
    </div>

    <script type="text/javascript">
        //user answer
        var question_ids        = [<?php echo implode(",", array_column($questions, 'id')); ?>];
        var time_taken          = 0;
        // var user_answer         = [];
        const user_answer       = {};
        var user_answer_array   = {};
        var current_question    = question_ids[0];
        var questions_count     = <?=$practice_details['questions_count'] ?? 20?>;

        //practice ui sections
        let practice_ui_start       = $('#practice_ui_start');
        let practice_ui_attend      = $('#practice_ui_attend');
        let practice_ui_submit      = $('#practice_ui_submit');


        //start practice
        function start_practice() {
            practice_ui_start.hide();
            practice_ui_attend.show();
            $('#finish_practice_btn').hide();
            show_equation();
            navigate_question(current_question);
            timer();
        }

        /**
         * Navigate Questions
         */
        function navigate_question(question_id, question_id_prev = 0){
            current_question = question_id;
            $('.question_container').hide();
            $('#question_' + question_id).show();
            $('#current_question_number').text(question_ids.indexOf(current_question) + 1);
            show_hide_navigation();
        }

        function show_practice_navigation() {
            set_navigation();
            $('#practice_navigation_content_modal').modal('toggle')
        }
        function set_navigation(){
            var attempted_count = Object.keys(user_answer).length;
            $('#attempted_count').text(attempted_count);
            $('#un_attempted_count').text(questions_count - attempted_count);
            // user_answer.map(set_navigation_active);
            Object.keys(user_answer).map(set_navigation_active);
        }
        function set_navigation_active(value, index, array) {
            $( "#navigation_item_" + value ).addClass( 'question_navigation_item_active');
        }
        function navigate_question_model(question_id){
            navigate_question(question_id);
            show_practice_navigation();
        }

        function update_attended_count(){
            $('#attended_question_count').text(Object.keys(user_answer).length);
        }
        function show_hide_navigation(){
            const index = question_ids.indexOf(current_question);
            if(index < questions_count - 1){
                $("#next_question_btn").attr("disabled", false);
                // $("#next_question_btn").show();
                $("#finish_practice_btn").hide();
            }else{
                $("#next_question_btn").attr("disabled", true);
                // $("#next_question_btn").hide();
                $("#navigate_question_btn").show();
                show_practice_navigation();

            }

            if(index > 0){
                $("#prev_question_btn").attr("disabled", false);
            }else{
                $("#prev_question_btn").attr("disabled", true);
            }


        }

        function skip_question(){
            delete user_answer[current_question];
            delete user_answer_array[current_question];
            $(".checkbox_" + current_question).prop('checked', false);
            next_question();
            update_attended_count();
            // console.log(user_answer);
        }

        function next_question(){
            const index = question_ids.indexOf(current_question);
            if(index < questions_count - 1){
                navigate_question(question_ids[index + 1])
            }
        }
        function prev_question(){
            const index = question_ids.indexOf(current_question);
            if(index > 0){
                navigate_question(question_ids[index - 1])
            }
        }

        function answer_question(question_id, option_no){
            user_answer[question_id] = option_no;
            user_answer_array[question_id] = {'question_id': question_id, 'answer': option_no};
            update_attended_count();
        }
        
        function submit_practice() {
            // Display SweetAlert confirmation dialog
            swal({
                title: "Alert",
                text: "Are you sure you want to submit?",
                icon: "warning",
                buttons: ["Cancel", "OK"],
                dangerMode: true,
            }).then((willSubmit) => {
                if (willSubmit) {
                    // User clicked OK, finish the practice
                    finish_practice();
                }
            });
        }


        function finish_practice(){
            practice_ui_start.hide();
            practice_ui_attend.hide();
            show_loading();
            save_practice_result();
            hide_loading();
        }

        function save_practice_result(){
            var user_id = <?=$user_id ?? 1?>;
            var attempt_id = <?=$attempt_id ?? 0?>;
            $.ajax({
                type: 'POST',
                url: "<?=base_url('exam/save_practice_result'); ?>",
                data: {
                    'user_id' : user_id,
                    'attempt_id' : attempt_id,
                    'time_taken' : time_taken,
                    'user_answers': user_answer_array
                },
                dataType: "json",
                success: function(data) {
                    console.log(data);
                }
            });
            $('#practice_navigation_content_modal').modal('hide');
            practice_ui_submit.show();
        }

        function view_result() {
            window.location.href = '<?=base_url('home/finish_practice/')?>';
        }


        function timer(){
            var countDownDate   = new Date();
            var timer_start     = <?=$practice_details['practice_time'] ?? 30?>;

            countDownDate.setMinutes( countDownDate.getMinutes() + Number(timer_start) );
            countDownDate=countDownDate.getTime();

            // Update the count down every 1 second
            var x = setInterval(function() {
                // Get today's date and time
                var now = new Date().getTime();

                // Find the distance between now and the count down date
                var distance = countDownDate - now;

                // Time calculations for days, hours, minutes and seconds
                //   var days = Math.floor(distance / (1000 * 60 * 60 * 24));
                var hours   = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                var seconds = Math.floor((distance % (1000 * 60)) / 1000);

                // Display the result in the element with id="demo"
                time_remaining  = minutes;
                time_taken      = Number(timer_start) - (distance/60000);
                if(hours<10) hours='0'+hours;
                if(minutes<10) minutes='0'+minutes;
                if(seconds<10) seconds='0'+seconds;
                document.getElementById("timer_circle").innerHTML =
                    hours + ":" + minutes + ":" + seconds + "";

                // If the count down is finished, write some text
                if (distance <= 0) {
                    clearInterval(x);
                    time_expired = true;
                    document.getElementById("timer_circle").innerHTML = "EXPIRED";
                    // alert("Time Expired!");
                    finish_practice();
                }
            }, 1000);
        }






        // hide_loading();

        // show_loading();
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
