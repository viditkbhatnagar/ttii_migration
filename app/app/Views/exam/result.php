<style>
    @media(max-width:680px){
        .result_top_section .back_icon{
            opacity:0;
        }
        .result_top_section{
            margin-top:20px;
        }
    }
</style>

<div class="result-container">
  <div class="main-result-box">
    <div class="result-box-items">
      <div class="result_top_section">
        <div class="back_icon" style="cursor: pointer;"><i class="fa-solid fa-arrow-left"  onclick="navigatBack()"></i></div>
        <div class="resuly_header_content">Result</div>
        <div class="back_icon"></div>
      </div>
      <div class="result_user_section">
        <div class="card_header">
          <h2>Good effort! <span><?=$user_data['name']?></span></h2>
          <p>Keep learning and trying again!</p>
        </div>
        <div class="card_image" style="background-image: url(./assets/PAPPER.png);">
          <div class="image_cercle_area">
          <img src="<?=is_file('uploads/user_image/'.$user_data['id'].'.jpg') ? base_url('uploads/user_image/'.$user_data['id'].'.jpg') : base_url('assets/practice/profile.png')?>" alt="Surface Image" />

          </div>
        </div>
        <div class="card_footer">
        
          <div class="footer_section">
            <div class="footer_sectionic">
              <img src="<?=base_url('assets/practice/wrong.png')?>" alt="">  <span><?=$quiz_score['incorrect']?>/<?=$quiz_score['quetions']?></span>
            </div>

          </div>
          <div class="footer_section">
            <div class="exam_timer">
                <div class="inner_circle">
                  <?=round($quiz_score['percentage'])?>%
                  <span><?=$quiz_score['time_taken']?></span>
                </div>
              </div>
          </div>
          <div class="footer_section">
            <div class="footer_sectionic">
              <img src="<?=base_url('assets/practice/right.png')?>" alt="">  <span><?=$quiz_score['correct']?>/<?=$quiz_score['quetions']?></span>
            </div>
          </div>
        </div>
      </div>
      <div class="result_button_section">
        <button onclick="navigatBack()">Attempt Again</button>
        <button>Share Your Score</button>
        <button onclick="navigatBack()">Home</button>
      </div>
    </div>
  </div>
</div>

<script>
    function navigatBack() {
        window.location.href =  "<?=base_url('exam/exam_web_view/'.$exam_id.'/'.$user_id)?>";
    }
</script>