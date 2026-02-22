<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <link rel="stylesheet" href="<?=base_url('assets/practice/index.css')?>" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer"/>
  
  <style>
      @media(max-width:680px){
          .catogory-top-content i{
              opacity: 0
          }
          .catogory_top{
              margin-top:20px;
          }
      }
  </style>
  </head>

  <body>
    <section class="section-area">
      <!-- next section -->
      <form action="<?=base_url('home/practice_web_view/')?>" class="catogary-section">
        <div class="catogory_top">
          <div class="catogory-top-content">
            <span><i class="fa-solid fa-arrow-left"></i></span>
            <span>Practice Exam</span>
            <span style="opacity: 0">M</span>
          </div>
        </div>
        
        <div class="catogory_bottom">
            <?php 
                foreach($subjects as $subject) {
                    foreach($subject['lessons'] as $lesson) {
            ?>
              <div class="card-catogory">
                <div class="card-content">
                  <div class="left-section"><?=$lesson['title']?></div>
                  <div class="right-section">
                      <input class="single_chapter_check" type="checkbox" value="<?=$lesson['id']?>" name="lessons[]"/>
                  </div>
                </div>
              </div>
            <?php } } ?>
        </div>
        
        <div class="cercle_fixed_button">
          <button type="button" class="btn btn-primary" id="submit_quiz_btn" onclick="submit_lessons()">
            <img src="<?=base_url('assets/practice/vector4.png')?>" alt="">
          </button>
        </div>
      </form>
      <!-- next section -->
    </section>
    
    <script type="text/javascript">
        function submit_lessons(){
            const lessons = [...document.querySelectorAll('.single_chapter_check:checked')].map(e =>  e.value);
            if(!(lessons.length > 0)){
                return false;
            }
            const lessons_a = JSON.stringify(lessons);
            window.location = '<?=base_url('exam/practice_web_view/'.$user_id.'/'.$course_id.'/?lesson_id=')?>' + lessons_a;
        }
    </script>
  </body>
</html>
