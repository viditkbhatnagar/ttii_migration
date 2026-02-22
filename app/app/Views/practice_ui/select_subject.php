<div class="container_box">
    <div id="select_chapter_title">
        <h2>Select Chapter</h2>
        <span>Create your own exam by selecting lessons you need.</span>
    </div>
    <hr class="ta_hr">
    <form action="<?=base_url('exam/practice_web_view/')?>">
        <div class="accordion accordion-flush" id="accordion_chapters">
            <?php 
            if(isset($subjects)){
                $count = count($subjects);
                foreach($subjects as $key => $subject){
                    ?>
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="section_heading_<?=$subject['id']?>">
                            <button class="accordion-button collapsed section_title" style="background: linear-gradient(to right,#eeeaf7, #eeeaf7)!important;color:#000000!important" type="button" data-bs-toggle="collapse" data-bs-target="#section_collapse_<?=$subject['id']?>" aria-expanded="false" aria-controls="section_collapse_<?=$subject['id']?>">
                                <i class="bi bi-x-diamond"></i> &nbsp;&nbsp;<?=$subject['title']?>
                            </button>
                        </h2>
                        <div id="section_collapse_<?=$subject['id']?>" class="accordion-collapse collapse <?=$key==($count - 1) ? 'show' : ''?>" aria-labelledby="section_heading_<?=$subject['id']?>" data-bs-parent="#accordion_chapters">
                            <div class="accordion-body">
                                <div class="list-group">
                                    <?php
                                        foreach($subject['lessons'] as $key_chapter => $lesson){
                                    ?>
                                        <label class="list-group-item single_chapter_box">
                                            <div class="row">
                                                <div class="col-1">
                                                    <input class="form-check-input me-2 single_chapter_check" type="checkbox" value="<?=$lesson['id']?>" name="chapters[]" <?php if($subject['free']=='off') echo 'disabled'?>>

                                                </div>
                                                <div class="col-11">
                                                    <?php if($subject['free']=='off'){?>
                                                    <div id="lock">
                                                    <?php } ?>
                                                        <span class="badge bg-light text-muted rounded-pill"><?=$key_chapter+1?></span>
                                                        <?=$lesson['title']?>
                                                    <?php if($subject['free']=='off'){?>
                                                    </div>
                                                    <?php } ?>
                                                </div>
                                            </div>
                                        </label>
                                        <?php
                                    }
                                    ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <?php
                }
            }
            ?>
        </div>
        <div id="select_chapter_footer">
            <button type="button" class="btn btn-primary" id="submit_quiz_btn" onclick="submit_chapters()">
                Continue 
            </button>
        </div>
    </form>
</div>
<script type="text/javascript">
    function submit_chapters(){
        const chapters = [...document.querySelectorAll('.single_chapter_check:checked')].map(e =>  e.value);
        if(!(chapters.length > 0)){
            return false;
        }
        const lessons_a = JSON.stringify(chapters);
        window.location = '<?=base_url('exam/practice_web_view/'.$user_id.'/?lesson_id=')?>' + lessons_a;
    }
    
    
</script>

<style>
    #lock {
      background-image: url('<?=base_url('uploads/lock.png')?>');
      background-repeat: no-repeat;
      background-position: center;
    }
</style>


