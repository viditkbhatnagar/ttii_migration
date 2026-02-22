<div id="quiz_ui_outer">
    <div id="select_question_no_container">
        <div id="select_question_no_title">
            <h2>Number of Questions</h2>
            <span>Select the number of questions you need in the quiz.</span>
        </div>
        <?php
        $question_no_arr = [5, 10, 15, 20, 25];
        foreach ($question_no_arr as $question_no){
            ?>
            <div class="question_no_btn_outer">
                <a href="<?= base_url("exam/practice_web_view/{$user_id}/?attempt_id={$attempt_id}&question_no={$question_no}") ?>" class="question_no_btn">
                    <?= $question_no ?>
                </a>
            </div>
            <?php
        }
        ?>
    </div>
</div>
